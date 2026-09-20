import { runLive } from "./live";
import { readApprovedExport } from "./sources/approved-json";
import { runExports, processPending } from "./service";
import { closeDatabases } from "@/server/db";
try {
  if (process.argv.includes("--retry"))
    console.log(JSON.stringify({ processed: await processPending() }));
  else if (process.argv.includes("--live")) {
    const results = await runLive();
    console.log(
      JSON.stringify({ event: "preview_collection_complete", results }),
    );
    if (results.some((r) => !r.ok)) process.exitCode = 1;
  } else {
    const path = process.env.APPROVED_IMPORT_FILE;
    if (!path)
      throw new Error(
        "Set APPROVED_IMPORT_FILE to an approved JSON export. Use --live for public-preview collection.",
      );
    const results = await runExports(await readApprovedExport(path));
    console.log(JSON.stringify({ event: "ingestion_complete", results }));
    if (results.some((r) => !r.ok)) process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : "Ingestion failed");
  process.exitCode = 1;
} finally {
  await closeDatabases();
}
