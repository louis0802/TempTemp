import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import {
  BoundedDirectFetch,
  DEFAULT_LIMITS,
} from "@/ingestion/direct-sources/fetch";
import { contentHash, makeEvidence } from "@/ingestion/direct-sources/evidence";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import {
  classifyGourmetPage,
  gourmetOffersUrl,
} from "@/ingestion/direct-sources/adapters/gourmet-carousel";
import {
  GourmetCarouselVenueProvider,
  gourmetVenueUrl,
  gourmetVenueName,
  gourmetVenueAddress,
  parseGourmetVenue,
} from "@/ingestion/direct-sources/adapters/gourmet-carousel-outlets";
import { createDirectOutletResolver } from "@/ingestion/direct-sources/outlet-resolution";
import {
  DIRECT_SOURCE_PROCESSOR_VERSION,
  acquisitionReady,
  directCampaignLifecycle,
  directRevisionHash,
  evaluateDirectPublication,
} from "@/ingestion/direct-sources/publication";
import { persistDirectSourceRun } from "@/ingestion/direct-sources/persistence";
import { parseIngestArgs } from "../scripts/direct-source-ingest";
import type { DirectResolvedContext } from "@/ingestion/direct-sources/publication";
import type {
  DirectPromotionCandidate,
  FetchedPage,
} from "@/ingestion/direct-sources/types";
import type { PlaceResolver } from "@/ingestion/resolution/types";

const root = "tests/fixtures/direct-sources/gourmet-carousel/";
const source = sourceDefinition("gourmet_carousel_sg");
const observedAt = "2026-10-01T11:39:53.663Z";
type Edit = (url: string, body: string) => string;
async function fixture(edit?: Edit) {
  const f = await fixtureTransport(root + "manifest.json");
  return {
    ...f,
    transport: async (...args: Parameters<typeof f.transport>) => {
      const response = await f.transport(...args);
      return edit
        ? {
            ...response,
            body: Buffer.from(edit(args[0].href, response.body.toString())),
          }
        : response;
    },
  };
}
async function run(edit?: Edit, at = observedAt) {
  return runDirectSource(source, {
    ...(await fixture(edit)),
    observedAt: at,
    mode: "fixture",
  });
}
function alterService(edit: (html: string) => string): Edit {
  return (url, body) => (url === gourmetVenueUrl ? edit(body) : body);
}
async function servicePage(
  edit?: (body: string) => string,
): Promise<FetchedPage> {
  const body = Buffer.from(
    edit?.(await readFile(root + "research-2026-10-01/barista.html", "utf8")) ??
      (await readFile(root + "research-2026-10-01/barista.html", "utf8")),
  );
  return {
    body,
    evidence: makeEvidence(
      source.id,
      gourmetVenueUrl,
      gourmetVenueUrl,
      "listing",
      body,
      "text/html",
      200,
      observedAt,
    ),
  };
}
function serviceEdit(body: string, fn: (doc: ReturnType<typeof load>) => void) {
  const $ = load(body);
  fn($);
  return $.html();
}
const places: PlaceResolver = {
  resolve: async (_merchant, branch) => ({
    address: branch.address,
    lat: 1.3064,
    lng: 103.8319,
    coordinatePrecision: "building",
    coordinateEvidence: [
      {
        url: "https://www.onemap.gov.sg/",
        checkedAt: observedAt,
        summary: "Mock coordinate enrichment only",
      },
    ],
  }),
};
async function resolution(c: DirectPromotionCandidate, edit?: Edit) {
  return createDirectOutletResolver({
    providers: [
      new GourmetCarouselVenueProvider((await fixture(edit)).transport),
    ],
    places,
  })(c);
}
async function context(
  c: DirectPromotionCandidate,
): Promise<DirectResolvedContext> {
  return {
    ...(await resolution(c)),
    acquisitionReady: false,
    verifiedAt: observedAt,
    asOf: "2026-10-01",
  };
}

