import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  freezeAcquisition,
  freezeRawBenchmark,
  intervalDir,
  openInterval,
  readInterval,
  sealEvaluation,
  verifyObservationSeal,
} from "../scripts/research/source-monitor/intervals";
import { verifySeal } from "../scripts/research/source-monitor/storage";
import { evaluateInterval } from "../scripts/research/source-monitor/evaluation";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const root = async () => {
  const value = await mkdtemp(path.join(os.tmpdir(), "research-interval-"));
  roots.push(value);
  return value;
};

describe("research interval lifecycle", () => {
  it("freezes acquisition before raw benchmark, verifies immutable hashes and seals", async () => {
    const dataRoot = await root(),
      date = "2026-09-25",
      at = "2026-09-24T16:00:00Z";
    await openInterval(dataRoot, date, at, "a".repeat(64), "b".repeat(64));
    await expect(
      freezeRawBenchmark(
        dataRoot,
        date,
        {
          posts: [],
          polls: [],
          coverage_gaps: [],
          coverage_complete: false,
          channel_status: {},
          coverage_note: "",
        },
        "2026-09-25T16:00:00Z",
      ),
    ).rejects.toThrow("acquisition freeze");
    await freezeAcquisition(
      dataRoot,
      date,
      { source_snapshots: [], candidates: [], totals: {}, partial_reasons: [] },
      "2026-09-25T15:50:00Z",
    );
    await freezeRawBenchmark(
      dataRoot,
      date,
      {
        posts: [],
        polls: [],
        coverage_gaps: [],
        coverage_complete: false,
        channel_status: {},
        coverage_note: "",
      },
      "2026-09-25T16:00:00Z",
    );
    expect(await verifyObservationSeal(dataRoot, date)).toBe(true);
    expect((await readInterval(dataRoot, date)).phase).toBe("benchmark_frozen");
    const evaluation = evaluateInterval({
      date,
      candidates: [],
      posts: [],
      telegramCoverageComplete: false,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews: { validity: { complete: true, assessments: [] } },
    });
    await sealEvaluation(dataRoot, date, evaluation, "2026-09-25T16:10:00Z");
    expect((await readInterval(dataRoot, date)).phase).toBe("sealed");
    expect(await verifySeal(intervalDir(dataRoot, date))).toBeTruthy();
    await expect(
      freezeAcquisition(
        dataRoot,
        date,
        {
          source_snapshots: [],
          candidates: [],
          totals: {},
          partial_reasons: [],
        },
        "2026-09-25T16:20:00Z",
      ),
    ).rejects.toThrow("immutable");
  });

  it("detects edits to a frozen raw observation", async () => {
    const dataRoot = await root(),
      date = "2026-09-25";
    await openInterval(
      dataRoot,
      date,
      "2026-09-24T16:00:00Z",
      "a".repeat(64),
      "b".repeat(64),
    );
    await freezeAcquisition(
      dataRoot,
      date,
      { source_snapshots: [], candidates: [], totals: {}, partial_reasons: [] },
      "2026-09-25T15:50:00Z",
    );
    await freezeRawBenchmark(
      dataRoot,
      date,
      {
        posts: [],
        polls: [],
        coverage_gaps: [],
        coverage_complete: false,
        channel_status: {},
        coverage_note: "",
      },
      "2026-09-25T16:00:00Z",
    );
    const file = path.join(intervalDir(dataRoot, date), "telegram-raw.json");
    const original = await readFile(file, "utf8");
    await writeFile(file, original.replace("false", "true"));
    await expect(verifyObservationSeal(dataRoot, date)).rejects.toThrow(
      "changed",
    );
  });

  it("includes captured source HTML in the observation hash seal", async () => {
    const dataRoot = await root(),
      date = "2026-09-25";
    await openInterval(
      dataRoot,
      date,
      "2026-09-24T16:00:00Z",
      "a".repeat(64),
      "b".repeat(64),
    );
    const raw = path.join(
      intervalDir(dataRoot, date),
      "discovery",
      "raw",
      "source",
      "listing.html",
    );
    await mkdir(path.dirname(raw), { recursive: true });
    await writeFile(raw, "<html>source card</html>");
    await freezeAcquisition(
      dataRoot,
      date,
      { source_snapshots: [], candidates: [], totals: {}, partial_reasons: [] },
      "2026-09-25T15:50:00Z",
    );
    await freezeRawBenchmark(
      dataRoot,
      date,
      {
        posts: [],
        polls: [],
        coverage_gaps: [],
        coverage_complete: false,
        channel_status: {},
        coverage_note: "",
      },
      "2026-09-25T16:00:00Z",
    );
    expect(await verifyObservationSeal(dataRoot, date)).toBe(true);
    await writeFile(raw, "<html>changed card</html>");
    await expect(verifyObservationSeal(dataRoot, date)).rejects.toThrow(
      "changed",
    );
  });
});
