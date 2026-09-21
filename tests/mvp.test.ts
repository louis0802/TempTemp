import { describe, it, expect, vi } from "vitest";
import { DateTime } from "luxon";
import { MvpPipeline } from "@/ingestion/mvp/pipeline";
import { mvpPromotionSchema, visibleMvp } from "@/domain/mvp";
import { GoogleOutletDiscovery } from "@/ingestion/resolution/google-discovery";
import { ResolutionCache } from "@/ingestion/resolution/cache";
import { getMvpPromotions } from "@/server/mvp";
const now = DateTime.fromISO("2026-09-21T12:00:00+08:00");
const place = (id = "place-1", extra = {}) => ({
  id,
  displayName: { text: "Example Tea Bugis" },
  formattedAddress: "Bugis, Singapore",
  businessStatus: "OPERATIONAL",
  location: { latitude: 1.3, longitude: 103.85 },
  addressComponents: [
    { longText: "Singapore", shortText: "SG", types: ["country"] },
  ],
  ...extra,
});
function setup(pages: unknown[] = [{ places: [place()] }]) {
  const fetcher = vi.fn(
    async () => new Response(JSON.stringify(pages.shift() ?? { places: [] })),
  );
  return {
    pipeline: new MvpPipeline(
      new GoogleOutletDiscovery(new ResolutionCache(), "test", fetcher),
    ),
    fetcher,
  };
}
const source = (body: string) => ({
  text: `Example Tea\n➡️ 50% off tea\n${body}`,
  channel: "tastesoulsg",
  url: "https://t.me/tastesoulsg/123",
  label: "Test",
  publishedAt: "2026-09-01T17:00:00Z",
});
describe("MVP validity and locations", () => {
  it.each([
    ["Now - 30 Sep", "2026-09-02", "2026-09-30"],
    ["Today", "2026-09-02", "2026-09-02"],
    ["1 Sep - 30 Sep", "2026-09-01", "2026-09-30"],
    ["22 Sep", "2026-09-22", "2026-09-22"],
    ["22 Sep (Tue)", "2026-09-22", "2026-09-22"],
    ["Every Friday, 1 Sep - 30 Nov", "2026-09-01", "2026-11-30"],
  ])(
    "resolves %s without category or directory evidence",
    async (text, start, end) => {
      const { pipeline } = setup();
      const [p] = await pipeline.process(source(`📅 ${text}`), now);
      expect(p.status).toBe("ready");
      expect(p.startDate).toBe(start);
      expect(p.endDate).toBe(end);
      expect(p.outlets[0]).toMatchObject({
        googlePlaceId: "place-1",
        latitude: 1.3,
        longitude: 103.85,
      });
      if (text.startsWith("Every")) expect(p.weekdays).toEqual([5]);
    },
  );
  it.each(["Every Friday", "Ongoing", "Limited time", "Now", ""])(
    "missing end remains needs_validity: %s",
    async (d) => {
      const { pipeline, fetcher } = setup();
      const [p] = await pipeline.process(source(d ? `📅 ${d}` : ""), now);
      expect(p.status).toBe("needs_validity");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([
    "All outlets",
    "Selected outlets only",
    "All outlets excluding Airport",
    "",
  ])(
    "preserves restrictions and defaults merchant locations: %s",
    async (scope) => {
      const { pipeline } = setup();
      const [p] = await pipeline.process(
        source(`📅 Now - 30 Sep\n${scope ? `📍 ${scope}` : ""}`),
        now,
      );
      expect(p.status).toBe("ready");
      expect(p.mapCoverageBasis).toBe("google_merchant_locations");
      expect(p.description).toContain(scope);
    },
  );
  it("named locations search only named location", async () => {
    const { pipeline, fetcher } = setup();
    const [p] = await pipeline.process(source("📅 Today\n📍 Bugis"), now);
    expect(p.status).toBe("ready");
    expect(p.mapCoverageBasis).toBe("source_named_outlets");
    expect(
      JSON.parse(
        (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
          .body as string,
      ).textQuery,
    ).toContain("Bugis");
  });
  it("paginates, coalesces merchant calls and rejects closed and foreign places", async () => {
    const fetcher = vi.fn(
      async (_url: unknown, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            JSON.parse(init!.body as string).pageToken
              ? {
                  places: [
                    place(),
                    place("closed", { businessStatus: "CLOSED_PERMANENTLY" }),
                    place("foreign", {
                      addressComponents: [
                        {
                          longText: "Malaysia",
                          shortText: "MY",
                          types: ["country"],
                        },
                      ],
                    }),
                  ],
                }
              : { places: [place()], nextPageToken: "next" },
          ),
        ),
    );
    const pipeline = new MvpPipeline(
      new GoogleOutletDiscovery(new ResolutionCache(), "test", fetcher),
    );
    const [p] = await pipeline.process(source("📅 Today"), now);
    await pipeline.process(source("📅 30 Sep"), now);
    expect(p.outlets).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("online-only offers have no pins", async () => {
    const { pipeline, fetcher } = setup();
    const [p] = await pipeline.process(source("📅 Today\n📍 Online only"), now);
    expect(p.status).toBe("exclude");
    expect(p.outlets).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("splits branch-owned periods and preserves shared restrictions", async () => {
    const { pipeline } = setup([
      { places: [place()] },
      {
        places: [
          place("second", {
            displayName: { text: "Example Tea Orchard" },
            formattedAddress: "Orchard, Singapore",
          }),
        ],
      },
    ]);
    const rows = await pipeline.process(
      source("Members only.\n📅 1 Sep\n📍 Bugis\n📅 2 Sep\n📍 Orchard"),
      now,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((p) => p.startDate)).toEqual(["2026-09-01", "2026-09-02"]);
    expect(rows.every((p) => p.description.includes("Members only."))).toBe(
      true,
    );
    expect(rows[0].description).not.toContain("Orchard");
  });
  it("does not collapse ambiguous waves", async () => {
    const { pipeline } = setup();
    const [p] = await pipeline.process(
      source("📅 Now - 30 Sep (Wave 1) | 1 - 22 Oct (Wave 2)"),
      now,
    );
    expect(p.status).toBe("needs_validity");
  });
  it("separates historical readiness from live expiry and filters API bounds", async () => {
    const { pipeline } = setup();
    const [p] = await pipeline.process(source("📅 Today"), now);
    expect(p.status).toBe("ready");
    expect(p.lifecycle).toBe("expired");
    expect(visibleMvp([p], false, now)).toEqual([]);
    expect(visibleMvp([p], true, now)).toHaveLength(1);
    const active = { ...p, startDate: "2026-09-01", endDate: "2026-09-30" };
    expect(visibleMvp([active], false, now)).toHaveLength(1);
    expect(
      (await getMvpPromotions([103.6, 1.15, 104.1, 1.5], null, true, now, [p]))
        .items,
    ).toHaveLength(1);
    expect(
      (await getMvpPromotions([103.6, 1.15, 103.7, 1.2], null, true, now, [p]))
        .items,
    ).toHaveLength(0);
    expect(mvpPromotionSchema.safeParse({ ...p, endDate: null }).success).toBe(
      false,
    );
  });
});

it("accepts Google's untyped address components without dropping valid country evidence", async () => {
  const { pipeline } = setup([
    {
      places: [
        place("valid", {
          addressComponents: [
            { longText: "Unknown component" },
            { longText: "Singapore", shortText: "SG", types: ["country"] },
          ],
        }),
      ],
    },
  ]);
  expect((await pipeline.process(source("📅 Today"), now))[0].status).toBe(
    "ready",
  );
});
it("MVP merchant matching permits diacritics/spacing without prefix collisions", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          places: [
            place("correct", { displayName: { text: "ExampleTea Bugis" } }),
            place("wrong", { displayName: { text: "ExampleTeaShop Bugis" } }),
          ],
        }),
      ),
  );
  const pipeline = new MvpPipeline(
    new GoogleOutletDiscovery(new ResolutionCache(), "test", fetcher, true),
  );
  const [p] = await pipeline.process(source("📅 Today"), now);
  expect(p.outlets.map((o) => o.googlePlaceId)).toEqual(["correct"]);
});
it("resolves standalone validity lines without calendar emoji", async () => {
  const { pipeline } = setup();
  const [p] = await pipeline.process(source("Now - 30 Sep"), now);
  expect(p.status).toBe("ready");
  expect(p.endDate).toBe("2026-09-30");
});
it("does not ignore contradictory calendar claims outside date lines", async () => {
  const { pipeline } = setup();
  const [p] = await pipeline.process(
    source("📅 Now - 30 Sep\nOffer ends on 15 Sep"),
    now,
  );
  expect(p.status).toBe("needs_validity");
});
it("retains restrictions when splitting a finite date list", async () => {
  const { pipeline } = setup();
  const rows = await pipeline.process(
    source("📅 12 & 19 Sep (members only)"),
    now,
  );
  expect(rows).toHaveLength(2);
  expect(rows.every((p) => p.description.includes("members only"))).toBe(true);
});
