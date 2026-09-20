import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { DateTime } from "luxon";
import { DateResolver } from "@/ingestion/resolution/dates";
import {
  OutletScopeResolver,
  PatternClassifier,
} from "@/ingestion/resolution/patterns";
import { PostOfferParser } from "@/ingestion/resolution/parser";
import { ResolutionCache } from "@/ingestion/resolution/cache";
import {
  GenkiOutletProvider,
  parseGenkiDirectory,
} from "@/ingestion/resolution/directory";
import {
  PromotionParticipationResolver,
  outletIdentity,
} from "@/ingestion/resolution/outlets";
import { ApiPlaceResolver } from "@/ingestion/resolution/places";
import { PromotionPipeline } from "@/ingestion/resolution/pipeline";
import { PromotionEligibilityService } from "@/ingestion/resolution/eligibility";
import type {
  DirectorySnapshot,
  Evidence,
  MerchantBranch,
  MerchantOutletProvider,
  PlaceResolver,
  SourcePost,
} from "@/ingestion/resolution/types";
export const evidence: Evidence = {
  url: "https://www.genkisushi.com.sg/locate-us/",
  summary: "Fixture official branch",
  checkedAt: "2026-09-14T12:00:00Z",
};
export const branch: MerchantBranch = {
  name: "Chinatown Point",
  address: "133 New Bridge Road #B1-14 Singapore 059413",
  postalCode: "059413",
  unit: "#B1-14",
  status: "operating",
  existenceEvidence: [evidence],
};
export const places: PlaceResolver = {
  resolve: async (_merchant, b) => ({
    address: b.address,
    lat: 1.285,
    lng: 103.843,
    coordinatePrecision: "building",
    coordinateEvidence: [{ ...evidence, summary: "Test coordinate fixture" }],
  }),
};
export const directory: DirectorySnapshot = {
  branches: [branch],
  authoritative: true,
  fullyTraversed: true,
  pages: [evidence],
  officialCount: 1,
  issues: [],
};
const provider = (snapshot = directory): MerchantOutletProvider => ({
  supports: () => true,
  getSingaporeBranches: async () => snapshot,
});
const now = DateTime.fromISO("2026-09-14T12:00:00Z");
const post: SourcePost = {
  text: "🍣 Genki Sushi 🍣\n➡️ 50% OFF Salmon Sashimi\n📅 Now - 30 Sep\n📍 All outlets\nMembers only, minimum spend $50.",
  publishedAt: "2026-09-14T10:45:21Z",
  url: "https://t.me/tastesoulsg/4457",
  label: "TasteSoul",
  channel: "tastesoulsg",
};
const pipeline = (d = directory) =>
  new PromotionPipeline(
    new PromotionParticipationResolver([provider(d)], places),
  );
