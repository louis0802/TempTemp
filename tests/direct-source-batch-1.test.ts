import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { load, type CheerioAPI } from "cheerio";
import type { Pool } from "pg";
import {
  BoundedDirectFetch,
  DEFAULT_LIMITS,
} from "@/ingestion/direct-sources/fetch";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import {
  runDirectSource,
  type DirectSourceRun,
} from "@/ingestion/direct-sources/runner";
import {
  sourceAdapter,
  sourceDefinition,
  directSources,
} from "@/ingestion/direct-sources/registry";
import {
  sourceIdSchema,
  directPromotionCandidateSchema,
  hasRecordedDirectOwnership,
  type DirectSourceDefinition,
} from "@/ingestion/direct-sources/types";
import {
  DIRECT_SOURCE_PROCESSOR_VERSION,
  directRevisionHash,
  evaluateDirectPublication,
  singaporeObservationDate,
} from "@/ingestion/direct-sources/publication";
import { persistDirectSourceRun } from "@/ingestion/direct-sources/persistence";
import { parseIngestArgs as ingestArgs } from "../scripts/direct-source-ingest";
import { parseArgs as previewArgs } from "../scripts/direct-source-preview";
import { readMapInputs } from "../scripts/research/build-merchant-source-map";
import {
  fairpriceCatalogueDates,
  fairpriceWeeklyUrl,
} from "@/ingestion/direct-sources/adapters/fairprice";
import { contentHash } from "@/ingestion/direct-sources/evidence";

const sources = [
  ["fairprice_sg", "fairprice"],
  ["kris_plus_sg", "kris-plus"],
  ["dian_xiao_er_sg", "dian-xiao-er"],
] as const;
type BatchId = (typeof sources)[number][0];
const baseline = new Map<BatchId, DirectSourceRun>();
async function replay(
  id: BatchId,
  edit?: ($: CheerioAPI, url: URL) => void,
  observedAt?: string,
) {
  const folder = sources.find(([sourceId]) => sourceId === id)![1];
  const fixture = await fixtureTransport(
    `tests/fixtures/direct-sources/${folder}/manifest.json`,
  );
  return runDirectSource(sourceDefinition(id), {
    mode: "fixture",
    observedAt: observedAt ?? fixture.observedAt,
    transport: async (url, signal, maxBytes) => {
      const response = await fixture.transport(url, signal, maxBytes);
      if (!edit) return response;
      const $ = load(response.body.toString());
      edit($, url);
      return { ...response, body: Buffer.from($.html()) };
    },
  });
}
function fairState(
  $: CheerioAPI,
  edit: (state: {
    props: {
      pageProps: {
        promoDetail: {
          layouts: {
            collection: string;
            pagination: { totalPages: number };
            value: { id: number; publicUrl: string }[];
          }[];
        };
      };
    };
  }) => void,
) {
  const state = JSON.parse($("#__NEXT_DATA__").text());
  edit(state);
  $("#__NEXT_DATA__").text(JSON.stringify(state));
}
function decisions(run: DirectSourceRun) {
  return run.candidates.map((c) =>
    evaluateDirectPublication(c, {
      asOf: singaporeObservationDate(run.observedAt),
      acquisitionReady: run.gate.acquisition_ready,
      outlets: [],
      outletsVerified: false,
      outletIssues: [],
      verifiedAt: run.observedAt,
    }),
  );
}
beforeAll(async () => {
  for (const [id] of sources) baseline.set(id, await replay(id));
});