describe("Gourmet Carousel bounded shadow source", () => {
  it("has exact merchant roots, independent operator and unchanged global budgets/processor", async () => {
    const r = await run();
    expect(source.operator).toBe("Royal Plaza on Scotts");
    expect(source.publicationPolicy.merchant).toBe("Gourmet Carousel");
    expect(source.listingUrls).toEqual([gourmetOffersUrl, gourmetVenueUrl]);
    expect(source.allowedHosts).toEqual(["www.royalplaza.com.sg"]);
    expect(r.limits).toEqual(DEFAULT_LIMITS);
    expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
    expect(r.requests).toHaveLength(10);
    expect(
      r.requests.every(
        (r) => new URL(r.url).hostname === "www.royalplaza.com.sg",
      ),
    ).toBe(true);
    expect(r.enumeration.complete).toBe(false);
    expect(acquisitionReady(r)).toBe(false);
    expect(r.issues.map((i) => i.code)).toEqual([
      "partial_enumeration",
      "service_page_campaign_outside_listing",
      "gourmet_service_boundary_unproven",
    ]);
  });
  it("classifies all eight cards plus the service path; retains both genuine Gourmet campaigns", async () => {
    const r = await run();
    expect(r.enumeration.classification).toMatchObject({
      discovered_articles: 9,
      classified_articles: 9,
      promotion_articles: 2,
      non_promotion_articles: 7,
      unresolved_articles: 0,
    });
    expect(r.candidates.map((c) => c.merchant)).toEqual([
      "Gourmet Carousel",
      "Gourmet Carousel",
    ]);
    expect(r.candidates.map((c) => c.title)).toEqual([
      "HAPPY INTERNATIONAL COFFEE DAY 2026",
      "Carousel Moon Pastries",
    ]);
    expect(
      r.enumeration.classification?.articles.find((a) =>
        a.url.endsWith("lunch-buffet"),
      )?.reason,
    ).toBe("other_venue_carousel_campaign_not_gourmet");
  });
  it("dedupes canonical duplicate cards and forbids arbitrary/detail recursion", async () => {
    const r = await run((url, body) =>
      url === gourmetOffersUrl
        ? serviceEdit(body, ($) => {
            const first = $(".blocks-offer-cards article").first().clone();
            first
              .find("a")
              .attr("href", "/dine/offers/thai-2026?utm_source=duplicate#card");
            $(".blocks-offer-cards article").last().after(first);
          })
        : body,
    );
    expect(r.requests).toHaveLength(10);
    const http = new BoundedDirectFetch(source, (await fixture()).transport);
    const page = await http.fetch(gourmetOffersUrl, "listing");
    await expect(
      http.fetch(source.origin + "/anything", "detail"),
    ).rejects.toThrow("undiscovered_url");
    await expect(
      http.fetch("https://cms.royalplaza.com.sg/menu", "menu"),
    ).rejects.toThrow("unregistered_host");
    const detailUrl = http.discover(
      page,
      ".blocks-offer-cards a",
      "detail",
      (u) => u.pathname.endsWith("thai-2026"),
    )[0];
    const detail = await http.fetch(detailUrl, "detail");
    expect(() =>
      http.discover(detail, "a[href]", "detail", () => true),
    ).toThrow("recursive_detail_crawl_forbidden");
  });
  it.each([
    '<button class="load-more">Load more</button>',
    '<div data-ajax="hidden"></div>',
    "<select><option>Dining venue</option></select>",
    '<div class="pagination"><a href="/dine/offers?page=2">Next</a></div>',
  ])("fails completeness for an unresolved control: %s", async (control) => {
    const r = await run((url, body) =>
      url === gourmetOffersUrl
        ? body.replace(
            'class="block blocks-offer-cards"',
            `class="block blocks-offer-cards">${control}<div`,
          )
        : body,
    );
    expect(r.enumeration.complete).toBe(false);
    expect(r.issues.some((i) => i.code === "pagination_unresolved")).toBe(true);
    expect(r.requests).toHaveLength(10);
  });
  it("changed listing structure and unknown/foreign card paths fail closed", async () => {
    for (const edit of [
      (s: string) =>
        s.replace(
          'class="block blocks-offer-cards"',
          'class="changed-listing"',
        ),
      (s: string) =>
        s.replace('href="/dine/offers/thai-2026"', 'href="/dine/unknown"'),
      (s: string) =>
        s.replace(
          'href="/dine/offers/thai-2026"',
          'href="https://other.example/offer"',
        ),
    ]) {
      const r = await run((url, body) =>
        url === gourmetOffersUrl ? edit(body) : body,
      );
      expect(r.enumeration.complete).toBe(false);
      expect(
        r.issues.some((i) => /listing.*(?:structure|boundary)/.test(i.code)),
      ).toBe(true);
      expect(
        r.requests.every(
          (r) => !r.url.includes("unknown") && !r.url.includes("other.example"),
        ),
      ).toBe(true);
    }
  });
  it("does not silently traverse unregistered pagination when page budget is exhausted", async () => {
    const r = await runDirectSource(source, {
      ...(await fixture()),
      mode: "fixture",
      limits: { maxListingPages: 1 },
    });
    expect(r.enumeration.complete).toBe(false);
    expect(r.issues.some((i) => i.code === "listing_page_limit")).toBe(true);
    expect(r.enumeration.pagination.unresolved).toContain(gourmetVenueUrl);
  });
  it("ordinary venue/menu/pricing content never emits a service campaign", async () => {
    const p = await servicePage((body) =>
      serviceEdit(body, ($) => $(".bb-callout").remove()),
    );
    expect(classifyGourmetPage(p)).toEqual({
      result: "non_promotion",
      reason: "ordinary_gourmet_venue_information",
    });
    const r = await run(
      alterService((body) =>
        serviceEdit(body, ($) => $(".bb-callout").remove()),
      ),
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].title).toBe("Carousel Moon Pastries");
  });
  it("unisolated promotional text, ambiguous venue and unexpected detail structure remain unresolved", async () => {
    const edits = [
      (body: string) =>
        serviceEdit(body, ($) =>
          $(".bb-callout").replaceWith(
            "<p>Free coffee at Gourmet Carousel today</p>",
          ),
        ),
      (body: string) =>
        serviceEdit(body, ($) =>
          $(".bb-callout").html(
            "<h4>Hotel deal</h4><p>Free coffee at participating hotel restaurants</p>",
          ),
        ),
      (body: string) =>
        body.replace(
          "Gourmet Carousel - Barista Experience</h1>",
          "Palm Café</h1>",
        ),
    ];
    for (const edit of edits)
      expect(classifyGourmetPage(await servicePage(edit)).result).toBe(
        "unresolved",
      );
    const r = await run((url, body) =>
      url.endsWith("carousel-pastries")
        ? body.replace('class="dine-offer-single ', 'class="changed-offer ')
        : body,
    );
    expect(r.enumeration.classification?.unresolved_articles).toBe(1);
  });
  it("an operator offer cannot become Gourmet by owning the domain", async () => {
    const r = await run((url, body) =>
      url.endsWith("carousel-pastries")
        ? body.replaceAll("Gourmet Carousel", "Royal Plaza on Scotts")
        : body,
    );
    expect(
      r.enumeration.classification?.articles.find((a) =>
        a.url.endsWith("carousel-pastries"),
      ),
    ).toMatchObject({
      result: "unresolved",
      reason: "operator_campaign_venue_unresolved",
    });
    expect(r.candidates).toHaveLength(1);
  });
});

