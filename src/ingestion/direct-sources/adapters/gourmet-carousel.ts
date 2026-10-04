import { load } from "cheerio";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import { cite, finalizeCandidate, newCandidate } from "../candidate";
import { campaignDates } from "../dates";
import { canonicalUrl } from "../fetch";
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
  DirectPromotionCandidate,
  FetchedPage,
  ListingEntry,
} from "../types";
import {
  gourmetVenueName,
  gourmetVenueUrl,
  parseGourmetVenue,
} from "./gourmet-carousel-outlets";

export const gourmetOffersUrl = "https://www.royalplaza.com.sg/dine/offers";
const serviceBody = ".blocks-about-dining .better-rich-text";
const detailBody = ".dine-offer-single .better-rich-text";
const economic =
  /\b(?:free|complimentary)\s+(?:coffee|islandwide delivery)\b|\b\d+%\s*off\b/i;
const termsHeading = /^terms\s*(?:and|&)\s*conditions\s*:?$/i;
const campaignNativeId = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Service-page campaigns must be isolated from sibling campaigns and evergreen menus. */
function serviceCampaigns(page: FetchedPage) {
  const $ = load(page.body.toString());
  const blocks = $(`${serviceBody} .bb-callout`).toArray();
  const campaigns = blocks.flatMap((block) => {
    const node = $(block),
      title = whitespace(node.find("h4").text());
    const copy = node.clone();
    copy.find("h4").remove();
    const lines = textLines(load(copy.html() ?? ""), "body");
    const at = lines.findIndex((line) => termsHeading.test(line));
    const benefit = lines.find((line) => economic.test(line));
    const merchant = lines.find((line) =>
      /\bat Gourmet Carousel(?:\s*-\s*Barista Experience)?\b/.test(line),
    );
    if (node.find("h4").length !== 1 || !title || !benefit || !merchant)
      return [];
    const dataAt = lines.findIndex(
      (line, index) => index > at && /^Your Data$/.test(line),
    );
    const terms =
      at < 0 ? [] : lines.slice(at + 1, dataAt < 0 ? undefined : dataAt);
    return [
      {
        title,
        lines,
        benefit,
        merchant,
        terms,
        selector: `${serviceBody} .bb-callout`,
      },
    ];
  });
  return { $, blocks, campaigns };
}

export function classifyGourmetPage(
  page: FetchedPage,
): Omit<ArticleClassification, "url" | "evidenceId"> {
  const url = canonicalUrl(page.evidence.url),
    $ = load(page.body.toString());
  if (url === gourmetVenueUrl) {
    if (!parseGourmetVenue(page).authoritative)
      return {
        result: "unresolved",
        reason: "gourmet_venue_identity_unverified",
      };
    const { blocks, campaigns } = serviceCampaigns(page);
    if (
      new Set(campaigns.map((c) => campaignNativeId(c.title))).size !==
        campaigns.length ||
      blocks.length !== campaigns.length
    )
      return {
        result: "unresolved",
        reason: "service_campaign_association_unresolved",
      };
    if (campaigns.length)
      return {
        result: "promotion",
        reason: "isolated_gourmet_service_campaign",
      };
    const ordinary = $(serviceBody).clone();
    ordinary.find(".bb-details,style,script").remove();
    if (economic.test(ordinary.text()))
      return { result: "unresolved", reason: "unisolated_service_campaign" };
    return {
      result: "non_promotion",
      reason: "ordinary_gourmet_venue_information",
    };
  }
  if (!$(".dine-offer-single").length || !$(detailBody).length)
    return { result: "unresolved", reason: "detail_structure_changed" };
  const lines = textLines($, detailBody),
    copy = lines.join("\n");
  const terms = $(".dine-offer-single .terms-and-conditions li")
    .map((_i, el) => whitespace($(el).text()))
    .get();
  if (/\bGourmet Carousel\b/.test(copy)) {
    if (
      new URL(url).pathname === "/dine/offers/carousel-pastries" &&
      /This Mid-Autumn, Gourmet Carousel/.test(copy) &&
      terms.some((line) => /^Complimentary islandwide delivery/.test(line))
    )
      return {
        result: "promotion",
        reason: "gourmet_seasonal_collection_with_explicit_delivery_benefit",
      };
    if (economic.test([...lines, ...terms].join("\n")))
      return {
        result: "unresolved",
        reason: "gourmet_detail_campaign_association_unresolved",
      };
  }
  if (
    /\b(?:promotion|SPECIAL DEAL|limited-time)\b/i.test(copy) &&
    /\bCarousel\b/.test(copy) &&
    !/\bGourmet Carousel\b/.test(copy)
  )
    return {
      result: "non_promotion",
      reason: "other_venue_carousel_campaign_not_gourmet",
    };
  if (economic.test([...lines, ...terms].join("\n")))
    return {
      result: "unresolved",
      reason: "operator_campaign_venue_unresolved",
    };
  return {
    result: "non_promotion",
    reason: "menu_pricing_or_service_without_gourmet_campaign_proposition",
  };
}