describe("independent batch boundaries and activation", () => {
  it.each(sources)(
    "%s has a useful contract implementation but cannot acquire or publish autonomously",
    (id) => {
      const source = sourceDefinition(id),
        run = baseline.get(id)!;
      expect(sourceAdapter(source).sourceId).toBe(id);
      expect(source.publicationPolicy).toMatchObject({
        enabled: false,
        autoPublish: false,
      });
      expect(source.activationReview!.blockers.length).toBeGreaterThan(0);
      expect(run.candidates.length).toBeGreaterThan(0);
      expect(run.enumeration.complete).toBe(false);
      expect(run.gate.acquisition_ready).toBe(false);
      expect(run.limits).toEqual(DEFAULT_LIMITS);
      for (const c of run.candidates)
        expect(directPromotionCandidateSchema.safeParse(c).success).toBe(true);
      expect(decisions(run).some((d) => d.result === "ready")).toBe(false);
    },
  );
  it.each(sources)(
    "%s rejects persistence before any database or outlet operation",
    async (id) => {
      const query = vi.fn(),
        connect = vi.fn(),
        resolveOutlets = vi.fn();
      expect(() => ingestArgs(["--source", id])).toThrow(
        "direct_publication_disabled",
      );
      await expect(
        persistDirectSourceRun(baseline.get(id)!, {
          pool: { query, connect } as unknown as Pool,
          resolveOutlets,
        }),
      ).rejects.toThrow("direct_publication_disabled");
      expect(query).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
      expect(resolveOutlets).not.toHaveBeenCalled();
    },
  );
  it.each(sources)(
    "%s hosts, undiscovered pages and recursive detail crawling are isolated",
    async (id) => {
      const source = sourceDefinition(id),
        fixture = await fixtureTransport(
          `tests/fixtures/direct-sources/${sources.find(([s]) => s === id)![1]}/manifest.json`,
        );
      const transport = vi.fn(fixture.transport),
        http = new BoundedDirectFetch(source, transport);
      for (const other of directSources.filter((s) => s.id !== id))
        await expect(
          http.fetch(other.listingUrls[0], "detail"),
        ).rejects.toThrow("unregistered_host");
      await expect(
        http.fetch(`${source.origin}/arbitrary`, "detail"),
      ).rejects.toThrow("undiscovered_url");
      expect(transport).not.toHaveBeenCalled();
      const page = await http.fetch(source.listingUrls[0], "listing");
      const detailPage = {
        ...page,
        evidence: { ...page.evidence, relation: "detail" as const },
      };
      // A fabricated parent is rejected before discovery, including a same-host URL.
      expect(() =>
        http.discover(detailPage, "a[href]", "detail", () => true),
      ).toThrow("unknown_parent_evidence");
      if (id === "kris_plus_sg") {
        const [url] = http.discover(
          page,
          'a[href*="/en/sg/promotions/"]',
          "detail",
          (u) => u.origin === source.origin,
        );
        const detail = await http.fetch(url, "detail");
        expect(() =>
          http.discover(detail, "a[href]", "detail", () => true),
        ).toThrow("recursive_detail_crawl_forbidden");
      }
    },
  );
  it.each(sources)(
    "%s cannot increase global production network limits",
    (id) => {
      expect(
        new BoundedDirectFetch(sourceDefinition(id), undefined, undefined, {
          maxBytes: 9_000_000,
          timeoutMs: 90_000,
          maxRedirects: 20,
          maxRequests: 1000,
        }).limits,
      ).toEqual(DEFAULT_LIMITS);
      expect(() =>
        previewArgs(["--source", id, "--maxBytes", "9000000"]),
      ).toThrow("invalid_argument");
      expect(() =>
        ingestArgs(["--source", id, "--maxRequests", "1000"]),
      ).toThrow();
    },
  );
  it.each(sources)(
    "%s enforces bytes, timeout and redirects through the existing fetch boundary",
    async (id) => {
      const source = sourceDefinition(id);
      const oversized = new BoundedDirectFetch(source, async () => ({
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.alloc(DEFAULT_LIMITS.maxBytes + 1),
      }));
      await expect(
        oversized.fetch(source.listingUrls[0], "listing"),
      ).rejects.toThrow("response_too_large");
      const slow = new BoundedDirectFetch(
        source,
        () => new Promise(() => {}),
        undefined,
        { timeoutMs: 5 },
      );
      await expect(
        slow.fetch(source.listingUrls[0], "listing"),
      ).rejects.toThrow("acquisition_timeout");
      let hop = 0;
      const redirects = new BoundedDirectFetch(source, async () => ({
        status: 302,
        headers: { location: `${source.origin}/redirect-${++hop}` },
        body: Buffer.alloc(0),
      }));
      await expect(
        redirects.fetch(source.listingUrls[0], "listing"),
      ).rejects.toThrow("redirect_limit");
      expect(redirects.attempts).toHaveLength(DEFAULT_LIMITS.maxRedirects + 1);
    },
  );
  it.each(sources)(
    "%s cannot gain acquisition readiness by deleting recorded blockers",
    async (id) => {
      const source = sourceDefinition(id),
        fixture = await fixtureTransport(
          `tests/fixtures/direct-sources/${sources.find(([s]) => s === id)![1]}/manifest.json`,
        );
      const run = await runDirectSource(
        {
          ...source,
          activationReview: { ...source.activationReview!, blockers: [] },
          publicationPolicy: {
            ...source.publicationPolicy,
            enabled: true,
            autoPublish: true,
          },
        },
        { ...fixture, mode: "fixture" },
      );
      expect(run.gate.acquisition_ready).toBe(false);
      expect(run.issues.length).toBeGreaterThan(0);
    },
  );
  it.each(sources)(
    "%s replays evidence/candidate/revision hashes independently of observation time",
    async (id) => {
      const a = baseline.get(id)!,
        b = await replay(id, undefined, "2026-10-02T00:00:00.000Z");
      expect(b.candidates.map((c) => c.candidateId)).toEqual(
        a.candidates.map((c) => c.candidateId),
      );
      expect(b.candidates.map(directRevisionHash)).toEqual(
        a.candidates.map(directRevisionHash),
      );
      expect(
        b.pages.map((p) => [p.evidence.id, p.evidence.contentHash]),
      ).toEqual(a.pages.map((p) => [p.evidence.id, p.evidence.contentHash]));
      expect(b.candidates[0].observedAt).not.toBe(a.candidates[0].observedAt);
    },
  );
  it("unknown factories, prototype names and source/factory mismatches never fall through", () => {
    for (const adapter of ["unknown", "toString", "__proto__"])
      expect(() =>
        sourceAdapter({
          ...sourceDefinition("pepper_lunch_sg"),
          adapter,
        } as DirectSourceDefinition),
      ).toThrow("unknown_direct_adapter");
    expect(() =>
      sourceAdapter({
        ...sourceDefinition("pepper_lunch_sg"),
        adapter: "paradise-group",
      }),
    ).toThrow("adapter_source_mismatch");
    expect(() => sourceDefinition("unknown" as BatchId)).toThrow(
      "unknown_direct_source",
    );
    expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
  });
});

