import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { DateTime } from "luxon";
import { ResolutionCache, digest } from "../src/ingestion/resolution/cache";
import { GoogleOutletDiscovery } from "../src/ingestion/resolution/google-discovery";
import { MvpPipeline } from "../src/ingestion/mvp/pipeline";
import { readCorpus, buildCorpus } from "../src/ingestion/mvp/corpus";
const now = DateTime.fromISO(
  process.env.MVP_AS_OF ?? "2026-09-21T00:00:00+08:00",
);
if (!now.isValid) throw new Error("Invalid MVP_AS_OF");
const google = process.argv.includes("--google");
if (google && !process.env.GOOGLE_PLACES_API_KEY)
  throw new Error("google_places_api_key_missing");
await mkdir(".local/mvp-google", { recursive: true });
const cachedFetch: typeof fetch = async (input, init) => {
  const path = `.local/mvp-google/${digest(init?.body)}.json`;
  try {
    const cached = JSON.parse(await readFile(path, "utf8")) as {
      text: string;
      fetchedAt: number;
    };
    if (!google || Date.now() - cached.fetchedAt < 3600000)
      return new Response(cached.text);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!google) throw new Error("google_response_not_cached_run_with_google");
  const response = await fetch(input, init);
  const text = await response.text();
  if (response.ok)
    await writeFile(path, JSON.stringify({ text, fetchedAt: Date.now() }));
  return new Response(text, { status: response.status });
};
const artifact = await buildCorpus(
  new MvpPipeline(
    new GoogleOutletDiscovery(
      new ResolutionCache(),
      process.env.GOOGLE_PLACES_API_KEY ?? "offline-cache",
      cachedFetch,
      true,
    ),
  ),
  await readCorpus(),
  now,
);
await mkdir("data", { recursive: true });
await writeFile(
  "data/mvp-promotions.json.tmp",
  JSON.stringify(artifact, null, 2) + "\n",
);
await rename("data/mvp-promotions.json.tmp", "data/mvp-promotions.json");
await writeFile(
  "docs/changes/mvp-ingestion/non-ready.json",
  JSON.stringify(
    artifact.records
      .filter((p) => p.status !== "ready")
      .map((p) => ({
        id: p.id,
        sourceUrl: p.sourceUrl,
        merchant: p.merchant,
        title: p.title,
        status: p.status,
        contentStatus: p.contentStatus,
        validityStatus: p.validityStatus,
        mapStatus: p.mapStatus,
        reasons: p.reasons,
      })),
    null,
    2,
  ) + "\n",
);
await writeFile(
  "docs/changes/mvp-ingestion/non-ready.md",
  "# Retained records requiring resolution\n\nAll records remain in the curated presentation dataset. Status uses content → validity → physical location precedence; dimensions can overlap.\n\n" +
    artifact.records
      .filter((p) => p.status !== "ready")
      .map(
        (p) =>
          `- **${p.merchant || "Merchant unresolved"}: ${p.title || "Content unresolved"}** — [source](${p.sourceUrl}) — ID: \`${p.id}\`; status: \`${p.status}\`; map: \`${p.mapStatus}\`; reasons: ${p.reasons.join(", ")}.`,
      )
      .join("\n") +
    "\n",
);
console.log(
  JSON.stringify(
    { ...artifact.metrics, statuses: artifact.statusCounts },
    null,
    2,
  ),
);
if (artifact.failures.length) process.exitCode = 1;
