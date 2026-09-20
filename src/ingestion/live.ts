import { DateTime } from "luxon";
import { db } from "@/server/db";
import { collect, processPending } from "./service";
import { positiveDays } from "./cleanup";
import { collectPreview } from "./sources/telegram-preview";
export async function runLive() {
  const reports = [];
  for (const name of ["sgfooddeals", "tastesoulsg"] as const) {
    const start = DateTime.utc();
    try {
      const current = (
        await db("ingest").query(
          "SELECT last_success FROM app.sources WHERE id=$1",
          [name],
        )
      ).rows[0];
      const cutoff = current.last_success
        ? DateTime.fromJSDate(current.last_success).minus({ minutes: 5 })
        : start.minus({ days: positiveDays(process.env.BACKFILL_DAYS, 30) });
      const active = (
        await db("ingest").query(
          "SELECT DISTINCT sp.message_id FROM app.source_posts sp JOIN app.promotion_sources ps ON ps.post_id=sp.id JOIN app.promotions p ON p.id=ps.promotion_id WHERE sp.source_id=$1 AND p.status='published' AND p.data->>'endDate'>=$2 ORDER BY sp.message_id",
          [name, start.setZone("Asia/Singapore").toISODate()],
        )
      ).rows.map((r) => Number(r.message_id));
      const observed = await collectPreview(name, cutoff, {
        now: start,
        maxPages: Number(process.env.PREVIEW_MAX_PAGES ?? 60),
        activeIds: active,
      });
      const result = await collect(observed.data, "public preview");
      reports.push({
        ...result,
        pages: observed.pages,
        unavailableActivePosts: observed.unavailableActivePosts,
        coverage: observed.coverage,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Preview failed";
      await db("ingest").query(
        "UPDATE app.sources SET last_attempt=$2,status='Preview failed · checkpoint retained' WHERE id=$1",
        [name, start.toISO()],
      );
      await db("ingest").query(
        "INSERT INTO app.sync_runs(source_id,started_at,finished_at,outcome,error) VALUES($1,$2,now(),'failed',$3)",
        [name, start.toISO(), error],
      );
      reports.push({ source: name, ok: false, error });
    }
  }
  await processPending();
  return reports;
}
