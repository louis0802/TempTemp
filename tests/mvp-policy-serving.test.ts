import { afterEach, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleMvp } from "@/domain/mvp";
import {
  mvpListingAt,
  parseMvpArtifact,
  presentMvpListing,
  readMvpData,
} from "@/server/mvp";
import { GET as list } from "@/app/api/mvp/promotions/route";
import { GET as detail } from "@/app/api/mvp/promotions/[id]/route";
import { policyRecord } from "./helpers/mvp-policy";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const now = DateTime.fromISO("2026-10-06T15:00:00+08:00");
it("recomputes TTL at serving time without rebuilding or mutating receipt", () => {
  const fresh = policyRecord(),
    before = JSON.stringify(fresh);
  expect(visibleMvp([fresh], "live", now)).toHaveLength(1);
  const later = now.plus({ days: 11 });
  expect(visibleMvp([fresh], "live", later)).toEqual([]);
  expect(visibleMvp([fresh], "live_with_expired", later)).toEqual([]);
  expect(visibleMvp([fresh], "corpus", later)[0].lifecycle).toBe("stale");
  expect(JSON.stringify(fresh)).toBe(before);
});
it("supports v2 reads without fabricating policy metadata and gates v3 opt-in", async () => {
  const legacy = JSON.parse(await readFile("data/mvp-promotions.json", "utf8"));
  expect(parseMvpArtifact(legacy, "source_observed")).toHaveLength(200);
  expect(
    parseMvpArtifact(legacy, "source_observed")[0].offerPolicy,
  ).toBeUndefined();
  const artifact = {
    version: 3,
    policyVersion: "mvp-offer-policy-v1",
    records: [policyRecord()],
  };
  expect(() => parseMvpArtifact(artifact, "legacy")).toThrow();
  expect(parseMvpArtifact(artifact, "source_observed")).toHaveLength(1);
  vi.stubEnv("MVP_OFFER_POLICY", "legacy");
  expect(await readMvpData()).toEqual(parseMvpArtifact(legacy, "legacy"));
});
it("uses listed-hours terminology with conservative incomplete opening and scoped rules", () => {
  const record = policyRecord();
  expect(mvpListingAt(record, now).scheduleState).toBe(
    "Within listed offer hours",
  );
  record.offerPolicy!.scheduleRules[0] = {
    ...record.offerPolicy!.scheduleRules[0],
    timeKind: "opening_to",
    start: null,
  };
  expect(mvpListingAt(record, now).scheduleState).toBe("Check source");
  expect(mvpListingAt(record, now.plus({ hours: 3 })).scheduleState).toBe(
    "Outside listed offer hours",
  );
  record.offerPolicy!.scheduleRules[0].outletNames = [
    "Unresolved selected outlet",
  ];
  expect(mvpListingAt(record, now).scheduleState).toBe("Check source");
  expect(mvpListingAt(record, now).redeemableNow).toBe(false);
});
it("production list/detail expose official text, preserve Telegram privacy and hide stale/absent/upcoming", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mvp-policy-api-"));
  try {
    const official = policyRecord("official"),
      telegram = policyRecord("telegram"),
      stale = policyRecord("stale"),
      absent = policyRecord("absent"),
      upcoming = policyRecord("upcoming");
    telegram.offerPolicy!.sourceTextPolicy = "telegram_private";
    telegram.description = "Telegram private original full text";
    stale.offerPolicy!.sourceObservation!.lastSeenOnSource =
      "2026-09-01T00:00:00Z";
    absent.offerPolicy!.sourceObservation!.presence = "absent";
    upcoming.startDate = "2026-11-01";
    const file = join(dir, "artifact.json");
    await writeFile(
      file,
      JSON.stringify({
        version: 3,
        policyVersion: "mvp-offer-policy-v1",
        records: [official, telegram, stale, absent, upcoming],
      }),
    );
    vi.stubEnv("MVP_OFFER_POLICY", "source_observed");
    vi.stubEnv("MVP_POLICY_DATA_PATH", file);
    vi.stubEnv("NODE_ENV", "production");
    vi.useFakeTimers();
    vi.setSystemTime(now.toJSDate());
    const response = await list(
      new Request(
        "http://local/api/mvp/promotions?showSourceText=true&view=corpus",
      ),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items.map((p: { id: string }) => p.id).sort()).toEqual(
      [official.id, telegram.id].sort(),
    );
    expect(
      data.items.find((p: { id: string }) => p.id === official.id).description,
    ).toBe(official.description);
    expect(JSON.stringify(data)).not.toContain(telegram.description);
    for (const record of [stale, absent, upcoming])
      expect(
        (
          await detail(new Request("http://local/api/mvp/promotions/x"), {
            params: Promise.resolve({ id: record.id }),
          })
        ).status,
      ).toBe(404);
    expect(
      presentMvpListing(mvpListingAt(telegram, now), true).description,
    ).toBe("");
    expect(
      data.items.every(
        (p: { redeemableNow: boolean }) => p.redeemableNow === false,
      ),
    ).toBe(true);
  } finally {
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  }
});