describe("explicit Gourmet campaign facts", () => {
  it.each(["Menu valid", "Price valid", "Published"])(
    "%s dates cannot establish campaign validity even within a campaign block",
    async (label) => {
      const c = (
        await run(
          alterService((body) =>
            body.replace(
              "Valid on 1 October 2026 only",
              `${label} on 1 October 2026 only`,
            ),
          ),
        )
      ).candidates[0];
      expect(c.startDate).toBeNull();
      expect(c.endDate).toBeNull();
    },
  );
  it("extracts an explicit campaign date range without borrowing a title year", async () => {
    const c = (
      await run(
        alterService((body) =>
          body.replace(
            "Valid on 1 October 2026 only",
            "Valid from 1 October to 31 October 2026",
          ),
        ),
      )
    ).candidates[0];
    expect(c.startDate).toBe("2026-10-01");
    expect(c.endDate).toBe("2026-10-31");
  });
  it("cites merchant/title/benefit/description and explicit single-day schedule, preserving exact campaign wording", async () => {
    const c = (await run()).candidates[0];
    expect(c).toMatchObject({
      benefit: "Free Coffee. Any Coffee. All Day.",
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      hours: "07:30–18:00",
      locationScope: "named_outlets",
      locationNames: [gourmetVenueName],
    });
    for (const field of [
      "merchant",
      "title",
      "benefit",
      "description",
      "validity",
      "hours",
      "locations",
      "eligibility",
      "redemption",
      "terms",
    ] as const) {
      expect(c.facts[field]?.quote).toBeTruthy();
      expect(
        c.facts[field]?.evidenceIds.every((id) =>
          c.evidence.some((e) => e.id === id),
        ),
      ).toBe(true);
    }
    expect(c.terms?.join("\n")).toContain(
      "One complimentary coffee per person.",
    );
    expect(c.redemption?.join("\n")).toContain(
      "Register on the spot using the QR code at the counter.",
    );
    expect(c.description).not.toContain("Hot Coffee");
    expect(c.publishedAt).toBeNull();
  });
  it("collection/menu/publication/widget/current dates cannot supply campaign validity", async () => {
    const r = await run(
      alterService((body) =>
        body
          .replace(
            "Valid on 1 October 2026 only",
            "Collection on 1 October 2026 only",
          )
          .replace(
            "<head>",
            '<head><meta property="article:published_time" content="2026-10-01T00:00:00Z"/>',
          ),
      ),
    );
    const c = r.candidates[0],
      pastry = r.candidates[1];
    expect(c.startDate).toBeNull();
    expect(c.endDate).toBeNull();
    expect(pastry.startDate).toBeNull();
    expect(pastry.endDate).toBeNull();
    expect(pastry.description).toContain("collection from 20 August 2026");
    expect(pastry.benefit).toBe(
      "Complimentary islandwide delivery (50+ boxes)",
    );
    expect(pastry.facts.benefit?.quote).toContain(
      "orders of 50 boxes and above",
    );
    expect(pastry.locationScope).toBe("source_unspecified");
    expect(directCampaignLifecycle(pastry, "2026-10-01")).toBe("continue");
    expect(
      evaluateDirectPublication(pastry, await context(pastry)).reasons,
    ).toEqual(
      expect.arrayContaining([
        "missing_start_date",
        "missing_end_date",
        "source_unspecified_locations",
        "gourmet_pastry_participation_unresolved",
      ]),
    );
  });
  it("explicit expired campaign excludes; ambiguous or absent validity never becomes expired", async () => {
    const expired = (
      await run(
        alterService((body) =>
          body.replace(
            "Valid on 1 October 2026 only",
            "Valid on 30 September 2026 only",
          ),
        ),
      )
    ).candidates[0];
    const decision = evaluateDirectPublication(expired, {
      acquisitionReady: false,
      asOf: "2026-10-01",
      verifiedAt: observedAt,
      outlets: [],
      outletsVerified: false,
      outletIssues: [],
    });
    expect(decision.result).toBe("exclude");
    expect(decision.reasons).toEqual(["expired_campaign"]);
    for (const wording of [
      "Valid on 1 October only",
      "Valid on 31 September 2026 only",
      "Valid while stocks last",
    ]) {
      const c = (
        await run(
          alterService((body) =>
            body.replace("Valid on 1 October 2026 only", wording),
          ),
        )
      ).candidates[0];
      expect(directCampaignLifecycle(c, "2026-10-01")).toBe("continue");
      expect(evaluateDirectPublication(c, await context(c)).result).toBe(
        "needs_review",
      );
    }
  });
  it("selected/operator-wide venue wording stays unresolved even with a Gourmet mention", async () => {
    const c = (
      await run(
        alterService((body) =>
          body.replace(
            "at Gourmet Carousel - Barista Experience. Registration",
            "at participating hotel dining outlets. Registration",
          ),
        ),
      )
    ).candidates[0];
    expect(c.locationScope).toBe("source_unspecified");
    const lookup = vi.spyOn(places, "resolve");
    expect((await resolution(c)).outletsVerified).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
    lookup.mockRestore();
  });
  it("isolates multiple callouts and rejects colliding campaign identities", async () => {
    const edit = (body: string) =>
      serviceEdit(body, ($) => {
        const block = $(".bb-callout").clone();
        block.find("h4").text("SECOND GOURMET CAMPAIGN 2026");
        block.html(
          block
            .html()!
            .replace(
              "Free Coffee. Any Coffee. All Day.",
              "Complimentary coffee with pastry purchase.",
            )
            .replace(
              "Valid on 1 October 2026 only",
              "Valid on 2 October 2026 only",
            ),
        );
        $(".bb-callout").after(block);
      });
    const r = await run(alterService(edit));
    const coffee = r.candidates.filter(
      (c) => c.canonicalUrl === gourmetVenueUrl,
    );
    expect(coffee).toHaveLength(2);
    expect(coffee.map((c) => c.endDate)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(coffee[0].description).not.toContain("pastry purchase");
    expect(coffee[1].description).not.toContain(
      "Free Coffee. Any Coffee. All Day.",
    );
    expect(new Set(coffee.map((c) => c.candidateId)).size).toBe(2);
    const collision = await run(
      alterService((body) =>
        serviceEdit(body, ($) =>
          $(".bb-callout").after($(".bb-callout").clone()),
        ),
      ),
    );
    expect(collision.candidates).toHaveLength(1);
    expect(collision.enumeration.classification?.unresolved_articles).toBe(1);
  });
  it("same evidence is time-independent revision; changed benefit changes revision while identity remains stable", async () => {
    const a = await run(),
      b = await run(undefined, "2026-10-02T00:00:00.000Z");
    const changed = await run(
      alterService((body) =>
        body.replace(
          "Free Coffee. Any Coffee. All Day.",
          "Free Coffee. One Coffee. All Day.",
        ),
      ),
    );
    expect(directRevisionHash(a.candidates[0])).toBe(
      directRevisionHash(b.candidates[0]),
    );
    expect(directRevisionHash(a.candidates[0])).not.toBe(
      directRevisionHash(changed.candidates[0]),
    );
    expect(a.candidates[0].candidateId).toBe(changed.candidates[0].candidateId);
    expect((await run()).candidates).toEqual(a.candidates);
  });
});

describe("official Gourmet venue and generic activation gate", () => {
  it("proves the fixed named counter separately from the operator and buffet restaurant", async () => {
    const snapshot = parseGourmetVenue(await servicePage());
    expect(snapshot.authoritative).toBe(true);
    expect(snapshot.branches).toHaveLength(1);
    expect(snapshot.officialCount).toBeNull();
    expect(snapshot.branches[0]).toMatchObject({
      name: gourmetVenueName,
      address: gourmetVenueAddress,
      postalCode: "228220",
      status: "operating",
    });
    expect(snapshot.branches[0].resolvedPlace).toBeUndefined();
    const provider = new GourmetCarouselVenueProvider(
      (await fixture()).transport,
    );
    expect(provider.supports("Royal Plaza on Scotts")).toBe(false);
    expect(provider.supports("Carousel")).toBe(false);
    await expect(provider.getSingaporeBranches("Palm Café")).rejects.toThrow(
      "unsupported_directory_merchant",
    );
  });
  it.each([
    ["Gourmet Carousel - Barista Experience</h1>", "Carousel</h1>"],
    ["25 Scotts Road, 228220", "26 Scotts Road, 228220"],
    ["Part of Carousel, Royal Plaza on Scotts", "Part of an unknown hotel"],
    ["Daily, 7.30am to 6.00pm", "Coming soon"],
  ])("changed official identity fails closed (%s)", async (before, after) => {
    const p = await servicePage((body) => body.replaceAll(before, after));
    expect(parseGourmetVenue(p).authoritative).toBe(false);
    expect(parseGourmetVenue(p).branches).toEqual([]);
    const provider = new GourmetCarouselVenueProvider(
      (await fixture(alterService((body) => body.replaceAll(before, after))))
        .transport,
    );
    await expect(
      provider.getSingaporeBranches("Gourmet Carousel"),
    ).rejects.toThrow("gourmet_venue_identity_unverified");
  });
  it("uses official identity/address and calls place resolution only for coordinates", async () => {
    const c = (await run()).candidates[0],
      lookup = vi.spyOn(places, "resolve");
    const r = await resolution(c);
    expect(r.outletsVerified).toBe(true);
    expect(r.outlets).toHaveLength(1);
    expect(r.outlets[0]).toMatchObject({
      name: gourmetVenueName,
      address: gourmetVenueAddress,
      lat: 1.3064,
      lng: 103.8319,
    });
    expect(lookup.mock.calls[0][1].existenceEvidence[0].url).toBe(
      gourmetVenueUrl,
    );
    lookup.mockRestore();
  });
  it("complete campaign can pass unchanged generic gate only with hypothetical source/acquisition/venue authorization", async () => {
    const c = (await run()).candidates[0],
      ctx = await context(c),
      original = source.publicationPolicy;
    expect(evaluateDirectPublication(c, ctx).reasons).toEqual([
      "source_not_authoritative",
      "automatic_publication_disabled",
      "source_acquisition_blocked",
    ]);
    // Counterfactual unit gate only: never a registry file edit or database run.
    try {
      source.publicationPolicy = {
        ...original,
        enabled: true,
        autoPublish: true,
      };
      expect(
        evaluateDirectPublication(c, { ...ctx, acquisitionReady: true }).result,
      ).toBe("ready");
      expect(
        evaluateDirectPublication(c, {
          ...ctx,
          acquisitionReady: true,
          outletsVerified: false,
        }).result,
      ).toBe("needs_review");
      expect(
        evaluateDirectPublication(
          { ...c, locationScope: "source_unspecified", locationNames: [] },
          { ...ctx, acquisitionReady: true },
        ).result,
      ).toBe("needs_review");
    } finally {
      source.publicationPolicy = original;
    }
  });
  it("shadow preview works while CLI/persistence rejects ingest before database/outlet operations", async () => {
    const r = await run(),
      pool = { query: vi.fn(), connect: vi.fn() },
      resolveOutlets = vi.fn();
    expect(source.activationReview?.enumeration).toBe("partial");
    expect(source.publicationPolicy).toMatchObject({
      enabled: false,
      autoPublish: false,
    });
    expect(() => parseIngestArgs(["--source", source.id])).toThrow(
      "direct_publication_disabled",
    );
    await expect(
      persistDirectSourceRun(r, { pool: pool as never, resolveOutlets }),
    ).rejects.toThrow("direct_publication_disabled");
    expect(pool.query).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
    expect(resolveOutlets).not.toHaveBeenCalled();
  });
  it("immutable captures retain all requested response metadata and SHA-256 bytes", async () => {
    for (const folder of [
      "research-2026-10-01",
      "research-details-2026-10-01",
      "live-2026-10-01",
    ]) {
      const provenance = JSON.parse(
        await readFile(root + folder + "/capture-provenance.json", "utf8"),
      );
      for (const c of provenance.captures) {
        const body = await readFile(root + folder + "/" + c.path);
        expect(contentHash(body)).toBe(c.sha256);
        expect(body.length).toBe(c.bytes);
        for (const key of [
          "requestedUrl",
          "finalUrl",
          "capturedAt",
          "observedAt",
          "httpStatus",
          "contentType",
          "purpose",
        ])
          expect(c[key]).toBeTruthy();
      }
    }
  });
  it("bounded live captures replay deterministic classifications and semantics offline", async () => {
    const f = await fixtureTransport(root + "live-2026-10-01/manifest.json");
    const a = await runDirectSource(source, { ...f, mode: "fixture" });
    const b = await runDirectSource(source, { ...f, mode: "fixture" });
    expect(a.candidates).toEqual(b.candidates);
    expect(a.enumeration.classification).toEqual(b.enumeration.classification);
    expect(a.candidates.map((c) => directRevisionHash(c))).toEqual(
      b.candidates.map((c) => directRevisionHash(c)),
    );
    expect(a.enumeration.classification).toMatchObject({
      discovered_articles: 9,
      classified_articles: 9,
      promotion_articles: 2,
      non_promotion_articles: 7,
      unresolved_articles: 0,
    });
  });
});
