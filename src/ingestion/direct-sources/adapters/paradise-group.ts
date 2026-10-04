import { load } from "cheerio";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import {
  cite,
  finalizeCandidate,
  newCandidate,
  sourceLocations,
} from "../candidate";
import { campaignDates } from "../dates";
import {
  acquisitionIssue,
  cardsFromPage,
  enumerateListings,
  textLines,
  whitespace,
} from "../html";
import { associatedNativePdfText } from "../pdf";
import type { DetailResult, FetchedPage, ListingEntry } from "../types";
const offerPath = (url: URL) => /^\/promotions\/[^/]+\/$/.test(url.pathname);
const menuPath = (url: URL) =>
  /^\/wp-content\/uploads\/.+\.pdf$/i.test(url.pathname);
export class ParadiseGroupAdapter implements DirectSourceAdapter {
  readonly sourceId = "paradise_group_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const result = await enumerateListings(
      ctx,
      (page) => {
        const entries = [
          ...cardsFromPage(
            page,
            ctx,
            {
              cards: ".pgh-promotions-carousel__slide",
              link: "a.pgh-promotions__button[href]",
              title: ".pgh-promotions-carousel__title",
              description: ".pgh-promotions-carousel__description",
            },
            offerPath,
          ),
          ...cardsFromPage(
            page,
            ctx,
            {
              cards: "a.pgh-promotions-list__item[href]",
              link: null,
              title: ".pgh-promotions-list__title",
              description: ".pgh-promotions-list__shortDescription",
              merchant: "Paradise Hotpot",
            },
            offerPath,
          ),
        ];
        if (new URL(page.evidence.url).pathname === "/paradise-hotpot/") {
          const selector = '.pgh-button a[href$=".pdf"]';
          const $ = load(page.body.toString("utf8"));
          const menuUrls = ctx.http.discover(page, selector, "menu", menuPath);
          for (const url of menuUrls)
            entries.push({
              canonicalUrl: url,
              title: "Paradise Hotpot menu",
              nativeId: null,
              listingUrl: page.evidence.url,
              evidenceId: page.evidence.id,
              relation: "menu",
              metadata: {
                description: null,
                merchant:
                  whitespace(
                    $("h2")
                      .filter(
                        (_i, e) =>
                          whitespace($(e).text()) === "Paradise Hotpot",
                      )
                      .first()
                      .text(),
                  ) || null,
                selector,
              },
            });
        }
        return entries;
      },
      (url) =>
        ctx.source.allowedHosts.includes(url.hostname) &&
        /^\/promotions\/page\/\d+\/$/.test(url.pathname),
      false,
      ".pgh-promotions-carousel, .pgh-promotions-list",
      ".pgh-promotions-list button",
    );
    result.issues.push({
      code: "corporate_coverage_partial",
      url: ctx.source.origin,
      relation: "listing",
    });
    return result;
  }
  async fetchDetail(
    entry: ListingEntry,
    ctx: DirectSourceContext,
  ): Promise<DetailResult> {
    const result: DetailResult = { page: null, related: [], issues: [] };
    try {
      result.page = await ctx.http.fetch(entry.canonicalUrl, entry.relation);
      if (result.page.evidence.contentType === "text/html") {
        const root = ".pgh-promotions-single";
        for (const relation of ["menu", "terms"] as const) {
          const selector =
            relation === "menu"
              ? `${root} a[href$=".pdf"]`
              : `${root} a[href*="terms"][href]`;
          const urls = ctx.http.discover(
            result.page,
            selector,
            relation,
            (url) =>
              relation === "menu"
                ? menuPath(url)
                : /^\/terms[^/]*\/$/.test(url.pathname),
          );
          for (const url of urls) {
            try {
              result.related.push(await ctx.http.fetch(url, relation));
            } catch (error) {
              result.issues.push(acquisitionIssue(error, url, relation));
            }
          }
        }
      }
    } catch (error) {
      result.issues.push(
        acquisitionIssue(error, entry.canonicalUrl, entry.relation),
      );
    }
    return result;
  }
  async extract(
    entry: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = detail?.page;
    const pages: FetchedPage[] = [
      ...(page ? [page] : []),
      ...(detail?.related ?? []),
    ];
    const candidate = newCandidate(entry, ctx, pages);
    if (entry.title) {
      candidate.title = entry.title;
      cite(
        candidate,
        "title",
        entry.evidenceId,
        entry.metadata.selector,
        entry.relation === "menu" ? "MENU" : entry.title,
      );
    }
    if (entry.metadata.description) {
      candidate.description = entry.metadata.description;
      cite(
        candidate,
        "description",
        entry.evidenceId,
        entry.metadata.selector,
        entry.metadata.description,
      );
    }
    if (entry.metadata.merchant) {
      candidate.merchant = entry.metadata.merchant;
      cite(
        candidate,
        "merchant",
        entry.evidenceId,
        entry.relation === "menu" ? "h2" : ".pgh-promotions-list[data-brands]",
        entry.metadata.merchant,
      );
    }
    if (!page)
      candidate.issues.push(
        `detail_fetch_failed:${detail?.issues[0]?.code ?? "not_retrieved"}`,
      );
    else if (page.evidence.contentType === "application/pdf") {
      candidate.issues.push("menu_evidence_not_campaign");
      candidate.issues.push(
        associatedNativePdfText(null, entry.title ?? "").issue!,
      );
    } else {
      const $ = load(page.body.toString("utf8"));
      const id = page.evidence.id;
      const root = ".pgh-promotions-single";
      if (!$(root).length) candidate.issues.push("detail_structure_changed");
      const title = whitespace(
        $(`${root} .pgh-promotions-single__title`).text(),
      );
      if (title) {
        candidate.title = title;
        cite(
          candidate,
          "title",
          id,
          `${root} .pgh-promotions-single__title`,
          title,
        );
      }
      const merchant = whitespace(
        $(`${root} .pgh-promotions-single__subtitle`).text(),
      );
      if (merchant) {
        candidate.merchant = merchant;
        cite(
          candidate,
          "merchant",
          id,
          `${root} .pgh-promotions-single__subtitle`,
          merchant,
        );
      }
      const bodySelector = `${root} > p, ${root} > ul:not(.unrelated)`;
      const body = $(root).clone();
      body.find(".pgh-promotions-single__tncTitle").nextAll().remove();
      body.find(".pgh-promotions-single__tncTitle").remove();
      const body$ = load(body.toString());
      const lines = textLines(body$, bodySelector);
      if (lines.length) {
        candidate.description = lines.join("\n");
        cite(candidate, "description", id, bodySelector, candidate.description);
      }
      const termsSelector = `${root} .pgh-promotions-single__tncTitle ~ ul`;
      const terms = textLines($, termsSelector);
      if (terms.length) {
        candidate.terms = terms;
        cite(candidate, "terms", id, termsSelector, terms.join("\n"));
      }
      const multiOffer =
        merchant.includes("|") || $(`${root} > p > strong`).length > 1;
      const all = [...lines, ...terms];
      if (multiOffer)
        candidate.issues.push("multi_offer_page_requires_association");
      else {
        const benefit = lines.find((line) =>
          /\$\d|\d+%\s*(?:off|rebate)|\d\s*(?:for|dines? free)/i.test(line),
        );
        if (benefit) {
          candidate.benefit = benefit;
          cite(candidate, "benefit", id, bodySelector, benefit);
        }
        const dates = campaignDates(all);
        candidate.startDate = dates.startDate;
        candidate.endDate = dates.endDate;
        if (dates.quote)
          cite(
            candidate,
            "validity",
            id,
            `${bodySelector}, ${termsSelector}`,
            dates.quote,
          );
        if (dates.issue) candidate.issues.push(dates.issue);
        sourceLocations(
          candidate,
          all,
          id,
          `${bodySelector}, ${termsSelector}`,
        );
        const redemption = all.filter((line) =>
          /\b(?:dine-in|takeaway|redeem|redemption|advance order)\b/i.test(
            line,
          ),
        );
        if (redemption.length) {
          candidate.redemption = redemption;
          cite(
            candidate,
            "redemption",
            id,
            `${bodySelector}, ${termsSelector}`,
            redemption.join("\n"),
          );
        }
      }
      // Only explicit page-wide conditions; per-brand terms remain raw evidence on multi-offer pages.
      const globalTerms = multiOffer ? terms.slice(0, 1) : terms;
      const eligibility = globalTerms.filter((line) =>
        /\bmembers only\b/i.test(line),
      );
      if (eligibility.length) {
        candidate.eligibility = eligibility;
        cite(
          candidate,
          "eligibility",
          id,
          termsSelector,
          eligibility.join("\n"),
        );
      }
      if (globalTerms.some((line) => /valid on every Monday/i.test(line))) {
        candidate.weekdays = [1];
        cite(
          candidate,
          "weekdays",
          id,
          termsSelector,
          globalTerms.find((line) => /valid on every Monday/i.test(line))!,
        );
      }
    }
    for (const related of detail?.related ?? [])
      if (related.evidence.contentType === "application/pdf")
        candidate.issues.push("linked_pdf_facts_unparsed");
    for (const issue of detail?.issues ?? [])
      if (page || issue.url !== entry.canonicalUrl)
        candidate.issues.push(`linked_evidence_failed:${issue.code}`);
    return [finalizeCandidate(candidate)];
  }
}
