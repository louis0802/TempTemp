import { load } from "cheerio";
import { z } from "zod";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import { cite, finalizeCandidate, newCandidate } from "../candidate";
import { campaignDates } from "../dates";
import { canonicalUrl } from "../fetch";
import { acquisitionIssue, whitespace } from "../html";
import type {
  DetailResult,
  EnumerationResult,
  FetchedPage,
  ListingEntry,
} from "../types";

export const fairpriceWeeklyUrl =
  "https://www.fairprice.com.sg/weekly-promotions";
const publicationSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  publicUrl: z.url(),
  pageCount: z.number().int().positive(),
});
const collectionSchema = z.object({
  collection: z.literal("publications"),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().positive(),
  }),
  value: z.array(publicationSchema).min(1),
});

/** Expand only explicit same-month catalogue shorthand; never price/product timestamps. */
export function fairpriceCatalogueDates(period: string) {
  const normalized = period.replace(
    /^(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/,
    "$1 $3 to $2 $3 $4",
  );
  return campaignDates([normalized]);
}

function catalogues(page: FetchedPage, ctx: DirectSourceContext) {
  const $ = load(page.body.toString("utf8"));
  if (
    canonicalUrl(page.evidence.url) !== fairpriceWeeklyUrl ||
    $("script#__NEXT_DATA__").length !== 1
  )
    throw new Error("fairprice_listing_structure_changed");
  // This is the JSON delivered with the public campaign page, not an API or repaired JSON-LD.
  const state = JSON.parse($("script#__NEXT_DATA__").text());
  const layouts: unknown = state?.props?.pageProps?.promoDetail?.layouts;
  if (!Array.isArray(layouts))
    throw new Error("fairprice_publications_unavailable");
  const collections = layouts.filter((v) => v?.collection === "publications");
  if (collections.length !== 1)
    throw new Error("fairprice_publication_collection_ambiguous");
  const collection = collectionSchema.parse(collections[0]);
  const ids = new Set<number>(),
    urls = new Set<string>();
  for (const item of collection.value) {
    const url = new URL(item.publicUrl);
    if (
      url.origin !== "https://promotions.fairprice.com.sg" ||
      !/^\/[a-z0-9-]+\/$/.test(url.pathname) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      ids.has(item.id) ||
      urls.has(url.href)
    )
      throw new Error("fairprice_catalogue_identity_unresolved");
    ids.add(item.id);
    urls.add(url.href);
    const matches = $("a[href]")
      .toArray()
      .filter((el) => {
        const node = $(el),
          href = node.attr("href");
        return (
          href &&
          canonicalUrl(href, page.evidence.url) === url.href &&
          node.find("p").length === 2 &&
          whitespace(node.find("p").eq(0).text()) === whitespace(item.title) &&
          whitespace(node.find("p").eq(1).text()) ===
            whitespace(item.description)
        );
      });
    if (matches.length !== 1)
      throw new Error("fairprice_catalogue_card_correspondence_unresolved");
  }
  const granted = new Set(
    ctx.http.discover(page, "a[href]", "detail", (url) => urls.has(url.href)),
  );
  if (granted.size !== urls.size)
    throw new Error("fairprice_catalogue_links_unresolved");
  return collection;
}

/** Catalogue metadata is useful shadow evidence; inaccessible brochure facts stay unknown. */
export class FairPriceAdapter implements DirectSourceAdapter {
  readonly sourceId = "fairprice_sg" as const;
  async enumerate(ctx: DirectSourceContext): Promise<EnumerationResult> {
    const result: EnumerationResult = {
      entries: [],
      evidence: [],
      complete: false,
      issues: [],
      pagination: {
        requested: [fairpriceWeeklyUrl],
        discovered: [],
        unresolved: [],
      },
      observedAt: ctx.observedAt,
    };
    try {
      const page = await ctx.http.fetch(fairpriceWeeklyUrl, "listing");
      result.evidence.push(page.evidence);
      const collection = catalogues(page, ctx);
      result.entries = collection.value.map((item) => ({
        canonicalUrl: item.publicUrl,
        title: whitespace(item.title),
        nativeId: String(item.id),
        listingUrl: fairpriceWeeklyUrl,
        evidenceId: page.evidence.id,
        relation: "detail",
        metadata: {
          description: item.description,
          merchant: null,
          selector: `#__NEXT_DATA__ publications[id=${item.id}] (exact DOM card)`,
        },
      }));
      const $ = load(page.body.toString());
      if (
        collection.pagination.page !== 1 ||
        collection.pagination.totalPages !== 1 ||
        collection.value.length > collection.pagination.pageSize ||
        $(
          'a[rel="next"],.pagination,[data-infinite-scroll],[class*="load-more"]',
        ).length ||
        $("button")
          .toArray()
          .some((e) => /load more|next page/i.test($(e).text()))
      ) {
        result.pagination.unresolved.push(fairpriceWeeklyUrl);
        result.issues.push({
          code: "pagination_unresolved",
          url: fairpriceWeeklyUrl,
          relation: "listing",
        });
      }
    } catch (error) {
      result.issues.push(
        acquisitionIssue(error, fairpriceWeeklyUrl, "listing"),
      );
    }
    result.issues.push(
      ...[
        "partial_enumeration",
        "catalogue_product_set_unresolved",
        "catalogue_detail_facts_unavailable",
      ].map((code) => ({
        code,
        url: fairpriceWeeklyUrl,
        relation: "listing" as const,
      })),
    );
    return result;
  }
  // No viewer backend or product crawl: Phase A could establish only public catalogue metadata.
  async extract(
    entry: ListingEntry,
    _detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = ctx.http.capturedPages.find(
      (p) => p.evidence.id === entry.evidenceId,
    );
    if (!page) throw new Error("missing_listing_evidence");
    const collection = catalogues(page, ctx);
    const item = collection.value.find(
      (p) =>
        String(p.id) === entry.nativeId && p.publicUrl === entry.canonicalUrl,
    );
    if (!item) throw new Error("fairprice_catalogue_identity_unresolved");
    const candidate = newCandidate(entry, ctx, []),
      selector = entry.metadata.selector;
    candidate.title = whitespace(item.title);
    cite(candidate, "title", page.evidence.id, selector, item.title);
    if (/\bUNITY\b/i.test(item.title))
      candidate.issues.push("promoted_merchant_unresolved");
    else {
      candidate.merchant = "FairPrice";
      cite(
        candidate,
        "merchant",
        page.evidence.id,
        "official weekly campaign listing",
        "NTUC FairPrice Weekly Promotions",
      );
    }
    candidate.description = `${item.title}\n${item.description}`;
    cite(
      candidate,
      "description",
      page.evidence.id,
      selector,
      candidate.description,
    );
    if (/\b\d+%\s*Off\b/i.test(item.title)) {
      candidate.benefit = item.title;
      cite(candidate, "benefit", page.evidence.id, selector, item.title);
    }
    const dates = fairpriceCatalogueDates(item.description);
    candidate.startDate = dates.startDate;
    candidate.endDate = dates.endDate;
    if (dates.quote)
      cite(candidate, "validity", page.evidence.id, selector, item.description);
    if (dates.issue) candidate.issues.push(dates.issue);
    candidate.issues.push(
      "catalogue_product_set_unresolved",
      "catalogue_detail_facts_unavailable",
      "physical_participation_unresolved",
    );
    return [finalizeCandidate(candidate)];
  }
}
