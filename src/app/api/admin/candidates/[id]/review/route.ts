import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/server/auth/admin";
import { transaction } from "@/server/db";
import { savePromotion } from "@/server/db/publication";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
import { json, failure, HttpError, readJson } from "@/server/http";
const input = z.object({
  promotion: promotionSchema.optional(),
  action: z.enum(["approve", "exclude"]).default("approve"),
  reason: z.string().trim().min(3).max(2000),
});
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin(req),
      id = z
        .string()
        .uuid()
        .parse((await params).id),
      body = input.parse(await readJson(req));
    return json(
      await transaction("admin", async (c) => {
        const candidate = (
          await c.query(
            "SELECT c.*,r.post_id,r.hash,p.hash AS current_hash,p.permalink,s.label FROM app.candidates c JOIN app.post_revisions r ON r.id=c.revision_id JOIN app.source_posts p ON p.id=r.post_id JOIN app.sources s ON s.id=p.source_id WHERE c.id=$1 FOR UPDATE OF c,p",
            [id],
          )
        ).rows[0];
        if (!candidate) throw new HttpError(404, "Candidate not found.");
        if (
          candidate.status !== "needs_review" ||
          candidate.hash !== candidate.current_hash
        )
          throw new HttpError(
            409,
            "This candidate changed or was already reviewed. Reload the inbox.",
          );
        if (body.action === "exclude") {
          await c.query(
            "UPDATE app.candidates SET status='excluded' WHERE id=$1",
            [id],
          );
          await c.query(
            "INSERT INTO app.review_history(actor,action,reason,before_data,after_data) VALUES($1,'exclude_candidate',$2,$3,$4)",
            [
              actor,
              body.reason,
              JSON.stringify({ candidateId: id, data: candidate.data }),
              JSON.stringify({ status: "excluded" }),
            ],
          );
          return { status: "excluded" };
        }
        if (!body.promotion)
          throw new HttpError(400, "A complete promotion is required.");
        if (
          (
            await c.query("SELECT 1 FROM app.promotions WHERE id=$1", [
              body.promotion.id,
            ])
          ).rowCount
        )
          throw new HttpError(
            409,
            "This offer already exists. Edit it in the offer list.",
          );
        const p = promotionSchema.parse({
          ...body.promotion,
          id: randomUUID(),
          status: "published",
          revision: 1,
          verifiedAt: new Date().toISOString(),
          sources: [{ label: candidate.label, url: candidate.permalink }],
        });
        if (publicationIssues(p).length)
          throw new HttpError(
            400,
            "Resolve validity and evidence issues before approval.",
          );
        await savePromotion(c, p, true);
        await c.query("INSERT INTO app.promotion_sources VALUES($1,$2)", [
          p.id,
          candidate.post_id,
        ]);
        await c.query(
          "UPDATE app.candidates SET status='resolved' WHERE id=$1",
          [id],
        );
        await c.query(
          "INSERT INTO app.review_history(promotion_id,actor,action,reason,before_data,after_data) VALUES($1,$2,'approve_candidate',$3,$4,$5)",
          [
            p.id,
            actor,
            body.reason,
            JSON.stringify(candidate.data),
            JSON.stringify(p),
          ],
        );
        return { promotion: p };
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
