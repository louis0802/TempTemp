import { describe, it, expect, vi } from "vitest";
import { DateTime } from "luxon";
import { GoogleOutletDiscovery } from "@/ingestion/resolution/google-discovery";
import { ResolutionCache } from "@/ingestion/resolution/cache";
import { PromotionParticipationResolver } from "@/ingestion/resolution/outlets";
import { OutletScopeResolver } from "@/ingestion/resolution/patterns";
import { PromotionPipeline } from "@/ingestion/resolution/pipeline";
const p = (overrides: Record<string, unknown> = {}) => ({
  id: "google-1",
  displayName: { text: "Example Sushi Suntec City" },
  formattedAddress:
    "3 Temasek Boulevard, #01-645, Suntec City, Singapore 038983",
  location: { latitude: 1.294, longitude: 103.858 },
  businessStatus: "OPERATIONAL",
  addressComponents: [
    { longText: "Singapore", shortText: "SG", types: ["country"] },
    { longText: "038983", types: ["postal_code"] },
    { longText: "01-645", types: ["subpremise"] },
  ],
  ...overrides,
});
const evidence = {
  url: "https://t.me/tastesoulsg/123",
  checkedAt: "2026-09-18T00:00:00Z",
  summary: "Promotion source names Suntec City, #01-645",
};
function setup(data: unknown = { places: [p()] }) {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(data)));
  const discovery = new GoogleOutletDiscovery(
    new ResolutionCache(),
    "test-key",
    fetcher,
  );
  const geocode = vi.fn(async () => {
    throw new Error("Must reuse Google coordinates");
  });
  const resolver = new PromotionParticipationResolver(
    [],
    { resolve: geocode },
    undefined,
    discovery,
  );
  return { fetcher, discovery, resolver, geocode };
}
describe("Generic Google merchant lookup", () => {
  it("resolves named branches without a merchant adapter or a second geocoding request", async () => {
    const { resolver, fetcher, geocode } = setup();
    const a = await resolver.resolve(
      "Example Sushi",
      new OutletScopeResolver().resolve("📍 Suntec City, #01-645"),
      evidence,
    );
    expect(a.issues).toEqual([]);
    expect(a.complete).toBe(true);
    expect(a.included).toHaveLength(1);
    expect(a.included[0].placeId).toBe("google-1");
    expect(a.included[0].participationEvidence).toEqual([evidence]);
    expect(a.included[0].existenceEvidence[0].url).toContain(
      "query_place_id=google-1",
    );
    expect(a.included[0].coordinatePrecision).toBe("building");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(geocode).not.toHaveBeenCalled();
  });
  it("allows complete named-location promotions through deterministic eligibility", async () => {
    const { resolver } = setup();
    const [r] = await new PromotionPipeline(resolver).process(
      {
        text: "🍣 Example Sushi 🍣\n➡️ 50% off sushi\n📅 Now - 30 Sep\n📍 Suntec City, #01-645\nMembers only.",
        publishedAt: "2026-09-18T00:00:00Z",
        url: evidence.url,
        label: "TasteSoul",
        channel: "tastesoulsg",
      },
      DateTime.fromISO("2026-09-18T10:00:00Z"),
    );
    expect(r.reasons).toEqual([
      "verified_current_promotion_complete_outlet_audit",
    ]);
    expect(r.action).toBe("approve");
  });
  it("discovers other merchant branches while keeping all-outlet completeness unresolved", async () => {
    const { resolver } = setup();
    const a = await resolver.resolve(
      "Example Sushi",
      new OutletScopeResolver().resolve("All outlets"),
      evidence,
    );
    expect(a.included).toHaveLength(1);
    expect(a.complete).toBe(false);
    expect(a.directoryAudit.authoritative).toBe(false);
    expect(a.issues).toContain("google_search_not_authoritative_enumeration");
    expect(a.issues).toContain("incomplete_all_outlet_enumeration");
  });
  it.each([
    [
      "wrong merchant",
      { places: [p({ displayName: { text: "Example Sushiro Suntec City" } })] },
    ],
    [
      "wrong branch",
      {
        places: [
          p({
            displayName: { text: "Example Sushi Orchard" },
            formattedAddress: "Orchard Road #01-645 Singapore 038983",
          }),
        ],
      },
    ],
    [
      "wrong unit",
      {
        places: [
          p({
            addressComponents: [
              { longText: "Singapore", shortText: "SG", types: ["country"] },
              { longText: "02-645", types: ["subpremise"] },
            ],
          }),
        ],
      },
    ],
    ["missing country", { places: [p({ addressComponents: [] })] }],
    [
      "outside Singapore",
      { places: [p({ location: { latitude: 3.1, longitude: 101.7 } })] },
    ],
    ["multiple matches", { places: [p(), p({ id: "google-2" })] }],
    ["closed", { places: [p({ businessStatus: "CLOSED_PERMANENTLY" })] }],
    [
      "temporarily closed",
      { places: [p({ businessStatus: "CLOSED_TEMPORARILY" })] },
    ],
  ])("rejects %s", async (_label, data) => {
    const { resolver } = setup(data);
    expect(
      (
        await resolver.resolve(
          "Example Sushi",
          new OutletScopeResolver().resolve("📍 Suntec City, #01-645"),
          evidence,
        )
      ).complete,
    ).toBe(false);
  });
  it("requires selected participation before searching Google", async () => {
    const { resolver, fetcher } = setup();
    expect(
      (
        await resolver.resolve(
          "Example Sushi",
          new OutletScopeResolver().resolve("Selected outlets"),
          evidence,
        )
      ).complete,
    ).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("resolves a verified selected list through Google without chain expansion", async () => {
    const { discovery, geocode, fetcher } = setup();
    const resolver = new PromotionParticipationResolver(
      [],
      { resolve: geocode },
      {
        getParticipatingOutlets: async (_merchant, url) => ({
          names: ["Suntec City, #01-645"],
          sourceUrl: url,
          complete: true,
          evidence: [evidence],
        }),
      },
      discovery,
    );
    expect(
      (
        await resolver.resolve(
          "Example Sushi",
          new OutletScopeResolver().resolve("Selected outlets"),
          evidence,
        )
      ).complete,
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("consumes search pages, deduplicates IDs and caches the complete search", async () => {
    const requests: Record<string, unknown>[] = [];
    const fetcher = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        requests.push(body);
        return new Response(
          JSON.stringify(
            body.pageToken
              ? { places: [p()] }
              : { places: [p()], nextPageToken: "page-two" },
          ),
        );
      },
    );
    const discovery = new GoogleOutletDiscovery(
      new ResolutionCache(),
      "test",
      fetcher,
    );
    const a = await discovery.discover("Example Sushi", [
      "Suntec City, #01-645",
    ]);
    expect(a.branches).toHaveLength(1);
    expect(a.issues).toEqual([]);
    expect(a.pages).toHaveLength(2);
    await discovery.discover("Example Sushi", ["Suntec City, #01-645"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requests[1]).toEqual({ ...requests[0], pageToken: "page-two" });
    expect(requests[0].locationRestriction).toBeDefined();
    expect(requests[0].openNow).toBeUndefined();
  });
  it("reports a missing key without making requests", async () => {
    const fetcher = vi.fn();
    const a = await new GoogleOutletDiscovery(
      new ResolutionCache(),
      undefined,
      fetcher,
    ).discover("Other Merchant");
    expect(a.issues).toContain("google_places_api_key_missing");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not accept a partially paginated named lookup", async () => {
    let page = 0;
    const discovery = new GoogleOutletDiscovery(
      new ResolutionCache(),
      "test",
      async () =>
        new Response(
          JSON.stringify({ places: [p()], nextPageToken: `next-${++page}` }),
        ),
    );
    const resolver = new PromotionParticipationResolver(
      [],
      {
        resolve: async () => {
          throw new Error("unused");
        },
      },
      undefined,
      discovery,
    );
    const a = await resolver.resolve(
      "Example Sushi",
      new OutletScopeResolver().resolve("📍 Suntec City, #01-645"),
      evidence,
    );
    expect(a.complete).toBe(false);
    expect(a.issues).toContain("google_search_pagination_incomplete");
  });
});
it("preserves branch-unit pairs when parsing multiple named locations", () => {
  expect(
    new OutletScopeResolver().resolve("📍 Suntec City, #01-645").names,
  ).toEqual(["Suntec City, #01-645"]);
  expect(
    new OutletScopeResolver().resolve(
      "📍 New Bahru, 02-01 & Chinatown Point, 02-35",
    ).names,
  ).toEqual(["New Bahru, 02-01", "Chinatown Point, 02-35"]);
});
it("retains a verified unit supplied only in Google address components", async () => {
  const { resolver } = setup({
    places: [
      p({
        formattedAddress: "3 Temasek Boulevard, Suntec City, Singapore 038983",
      }),
    ],
  });
  const a = await resolver.resolve(
    "Example Sushi",
    new OutletScopeResolver().resolve("📍 Suntec City, #01-645"),
    evidence,
  );
  expect(a.complete).toBe(true);
  expect(a.included[0].address).toContain("#01-645");
});
it("attaches the response hash of the page that supplied a branch", async () => {
  let call = 0;
  const discovery = new GoogleOutletDiscovery(
    new ResolutionCache(),
    "test",
    async () =>
      new Response(
        JSON.stringify(
          ++call === 1
            ? { places: [], nextPageToken: "next" }
            : { places: [p()] },
        ),
      ),
  );
  const a = await discovery.discover("Example Sushi", ["Suntec City, #01-645"]);
  expect(a.branches[0].existenceEvidence[0].sourceHash).toBe(
    a.pages[1].sourceHash,
  );
  expect(a.branches[0].existenceEvidence[0].sourceHash).not.toBe(
    a.pages[0].sourceHash,
  );
});
