/** Target-blind, file-only acquisition for the source discovery study. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { DateTime } from "luxon";

export type Source = {
  research_role?: "core_replacement" | "supplemental";
  source_id: string;
  source_type: string;
  origin_url: string;
  enumerable: boolean;
  ordering: string;
  pagination: string;
  freshness_visibility: string;
  reasonable_per_run_cap: { max_pages: number; max_entries: number };
};
export type SourceRegistry = { sources: Source[] };
export type FetchPage = (
  url: string,
  signal?: AbortSignal,
) => Promise<{ status: number; contentType: string; body: string }>;
export type ListingCard = {
  title: string;
  url: string;
  excerpt: string;
  listing_page: string;
  observed_at: string;
  published_at?: string | null;
  content_hash: string;
};
export type RecoveryOverlapIdentity = {
  url: string;
  content_hash: string;
  published_at: string | null;
};
export type RecoveryTraversalTarget = {
  checkpoint_at: string;
  oldest_published_at: string | null;
  overlap_identities: RecoveryOverlapIdentity[];
};
export type RecoveryTraversalDiagnostics = {
  strategy: "dated_archive_checkpoint_overlap";
  checkpoint_at: string;
  checkpoint_boundary: string;
  traversal_started_at: string;
  traversal_ended_at: string;
  oldest_observed_published_at: string | null;
  crossed_checkpoint: boolean;
  overlap_verified: boolean;
  terminal_page_reached: boolean;
  cap_truncated: boolean;
  ordering_verified: boolean;
  pagination_complete: boolean;
  repeated_page_body: boolean;
  url_loop_detected: boolean;
  reasons: string[];
};
export type CapturedPage = {
  url: string;
  observed_at: string;
  status: number;
  raw_file: string;
  raw_sha256: string;
  extracted_cards: number;
  next_page_url: string | null;
};
export type DetailInspection = {
  card_url: string;
  observed_at: string;
  status: "captured" | "failed";
  raw_file: string | null;
  raw_sha256: string | null;
  error: string | null;
};
export type SourceSnapshot = {
  source_id: string;
  observed_at: string;
  status: "captured" | "partial" | "blocked" | "probe_only";
  enumerable: boolean;
  pages: CapturedPage[];
  listing_evidence: ListingCard[];
  detail_inspections: DetailInspection[];
  entries_seen_count: number;
  cards_evaluated: number;
  cards_skipped_stale: number;
  cards_outside_horizon: number;
  cards_temporal_ambiguous: number;
  candidate_proposals: number;
  detail_attempts: number;
  detail_failures: number;
  cap_truncated: boolean;
  pagination_remaining: boolean;
  listing_failure: boolean;
  extraction_incomplete: boolean;
  incomplete_reasons: string[];
  errors: string[];
  ordering_observed: string;
  pagination_observed: string;
  freshness_observed: string;
  recovery_traversal?: RecoveryTraversalDiagnostics;
  archive_enumeration?: {
    ordering_verified: boolean;
    terminal_page_reached: boolean;
    repeated_page_body: boolean;
    url_loop_detected: boolean;
  };
  snapshot_hash: string;
};
export type ObservationProvenance = {
  published_at?: string | null;
  observation_mode?: "live" | "catch_up";
  recovered_at?: string | null;
  scheduled_slot?: string;
  acquisition_pass?: string;
  recovery_reason?: string | null;
};
export type CandidateOccurrence = ObservationProvenance & {
  source_id: string;
  url: string;
  candidate_url?: string;
  seen_at: string;
  source_snapshot_hash: string;
};
export type CandidateProposal = ObservationProvenance & {
  source_evidence?: Omit<CandidateProposal, "source_evidence">[];
  candidate_id: string;
  first_seen_at: string;
  seen_at: string;
  source_id: string;
  origin_url: string;
  candidate_url: string;
  merchant: string;
  promotion_name: string;
  offer: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  eligibility: string | null;
  redemption_method: string | null;
  inspectable: boolean;
  evidence_summary: string;
  extraction_confidence: "low" | "medium";
  temporal_basis: "current" | "upcoming" | "new_or_updated" | "active_listing";
  occurrences: CandidateOccurrence[];
  source_snapshot_hash: string;
};
export type DiscoveryResult = {
  schema_version: 1;
  observed_at: string;
  source_snapshots: SourceSnapshot[];
  candidates: CandidateProposal[];
  totals: {
    sources: number;
    cards_seen: number;
    cards_evaluated: number;
    cards_skipped_stale: number;
    cards_outside_horizon: number;
    cards_temporal_ambiguous: number;
    candidate_proposals: number;
    distinct_candidates: number;
    detail_attempts: number;
    detail_failures: number;
    source_failures: number;
    truncated_sources: number;
    incomplete_sources: number;
  };
};
type SourceCheckpoint = {
  schema_version: 1;
  source_id: string;
  completed: boolean;
  snapshot: SourceSnapshot;
  candidates: CandidateProposal[];
};

const MAX_BYTES = 2_000_000;
const REQUEST_SPACING_MS = 350;
const MAX_RETRY_DELAY_MS = 15_000;
const MAX_ATTEMPTS = 3;
let lastPublicRequestAt = 0;
const sha = (body: string | Buffer) =>
  createHash("sha256").update(body).digest("hex");
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();
const normalized = (value: string | null) =>
  cleanText(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9%$]+/g, " ")
    .trim();

function safeSource(source: Source) {
  if (!/^[a-z0-9_]+$/.test(source.source_id))
    throw new Error(`Unsafe source ID: ${source.source_id}`);
  const url = new URL(source.origin_url);
  if (url.protocol !== "https:")
    throw new Error(`Source origin must be HTTPS: ${source.source_id}`);
  for (const cap of [
    source.reasonable_per_run_cap.max_pages,
    source.reasonable_per_run_cap.max_entries,
  ]) {
    if (!Number.isSafeInteger(cap) || cap < 1 || cap > 500)
      throw new Error(`Invalid source cap: ${source.source_id}`);
  }
}
function sameOrigin(value: string, origin: string): boolean {
  try {
    const url = new URL(value, origin),
      expected = new URL(origin);
    return url.protocol === "https:" && url.origin === expected.origin;
  } catch {
    return false;
  }
}
function absoluteUrl(value: string, origin: string): string | null {
  if (!sameOrigin(value, origin)) return null;
  const url = new URL(value, origin);
  url.hash = "";
  return url.href;
}
function cardSelector(sourceId: string): string | null {
  return (
    (
      {
        singpromos_ongoing: "article.mh-loop-item",
        confirmgood_deals: "article.item.hentry",
        eatbook_deals: "article.grid-item",
        mustsharenews_deals: "article",
        everydayonsales_food: "article",
        great_world_promotions: "div.promotionboxwrap",
        divedeals_food: "div.deal-slide",
        hsbc_dining: "div.dining-product-cards",
        syioknya_central_food: "h5",
        jewel_student_privileges: "div.item table tr",
        jewel_ticket_privileges: "div.item table tr",
        singapore_river_festival: "main div.sqs-stack-container",
        grab_promo_codes: "table tbody tr",
        ordinary_patrons_news:
          ".nv-content-wrap.entry-content > h1.wp-block-heading, .nv-content-wrap.entry-content > h2.wp-block-heading",
      } as Record<string, string>
    )[sourceId] ?? null
  );
}
function onPageTextUrl(pageUrl: string, ...visibleText: string[]): string {
  const url = new URL(pageUrl);
  url.hash = `:~:${visibleText.map((text) => `text=${encodeURIComponent(text)}`).join("&")}`;
  return url.href;
}
function onPageIdUrl(pageUrl: string, id: string): string {
  const url = new URL(pageUrl);
  url.hash = id;
  return url.href;
}
function onPageCard(
  title: string,
  url: string,
  fullText: string,
  pageUrl: string,
  observedAt: string,
): ListingCard {
  const content = cleanText(fullText);
  return {
    title,
    url,
    excerpt: content.slice(0, 700),
    listing_page: pageUrl,
    observed_at: observedAt,
    content_hash: sha(content),
  };
}
function extractOnPageCards(
  $: ReturnType<typeof load>,
  sourceId: string,
  pageUrl: string,
  observedAt: string,
): ListingCard[] | null {
  if (
    sourceId === "jewel_student_privileges" ||
    sourceId === "jewel_ticket_privileges"
  ) {
    const ticket = sourceId === "jewel_ticket_privileges";
    const cards: ListingCard[] = [];
    $("div.item table").each((_, table) => {
      const node = $(table);
      const shared = cleanText(
        node
          .prevAll("p")
          .toArray()
          .reverse()
          .map((item) => $(item).text())
          .join(" "),
      );
      const sharedBenefit = benefitPattern.exec(shared)?.[0];
      if (ticket && !sharedBenefit) return;
      node.find("tr").each((_, row) => {
        const cells = $(row)
          .children("td")
          .toArray()
          .map((cell) => cleanText($(cell).text()));
        if (cells.length !== (ticket ? 2 : 3) || !cells.every(Boolean)) return;
        const [merchant, unit] = cells;
        if (!/^#[A-Z0-9]/i.test(unit)) return;
        const benefit = ticket ? sharedBenefit! : cells[2];
        const title = `${merchant} ${ticket ? benefit : (benefitPattern.exec(benefit)?.[0] ?? benefit)}`;
        const fullText = `${merchant} ${unit} ${benefit} ${shared} at Jewel Changi Airport`;
        cards.push(
          onPageCard(
            title,
            onPageTextUrl(pageUrl, merchant, unit, benefit),
            fullText,
            pageUrl,
            observedAt,
          ),
        );
      });
    });
    return cards;
  }
  if (sourceId === "singapore_river_festival") {
    const cards: ListingCard[] = [];
    const period = cleanText(
      $("main h3")
        .toArray()
        .map((heading) => $(heading).text())
        .find((heading) =>
          /exclusive deals along the singapore river/i.test(heading),
        ) ?? "",
    );
    $("main div.sqs-stack-container").each((_, stack) => {
      const cells = $(stack)
        .find(".sqs-html-content")
        .toArray()
        .map((cell) => cleanText($(cell).text()))
        .filter(Boolean);
      const id = $(stack).find(".stack-child-container[id]").first().attr("id");
      if (
        !id ||
        !/^[a-z][a-z0-9_-]+$/i.test(id) ||
        cells.length < 3 ||
        !cells[0] ||
        !cells[1] ||
        !cells[2]
      )
        return;
      const [merchant, precinct, benefit] = cells;
      cards.push(
        onPageCard(
          `${merchant} ${benefit}`,
          onPageIdUrl(pageUrl, id),
          `${merchant} ${precinct} ${benefit} ${cells.slice(3).join(" ")} ${period}`,
          pageUrl,
          observedAt,
        ),
      );
    });
    return cards;
  }
  if (sourceId === "grab_promo_codes") {
    const cards: ListingCard[] = [];
    $("table").each((_, table) => {
      const node = $(table);
      if (!/\bDine Out Promos\b/i.test(cleanText(node.find("thead").text())))
        return;
      node.find("tbody tr").each((_, row) => {
        const cells = $(row)
          .children("th,td")
          .toArray()
          .map((cell) => cleanText($(cell).text()));
        if (cells.length !== 4 || !cells[1] || !cells[2]) return;
        const [type, promotion, code, validity] = cells;
        cards.push(
          onPageCard(
            `Grab Dine Out ${promotion}`,
            onPageTextUrl(pageUrl, code),
            `${type} ${promotion} Promo code ${code} ${validity}`,
            pageUrl,
            observedAt,
          ),
        );
      });
    });
    return cards;
  }
  if (sourceId === "ordinary_patrons_news") {
    const cards: ListingCard[] = [];
    $(cardSelector(sourceId)!).each((_, heading) => {
      const node = $(heading);
      const title = cleanText(node.text());
      if (!title) return;
      const section: string[] = [];
      let sibling = node.next();
      while (
        sibling.length &&
        !sibling.is("h1.wp-block-heading,h2.wp-block-heading")
      ) {
        if (sibling.is("p,ul,ol,h3,h4,blockquote"))
          section.push(cleanText(sibling.text()));
        sibling = sibling.next();
      }
      cards.push(
        onPageCard(
          title,
          onPageTextUrl(pageUrl, title),
          `${title} ${section.join(" ")}`,
          pageUrl,
          observedAt,
        ),
      );
    });
    return cards;
  }
  return null;
}
function extractCards(
  body: string,
  source: Source,
  pageUrl: string,
  observedAt: string,
): ListingCard[] {
  const $ = load(body);
  const onPageCards = extractOnPageCards(
    $,
    source.source_id,
    pageUrl,
    observedAt,
  );
  if (onPageCards) return onPageCards;
  const selector = cardSelector(source.source_id);
  if (!selector) return [];
  const cards: ListingCard[] = [];
  $(selector).each((_, element) => {
    const node = $(element),
      fullText = cleanText(node.text()),
      excerpt = fullText.slice(0, 700);
    const links = node
      .find("a[href]")
      .toArray()
      .map((link) => {
        const url = absoluteUrl($(link).attr("href") ?? "", pageUrl);
        return { url, title: cleanText($(link).text()) };
      })
      .filter((link): link is { url: string; title: string } => !!link.url);
    if (!excerpt || !links.length) return;
    const preferred = links.sort(
      (a, b) =>
        b.title.length - a.title.length ||
        Number(/\/(?:promotion|deals?)\//.test(b.url)) -
          Number(/\/(?:promotion|deals?)\//.test(a.url)),
    )[0];
    let publishedAt: string | null = null;
    if (
      source.source_id === "confirmgood_deals" ||
      source.source_id === "everydayonsales_food"
    ) {
      const raw = node
        .find("time.entry-date.published[datetime]")
        .attr("datetime");
      if (raw) {
        const parsed = DateTime.fromISO(raw, { zone: "Asia/Singapore" });
        if (parsed.isValid) publishedAt = parsed.toUTC().toISO();
      }
    } else if (source.source_id === "eatbook_deals") {
      const raw = cleanText(node.find("span.date").first().text()).replace(
        /(\d+)(?:st|nd|rd|th)\b/i,
        "$1",
      );
      if (raw) {
        const parsed = DateTime.fromFormat(raw, "d LLLL yyyy", {
          zone: "Asia/Singapore",
          locale: "en",
        });
        if (parsed.isValid) publishedAt = parsed.startOf("day").toUTC().toISO();
      }
    }
    cards.push({
      title: preferred.title || excerpt.slice(0, 140),
      url: preferred.url,
      excerpt,
      listing_page: pageUrl,
      observed_at: observedAt,
      published_at: publishedAt,
      content_hash: sha(fullText),
    });
  });
  return cards;
}
function nextPage(
  body: string,
  source: Source,
  current: string,
  page: number,
  visited: Set<string>,
): { url: string | null; unresolved: boolean; looped: boolean } {
  const $ = load(body);
  const hrefs = new Set(
    $("a[href]")
      .toArray()
      .map((node) => absoluteUrl($(node).attr("href") ?? "", current))
      .filter((url): url is string => !!url),
  );
  const patterns: Record<string, (n: number) => string> = {
    singpromos_ongoing: (n) =>
      `https://singpromos.com/bydate/ontoday/page/${n}/`,
    eatbook_deals: (n) => `https://eatbook.sg/category/news/deals/page/${n}/`,
    mustsharenews_deals: (n) =>
      `https://mustsharenews.com/category/deals/page/${n}/`,
    everydayonsales_food: (n) =>
      `https://sg.everydayonsales.com/sales-category/food-restaurant-pub/page/${n}/`,
    great_world_promotions: (n) =>
      `https://shop.greatworld.com.sg/happenings/promotions/page/${n}/`,
    syioknya_central_food: (n) =>
      `https://sg.syioknya.com/location/promotion/japanese-food/central-region/page/${n}`,
  };
  const known = patterns[source.source_id]?.(page + 1);
  if (known && hrefs.has(known) && !visited.has(known))
    return { url: known, unresolved: false, looped: false };
  let unresolved = false;
  let looped = false;
  for (const node of $("a,button").toArray()) {
    const link = $(node),
      label = cleanText(link.text()).toLowerCase();
    const pagination =
      /^(?:next|older posts|load more|more posts|see more|›|»|→)$/.test(
        label,
      ) || link.attr("rel") === "next";
    if (!pagination) continue;
    const href = link.attr("href");
    const url = href ? absoluteUrl(href, current) : null;
    if (url && !visited.has(url))
      return { url, unresolved: false, looped: false };
    if (url && visited.has(url)) looped = true;
    if (!url && (!href || href === "#" || href.startsWith("javascript:")))
      unresolved = true;
  }
  return { url: null, unresolved, looped };
}
function eligibleLooking(card: ListingCard, source: Source): boolean {
  const value = `${card.title} ${card.excerpt}`.toLowerCase();
  if (
    /\b(?:flight|hotel|insurance|mortgage|telecom|online[- ]only|concert tickets?)\b/.test(
      value,
    )
  )
    return false;
  if (
    /\b(?:deal|offer|promo|discount|voucher|sale|free|save|special|privilege)\b|\d+\s?%|\b\d+\s?[- ]for[- ]\s?\d+\b|\b(?:s\$|\$)\s?\d+/i.test(
      value,
    )
  )
    return true;
  return /mall_|dining_directory|programme_directory|promotion_directory/.test(
    source.source_type,
  );
}
const benefitPattern =
  /\b\d{1,3}\s?%\s?(?:off|discount)\b|\b\d+\s?[- ]for[- ]\s?\d+\b|\b\d+\s+(?:for|@)\s+(?:s\$|\$)\s?\d+(?:\.\d{1,2})?\b|\bbuy\s+\d+\s+get\s+\d+\b|\b(?:s\$|\$)\s?\d+(?:\.\d{1,2})?\s+off\b|\bfree\s+(?:[\w-]+\s+){0,3}(?:drink|dessert|meal|item|burger|pizza)\b|\b(?:special|promo|promotion|deal)\s+(?:price\s+)?(?:at|from|for)?\s?(?:s\$|\$)\s?\d+(?:\.\d{1,2})?\b/i;
const monthNames =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const monthNumber: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
function calendarDate(day: string, month: string, year: string): string | null {
  const value = DateTime.fromObject(
    {
      year: Number(year),
      month: monthNumber[month.slice(0, 3).toLowerCase()],
      day: Number(day),
    },
    { zone: "Asia/Singapore" },
  );
  return value.isValid ? value.toISODate() : null;
}
function validIsoDate(value: string): string | null {
  const date = DateTime.fromISO(value, { zone: "Asia/Singapore" });
  return date.isValid && date.toISODate() === value ? value : null;
}
function dateWindow(text: string): {
  start: string | null;
  end: string | null;
} {
  const isoRange = text.match(
    /\b(\d{4}-\d{2}-\d{2})\s*(?:to|through|until|[-–—])\s*(\d{4}-\d{2}-\d{2})\b/i,
  );
  if (isoRange)
    return { start: validIsoDate(isoRange[1]), end: validIsoDate(isoRange[2]) };
  const naturalRange = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNames})\\s*(\\d{4})?\\s*(?:to|through|until|[-–—])\\s*(\\d{1,2})\\s+(${monthNames})\\s*(\\d{4})?\\b`,
    "i",
  ).exec(text);
  if (naturalRange) {
    const endYear = naturalRange[6] ?? naturalRange[3];
    if (!endYear) return { start: null, end: null };
    const startMonth = monthNumber[naturalRange[2].slice(0, 3).toLowerCase()];
    const endMonth = monthNumber[naturalRange[5].slice(0, 3).toLowerCase()];
    const startYear =
      naturalRange[3] ??
      String(Number(endYear) - Number(startMonth > endMonth));
    return {
      start: calendarDate(naturalRange[1], naturalRange[2], startYear),
      end: calendarDate(naturalRange[4], naturalRange[5], endYear),
    };
  }
  const sameMonth = new RegExp(
    `\\b(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`,
    "i",
  ).exec(text);
  if (sameMonth)
    return {
      start: calendarDate(sameMonth[1], sameMonth[3], sameMonth[4]),
      end: calendarDate(sameMonth[2], sameMonth[3], sameMonth[4]),
    };
  const end = new RegExp(
    `\\b(?:until|till|ends? on|valid through)\\s+(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`,
    "i",
  ).exec(text);
  const start = new RegExp(
    `\\b(?:from|starts? on|starting)\\s+(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`,
    "i",
  ).exec(text);
  if (start || end)
    return {
      start: start ? calendarDate(start[1], start[2], start[3]) : null,
      end: end ? calendarDate(end[1], end[2], end[3]) : null,
    };
  const isoEnd = text.match(
    /\b(?:until|till|ends? on|valid through)\s+(\d{4}-\d{2}-\d{2})\b/i,
  );
  const isoStart = text.match(
    /\b(?:from|starts? on|starting)\s+(\d{4}-\d{2}-\d{2})\b/i,
  );
  return {
    start: isoStart ? validIsoDate(isoStart[1]) : null,
    end: isoEnd ? validIsoDate(isoEnd[1]) : null,
  };
}
function physicalScope(text: string): string | null {
  const selected = text.match(
    /\b(?:at|in)\s+((?:(?:all|selected|participating)\s+)?(?:Singapore|SG)\s+(?:stores?|outlets?|restaurants?))\b/i,
  );
  if (selected) return cleanText(selected[1]);
  const mall = text.match(
    /\b(?:at|in)\s+(Great World|Jewel Changi Airport|[A-Z][\w'& -]{2,45}\s+(?:Mall|Centre|Center|Point))\b/,
  );
  if (mall) return cleanText(mall[1]);
  const outlet = text.match(
    /\b(?:at|in)\s+([A-Z][\w'& -]{2,45}\s+(?:outlet|store|restaurant))\b/,
  );
  return outlet ? cleanText(outlet[1]) : null;
}
type ProposalDecision = {
  candidate: CandidateProposal | null;
  reason:
    | "not_promotion"
    | "merchant_ambiguous"
    | "temporal_ambiguous"
    | "stale"
    | "outside_horizon"
    | "scope_ambiguous"
    | null;
};
function propose(
  card: ListingCard,
  source: Source,
  detail: DetailInspection,
  detailText: string,
  singaporeToday: string,
  newOrUpdated: boolean,
): ProposalDecision {
  const listing = `${card.title} ${card.excerpt}`;
  const phrase =
    benefitPattern.exec(listing) ??
    benefitPattern.exec(detailText.slice(0, 2000));
  if (!phrase) return { candidate: null, reason: "not_promotion" };
  const benefitInTitle = card.title
    .toLowerCase()
    .indexOf(phrase[0].toLowerCase());
  const before =
    benefitInTitle >= 0 ? card.title.slice(0, benefitInTitle) : card.title;
  const merchant = cleanText(
    before
      .replace(
        /\b(?:offers?|offering|has|with|launches?|promotion|deal)\b.*$/i,
        "",
      )
      .replace(/[-–:]+$/, ""),
  );
  if (
    merchant.length < 2 ||
    merchant.length > 90 ||
    /^(?:get|save|enjoy|up to|this|new|best|singapore)$/i.test(merchant)
  )
    return { candidate: null, reason: "merchant_ambiguous" };
  const offer = cleanText(phrase[0]);
  const evidenceText = `${card.title} ${card.excerpt} ${detailText}`;
  const listingWindow = dateWindow(listing),
    detailWindow = dateWindow(detailText);
  if (
    (listingWindow.start &&
      detailWindow.start &&
      listingWindow.start !== detailWindow.start) ||
    (listingWindow.end &&
      detailWindow.end &&
      listingWindow.end !== detailWindow.end)
  )
    return { candidate: null, reason: "temporal_ambiguous" };
  const start = detailWindow.start ?? listingWindow.start;
  const end = detailWindow.end ?? listingWindow.end;
  const listingScope = physicalScope(listing),
    detailScope = physicalScope(detailText);
  const location =
    listingScope &&
    detailScope &&
    normalized(listingScope) !== normalized(detailScope)
      ? null
      : (detailScope ?? listingScope);
  const activeListing =
    source.source_type === "publisher_active_index" &&
    /\b(?:on today|active today|currently active)\b/i.test(evidenceText);
  let temporalBasis: CandidateProposal["temporal_basis"] | null = null;
  if (start && start > singaporeToday) {
    const daysAhead = DateTime.fromISO(start).diff(
      DateTime.fromISO(singaporeToday),
      "days",
    ).days;
    if (daysAhead <= 11) temporalBasis = "upcoming";
  } else if (
    (!start || start <= singaporeToday) &&
    end &&
    end >= singaporeToday
  )
    temporalBasis = "current";
  else if (!start && !end && activeListing) temporalBasis = "active_listing";
  if (!temporalBasis && newOrUpdated) temporalBasis = "new_or_updated";
  if (!temporalBasis)
    return {
      candidate: null,
      reason:
        end && end < singaporeToday
          ? "stale"
          : start && start > singaporeToday
            ? "outside_horizon"
            : "temporal_ambiguous",
    };
  if (end && start && end < start)
    return { candidate: null, reason: "temporal_ambiguous" };
  const idBasis = [
    normalized(merchant),
    normalized(offer),
    normalized(card.title),
    normalized(location),
    start ?? "",
    end ?? "",
  ].join("|");
  const candidateId = `offer-${sha(idBasis).slice(0, 20)}`;
  const evidence = cleanText((detailText || card.excerpt).slice(0, 700));
  const candidate: CandidateProposal = {
    candidate_id: candidateId,
    first_seen_at: card.observed_at,
    seen_at: card.observed_at,
    source_id: source.source_id,
    origin_url: source.origin_url,
    candidate_url: card.url,
    merchant,
    promotion_name: card.title,
    offer,
    start_date: start,
    end_date: end,
    location,
    eligibility: null,
    redemption_method: null,
    inspectable: detail.status === "captured",
    evidence_summary: evidence,
    extraction_confidence: detail.status === "captured" ? "medium" : "low",
    temporal_basis: temporalBasis,
    occurrences: [],
    source_snapshot_hash: "",
  };
  return { candidate, reason: !location ? "scope_ambiguous" : null };
}
async function pause(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}
function retryDelay(header: string | null, attempt: number): number {
  if (header) {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    if (Number.isFinite(delay) && delay >= 0)
      return Math.min(MAX_RETRY_DELAY_MS, delay);
  }
  return Math.min(MAX_RETRY_DELAY_MS, 500 * 2 ** attempt);
}
async function readBoundedResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Response exceeds 2 MB");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: Buffer.concat(chunks).toString("utf8"),
  };
}
async function defaultFetchPage(url: string, signal?: AbortSignal) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await pause(
      Math.max(0, REQUEST_SPACING_MS - (Date.now() - lastPublicRequestAt)),
      signal,
    );
    lastPublicRequestAt = Date.now();
    const response = await fetch(url, {
      redirect: "error",
      headers: {
        "User-Agent":
          "PromotionAroundYouResearch/1.0 public listing observation",
      },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(16_000)])
        : AbortSignal.timeout(16_000),
    });
    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < MAX_ATTEMPTS - 1
    ) {
      await response.body?.cancel();
      await pause(
        retryDelay(response.headers.get("retry-after"), attempt),
        signal,
      );
      continue;
    }
    return readBoundedResponse(response);
  }
  throw new Error("Public source retry budget exhausted");
}
async function atomicJson(filename: string, value: unknown) {
  await mkdir(path.dirname(filename), { recursive: true });
  const tmp = `${filename}.${randomUUID()}.tmp`;
  const handle = await open(tmp, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, filename);
  const dir = await open(path.dirname(filename), "r");
  try {
    await dir.sync();
  } finally {
    await dir.close();
  }
}
async function writeRaw(filename: string, body: string) {
  await mkdir(path.dirname(filename), { recursive: true });
  const handle = await open(filename, "wx", 0o600);
  try {
    await handle.writeFile(body);
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function readCheckpoint(
  filename: string,
  runDir: string,
  sourceId: string,
): Promise<SourceCheckpoint | null> {
  let checkpoint: SourceCheckpoint;
  try {
    checkpoint = JSON.parse(
      await readFile(filename, "utf8"),
    ) as SourceCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (
    checkpoint.schema_version !== 1 ||
    checkpoint.source_id !== sourceId ||
    checkpoint.snapshot.source_id !== sourceId ||
    typeof checkpoint.completed !== "boolean"
  )
    throw new Error(`Invalid discovery checkpoint for ${sourceId}`);
  for (const capture of [
    ...checkpoint.snapshot.pages,
    ...checkpoint.snapshot.detail_inspections,
  ]) {
    if (!capture.raw_file || !capture.raw_sha256) continue;
    const target = path.resolve(runDir, capture.raw_file);
    if (
      !target.startsWith(path.resolve(runDir) + path.sep) ||
      sha(await readFile(target)) !== capture.raw_sha256
    )
      throw new Error(`Discovery raw evidence changed: ${capture.raw_file}`);
  }
  const { snapshot_hash, ...snapshotBody } = checkpoint.snapshot;
  if (snapshot_hash !== sha(canonical(snapshotBody)))
    throw new Error(`Discovery checkpoint changed: ${sourceId}`);
  return checkpoint;
}
function abortError() {
  return new DOMException("Discovery interrupted", "AbortError");
}
async function interruptibleFetch(
  fetchPage: FetchPage,
  url: string,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw abortError();
  if (!signal) return fetchPage(url);
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([fetchPage(url, signal), aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
function interruptedSnapshot(source: Source, at: string): SourceSnapshot {
  const body = {
    source_id: source.source_id,
    observed_at: at,
    status: "partial" as const,
    enumerable: source.enumerable,
    pages: [] as CapturedPage[],
    listing_evidence: [] as ListingCard[],
    detail_inspections: [] as DetailInspection[],
    entries_seen_count: 0,
    cards_evaluated: 0,
    cards_skipped_stale: 0,
    cards_outside_horizon: 0,
    cards_temporal_ambiguous: 0,
    candidate_proposals: 0,
    detail_attempts: 0,
    detail_failures: 0,
    cap_truncated: false,
    pagination_remaining: false,
    listing_failure: true,
    extraction_incomplete: true,
    incomplete_reasons: ["acquisition_interrupted_before_source"],
    errors: [],
    ordering_observed: source.ordering,
    pagination_observed: source.pagination,
    freshness_observed: source.freshness_visibility,
  };
  return { ...body, snapshot_hash: sha(canonical(body)) };
}
async function captureSource(args: {
  runDir: string;
  source: Source;
  now: () => string;
  fetchPage: FetchPage;
  previous?: DiscoveryResult;
  recoveryWindowStart?: string;
  recoveryTarget?: RecoveryTraversalTarget;
  interrupted?: SourceCheckpoint;
  signal?: AbortSignal;
}): Promise<SourceCheckpoint> {
  const {
    runDir,
    source,
    now,
    fetchPage,
    previous,
    interrupted: priorAttempt,
    signal,
  } = args;
  const attempt = randomUUID();
  const rawDir = path.join(
    runDir,
    "discovery",
    "raw",
    source.source_id,
    attempt,
  );
  await mkdir(rawDir, { recursive: true });
  const pages: CapturedPage[] = [],
    cards: ListingCard[] = [],
    details: DetailInspection[] = [],
    proposals: CandidateProposal[] = [];
  const capturedListings = new Map<
    string,
    { rawFile: string; rawSha256: string }
  >();
  const errors: string[] = [],
    incomplete: string[] = [];
  const visited = new Set<string>(),
    seenCards = new Set<string>();
  const seenPageBodies = new Set<string>();
  const observedAt = now();
  const recoveryTarget = args.recoveryTarget;
  const checkpointBoundary =
    recoveryTarget?.oldest_published_at ??
    recoveryTarget?.checkpoint_at ??
    null;
  const overlapKeys = new Set(
    (recoveryTarget?.overlap_identities ?? []).map(
      (item) => `${item.url}\u0000${item.content_hash}`,
    ),
  );
  let oldestObservedPublishedAt: string | null = null,
    priorPublishedMs = Number.POSITIVE_INFINITY,
    orderingVerified = true,
    crossedCheckpoint = false,
    overlapVerified = false,
    terminalPageReached = false,
    repeatedPageBody = false,
    urlLoopDetected = false,
    stopAfterRecoveryPage: number | null = null,
    recoveryPaginationComplete = false;
  const singaporeToday = DateTime.fromISO(observedAt)
    .setZone("Asia/Singapore")
    .toISODate();
  if (!singaporeToday) throw new Error("Invalid discovery observation time");
  const priorSnapshot = previous?.source_snapshots.find(
    (item) => item.source_id === source.source_id,
  );
  const priorCardHashes =
    priorSnapshot &&
    new Map(
      priorSnapshot.listing_evidence.map((card) => [
        card.url,
        card.content_hash,
      ]),
    );
  const priorDetailHashes =
    priorSnapshot &&
    new Map(
      priorSnapshot.detail_inspections.map((detail) => [
        detail.card_url,
        detail.raw_sha256,
      ]),
    );
  let next: string | null = source.origin_url;
  let paginationRemaining = false,
    capTruncated = false,
    listingFailure = false,
    interrupted = false;
  let skippedStale = 0,
    outsideHorizon = 0,
    temporalAmbiguous = 0;
  const { max_pages: maxPages, max_entries: maxEntries } =
    source.reasonable_per_run_cap;
  if (!cardSelector(source.source_id))
    incomplete.push("no_supported_card_parser");
  if (
    [
      "singpromos_ongoing",
      "great_world_promotions",
      "divedeals_food",
      "hsbc_dining",
      "confirmgood_deals",
    ].includes(source.source_id) &&
    // Rev6 registers ConfirmGood's Deals archive, not unrelated site categories.
    // Actual unresolved Load More controls still fail pagination below; rev5 is unchanged.
    !(
      source.source_id === "confirmgood_deals" &&
      source.research_role === "core_replacement"
    )
  )
    incomplete.push("registered_category_or_tab_routes_not_traversed");
  for (let pageNumber = 1; next && pageNumber <= maxPages; pageNumber++) {
    if (signal?.aborted) {
      interrupted = true;
      incomplete.push("acquisition_interrupted_during_source");
      break;
    }
    const current: string = next;
    if (!sameOrigin(current, source.origin_url) || visited.has(current)) {
      errors.push(`Unsafe or repeated listing URL: ${current}`);
      if (visited.has(current)) urlLoopDetected = true;
      listingFailure = true;
      break;
    }
    visited.add(current);
    let response: Awaited<ReturnType<FetchPage>>;
    try {
      response = await interruptibleFetch(fetchPage, current, signal);
      if (
        response.status !== 200 ||
        !response.contentType.toLowerCase().includes("text/html") ||
        Buffer.byteLength(response.body) > MAX_BYTES
      )
        throw new Error(
          `HTTP ${response.status}, non-HTML, or response exceeds 2 MB`,
        );
    } catch (error) {
      if (signal?.aborted) {
        interrupted = true;
        incomplete.push("acquisition_interrupted_during_source");
        break;
      }
      errors.push(`listing ${current}: ${String(error)}`);
      listingFailure = true;
      break;
    }
    const rawFile = path.relative(
      runDir,
      path.join(rawDir, `listing-${String(pageNumber).padStart(2, "0")}.html`),
    );
    await writeRaw(path.join(runDir, rawFile), response.body);
    const rawSha256 = sha(response.body);
    if (seenPageBodies.has(rawSha256)) {
      repeatedPageBody = true;
      errors.push(`Repeated listing page body: ${current}`);
    }
    seenPageBodies.add(rawSha256);
    capturedListings.set(current, { rawFile, rawSha256 });
    const pageObservedAt = now();
    const extracted = extractCards(
      response.body,
      source,
      current,
      pageObservedAt,
    );
    if (recoveryTarget || source.research_role === "core_replacement") {
      if (extracted.some((card) => !card.published_at))
        orderingVerified = false;
      for (const card of extracted) {
        if (!card.published_at) continue;
        const publishedMs = Date.parse(card.published_at);
        if (!Number.isFinite(publishedMs)) {
          orderingVerified = false;
          continue;
        }
        if (publishedMs > priorPublishedMs) orderingVerified = false;
        priorPublishedMs = publishedMs;
        if (
          !oldestObservedPublishedAt ||
          publishedMs < Date.parse(oldestObservedPublishedAt)
        )
          oldestObservedPublishedAt = card.published_at;
        if (checkpointBoundary && publishedMs <= Date.parse(checkpointBoundary))
          crossedCheckpoint = true;
        if (overlapKeys.has(`${card.url}\u0000${card.content_hash}`))
          overlapVerified = true;
      }
    }
    for (const card of extracted) {
      if (seenCards.has(card.url)) continue;
      seenCards.add(card.url);
      if (cards.length < maxEntries) cards.push(card);
      else capTruncated = true;
    }
    const nextState = nextPage(
      response.body,
      source,
      current,
      pageNumber,
      visited,
    );
    paginationRemaining = !!nextState.url || nextState.unresolved;
    if (nextState.looped) {
      urlLoopDetected = true;
      incomplete.push("listing_pagination_url_loop");
    }
    terminalPageReached = !nextState.url && !nextState.unresolved;
    if (nextState.unresolved)
      incomplete.push("pagination_control_without_fetchable_link");
    pages.push({
      url: current,
      observed_at: pageObservedAt,
      status: response.status,
      raw_file: rawFile,
      raw_sha256: rawSha256,
      extracted_cards: extracted.length,
      next_page_url: nextState.url,
    });
    if (
      recoveryTarget &&
      crossedCheckpoint &&
      overlapVerified &&
      stopAfterRecoveryPage === null
    ) {
      if (nextState.url) stopAfterRecoveryPage = pageNumber + 1;
      else recoveryPaginationComplete = terminalPageReached;
    }
    next = nextState.url;
    if (repeatedPageBody) break;
    if (stopAfterRecoveryPage === pageNumber) {
      recoveryPaginationComplete =
        source.research_role === "core_replacement"
          ? !nextState.unresolved && !nextState.looped
          : true;
      paginationRemaining = !recoveryPaginationComplete;
      next = null;
      break;
    }
    if (cards.length >= maxEntries) {
      if (paginationRemaining) capTruncated = true;
      break;
    }
    if (pageNumber === maxPages && paginationRemaining) capTruncated = true;
  }
  if (source.enumerable && pages.length && !cards.length)
    incomplete.push("no_cards_extracted_from_enumerable_source");
  if (capTruncated)
    incomplete.push("safety_cap_reached_with_remaining_cards_or_pages");
  if (!source.enumerable)
    incomplete.push("probe_does_not_establish_directory_coverage");
  if (source.source_id === "grab_promo_codes" && cards.length)
    incomplete.push("campaign_table_does_not_identify_physical_merchants");
  for (const [index, card] of cards.entries()) {
    if (signal?.aborted) {
      interrupted = true;
      incomplete.push("acquisition_interrupted_during_source");
      break;
    }
    // Generic Dine Out codes do not identify a participating physical merchant.
    if (source.source_id === "grab_promo_codes") continue;
    if (!eligibleLooking(card, source)) continue;
    const pageReference = new URL(card.url);
    const hasFragment = !!pageReference.hash;
    pageReference.hash = "";
    const onPageCapture =
      hasFragment && pageReference.href === card.listing_page
        ? capturedListings.get(pageReference.href)
        : undefined;
    const detail: DetailInspection = {
      card_url: card.url,
      observed_at: now(),
      status: "failed",
      raw_file: null,
      raw_sha256: null,
      error: null,
    };
    let detailText = "";
    let publishedAt: string | null = card.published_at ?? null;
    try {
      if (!sameOrigin(card.url, source.origin_url))
        throw new Error("Detail leaves source origin");
      if (onPageCapture) {
        // The listing row is the detail; retain its already captured page as evidence.
        detailText = card.excerpt;
        detail.status = "captured";
        detail.raw_file = onPageCapture.rawFile;
        detail.raw_sha256 = onPageCapture.rawSha256;
      } else {
        const response = await interruptibleFetch(fetchPage, card.url, signal);
        if (
          response.status !== 200 ||
          !response.contentType.toLowerCase().includes("text/html") ||
          Buffer.byteLength(response.body) > MAX_BYTES
        )
          throw new Error(
            `HTTP ${response.status}, non-HTML, or response exceeds 2 MB`,
          );
        const rawFile = path.relative(
          runDir,
          path.join(
            rawDir,
            `detail-${String(index + 1).padStart(3, "0")}-${sha(card.url).slice(0, 12)}.html`,
          ),
        );
        await writeRaw(path.join(runDir, rawFile), response.body);
        const $ = load(response.body);
        const published =
          $('meta[property="article:published_time"]').attr("content") ??
          $('time[itemprop="datePublished"]').attr("datetime");
        if (
          published &&
          /(?:Z|[+-]\d{2}:\d{2})$/.test(published) &&
          Number.isFinite(Date.parse(published))
        )
          publishedAt = new Date(published).toISOString();
        $("script,style,nav,footer,header").remove();
        detailText = cleanText(
          $("main,article,#content").first().text() || $("body").text(),
        ).slice(0, 12_000);
        detail.status = "captured";
        detail.raw_file = rawFile;
        detail.raw_sha256 = sha(response.body);
      }
    } catch (error) {
      if (signal?.aborted) {
        interrupted = true;
        incomplete.push("acquisition_interrupted_during_source");
        break;
      }
      detail.error = String(error);
      errors.push(`detail ${card.url}: ${detail.error}`);
    }
    details.push(detail);
    const priorDetailHash = priorDetailHashes?.get(card.url);
    const newOrUpdated =
      (!!priorCardHashes &&
        priorCardHashes.get(card.url) !== card.content_hash) ||
      (!onPageCapture &&
        !!priorDetailHash &&
        !!detail.raw_sha256 &&
        priorDetailHash !== detail.raw_sha256);
    const decision = propose(
      card,
      source,
      detail,
      detailText,
      singaporeToday,
      newOrUpdated ||
        !!(
          args.recoveryWindowStart &&
          publishedAt &&
          Date.parse(publishedAt) >= Date.parse(args.recoveryWindowStart) &&
          Date.parse(publishedAt) <= Date.parse(card.observed_at)
        ),
    );
    if (decision.candidate) {
      if (publishedAt) decision.candidate.published_at = publishedAt;
      proposals.push(decision.candidate);
    }
    if (decision.reason === "stale") skippedStale++;
    if (decision.reason === "outside_horizon") outsideHorizon++;
    if (decision.reason === "temporal_ambiguous") temporalAmbiguous++;
    if (
      decision.reason === "temporal_ambiguous" ||
      decision.reason === "scope_ambiguous" ||
      decision.reason === "merchant_ambiguous"
    )
      incomplete.push(`candidate_${decision.reason}`);
  }
  const detailFailures = details.filter(
    (detail) => detail.status === "failed",
  ).length;
  if (detailFailures) incomplete.push("detail_fetch_failed");
  const status: SourceSnapshot["status"] = interrupted
    ? "partial"
    : !pages.length
      ? "blocked"
      : !source.enumerable
        ? "probe_only"
        : incomplete.length || listingFailure
          ? "partial"
          : "captured";
  const snapshotWithoutHash = {
    source_id: source.source_id,
    observed_at: observedAt,
    status,
    enumerable: source.enumerable,
    pages,
    listing_evidence: cards,
    detail_inspections: details,
    entries_seen_count: seenCards.size,
    cards_evaluated: cards.length,
    cards_skipped_stale: skippedStale,
    cards_outside_horizon: outsideHorizon,
    cards_temporal_ambiguous: temporalAmbiguous,
    candidate_proposals: proposals.length,
    detail_attempts: details.length,
    detail_failures: detailFailures,
    cap_truncated: capTruncated,
    pagination_remaining: paginationRemaining,
    listing_failure: listingFailure,
    extraction_incomplete: !!incomplete.length || listingFailure || interrupted,
    incomplete_reasons: [...new Set(incomplete)],
    errors,
    ordering_observed: source.ordering,
    pagination_observed: source.pagination,
    freshness_observed: source.freshness_visibility,
    ...(source.research_role === "core_replacement"
      ? {
          archive_enumeration: {
            ordering_verified: orderingVerified,
            terminal_page_reached: terminalPageReached,
            repeated_page_body: repeatedPageBody,
            url_loop_detected: urlLoopDetected,
          },
        }
      : {}),
    ...(recoveryTarget
      ? {
          recovery_traversal: {
            strategy: "dated_archive_checkpoint_overlap" as const,
            checkpoint_at: recoveryTarget.checkpoint_at,
            checkpoint_boundary: checkpointBoundary!,
            traversal_started_at: observedAt,
            traversal_ended_at: now(),
            oldest_observed_published_at: oldestObservedPublishedAt,
            crossed_checkpoint: crossedCheckpoint,
            overlap_verified: overlapVerified,
            terminal_page_reached: terminalPageReached,
            cap_truncated: capTruncated,
            ordering_verified: orderingVerified,
            pagination_complete:
              recoveryPaginationComplete ||
              (terminalPageReached && crossedCheckpoint && overlapVerified),
            repeated_page_body: repeatedPageBody,
            url_loop_detected: urlLoopDetected,
            reasons: [
              ...(!crossedCheckpoint
                ? ["checkpoint_boundary_not_reached"]
                : []),
              ...(!overlapVerified ? ["checkpoint_overlap_not_verified"] : []),
              ...(!orderingVerified ? ["publication_order_not_verified"] : []),
              ...(repeatedPageBody ? ["repeated_listing_page_body"] : []),
              ...(urlLoopDetected ? ["listing_url_loop"] : []),
              ...(capTruncated ? ["safety_cap_before_complete_overlap"] : []),
              ...(listingFailure ? ["listing_failure"] : []),
              ...(source.research_role === "core_replacement" &&
              incomplete.includes("pagination_control_without_fetchable_link")
                ? ["required_pagination_unresolved"]
                : []),
            ],
          },
        }
      : {}),
  };
  const snapshot: SourceSnapshot = {
    ...snapshotWithoutHash,
    snapshot_hash: sha(canonical(snapshotWithoutHash)),
  };
  const prior = new Map(
    previous?.candidates.map((candidate) => [
      candidate.candidate_id,
      candidate.first_seen_at,
    ]) ?? [],
  );
  for (const candidate of priorAttempt?.candidates ?? []) {
    const earlier = prior.get(candidate.candidate_id);
    if (!earlier || Date.parse(candidate.first_seen_at) < Date.parse(earlier))
      prior.set(candidate.candidate_id, candidate.first_seen_at);
  }
  const priorCards = new Map(
    (priorAttempt?.snapshot.listing_evidence ?? []).map((card) => [
      `${card.url}|${card.content_hash}`,
      card.observed_at,
    ]),
  );
  for (const proposal of proposals) {
    const card = cards.find((item) => item.url === proposal.candidate_url);
    const earlierCard = card
      ? priorCards.get(`${card.url}|${card.content_hash}`)
      : undefined;
    proposal.first_seen_at = [
      proposal.first_seen_at,
      prior.get(proposal.candidate_id),
      earlierCard,
    ]
      .filter((value): value is string => !!value)
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    proposal.source_snapshot_hash = snapshot.snapshot_hash;
    proposal.occurrences = [
      {
        published_at: proposal.published_at,
        source_id: source.source_id,
        url: proposal.candidate_url,
        candidate_url: proposal.candidate_url,
        seen_at: proposal.seen_at,
        source_snapshot_hash: snapshot.snapshot_hash,
      },
    ];
  }
  return {
    schema_version: 1,
    source_id: source.source_id,
    completed: !interrupted,
    snapshot,
    candidates: proposals,
  };
}
/** Conservative offer IDs come from candidate-side facts, never benchmark merchants. */
export function mergeCandidateObservations(
  candidates: CandidateProposal[],
  previous: CandidateProposal[] = [],
): CandidateProposal[] {
  const prior = new Map(previous.map((c) => [c.candidate_id, c]));
  const all = new Map<string, CandidateProposal>();
  for (const candidate of candidates) {
    const existing =
      all.get(candidate.candidate_id) ?? prior.get(candidate.candidate_id);
    const occurrences = [
      ...(existing?.occurrences ?? []),
      ...(candidate.occurrences ?? []),
    ];
    const uniqueOccurrences = new Map(
      occurrences.map((o) => {
        const normalized = { ...o, candidate_url: o.candidate_url ?? o.url };
        return [
          JSON.stringify([
            o.source_id,
            o.seen_at,
            normalized.candidate_url,
            o.source_snapshot_hash,
          ]),
          normalized,
        ];
      }),
    );
    const first = [candidate.first_seen_at, existing?.first_seen_at]
      .filter((v): v is string => !!v)
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    const latest =
      existing && Date.parse(existing.seen_at) > Date.parse(candidate.seen_at)
        ? existing
        : candidate;
    all.set(candidate.candidate_id, {
      ...latest,
      source_evidence: [
        ...new Map(
          [
            ...(existing ? candidateEvidence(existing) : []),
            ...candidateEvidence(candidate),
          ].map((e) => [
            JSON.stringify([
              e.source_id,
              e.seen_at,
              e.source_snapshot_hash,
              e.candidate_url,
            ]),
            e,
          ]),
        ).values(),
      ],
      first_seen_at: first,
      inspectable: candidate.inspectable || !!existing?.inspectable,
      occurrences: [...uniqueOccurrences.values()].sort(
        (a, b) => Date.parse(a.seen_at) - Date.parse(b.seen_at),
      ),
    });
  }
  return [...all.values()];
}

