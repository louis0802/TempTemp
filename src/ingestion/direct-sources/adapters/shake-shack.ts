import { load } from "cheerio";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import { cite, finalizeCandidate, newCandidate } from "../candidate";
import { campaignDates } from "../dates";
import {
  acquisitionIssue,
  cardsFromPage,
  enumerateListings,
  textLines,
  whitespace,
} from "../html";
import type {
  ArticleClassification,
  DetailResult,
  FetchedPage,
  ListingEntry,
} from "../types";

const bodySelector = '[data-elementor-type="wp-post"]';
const termsHeading = /^\*?\s*terms\s*(?:and|&)\s*conditions\s*:?/i;
/** Terms plus an economic proposition, never archive membership or isolated free/$ words. */
export function shakePromotionBody(page: FetchedPage) {
  const $ = load(page.body.toString("utf8"));
  const lines = textLines($, bodySelector);
  const termsAt = lines.findIndex((line) => termsHeading.test(line));
  const benefit = lines.find((line) =>
    /\b(?:free|complimentary)\b.+\b(?:with|purchase|bundle)\b|\b(?:enjoy|get|offering)\b.+\b(?:on us|\d+[ -]for[ -]\d+|\d+%\s*off)\b|\b(?:bundle|meal)\b.+\b(?:starting from|from)\s*\$\d/i.test(
      line,
    ),
  );
  const terms =
    termsAt < 0
      ? []
      : whitespace(lines.slice(termsAt).join(" ").replace(termsHeading, ""))
          .split(/(?<=[.!?])\s+/)
          .filter(Boolean);
  return {
    $,
    lines,
    terms,
    benefit,
    promotion: termsAt >= 0 && !!benefit && terms.length > 0,
  };
}
const articlePath = (url: URL) =>
  /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname) &&
  ![
    "/blog/",
    "/menu/",
    "/locations/",
    "/career/",
    "/catering/",
    "/our-values/",
    "/contact-us/",
    "/faqs/",
  ].includes(url.pathname) &&
  !url.search;

