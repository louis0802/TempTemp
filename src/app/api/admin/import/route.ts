import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { exportSchema } from "@/ingestion/sources/approved-json";
import { runExports } from "@/ingestion/service";
import { failure, json, readJson } from "@/server/http";
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const data = z
      .array(exportSchema)
      .min(1)
      .max(2)
      .refine((v) => new Set(v.map((s) => s.source)).size === v.length)
      .parse(await readJson(req, 10_000_000));
    const results = await runExports(data);
    return json({ results }, results.some((r) => !r.ok) ? 207 : 200);
  } catch (e) {
    return failure(e);
  }
}