describe("Singapore dates", () => {
  it.each([
    ["Now - 16 Sep", "2026-09-14", "2026-09-16"],
    ["Now till 31 Oct", "2026-09-14", "2026-10-31"],
    ["Today", "2026-09-14", "2026-09-14"],
    ["17 - 28 Aug", "2026-08-17", "2026-08-28"],
    ["21 Aug - 3 Sep", "2026-08-21", "2026-09-03"],
  ])("resolves %s", (text, start, end) => {
    const r = new DateResolver().resolve("📅 " + text, post.publishedAt);
    expect([r.startDate, r.endDate]).toEqual([start, end]);
    expect(r.issues).toEqual([]);
  });
  it.each([
    ["Weekdays", [1, 2, 3, 4, 5]],
    ["Every Saturday", [6]],
    ["Mon - Fri", [1, 2, 3, 4, 5]],
  ])("preserves %s without inventing expiry", (text, days) => {
    const r = new DateResolver().resolve(String(text), post.publishedAt);
    expect(r.weekdays).toEqual(days);
    expect(r.endDate).toBeNull();
  });
  it.each([
    "limited time only",
    "ongoing",
    "from now",
    "from 14 Sep",
    "expiry unknown",
    "none",
  ])("cannot invent expiry: %s", (text) =>
    expect(
      new DateResolver().resolve(text, post.publishedAt).endDate,
    ).toBeNull(),
  );
  it("anchors Today after UTC midnight boundary and rolls December into January", () => {
    expect(
      new DateResolver().resolve("Today", "2026-09-14T17:00:00Z").endDate,
    ).toBe("2026-09-15");
    expect(
      new DateResolver().resolve("Now - 2 Jan", "2026-12-31T00:00:00Z").endDate,
    ).toBe("2027-01-02");
    const r = new DateResolver().resolve(
      "30 Dec - 2 Jan",
      "2026-12-29T00:00:00Z",
    );
    expect([r.startDate, r.endDate]).toEqual(["2026-12-30", "2027-01-02"]);
  });
  it("rejects invalid, distant and conflicting inferred dates", () => {
    expect(
      new DateResolver().resolve("Now - 31 Feb", post.publishedAt).issues
        .length,
    ).toBeGreaterThan(0);
    expect(
      new DateResolver().resolve("Now - 2 Jan", post.publishedAt).issues,
    ).toContain("conflicting_dates");
    expect(
      new DateResolver().resolve("17 - 28 Jan", post.publishedAt).issues,
    ).toContain("ambiguous_year");
  });
  it("separates redemption, store hours and last order", () => {
    expect(
      new DateResolver().resolve(
        "📅 Now - 30 Sep\n⏰ 11AM - 10PM",
        post.publishedAt,
      ).hours,
    ).toEqual({ start: "11:00", end: "22:00" });
    expect(
      new DateResolver().resolve(
        "📅 Now - 30 Sep\nOperating Hours: 11am - 10pm",
        post.publishedAt,
      ).hours,
    ).toBeNull();
    expect(
      new DateResolver().resolve(
        "📅 Now - 30 Sep\nLast order: 9.45pm",
        post.publishedAt,
      ).lastOrder,
    ).toBe("21:45");
  });
  it("recognizes all date pattern categories", () => {
    const c = new PatternClassifier();
    expect(c.date("from 14 Sep")).toBe("start_only");
    expect(c.date("ongoing")).toBe("unknown_expiry");
    expect(c.date("Now - 30 Sep | 1 - 22 Oct")).toBe("multiple_ranges");
    expect(c.date("")).toBe("none");
  });
});
describe("scope semantics", () => {
  it.each([
    ["All outlets", "all_outlets"],
    ["All outlets excl. Changi Airport", "all_outlets_with_exclusions"],
    ["Selected outlets", "selected_outlets"],
    ["Suntec City, #01-645", "named_outlets"],
    ["New Bahru, 02-01 & Chinatown Point, 02-35", "named_outlets"],
    ["Online", "online_only"],
    ["Grab app", "unclear"],
    ["unclear location", "unclear"],
  ])("classifies %s", (text, scope) =>
    expect(new OutletScopeResolver().resolve("📍 " + text).scope).toBe(scope),
  );
  it("does not exclude in-store app ordering or collection", () => {
    expect(
      new OutletScopeResolver().resolve("Order via app\n📍 All outlets").scope,
    ).toBe("all_outlets");
    expect(
      new OutletScopeResolver().resolve(
        "📍 Online\nWalk-in collection available",
      ).scope,
    ).not.toBe("online_only");
  });
});
describe("offer ownership", () => {
  it("parses single offers and explicitly shared roundup dates", async () => {
    expect(
      await new PostOfferParser().parse(post.text, post.channel),
    ).toHaveLength(1);
    const offers = await new PostOfferParser().parse(
      "1. Restaurant A — 15% off\n2. Restaurant B — 20% off\n3. Restaurant C — free item\n📅 Now till 31 Dec",
      "tastesoulsg",
    );
    expect(offers).toHaveLength(3);
    expect(offers.every((o) => o.text.includes("31 Dec"))).toBe(true);
    expect(offers[0].text).not.toContain("20% off");
  });
  it("keeps per-offer periods local", async () => {
    const offers = await new PostOfferParser().parse(
      "1. A — 15% off\n📅 Now - 16 Sep\n2. B — 20% off\n📅 Now - 31 Oct",
      "tastesoulsg",
    );
    expect(offers[0].text).not.toContain("31 Oct");
    expect(offers[1].text).not.toContain("16 Sep");
  });
  it.each([
    "Jewel:\nNow till 16 Aug\nWaterway Point:\n17 - 19 Aug",
    "Product A\n📅 Now - 30 Sep\nProduct B\n📅 1 - 22 Oct",
  ])("requires splitting incompatible periods", async (text) =>
    expect(
      (await new PostOfferParser().parse(text, "tastesoulsg"))[0].issues,
    ).toContain("requires_split"),
  );
  it.each([
    "Restaurant: ordinary menu price $6",
    "Cafe: article\n#article",
    "McDonald's\nNew items include burgers",
  ])("does not mistake ordinary content for a benefit", async (text) =>
    expect(
      (await new PostOfferParser().parse(text, "tastesoulsg"))[0].genuine,
    ).toBe(false),
  );
  it("rejects LLM fabricated text and classification fields", async () => {
    const parser = new PostOfferParser({
      extract: async () => ({
        offers: [{ text: "invented", merchant: "A", title: "B" }],
        conflicts: [],
        action: "approve",
      }),
    });
    expect(
      (await parser.parse("Unrecognized long heading?", "sgfooddeals"))[0]
        .issues,
    ).toContain("invalid_llm_extraction");
  });
});
describe("directory and participation", () => {
  it("parses the actual official Genki snapshot and caches requests", async () => {
    const html = readFileSync(
      "tests/fixtures/resolution/genki-locator.html",
      "utf8",
    );
    const fetcher = vi.fn(async () => new Response(html));
    const p = new GenkiOutletProvider(new ResolutionCache(), fetcher);
    const result = await p.getSingaporeBranches("Genki Sushi");
    expect(result.branches).toHaveLength(22);
    expect(result.fullyTraversed).toBe(true);
    expect(result.branches[0].unit).toBe("#B1-14");
    await p.getSingaporeBranches("Genki Sushi");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      parseGenkiDirectory(html.replace('data-id="1"', 'data-id="99"'), evidence)
        .fullyTraversed,
    ).toBe(false);
    expect(
      parseGenkiDirectory(html.replace("</html>", ""), evidence).fullyTraversed,
    ).toBe(false);
  });
  it("cannot publish a partial chain", async () => {
    const [r] = await pipeline({ ...directory, fullyTraversed: false }).process(
      post,
      now,
    );
    expect(r.action).toBe("unresolved");
    expect(r.reasons).toContain("incomplete_all_outlet_enumeration");
  });
  it("selected cannot fall back to the full directory", async () => {
    const get = vi.fn(async () => directory);
    const resolver = new PromotionParticipationResolver(
      [{ supports: () => true, getSingaporeBranches: get }],
      places,
    );
    const r = await resolver.resolve(
      "Genki Sushi",
      new OutletScopeResolver().resolve("Selected outlets"),
      evidence,
    );
    expect(r.complete).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });
  it("resolves only named branches, audits exclusions and handles unavailable branches", async () => {
    const second = {
      ...branch,
      name: "Changi Airport",
      address: "Airport Singapore 819643",
      postalCode: "819643",
    };
    const resolver = new PromotionParticipationResolver(
      [
        provider({
          ...directory,
          branches: [branch, second],
          officialCount: 2,
        }),
      ],
      places,
    );
    const named = await resolver.resolve(
      "Genki Sushi",
      new OutletScopeResolver().resolve("📍 Chinatown Point"),
      evidence,
    );
    expect(named.included).toHaveLength(1);
    const excluded = await resolver.resolve(
      "Genki Sushi",
      new OutletScopeResolver().resolve("All outlets excl. Changi Airport"),
      evidence,
    );
    expect(excluded.excluded[0].evidence).toHaveLength(1);
    expect(excluded.complete).toBe(true);
    const [r] = await pipeline({
      ...directory,
      branches: [{ ...branch, status: "temporarily_unavailable" }],
    }).process(post, now);
    expect(r.action).toBe("unresolved");
  });
  it("identity is stable and changes when the physical location changes", () => {
    expect(outletIdentity("Genki Sushi", branch.address, 1.285, 103.843)).toBe(
      outletIdentity("GENKI SUSHI", branch.address, 1.285, 103.843),
    );
    expect(
      outletIdentity("Genki Sushi", branch.address, 1.285, 103.843),
    ).not.toBe(
      outletIdentity("Genki Sushi", branch.address + " #02-01", 1.285, 103.843),
    );
  });
});
describe("place APIs", () => {
  it("uses Google identity enrichment without claiming entrance precision", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            places: [
              {
                id: "place-1",
                displayName: { text: "Genki Sushi Chinatown Point" },
                formattedAddress: branch.address,
                location: { latitude: 1.285, longitude: 103.843 },
                businessStatus: "OPERATIONAL",
              },
            ],
          }),
        ),
    );
    const r = await new ApiPlaceResolver(
      new ResolutionCache(),
      { googleKey: "test" },
      fetcher,
    ).resolve("Genki Sushi", branch);
    expect(r.placeId).toBe("place-1");
    expect(r.coordinatePrecision).toBe("building");
    expect(fetcher.mock.calls[0]).toBeDefined();
  });
  it("falls back to OneMap exact postal building coordinates", async () => {
    const fetcher = vi.fn(
      async (url: string | URL | Request) =>
        new Response(
          JSON.stringify(
            String(url).includes("google")
              ? { places: [] }
              : {
                  totalNumPages: 1,
                  results: [
                    {
                      POSTAL: "059413",
                      ADDRESS: "133 NEW BRIDGE ROAD",
                      LATITUDE: "1.285",
                      LONGITUDE: "103.843",
                    },
                  ],
                },
          ),
        ),
    );
    const r = await new ApiPlaceResolver(
      new ResolutionCache(),
      { googleKey: "test" },
      fetcher,
    ).resolve("Genki Sushi", branch);
    expect(r.address).toContain("#B1-14");
    expect(r.coordinatePrecision).toBe("building");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not bypass explicit Google closure with OneMap", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            places: [
              {
                id: "x",
                displayName: { text: "Genki Sushi" },
                formattedAddress: branch.address,
                location: { latitude: 1.285, longitude: 103.843 },
                businessStatus: "CLOSED_PERMANENTLY",
              },
            ],
          }),
        ),
    );
    await expect(
      new ApiPlaceResolver(
        new ResolutionCache(),
        { googleKey: "test" },
        fetcher,
      ).resolve("Genki Sushi", branch),
    ).rejects.toThrow("status_conflict");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe("publication safety", () => {
  it("approves only a complete schema-valid verified fixture", async () => {
    const [r] = await pipeline().process(post, now);
    expect(r.reasons).toEqual([
      "verified_current_promotion_complete_outlet_audit",
    ]);
    expect(r.action).toBe("approve");
  });
  it("missing expiry and unchecked media cannot publish; expired offers are excluded", async () => {
    expect(
      (
        await pipeline().process(
          { ...post, text: post.text.replace("Now - 30 Sep", "ongoing") },
          now,
        )
      )[0].action,
    ).toBe("unresolved");
    expect(
      (
        await pipeline().process(
          {
            ...post,
            text: post.text + "\n[Media attached: verify conditions.]",
          },
          now,
        )
      )[0].action,
    ).toBe("unresolved");
    expect(
      (await pipeline().process(post, DateTime.fromISO("2026-10-01")))[0]
        .action,
    ).toBe("exclude");
  });
  it("schema validation and participation evidence run before approval", async () => {
    const [r] = await pipeline().process(post, now);
    const a = await new PromotionParticipationResolver(
      [provider()],
      places,
    ).resolve(
      "Genki Sushi",
      new OutletScopeResolver().resolve("All outlets"),
      evidence,
    );
    const e = new PromotionEligibilityService();
    expect(
      e.evaluate(
        {
          promotion: { ...r.promotion, benefit: "" },
          genuine: true,
          nonPromotion: false,
          onlineOnly: false,
          issues: [],
          outletAudit: a,
        },
        now,
      ).action,
    ).toBe("unresolved");
    a.included[0].participationEvidence = [];
    expect(
      e.evaluate(
        {
          promotion: r.promotion,
          genuine: true,
          nonPromotion: false,
          onlineOnly: false,
          issues: [],
          outletAudit: a,
        },
        now,
      ).action,
    ).toBe("unresolved");
  });
  it("does not approve duplicate offers twice", async () => {
    const text =
      "1. Genki Sushi — 50% off sushi\n2. Genki Sushi — 50% off sushi\nApplies to all offers:\n📅 Now - 30 Sep\n📍 All outlets";
    const results = await pipeline().process({ ...post, text }, now);
    expect(results.filter((r) => r.action === "approve")).toHaveLength(1);
    expect(results[1].reasons).toContain("duplicate_candidate");
  });
});

