import { afterEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { visibleMvp, type MvpPromotion } from "@/domain/mvp";
import {
  getMvpPromotions,
  mvpListing,
  mvpPreviewOptions,
  presentMvpListing,
  readMvpData,
} from "@/server/mvp";
import { GET as list } from "@/app/api/mvp/promotions/route";
import { GET as detail } from "@/app/api/mvp/promotions/[id]/route";
const now = DateTime.fromISO("2026-09-22T12:00:00+08:00");
const records = await readMvpData();
const base = records.find(
  (p) => p.status === "ready" && p.mapStatus === "ready",
)!;
const active = { ...base, startDate: "2026-09-01", endDate: "2026-09-30" };
const expired = {
  ...base,
  id: "00000000-0000-4000-8000-000000000001",
  startDate: "2026-08-01",
  endDate: "2026-08-30",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("explicit MVP serving modes", () => {
  it("includes only equally ready expired physical offers and preserves bounds", async () => {
    const incomplete: MvpPromotion[] = [
      {
        ...expired,
        status: "needs_validity",
        validityStatus: "needs_validity",
      },
      {
        ...expired,
        status: "needs_content_resolution",
        contentStatus: "needs_content_resolution",
      },
      {
        ...expired,
        status: "needs_location",
        mapStatus: "needs_location",
        outlets: [],
      },
      {
        ...expired,
        mapStatus: "online_only",
        outletScope: "online_only",
        outlets: [],
      },
      { ...active, startDate: "2026-10-01", endDate: "2026-10-30" },
    ];
    const data = [active, expired, ...incomplete];
    expect(visibleMvp(data, "live", now)).toHaveLength(1);
    expect(visibleMvp(data, "live_with_expired", now)).toHaveLength(2);
    expect(visibleMvp(data, "corpus", now)).toHaveLength(data.length);
    const tiny = [103.6, 1.15, 103.60001, 1.15001];
    expect(
      (await getMvpPromotions(tiny, null, "live_with_expired", now, data))
        .items,
    ).toEqual([]);
    expect(
      (await getMvpPromotions(tiny, null, "corpus", now, data)).items,
    ).toHaveLength(data.length);
  });
  it("retains the full 200-record corpus", () => {
    expect(visibleMvp(records, "corpus", now)).toHaveLength(200);
  });
  it.each(["development", "production"])(
    "gates both list and detail responses in %s",
    async (env) => {
      vi.stubEnv("NODE_ENV", env);
      vi.useFakeTimers();
      vi.setSystemTime(now.toJSDate());
      const query = new URLSearchParams(
        "includeExpired=true&showSourceText=true",
      );
      expect(mvpPreviewOptions(query)).toEqual({
        mode: env === "production" ? "live" : "live_with_expired",
        showSourceText: env !== "production",
      });
      const response = await list(
        new Request(`http://localhost/api/mvp/promotions?${query}`),
      );
      const body = await response.json();
      expect(body.items.length).toBeGreaterThan(0);
      expect(
        body.items.every((p: { description: string }) =>
          env === "production" ? !p.description : !!p.description,
        ),
      ).toBe(true);
      const old = records.find(
        (p) => p.merchant.includes("Morganfield") && p.status === "ready",
      )!;
      const result = await detail(
        new Request(`http://localhost/api/mvp/promotions/${old.id}?${query}`),
        { params: Promise.resolve({ id: old.id }) },
      );
      expect(result.status).toBe(env === "production" ? 404 : 200);
      const corpus = mvpPreviewOptions(
        new URLSearchParams("view=corpus&showSourceText=true"),
      );
      expect(corpus.mode).toBe(env === "production" ? "live" : "corpus");
      if (env === "production")
        expect(
          body.items.every(
            (p: { mvpState: { lifecycle: string } }) =>
              p.mvpState.lifecycle === "active",
          ),
        ).toBe(true);
    },
  );
  it("hides both raw copies by default, preserves links and never mutates storage", () => {
    vi.stubEnv("NODE_ENV", "development");
    const listing = mvpListing(base);
    const hidden = presentMvpListing(listing, false);
    expect(hidden.description).toBe("");
    expect(hidden.terms).toEqual([]);
    expect(hidden.sources[0].url).toBe(base.sourceUrl);
    expect(listing.description).toBe(base.description);
    expect(presentMvpListing(listing, true).description).toBe(base.description);
    expect(presentMvpListing(listing, true).terms).toEqual([]);
    vi.stubEnv("NODE_ENV", "production");
    expect(presentMvpListing(listing, true).description).toBe("");
  });
});
