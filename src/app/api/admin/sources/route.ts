import { requireAdmin } from "@/server/auth/admin";
import { db } from "@/server/db";
import { json, failure } from "@/server/http";
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return json({
      sources: (
        await db("admin").query(
          `SELECT s.*,s.last_success IS NULL OR s.last_success<now()-interval '2 hours' AS stale,
 (SELECT count(*) FROM app.candidates c JOIN app.post_revisions r ON r.id=c.revision_id JOIN app.source_posts p ON p.id=r.post_id AND p.hash=r.hash WHERE p.source_id=s.id AND c.status='needs_review') AS review_count,
 (SELECT count(*) FROM app.post_revisions r JOIN app.source_posts p ON p.id=r.post_id AND p.hash=r.hash WHERE p.source_id=s.id AND NOT EXISTS(SELECT 1 FROM app.processing_attempts a WHERE a.revision_id=r.id AND a.outcome<>'retryable_error')) AS pending_count
 FROM app.sources s ORDER BY s.id`,
        )
      ).rows,
      runs: (
        await db("admin").query(
          "SELECT * FROM app.sync_runs ORDER BY started_at DESC LIMIT 20",
        )
      ).rows,
    });
  } catch (e) {
    return failure(e);
  }
}
