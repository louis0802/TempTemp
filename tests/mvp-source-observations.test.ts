import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MVP_SOURCE_CAPABILITIES,
  applyMvpSourceSnapshot,
  readMvpSnapshot,
  stableMvpItemKey,
  validateMvpSourceSnapshot,
  writeMvpSnapshotAtomic,
} from "@/ingestion/mvp/source-observations";
import type { MvpSourceSnapshot } from "@/ingestion/mvp/source-observations";

const hash = "b".repeat(64);
function snapshot(
  overrides: Partial<MvpSourceSnapshot> = {},
): MvpSourceSnapshot {
  return {
    sourceId: "pepper_lunch_sg",
    snapshotId: "snapshot-1",
    observedAt: "2026-10-01T02:00:00Z",
    mode: "live",
    visitedPages: [
      { url: "https://example.test/promotions", contentHash: hash },
    ],
    complete: true,
    truncated: false,
    errors: [],
    seenItems: [
      {
        itemId: "pepper_lunch_sg:native:42",
        canonicalUrl: "https://example.test/p/42",
        nativeId: "42",
      },
    ],
    structureProof: {
      kind: "listing",
      evidence: ["main .offer-card selector", "pagination terminal marker"],
      traversalComplete: true,
      classificationComplete: true,
      emptyStateConfirmed: false,
    },
    ...overrides,
  };
}
const options = {
  itemKey: "pepper_lunch_sg:native:42",
  capability: "current_offer_listing" as const,
  ttlDays: 14 as const,
};

