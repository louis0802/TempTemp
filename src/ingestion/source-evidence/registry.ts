import { z } from "zod";
import type { Classification, SourceRegistry } from "./types";
const host = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
export const registrySchema = z
  .object({
    version: z.literal(1),
    merchants: z.record(
      z.string(),
      z
        .object({
          primaryDomains: z.array(host),
          primarySocialAccounts: z.array(
            z
              .object({ host, account: z.string().regex(/^[a-z0-9_.-]+$/) })
              .strict(),
          ),
          secondaryDomains: z.array(
            z
              .object({
                host,
                kind: z.enum([
                  "partner_website",
                  "mall_website",
                  "platform_campaign",
                ]),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
export const merchantIdentity = (name: string) =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const socialHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
  "x.com",
  "twitter.com",
  "t.me",
]);
const discoveryHosts = new Set([
  "singaporefoodie.com",
  "www.singaporefoodie.com",
  "eatbook.sg",
  "www.eatbook.sg",
  "greatdeals.com.sg",
  "www.greatdeals.com.sg",
]);
const unknown: Classification = {
  authority: "unknown",
  kind: "unknown_web",
  merchantMatch: "unknown",
};
export function classifySource(
  value: string,
  merchant: string,
  registry: SourceRegistry,
): Classification {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ...unknown };
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    return { ...unknown };
  const hostname = url.hostname;
  const account = url.pathname.split("/")[1]?.toLowerCase();
  if (hostname === "t.me" && ["sgfooddeals", "tastesoulsg"].includes(account))
    return {
      authority: "discovery",
      kind: "telegram_feed",
      merchantMatch: "not_applicable",
    };
  if (discoveryHosts.has(hostname))
    return {
      authority: "discovery",
      kind: "deal_aggregator",
      merchantMatch: "not_applicable",
    };
  const entry = registry.merchants[merchantIdentity(merchant)];
  if (!entry) return { ...unknown };
  if (socialHosts.has(hostname)) {
    if (
      entry.primarySocialAccounts.some(
        (a) => a.host === hostname && a.account === account,
      )
    )
      return {
        authority: "primary",
        kind: "merchant_social",
        merchantMatch: "confirmed_registry",
      };
    return { ...unknown };
  }
  if (entry.primaryDomains.includes(hostname))
    return {
      authority: "primary",
      kind: "merchant_website",
      merchantMatch: "confirmed_registry",
    };
  const secondary = entry.secondaryDomains.find((d) => d.host === hostname);
  if (secondary)
    return {
      authority: "strong_secondary",
      kind: secondary.kind,
      merchantMatch: "confirmed_registry",
    };
  return { ...unknown };
}
