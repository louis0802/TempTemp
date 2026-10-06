import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  buildReviewedMvpArtifact,
  assertMvpArtifactOutputPath,
} from "@/ingestion/mvp/artifact-review";
import { visibleMvp } from "@/domain/mvp";
import { policyRecord } from "./helpers/mvp-policy";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
it("rejects input aliases and all frozen outputs before the writer can replace them", () => {
  for (const output of [
    ".local/mvp-google/cache.json",
    ".local/observations/source.state.json",
  ])
    expect(() =>
      assertMvpArtifactOutputPath(
        output,
        [],
        [],
        [".local/mvp-google", ".local/observations"],
      ),
    ).toThrow("output_path_protected");
  for (const output of [
    "./data/mvp-promotions.json",
    "tests/corpus/mvp-conformance-reviewed.json",
    "docs/changes/mvp-offer-lifecycle/evaluation/semantic-review.json",
    ".local/input.json",
    "exports/review-inbox-2026-09-16/review-inbox.json",
  ])
    expect(() =>
      assertMvpArtifactOutputPath(
        output,
        [".local/input.json"],
        ["exports/review-inbox-2026-09-16/review-inbox.json"],
      ),
    ).toThrow("output_path_protected");
  expect(() =>
    assertMvpArtifactOutputPath(
      ".local/new-preview.json",
      [".local/input.json"],
      [],
    ),
  ).not.toThrow();
});
it("offline builder refuses to replace an observation input, preserving the receipt bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mvp-build-input-"));
  try {
    const state = join(dir, "source.state.json");
    await writeFile(state, "receipt must remain unchanged\n");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        resolve("scripts/build-mvp-policy-data.ts"),
        "--observations",
        dir,
        "--output",
        state,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("mvp_artifact_output_path_protected");
    expect(await readFile(state, "utf8")).toBe(
      "receipt must remain unchanged\n",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("retains all corpus records while withholding nonapproved interpretations from live", () => {
  const approved = policyRecord("approved"),
    withheld = policyRecord("withheld");
  const preview = JSON.stringify({
    version: 3,
    policyVersion: "mvp-offer-policy-v1",
    records: [approved, withheld],
  });
  const ledger = JSON.stringify({
    records: [approved, withheld].map((r) => ({
      recordId: r.id,
      changed: true,
      scheduleStructureAddition: { newRules: [] },
    })),
  });
  const review = {
    reviewer: "Test-only independent review",
    previewArtifactSha256: hash(preview),
    sourceReviewSha256: hash(ledger),
    records: [
      { recordId: approved.id, disposition: "approved_for_opt_in" },
      { recordId: withheld.id, disposition: "withheld" },
    ],
  };
  const artifact = buildReviewedMvpArtifact(preview, review, ledger),
    now = DateTime.fromISO("2026-10-06T15:00:00+08:00");
  expect(visibleMvp(artifact.records, "corpus", now)).toHaveLength(2);
  expect(visibleMvp(artifact.records, "live", now).map((r) => r.id)).toEqual([
    approved.id,
  ]);
  expect(() => buildReviewedMvpArtifact(preview + " ", review, ledger)).toThrow(
    "hash_mismatch",
  );
  expect(() =>
    buildReviewedMvpArtifact(
      preview,
      { ...review, records: review.records.slice(0, 1) },
      ledger,
    ),
  ).toThrow("missing_or_duplicate");
  expect(JSON.parse(preview).records[1].contentStatus).toBe("resolved");
});
it("CLI leaves the previous artifact byte-identical when semantic review no longer matches", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mvp-review-failure-"));
  try {
    const preview = join(dir, "preview.json"),
      review = join(dir, "review.json"),
      output = join(dir, "previous.json");
    await writeFile(
      preview,
      JSON.stringify({
        version: 3,
        policyVersion: "mvp-offer-policy-v1",
        records: [policyRecord()],
      }),
    );
    await writeFile(
      review,
      JSON.stringify({
        reviewer: "Test-only",
        previewArtifactSha256: "invalid",
        sourceReviewSha256: "invalid",
        records: [],
      }),
    );
    await writeFile(output, "previous reviewed bytes\n");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        resolve("scripts/review-mvp-policy-artifact.ts"),
        "--preview",
        preview,
        "--review",
        review,
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("semantic_review_input_hash_mismatch");
    expect(await readFile(output, "utf8")).toBe("previous reviewed bytes\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
