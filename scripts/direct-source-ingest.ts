import { pathToFileURL } from "node:url";
import { closeDatabases, db } from "../src/server/db";
import { runDirectSource } from "../src/ingestion/direct-sources/runner";
import {
  enabledDirectSource,
  persistDirectSourceRun,
  recordDirectAttempt,
} from "../src/ingestion/direct-sources/persistence";
import { sourceIdSchema } from "../src/ingestion/direct-sources/types";

export function parseIngestArgs(args: string[]) {
  if (args.length !== 2 || args[0] !== "--source")
    throw new Error("explicit_single_source_required");
  return enabledDirectSource(sourceIdSchema.parse(args[1]));
}
export async function main(args = process.argv.slice(2)) {
  const source = parseIngestArgs(args);
  if (process.env.INGEST_DATABASE_URL === undefined)
    process.loadEnvFile(".env.local");
  const pool = db("ingest");
  const observedAt = new Date().toISOString();
  try {
    await recordDirectAttempt(source, pool, observedAt);
    const run = await runDirectSource(source, { observedAt });
    console.log(
      JSON.stringify(await persistDirectSourceRun(run, { pool }), null, 2),
    );
  } catch (error) {
    await recordDirectAttempt(source, pool, observedAt, "Failed");
    throw error;
  } finally {
    await closeDatabases();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "direct_ingest_failed",
      }),
    );
    process.exitCode = 1;
  });
}