export class ShakeShackAdapter implements DirectSourceAdapter {
  readonly sourceId = "shake_shack_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const listingProblems: {
      code: string;
      url: string;
      relation: "listing";
    }[] = [];
    const result = await enumerateListings(
      ctx,
      (page) => {
        const $ = load(page.body.toString());
        const entries = cardsFromPage(
          page,
          ctx,
          {
            cards: "main .pp-posts .pp-post",
            link: ".pp-post-title a[href]",
            title: ".pp-post-title",
          },
          (url) =>
            ctx.source.allowedHosts.includes(url.hostname) && articlePath(url),
        );
        const cards = $("main .pp-posts .pp-post");
        if (
          !cards.length ||
          entries.length !== cards.length ||
          entries.some((e) => !e.title)
        )
          listingProblems.push({
            code: "listing_article_boundary_unresolved",
            url: page.evidence.url,
            relation: "listing",
          });
        return entries;
      },
      (url) =>
        ctx.source.allowedHosts.includes(url.hostname) &&
        /^\/blog\/page\/[1-9]\d*\/$/.test(url.pathname) &&
        Number(url.pathname.split("/")[3]) >= 2 &&
        !url.search,
      true,
      "main .pp-posts",
      'main [class*="load-more"], main [class*="load_more"], main .pp-posts button, main [data-infinite-scroll], main [class*="infinite-scroll"], main [class*="infinite_scroll"]',
    );
    if (listingProblems.length) {
      result.complete = false;
      result.issues.push(...listingProblems);
    }
    const articles = result.entries;
    result.entries = [];
    const classifications: ArticleClassification[] = [];
    // A mixed archive requires bounded detail classification before claiming promotion enumeration.
    for (const entry of articles) {
      const detail = await this.fetchDetail(entry, ctx);
      if (!detail.page) {
        result.complete = false;
        result.issues.push(...detail.issues);
        classifications.push({
          url: entry.canonicalUrl,
          result: "unresolved",
          evidenceId: null,
          reason: detail.issues.map((i) => i.code).join(","),
        });
        continue;
      }
      const body = shakePromotionBody(detail.page);
      if (!body.$(bodySelector).length) {
        result.complete = false;
        result.issues.push({
          code: "detail_structure_changed",
          url: entry.canonicalUrl,
          relation: "detail",
        });
        classifications.push({
          url: entry.canonicalUrl,
          result: "unresolved",
          evidenceId: detail.page.evidence.id,
          reason: "detail_structure_changed",
        });
      } else {
        classifications.push({
          url: entry.canonicalUrl,
          result: body.promotion ? "promotion" : "non_promotion",
          evidenceId: detail.page.evidence.id,
          reason: body.promotion
            ? "terms_and_economic_proposition"
            : "no_terms_and_economic_proposition",
        });
        if (body.promotion) result.entries.push(entry);
      }
      // Non-promotions remain captured direct evidence, never review candidates.
    }
    const count = (kind: ArticleClassification["result"]) =>
      classifications.filter((a) => a.result === kind).length;
    result.classification = {
      discovered_articles: articles.length,
      classified_articles: count("promotion") + count("non_promotion"),
      promotion_articles: count("promotion"),
      non_promotion_articles: count("non_promotion"),
      unresolved_articles: count("unresolved"),
      articles: classifications,
    };
    return result;
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
    if (!page) return []; // Enumeration cannot include an unclassified article.
    const { $, lines, terms, benefit, promotion } = shakePromotionBody(page);
    if (!promotion) return [];
    const c = newCandidate(entry, ctx, [page]),
      id = page.evidence.id;
    const put = (
      field: Parameters<typeof cite>[1],
      quote: string,
      selector = bodySelector,
    ) => cite(c, field, id, selector, quote);
    const title =
      whitespace($('[data-elementor-type="single-post"] h1').first().text()) ||
      entry.title;
    if (title) {
      c.title = title;
      cite(
        c,
        "title",
        title === entry.title ? entry.evidenceId : id,
        title === entry.title
          ? entry.metadata.selector
          : '[data-elementor-type="single-post"] h1',
        title,
      );
    }
    const merchant = lines.find((line) => /\bShake Shack\b/i.test(line));
    if (merchant) {
      c.merchant = "Shake Shack";
      put("merchant", merchant);
    }
    c.description = lines.join("\n");
    put("description", c.description);
    c.benefit = benefit
      ? (benefit
          .match(/\b(?:free|complimentary)\s+[^.!?]+?(?=\*?\s+with\b)/i)?.[0]
          ?.replace(/\*$/, "") ??
        benefit.match(/\b\d+%\s*off\b/i)?.[0] ??
        benefit.match(/\b(?:enjoy|get)\s+(.+?\bon us)\b/i)?.[1] ??
        benefit.match(/\b(?:starting from|from)\s*\$\d+(?:\.\d+)?/i)?.[0] ??
        benefit)
      : null;
    if (benefit) put("benefit", benefit);
    c.terms = terms;
    put("terms", terms.join("\n"));
    const publishedAt = $('meta[property="article:published_time"]').attr(
      "content",
    );
    if (publishedAt && /^\d{4}-\d{2}-\d{2}T/.test(publishedAt)) {
      c.publishedAt = publishedAt;
      put(
        "publishedAt",
        publishedAt,
        'meta[property="article:published_time"]',
      );
    }
    // Only explicit campaign text. Expand same-month shorthand without deriving year from metadata.
    const validityLines = terms.filter((line) =>
      /\b(?:promotion|offer|valid|available|from)\b/i.test(line),
    );
    const expanded = validityLines.map((line) =>
      line
        .replace(
          /\b(\d{1,2})\s*(?:to|[–—-])\s*(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/g,
          "$1 $3 $4 to $2 $3 $4",
        )
        .replace(
          /\bon (\d{1,2}) ([A-Za-z]+) (20\d{2}) only\b/gi,
          "on $1 $2 $3 to $1 $2 $3 only",
        ),
    );
    const dates = campaignDates(expanded);
    c.startDate = dates.startDate;
    c.endDate = dates.endDate;
    if (dates.quote) put("validity", validityLines.join("\n"));
    if (dates.issue) c.issues.push(dates.issue);
    const location = terms.filter((line) =>
      /\b(?:valid at|available (?:exclusively |across )?(?:at |all )|at .+Shack locations)\b/i.test(
        line,
      ),
    );
    if (location.length) {
      c.locationWording = location.join("\n");
      put("locations", c.locationWording);
      const exactAll =
        location.every((line) =>
          /\b(?:all Shake Shack Singapore outlets|all Shake Shack outlets in Singapore)\b/i.test(
            line,
          ),
        ) &&
        !/\b(?:except|excluding(?!\s+public holidays\b)|selected|participating)\b/i.test(
          c.locationWording,
        );
      c.locationScope = exactAll ? "all_outlets" : "source_unspecified";
      const named =
        c.locationWording.match(/\bat (.+?) (?:Shack )?locations only\b/i) ??
        c.locationWording.match(
          /\bvalid at (.+?) Shake Shack(?: Singapore)? outlet\b/i,
        );
      if (
        !exactAll &&
        named &&
        !/\b(?:except|excluding|selected|participating)\b/i.test(named[1])
      ) {
        c.locationScope = "named_outlets";
        c.locationNames = named[1]
          .split(/,\s*|\s+(?:and|or)\s+/)
          .map(whitespace)
          .filter(Boolean);
      }
      if (
        /\b(?:except|excluding(?!\s+public holidays\b)|selected|participating)\b/i.test(
          c.locationWording,
        )
      )
        c.issues.push("location_identity_unresolved");
    }
    const eligibility = [...lines, ...terms].filter((line) =>
      /\b(?:students?|student ID|members? only|eligible)\b/i.test(line),
    );
    if (eligibility.length) {
      c.eligibility = eligibility;
      put("eligibility", eligibility.join("\n"));
    }
    const redeemAt = lines.findIndex((line) =>
      /^how to redeem\s*:/i.test(line),
    );
    const redemption = [
      ...(redeemAt < 0
        ? []
        : lines.slice(
            redeemAt + 1,
            lines.findIndex(
              (line, index) => index > redeemAt && termsHeading.test(line),
            ),
          )),
      ...terms.filter((line) =>
        /\b(?:app|dine-in|take-away|takeaway|present|redeem|point of purchase)\b/i.test(
          line,
        ),
      ),
    ];
    if (redemption.length) {
      c.redemption = [...new Set(redemption)];
      put("redemption", c.redemption.join("\n"));
    }
    // Keep unsupported restrictions explicit; the shared gate also detects them.
    if (terms.some((line) => /\bweekdays only\b|\bon weekdays\b/i.test(line))) {
      c.weekdays = [1, 2, 3, 4, 5];
      put(
        "weekdays",
        terms.filter((line) => /weekdays/i.test(line)).join("\n"),
      );
    } else if (terms.some((line) => /\bevery Sunday\b/i.test(line))) {
      c.weekdays = [7];
      put(
        "weekdays",
        terms.filter((line) => /every Sunday/i.test(line)).join("\n"),
      );
    }
    if (lines.some((line) => /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(line)))
      c.issues.push("unresolved_hour_restriction");
    return [finalizeCandidate(c)];
  }
}
