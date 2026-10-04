import type { DirectSourceDefinition } from "../../../src/ingestion/direct-sources/types";
import type { DirectAudit } from "../direct-source-audit/model";
import { hasRecordedDirectOwnership } from "../../../src/ingestion/direct-sources/types";
import { deriveProgress, trackLabel, type SourceTrack } from "./progress";
import { canonicalIdentity, type CanonicalAlias } from "./identity";
import { assessmentTrack, type WebAssessment } from "./assessments";
import type { SocialInventory } from "../social-sources/inventory";
export interface HistoricalOffer {
  merchant: string;
  sourceUrl: string;
  offerId: string;
  offer: boolean;
  evidenceRef: string;
}
export interface IdentityReview {
  merchant: string;
  operator: string;
  evidence_refs: string[];
}
/** Current negative research evidence; never creates a production source or adapter. */
export interface BlockedMerchantAssessment {
  merchant: string;
  operator: string;
  ownership: "verified" | "probable" | "unverified";
  blockers: string[];
  evidenceRefs: string[];
}
export interface MapReview {
  signal_identities: Record<string, IdentityReview>;
  source_blockers: Record<string, string[]>;
  source_status?: Record<
    string,
    {
      enumeration: string;
      extraction: string;
      family: string;
      evidence_refs: string[];
    }
  >;
  unresolved_labels?: string[];
}
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();
const tally = (values: string[]) =>
  Object.fromEntries(
    sorted(values).map((v) => [v, values.filter((s) => s === v).length]),
  );