export function sourceAdapterCapabilities(source: Source) {
  const parser = cardSelector(source.source_id) !== null;
  return {
    enumeration_supported: source.enumerable && parser,
    listing_parser_supported: parser,
    detail_fetch_supported: true,
    semantic_extraction: "generic" as const,
    source_specific_listing_parser: parser,
    production_ready: false,
  };
}

/** A completed source checkpoint is reused after restart; a crashed attempt is not mistaken for a successful observation. */
export async function runDiscovery(args: {
  runDir: string;
  registry: SourceRegistry;
  now: () => string;
  fetchPage?: FetchPage;
  previous?: DiscoveryResult;
  signal?: AbortSignal;
  recoveryWindowStart?: string;
  recoveryTargets?: Record<string, RecoveryTraversalTarget>;
  provenance?: ObservationProvenance;
}): Promise<DiscoveryResult> {
  const { runDir, registry, now, previous } = args;
  if (!Array.isArray(registry.sources) || !registry.sources.length)
    throw new Error("Empty source registry");
  const ids = new Set<string>();
  for (const source of registry.sources) {
    safeSource(source);
    if (ids.has(source.source_id))
      throw new Error(`Duplicate source: ${source.source_id}`);
    ids.add(source.source_id);
  }
  const checkpoints: SourceCheckpoint[] = [];
  const checkpointDir = path.join(runDir, "discovery", "sources");
  await mkdir(checkpointDir, { recursive: true });
  for (const source of registry.sources) {
    const filename = path.join(checkpointDir, `${source.source_id}.json`);
    let checkpoint = await readCheckpoint(filename, runDir, source.source_id);
    if ((!checkpoint || !checkpoint.completed) && !args.signal?.aborted) {
      checkpoint = await captureSource({
        runDir,
        source,
        now,
        fetchPage: args.fetchPage ?? defaultFetchPage,
        previous,
        recoveryWindowStart: args.recoveryWindowStart,
        recoveryTarget: args.recoveryTargets?.[source.source_id],
        interrupted: checkpoint ?? undefined,
        signal: args.signal,
      });
      if (args.provenance)
        checkpoint.candidates = checkpoint.candidates.map((candidate) => ({
          ...candidate,
          ...args.provenance,
          recovered_at:
            args.provenance?.observation_mode === "catch_up"
              ? candidate.seen_at
              : null,
          occurrences: candidate.occurrences.map((occurrence) => ({
            ...occurrence,
            ...args.provenance,
            recovered_at:
              args.provenance?.observation_mode === "catch_up"
                ? occurrence.seen_at
                : null,
          })),
        }));
      await atomicJson(filename, checkpoint);
    }
    checkpoints.push(
      checkpoint ?? {
        schema_version: 1,
        source_id: source.source_id,
        completed: false,
        snapshot: interruptedSnapshot(source, now()),
        candidates: [],
      },
    );
  }
  const snapshots = checkpoints.map((checkpoint) => checkpoint.snapshot),
    candidates = mergeCandidateObservations(
      checkpoints.flatMap((c) => c.candidates),
      previous?.candidates,
    );
  return {
    schema_version: 1,
    observed_at: now(),
    source_snapshots: snapshots,
    candidates,
    totals: {
      sources: snapshots.length,
      cards_seen: snapshots.reduce(
        (sum, source) => sum + source.entries_seen_count,
        0,
      ),
      cards_evaluated: snapshots.reduce(
        (sum, source) => sum + source.cards_evaluated,
        0,
      ),
      cards_skipped_stale: snapshots.reduce(
        (sum, source) => sum + source.cards_skipped_stale,
        0,
      ),
      cards_outside_horizon: snapshots.reduce(
        (sum, source) => sum + source.cards_outside_horizon,
        0,
      ),
      cards_temporal_ambiguous: snapshots.reduce(
        (sum, source) => sum + source.cards_temporal_ambiguous,
        0,
      ),
      candidate_proposals: snapshots.reduce(
        (sum, source) => sum + source.candidate_proposals,
        0,
      ),
      distinct_candidates: candidates.length,
      detail_attempts: snapshots.reduce(
        (sum, source) => sum + source.detail_attempts,
        0,
      ),
      detail_failures: snapshots.reduce(
        (sum, source) => sum + source.detail_failures,
        0,
      ),
      source_failures: snapshots.filter((source) => source.listing_failure)
        .length,
      truncated_sources: snapshots.filter((source) => source.cap_truncated)
        .length,
      incomplete_sources: snapshots.filter(
        (source) => source.extraction_incomplete,
      ).length,
    },
  };
}

