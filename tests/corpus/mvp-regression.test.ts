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