export class GourmetCarouselAdapter implements DirectSourceAdapter {
  readonly sourceId = "gourmet_carousel_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const problems: { code: string; url: string; relation: "listing" }[] = [];
    const result = await enumerateListings(
      ctx,
      (page) => {
        const $ = load(page.body.toString());
        if (page.evidence.requestedUrl === gourmetVenueUrl) {
          if (!$(".blocks-about-dining").length)
            problems.push({
              code: "service_structure_changed",
              url: page.evidence.url,
              relation: "listing",
            });
          return [
            {
              canonicalUrl: gourmetVenueUrl,
              title: whitespace($(".blocks-hero h1").text()) || null,
              nativeId: null,
              listingUrl: gourmetVenueUrl,
              evidenceId: page.evidence.id,
              relation: "detail" as const,
              metadata: {
                description: null,
                merchant: null,
                selector: serviceBody,
              },
            },
          ];
        }
        const accept = (url: URL) =>
          ctx.source.allowedHosts.includes(url.hostname) &&
          /^\/dine\/offers\/[a-z0-9-]+$/.test(url.pathname) &&
          !url.search;
        const entries = cardsFromPage(
          page,
          ctx,
          {
            cards: ".blocks-offer-cards article",
            link: "a[href]",
            title: "h3",
          },
          accept,
        );
        const cards = $(".blocks-offer-cards h3");
        if (
          !$(".blocks-offer-cards").length ||
          !cards.length ||
          entries.length !== cards.length ||
          entries.some((e) => !e.title)
        )
          problems.push({
            code: "listing_card_boundary_unresolved",
            url: page.evidence.url,
            relation: "listing",
          });
        return entries;
      },
      () => false,
      false,
      ".blocks-offer-cards,.blocks-about-dining",
      '[class*="load-more"], [class*="load_more"], [data-infinite-scroll], [class*="infinite-scroll"], [data-ajax], .blocks-offer-cards button, .blocks-offer-cards select',
    );
    result.issues.push(
      ...problems,
      ...[
        "partial_enumeration",
        "service_page_campaign_outside_listing",
        "gourmet_service_boundary_unproven",
      ].map((code) => ({
        code,
        url: gourmetOffersUrl,
        relation: "listing" as const,
      })),
    );
    const articles = result.entries;
    result.entries = [];
    const classifications: ArticleClassification[] = [];
    for (const entry of articles) {
      const detail = await this.fetchDetail(entry, ctx);
      const classification = detail.page
        ? classifyGourmetPage(detail.page)
        : {
            result: "unresolved" as const,
            reason: detail.issues.map((i) => i.code).join(","),
          };
      classifications.push({
        url: entry.canonicalUrl,
        evidenceId: detail.page?.evidence.id ?? null,
        ...classification,
      });
      result.issues.push(...detail.issues);
      if (classification.result === "promotion") result.entries.push(entry);
      if (classification.result === "unresolved")
        result.issues.push({
          code: classification.reason,
          url: entry.canonicalUrl,
          relation: "detail",
        });
    }
    const count = (kind: ArticleClassification["result"]) =>
      classifications.filter((c) => c.result === kind).length;
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
      const cached = ctx.http.capturedPages.find(
        (p) => p.evidence.requestedUrl === entry.canonicalUrl,
      );
      return {
        page: cached ?? (await ctx.http.fetch(entry.canonicalUrl, "detail")),
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
    if (!page || classifyGourmetPage(page).result !== "promotion") return [];
    if (entry.canonicalUrl === gourmetVenueUrl) {
      return serviceCampaigns(page).campaigns.map((campaign) => {
        const c = newCandidate(
          {
            ...entry,
            nativeId: campaignNativeId(campaign.title),
          },
          ctx,
          [page],
        );
        c.merchant = "Gourmet Carousel";
        c.title = campaign.title;
        c.benefit = campaign.benefit;
        c.description = campaign.lines.join("\n");
        c.terms = campaign.terms.length ? campaign.terms : null;
        for (const field of [
          "merchant",
          "title",
          "benefit",
          "description",
          "terms",
        ] as const) {
          const value =
            field === "merchant"
              ? campaign.merchant
              : field === "terms"
                ? c.terms?.join("\n")
                : c[field];
          if (value) cite(c, field, page.evidence.id, campaign.selector, value);
        }
        this.schedule(c, campaign.terms, page, campaign.selector);
        const location = campaign.terms.filter((line) =>
          /\bat Gourmet Carousel - Barista Experience\b/.test(line),
        );
        if (
          location.length &&
          !/\b(?:selected|participating|restaurants|outlets|Palm|and Carousel|or Carousel)\b/i.test(
            location.join("\n"),
          )
        ) {
          c.locationScope = "named_outlets";
          c.locationNames = [gourmetVenueName];
          c.locationWording = location.join("\n");
          cite(
            c,
            "locations",
            page.evidence.id,
            campaign.selector,
            c.locationWording,
          );
        }
        this.restrictions(c, campaign.lines, page, campaign.selector);
        return finalizeCandidate(c);
      });
    }
    const $ = load(page.body.toString()),
      lines = textLines($, detailBody);
    const terms = $(".dine-offer-single .terms-and-conditions li")
      .map((_i, el) => whitespace($(el).text()))
      .get();
    const c = newCandidate(entry, ctx, [page]);
    c.merchant = "Gourmet Carousel";
    const detailTitle = whitespace(
      $(".dine-offer-single .tagline-header-title").first().text(),
    );
    c.title = detailTitle || entry.title;
    const deliveryBenefit = terms.find((line) =>
      /^Complimentary islandwide delivery/.test(line),
    );
    const boxes = deliveryBenefit?.match(
      /\borders of (\d+) boxes and above\b/,
    )?.[1];
    c.benefit = deliveryBenefit
      ? `Complimentary islandwide delivery${boxes ? ` (${boxes}+ boxes)` : ""}`
      : null;
    if (deliveryBenefit && !boxes)
      c.issues.push("delivery_eligibility_unparsed");
    c.description = lines.join("\n");
    c.terms = terms.length ? terms : null;
    cite(
      c,
      "merchant",
      page.evidence.id,
      detailBody,
      lines.find((line) => /Gourmet Carousel/.test(line))!,
    );
    if (c.title)
      cite(
        c,
        "title",
        detailTitle ? page.evidence.id : entry.evidenceId,
        detailTitle
          ? ".dine-offer-single .tagline-header-title"
          : entry.metadata.selector,
        c.title,
      );
    if (deliveryBenefit)
      cite(
        c,
        "benefit",
        page.evidence.id,
        ".terms-and-conditions li",
        deliveryBenefit,
      );
    cite(c, "description", page.evidence.id, detailBody, c.description);
    if (c.terms)
      cite(
        c,
        "terms",
        page.evidence.id,
        ".terms-and-conditions li",
        c.terms.join("\n"),
      );
    // Collection dates are not campaign validity. Self-collection at a hotel is not this Barista venue.
    c.issues.push(
      "campaign_validity_unspecified",
      "gourmet_pastry_participation_unresolved",
    );
    this.schedule(c, terms, page, ".terms-and-conditions li");
    this.restrictions(c, terms, page, ".terms-and-conditions li");
    return [finalizeCandidate(c)];
  }
  private schedule(
    c: DirectPromotionCandidate,
    terms: string[],
    page: FetchedPage,
    selector: string,
  ) {
    const validity = terms.filter((line) =>
      /^(?:valid\b|(?:this )?(?:offer|promotion|campaign) (?:is )?valid\b|promotion period\b|campaign period\b)/i.test(
        line,
      ),
    );
    const dates = campaignDates(
      validity.map((line) =>
        line.replace(
          /\bon (\d{1,2}) ([A-Za-z]+) (20\d{2}) only\b/gi,
          "from $1 $2 $3 to $1 $2 $3",
        ),
      ),
    );
    c.startDate = dates.startDate;
    c.endDate = dates.endDate;
    if (dates.quote)
      cite(c, "validity", page.evidence.id, selector, validity.join("\n"));
    if (dates.issue) c.issues.push(dates.issue);
    const ranges = validity.flatMap((line) => [
      ...line.matchAll(
        /\b(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\s*to\s*(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\b/gi,
      ),
    ]);
    const time = (h: string, m: string | undefined, meridiem: string) =>
      Number(h) >= 1 && Number(h) <= 12 && Number(m ?? 0) < 60
        ? `${String((Number(h) % 12) + (/pm/i.test(meridiem) ? 12 : 0)).padStart(2, "0")}:${m ?? "00"}`
        : null;
    if (ranges.length === 1) {
      const r = ranges[0],
        start = time(r[1], r[2], r[3]),
        end = time(r[4], r[5], r[6]);
      if (start && end && start < end) {
        c.hours = `${start}–${end}`;
        cite(c, "hours", page.evidence.id, selector, validity.join("\n"));
      }
    }
  }
  private restrictions(
    c: DirectPromotionCandidate,
    lines: string[],
    page: FetchedPage,
    selector: string,
  ) {
    const eligibility = lines.filter((line) =>
      /\b(?:per person|guests|walk-ins|eligible|orders of \d+)\b/i.test(line),
    );
    const redemption = lines.filter((line) =>
      /\b(?:register|registration|redeem|redemption|QR code|orders must|bulk orders)\b/i.test(
        line,
      ),
    );
    if (eligibility.length) {
      c.eligibility = eligibility;
      cite(
        c,
        "eligibility",
        page.evidence.id,
        selector,
        eligibility.join("\n"),
      );
    }
    if (redemption.length) {
      c.redemption = redemption;
      cite(c, "redemption", page.evidence.id, selector, redemption.join("\n"));
    }
  }
}
