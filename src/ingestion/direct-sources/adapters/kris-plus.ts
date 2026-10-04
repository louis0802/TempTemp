import { load } from "cheerio";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import { cite, finalizeCandidate, newCandidate } from "../candidate";
import { canonicalUrl } from "../fetch";
import {
  acquisitionIssue,
  cardsFromPage,
  enumerateListings,
  whitespace,
} from "../html";
import type { DetailResult, ListingEntry } from "../types";

export const krisPlusPromotionsUrl =
  "https://www.krisplus.com/en/sg/promotions";
const cards = 'a[class*="PromotionCardItem-"][class*="__promotion_card"]';
const article = 'article[class*="PromotionDetail-"][class*="__wrapper"]';
const titleSelector = 'h1[class*="__title"]';
const subtitleSelector = 'p[class*="__subtitle"]';
const economics = /\d+\s*(?:%|mpd|miles)|(?:S?\$|SGD)\s*\d|bonus miles/i;

/** Only visible public directory cards and their exact public article URLs. */
export class KrisPlusAdapter implements DirectSourceAdapter {
  readonly sourceId = "kris_plus_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const problems: { code: string; url: string; relation: "listing" }[] = [];
    const result = await enumerateListings(
      ctx,
      (page) => {
        const $ = load(page.body.toString());
        const entries = cardsFromPage(
          page,
          ctx,
          {
            cards,
            link: null,
            title: "p:first-of-type",
            description: "p:last-of-type",
          },
          (url) =>
            url.origin === "https://www.krisplus.com" &&
            /^\/en\/sg\/promotions\/[a-z0-9-]+-[a-f0-9]{8}$/.test(
              url.pathname,
            ) &&
            !url.search &&
            !url.hash,
        );
        if (
          canonicalUrl(page.evidence.url) !== krisPlusPromotionsUrl ||
          whitespace($("h1").text()) !== "Promotions in Singapore" ||
          !entries.length ||
          entries.length !== $(cards).length ||
          new Set(entries.map((e) => e.canonicalUrl)).size !== entries.length ||
          entries.some((e) => !e.title || !e.metadata.description)
        )
          problems.push({
            code: "kris_directory_card_boundary_unresolved",
            url: page.evidence.url,
            relation: "listing",
          });
        if (
          $("button")
            .toArray()
            .some(
              (e) => /load more/i.test($(e).text()) && !$(e).is(":disabled"),
            )
        )
          problems.push({
            code: "unresolved_load_more",
            url: page.evidence.url,
            relation: "listing",
          });
        return entries.map((e) => ({
          ...e,
          nativeId: new URL(e.canonicalUrl).pathname.split("/").at(-1)!,
        }));
      },
      () => false,
      false,
      cards,
      '[data-infinite-scroll],[data-ajax],[class*="load-more"],[class*="load_more"]',
    );
    result.issues.push(...problems, {
      code: "partial_enumeration",
      url: krisPlusPromotionsUrl,
      relation: "listing",
    });
    return result;
  }
  async fetchDetail(
    entry: ListingEntry,
    ctx: DirectSourceContext,
  ): Promise<DetailResult> {
    try {
      const page = await ctx.http.fetch(entry.canonicalUrl, "detail");
      if (canonicalUrl(page.evidence.url) !== entry.canonicalUrl)
        return {
          page,
          related: [],
          issues: [
            {
              code: "kris_campaign_redirect_mismatch",
              url: entry.canonicalUrl,
              relation: "detail",
            },
          ],
        };
      return { page, related: [], issues: [] };
    } catch (error) {
      return {
        page: null,
        related: [],
        issues: [acquisitionIssue(error, entry.canonicalUrl, "detail")],
      };
    }
  }
  async extract(
    entry: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const candidate = newCandidate(
      entry,
      ctx,
      detail?.page ? [detail.page] : [],
    );
    candidate.issues.push(
      "campaign_offer_scopes_unresolved",
      "promoted_merchant_unresolved",
    );
    if (!detail?.page) {
      candidate.issues.push("detail_fetch_failed");
      return [finalizeCandidate(candidate)];
    }
    const page = detail.page,
      $ = load(page.body.toString()),
      root = $(article);
    const title = whitespace(root.find(titleSelector).text()),
      subtitle = whitespace(root.find(subtitleSelector).text());
    if (
      root.length !== 1 ||
      root.find(titleSelector).length !== 1 ||
      root.find(subtitleSelector).length !== 1 ||
      title !== entry.title ||
      subtitle !== entry.metadata.description ||
      detail.issues.length
    ) {
      candidate.issues.push(
        "detail_structure_changed",
        "kris_campaign_correspondence_unresolved",
      );
      return [finalizeCandidate(candidate)];
    }
    candidate.title = title;
    cite(
      candidate,
      "title",
      page.evidence.id,
      `${article} ${titleSelector}`,
      title,
    );
    if (economics.test(subtitle) || economics.test(title)) {
      candidate.benefit = economics.test(subtitle) ? subtitle : title;
      cite(
        candidate,
        "benefit",
        page.evidence.id,
        `${article} public campaign header`,
        candidate.benefit,
      );
    }
    const copy = root.clone();
    copy.find("script,style,noscript").remove();
    candidate.description = whitespace(copy.text());
    cite(
      candidate,
      "description",
      page.evidence.id,
      article,
      candidate.description,
    );
    // Public labels establish identity, never facts behind the app link. No app URL is fetched.
    const names = new Set(
      copy
        .find(".card .name")
        .map((_i, e) => whitespace($(e).text()))
        .get()
        .filter(Boolean),
    );
    copy.find("a[href]").each((_i, e) => {
      const url = new URL($(e).attr("href")!, page.evidence.url);
      if (
        url.origin === "https://ca.krisplus.com" &&
        url.pathname === "/redirect" &&
        url.searchParams.get("screen") === "partner"
      ) {
        const name = whitespace($(e).text());
        if (
          name &&
          !/^(?:View Partner|View all partners|Learn more|Find out more)$/i.test(
            name,
          )
        )
          names.add(name);
      }
    });
    if (/^[^A-Za-z]*Esso fuels your miles/i.test(title)) names.add("Esso");
    if (/^Win [\d,]+ Miles at iStudio$/.test(title)) names.add("iStudio");
    if (names.size === 1 && !names.has("Kris+")) {
      candidate.merchant = [...names][0];
      candidate.issues = candidate.issues.filter(
        (i) => i !== "promoted_merchant_unresolved",
      );
      cite(
        candidate,
        "merchant",
        page.evidence.id,
        `${article} explicit public partner label/header`,
        candidate.merchant,
      );
    } else if (names.size > 1)
      candidate.issues.push("multiple_promoted_merchants");
    // Rendered activeFrom/activeTo and embedded challenge dates are not the header offer's validity.
    // Generic one-merchant publication stays unchanged; this source remains shadow.
    return [finalizeCandidate(candidate)];
  }
}
