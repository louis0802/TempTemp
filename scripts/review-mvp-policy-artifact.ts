import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildReviewedMvpArtifact,
  assertMvpArtifactOutputPath,
} from "../src/ingestion/mvp/artifact-review";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++)
  if (
    !["--preview", "--review", "--output"].includes(args[i]) ||
    !args[++i] ||
    args[i].startsWith("--")
  )
    throw new Error("Expected --preview/--review/--output with value");
const value = (flag: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const preview =
  value("--preview") ?? ".local/mvp-policy-preview/mvp-promotions.json";
const review =
  value("--review") ??
  "docs/changes/mvp-offer-lifecycle/evaluation/semantic-review-v2.json";
const output = value("--output") ?? "data/mvp-promotions-source-observed.json";
const ledgerPath =
  "docs/changes/mvp-offer-lifecycle/evaluation/source-review.json";
const protectedBaseline = JSON.parse(
  await readFile(
    "docs/changes/mvp-offer-lifecycle/protected-baseline.json",
    "utf8",
  ),
);
assertMvpArtifactOutputPath(
  output,
  [preview, review, ledgerPath],
  Object.keys(protectedBaseline.hashes),
);
const artifact = buildReviewedMvpArtifact(
  await readFile(preview, "utf8"),
  JSON.parse(await readFile(review, "utf8")),
  await readFile(ledgerPath, "utf8"),
);
await mkdir(dirname(output), { recursive: true });
const temp = `${output}.${process.pid}.tmp`;
try {
  await writeFile(temp, JSON.stringify(artifact, null, 2) + "\n", {
    flag: "wx",
  });
  await rename(temp, output);
} finally {
  await rm(temp, { force: true });
}
console.log(
  JSON.stringify(
    { output, records: artifact.records.length, review: artifact.review },
    null,
    2,
  ),
);
