import { describe, it, expect, vi } from "vitest";
import { DateTime } from "luxon";
import { GoogleOutletDiscovery } from "@/ingestion/resolution/google-discovery";
import { ResolutionCache } from "@/ingestion/resolution/cache";
import { MvpPipeline } from "@/ingestion/mvp/pipeline";
import {
  mvpSourceLocations,
  sourceLocationQuery,
} from "@/ingestion/mvp/source-location";
import { mvpListing } from "@/server/mvp";

const place = (name = "Suntec City", extra = {}) => ({
  id: "anchor",
  displayName: { text: name },
  formattedAddress: "3 Temasek Blvd, Singapore 038983",
  businessStatus: "OPERATIONAL",
  location: { latitude: 1.294, longitude: 103.858 },
  addressComponents: [
    { longText: "Singapore", shortText: "SG", types: ["country"] },
  ],
  ...extra,
});
function setup(merchant: unknown[] = [], fallback: unknown[] = [place()]) {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const q = JSON.parse(String(init?.body)).textQuery;
    return new Response(
      JSON.stringify({
        places: q.startsWith("Example Tea ") ? merchant : fallback,
      }),
    );
  });
  const discovery = new GoogleOutletDiscovery(
    new ResolutionCache(),
    "test",
    fetcher,
  );
  return { discovery, fetcher, pipeline: new MvpPipeline(discovery) };
}
async function process(
  pipeline: MvpPipeline,
  location: string,
  date = "Now - 30 Sep",
) {
  return (
    await pipeline.process(
      {
        text: `Example Tea\n➡️ 50% off tea\n📅 ${date}\n📍 ${location}`,
        channel: "tastesoulsg",
        url: "https://t.me/tastesoulsg/123",
        label: "Test",
        publishedAt: "2026-09-01T00:00:00Z",
      },
      DateTime.fromISO("2026-09-21T00:00:00+08:00"),
    )
  )[0];
}
describe("MVP source-location coordinate anchors", () => {
  it.each([
    ["Suntec City, #01-645", "Suntec City"],
    ["Paragon Shopping Centre, B1-15", "Paragon"],
    ["Plaza Singapura, B1-07", "Plaza Singapura"],
    ["Changi Airport T3, B2-11", "Changi Airport Terminal 3"],
    ["New Bahru, Factory Block L1", "New Bahru"],
  ])(
    "resolves %s without claiming unit/merchant verification",
    async (source, venue) => {
      const { pipeline, discovery, fetcher } = setup([], [place(venue)]);
      const p = await process(pipeline, source);
      expect(p.status).toBe("ready");
      expect(p.mapStatus).toBe("ready");
      expect(p.outlets[0]).toMatchObject({
        coordinateBasis: "google_source_location",
        address: source,
        sourceLocation: source,
        googlePlaceId: "anchor",
        googleFormattedAddress: "3 Temasek Blvd, Singapore 038983",
      });
      expect(p.locationAudit[0]).toMatchObject({
        merchantResult: "merchant_place_match_failed",
        fallbackResult: "source_location_coordinate_resolved",
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
      const audit = await discovery.discoverMvp("Example Tea", [source]);
      expect(audit.branches[0].existenceEvidence).toEqual([]);
      expect(mvpListing(p).outlets[0].coordinateBasis).toBe(
        "google_source_location",
      );
    },
  );
  it.each([
    "254 Jalan Kayu",
    "168 Robinson Road, #01-09",
    "167–169 Telok Ayer Street",
  ])(
    "matches exact street identity %s with absent address business status",
    async (source) => {
      const query = sourceLocationQuery(source);
      const { pipeline } = setup(
        [],
        [
          place(query, {
            formattedAddress: `${query}, Singapore`,
            businessStatus: undefined,
          }),
        ],
      );
      const p = await process(pipeline, source);
      expect(p.status).toBe("ready");
      expect(p.outlets[0].businessStatus).toBeNull();
      expect(p.outlets[0].address).toBe(source);
    },
  );
  it.each([
    [
      "ambiguous",
      [place(), place("Suntec City", { id: "other" })],
      "source_location_ambiguous",
    ],
    [
      "closed",
      [place("Suntec City", { businessStatus: "CLOSED_PERMANENTLY" })],
      "source_location_closed_or_unavailable",
    ],
    [
      "temporary closure",
      [place("Suntec City", { businessStatus: "CLOSED_TEMPORARILY" })],
      "source_location_closed_or_unavailable",
    ],
    [
      "foreign country",
      [
        place("Suntec City", {
          addressComponents: [
            { longText: "Malaysia", shortText: "MY", types: ["country"] },
          ],
        }),
      ],
      "source_location_not_found",
    ],
    [
      "foreign coordinates",
      [place("Suntec City", { location: { latitude: 3.1, longitude: 101.7 } })],
      "source_location_not_found",
    ],
    [
      "merchant sharing address",
      [
        place("Another Restaurant", {
          formattedAddress: "Suntec City, Singapore",
        }),
      ],
      "source_location_not_found",
    ],
    ["empty", [], "source_location_not_found"],
  ])("rejects %s", async (_label, places, reason) => {
    const { pipeline } = setup([], places as unknown[]);
    const p = await process(pipeline, "Suntec City, #01-645");
    expect(p.status).toBe("needs_location");
    expect(p.outlets).toEqual([]);
    expect(p.locationAudit[0].fallbackResult).toBe(reason);
  });
  it.each([
    ["254 Jalan Kayu", "256 Jalan Kayu, Singapore"],
    ["254 Jalan Kayu", "254 Jalan Besar, Singapore"],
    ["167-169 Telok Ayer Street", "167 Telok Ayer St, Singapore"],
  ])("rejects mismatched street address %s / %s", async (source, address) => {
    const { pipeline } = setup(
      [],
      [place("Other business", { formattedAddress: address })],
    );
    expect((await process(pipeline, source)).status).toBe("needs_location");
  });
  it("prefers an operational merchant match without querying fallback", async () => {
    const { pipeline, fetcher } = setup([
      place("Example Tea Suntec City", {
        formattedAddress: "Suntec City #01-645, Singapore",
      }),
    ]);
    const p = await process(pipeline, "Suntec City, #01-645");
    expect(p.status).toBe("ready");
    expect(p.outlets[0].coordinateBasis).toBe("google_merchant_place");
    expect(p.locationAudit[0].fallbackResult).toBe("not_attempted");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps strict discovery from falling back", async () => {
    const { discovery, fetcher } = setup();
    const s = await discovery.discover("Example Tea", ["Suntec City, #01-645"]);
    expect(s.branches).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(s.locationAudit).toBeUndefined();
  });
  it("distinguishes a cache miss from a completed empty search", async () => {
    const discovery = new GoogleOutletDiscovery(
      new ResolutionCache(),
      "test",
      async () => {
        throw new Error("google_cache_missing");
      },
    );
    const p = await process(new MvpPipeline(discovery), "Suntec City");
    expect(p.reasons).toEqual(["google_cache_missing:Suntec City"]);
    expect(p.locationAudit[0].merchantResult).toBe("google_cache_missing");
    expect(p.locationAudit[0].fallbackResult).toBe("not_attempted");
  });
  it("does not use a partially paginated fallback", async () => {
    let page = 0;
    const discovery = new GoogleOutletDiscovery(
      new ResolutionCache(),
      "test",
      async (_url, init) =>
        new Response(
          JSON.stringify(
            JSON.parse(String(init?.body)).textQuery.startsWith("Example Tea")
              ? { places: [] }
              : { places: [place()], nextPageToken: `page-${++page}` },
          ),
        ),
    );
    const p = await process(new MvpPipeline(discovery), "Suntec City");
    expect(p.status).toBe("needs_location");
    expect(p.locationAudit[0].fallbackResult).toBe(
      "source_location_pagination_incomplete",
    );
  });
  it("preserves two source units sharing a Google venue ID", async () => {
    const { pipeline } = setup();
    const p = await process(
      pipeline,
      "Suntec City, #01-645 | Suntec City, #02-001",
    );
    expect(p.outlets).toHaveLength(2);
    expect(new Set(mvpListing(p).outlets.map((o) => o.id)).size).toBe(2);
  });
  it("retains a failed location audit when another location resolves", async () => {
    const { pipeline } = setup();
    const p = await process(pipeline, "Suntec City | Other Mall");
    expect(p.status).toBe("ready");
    expect(p.locationAudit).toHaveLength(2);
    expect(p.reasons).toContain("source_location_not_found:Other Mall");
  });
  it("preserves validity gating", async () => {
    const { pipeline, fetcher } = setup();
    expect((await process(pipeline, "Suntec City", "Ongoing")).status).toBe(
      "needs_validity",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retains attached floor descriptions and splits explicit venue separators", () => {
    expect(
      mvpSourceLocations(
        "IKEA Alexandra Bistro | IKEA Tampines Bistro, L1 & L3 | IKEA Jurong Bistro",
      ),
    ).toEqual([
      "IKEA Alexandra Bistro",
      "IKEA Tampines Bistro, L1 & L3",
      "IKEA Jurong Bistro",
    ]);
    expect(mvpSourceLocations("Plaza Singapura, Canopy Plaza Level 1")).toEqual(
      ["Plaza Singapura, Canopy Plaza Level 1"],
    );
    expect(sourceLocationQuery("Isetan Scotts Supermarket, B1")).toBe(
      "Isetan Scotts Supermarket",
    );
  });
});

it("prefers a unique exact-address building over tenants without accepting a wrong-address building", async () => {
  const { pipeline } = setup(
    [],
    [
      place("Venue", {
        formattedAddress: "30 Victoria St, Singapore",
        types: ["plaza"],
      }),
      place("Tenant", {
        id: "tenant",
        formattedAddress: "30 Victoria St, #01-02, Singapore",
        types: ["restaurant"],
      }),
      place("Wrong building", {
        id: "wrong",
        formattedAddress: "32 Victoria St, Singapore",
        types: ["plaza"],
      }),
    ],
  );
  const p = await process(pipeline, "30 Victoria Street, #02-01B");
  expect(p.status).toBe("ready");
  expect(p.outlets[0].googlePlaceId).toBe("anchor");
});
it("retains ambiguity between two matching buildings", async () => {
  const { pipeline } = setup(
    [],
    [
      place("A", {
        formattedAddress: "30 Victoria St, Singapore",
        types: ["plaza"],
      }),
      place("B", {
        id: "other",
        formattedAddress: "30 Victoria St, Singapore",
        types: ["premise"],
      }),
    ],
  );
  expect((await process(pipeline, "30 Victoria Street")).reasons).toContain(
    "source_location_ambiguous:30 Victoria Street",
  );
});
it("uses full structured street components instead of ambiguous abbreviations", async () => {
  const { pipeline } = setup(
    [],
    [
      place("Other name", {
        formattedAddress: "254 Jln Kayu, Singapore",
        addressComponents: [
          { longText: "Singapore", shortText: "SG", types: ["country"] },
          { longText: "254", types: ["street_number"] },
          { longText: "Jalan Kayu", types: ["route"] },
        ],
      }),
    ],
  );
  expect((await process(pipeline, "254 Jalan Kayu")).status).toBe("ready");
});
it("matches a complete explicit numbered range but not a partial list", async () => {
  const good = setup(
    [],
    [
      place("Another name", {
        formattedAddress: "47,48,49, Pekin St, #01-01, Singapore",
      }),
    ],
  );
  expect((await process(good.pipeline, "47–49 Pekin Street")).status).toBe(
    "ready",
  );
  const bad = setup(
    [],
    [place("Another name", { formattedAddress: "47,49, Pekin St, Singapore" })],
  );
  expect((await process(bad.pipeline, "47–49 Pekin Street")).status).toBe(
    "needs_location",
  );
});
it("does not let a display name override conflicting street coordinates", async () => {
  const { pipeline } = setup(
    [],
    [
      place("254 Jalan Kayu", {
        formattedAddress: "256 Jalan Kayu, Singapore",
      }),
    ],
  );
  expect((await process(pipeline, "254 Jalan Kayu")).status).toBe(
    "needs_location",
  );
});
it("rejects a bus stop even with the exact terminal name", async () => {
  const { pipeline } = setup(
    [],
    [place("Changi Airport Terminal 3", { types: ["bus_stop"] })],
  );
  expect((await process(pipeline, "Changi Airport T3, B2-11")).status).toBe(
    "needs_location",
  );
});
it("requires the exact named store and supermarket category for a supermarket suffix", async () => {
  const good = setup(
    [],
    [place("Isetan Scotts", { types: ["department_store", "supermarket"] })],
  );
  expect(
    (await process(good.pipeline, "Isetan Scotts Supermarket, B1")).status,
  ).toBe("ready");
  for (const p of [
    place("Isetan Scotts", { types: ["department_store"] }),
    place("Isetan Other", { types: ["supermarket"] }),
  ]) {
    expect(
      (await process(setup([], [p]).pipeline, "Isetan Scotts Supermarket, B1"))
        .status,
    ).toBe("needs_location");
  }
});