it("resolves explicit ISO ranges without mistaking date hyphens for multiple periods", () => {
  const r = new DateResolver().resolve(
    "📅 2026-09-14 to 2026-09-30",
    post.publishedAt,
  );
  expect(r.pattern).toBe("explicit_range");
  expect(r.issues).toEqual([]);
  expect(r.endDate).toBe("2026-09-30");
});
it("does not share the last roundup entry's local terms and date", async () => {
  const offers = await new PostOfferParser().parse(
    "1. A — 15% off\n2. B — 20% off\nMembers only\n📅 Now - 31 Oct",
    "tastesoulsg",
  );
  expect(offers[0].text).not.toContain("31 Oct");
  expect(offers[0].issues).toContain("ambiguous_roundup_date_ownership");
});
it("does not ignore outlet exclusions outside the location marker", async () => {
  const [r] = await pipeline().process(
    { ...post, text: post.text + "\nNot applicable at Changi Airport." },
    now,
  );
  expect(r.action).toBe("unresolved");
  expect(r.reasons).toContain("material_qualifier_requires_verification");
});
it("cache coalesces requests, expires values, and retries failures", async () => {
  let time = 0;
  const cache = new ResolutionCache(() => time, 2);
  const get = vi.fn(async () => ({ n: 1 }));
  await Promise.all([
    cache.get("k", "https://example.test", 10, get),
    cache.get("k", "https://example.test", 10, get),
  ]);
  expect(get).toHaveBeenCalledTimes(1);
  time = 11;
  await cache.get("k", "https://example.test", 10, get);
  expect(get).toHaveBeenCalledTimes(2);
  const fail = vi.fn(async () => {
    throw new Error("offline");
  });
  await expect(
    cache.get("fail", "https://example.test", 10, fail),
  ).rejects.toThrow();
  await expect(
    cache.get("fail", "https://example.test", 10, fail),
  ).rejects.toThrow();
  expect(fail).toHaveBeenCalledTimes(2);
});
it("does not treat app ordering alone as online-only, and recognizes mall names", () => {
  expect(new OutletScopeResolver().resolve("📍 Grab app").scope).toBe(
    "unclear",
  );
  expect(new OutletScopeResolver().resolve("📍 Tampines Mall").scope).toBe(
    "named_outlets",
  );
});
it("eligibility independently rejects a claimed-complete audit with incomplete enumeration", async () => {
  const [r] = await pipeline().process(post, now);
  const a = await new PromotionParticipationResolver(
    [provider()],
    places,
  ).resolve(
    "Genki Sushi",
    new OutletScopeResolver().resolve("All outlets"),
    evidence,
  );
  a.directoryAudit.fullyTraversed = false;
  expect(
    new PromotionEligibilityService().evaluate(
      {
        promotion: r.promotion,
        genuine: true,
        nonPromotion: false,
        onlineOnly: false,
        issues: [],
        outletAudit: a,
      },
      now,
    ).reasons,
  ).toContain("incomplete_all_outlet_enumeration");
});
it("selected participation uses an explicit complete promotion-specific list only", async () => {
  const second = {
    ...branch,
    name: "Other Branch",
    address: "Different address Singapore 123456",
  };
  const resolver = new PromotionParticipationResolver(
    [provider({ ...directory, branches: [branch, second], officialCount: 2 })],
    places,
    {
      getParticipatingOutlets: async (_m, url) => ({
        names: ["Chinatown Point"],
        complete: true,
        sourceUrl: url,
        evidence: [
          { ...evidence, summary: "Promotion-specific participation fixture" },
        ],
      }),
    },
  );
  const r = await resolver.resolve(
    "Genki Sushi",
    new OutletScopeResolver().resolve("Selected outlets"),
    evidence,
  );
  expect(r.complete).toBe(true);
  expect(r.included).toHaveLength(1);
  expect(r.included[0].participationEvidence[0].summary).toContain(
    "Promotion-specific",
  );
});
it("failed coordinates, count mismatches and unknown exclusions keep a chain unresolved", async () => {
  const failed = new PromotionParticipationResolver([provider()], {
    resolve: async () => {
      throw new Error("offline");
    },
  });
  expect(
    (
      await failed.resolve(
        "Genki Sushi",
        new OutletScopeResolver().resolve("All outlets"),
        evidence,
      )
    ).complete,
  ).toBe(false);
  expect(
    (await pipeline({ ...directory, officialCount: 2 }).process(post, now))[0]
      .action,
  ).toBe("unresolved");
  expect(
    (
      await pipeline().process(
        {
          ...post,
          text: post.text.replace(
            "All outlets",
            "All outlets excl. Unknown Branch",
          ),
        },
        now,
      )
    )[0].action,
  ).toBe("unresolved");
});
it("does not flatten conflicting weekdays, additional expiry claims or multiple redemption windows", () => {
  const resolver = new DateResolver();
  expect(
    resolver.resolve(
      "📅 Now - 30 Sep\nWeekdays only. Every Saturday.",
      post.publishedAt,
    ).issues,
  ).toContain("conflicting_weekday_restrictions");
  expect(
    resolver.resolve("📅 Now - 30 Sep\nOffer ends on 16 Sep.", post.publishedAt)
      .issues,
  ).toContain("additional_date_claim_requires_verification");
  expect(
    resolver.resolve(
      "📅 Now - 30 Sep\n⏰ 11am - 2pm, 6pm - 9pm",
      post.publishedAt,
    ).issues,
  ).toContain("requires_split");
});

