import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runDirectAudit } from "./direct-source-audit/run";
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      input: { type: "string" },
      evidence: { type: "string" },
      output: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "node --import tsx scripts/research/direct-source-audit.ts --input corrected/audit.json --evidence captured-evidence.json --output .local/direct-source-audit/new-run",
    );
    return;
  }
  if (!values.input || !values.evidence || !values.output)
    throw new Error(
      "--input, --evidence and --output are required; replay is offline",
    );
  const result = await runDirectAudit({
    repoRoot: process.cwd(),
    input: values.input,
    evidence: values.evidence,
    output: values.output,
  });
  console.log(
    JSON.stringify({ output: result.output, ...result.audit.summary }, null, 2),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
