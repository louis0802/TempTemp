#!/usr/bin/env node
/** Local research-only entry point. No production ingestion or database imports. */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { intervalDir, verifyObservationSeal } from "./source-monitor/intervals";
import {
  cumulativeResearchMetrics,
  defaultDataRoot,
  preflightResearchService,
  ResearchSourceMonitorService,
  statusResearchService,
} from "./source-monitor/service";
import { verifySeal, withProcessLock } from "./source-monitor/storage";

import {
  researchTracker,
  formatResearchTracker,
} from "./source-monitor/tracker";

export async function main(args = process.argv.slice(2)) {
  const command = args[0] ?? "run",
    root = defaultDataRoot();
  if (command === "tracker") {
    const tracker = await researchTracker(root);
    process.stdout.write(
      args.includes("--json")
        ? JSON.stringify(tracker, null, 2) + "\n"
        : formatResearchTracker(tracker),
    );
    return;
  }
  if (command === "preflight") {
    const result = await preflightResearchService({ root });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === "status") {
    process.stdout.write(
      JSON.stringify(await statusResearchService(root), null, 2) + "\n",
    );
    return;
  }
  if (command === "metrics") {
    process.stdout.write(
      JSON.stringify(await cumulativeResearchMetrics(root), null, 2) + "\n",
    );
    return;
  }
  if (command === "verify") {
    const date = args[1];
    if (!date)
      throw new Error("Usage: source-monitor-worker.ts verify YYYY-MM-DD");
    const dir = intervalDir(root, date);
    await verifyObservationSeal(root, date);
    let finalSeal = false;
    try {
      await verifySeal(dir);
      finalSeal = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    process.stdout.write(
      JSON.stringify({
        date,
        observations_sealed: true,
        final_seal: finalSeal,
      }) + "\n",
    );
    return;
  }
  if (command !== "run")
    throw new Error(
      "Usage: source-monitor-worker.ts run|preflight|status|metrics|tracker [--json]|verify YYYY-MM-DD",
    );
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    await withProcessLock(root, async () => {
      const service = new ResearchSourceMonitorService({ root });
      await service.run(controller.signal);
    });
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
