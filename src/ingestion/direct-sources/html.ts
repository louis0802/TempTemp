import { load, type CheerioAPI } from "cheerio";
import { canonicalUrl } from "./fetch";
import type { DirectSourceContext } from "./adapter";
import type {
  AcquisitionIssue,
  EnumerationResult,
  FetchedPage,
  ListingEntry,
} from "./types";
export const whitespace = (value: string) => value.replace(/\s+/g, " ").trim();
export function textLines($: CheerioAPI, selector: string): string[] {
  const root = $(selector).clone();
  root.find("script,style,noscript").remove();
  root.find("br").replaceWith("\n");
  root.find("p,li,div").append("\n");
  return root.text().split(/\n+/).map(whitespace).filter(Boolean);
}
export const acquisitionIssue = (
  error: unknown,
  url: string,
  relation: AcquisitionIssue["relation"],
): AcquisitionIssue => ({
  code: error instanceof Error ? error.message : "acquisition_failed",
  url,
  relation,
});
export interface CardSelectors {
  cards: string;
  link: string | null;
  title: string;
  description?: string;
  merchant?: string;
}
export function cardsFromPage(
  page: FetchedPage,
  ctx: DirectSourceContext,
  selectors: CardSelectors,
  accept: (url: URL) => boolean,
): ListingEntry[] {
  const $ = load(page.body.toString("utf8"));
  const linkSelector = selectors.link
    ? `${selectors.cards} ${selectors.link}`
    : selectors.cards;
  const allowed = new Set(
    ctx.http.discover(page, linkSelector, "detail", accept),
  );
  const entries: ListingEntry[] = [];
  $(selectors.cards).each((_index, element) => {
    const card = $(element);
    const link = selectors.link ? card.find(selectors.link).first() : card;
    const href = link.attr("href");
    if (!href) return;
    const url = new URL(href, page.evidence.url);
    if (!accept(url)) return;
    const canonical = canonicalUrl(url.href);
    if (!allowed.has(canonical)) return;
    entries.push({
      canonicalUrl: canonical,
      title: whitespace(card.find(selectors.title).first().text()) || null,
      nativeId: null,
      listingUrl: page.evidence.url,
      evidenceId: page.evidence.id,
      relation: "detail",
      metadata: {
        description: selectors.description
          ? whitespace(card.find(selectors.description).text()) || null
          : null,
        merchant: selectors.merchant ?? null,
        selector: selectors.cards,
      },
    });
  });
  return entries;
}
export function dedupeEntries(entries: ListingEntry[]) {
  return [
    ...new Map(entries.map((entry) => [entry.canonicalUrl, entry])).values(),
  ].sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl, "en"));
}
/** Only registered roots and source-approved, visibly linked pagination. */
export async function enumerateListings(
  ctx: DirectSourceContext,
  parse: (page: FetchedPage) => ListingEntry[],
  paginationAccept: (url: URL) => boolean,
  boundaryComplete: boolean,
  structureSelector: string,
  unresolvedControls: string,
): Promise<EnumerationResult> {
  const queue = [...ctx.source.listingUrls];
  const seen = new Set<string>();
  const result: EnumerationResult = {
    entries: [],
    evidence: [],
    complete: boundaryComplete,
    issues: [],
    pagination: { requested: [], discovered: [], unresolved: [] },
    observedAt: ctx.observedAt,
  };
  while (queue.length) {
    const url = canonicalUrl(queue.shift()!);
    if (seen.has(url)) continue;
    seen.add(url);
    if (result.pagination.requested.length >= ctx.http.limits.maxListingPages) {
      result.complete = false;
      result.pagination.unresolved.push(url);
      result.issues.push({
        code: "listing_page_limit",
        url,
        relation: "listing",
      });
      continue;
    }
    result.pagination.requested.push(url);
    try {
      const page = await ctx.http.fetch(url, "listing");
      result.evidence.push(page.evidence);
      const $ = load(page.body.toString("utf8"));
      if (!$(structureSelector).length) {
        result.complete = false;
        result.issues.push({
          code: "listing_structure_changed",
          url,
          relation: "listing",
        });
      }
      result.entries.push(...parse(page));
      const paginationSelector =
        '.pagination a[href], .nav-links a[href], a[rel="next"][href], .page-numbers a[href], a.page-numbers[href]';
      const paginationAllowed = (target: URL) =>
        ctx.source.listingUrls.some(
          (root) => canonicalUrl(root) === canonicalUrl(target.href),
        ) || paginationAccept(target);
      const links = ctx.http.discover(
        page,
        paginationSelector,
        "listing",
        paginationAllowed,
      );
      for (const next of links) {
        if (!result.pagination.discovered.includes(next))
          result.pagination.discovered.push(next);
        if (!seen.has(next)) queue.push(next);
      }
      const nextCycles = $(
        'a[rel="next"][href], .pagination a.next[href], .nav-links a.next[href]',
      )
        .map((_i, e) => canonicalUrl($(e).attr("href")!, page.evidence.url))
        .get()
        .filter((target) => seen.has(target));
      if (nextCycles.length) {
        result.complete = false;
        result.pagination.unresolved.push(...nextCycles);
        result.issues.push({
          code: "pagination_cycle",
          url,
          relation: "listing",
        });
      }
      const unresolved = $(paginationSelector)
        .map((_i, e) => $(e).attr("href"))
        .get()
        .filter((href) => !paginationAllowed(new URL(href, page.evidence.url)));
      if (unresolved.length || $(unresolvedControls).length) {
        result.complete = false;
        result.pagination.unresolved.push(
          ...unresolved.map((href) => new URL(href, page.evidence.url).href),
        );
        result.issues.push({
          code: "pagination_unresolved",
          url,
          relation: "listing",
        });
      }
    } catch (error) {
      result.complete = false;
      result.issues.push(acquisitionIssue(error, url, "listing"));
    }
  }
  result.entries = dedupeEntries(result.entries);
  return result;
}
