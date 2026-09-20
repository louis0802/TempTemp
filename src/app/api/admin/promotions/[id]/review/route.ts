import { z } from "zod";
import { DateTime } from "luxon";
import { requireAdmin } from "@/server/auth/admin";
import { transaction } from "@/server/db";
import { savePromotion } from "@/server/db/publication";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
import { json, failure, HttpError, readJson } from "@/server/http";
const schema = z.object({
  action: z.enum(["approve", "correct", "withdraw"]),
  expectedRevision: z.number().int().positive(),
  reason: z.string().trim().min(3).max(2000),
  promotion: promotionSchema.optional(),
});
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin(req);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    if (Number(req.headers.get("content-length") || 0) > 200000)
      throw new HttpError(413, "Request too large.");
    const body = schema.parse(await readJson(req));
    return json(
      await transaction("admin", async (c) => {
        const row = (
          await c.query(
            "SELECT data,revision FROM app.promotions WHERE id=$1 FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!row) throw new HttpError(404, "Offer not found.");
        if (row.revision !== body.expectedRevision)
          throw new HttpError(409, "This offer changed. Reload before saving.");
        const p = promotionSchema.parse({
          ...(body.promotion || row.data),
          id,
          revision: row.revision + 1,
          status: body.action === "withdraw" ? "withdrawn" : "published",
          verifiedAt: DateTime.utc().toISO(),
        });
        if (body.action !== "withdraw" && publicationIssues(p).length)
          throw new HttpError(
            400,
            "Resolve validity and evidence issues before approval.",
          );
        await savePromotion(c, p, true);
        await c.query(
          "UPDATE app.candidates SET status='resolved' WHERE data->>'id'=$1 AND status='needs_review'",
          [id],
        );
        await c.query(
          "INSERT INTO app.review_history(promotion_id,actor,action,reason,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6)",
          [
            id,
            actor,
            body.action,
            body.reason,
            JSON.stringify(row.data),
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
