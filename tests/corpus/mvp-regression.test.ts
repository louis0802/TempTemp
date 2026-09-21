import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { DateTime } from "luxon";
import { MvpPipeline } from "@/ingestion/mvp/pipeline";
import { buildCorpus, readCorpus } from "@/ingestion/mvp/corpus";
import { conformance } from "../helpers/mvp-conformance";
const reviewed = JSON.parse(
  readFileSync("tests/corpus/mvp-conformance-reviewed.json", "utf8"),
);
const pipeline = () =>
  new MvpPipeline({
    discover: async () => ({
      branches: [],
      authoritative: false,
      fullyTraversed: false,
      pages: [],
      officialCount: null,
      issues: ["offline_test_no_google_coordinates"],
    }),
  });
it("replays every original source and maps every benchmark candidate to reviewed product facts", async () => {
  const sources = await readCorpus();
  expect(sources).toHaveLength(136);
  const now = DateTime.fromISO("2026-09-21T00:00:00+08:00");
  const first = await buildCorpus(pipeline(), sources, now);
  expect(first).toEqual(await buildCorpus(pipeline(), sources, now));
  expect(first.failures).toEqual([]);
  expect(new Set(first.records.map((p) => p.id)).size).toBe(
    first.records.length,
  );
  const report = conformance(first.records);
  expect(report.candidateCount).toBe(180);
  expect(report.unmatched).toEqual([]);
  expect(report.extra).toEqual(reviewed.extra);
  for (const row of report.rows) {
    const expected = reviewed.rows.find(
      (r: { candidateId: string }) => r.candidateId === row.candidateId,
    );
    expect(expected, row.candidateId).toBeDefined();
    expect(expected.explanation.length).toBeGreaterThan(20);
    expect(row.runtimeIds, row.candidateId).toEqual(expected.runtimeIds);
    expect(row.differences, row.candidateId).toEqual(expected.differences);
    const actual = row.actual.map((a) => ({
      ...a,
      status: ["ready", "needs_location"].includes(a.status)
        ? "location_candidate"
        : a.status,
    }));
    expect(actual, row.sourceUrl).toEqual(expected.actual);
  }
  expect(new Set(first.records.map((p) => p.sourceUrl)).size).toBe(136);
  console.log("MVP offline corpus metrics", first.metrics);
});

it("retains every former exclusion and the named source-backed regressions", async () => {
  const audit = JSON.parse(
    readFileSync(
      "docs/changes/curated-mvp-retention/former-exclusions.json",
      "utf8",
    ),
  );
  const review = JSON.parse(
    readFileSync(
      "docs/changes/curated-mvp-retention/source-review.json",
      "utf8",
    ),
  );
  const sources = await readCorpus();
  const result = await buildCorpus(
    pipeline(),
    sources,
    DateTime.fromISO("2026-09-21T00:00:00+08:00"),
  );
  expect(audit).toHaveLength(79);
  expect(new Set(audit.map((r: { id: string }) => r.id)).size).toBe(79);
  for (const row of audit) {
    const p = result.records.find((p) => p.id === row.id)!;
    expect(p, row.id).toBeDefined();
    expect(p.status).toBe(
      row.status === "ready" ? "needs_location" : row.status,
    );
    expect(p.mapStatus).toBe(
      row.mapStatus === "ready" ? "needs_location" : row.mapStatus,
    );
    const evidence = review.find((r: { id: string }) => r.id === row.id);
    expect(evidence.originalText).toBe(
      sources.find((s) => s.url === p.sourceUrl)!.text,
    );
    expect(evidence.review.length).toBeGreaterThan(30);
  }
  for (const [post, merchant, wording] of [
    ["4409", "Pizza Hut", "$61"],
    ["4479", "Dian Xiao Er", "$9.90"],
    ["4477", "Sushiro", "Pokémon"],
  ]) {
    const p = result.records.find(
      (p) => p.sourceUrl === `https://t.me/tastesoulsg/${post}`,
    )!;
    expect(p).toMatchObject({
      merchant,
      status: "needs_validity",
      contentStatus: "resolved",
    });
    expect(p.benefit).toContain(wording);
  }
  expect(
    result.records.filter((p) => p.mapStatus === "online_only"),
  ).toHaveLength(4);
  expect(
    result.records
      .filter((p) => p.mapStatus === "online_only")
      .every((p) => p.outlets.length === 0),
  ).toBe(true);
});
