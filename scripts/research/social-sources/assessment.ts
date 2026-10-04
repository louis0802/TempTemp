import { load } from "cheerio";
import { instagramIdentity } from "../../../src/ingestion/direct-sources/source-scope";
import { campaignDates } from "../../../src/ingestion/direct-sources/dates";

export interface PublicSocialCapture {
  url: string;
  status: number | null;
  body: string;
  redirectTo: string | null;
  error: string | null;
}
/** Public DOM/standard metadata only. Never interpret private embedded API payloads. */
export function assessInstagramCapture(
  account: string,
  capture: PublicSocialCapture,
) {
  const $ = load(capture.body);
  $("script,style,noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const title = $("title").text();
  const links = $("a[href]")
    .toArray()
    .flatMap((a) => {
      try {
        return [new URL($(a).attr("href")!, capture.url).href];
      } catch {
        return [];
      }
    });
  const requested = instagramIdentity(capture.url);
  const mismatch =
    requested?.account !== null && requested?.account !== account;
  const blocked =
    capture.error !== null ||
    capture.status !== 200 ||
    !!capture.redirectTo ||
    /unsupported browser|log in to (?:continue|instagram)|login required|challenge|captcha|please wait a few minutes/i.test(
      `${title} ${text}`,
    ) ||
    $("form[action*='login'],form[action*='challenge'],input[type='password']")
      .length > 0;
  const canonical = $("link[rel='canonical']").attr("href") ?? null;
  const canonicalIdentity = canonical ? instagramIdentity(canonical) : null;
  const scopedUrl = $("meta[property='og:url']").attr("content") ?? null;
  const scopedIdentity = scopedUrl ? instagramIdentity(scopedUrl) : null;
  const items = [
    ...new Set(
      links.filter((url) => {
        const id = instagramIdentity(url);
        return (
          id &&
          id.kind !== "profile" &&
          (id.account === account || id.account === null)
        );
      }),
    ),
  ].sort();
  // An accountless anchor alone cannot prove ownership; standard author backlinks must agree.
  const author = $("a[rel='author']")
    .toArray()
    .map((a) => {
      try {
        return instagramIdentity(new URL($(a).attr("href")!, capture.url).href)
          ?.account;
      } catch {
        return null;
      }
    });
  const conflictingAccount =
    (canonicalIdentity?.account != null &&
      canonicalIdentity.account !== account) ||
    (scopedIdentity?.account != null && scopedIdentity.account !== account) ||
    author.some((a) => a != null && a !== account);
  const association =
    !blocked &&
    !conflictingAccount &&
    requested?.kind !== "profile" &&
    !!canonicalIdentity?.nativeId &&
    canonicalIdentity.nativeId === requested?.nativeId &&
    ((author.length > 0 && author.every((a) => a === account)) ||
      (scopedIdentity?.account === account &&
        scopedIdentity.nativeId === requested?.nativeId));
  const publicTitle = $("meta[property='og:title']").attr("content") ?? "";
  const metadataCaption =
    publicTitle.match(/ on Instagram: "([\s\S]*)"$/)?.[1] ?? null;
  const captions = association
    ? metadataCaption
      ? [metadataCaption]
      : $("article [itemprop='articleBody'],article [itemprop='caption']")
          .toArray()
          .map((e) => $(e).text().trim())
          .filter(Boolean)
    : [];
  const continuation =
    $("a[rel='next'],link[rel='next'],button")
      .toArray()
      .some(
        (e) =>
          $(e).attr("rel") === "next" ||
          /load more|next|more posts/i.test($(e).text()),
      ) || /show more posts|load more/i.test(text);
  const blockers = [
    ...(mismatch ? ["social_account_mismatch"] : []),
    ...(conflictingAccount ? ["conflicting_post_account_evidence"] : []),
    ...(blocked ? ["blocked_public_access"] : []),
    ...(!blocked && !items.length && requested?.kind === "profile"
      ? ["public_feed_not_exposed"]
      : []),
    "bounded_feed_boundary_unproven",
    ...(continuation ? ["unknown_continuation"] : []),
    ...(!association && requested?.kind !== "profile"
      ? ["post_account_association_unproven"]
      : []),
  ].sort();
  return {
    account,
    requested_url: capture.url,
    http_status: capture.status,
    access: blocked ? "blocked_public_access" : "public_html",
    visible_item_urls: items,
    canonical_url: canonical,
    account_scoped_content_url: association ? scopedUrl : null,
    content_kind: scopedIdentity?.kind ?? requested?.kind ?? null,
    account_post_association: association ? "verified" : "unproven",
    public_caption: captions.length === 1 ? captions[0] : null,
    published_at:
      $("meta[property='article:published_time']").attr("content") ??
      $("time[datetime]").first().attr("datetime") ??
      null,
    continuation: continuation ? "unresolved" : "not_established",
    chronological_coverage: "unproven",
    enumeration_complete: false,
    acquisition_ready: false,
    blockers,
  };
}
/** Research semantics, not a runtime acquisition adapter or publication candidate. */
export function assessSocialCaption(input: {
  caption: string | null;
  publishedAt: string | null;
  kind: "post" | "reel";
  accountAssociationVerified: boolean;
}) {
  const caption = input.caption?.trim() ?? "";
  const explicitBenefit =
    caption.match(
      /\b\d+(?:\.\d+)?%\s+off\b|\b(?:1[- ]for[- ]1|buy one get one free)\b|\bfree\s+(?:drink|coffee|item|meal|dessert|topping|upsiz\w*)\b|\b(?:bundle deal|member(?:s)? promotion)\b/i,
    )?.[0] ?? null;
  const classification =
    !input.accountAssociationVerified || !caption
      ? "unresolved"
      : explicitBenefit
        ? "promotion"
        : /\b(?:deals?|promotions?|promo code|discounts?|redeem (?:this|the) offer)\b/i.test(
              caption,
            )
          ? "unresolved"
          : "non_promotion";
  // Expand only explicit same-month ranges; do not supply a year from publication metadata.
  const dateText = caption.replace(
    /\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/g,
    "$1 $3 $4 – $2 $3 $4",
  );
  const dates =
    classification === "promotion"
      ? campaignDates(dateText.split(/\n/))
      : { startDate: null, endDate: null, issue: null, quote: null };
  const selected =
    /\b(?:selected|participating)\s+(?:singapore\s+)?outlets\b/i.test(caption);
  const all =
    /\ball\s+(?:singapore\s+)?outlets\b/i.test(caption) &&
    !/\b(?:except|excluding)\b/i.test(caption);
  const media =
    /see (?:the )?(?:image|video)|details (?:in|on) (?:the )?(?:image|video)/i.test(
      caption,
    );
  const issues = [
    ...(classification === "unresolved"
      ? ["source_text_or_identity_unproven"]
      : []),
    ...(classification === "promotion" && !dates.startDate
      ? ["start_date_unknown"]
      : []),
    ...(classification === "promotion" && !dates.endDate
      ? ["end_date_unknown"]
      : []),
    ...(classification === "promotion" && !all
      ? [selected ? "selected_outlets_unresolved" : "outlet_scope_unresolved"]
      : []),
    ...(media
      ? [
          input.kind === "reel"
            ? "video_only_facts_unknown"
            : "image_only_facts_unknown",
        ]
      : []),
    ...(dates.issue ? [dates.issue] : []),
  ].sort();
  return {
    classification,
    emits_research_candidate: classification === "promotion",
    benefit: classification === "promotion" ? explicitBenefit : null,
    startDate: dates.startDate,
    endDate: dates.endDate,
    publishedAt: input.publishedAt,
    locationScope: selected
      ? "selected_outlets"
      : all
        ? "all_outlets"
        : "source_unspecified",
    locationNames: [],
    issues,
    disposition: classification === "promotion" ? "review" : classification,
  };
}