/** Evidence is captured before cross-source merging. Legacy merged facts cannot be attributed backwards. */
function candidateEvidence(
  candidate: CandidateProposal,
): Omit<CandidateProposal, "source_evidence">[] {
  if (candidate.source_evidence) return candidate.source_evidence;
  if (
    !candidate.occurrences ||
    candidate.occurrences.some((o) => o.source_id !== candidate.source_id)
  )
    return [];
  const { source_evidence: _ignored, ...evidence } = candidate;
  void _ignored;
  return [evidence];
}

/** Target-blind projection. Evidence-bound IDs require fresh cohort-specific manual adjudication. */
export function projectCandidatesForSources(
  candidates: CandidateProposal[],
  sourceIds: readonly string[],
): CandidateProposal[] {
  const allowed = new Set(sourceIds);
  return candidates.flatMap((candidate) => {
    const evidence = candidateEvidence(candidate).filter((e) =>
      allowed.has(e.source_id),
    );
    if (!evidence.length) return [];
    const merged = mergeCandidateObservations(evidence)[0];
    const occurrences = merged.occurrences.filter((o) =>
      allowed.has(o.source_id),
    );
    if (!occurrences.length) return [];
    const first = [...occurrences].sort((a, b) =>
      a.seen_at.localeCompare(b.seen_at),
    )[0];
    const digest = createHash("sha256")
      .update(JSON.stringify(evidence))
      .digest("hex")
      .slice(0, 24);
    return [
      {
        ...merged,
        candidate_id: `cohort:${candidate.candidate_id}:${digest}`,
        occurrences,
        first_seen_at: first.seen_at,
        observation_mode: first.observation_mode,
        published_at:
          first.published_at ??
          evidence.find(
            (e) =>
              e.source_id === first.source_id && e.seen_at === first.seen_at,
          )?.published_at,
        recovered_at: first.recovered_at,
        scheduled_slot: first.scheduled_slot,
        acquisition_pass: first.acquisition_pass,
        recovery_reason: first.recovery_reason,
      },
    ];
  });
}