it.each([
  "T&Cs apply. https://example.com/terms",
  "More info: https://example.com/promotion",
  "Find out more / read more: https://example.com/details",
])(
  "keeps linked terms in description without blocking otherwise verified offers: %s",
  async (terms) => {
    const [result] = await pipeline().process(
      { ...post, text: `${post.text}\n${terms}` },
      now,
    );
    expect(result.action).toBe("approve");
    expect(result.promotion?.description).toContain(terms);
  },
);
it("linked terms do not bypass missing expiry or explicit branch restrictions", async () => {
  for (const text of [
    post.text.replace("Now - 30 Sep", "Limited time only"),
    `${post.text}\nNot valid at Chinatown Point.`,
  ]) {
    const [result] = await pipeline().process(
      { ...post, text: `${text}\nT&Cs apply: https://example.com/terms` },
      now,
    );
    expect(result.action).toBe("unresolved");
  }
});

it("retains informational media observations with stable verified identity", async () => {
  const input = {
    ...post,
    text: post.text + "\n[Media attached: verify image/video conditions.]",
  };
  const first = await pipeline().process(input, now);
  expect(first).toEqual(await pipeline().process(input, now));
  expect(first[0].action).toBe("approve");
  expect(first[0].suggestion.verifiedAt).toBeTruthy();
  expect(first[0].audit.issues).toContainEqual({
    code: "media_export_marker_present",
    severity: "informational",
  });
});
it.each([
  "See image for benefit",
  "Validity in poster",
  "Participating outlets in photo",
  "Eligibility in video",
  "Redemption restrictions pictured",
])("blocks material media: %s", async (text) => {
  const [r] = await pipeline().process(
    {
      ...post,
      text:
        post.text +
        "\n" +
        text +
        "\n[Media attached: verify image/video conditions.]",
    },
    now,
  );
  expect(r.action).toBe("unresolved");
  expect(r.reasons).toContain("linked_or_media_terms_require_verification");
});
it("defaults unknown issues to blocking", async () => {
  const { blockingIssues } = await import("@/ingestion/resolution/issues");
  expect(
    blockingIssues(["new_unknown_code", "media_export_marker_present"]),
  ).toEqual(["new_unknown_code"]);
});

