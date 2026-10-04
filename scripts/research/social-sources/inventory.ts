import { load } from "cheerio";
import { socialContentKey } from "./resolution";
import { z } from "zod";
import { createHash } from "node:crypto";
import { normalizeIdentity } from "../../../src/ingestion/resolution/outlets";
import { instagramIdentity } from "../../../src/ingestion/direct-sources/source-scope";
import type { AuditResult } from "../source-origin-audit/types";

export const platformSchema = z.enum(["instagram", "facebook", "tiktok"]);
export type SocialPlatform = z.infer<typeof platformSchema>;
export const authorityReviewSchema = z.object({
  version: z.literal(1),
  entries: z.array(
    z.object({
      merchant: z.string().min(1),
      platform: platformSchema,
      account: z.string().min(1),
      authority: z.enum(["verified", "probable", "unverified", "contradicted"]),
      evidence_urls: z.array(z.url()),
      evidence_note: z.string().min(1),
      official_url: z.url(),
      controlled_merchant: z.string().min(1),
      control_evidence_refs: z.array(z.string()),
      capture_file: z.string(),
      capture_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      frozen_signal_ids: z.array(z.string()),
      variation: z.array(z.string()),
    }),
  ),
});
export type AuthorityReview = z.infer<typeof authorityReviewSchema>;
export interface BacklinkCapture {
  url: string;
  body: string;
  sha256: string;
  status: number;
}
export function socialIdentity(
  value: string,
): { platform: SocialPlatform; account: string | null } | null {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    /%|\\/.test(u.pathname)
  )
    return null;
  const host = u.hostname.replace(/^www\./, ""),
    p = u.pathname.split("/").filter(Boolean);
  if (host === "instagram.com") {
    const id = instagramIdentity(value);
    return id ? { platform: "instagram", account: id.account } : null;
  }
  if (host === "tiktok.com") {
    if (p.length === 1 || (p.length === 3 && ["video", "photo"].includes(p[1])))
      if (/^@[a-zA-Z0-9._]+$/.test(p[0]))
        return { platform: "tiktok", account: p[0].slice(1).toLowerCase() };
  }
  if (host === "facebook.com") {
    if (
      p.length === 1 &&
      p[0] === "profile.php" &&
      /^\d+$/.test(u.searchParams.get("id") ?? "") &&
      [...u.searchParams.keys()].every((k) => k === "id")
    )
      return { platform: "facebook", account: u.searchParams.get("id")! };
    if (["share", "reel", "watch", "photo.php", "story.php"].includes(p[0]))
      return { platform: "facebook", account: null };
    if (
      (p.length === 1 ||
        (p.length === 3 && ["posts", "videos", "reel"].includes(p[1]))) &&
      /^[a-zA-Z0-9.]+$/.test(p[0]) &&
      ![
        "unsupportedbrowser",
        "login",
        "groups",
        "sharer.php",
        "dialog",
        "pages",
        "profile.php",
      ].includes(p[0])
    )
      return { platform: "facebook", account: p[0].toLowerCase() };
  }
  return null;
}
export function verifySocialOwnership(
  entry: AuthorityReview["entries"][number],
  review: AuthorityReview,
  captures: ReadonlyMap<string, BacklinkCapture>,
) {
  const sameAccount = review.entries.filter(
    (e) => e.platform === entry.platform && e.account === entry.account,
  );
  if (
    sameAccount.some(
      (e) =>
        normalizeIdentity(e.merchant) !== normalizeIdentity(entry.merchant) ||
        e.authority === "contradicted",
    )
  )
    return {
      ownership: "unverified" as const,
      blockers: ["conflicting_ownership_evidence"],
    };
  const capture = captures.get(entry.capture_file);
  const official = new URL(entry.official_url);
  if (
    entry.authority !== "verified" ||
    normalizeIdentity(entry.controlled_merchant) !==
      normalizeIdentity(entry.merchant) ||
    !entry.control_evidence_refs.length ||
    official.protocol !== "https:" ||
    official.username ||
    official.password ||
    official.port ||
    socialIdentity(official.href) ||
    ["t.me", "www.google.com", "google.com", "www.bing.com"].includes(
      official.hostname,
    ) ||
    !capture ||
    capture.status !== 200 ||
    capture.url !== official.href ||
    capture.sha256 !== entry.capture_sha256 ||
    createHash("sha256").update(capture.body).digest("hex") !==
      entry.capture_sha256 ||
    !entry.evidence_urls.includes(official.href)
  )
    return {
      ownership: "unverified" as const,
      blockers: ["ownership_unverified"],
    };
  const $ = load(capture.body);
  const exact = $("a[href]")
    .toArray()
    .some((a) => {
      try {
        const link = new URL($(a).attr("href")!, official);
        // Upgrade only an exact public profile hyperlink, preserving its platform/account.
        if (
          link.protocol === "http:" &&
          [
            "instagram.com",
            "www.instagram.com",
            "facebook.com",
            "www.facebook.com",
          ].includes(link.hostname)
        )
          link.protocol = "https:";
        const id = socialIdentity(link.href);
        return id?.platform === entry.platform && id.account === entry.account;
      } catch {
        return false;
      }
    });
  return exact
    ? { ownership: "verified" as const, blockers: [] }
    : {
        ownership: "unverified" as const,
        blockers: ["exact_official_backlink_missing"],
      };
}
export interface SocialAccountCandidate {
  merchant: string;
  normalized_merchant: string;
  platform: SocialPlatform;
  account: string;
  ownership: "verified" | "unverified";
  blockers: string[];
  evidence_refs: string[];
  signal_ids: string[];
  canonical_candidate_urls: string[];
  transport_final_urls: string[];
  content_association: "account_scoped" | "independently_verified" | "unproven";
}
export interface SocialSignalIdentityReview {
  merchant: string;
  evidence_refs: string[];
}
export function buildSocialInventory(input: {
  audit: AuditResult;
  review: AuthorityReview;
  captures: ReadonlyMap<string, BacklinkCapture>;
  merchantKeys: ReadonlySet<string>;
  signalIdentities?: Record<string, SocialSignalIdentityReview>;
  contentBindings?: readonly {
    url: string;
    platform?: SocialPlatform;
    account: string;
    evidence_refs: string[];
  }[];
  provenance: unknown;
}) {
  const candidates = new Map<string, SocialAccountCandidate>();
  const ownershipCache = new Map<
    AuthorityReview["entries"][number],
    ReturnType<typeof verifySocialOwnership>
  >();
  const ownershipFor = (entry: AuthorityReview["entries"][number]) => {
    const cached = ownershipCache.get(entry);
    if (cached) return cached;
    const result = verifySocialOwnership(entry, input.review, input.captures);
    ownershipCache.set(entry, result);
    return result;
  };
  const unscoped: {
    signal_id: string;
    merchant: string | null;
    platform: SocialPlatform;
    canonical_candidate_url: string;
    transport_final_url: string | null;
    reason: string;
  }[] = [];
  const exclusions: {
    signal_id: string;
    url: string | null;
    reason: string;
  }[] = [];
  const socialRecords = input.audit.records.filter(
    (r) => r.destination_class === "official_social_candidate",
  );
  for (const r of socialRecords) {
    if (r.association !== "offer" || r.signal_class !== "promotion_signal") {
      exclusions.push({
        signal_id: r.signal_id,
        url: r.canonical_candidate_url,
        reason: "context_or_non_promotion_discovery",
      });
      continue;
    }
    const id = r.canonical_candidate_url
      ? socialIdentity(r.canonical_candidate_url)
      : null;
    if (!id) {
      exclusions.push({
        signal_id: r.signal_id,
        url: r.canonical_candidate_url,
        reason: "unsupported_identity_path",
      });
      continue;
    }
    const label =
      input.signalIdentities?.[r.signal_id]?.merchant ?? r.merchant_hint;
    const key = normalizeIdentity(label);
    const merchant = label && input.merchantKeys.has(key) ? label : null;
    if (!merchant) {
      exclusions.push({
        signal_id: r.signal_id,
        url: r.canonical_candidate_url,
        reason: "merchant_identity_unresolved",
      });
      continue;
    }
    const reviews = input.review.entries.filter(
      (e) =>
        normalizeIdentity(e.merchant) === key &&
        e.platform === id.platform &&
        (!e.frozen_signal_ids.length ||
          e.frozen_signal_ids.includes(r.signal_id)),
    );
    // A verified profile backlink establishes an account candidate, never ownership of an accountless post.
    const binding = input.contentBindings?.find(
      (b) =>
        (b.platform ?? "instagram") === id.platform &&
        socialContentKey(b.url) !== null &&
        socialContentKey(b.url) ===
          socialContentKey(r.canonical_candidate_url!) &&
        b.evidence_refs.length &&
        reviews.some((e) => e.account === b.account),
    );
    const accounts = id.account
      ? [id.account]
      : binding
        ? [binding.account]
        : [...new Set(reviews.map((e) => e.account))];
    if (!id.account && !binding)
      unscoped.push({
        signal_id: r.signal_id,
        merchant,
        platform: id.platform,
        canonical_candidate_url: r.canonical_candidate_url!,
        transport_final_url: r.transport_final_url,
        reason: "post_account_association_unproven",
      });
    for (const account of accounts) {
      const review = reviews.find((e) => e.account === account);
      const ownership = review
        ? ownershipFor(review)
        : {
            ownership: "unverified" as const,
            blockers: ["ownership_unverified"],
          };
      const compound = JSON.stringify([key, id.platform, account]);
      const row = candidates.get(compound) ?? {
        merchant: review?.merchant ?? merchant,
        normalized_merchant: key,
        platform: id.platform,
        account,
        ...ownership,
        evidence_refs: review
          ? [
              review.official_url,
              review.capture_file,
              ...review.control_evidence_refs,
            ]
          : [],
        signal_ids: [],
        canonical_candidate_urls: [],
        transport_final_urls: [],
        content_association: id.account
          ? ("account_scoped" as const)
          : binding
            ? ("independently_verified" as const)
            : ("unproven" as const),
      };
      row.signal_ids.push(r.signal_id);
      row.canonical_candidate_urls.push(r.canonical_candidate_url!);
      if (binding) row.evidence_refs.push(...binding.evidence_refs);
      if (r.transport_final_url)
        row.transport_final_urls.push(r.transport_final_url);
      candidates.set(compound, row);
    }
  }
  // An exact independent backlink can create a profile track without claiming old post identity.
  for (const entry of input.review.entries) {
    const key = normalizeIdentity(entry.merchant);
    if (!input.merchantKeys.has(key)) continue;
    const compound = JSON.stringify([key, entry.platform, entry.account]);
    if (candidates.has(compound)) continue;
    const ownership = ownershipFor(entry);
    candidates.set(compound, {
      merchant: entry.merchant,
      normalized_merchant: key,
      platform: entry.platform,
      account: entry.account,
      ...ownership,
      evidence_refs: [
        entry.official_url,
        entry.capture_file,
        ...entry.control_evidence_refs,
      ],
      signal_ids: [],
      canonical_candidate_urls: [
        entry.platform === "instagram"
          ? `https://www.instagram.com/${entry.account}/`
          : entry.platform === "facebook"
            ? `https://www.facebook.com/profile.php?id=${entry.account}`
            : `https://www.tiktok.com/@${entry.account}`,
      ],
      transport_final_urls: [],
      content_association: "unproven",
    });
  }
  const accounts = [...candidates.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([, r]) => ({
      ...r,
      account_result:
        r.ownership === "verified"
          ? "exact_account_verified"
          : r.blockers.includes("conflicting_ownership_evidence")
            ? "contradictory_identity"
            : "exact_account_unverified",
      signal_ids: [...new Set(r.signal_ids)].sort(),
      canonical_candidate_urls: [...new Set(r.canonical_candidate_urls)].sort(),
      transport_final_urls: [...new Set(r.transport_final_urls)].sort(),
      evidence_refs: [...new Set(r.evidence_refs)].sort(),
    }));
  const distinct = (platform: SocialPlatform, ownership?: string) =>
    new Set(
      accounts
        .filter(
          (a) =>
            a.platform === platform &&
            (!ownership || a.ownership === ownership),
        )
        .map((a) => a.account),
    ).size;
  const sortRecords = <T extends { signal_id: string }>(rows: T[]) =>
    rows.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b), "en"),
    );
  return {
    version: 1,
    provenance: input.provenance,
    summary: {
      merchants_with_social_candidates: new Set([
        ...accounts.map((a) => a.normalized_merchant),
        ...unscoped.map((r) => normalizeIdentity(r.merchant!)),
      ]).size,
      exact_account_candidates: new Set(
        accounts.map((a) => `${a.platform}:${a.account}`),
      ).size,
      instagram_account_candidates: distinct("instagram"),
      verified_instagram_accounts: distinct("instagram", "verified"),
      unverified_instagram_accounts: distinct("instagram", "unverified"),
      account_unresolved_content_records: unscoped.length,
      excluded_records: exclusions.length,
    },
    accounts,
    account_unresolved_content: sortRecords(unscoped),
    excluded_records: sortRecords(exclusions),
  };
}
export type SocialInventory = ReturnType<typeof buildSocialInventory>;
