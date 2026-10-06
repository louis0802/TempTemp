import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  rm,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { DateTime } from "luxon";
import { mvpPromotionSchema } from "../src/domain/mvp";
import { MvpPipeline } from "../src/ingestion/mvp/pipeline";
import { readCorpus, buildCorpus } from "../src/ingestion/mvp/corpus";
import { GoogleOutletDiscovery } from "../src/ingestion/resolution/google-discovery";
import { ResolutionCache, digest } from "../src/ingestion/resolution/cache";
import { mvpSourceStateSchema } from "../src/ingestion/mvp/source-refresh";
import { directStateToMvp } from "../src/ingestion/mvp/direct-bridge";
import { parseMvpArtifact } from "../src/server/mvp";
import { capturedMvpDirectoryProviders } from "../src/ingestion/mvp/official-directories";
import { assertMvpArtifactOutputPath } from "../src/ingestion/mvp/artifact-review";

const args = process.argv.slice(2),
  allowed = ["--output", "--observations"];
for (let i = 0; i < args.length; i++)
  if (!allowed.includes(args[i]) || !args[++i] || args[i].startsWith("--"))
    throw new Error("Offline builder accepts only --output and --observations");
const value = (flag: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const output =
  value("--output") ?? ".local/mvp-policy-preview/mvp-promotions.json";
const protectedBaseline = JSON.parse(
  await readFile(
    "docs/changes/mvp-offer-lifecycle/protected-baseline.json",
    "utf8",
  ),
);
assertMvpArtifactOutputPath(
  output,
  ["exports/review-inbox-2026-09-16/review-inbox.json"],
  Object.keys(protectedBaseline.hashes),
  [
    ".local/mvp-google",
    "tests/fixtures/direct-sources",
    ...(value("--observations") ? [value("--observations")!] : []),
  ],
);
const now = DateTime.fromISO(
  process.env.MVP_AS_OF ?? "2026-10-06T12:00:00+08:00",
);
if (!now.isValid) throw new Error("Invalid MVP_AS_OF");
const cachedFetch: typeof fetch = async (_input, init) => {
  const fields = new Headers(init?.headers).get("X-Goog-FieldMask") ?? "";
  const key = digest(
    fields.includes("places.types") ? { body: init?.body, fields } : init?.body,
  );
  const cached = JSON.parse(
    await readFile(`.local/mvp-google/${key}.json`, "utf8"),
  );
  return new Response(cached.text);
};
const discovery = new GoogleOutletDiscovery(
  new ResolutionCache(),
  "offline-cache",
  cachedFetch,
  true,
);
const providerFactory = await capturedMvpDirectoryProviders();
const corpus = await buildCorpus(
  new MvpPipeline(discovery, { policy: "source_observed", providerFactory }),
  await readCorpus(),
  now,
);
if (corpus.failures.length)
  throw new Error(
    `Previous policy artifact retained: ${JSON.stringify(corpus.failures)}`,
  );
const observations = value("--observations");
const direct = [];
if (observations) {
  for (const name of (await readdir(observations))
    .filter((f) => f.endsWith(".state.json"))
    .sort()) {
    const state = mvpSourceStateSchema.parse(
      JSON.parse(await readFile(join(observations, name), "utf8")),
    );
    direct.push(
      ...(await directStateToMvp(state, { discovery, providerFactory }, now)),
    );
  }
}
const artifact = {
  ...corpus,
  version: 3,
  policyVersion: "mvp-offer-policy-v1",
  records: [...corpus.records, ...direct].map((r) =>
    mvpPromotionSchema.parse(r),
  ),
};
parseMvpArtifact(artifact, "source_observed");
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
    { output, records: artifact.records.length, ...corpus.metrics },
    null,
    2,
  ),
);