describe("FairPrice catalogue metadata, not product price inference", () => {
  it("replays all 24 exact catalogue identities and explicit dates; one expired and 23 review", () => {
    const run = baseline.get("fairprice_sg")!;
    expect(run.enumeration.entries).toHaveLength(24);
    expect(run.requests).toHaveLength(1);
    expect(run.gate.detail_fetch_success).toBe(false);
    expect(decisions(run).filter((d) => d.result === "exclude")).toHaveLength(
      1,
    );
    expect(
      decisions(run).filter((d) => d.result === "needs_review"),
    ).toHaveLength(23);
    const offer = run.candidates.find((c) => c.title!.includes("20% Off"))!;
    expect(offer).toMatchObject({
      startDate: "2026-10-01",
      endDate: "2026-10-07",
      locationScope: "source_unspecified",
      locationNames: [],
    });
    expect(offer.facts.validity!.quote).toBe("1 Oct - 7 Oct 2026");
    expect(
      run.candidates.find((c) => c.title!.includes("UNITY"))!.merchant,
    ).toBeNull();
  });
  it("ordinary/lower/member prices and product offers cannot replace the catalogue collection", async () => {
    const run = await replay("fairprice_sg", ($) => {
      $("#__NEXT_DATA__").text(
        JSON.stringify({
          props: {
            pageProps: {
              data: {
                data: {
                  product: [
                    {
                      final_price: 1,
                      memberPrice: 0.5,
                      offers: [
                        { description: "Buy 1 at $1", validTill: "2027-01-01" },
                      ],
                    },
                  ],
                },
              },
            },
          },
        }),
      );
    });
    expect(run.candidates).toEqual([]);
    expect(run.gate.acquisition_ready).toBe(false);
  });
  it("rolling priceValidUntil and malformed JSON-LD never establish facts", async () => {
    const run = await replay("fairprice_sg", ($) => {
      $("body").append(
        '<script type="application/ld+json">{"offers":{"price":1,"priceValidUntil":"2099-12-31"}}}</script>',
      );
    });
    expect(run.candidates.map((c) => [c.startDate, c.endDate])).toEqual(
      baseline
        .get("fairprice_sg")!
        .candidates.map((c) => [c.startDate, c.endDate]),
    );
    expect(
      run.candidates.every(
        (c) => !JSON.stringify(c.facts).includes("priceValidUntil"),
      ),
    ).toBe(true);
  });
  it("pagination beyond the demonstrated collection fails closed without guessing endpoints", async () => {
    const run = await replay("fairprice_sg", ($) =>
      fairState($, (s) => {
        s.props.pageProps.promoDetail.layouts.find(
          (l) => l.collection === "publications",
        )!.pagination.totalPages = 2;
      }),
    );
    expect(run.issues.map((i) => i.code)).toContain("pagination_unresolved");
    expect(run.requests).toHaveLength(1);
    expect(run.enumeration.complete).toBe(false);
  });
  it.each(["duplicate", "foreign", "missing_card"])(
    "%s catalogue association cannot silently enumerate",
    async (kind) => {
      const run = await replay("fairprice_sg", ($) => {
        if (kind === "missing_card")
          $(
            'a[href="https://promotions.fairprice.com.sg/price-drop-buy-now-must-buy/"]',
          ).remove();
        else
          fairState($, (s) => {
            const values = s.props.pageProps.promoDetail.layouts.find(
              (l) => l.collection === "publications",
            )!.value;
            if (kind === "duplicate") values[1].id = values[0].id;
            else
              values[0].publicUrl =
                "https://www.krisplus.com/en/sg/promotions/foreign-1234abcd";
          });
      });
      expect(run.enumeration.entries).toEqual([]);
      expect(run.candidates).toEqual([]);
      expect(run.requests).toHaveLength(1);
    },
  );
  it("online/selected-store wording elsewhere cannot create participation or expand product coverage", async () => {
    const run = await replay("fairprice_sg", ($) =>
      $("body").append(
        "<div>Online only. Selected stores. Available at all FairPrice stores.</div>",
      ),
    );
    expect(
      run.candidates.every(
        (c) =>
          c.locationScope === "source_unspecified" &&
          c.locationNames.length === 0,
      ),
    ).toBe(true);
    expect(
      run.candidates.every((c) =>
        c.issues.includes("catalogue_product_set_unresolved"),
      ),
    ).toBe(true);
  });
  it("same-month campaign shorthand uses the explicit year and rejects impossible dates", () => {
    expect(fairpriceCatalogueDates("24 to 27 September 2026")).toMatchObject({
      startDate: "2026-09-24",
      endDate: "2026-09-27",
    });
    expect(fairpriceCatalogueDates("1-31 Oct 2026")).toMatchObject({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
    expect(fairpriceCatalogueDates("30-31 Feb 2026").issue).toBe(
      "validity_unparsed",
    );
    expect(
      fairpriceCatalogueDates("priceValidUntil 2027-01-01").endDate,
    ).toBeNull();
  });
});

describe("Kris+ public campaign association and partner identity", () => {
  it("acquires only twelve public detail links, preserving partial load-more and all unknown dates", () => {
    const run = baseline.get("kris_plus_sg")!;
    expect(run.candidates).toHaveLength(12);
    expect(run.requests).toHaveLength(13);
    expect(run.issues.map((i) => i.code)).toContain("unresolved_load_more");
    expect(
      run.requests.every((r) => new URL(r.url).hostname === "www.krisplus.com"),
    ).toBe(true);
    expect(
      run.candidates.every((c) => c.startDate === null && c.endDate === null),
    ).toBe(true);
    expect(sourceDefinition("kris_plus_sg").listingUrls).toEqual([
      "https://www.krisplus.com/en/sg/promotions",
    ]);
    expect(hasRecordedDirectOwnership(sourceDefinition("kris_plus_sg"))).toBe(
      true,
    );
  });
  it("Esso and iStudio remain partners; the seven-merchant Zouk article and app-only facts remain review", () => {
    const run = baseline.get("kris_plus_sg")!;
    expect(
      run.candidates.find((c) => c.title!.includes("Esso"))!.merchant,
    ).toBe("Esso");
    expect(
      run.candidates.find((c) => c.title!.includes("iStudio"))!.merchant,
    ).toBe("iStudio");
    const group = run.candidates.find(
      (c) => c.title === "Get 500 Bonus Miles",
    )!;
    expect(group.merchant).toBeNull();
    expect(group.issues).toContain("multiple_promoted_merchants");
    for (const name of [
      "Capital",
      "Phuture",
      "Zouk",
      "Korio",
      "Five Guys",
      "Rally Clubhouse",
      "The Plump Frenchman",
    ])
      expect(group.description).toContain(name);
    const multi = run.candidates.find(
      (c) => c.title === "Birthday Bash: Earn 8MPD",
    )!;
    expect(multi.merchant).toBeNull();
    expect(multi.issues).toContain("multiple_promoted_merchants");
    expect(multi.description).toContain("Canton Paradise");
    expect(run.candidates.every((c) => c.merchant !== "Kris+")).toBe(true);
    expect(
      run.candidates.find((c) => c.title === "Birthday Bash: Weekly Deals")!
        .benefit,
    ).toBeNull();
    expect(decisions(run).every((d) => d.result === "needs_review")).toBe(true);
  });
  it("foreign card links and unknown next URLs are not crawled or considered complete", async () => {
    const run = await replay("kris_plus_sg", ($, url) => {
      if (url.pathname !== "/en/sg/promotions") return;
      $('a[class*="__promotion_card"]')
        .first()
        .attr("href", "https://www.fairprice.com.sg/promotions");
      $("body").append(
        '<a rel="next" href="/en/sg/promotions?privateCursor=unknown">Next</a>',
      );
    });
    expect(run.enumeration.complete).toBe(false);
    expect(run.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "pagination_unresolved",
        "kris_directory_card_boundary_unresolved",
      ]),
    );
    expect(
      run.requests.every(
        (r) => !r.url.includes("privateCursor") && !r.url.includes("fairprice"),
      ),
    ).toBe(true);
  });
  it("card/header mismatch cannot borrow facts from an unrelated campaign or article footer", async () => {
    const run = await replay("kris_plus_sg", ($, url) => {
      if (url.pathname.includes("esso-fuels"))
        $('h1[class*="__title"]').text("Unrelated campaign");
      $("footer").append(
        "<p>Valid from 1 October 2026 to 30 November 2026 at all outlets.</p>",
      );
    });
    const broken = run.candidates.find((c) =>
      c.canonicalUrl.includes("esso-fuels"),
    )!;
    expect(broken.title).toBeNull();
    expect(broken.endDate).toBeNull();
    expect(broken.issues).toContain("kris_campaign_correspondence_unresolved");
    expect(broken.locationScope).toBe("source_unspecified");
  });
  it("conflicting public partner labels cause multi-merchant review instead of overriding identity", async () => {
    const run = await replay("kris_plus_sg", ($, url) => {
      if (url.pathname.includes("esso-fuels"))
        $('article[class*="__wrapper"]').append(
          '<a href="https://ca.krisplus.com/redirect?screen=partner&id=synthetic">Another merchant</a>',
        );
    });
    const c = run.candidates.find((c) =>
      c.canonicalUrl.includes("esso-fuels"),
    )!;
    expect(c.merchant).toBeNull();
    expect(c.issues).toContain("multiple_promoted_merchants");
  });
});

