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
  DetailResult,
  EnumerationResult,
  FetchedPage,
  ListingEntry,
} from "../types";

export const bariPromotions = "https://baribaristeak.com.sg/promotions/";
export const captainRoots = [
  "https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/",
  "https://kingdomfood.sg/captain-kim-korean-bbq-hotpot/",
  "https://kingdomfood.sg/captain-kim-delivery/",
] as const;
export const sushiroPromotions = "https://www.sushiro.com.sg/promo/";
export const mcCampaigns = [
  "https://www.mcdonalds.com.sg/McSaver",
  "https://www.mcdonalds.com.sg/bfmcsaver",
] as const;
const unknownControls =
  '[class*="load-more"],[class*="load_more"],[data-infinite-scroll],[data-ajax],button,select';

interface CampaignBlock {
  nativeId: string;
  title: string;
  selector: string;
  lines: string[];
  issues: string[];
}
function entry(page: FetchedPage, block: CampaignBlock): ListingEntry {
  return {
    canonicalUrl: page.evidence.url,
    listingUrl: page.evidence.url,
    nativeId: block.nativeId,
    title: block.title,
    evidenceId: page.evidence.id,
    relation: "detail",
    metadata: { selector: block.selector, merchant: null, description: null },
  };
}
function captainBlocks(page: FetchedPage): CampaignBlock[] {
  const $ = load(page.body.toString());
  if (
    !captainRoots.includes(
      page.evidence.url as (typeof captainRoots)[number],
    ) ||
    !/CAPTAIN KIM/i.test($("h2").first().text())
  )
    throw new Error("captain_merchant_structure_changed");
  if (page.evidence.url === captainRoots[2]) {
    const headings = $("h2").filter((_i, h) =>
      /Flash this page to enjoy 20% OFF All Regular Items/.test($(h).text()),
    );
    if (headings.length !== 1)
      throw new Error("captain_takeaway_proposition_changed");
    return [
      {
        nativeId: "takeaway-regular-items",
        title: whitespace(headings.text()),
        selector: "h2:contains('Flash this page')",
        lines: [whitespace(headings.text())],
        issues: [
          "campaign_validity_unspecified",
          "takeaway_participation_unresolved",
        ],
      },
    ];
  }
  let inside = false;
  const blocks: CampaignBlock[] = [],
    seen = new Set<string>();
  $("h2").each((_i, h) => {
    const title = whitespace($(h).text());
    if (title === "PROMOTIONS") {
      inside = true;
      return;
    }
    if (/^RESERVATION/.test(title)) inside = false;
    if (!inside || !/PROMO/.test(title) || title === "PROMOTIONS") return;
    if (!/^(STUDENT 2PLUS1|EARLY BIRD|4PLUS1) PROMO$/.test(title))
      throw new Error("captain_promotion_classification_unresolved");
    const section = $(h).closest("section.elementor-top-section"),
      id = section.attr("data-id");
    if (
      !id ||
      seen.has(id) ||
      section.find("h2").filter((_j, n) => /PROMO/.test($(n).text())).length !==
        1
    )
      throw new Error("captain_section_association_unresolved");
    seen.add(id);
    const selector = `section[data-id='${id}']`;
    blocks.push({
      nativeId: id,
      title,
      selector,
      lines: textLines($, selector),
      issues: [
        "venue_page_scope_requires_review",
        "image_text_equivalence_unproven",
      ],
    });
  });
  if (!blocks.length) throw new Error("captain_campaign_sections_missing");
  return blocks;
}

