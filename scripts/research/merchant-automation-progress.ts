import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  readMapInputs,
  writeMerchantMap,
  frozenMapInputs,
} from "./build-merchant-source-map";
import { reports } from "./merchant-source-map/build";
import { readSocialResearch } from "./social-sources/read";

export async function refreshProgressDocuments(root = process.cwd()) {
  const map = await readMapInputs(root);
  const identity = JSON.parse(
    await (
      await import("node:fs/promises")
    ).readFile(path.join(root, frozenMapInputs.review), "utf8"),
  );
  const social = await readSocialResearch(
    root,
    new Set(map.merchants.map((r) => r.normalized_merchant)),
    identity.signal_identities,
  );
  if (!social) throw new Error("social_research_inputs_required");
  const outputs = {
    "docs/research/merchant-automation-progress.md": reports(map)["report.md"],
    "docs/research/merchants.json": reports(map)["merchants.json"],
    "docs/research/report.csv": reports(map)["report.csv"],
    "docs/research/social-source-inventory.json":
      JSON.stringify(social.socialInventory, null, 2) + "\n",
    "docs/research/social-source-acquisition-review.json":
      JSON.stringify(social.acquisitionReview, null, 2) + "\n",
  };
  for (const [file, raw] of Object.entries(outputs))
    await writeFile(path.join(root, file), raw);
  return map;
}
export async function main(args = process.argv.slice(2)) {
  if (args.length !== 2 || args[0] !== "--output")
    throw new Error("use_output_new_local_directory");
  const result = await writeMerchantMap(args[1]);
  await refreshProgressDocuments();
  console.log(JSON.stringify(result, null, 2));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : "progress_failed");
    process.exitCode = 1;
  });