describe("Dian Xiao Er exact rendered-card boundaries", () => {
  it("preserves three unique cards and their own metadata; only the 30% card has selected names", () => {
    const run = baseline.get("dian_xiao_er_sg")!;
    expect(run.candidates).toHaveLength(3);
    expect(new Set(run.candidates.map((c) => c.candidateId)).size).toBe(3);
    expect(run.requests).toHaveLength(1);
    const selected = run.candidates.find((c) => c.title === "30% Early Bird")!;
    expect(selected.locationNames).toEqual([
      "City Square Mall",
      "Downtown East",
      "Great World",
      "Parkway Parade",
      "Lot One",
    ]);
    for (const c of run.candidates) {
      expect(c.benefit).toBeNull();
      expect(c.startDate).toBeNull();
      expect(c.endDate).toBeNull();
      expect(c.terms).toBeNull();
      expect(
        c.evidence[0].notes.some((n) => n.startsWith("image_metadata:")),
      ).toBe(true);
      expect(c.canonicalUrl).not.toContain("lightbox");
      if (c !== selected) {
        expect(c.locationScope).toBe("source_unspecified");
        expect(c.description).not.toContain("Selected outlets");
      }
    }
    expect(hasRecordedDirectOwnership(run.source)).toBe(false);
  });
  it("neighboring campaign dates, captions and outlet wording cannot leak", async () => {
    const run = await replay("dian_xiao_er_sg", ($) => {
      $('[data-testid="gallery-item-ghost"]')
        .eq(2)
        .find('[data-testid="gallery-item-description"]')
        .text(
          "Selected outlets: Synthetic branch. Valid till 31 December 2026",
        );
      $("body").append(
        "<p>All outlets. 90% off. Valid till 31 December 2026.</p>",
      );
    });
    const early = run.candidates.find((c) => c.title === "20% Early Bird")!;
    expect(early).toMatchObject({
      benefit: null,
      endDate: null,
      locationWording: null,
    });
    expect(early.description).toBe("20% Early Bird");
  });
  it.each([
    "duplicate_ghost",
    "conflicting_current",
    "alt_ambiguity",
    "filename_ambiguity",
  ])("%s fails exact campaign association", async (kind) => {
    const run = await replay("dian_xiao_er_sg", ($) => {
      const ghosts = $('[data-testid="gallery-item-ghost"]');
      if (kind === "duplicate_ghost")
        ghosts.first().after(ghosts.first().clone());
      if (kind === "conflicting_current")
        $(
          '[data-testid="gallery-item-item"] [data-testid="gallery-item-title"]',
        ).text("Wrong campaign");
      if (kind === "alt_ambiguity")
        ghosts.eq(1).find("img").attr("alt", "50% off another campaign");
      if (kind === "filename_ambiguity")
        ghosts
          .eq(1)
          .find("wow-image")
          .attr(
            "data-image-info",
            JSON.stringify({
              imageData: {
                uri: "free-duck-50-percent.jpg",
                width: 100,
                height: 100,
              },
            }),
          );
    });
    expect(run.candidates).toEqual([]);
    expect(run.enumeration.complete).toBe(false);
    expect(run.issues.length).toBeGreaterThan(2);
  });
  it("unknown gallery totals/load-more fail closed without requesting images or lightboxes", async () => {
    const run = await replay("dian_xiao_er_sg", ($) => {
      $('[data-testid="gallery-counter"]').text("1/99");
      $("#comp-m593fqa4").append(
        '<button class="load-more">Load more</button>',
      );
    });
    expect(run.issues.map((i) => i.code)).toContain("pagination_unresolved");
    expect(run.requests).toHaveLength(1);
    expect(run.gate.acquisition_ready).toBe(false);
  });
});

