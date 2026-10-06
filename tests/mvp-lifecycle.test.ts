import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { evaluateMvpLifecycle } from "@/ingestion/mvp/lifecycle";
import type { MvpLifecycleInput, SourceObservation } from "@/domain/mvp-policy";

const now = DateTime.fromISO("2026-10-06T12:00:00+08:00");
function observation(
  overrides: Partial<SourceObservation> = {},
): SourceObservation {
  return {
    sourceId: "pepper_lunch_sg",
    sourceKind: "official",
    capability: "current_offer_listing",
    itemKey: "item-1",
    firstSeenAt: "2026-09-22T04:00:00Z",
    lastSeenOnSource: "2026-10-01T12:00:00+08:00",
    lastSuccessfulCompleteCheckAt: "2026-10-01T12:00:00+08:00",
    lastAttemptAt: "2026-10-01T12:00:00+08:00",
    lastAttemptStatus: "complete",
    presence: "present",
    snapshotId: "snap-1",
    snapshotHash: "a".repeat(64),
    ttlDays: 7,
    events: [],
    ...overrides,
  };
}
const input = (
  sourceObservation: SourceObservation | null,
  extra: Partial<MvpLifecycleInput> = {},
): MvpLifecycleInput => ({
  startDate: "2026-09-22",
  endDate: null,
  validityType: "open_ended",
  sourceObservation,
  ...extra,
});

describe("MVP offer lifecycle", () => {
  it("uses Singapore calendar days and keeps the last allowed date fresh", () => {
    const seen = observation({
      lastSeenOnSource: "2026-09-22T23:50:00+08:00",
      ttlDays: 14,
    });
    expect(
      evaluateMvpLifecycle(
        input(seen),
        DateTime.fromISO("2026-10-06T00:00:00+08:00"),
      ),
    ).toBe("active");
    expect(
      evaluateMvpLifecycle(
        input(seen),
        DateTime.fromISO("2026-10-07T00:00:00+08:00"),
      ),
    ).toBe("stale");
  });

  it("uses seven days for weekly limited-time offers and rejects future sightings", () => {
    expect(
      evaluateMvpLifecycle(
        input(
          observation({
            lastSeenOnSource: "2026-09-29T23:59:59+08:00",
            ttlDays: 7,
          }),
        ),
        now,
      ),
    ).toBe("active");
    expect(
      evaluateMvpLifecycle(
        input(
          observation({
            lastSeenOnSource: "2026-09-28T23:59:59+08:00",
            ttlDays: 7,
          }),
        ),
        now,
      ),
    ).toBe("stale");
    expect(
      evaluateMvpLifecycle(
        input(observation({ lastSeenOnSource: "2026-10-07T00:00:00+08:00" })),
        now,
      ),
    ).toBe("unknown");
  });

  it("keeps dated windows independent of source freshness and preserves upcoming", () => {
    expect(
      evaluateMvpLifecycle(
        input(null, {
          validityType: "dated",
          startDate: "2026-10-07",
          endDate: "2026-10-08",
        }),
        now,
      ),
    ).toBe("upcoming");
    expect(
      evaluateMvpLifecycle(
        input(null, {
          validityType: "dated",
          startDate: "2026-10-01",
          endDate: "2026-10-06",
        }),
        now,
      ),
    ).toBe("active");
    expect(
      evaluateMvpLifecycle(
        input(null, {
          validityType: "dated",
          startDate: "2026-10-01",
          endDate: "2026-10-05",
        }),
        now,
      ),
    ).toBe("expired");
    expect(
      evaluateMvpLifecycle(
        input(null, {
          validityType: "dated",
          startDate: null,
          endDate: "2026-10-05",
        }),
        now,
      ),
    ).toBe("unknown");
  });

  it("requires current-list capability and qualified present evidence for open-ended offers", () => {
    expect(evaluateMvpLifecycle(input(null), now)).toBe("unknown");
    expect(
      evaluateMvpLifecycle(
        input(observation({ capability: "historical_archive" })),
        now,
      ),
    ).toBe("unknown");
    expect(
      evaluateMvpLifecycle(
        input(observation({ presence: "unknown", lastSeenOnSource: null })),
        now,
      ),
    ).toBe("unknown");
    expect(
      evaluateMvpLifecycle(input(observation({ presence: "absent" })), now),
    ).toBe("withdrawn");
    expect(
      evaluateMvpLifecycle(input(observation({ firstSeenAt: null })), now),
    ).toBe("unknown");
    expect(
      evaluateMvpLifecycle(
        input(observation({ firstSeenAt: "2026-10-07T00:00:00+08:00" })),
        now,
      ),
    ).toBe("unknown");
    expect(
      evaluateMvpLifecycle(input(observation(), { startDate: null }), now),
    ).toBe("unknown");
  });

  it("does not activate an open-ended offer before its start day", () => {
    expect(
      evaluateMvpLifecycle(input(null, { startDate: "2026-10-07" }), now),
    ).toBe("upcoming");
    expect(
      evaluateMvpLifecycle(
        input(observation({ capability: "historical_archive" }), {
          startDate: "2026-10-07",
        }),
        now,
      ),
    ).toBe("upcoming");
  });
});
