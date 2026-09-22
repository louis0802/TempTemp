import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { DateTime } from "luxon";
import { GoogleOutletDiscovery } from "@/ingestion/resolution/google-discovery";
import { ResolutionCache } from "@/ingestion/resolution/cache";
import { MvpPipeline } from "@/ingestion/mvp/pipeline";
import { readCorpus } from "@/ingestion/mvp/corpus";
import { mvpPromotionSchema } from "@/domain/mvp";
const fixture = JSON.parse(
  readFileSync("tests/fixtures/mvp-location-google.json", "utf8"),
) as {
  query: string;
  pageToken: string | null;
  sourceLocation: boolean;
  response: unknown;
}[];
const ledger = JSON.parse(
  readFileSync("docs/changes/mvp-source-location/ledger.json", "utf8"),
);
const baseline = JSON.parse(
  readFileSync("docs/changes/mvp-source-location/baseline.json", "utf8"),
);
const artifact = JSON.parse(readFileSync("data/mvp-promotions.json", "utf8"));
const normalize = (q: string) =>
  q
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
it("replays every original location blocker from captured Google responses, deterministically", async () => {
  const ids = new Set<string>(
    baseline.records.map((r: { id: string }) => r.id),
  );
  expect(ids.size).toBe(28);
  expect(ledger.records.map((r: { id: string }) => r.id).sort()).toEqual(
    [...ids].sort(),
  );
  const urls = new Set(
    baseline.records.map((r: { sourceUrl: string }) => r.sourceUrl),
  );
  const sources = (await readCorpus()).filter((s) => urls.has(s.url));
  const replay = async () => {
    const pipeline = new MvpPipeline(
      new GoogleOutletDiscovery(
        new ResolutionCache(),
        "captured-only",
        async (_url, init) => {
          const body = JSON.parse(String(init?.body));
          const sourceLocation = new Headers(init?.headers)
            .get("X-Goog-FieldMask")!
            .includes("places.types");
          const response = fixture.find(
            (f) =>
              normalize(f.query) === normalize(body.textQuery) &&
              f.pageToken === (body.pageToken ?? null) &&
              f.sourceLocation === sourceLocation,
          );
          if (!response) throw new Error(`uncaptured_query:${body.textQuery}`);
          return new Response(JSON.stringify(response.response));
        },
      ),
    );
    const result = [];
    for (const source of sources)
      result.push(
        ...(await pipeline.process(
          source,
          DateTime.fromISO(artifact.evaluatedAt),
        )),
      );
    return result.filter((r) => ids.has(r.id));
  };
  const first = await replay();
  expect(first).toHaveLength(28);
  expect(first).toEqual(await replay());
  const expected = artifact.records
    .filter((p: { id: string }) => ids.has(p.id))
    .map((p: unknown) => mvpPromotionSchema.parse(p));
  expect(first).toEqual(expected);
  for (const record of first) {
    const row = ledger.records.find((r: { id: string }) => r.id === record.id);
    expect(row.lookups).toEqual(record.locationAudit);
    expect(row.outlets).toEqual(record.outlets);
    expect(record.description).toBe(
      baseline.records.find((r: { id: string }) => r.id === record.id)
        .description,
    );
  }
});
