import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  authorityReviewSchema,
  buildSocialInventory,
  type BacklinkCapture,
  type SocialSignalIdentityReview,
} from "./inventory";
import { resolvePublicAccount, socialContentKey } from "./resolution";
import { assessInstagramCapture, assessSocialCaption } from "./assessment";
import type { AuditResult } from "../source-origin-audit/types";
import { instagramIdentity } from "../../../src/ingestion/direct-sources/source-scope";

export const socialResearchInputs = {
  audit:
    ".local/source-origin-audit/2026-09-30-social-corrected-offline/audit.json",
  authority: "docs/research/social-source-authority-review.json",
  officialCaptures:
    "tests/fixtures/social-sources/official-2026-10-02-network/manifest.json",
  publicCaptures:
    "tests/fixtures/social-sources/instagram-2026-10-02/manifest.json",
} as const;
const manifestSchema = z.object({
  version: z.literal(1),
  captures: z.array(
    z.object({
      url: z.url(),
      status: z.number().nullable(),
      file: z.string().nullable(),
      sha256: z.string().nullable(),
      bytes: z.number(),
      redirect_to: z.string().nullable(),
      error: z.string().nullable(),
    }),
  ),
});
const sha = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export async function readSocialResearch(
  root: string,
  merchantKeys: ReadonlySet<string>,
  signalIdentities: Record<string, SocialSignalIdentityReview>,
) {
  let authorityRaw: string;
  try {
    authorityRaw = await readFile(
      path.join(root, socialResearchInputs.authority),
      "utf8",
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const review = authorityReviewSchema.parse(JSON.parse(authorityRaw));
  const provenance: { file: string; sha256: string }[] = [
    { file: socialResearchInputs.authority, sha256: sha(authorityRaw) },
  ];
  async function captures(file: string) {
    const raw = await readFile(path.join(root, file), "utf8");
    provenance.push({ file, sha256: sha(raw) });
    const manifest = manifestSchema.parse(JSON.parse(raw));
    return Promise.all(
      manifest.captures.map(async (c) => {
        if (!c.file) return { ...c, body: "", capture_file: file };
        if (!/^[a-f0-9]{64}\.html$/.test(c.file))
          throw new Error("invalid_capture_path");
        const relative = path.join(path.dirname(file), c.file);
        const bytes = await readFile(path.join(root, relative));
        if (sha(bytes) !== c.sha256 || bytes.length !== c.bytes)
          throw new Error("capture_integrity_mismatch");
        provenance.push({ file: relative, sha256: sha(bytes) });
        return { ...c, body: bytes.toString("utf8"), capture_file: relative };
      }),
    );
  }
  const supplementalPath =
    "docs/changes/coverage-batch-2/social-capture-manifests.json";
  const supplementalRaw = await readFile(
    path.join(root, supplementalPath),
    "utf8",
  );
  const supplemental = z
    .object({
      version: z.literal(1),
      official: z.array(
        z.string().startsWith("tests/fixtures/coverage-batch-2/"),
      ),
      public: z.array(
        z.string().startsWith("tests/fixtures/coverage-batch-2/"),
      ),
    })
    .parse(JSON.parse(supplementalRaw));
  provenance.push({ file: supplementalPath, sha256: sha(supplementalRaw) });
  const official = (
    await Promise.all(
      [socialResearchInputs.officialCaptures, ...supplemental.official].map(
        captures,
      ),
    )
  ).flat();
  const publicPages = (
    await Promise.all(
      [socialResearchInputs.publicCaptures, ...supplemental.public].map(
        captures,
      ),
    )
  ).flat();
  const backlinkCaptures = new Map<string, BacklinkCapture>(
    official
      .filter((c) => c.sha256 !== null && c.status !== null)
      .map((c) => [
        c.capture_file,
        { url: c.url, body: c.body, sha256: c.sha256!, status: c.status! },
      ]),
  );
  const rawAudit = await readFile(
    path.join(root, socialResearchInputs.audit),
    "utf8",
  );
  provenance.push({ file: socialResearchInputs.audit, sha256: sha(rawAudit) });
  const audit = JSON.parse(rawAudit) as AuditResult;
  const accounts = [...review.entries].sort((a, b) =>
    a.account.localeCompare(b.account, "en"),
  );
  const probes = accounts
    .filter((e) => e.platform === "instagram")
    .map((e) => {
      const urls = new Set(
        audit.records
          .filter((r) => e.frozen_signal_ids.includes(r.signal_id))
          .map((r) => r.canonical_candidate_url)
          .filter(Boolean)
          .map((u) => instagramIdentity(u!)?.nativeId),
      );
      const pages = publicPages
        .filter((p) => {
          const id = instagramIdentity(p.url);
          return id?.kind === "profile"
            ? id.account === e.account
            : id && urls.has(id.nativeId);
        })
        .sort((a, b) => a.url.localeCompare(b.url, "en"));
      return {
        merchant: e.merchant,
        account: e.account,
        platform: "instagram" as const,
        variation: e.variation,
        probes: pages.map((p) => {
          const assessment = assessInstagramCapture(e.account, {
            url: p.url,
            status: p.status,
            body: p.body,
            redirectTo: p.redirect_to,
            error: p.error,
          });
          return {
            ...assessment,
            capture_file: p.capture_file,
            caption_semantics: assessSocialCaption({
              caption: assessment.public_caption,
              publishedAt: assessment.published_at,
              kind: assessment.content_kind === "reel" ? "reel" : "post",
              accountAssociationVerified:
                assessment.account_post_association === "verified",
            }),
          };
        }),
        acquisition_ready: false,
        enumeration_complete: false,
        production_enabled: false,
        blockers: [] as string[],
        evidence_refs: pages.map((p) => p.capture_file),
      };
    })
    .filter((account) => account.probes.length > 0);
  for (const account of probes)
    account.blockers = [
      ...new Set([
        "bounded_feed_boundary_unproven",
        "automated_access_permission_unestablished",
        ...account.probes.flatMap((p) => p.blockers),
      ]),
    ].sort();
  const instagramBindings = probes.flatMap((a) =>
    a.probes
      .filter((p) => p.account_post_association === "verified")
      .map((p) => ({
        url: p.requested_url,
        account: a.account,
        evidence_refs: [p.capture_file],
      })),
  );
  const resolutions = audit.records
    .filter(
      (r) =>
        r.destination_class === "official_social_candidate" &&
        r.association === "offer" &&
        r.signal_class === "promotion_signal" &&
        r.canonical_candidate_url,
    )
    .map((r) => {
      const candidateUrl = r.canonical_candidate_url!;
      const capture = publicPages.find(
        (p) =>
          socialContentKey(p.url) !== null &&
          socialContentKey(p.url) === socialContentKey(candidateUrl),
      );
      const result = resolvePublicAccount(
        candidateUrl,
        capture
          ? {
              url: capture.url,
              status: capture.status,
              body: capture.body,
              redirectTo: capture.redirect_to,
              error: capture.error,
            }
          : undefined,
      );
      const platform = candidateUrl.includes("instagram.com")
        ? ("instagram" as const)
        : candidateUrl.includes("facebook.com")
          ? ("facebook" as const)
          : ("tiktok" as const);
      return {
        signal_id: r.signal_id,
        merchant: signalIdentities[r.signal_id]?.merchant ?? r.merchant_hint,
        platform,
        canonical_candidate_url: candidateUrl,
        transport_final_url: r.transport_final_url,
        ...result,
        evidence_refs: capture ? [capture.capture_file] : [],
      };
    });
  const rawBindings: {
    url: string;
    account: string;
    platform?: "instagram" | "facebook" | "tiktok";
    evidence_refs: string[];
  }[] = [
    ...instagramBindings,
    ...resolutions
      .filter((r) => r.account && r.outcome === "exact_account_unverified")
      .map((r) => ({
        url: r.canonical_candidate_url,
        account: r.account!,
        platform: r.platform,
        evidence_refs: r.evidence_refs,
      })),
  ];
  const contentBindings = rawBindings.filter(
    (binding, index, all) =>
      all.findIndex(
        (other) =>
          (other.platform ?? "instagram") ===
            (binding.platform ?? "instagram") &&
          other.account === binding.account &&
          socialContentKey(other.url) === socialContentKey(binding.url),
      ) === index,
  );
  const inventory = buildSocialInventory({
    audit,
    review,
    captures: backlinkCaptures,
    merchantKeys,
    signalIdentities,
    contentBindings,
    provenance: [...provenance].sort((a, b) =>
      a.file.localeCompare(b.file, "en"),
    ),
  });
  // Verification claims fail closed; research cannot silently accept a broken checked review.
  for (const e of review.entries.filter((e) => e.authority === "verified"))
    if (
      !inventory.accounts.some(
        (a) =>
          a.account === e.account &&
          a.platform === e.platform &&
          a.ownership === "verified",
      )
    )
      throw new Error(`invalid_checked_social_authority:${e.account}`);
  return {
    socialInventory: {
      ...inventory,
      content_resolution: resolutions.map((r) => ({
        ...r,
        outcome:
          r.outcome === "exact_account_unverified" &&
          inventory.accounts.some(
            (a) =>
              a.platform === r.platform &&
              a.account === r.account &&
              a.ownership === "verified",
          )
            ? "exact_account_verified"
            : r.outcome,
      })),
    },
    socialAssessments: probes,
    acquisitionReview: {
      version: 1,
      provenance: inventory.provenance,
      accounts: probes,
      content_bindings: contentBindings,
      decision:
        "No runtime Instagram adapter/source enabled: exposed feed continuation and chronology are unproven; automated-access permission is not established.",
      adapter_created: false,
      social_sources_enabled: 0,
    },
  };
}
