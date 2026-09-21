import { readFile, writeFile } from "node:fs/promises";
import { conformance } from "../tests/helpers/mvp-conformance";
const artifact = JSON.parse(await readFile("data/mvp-promotions.json", "utf8"));
const report = conformance(artifact.records);
await writeFile(
  "docs/changes/mvp-ingestion/conformance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log({
  candidates: report.candidateCount,
  runtime: report.runtimeCount,
  unmatched: report.unmatched.length,
  extra: report.extra.length,
  differences: report.rows.filter((r) => r.differences.length).length,
});