export function buildMerchantMap(input: {
  historical: HistoricalOffer[];
  audit: DirectAudit;
  registry: readonly DirectSourceDefinition[];
  review: MapReview;
  provenance: unknown;
  blockedAssessments?: readonly BlockedMerchantAssessment[];
  aliases?: readonly CanonicalAlias[];
  webAssessments?: readonly WebAssessment[];
  socialInventory?: SocialInventory;
  socialAssessments?: readonly {
    account: string;
    platform: "instagram";
    blockers: string[];
    evidence_refs: string[];
  }[];
}) {
  const identity = (label: string) => canonicalIdentity(label, input.aliases);
  const groups = new Map<
    string,
    {
      labels: Set<string>;
      sources: Set<string>;
      offers: Set<string>;
      refs: Set<string>;
    }
  >();
  const unresolved: HistoricalOffer[] = [];
  function group(label: string) {
    const key = identity(label);
    let row = groups.get(key);
    if (!row) {
      row = {
        labels: new Set(),
        sources: new Set(),
        offers: new Set(),
        refs: new Set(),
      };
      groups.set(key, row);
    }
    row.labels.add(label);
    return row;
  }
  for (const record of input.historical) {
    if (
      !record.merchant.trim() ||
      input.review.unresolved_labels?.includes(record.merchant) ||
      /\(https?\b|\[Unsupported|^Support Jalan Besar/i.test(record.merchant)
    ) {
      unresolved.push(record);
      continue;
    }
    const row = group(record.merchant.trim());
    row.sources.add(record.sourceUrl);
    row.refs.add(record.evidenceRef);
    if (record.offer) row.offers.add(record.offerId);
  }
  // Registry and reviewed direct evidence may introduce rows with zero historical signals.
  for (const source of input.registry) group(source.publicationPolicy.merchant);
  for (const r of input.audit.records) {
    const id = input.review.signal_identities[r.signal_id];
    if (id) group(id.merchant);
  }
  const merchants = [...groups]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([key, historical]) => {
      const observations = input.audit.records.filter(
        (r) =>
          identity(
            input.review.signal_identities[r.signal_id]?.merchant ??
              r.merchant_hint,
          ) === key,
      );
      // A parent adapter can be shown for a brand only by explicit captured brand linkage.
      const sources = input.registry.filter(
        (s) =>
          identity(s.publicationPolicy.merchant) === key ||
          observations.some(
            (r) =>
              s.id === "paradise_group_sg" &&
              r.candidate_domain === "paradisegp.com",
          ),
      );
      // Legacy scalar fields retain a representative direct source; tracks are canonical.
      const source = [...sources].sort(
        (a, b) =>
          Number(b.publicationPolicy.enabled) -
            Number(a.publicationPolicy.enabled) || a.id.localeCompare(b.id),
      )[0];
      const reviewedAliases =
        input.aliases?.filter((a) => identity(a.canonical) === key) ?? [];
      const alias = reviewedAliases[0];
      const assessment = input.webAssessments?.find(
        (a) => identity(a.merchant) === key,
      );
      const merchant =
        source && identity(source.publicationPolicy.merchant) === key
          ? source.publicationPolicy.merchant
          : (alias?.canonical ?? sorted(historical.labels)[0]);
      const blocked = !source
        ? input.blockedAssessments?.find((r) => identity(r.merchant) === key)
        : undefined;
      const currentStatus = source
        ? input.review.source_status?.[source.id]
        : undefined;
      const families = sorted([
        ...observations.map((r) => r.adapter_pattern_key),
        ...(currentStatus ? [currentStatus.family] : []),
        ...(assessment ? [assessment.family] : []),
      ]);
      const status = <
        K extends "ownership_status" | "enumerable" | "extraction_feasibility",
      >(
        k: K,
      ) => {
        const values = sorted(observations.map((r) => r[k]));
        return values.length === 0
          ? "unknown"
          : values.length === 1
            ? values[0]
            : "mixed";
      };
      const enabled =
        !!source?.publicationPolicy.enabled &&
        hasRecordedDirectOwnership(source);
      // The frozen audit remains historical evidence; a recorded registry activation
      // review supplies current blockers without rewriting those frozen inputs.
      const blockers = sorted(
        blocked
          ? blocked.blockers
          : assessment && !source
            ? assessment.blockers
            : source?.activationReview
              ? source.activationReview.blockers
              : [
                  ...observations.flatMap((r) => r.review_reasons),
                  ...(source
                    ? (input.review.source_blockers[source.id] ?? [])
                    : []),
                  ...(!source && !observations.length
                    ? ["no_captured_direct_source_assessment"]
                    : []),
                ],
      );
      const sourceTracks: SourceTrack[] = sources.map((s) => {
        const current = input.review.source_status?.[s.id];
        const enabled =
          s.publicationPolicy.enabled && hasRecordedDirectOwnership(s);
        const enumeration =
          s.activationReview?.enumeration ??
          (current?.enumeration === "yes"
            ? "complete"
            : (current?.enumeration ?? "unknown"));
        return {
          kind: s.sourceKind ?? "merchant_web",
          platform: s.socialScope?.platform ?? null,
          source_id: s.id,
          account: s.socialScope?.account ?? null,
          operator: s.operator,
          urls: [...s.listingUrls].sort(),
          ownership: s.authority.ownership,
          enumeration,
          extraction:
            current?.extraction ?? assessment?.extraction ?? "not_assessed",
          adapter: s.adapter,
          adapter_status: enabled ? "enabled" : "shadow",
          activation_status: enabled ? "enabled" : "shadow",
          stage: enabled
            ? "production_enabled"
            : enumeration === "complete" && hasRecordedDirectOwnership(s)
              ? "acquisition_complete"
              : "adapter_shadow",
          publication_enabled: s.publicationPolicy.enabled,
          auto_publish: s.publicationPolicy.autoPublish,
          autonomous_acquisition_enabled: enabled,
          review_incomplete_candidates: enabled,
          blockers: sorted(
            s.activationReview?.blockers ??
              input.review.source_blockers[s.id] ??
              observations.flatMap((r) => r.review_reasons),
          ),
          evidence_refs: sorted([
            s.authority.review,
            ...s.authority.evidenceUrls,
            ...(s.activationReview?.evidenceRefs ?? []),
            ...(current?.evidence_refs ?? []),
          ]),
        };
      });
      if (assessment && !assessment.adapter_source_id)
        sourceTracks.push(assessmentTrack(assessment));
      if (blocked)
        sourceTracks.push({
          kind: "merchant_web",
          platform: null,
          source_id: null,
          account: null,
          operator: blocked.operator,
          urls: sorted(observations.map((r) => r.candidate_url)),
          ownership: blocked.ownership,
          enumeration: "partial",
          extraction: "not_assessed",
          adapter: null,
          adapter_status: "none",
          activation_status: "blocked",
          stage: "blocked",
          publication_enabled: false,
          auto_publish: false,
          autonomous_acquisition_enabled: false,
          review_incomplete_candidates: false,
          blockers: sorted(blocked.blockers),
          evidence_refs: sorted(blocked.evidenceRefs),
        });
      for (const o of observations) {
        if (
          sourceTracks.some((t) =>
            t.urls.some(
              (u) =>
                new URL(u).hostname.replace(/^www\./, "") ===
                o.candidate_domain.replace(/^www\./, ""),
            ),
          )
        )
          continue;
        sourceTracks.push({
          kind:
            o.destination_class === "issuer_or_platform_candidate" ||
            o.destination_class === "app_or_deep_link"
              ? "issuer_platform"
              : "merchant_web",
          platform: null,
          source_id: null,
          account: null,
          operator: null,
          urls: [o.candidate_url],
          ownership: o.ownership_status,
          enumeration: o.enumerable === "yes" ? "complete" : o.enumerable,
          extraction: o.extraction_feasibility,
          adapter: null,
          adapter_status: "none",
          activation_status: "candidate",
          stage:
            o.ownership_status === "verified"
              ? "ownership_verified"
              : "discovered",
          publication_enabled: false,
          auto_publish: false,
          autonomous_acquisition_enabled: false,
          review_incomplete_candidates: false,
          blockers: sorted(o.review_reasons),
          evidence_refs: sorted([
            o.candidate_url,
            ...o.evidence_ids.map(
              (id) => `${input.audit.provenance.evidence_file}#${id}`,
            ),
          ]),
        });
      }
      for (const a of input.socialInventory?.accounts.filter(
        (a) => identity(a.merchant) === key,
      ) ?? []) {
        const assessment = input.socialAssessments?.find(
          (s) => s.platform === a.platform && s.account === a.account,
        );
        const blocked =
          a.ownership === "verified" &&
          !!assessment?.blockers.length &&
          !!assessment.evidence_refs.length;
        sourceTracks.push({
          kind: "merchant_social",
          platform: a.platform,
          source_id: null,
          account: a.account,
          operator: null,
          urls: sorted(a.canonical_candidate_urls),
          ownership: a.ownership,
          enumeration: blocked ? "blocked" : "not_assessed",
          extraction: "not_assessed",
          adapter: null,
          adapter_status: "none",
          activation_status: blocked ? "blocked" : "candidate",
          stage: blocked
            ? "blocked"
            : a.ownership === "verified"
              ? "ownership_verified"
              : "discovered",
          publication_enabled: false,
          auto_publish: false,
          autonomous_acquisition_enabled: false,
          review_incomplete_candidates: false,
          blockers: sorted([
            ...a.blockers,
            ...(assessment?.blockers ?? []),
            ...(a.content_association === "unproven"
              ? ["post_account_association_unproven"]
              : []),
          ]),
          evidence_refs: sorted([
            ...a.evidence_refs,
            ...(assessment?.evidence_refs ?? []),
          ]),
        });
      }
      for (const a of input.socialInventory?.account_unresolved_content.filter(
        (a) => identity(a.merchant!) === key,
      ) ?? []) {
        if (
          sourceTracks.some(
            (t) =>
              t.platform === a.platform &&
              t.urls.includes(a.canonical_candidate_url) &&
              !t.blockers.includes("post_account_association_unproven"),
          )
        )
          continue;
        sourceTracks.push({
          kind: "merchant_social",
          platform: a.platform,
          source_id: null,
          account: null,
          operator: null,
          urls: [a.canonical_candidate_url],
          ownership: "unverified",
          enumeration: "not_assessed",
          extraction: "not_assessed",
          adapter: null,
          adapter_status: "none",
          activation_status: "candidate",
          stage: "discovered",
          publication_enabled: false,
          auto_publish: false,
          autonomous_acquisition_enabled: false,
          review_incomplete_candidates: false,
          blockers: ["exact_account_unresolved", "ownership_unverified"],
          evidence_refs: [a.canonical_candidate_url],
        });
      }
      sourceTracks.sort((a, b) =>
        JSON.stringify([
          a.kind,
          a.source_id,
          a.platform,
          a.account,
          a.urls,
        ]).localeCompare(
          JSON.stringify([b.kind, b.source_id, b.platform, b.account, b.urls]),
          "en",
        ),
      );
      const progress = deriveProgress(sourceTracks);
      return {
        merchant,
        normalized_merchant: key,
        merchant_labels: sorted(historical.labels),
        ...(alias
          ? {
              canonical_identity_review: {
                aliases: reviewedAliases.map((a) => ({
                  alias: a.alias,
                  canonical: a.canonical,
                  reason: a.reason,
                  capture_file: a.capture_file,
                  capture_sha256: a.capture_sha256,
                })),
                historical_signal_urls: sorted(historical.sources),
                historical_offer_ids: sorted(historical.offers),
              },
            }
          : {}),
        operator:
          source?.operator ?? blocked?.operator ?? assessment?.operator ?? null,
        operator_source_families: sorted(
          observations.map(
            (r) =>
              input.review.signal_identities[r.signal_id]?.operator ??
              "unknown",
          ),
        ),
        historical_signal_count: historical.sources.size,
        historical_offer_count: historical.offers.size,
        source_tracks: sourceTracks,
        ...progress,
        main_blocker: progress.autonomous_acquisition_enabled
          ? null
          : sourceTracks.some((t) =>
                t.blockers.includes("blocked_public_access"),
              )
            ? "blocked_public_access"
            : (sorted(sourceTracks.flatMap((t) => t.blockers))[0] ??
              blockers[0] ??
              null),
        observed_direct_domains: sorted(
          observations.map((r) => r.candidate_domain),
        ),
        observed_direct_candidate_count: new Set(
          observations.map((r) =>
            JSON.stringify([r.signal_id, r.candidate_url]),
          ),
        ).size,
        ownership_status:
          source?.authority.ownership ??
          blocked?.ownership ??
          assessment?.ownership ??
          status("ownership_status"),
        enumerability_status: source?.activationReview
          ? source.activationReview.enumeration === "complete"
            ? "yes"
            : "partial"
          : (currentStatus?.enumeration ??
            assessment?.enumeration ??
            status("enumerable")),
        historical_enumerability_status: status("enumerable"),
        extraction_status:
          currentStatus?.extraction ??
          assessment?.extraction ??
          status("extraction_feasibility"),
        adapter_status: source ? (enabled ? "enabled" : "shadow") : "none",
        direct_source_id: source?.id ?? null,
        source_family: families,
        publication_enabled: source?.publicationPolicy.enabled ?? false,
        autonomous_ingestion_status: enabled
          ? "enabled"
          : source
            ? "disabled_shadow"
            : "not_onboarded",
        known_blockers: blockers,
        evidence_refs: sorted([
          ...historical.refs,
          ...(assessment?.evidence_refs ?? []),
          ...(blocked?.evidenceRefs ?? []),
          ...(currentStatus?.evidence_refs ?? []),
          ...(source?.activationReview?.evidenceRefs ?? []),
          ...observations.flatMap((r) => [
            r.candidate_url,
            ...r.evidence_ids.map(
              (id) => `${input.audit.provenance.evidence_file}#${id}`,
            ),
            ...(input.review.signal_identities[r.signal_id]?.evidence_refs ??
              []),
          ]),
          ...(source
            ? [source.authority.review, ...source.authority.evidenceUrls]
            : []),
        ]),
        source_observations: observations
          .map((r) => ({
            candidate_url: r.candidate_url,
            domain: r.candidate_domain,
            ownership_status: r.ownership_status,
            enumerable: r.enumerable,
            extraction: r.extraction_feasibility,
            family: r.adapter_pattern_key,
            app_findings: r.app_findings,
          }))
          .sort((a, b) => a.candidate_url.localeCompare(b.candidate_url, "en")),
      };
    });
  const historicalMerchants = merchants.filter(
    (r) => r.historical_signal_count > 0,
  );
  const unresolvedRecords = [
    ...new Map(unresolved.map((r) => [r.offerId, r])).values(),
  ].sort((a, b) => a.offerId.localeCompare(b.offerId, "en"));
  const cohort = (predicate: (row: (typeof merchants)[number]) => boolean) =>
    historicalMerchants.filter(predicate).map((r) => r.merchant);
  return {
    version: 2,
    purpose:
      "Canonical generated merchant automation onboarding ledger; historical counts define discovery coverage, never production authority.",
    provenance: input.provenance,
    count_basis:
      "Signals count distinct source-post URLs per brand; offers count reviewed distinct offer identities. Latest captured signals for already reviewed source URLs do not add duplicate offers. Unresolved merchant labels retained separately.",
    summary: {
      merchant_count: merchants.length,
      distinct_adapter_counts: tally(
        sorted(input.registry.map((s) => s.adapter)).map((adapter) =>
          input.registry.some(
            (s) =>
              s.adapter === adapter &&
              s.publicationPolicy.enabled &&
              hasRecordedDirectOwnership(s),
          )
            ? "enabled"
            : "shadow",
        ),
      ),
      historical_merchant_count: merchants.filter(
        (r) => r.historical_signal_count > 0,
      ).length,
      registry_only_merchant_count: merchants.filter(
        (r) => !r.historical_signal_count,
      ).length,
      progress_counts: Object.fromEntries(
        [
          "auto_enabled",
          "shadow_only",
          "blocked",
          "source_candidate",
          "not_assessed",
        ].map((s) => [
          s,
          historicalMerchants.filter((r) => r.automation_progress === s).length,
        ]),
      ),
      auto_enabled_percentage: historicalMerchants.length
        ? Math.round(
            (10000 *
              historicalMerchants.filter(
                (r) => r.autonomous_acquisition_enabled,
              ).length) /
              historicalMerchants.length,
          ) / 100
        : 0,
      merchants_with_verified_instagram_candidate: historicalMerchants.filter(
        (r) =>
          r.source_tracks.some(
            (t) => t.platform === "instagram" && t.ownership === "verified",
          ),
      ).length,
      merchants_with_unverified_instagram_candidate: historicalMerchants.filter(
        (r) =>
          r.source_tracks.some(
            (t) => t.platform === "instagram" && t.ownership !== "verified",
          ),
      ).length,
      source_counts: {
        enabled_source_definitions: input.registry.filter(
          (s) => s.publicationPolicy.enabled && hasRecordedDirectOwnership(s),
        ).length,
        shadow_source_definitions: input.registry.filter(
          (s) => !s.publicationPolicy.enabled || !hasRecordedDirectOwnership(s),
        ).length,
        blocked_research_assessments:
          (input.blockedAssessments?.length ?? 0) +
          (input.webAssessments?.filter(
            (a) => !a.adapter_source_id && a.activation === "blocked",
          ).length ?? 0) +
          (input.socialAssessments?.filter((s) => s.blockers.length).length ??
            0),
        social_account_candidates:
          input.socialInventory?.summary.exact_account_candidates ?? 0,
      },
      adapter_status_counts: tally(merchants.map((r) => r.adapter_status)),
      autonomous_status_counts: tally(
        merchants.map((r) => r.autonomous_ingestion_status),
      ),
      source_family_counts: tally(merchants.flatMap((r) => r.source_family)),
      unresolved_record_count: unresolvedRecords.length,
    },
    cohorts: {
      already_auto_enabled: cohort(
        (r) => r.automation_progress === "auto_enabled",
      ),
      shadow_needs_one_blocker: cohort(
        (r) =>
          r.automation_progress === "shadow_only" &&
          r.source_tracks.some(
            (t) => t.adapter_status === "shadow" && t.blockers.length === 1,
          ),
      ),
      verified_social_needs_enumeration: cohort((r) =>
        r.source_tracks.some(
          (t) =>
            t.platform === "instagram" &&
            t.ownership === "verified" &&
            !t.autonomous_acquisition_enabled,
        ),
      ),
      unverified_social_candidate: cohort((r) =>
        r.source_tracks.some(
          (t) =>
            t.kind === "merchant_social" &&
            t.ownership !== "verified" &&
            t.activation_status === "candidate",
        ),
      ),
      direct_source_candidate_not_onboarded: cohort(
        (r) =>
          r.automation_progress === "source_candidate" &&
          r.source_tracks.some(
            (t) =>
              t.kind !== "merchant_social" &&
              t.activation_status === "candidate",
          ),
      ),
      blocked: cohort((r) => r.automation_progress === "blocked"),
      no_source_assessed: cohort(
        (r) => r.automation_progress === "not_assessed",
      ),
    },
    merchants,
    unresolved_records: unresolvedRecords,
  };
}
export type MerchantMap = ReturnType<typeof buildMerchantMap>;
export function reports(map: MerchantMap) {
  const firstHeaders = Object.keys(map.merchants[0] ?? {});
  const headers = [
    ...firstHeaders,
    ...sorted(
      map.merchants
        .flatMap((r) => Object.keys(r))
        .filter((k) => !firstHeaders.includes(k)),
    ),
  ];
  const csv = (v: unknown) =>
    `"${(typeof v === "string" ? v : (JSON.stringify(v) ?? "")).replace(/"/g, '""')}"`;
  const reportCsv =
    [
      headers.join(","),
      ...map.merchants.map((r) =>
        headers.map((h) => csv(r[h as keyof typeof r])).join(","),
      ),
    ].join("\n") + "\n";
  const md = [
    "# Merchant automation progress",
    "",
    map.purpose,
    "",
    "```json",
    JSON.stringify(map.summary, null, 2),
    "```",
    "",
    "Signals are post identities, not authority or automatic priority. Unknown source evidence stays unknown. Brands and source families remain separate.",
    "",
    "Coverage percentages use positive historical TG signal counts only. Registry-only rows are shown separately. Source definitions and adapters are counted independently. Auto means production acquisition; complete-candidate publication and incomplete-candidate review remain separate JSON/CSV flags.",
    "",
    "| Merchant | TG Signals | TG Offers | Progress | Auto? | Web | Instagram | Other Source | Ownership | Main Blocker | Next Action |",
    "| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...map.merchants.map(
      (r) =>
        `| ${r.merchant.replace(/\|/g, "\\|")} | ${r.historical_signal_count} | ${r.historical_offer_count} | ${r.automation_progress}${r.historical_signal_count ? "" : " (registry-only)"} | ${r.autonomous_acquisition_enabled ? "yes" : "no"} | ${
          r.source_tracks
            .filter((t) => t.kind === "merchant_web")
            .map(trackLabel)
            .join("; ") || "none"
        } | ${
          r.source_tracks
            .filter((t) => t.platform === "instagram")
            .map((t) => `${t.account ?? "account unknown"}: ${trackLabel(t)}`)
            .join("; ") || "none"
        } | ${
          r.source_tracks
            .filter(
              (t) =>
                t.kind === "issuer_platform" ||
                (t.platform && t.platform !== "instagram"),
            )
            .map((t) => `${t.platform ?? "issuer/platform"}: ${trackLabel(t)}`)
            .join("; ") || "-"
        } | ${sorted(r.source_tracks.map((t) => t.ownership)).join("; ") || "unknown"} | ${(r.main_blocker ?? "-").replace(/\|/g, "\\|")} | ${r.next_action} |`,
    ),
    "",
    "## Next-action cohorts",
    "",
    ...Object.entries(map.cohorts).map(
      ([name, rows]) =>
        `- ${name} (${rows.length}): ${rows.join("; ") || "none"}`,
    ),
    "",
    "## Registry-only merchants",
    "",
    ...map.merchants
      .filter((r) => !r.historical_signal_count)
      .map(
        (r) =>
          `- ${r.merchant}: ${r.automation_progress}; excluded from historical TG denominator.`,
      ),
    "",
    "## Frozen inputs",
    "",
    ...map.merchants
      .filter((r) => r.canonical_identity_review)
      .map(
        (r) =>
          `Reviewed canonical identity: ${r.canonical_identity_review!.aliases.map((a) => `${a.alias} → ${a.canonical}`).join("; ")}. All labels, exact historical signal URLs and offer IDs remain on the canonical JSON/CSV row; evidence is checked by docs/research/merchant-identity-review.json.`,
      ),
    "",
    "```json",
    JSON.stringify(map.provenance, null, 2),
    "```",
    "",
    `Unresolved historical records: ${map.unresolved_records.length}. Their labels remain in merchants.json rather than being guessed into brands.`,
    "",
  ].join("\n");
  return {
    "merchants.json": JSON.stringify(map, null, 2) + "\n",
    "report.md": md,
    "report.csv": reportCsv,
  };
}