describe("CS Foods negative onboarding and frozen map", () => {
  it("retains CleanTalk failed evidence and no production source, adapter or database path", async () => {
    expect(sourceIdSchema.safeParse("cs_foods_sg").success).toBe(false);
    expect(directSources.some((s) => String(s.id) === "cs_foods_sg")).toBe(
      false,
    );
    expect(() => ingestArgs(["--source", "cs_foods_sg"])).toThrow();
    const ledger = JSON.parse(
      await readFile(
        "docs/changes/direct-source-batch-1/research-ledger.json",
        "utf8",
      ),
    )["cs-foods"];
    expect(ledger.attempts).toBe(4);
    expect(ledger.detailPages).toBe(1);
    expect(ledger.accessBlocks).toHaveLength(1);
    const capture = ledger.captures.find(
      (c: { httpStatus: number }) => c.httpStatus === 403,
    );
    expect(await readFile(capture.artifact, "utf8")).toMatch(/CleanTalk/i);
    const decision = JSON.parse(
      await readFile(
        "docs/changes/direct-source-batch-1/source-decisions.json",
        "utf8",
      ),
    ).find((r: { sourceId: string }) => r.sourceId === "cs_foods_sg");
    expect(decision).toMatchObject({
      finalState: "blocked",
      adapter: null,
      ownership: "verified",
    });
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        "access_blocked",
        "campaign_validity_unavailable",
        "sale_catalogue_not_complete_campaign_enumeration",
      ]),
    );
  });
  it("preserves prior batch rows outside the explicit coverage cohort and reviewed alias correction", async () => {
    const before = JSON.parse(
      await readFile(
        "docs/changes/direct-source-batch-1/merchant-map-before.json",
        "utf8",
      ),
    );
    const after = await readMapInputs();
    expect(after.summary.merchant_count).toBe(138);
    expect((after.provenance as { inputs: unknown }).inputs).toEqual(
      before.provenance.inputs,
    );
    expect(after.summary.distinct_adapter_counts).toEqual({
      enabled: 2,
      shadow: 9,
    });
    const batch2 = JSON.parse(
      await readFile("docs/changes/coverage-batch-2/selection.json", "utf8"),
    ) as { normalized_merchant: string }[];
    const selected = new Set([
      "fairprice",
      "kris",
      "dianxiaoer",
      "csfoods",
      "ajummas",
      "ajummaskoreanrestaurant",
      ...batch2.map((r) => r.normalized_merchant),
    ]);
    for (const row of after.merchants)
      if (!selected.has(row.normalized_merchant)) {
        const legacy = before.merchants.find(
          (r: { normalized_merchant: string }) =>
            r.normalized_merchant === row.normalized_merchant,
        );
        // The progress-ledger extension adds fields to every row. Preserve every
        // pre-existing field exactly; new field semantics have dedicated coverage.
        expect(legacy, row.merchant).toBeDefined();
        expect(
          Object.fromEntries(
            Object.keys(legacy).map((key) => [
              key,
              row[key as keyof typeof row],
            ]),
          ),
          row.merchant,
        ).toEqual(legacy);
      }
    const blocked = after.merchants.find((r) => r.merchant === "CS Foods")!;
    expect(blocked.adapter_status).toBe("none");
    expect(blocked.direct_source_id).toBeNull();
    expect(blocked.known_blockers).toContain("access_blocked");
    expect(blocked.ownership_status).toBe("verified");
  });
  it("all captured responses retain bounded body hashes, bytes, dates, exact URLs and acquisition purposes", async () => {
    const ledger = JSON.parse(
      await readFile(
        "docs/changes/direct-source-batch-1/research-ledger.json",
        "utf8",
      ),
    );
    for (const merchant of Object.values(ledger) as {
      captures: {
        artifact: string;
        sha256: string;
        bytes: number;
        requestedUrl: string;
        finalUrl: string;
        purpose: string;
        capturedAt: string;
        observedAt: string;
        httpStatus: number;
        contentType: string;
      }[];
    }[]) {
      for (const c of merchant.captures) {
        const body = await readFile(c.artifact);
        expect(contentHash(body)).toBe(c.sha256);
        expect(body.length).toBe(c.bytes);
        expect(c.bytes).toBeLessThanOrEqual(DEFAULT_LIMITS.maxBytes);
        expect(c.requestedUrl).toMatch(/^https:\/\//);
        expect(c.finalUrl).toMatch(/^https:\/\//);
        expect(c.purpose.length).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(c.capturedAt))).toBe(false);
        expect(Number.isNaN(Date.parse(c.observedAt))).toBe(false);
        expect(c.httpStatus).toBeGreaterThanOrEqual(200);
        expect(c.contentType).toBe("text/html");
      }
    }
    const before = JSON.parse(
      await readFile(
        "docs/changes/direct-source-batch-1/merchant-map-before.json",
        "utf8",
      ),
    );
    expect(contentHash(JSON.stringify(directSources.slice(0, 4)))).toBe(
      before.provenance.registry_sha256,
    );
    expect(fairpriceWeeklyUrl).toBe(
      sourceDefinition("fairprice_sg").listingUrls[0],
    );
  });
});
