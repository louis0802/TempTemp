import { afterEach, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import {
  searchIdentity,
  searchListings,
  targetBounds,
} from "@/domain/discovery-search";
import { visibleMvp } from "@/domain/mvp";
import { getMvpPromotions, mvpListing, readMvpData } from "@/server/mvp";
import { GET } from "@/app/api/mvp/search/route";
const now = DateTime.fromISO("2026-09-22T12:00:00+08:00");
const records = await readMvpData();
const listings = (mode: "live" | "live_with_expired" | "corpus") =>
  visibleMvp(records, mode, now).map(mvpListing);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("aggregates apostrophe variants, finds deals and locations, and honors lifecycle", () => {
  const result = searchListings(listings("live_with_expired"), "Morganfield");
  const merchant = result.find((r) => r.kind === "merchant")!;
  expect(result.filter((r) => r.kind === "merchant")).toHaveLength(1);
  expect(merchant.promotionIds).toHaveLength(2);
  expect(merchant.points).toHaveLength(1);
  expect(merchant.context).toContain("Suntec City");
  expect(searchListings(listings("live"), "Morganfield")).toEqual([]);
  expect(searchListings(listings("live"), "Genki")[0]).toMatchObject({
    kind: "merchant",
    label: "Genki Sushi",
  });
  expect(
    searchListings(listings("live_with_expired"), "Angus Ribeye").some(
      (r) => r.kind === "deal" && r.label.includes("Angus Ribeye"),
    ),
  ).toBe(true);
  expect(
    searchListings(listings("live_with_expired"), "Suntec").some(
      (r) => r.kind === "location" && r.label === "Suntec City",
    ),
  ).toBe(true);
  expect(searchIdentity("  Morganfield’s ")).toBe("morganfield's");
  expect(searchIdentity("Genki Sushi")).not.toBe(searchIdentity("GenkiSushi"));
});
it("searches independently of viewport and fits every multi-outlet location", async () => {
  expect(
    (
      await getMvpPromotions(
        [103.6, 1.15, 103.60001, 1.15001],
        null,
        "live",
        now,
        records,
      )
    ).items,
  ).toEqual([]);
  const genki = searchListings(listings("live"), "Genki")[0];
  expect(genki.points.length).toBeGreaterThan(1);
  const [w, s, e, n] = targetBounds(genki.points)!;
  expect(
    genki.points.every((p) => p.lng > w && p.lng < e && p.lat > s && p.lat < n),
  ).toBe(true);
  expect(targetBounds([])).toBeNull();
});
it("never indexes or exposes raw source text and keeps deterministic bounded ranking", () => {
  const base = listings("live")[0];
  const data = [
    {
      ...base,
      merchant: "Needle",
      title: "Other",
      benefit: "Other",
      description: "privatecanary",
      terms: ["privatecanary"],
    },
    { ...base, id: "second", merchant: "Needle prefix" },
    { ...base, id: "third", merchant: "Other merchant", title: "Needle" },
  ];
  expect(searchListings(data, "privatecanary")).toEqual([]);
  expect(searchListings(data, "Needle")[0]).toMatchObject({
    kind: "merchant",
    label: "Needle",
    rank: 0,
  });
  expect(JSON.stringify(searchListings(data, "Needle"))).not.toContain(
    "privatecanary",
  );
  const a = searchListings(listings("corpus"), "1-for-1");
  expect(a).toEqual(searchListings(listings("corpus"), "1-for-1"));
  for (const kind of ["merchant", "deal", "location"])
    expect(a.filter((r) => r.kind === kind).length).toBeLessThanOrEqual(5);
});
it.each(["development", "production"])(
  "endpoint reuses gates and ignores source-text flag in %s",
  async (env) => {
    vi.stubEnv("NODE_ENV", env);
    vi.useFakeTimers();
    vi.setSystemTime(now.toJSDate());
    const request = async (q: string) =>
      (await GET(new Request(`http://localhost/api/mvp/search?${q}`))).json();
    for (const flag of ["includeExpired=true", "view=corpus"]) {
      const result = await request(`q=Morganfield&${flag}`);
      expect(result.items.length > 0).toBe(env === "development");
      expect(
        await request(`q=Morganfield&${flag}&showSourceText=true`),
      ).toEqual(result);
    }
    const corpusOnly = records.find((p) => p.mapStatus === "online_only")!;
    const corpus = await request(
      `q=${encodeURIComponent(corpusOnly.title)}&view=corpus`,
    );
    expect(
      corpus.items.some((r: { id: string }) => r.id === corpusOnly.id),
    ).toBe(env === "development");
    expect((await request("q=Genki")).items[0].label).toBe("Genki Sushi");
  },
);
it("validates query lengths", async () => {
  for (const q of ["", "x", "a".repeat(101)])
    expect(
      (await GET(new Request(`http://localhost/api/mvp/search?q=${q}`))).status,
    ).toBe(400);
});
