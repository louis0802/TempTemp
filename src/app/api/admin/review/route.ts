import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { db } from "@/server/db";
import { json, failure } from "@/server/http";
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const q = new URL(req.url).searchParams;
    const offerCursor = z
      .string()
      .uuid()
      .nullable()
      .parse(q.get("offerCursor"));
    const candidateCursor = z
      .string()
      .uuid()
      .nullable()
      .parse(q.get("candidateCursor"));
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(q.get("limit") ?? 50);
    const [offers, candidates] = await Promise.all([
      db("admin").query(
        "SELECT id,data FROM app.promotions WHERE ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT $2",
        [offerCursor, limit + 1],
      ),
      db("admin").query(
        "SELECT c.id,c.data,c.issues,p.permalink,s.label,pr.data AS existing FROM app.candidates c JOIN app.post_revisions r ON r.id=c.revision_id JOIN app.source_posts p ON p.id=r.post_id AND p.hash=r.hash JOIN app.sources s ON s.id=p.source_id LEFT JOIN app.promotions pr ON pr.id::text=c.data->>'id' WHERE c.status='needs_review' AND ($1::uuid IS NULL OR c.id>$1) ORDER BY c.id LIMIT $2",
        [candidateCursor, limit + 1],
      ),
    ]);
    return json({
      offers: offers.rows.slice(0, limit).map((r) => r.data),
      candidates: candidates.rows.slice(0, limit),
      nextOfferCursor:
        offers.rows.length > limit ? offers.rows[limit - 1].id : null,
      nextCandidateCursor:
        candidates.rows.length > limit ? candidates.rows[limit - 1].id : null,
    });
  } catch (e) {
    return failure(e);
  }
}
