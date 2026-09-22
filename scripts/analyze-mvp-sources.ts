import { readFile } from "node:fs/promises";
import { readCorpus } from "../src/ingestion/mvp/corpus";
import {
  createSignals,
  buildSourceEvidence,
} from "../src/ingestion/source-evidence/pipeline";
import {
  SourceRedirectCache,
  atomicJson,
} from "../src/ingestion/source-evidence/cache";
import {
  SourceLinkResolver,
  type HopResponse,
} from "../src/ingestion/source-evidence/resolver";
import { registrySchema } from "../src/ingestion/source-evidence/registry";
const args = process.argv.slice(2);
if (
  args.some((a) => !["--network", "--offline", "--fixture"].includes(a)) ||
  (args.includes("--network") &&
    (args.includes("--offline") || args.includes("--fixture")))
)
  throw new Error(
    "Usage: analyze:mvp-sources [--offline | --network | --fixture [--offline]]",
  );
const fixture = args.includes("--fixture")
  ? (JSON.parse(
      await readFile("tests/fixtures/source-evidence-redirects.json", "utf8"),
    ) as {
      checkedAt: string;
      responses: Record<string, HopResponse>;
      registry: unknown;
    })
  : null;
const signals = await createSignals(await readCorpus());
const registry = registrySchema.parse(
  fixture?.registry ??
    JSON.parse(await readFile("data/merchant-source-registry.json", "utf8")),
);
const cachePath = fixture
  ? ".local/source-evidence-fixture/redirect-cache.json"
  : ".local/source-evidence/redirect-cache.json";
const cache = await SourceRedirectCache.read(cachePath);
const allowed = new Set(
  signals.flatMap((s) => s.outboundLinks.map((l) => l.normalizedUrl)),
);
const resolver =
  fixture && !args.includes("--offline")
    ? new SourceLinkResolver(
        allowed,
        {
          lookup: async () => [{ address: "93.184.216.34", family: 4 }],
          request: async (url) => {
            const response = fixture.responses[url.href];
            if (!response) throw new Error("synthetic_fixture_missing");
            return response;
          },
        },
        () => fixture.checkedAt,
      )
    : args.includes("--network")
      ? new SourceLinkResolver(allowed)
      : undefined;
const artifact = await buildSourceEvidence(signals, registry, cache, resolver);
if (resolver) await cache.write(cachePath);
await atomicJson(
  fixture
    ? ".local/source-evidence-fixture/evidence.json"
    : "data/mvp-source-evidence.json",
  artifact,
);
console.log(
  JSON.stringify(
    {
      mode: fixture
        ? "synthetic_fixture"
        : args.includes("--network")
          ? "network"
          : "offline",
      ...artifact.metrics,
    },
    null,
    2,
  ),
);