function textualCandidate(
  block: CampaignBlock,
  listing: ListingEntry,
  page: FetchedPage,
  ctx: DirectSourceContext,
) {
  const c = newCandidate(listing, ctx, [page]),
    text = block.lines.join("\n");
  c.merchant = ctx.source.publicationPolicy.merchant;
  c.title = block.title;
  c.description = text;
  cite(
    c,
    "merchant",
    page.evidence.id,
    "official merchant source ownership review",
    c.merchant,
  );
  cite(c, "title", page.evidence.id, block.selector, block.title);
  cite(c, "description", page.evidence.id, block.selector, text);
  c.benefit =
    text.match(
      /\b\d+(?:\.\d+)?%\s*(?:OFF|savings)\b|\b1\s*(?:for|[-–])\s*1\b|\b1 pax dines free with every 4 other full-paying pax\b/i,
    )?.[0] ?? null;
  if (c.benefit)
    cite(c, "benefit", page.evidence.id, block.selector, c.benefit);
  // Publication timestamps and date-bearing URLs are deliberately outside this input.
  const validity = block.lines.filter((l) =>
    /\b(?:valid|available from|promotion period|campaign period)\b/i.test(l),
  );
  const expanded = validity.map((l) =>
    l.replace(
      /\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/g,
      "$1 $3 $4 – $2 $3 $4",
    ),
  );
  const dates = campaignDates(expanded);
  c.startDate = dates.startDate;
  c.endDate = dates.endDate;
  if (dates.quote)
    cite(c, "validity", page.evidence.id, block.selector, validity.join("\n"));
  if (dates.issue) c.issues.push(dates.issue);
  const terms = block.lines.filter((l) =>
    /\b(?:valid|not applicable|not valid|reserves|must|only|minimum|excluding|promo|terms|excludes)\b/i.test(
      l,
    ),
  );
  if (terms.length) {
    c.terms = terms;
    cite(c, "terms", page.evidence.id, block.selector, terms.join("\n"));
  }
  // Keep full restrictions in description/terms. Do not collapse differently timed outlet groups.
  c.issues.push(...block.issues);
  return finalizeCandidate(c);
}
async function exactDetail(
  listing: ListingEntry,
  ctx: DirectSourceContext,
): Promise<DetailResult> {
  try {
    return {
      page:
        ctx.http.capturedPages.find(
          (p) => p.evidence.requestedUrl === listing.canonicalUrl,
        ) ?? (await ctx.http.fetch(listing.canonicalUrl, "detail")),
      related: [],
      issues: [],
    };
  } catch (error) {
    return {
      page: null,
      related: [],
      issues: [acquisitionIssue(error, listing.canonicalUrl, "detail")],
    };
  }
}

