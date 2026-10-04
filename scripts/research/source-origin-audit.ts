import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runAudit } from "./source-origin-audit/run";

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      sample: { type: "string", default: "50" },
      refresh: { type: "boolean", default: false },
      offline: { type: "boolean", default: false },
      input: { type: "string" },
      cache: { type: "string" },
      review: { type: "string" },
      output: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "research:source-origin:audit --sample 50 [--refresh | --offline] [--input raw.json] [--cache cache.json] [--review review.json] [--output .local/source-origin-audit/run-name]",
    );
    return;
  }
  const result = await runAudit({
    repoRoot: process.cwd(),
    sample: Number(values.sample),
    refresh: values.refresh,
    offline: values.offline,
    input: values.input,
    cache: values.cache,
    review: values.review,
    output: values.output,
  });
  console.log(
    JSON.stringify(
      {
        output: result.output,
        input_mode: result.audit.provenance.input_mode,
        ...result.audit.summary,
      },
      null,
      2,
    ),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