describe("MVP source observations", () => {
  it("requires proof and unambiguous stable item identity", () => {
    expect(validateMvpSourceSnapshot(snapshot()).valid).toBe(true);
    expect(
      validateMvpSourceSnapshot(
        snapshot({ complete: true, structureProof: null }),
      ).valid,
    ).toBe(false);
    expect(
      validateMvpSourceSnapshot(
        snapshot({ seenItems: [{ itemId: "x", nativeId: "x" }] }),
      ).valid,
    ).toBe(false);
    expect(
      stableMvpItemKey("s", {
        canonicalUrl: "https://EXAMPLE.test/p/1/?utm_source=a#top",
      }),
    ).toBe("s:url:https://example.test/p/1");
    expect(stableMvpItemKey("s", { nativeId: " 42 " })).toBe("s:native:42");
    expect(stableMvpItemKey("s", {})).toBeNull();
  });

  it("applies present, complete absence and reappearance while preserving first-seen history", () => {
    const present = applyMvpSourceSnapshot(null, snapshot(), options);
    expect(present.disposition).toBe("present");
    expect(present.observation.firstSeenAt).toBe(snapshot().observedAt);
    expect(
      applyMvpSourceSnapshot(present.observation, snapshot(), options)
        .observation,
    ).toBe(present.observation);
    const absentSnapshot = snapshot({
      snapshotId: "snapshot-2",
      observedAt: "2026-10-02T02:00:00Z",
      seenItems: [],
      structureProof: {
        kind: "empty_listing",
        evidence: ["empty-state element", "all pages traversed"],
        traversalComplete: true,
        classificationComplete: true,
        emptyStateConfirmed: true,
      },
    });
    const absent = applyMvpSourceSnapshot(
      present.observation,
      absentSnapshot,
      options,
    );
    expect(absent.disposition).toBe("absent");
    expect(absent.observation.presence).toBe("absent");
    const returned = applyMvpSourceSnapshot(
      absent.observation,
      snapshot({
        snapshotId: "snapshot-3",
        observedAt: "2026-10-03T02:00:00Z",
      }),
      options,
    );
    expect(returned.observation.presence).toBe("present");
    expect(returned.observation.firstSeenAt).toBe(
      present.observation.firstSeenAt,
    );
    expect(returned.observation.events.map((event) => event.type)).toEqual([
      "present",
      "absent",
      "present",
    ]);
  });

  it("partial, failed, cached, out-of-order, and archive observations cannot renew or withdraw", () => {
    const prior = applyMvpSourceSnapshot(null, snapshot(), options).observation;
    const lastSeen = prior.lastSeenOnSource;
    const partial = applyMvpSourceSnapshot(
      prior,
      snapshot({
        snapshotId: "partial",
        observedAt: "2026-10-02T02:00:00Z",
        complete: false,
        truncated: true,
      }),
      options,
    );
    expect(partial.disposition).toBe("partial");
    expect(partial.observation.lastSeenOnSource).toBe(lastSeen);
    const failed = applyMvpSourceSnapshot(
      partial.observation,
      snapshot({
        snapshotId: "failed",
        observedAt: "2026-10-03T02:00:00Z",
        complete: false,
        errors: ["timeout"],
      }),
      options,
    );
    expect(failed.disposition).toBe("failed");
    expect(failed.observation.lastSeenOnSource).toBe(lastSeen);
    const cached = applyMvpSourceSnapshot(
      failed.observation,
      snapshot({
        snapshotId: "cache",
        observedAt: "2026-10-04T02:00:00Z",
        mode: "cache",
      }),
      options,
    );
    expect(cached.observation.lastSeenOnSource).toBe(lastSeen);
    const older = applyMvpSourceSnapshot(
      cached.observation,
      snapshot({
        snapshotId: "old",
        observedAt: "2026-09-30T02:00:00Z",
        seenItems: [],
      }),
      options,
    );
    expect(older.disposition).toBe("out_of_order");
    expect(older.observation.presence).toBe("present");
    const invalidOlder = applyMvpSourceSnapshot(
      cached.observation,
      snapshot({
        snapshotId: "bad-old",
        observedAt: "2026-09-29T02:00:00Z",
        complete: true,
        structureProof: null,
      }),
      options,
    );
    expect(invalidOlder.disposition).toBe("out_of_order");
    expect(invalidOlder.observation.lastAttemptAt).toBe(
      cached.observation.lastAttemptAt,
    );
    const archive = applyMvpSourceSnapshot(
      null,
      snapshot({
        sourceId: "shake_shack_sg",
        seenItems: [{ itemId: "shake_shack_sg:native:42", nativeId: "42" }],
      }),
      {
        ...options,
        itemKey: "shake_shack_sg:native:42",
        capability: "historical_archive",
      },
    );
    expect(archive.observation.firstSeenAt).toBe(snapshot().observedAt);
    expect(archive.observation.lastSeenOnSource).toBeNull();
    expect(MVP_SOURCE_CAPABILITIES.shake_shack_sg.capability).toBe(
      "historical_archive",
    );
    expect(MVP_SOURCE_CAPABILITIES.pepper_lunch_sg.capability).toBe(
      "historical_archive",
    );
    const badTimestamp = applyMvpSourceSnapshot(
      cached.observation,
      snapshot({ observedAt: "yesterday" as never }),
      options,
    );
    expect(badTimestamp.observation.lastAttemptAt).toBe(
      cached.observation.lastAttemptAt,
    );
  });

  it("retains the last valid file on invalid input and serializes concurrent writers", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "mvp-observations-"),
    );
    try {
      const target = await writeMvpSnapshotAtomic(directory, snapshot());
      const before = await readFile(target, "utf8");
      await expect(
        writeMvpSnapshotAtomic(
          directory,
          snapshot({ complete: true, structureProof: null }),
        ),
      ).rejects.toThrow("Refusing invalid source snapshot");
      expect(await readFile(target, "utf8")).toBe(before);
      await Promise.all([
        writeMvpSnapshotAtomic(
          directory,
          snapshot({
            snapshotId: "concurrent-a",
            observedAt: "2026-10-02T02:00:00Z",
          }),
        ),
        writeMvpSnapshotAtomic(
          directory,
          snapshot({
            snapshotId: "concurrent-b",
            observedAt: "2026-10-02T02:00:00Z",
          }),
        ),
      ]);
      expect(
        (await readMvpSnapshot(directory, "pepper_lunch_sg"))?.snapshotId,
      ).toMatch(/^concurrent-/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