export class BariBariAdapter implements DirectSourceAdapter {
  readonly sourceId = "bari_bari_steak_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const problems: EnumerationResult["issues"] = [];
    const result = await enumerateListings(
      ctx,
      (page) => {
        const $ = load(page.body.toString());
        const entries = cardsFromPage(
          page,
          ctx,
          {
            cards: "article.df-post-item",
            link: ".df-post-title-wrap a[href]",
            title: "h4",
          },
          (u) =>
            u.origin === "https://baribaristeak.com.sg" &&
            /^\/20\d{2}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(u.pathname) &&
            !u.search,
        );
        if (
          !entries.length ||
          entries.length !== $("article.df-post-item").length ||
          entries.some((e) => !e.title)
        )
          problems.push({
            code: "bari_card_association_unresolved",
            url: page.evidence.url,
            relation: "listing",
          });
        return entries;
      },
      () => false,
      false,
      ".df-posts-wrap",
      unknownControls,
    );
    result.issues.push(...problems, {
      code: "bari_grid_continuation_unproven",
      url: bariPromotions,
      relation: "listing",
    });
    return result;
  }
  fetchDetail = exactDetail;
  async extract(
    listing: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = detail?.page;
    if (!page) return [];
    const detailDom = load(page.body.toString());
    if (
      detailDom("link[rel='canonical']").attr("href") !==
        listing.canonicalUrl ||
      detailDom("title").text() !==
        `${listing.title} | Bari Bari Steak Singapore`
    )
      throw new Error("bari_detail_association_unresolved");
    const original = ctx.http.capturedPages.find(
      (p) => p.evidence.id === listing.evidenceId,
    );
    if (!original) throw new Error("missing_listing_evidence");
    const $ = load(original.body.toString());
    const cards = $("article.df-post-item").filter(
      (_i, a) =>
        $(a).find(".df-post-title-wrap a").attr("href") ===
        listing.canonicalUrl,
    );
    const title = whitespace(cards.find("h4").text()),
      id = cards.attr("id");
    if (
      cards.length !== 1 ||
      !id ||
      !/^post-\d+$/.test(id) ||
      title !== listing.title ||
      cards.find(".df-post-content-wrap").length !== 1
    )
      throw new Error("bari_listing_fact_association_unresolved");
    const selector = `article#${id} .df-post-content-wrap`;
    const lines = textLines($, selector);
    if (!/\b(?:off|specials|save|1 for 1)\b/i.test(title))
      throw new Error("bari_classification_unresolved");
    const block = {
      nativeId: listing.canonicalUrl,
      title,
      selector,
      lines: [title, ...lines],
      issues: [
        "campaign_validity_unspecified",
        "outlet_time_groups_require_review",
        "detail_campaign_body_unassociated",
      ],
    };
    // Detail templates expose related posts; only the exact listing card supplies facts.
    const candidate = textualCandidate(block, listing, original, ctx);
    candidate.evidence.push(page.evidence);
    return [finalizeCandidate(candidate)];
  }
}
export class CaptainKimAdapter implements DirectSourceAdapter {
  readonly sourceId = "captain_kim_sg" as const;
  async enumerate(ctx: DirectSourceContext): Promise<EnumerationResult> {
    const result: EnumerationResult = {
      entries: [],
      evidence: [],
      complete: false,
      issues: [],
      pagination: { requested: [], discovered: [], unresolved: [] },
      observedAt: ctx.observedAt,
    };
    for (const url of ctx.source.listingUrls) {
      result.pagination.requested.push(url);
      try {
        const page = await ctx.http.fetch(url, "listing");
        result.evidence.push(page.evidence);
        const $ = load(page.body.toString());
        if (
          $(unknownControls).filter(
            (_i, n) =>
              !$(n).closest("form").length &&
              /load more|next|more promotions/i.test($(n).text()),
          ).length ||
          $("a[rel='next'],.pagination").length
        )
          result.issues.push({
            code: "pagination_unresolved",
            url,
            relation: "listing",
          });
        result.entries.push(...captainBlocks(page).map((b) => entry(page, b)));
      } catch (error) {
        result.issues.push(acquisitionIssue(error, url, "listing"));
      }
    }
    result.issues.push(
      {
        code: "captain_campaigns_outside_central_index",
        url: "https://kingdomfood.sg/promotions/",
        relation: "listing",
      },
      {
        code: "image_text_equivalence_unproven",
        url: captainRoots[0],
        relation: "listing",
      },
    );
    return result;
  }
  fetchDetail = exactDetail;
  async extract(
    listing: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = detail?.page;
    if (!page) return [];
    const block = captainBlocks(page).find(
      (b) => b.nativeId === listing.nativeId,
    );
    if (!block || block.title !== listing.title)
      throw new Error("captain_campaign_identity_changed");
    return [textualCandidate(block, listing, page, ctx)];
  }
}
export class SushiroAdapter implements DirectSourceAdapter {
  readonly sourceId = "sushiro_sg" as const;
  async enumerate(ctx: DirectSourceContext) {
    const problems: EnumerationResult["issues"] = [];
    const result = await enumerateListings(
      ctx,
      (page) => {
        const $ = load(page.body.toString());
        const entries = cardsFromPage(
          page,
          ctx,
          { cards: ".e-loop-item", link: "h2 a[href]", title: "h2" },
          (u) =>
            u.origin === "https://www.sushiro.com.sg" &&
            /^\/20\d{2}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(u.pathname) &&
            !u.search,
        );
        if (
          !entries.length ||
          entries.length !== $(".e-loop-item").length ||
          entries.some((e) => !e.title)
        )
          problems.push({
            code: "sushiro_card_association_unresolved",
            url: page.evidence.url,
            relation: "listing",
          });
        return entries;
      },
      () => false,
      false,
      ".elementor-loop-container",
      '[class*="load-more"],[class*="load_more"],[data-infinite-scroll],[data-ajax],.elementor-loop-container button,.elementor-loop-container select',
    );
    result.issues.push(...problems, {
      code: "sushiro_directory_boundary_unproven",
      url: sushiroPromotions,
      relation: "listing",
    });
    return result;
  }
  fetchDetail = exactDetail;
  async extract(
    listing: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = detail?.page;
    if (!page) return [];
    const $ = load(page.body.toString());
    const title = whitespace($("h1").first().text());
    if (
      !title ||
      title !== listing.title ||
      $("link[rel='canonical']").attr("href") !== listing.canonicalUrl
    )
      throw new Error("sushiro_detail_association_unresolved");
    const root = $(".elementor-widget-theme-post-content");
    if (root.length !== 1) throw new Error("sushiro_campaign_content_changed");
    const block = {
      nativeId: listing.canonicalUrl,
      title,
      selector: ".elementor-widget-theme-post-content",
      lines: textLines($, ".elementor-widget-theme-post-content"),
      issues: [
        "validity_year_unstated",
        "outlet_participation_unstated",
        "image_only_facts_unknown",
      ],
    };
    return [textualCandidate(block, listing, page, ctx)];
  }
}
export class McDonaldsAdapter implements DirectSourceAdapter {
  readonly sourceId = "mcdonalds_sg" as const;
  async enumerate(ctx: DirectSourceContext): Promise<EnumerationResult> {
    const result: EnumerationResult = {
      entries: [],
      evidence: [],
      complete: false,
      issues: [],
      pagination: { requested: [], discovered: [], unresolved: [] },
      observedAt: ctx.observedAt,
    };
    for (const url of ctx.source.listingUrls) {
      result.pagination.requested.push(url);
      try {
        const page = await ctx.http.fetch(url, "listing"),
          $ = load(page.body.toString());
        result.evidence.push(page.evidence);
        const title = whitespace($("main h1").text());
        if (!title || !$(".promotion-block__list-item").length)
          throw new Error("mcd_campaign_structure_changed");
        if (
          $(unknownControls).filter((_i, n) =>
            /load more|next|more promotions/i.test($(n).text()),
          ).length ||
          $("a[rel='next'],.pagination").length
        )
          result.issues.push({
            code: "pagination_unresolved",
            url,
            relation: "listing",
          });
        result.entries.push(
          entry(page, {
            nativeId: new URL(url).pathname,
            title,
            selector: "main",
            lines: [],
            issues: [],
          }),
        );
      } catch (error) {
        result.issues.push(acquisitionIssue(error, url, "listing"));
      }
    }
    result.issues.push(
      {
        code: "mcd_news_load_more_unresolved",
        url: "https://www.mcdonalds.com.sg/news-and-updates",
        relation: "listing",
      },
      {
        code: "mcd_campaigns_outside_news_directory",
        url: "https://www.mcdonalds.com.sg/",
        relation: "listing",
      },
    );
    return result;
  }
  fetchDetail = exactDetail;
  async extract(
    listing: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = detail?.page;
    if (
      !page ||
      !mcCampaigns.includes(page.evidence.url as (typeof mcCampaigns)[number])
    )
      return [];
    const $ = load(page.body.toString()),
      title = whitespace($("main h1").text());
    if (!title || title !== listing.title)
      throw new Error("mcd_campaign_identity_changed");
    const block = {
      nativeId: listing.nativeId!,
      title,
      selector: "main",
      lines: textLines($, "main"),
      issues: [
        "campaign_validity_unspecified",
        "official_outlet_directory_app_only",
        "multiple_propositions_require_review",
      ],
    };
    const c = textualCandidate(block, listing, page, ctx);
    // An embedded exercise contest's dates never become meal promotion validity.
    c.startDate = null;
    c.endDate = null;
    delete c.facts.validity;
    c.issues.push("start_date_unknown", "end_date_unknown");
    return [finalizeCandidate(c)];
  }
}