it.each([
  ["$10 OFF platter", "$10 OFF"],
  ["2-for-2 Vietnamese Buffet", "2-for-2"],
  ["1-for-1 sushi", "1-for-1"],
  ["20% off sushi", "20% off"],
  ["Free Breakfast Wrap", "Free Breakfast Wrap"],
  ["Lunch deal $6", "Lunch deal $6"],
  ["Lunch $6 (U.P. $9)", "Lunch $6 (U.P. $9)"],
  ["Ordinary menu $6", ""],
  ["Lunch $6", ""],
])("extracts established benefits only: %s", async (title, benefit) => {
  const [offer] = await new PostOfferParser().parse(
    `Restaurant: ${title}`,
    "tastesoulsg",
  );
  expect(offer.benefit).toBe(benefit);
});
it("keeps unknown roundup header restrictions blocking and local media local", async () => {
  const offers = await new PostOfferParser().parse(
    "Members only\n1. A: 50% off sushi\n📅 Now - 30 Sep\n📍 Branch A\nSee image for redemption restrictions\n2. B: 20% off sushi\n📅 Now - 16 Sep\n📍 Branch B",
    "tastesoulsg",
  );
  expect(
    offers.every((o) =>
      o.issues.includes("roundup_header_context_requires_verification"),
    ),
  ).toBe(true);
  expect(offers[0].issues).toContain(
    "linked_or_media_terms_require_verification",
  );
  expect(offers[1].issues).not.toContain(
    "linked_or_media_terms_require_verification",
  );
  expect(offers[1].text).not.toMatch(/Branch A|30 Sep|image/);
});
it("abbreviated weekdays retain missing-expiry and conflict safeguards", () => {
  const r = new DateResolver().resolve("📆 Every Fri", post.publishedAt);
  expect(r.weekdays).toEqual([5]);
  expect(r.issues).toContain("unknown_expiry_or_start");
  expect(
    new DateResolver().resolve("Every Fri. Every Sat.", post.publishedAt)
      .issues,
  ).toContain("conflicting_weekday_restrictions");
});
it("cutoffs retain contradictions, reject malformed/multiple times and do not hide other hours", () => {
  const resolver = new DateResolver();
  const input = "📆 Today\n🕣 Till 11am";
  const r = resolver.resolve(input, post.publishedAt);
  expect(r).toMatchObject({
    hours: null,
    redemptionCutoff: "11:00",
    startDate: "2026-09-14",
    endDate: "2026-09-14",
    issues: [],
  });
  expect(
    resolver.resolve(input + "\nOffer ends on 20 Sep", post.publishedAt).issues,
  ).toContain("additional_date_claim_requires_verification");
  expect(
    resolver.resolve(input + "\nUntil 2pm", post.publishedAt).issues,
  ).toContain("requires_split");
  expect(
    resolver.resolve(input.replace("11am", "25am"), post.publishedAt).issues,
  ).toContain("unresolved_redemption_hours");
  expect(
    resolver.resolve(input + "\nRedeem after 8am", post.publishedAt).issues,
  ).toContain("unresolved_redemption_hours");
});
it("named street matching cannot confuse street numbers, suffixes or ambiguous branches", async () => {
  for (const addresses of [
    ["133 Tanjong Pagar Road, Singapore 123456"],
    ["33 Tanjong Pagar Road North, Singapore 123456"],
    [
      "33 Tanjong Pagar Road #01-01, Singapore 123456",
      "33 Tanjong Pagar Road #02-01, Singapore 123456",
    ],
  ]) {
    const resolver = new PromotionParticipationResolver(
      [
        provider({
          ...directory,
          branches: addresses.map((address) => ({ ...branch, address })),
          officialCount: addresses.length,
        }),
      ],
      places,
    );
    const audit = await resolver.resolve(
      "Restaurant",
      new OutletScopeResolver().resolve("📍 33 Tanjong Pagar Road"),
      evidence,
    );
    expect(audit.complete).toBe(false);
    expect(audit.issues).toContain(
      "ambiguous_or_missing_participating_branch:33 Tanjong Pagar Road",
    );
  }
});
it("each exclusion selector must match even if other selectors matched", async () => {
  const resolver = new PromotionParticipationResolver([provider()], places);
  const audit = await resolver.resolve(
    "Genki Sushi",
    new OutletScopeResolver().resolve(
      "All outlets excl. Chinatown Point, Unknown Airport outlets",
    ),
    evidence,
  );
  expect(audit.complete).toBe(false);
  expect(audit.excluded).toHaveLength(1);
  expect(audit.issues).toContain("unmatched_exclusion:Unknown Airport outlets");
});
it("stable suggestion UUID changes with source facts or source URL", async () => {
  const [first] = await pipeline().process(post, now);
  for (const modified of [
    { ...post, url: "https://t.me/tastesoulsg/9999" },
    { ...post, text: post.text + "\nMinimum two diners." },
  ]) {
    const [changed] = await pipeline().process(modified, now);
    expect(changed.suggestion.id).not.toBe(first.suggestion.id);
  }
});

it("does not discard material text disguised as a channel footer", async () => {
  const text =
    "1. Genki Sushi: 50% off sushi\n2. Genki Sushi: 20% off sushi\nApplies to all offers:\n📅 Now - 30 Sep\n📍 All outlets\n@tastesoulsg (https://t.me/tastesoulsg) Members only, minimum spend $100";
  const results = await pipeline().process({ ...post, text }, now);
  expect(results.every((r) => r.action === "unresolved")).toBe(true);
  for (const result of results) {
    expect(result.reasons).toContain(
      "roundup_footer_context_requires_verification",
    );
    expect(result.suggestion.description).toContain("minimum spend $100");
  }
});
