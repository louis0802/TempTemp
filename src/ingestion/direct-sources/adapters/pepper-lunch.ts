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
import type { DetailResult, ListingEntry } from "../types";
export class PepperLunchAdapter implements DirectSourceAdapter {
  readonly sourceId = "pepper_lunch_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    return enumerateListings(
      ctx,
      (page) =>
        cardsFromPage(
          page,
          ctx,
          {
            cards: ".promo__container .promo__item",
            link: "a[href]",
            title: "h3",
          },
          (url) => /^\/promo\/[^/]+\/$/.test(url.pathname),
        ),
      (url) =>
        ctx.source.allowedHosts.includes(url.hostname) &&
        /^\/promo\/page\/\d+\/$/.test(url.pathname),
      true,
      ".promo__container",
      'main [class*="load-more"], main [class*="load_more"], .promo__container button',
    );
  }
  async fetchDetail(
    entry: ListingEntry,
    ctx: DirectSourceContext,
  ): Promise<DetailResult> {
    try {
      return {
        page: await ctx.http.fetch(entry.canonicalUrl, "detail"),
        related: [],
        issues: [],
      };
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
    const page = detail?.page;
    const candidate = newCandidate(entry, ctx, page ? [page] : []);
    if (entry.title) {
      candidate.title = entry.title;
      cite(
        candidate,
        "title",
        entry.evidenceId,
        `${entry.metadata.selector} h3`,
        entry.title,
      );
    }
    if (!page) {
      candidate.issues.push(
        `detail_fetch_failed:${detail?.issues[0]?.code ?? "not_retrieved"}`,
      );
      return [finalizeCandidate(candidate)];
    }
    const $ = load(page.body.toString("utf8"));
    const id = page.evidence.id;
    const title = whitespace($("main .page__header h2").first().text());
    if (title) {
      candidate.title = title;
      cite(candidate, "title", id, "main .page__header h2", title);
    }
    if (!$("main .section__01 .column_container").length)
      candidate.issues.push("detail_structure_changed");
    const bodySelector = "main .section__01 .column_container";
    const lines = textLines($, bodySelector);
    const branch = whitespace($("main .terms .branch-tags .pc").text());
    const merchantQuote = [...lines, branch].find((s) =>
      /pepper lunch/i.test(s),
    );
    if (merchantQuote) {
      candidate.merchant = "Pepper Lunch";
      cite(
        candidate,
        "merchant",
        id,
        branch === merchantQuote
          ? "main .terms .branch-tags .pc"
          : bodySelector,
        merchantQuote,
      );
    }
    if (lines.length) {
      candidate.description = lines.join("\n");
      cite(candidate, "description", id, bodySelector, candidate.description);
    }
    const benefit = lines.find((s) =>
      /(?:\$\d|\d+%\s*off|\d\s*(?:for|\+|FOR)\s*\d)/i.test(s),
    );
    if (benefit) {
      candidate.benefit = benefit;
      cite(candidate, "benefit", id, bodySelector, benefit);
    }
    const termsSelector = "main .terms .answer__div";
    const terms = textLines($, termsSelector);
    if (terms.length) {
      candidate.terms = terms;
      cite(candidate, "terms", id, termsSelector, terms.join("\n"));
    }
    const all = [...lines, ...terms];
    const validity = campaignDates(all);
    candidate.startDate = validity.startDate;
    candidate.endDate = validity.endDate;
    if (validity.quote)
      cite(
        candidate,
        "validity",
        id,
        `${bodySelector}, ${termsSelector}`,
        validity.quote,
      );
    if (validity.issue) candidate.issues.push(validity.issue);
    sourceLocations(candidate, all, id, `${bodySelector}, ${termsSelector}`);
    if (branch && !candidate.locationWording)
      candidate.issues.push("outlet_type_only");
    const eligibility = all.filter((s) =>
      /\b(?:students? only|members? only|student (?:card|pass)|aged? \d|eligible)\b/i.test(
        s,
      ),
    );
    if (eligibility.length) {
      candidate.eligibility = eligibility;
      cite(candidate, "eligibility", id, bodySelector, eligibility.join("\n"));
    }
    const redemption = all.filter((s) =>
      /\b(?:dine-in|takeaway|present (?:your|a)|redeem|redemption)\b/i.test(s),
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
    return [finalizeCandidate(candidate)];
  }
}
