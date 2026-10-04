import { z } from "zod";
import { merchantIdentity } from "../../../src/ingestion/source-evidence/registry";
import type { AdapterFamily, DestinationClass } from "./types";

const host = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
export const authorityReviewSchema = z
  .object({
    version: z.literal(1),
    entries: z.array(
      z
        .object({
          merchant: z.string().trim().min(1),
          host,
          account: z
            .string()
            .regex(/^[a-z0-9_.-]+$/)
            .optional(),
          path: z
            .string()
            .regex(/^\/(?:[a-zA-Z0-9_./%-]*)$/)
            .optional(),
          authority: z.enum(["primary", "strong_secondary"]),
          source_kind: z.enum([
            "merchant_website",
            "merchant_social",
            "official_terms",
            "partner_website",
            "mall_website",
            "platform_campaign",
          ]),
          evidence_note: z.string().trim().min(1),
        })
        .strict()
        .superRefine((entry, ctx) => {
          if (
            (isSocialHost(entry.host) ||
              entry.source_kind === "merchant_social") &&
            !entry.account &&
            (!entry.path || entry.path === "/")
          )
            ctx.addIssue({
              code: "custom",
              message: "Social review requires an account or scoped path",
            });
          if (entry.path?.split("/").some((part) => [".", ".."].includes(part)))
            ctx.addIssue({
              code: "custom",
              message: "Review path must be canonical",
            });
        }),
    ),
  })
  .strict();
export type AuthorityReview = z.infer<typeof authorityReviewSchema>;
const social = new Set([
  "instagram.com",
  "facebook.com",
  "m.facebook.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "youtu.be",
]);
const publishers = new Set([
  "confirmgood.com",
  "eatbook.sg",
  "singaporefoodie.com",
  "mustsharenews.com",
  "sethlui.com",
  "timeout.com",
  "hungrygowhere.com",
]);
const aggregators = new Set([
  "greatdeals.com.sg",
  "singpromos.com",
  "everydayonsales.com",
]);
const hubs = new Set([
  "linktr.ee",
  "beacons.ai",
  "bio.site",
  "lnk.bio",
  "campsite.bio",
]);
const shorteners = new Set([
  "tco.sg",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "s.id",
]);
const platforms = new Set([
  "krisplus.com",
  "singaporeair.com",
  "grab.com",
  "chope.co",
  "fave.com",
  "myfave.com",
  "dbs.com.sg",
  "posb.com.sg",
  "uob.com.sg",
  "ocbc.com",
]);
export function domain(value: string): string {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
}
// Research identity only: never change transport evidence or resolver behavior.
export function candidateDestination(final: string | null, chain: string[]) {
  if (!final) return { url: null, basis: "no_resolved_destination" };
  const url = new URL(final);
  if (
    !["facebook.com", "m.facebook.com"].includes(domain(final)) ||
    !/^\/unsupportedbrowser\/?$/.test(url.pathname)
  )
    return { url: final, basis: "transport_destination" };
  const prior = chain.at(-2);
  if (chain.at(-1) === final && prior) {
    const previous = new URL(prior);
    if (
      ["http:", "https:"].includes(previous.protocol) &&
      !previous.username &&
      !previous.password &&
      !previous.port
    ) {
      if (
        domain(prior) === "instagram.com" &&
        /^\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(previous.pathname)
      )
        return { url: prior, basis: "instagram_facebook_unsupportedbrowser" };
      if (
        ["facebook.com", "m.facebook.com"].includes(domain(prior)) &&
        /^\/(?:share\/(?:p|r)\/[^/]+|reel\/\d+|[^/]+\/posts\/[^/]+)\/?$/.test(
          previous.pathname,
        )
      )
        return { url: prior, basis: "facebook_content_unsupportedbrowser" };
    }
  }
  return { url: null, basis: "unsupportedbrowser_without_meaningful_prior" };
}
export function isSocialHost(value: string) {
  return social.has(value.replace(/^www\./, ""));
}
export function isShortUrl(value: string) {
  return shorteners.has(domain(value));
}
function under(hostname: string, base: string) {
  return hostname === base || hostname.endsWith(`.${base}`);
}
export function topology(value: string): DestinationClass {
  const url = new URL(value),
    hostname = domain(value);
  if (!["http:", "https:"].includes(url.protocol)) return "app_or_deep_link";
  if (under(hostname, "t.me") || hostname === "telegram.me") return "telegram";
  if (publishers.has(hostname)) return "publisher";
  if (aggregators.has(hostname)) return "deal_aggregator";
  if (isSocialHost(hostname)) return "official_social_candidate";
  if (hubs.has(hostname)) return "link_hub";
  if (hostname === "google.com")
    return url.pathname === "/url" ? "link_hub" : "unknown";
  if (shorteners.has(hostname)) return "url_shortener";
  if (
    hostname === "app.krisplus.com" ||
    hostname === "app.happypointcard.com.sg" ||
    hostname.endsWith(".onelink.me") ||
    hostname.endsWith(".app.link") ||
    ["apps.apple.com", "play.google.com", "onelink.me", "app.link"].includes(
      hostname,
    )
  )
    return "app_or_deep_link";
  if ([...platforms].some((base) => under(hostname, base)))
    return "issuer_or_platform_candidate";
  // Ordinary HTTP topology alone cannot establish a merchant's identity.
  if (
    hostname &&
    hostname.includes(".") &&
    !url.username &&
    !url.password &&
    !url.port
  )
    return "merchant_web_candidate";
  return "unknown";
}
export function family(kind: DestinationClass, value: string): AdapterFamily {
  if (kind === "official_social_candidate") return "official_social";
  if (kind === "issuer_or_platform_candidate") return "issuer_platform";
  if (kind === "app_or_deep_link") return "app_deep_link";
  if (kind === "publisher" || kind === "deal_aggregator")
    return "publisher_article";
  if (kind === "telegram" || kind === "link_hub") return "link_hub";
  if (kind !== "merchant_web_candidate") return "unresolved";
  const path = new URL(value).pathname;
  if (/\/(?:promotions|deals|offers)\/?$/i.test(path))
    return "promotion_directory";
  if (/\/(?:news|blog|press)(?:\/|$)/i.test(path))
    return "merchant_news_or_blog";
  return "merchant_campaign_page";
}
export const intermediate = (kind: DestinationClass) =>
  [
    "publisher",
    "deal_aggregator",
    "telegram",
    "link_hub",
    "url_shortener",
  ].includes(kind);
export function matchingReview(
  value: string,
  merchant: string,
  review: AuthorityReview,
) {
  const url = new URL(value);
  const matches = review.entries.filter((entry) => {
    const path = entry.path?.replace(/\/$/, "") ?? "";
    return (
      merchantIdentity(entry.merchant) === merchantIdentity(merchant) &&
      entry.host === url.hostname &&
      (!entry.account ||
        url.pathname.split("/")[1]?.toLowerCase() === entry.account) &&
      (!entry.path ||
        !path ||
        url.pathname === path ||
        url.pathname.startsWith(`${path}/`))
    );
  });
  if (matches.length > 1)
    throw new Error(`Conflicting authority reviews: ${merchant} ${value}`);
  return matches[0];
}
