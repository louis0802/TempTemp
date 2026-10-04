import { SourceRedirectCache } from "../../../src/ingestion/source-evidence/cache";
import { classifySource } from "../../../src/ingestion/source-evidence/registry";
import type { SourceLinkResolver } from "../../../src/ingestion/source-evidence/resolver";
import type {
  ResolvedSourceLink,
  SourceRegistry,
} from "../../../src/ingestion/source-evidence/types";
import {
  domain,
  candidateDestination,
  family,
  intermediate,
  isShortUrl,
  matchingReview,
  topology,
  type AuthorityReview,
} from "./classification";
import type { AuditRecord, AuditResult, AuditSignal } from "./types";

function counts(values: string[]) {
  const tally = new Map<string, number>();
  for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1);
  return Object.fromEntries(
    [...tally].sort(([a, n], [b, m]) => m - n || a.localeCompare(b)),
  );
}
export async function auditSignals(options: {
  selected: AuditSignal[];
  availablePosts: number;
  sample: number;
  registry: SourceRegistry;
  registryHash: string;
  review?: AuthorityReview;
  reviewHash?: string | null;
  cache: SourceRedirectCache;
  resolver?: SourceLinkResolver;
  inputMode?: "frozen_local" | "one_off_refresh";
}) {
  const { selected, cache, resolver, registry } = options;
  const review = options.review ?? { version: 1, entries: [] };
  const resolved = new Map<string, ResolvedSourceLink>();
  const records: AuditRecord[] = [];
  for (const { signal, post, signal_class, sampling_basis } of selected) {
    const links = signal.outboundLinks.length ? signal.outboundLinks : [null];
    for (const link of links) {
      let result: ResolvedSourceLink = {
        originalUrl: link?.normalizedUrl ?? "",
        finalUrl: null,
        redirectChain: [],
        checkedAt: null,
        status: "unresolved",
        reason:
          signal_class === "non_offer_signal"
            ? "non_offer_excluded_from_resolution"
            : "no_outbound_source_signal",
        httpStatus: null,
      };
      if (link && signal_class === "promotion_signal") {
        if (!resolved.has(link.normalizedUrl))
          resolved.set(
            link.normalizedUrl,
            await cache.resolve(link.normalizedUrl, resolver),
          );
        result = resolved.get(link.normalizedUrl)!;
      }
      const transportFinal =
        result.status === "resolved" ? result.finalUrl : null;
      const candidate = candidateDestination(
        transportFinal,
        result.redirectChain,
      );
      const final = candidate.url;
      // A blocked app scheme is visible as topology while remaining unresolved.
      const blockedApp =
        result.reason === "unsupported_scheme"
          ? result.redirectChain.at(-1)
          : null;
      const kind = final
        ? topology(final)
        : blockedApp
          ? topology(blockedApp)
          : "unknown";
      const classification = classifySource(
        final ?? "",
        signal.merchantHint,
        registry,
      );
      const confirmed =
        final && !intermediate(kind)
          ? matchingReview(final, signal.merchantHint, review)
          : undefined;
      const authority = confirmed?.authority ?? classification.authority;
      const verified =
        authority === "primary" || authority === "strong_secondary";
      let status: AuditRecord["source_origin_status"] = "unresolved";
      const reasons = [...signal.issues];
      if (sampling_basis === "explicit_post_promotional_intent_requires_review")
        reasons.push(sampling_basis);
      if (signal_class === "non_offer_signal") status = "non_offer_signal";
      else if (!link) status = "no_outbound_source_signal";
      else if (final) {
        status = intermediate(kind)
          ? "intermediate"
          : kind === "unknown"
            ? "unknown_destination"
            : verified
              ? "authoritative_candidate"
              : "needs_authority_review";
        if (kind === "publisher" || kind === "deal_aggregator")
          reasons.push("publisher_requires_deeper_resolution");
        else if (intermediate(kind))
          reasons.push("intermediate_requires_deeper_resolution");
        else if (!verified) reasons.push("authority_ownership_unverified");
        if (kind === "merchant_web_candidate")
          reasons.push("merchant_topology_provisional");
      } else if (transportFinal) {
        status = "unknown_destination";
        reasons.push(candidate.basis);
      } else if (link && signal_class === "promotion_signal")
        reasons.push(result.reason ?? "resolution_failed");
      if (link?.association === "source_post")
        reasons.push("offer_link_relevance_requires_review");
      const hops = result.redirectChain.map((url) => ({
        url,
        destination_class: topology(url),
        role:
          final && url === final
            ? intermediate(kind)
              ? "intermediate_source"
              : "source_candidate"
            : url === transportFinal && candidate.url !== transportFinal
              ? "transport_fallback"
              : "intermediate_source",
      }));
      records.push({
        signal_id: signal.id,
        channel: post.channel,
        telegram_message_id: post.message_id,
        telegram_url: signal.sourcePostUrl,
        published_at: post.published_at,
        input_mode: post.input_mode,
        signal_class,
        merchant_hint: signal.merchantHint,
        title_hint: signal.titleHint || post.text.split("\n")[0].trim(),
        benefit_hint: signal.benefitHint,
        outbound_original_url: link?.originalUrl ?? null,
        outbound_normalized_url: link?.normalizedUrl ?? null,
        outbound_representations: link?.originalRepresentations ?? [],
        association: link?.association ?? null,
        resolved_url: transportFinal,
        transport_final_url: result.finalUrl,
        transport_final_domain: result.finalUrl
          ? domain(result.finalUrl)
          : null,
        canonical_candidate_url: final,
        candidate_domain: final ? domain(final) : null,
        canonicalization_basis: candidate.basis,
        redirect_chain: result.redirectChain,
        resolved_domain: final ? domain(final) : null,
        resolution_status: result.status,
        resolution_reason: result.reason,
        http_status: result.httpStatus,
        authority,
        source_kind: confirmed?.source_kind ?? classification.kind,
        authority_basis: confirmed
          ? `research_review: ${confirmed.evidence_note}`
          : classification.merchantMatch === "confirmed_registry"
            ? "production_registry"
            : classification.authority === "discovery"
              ? "known_discovery_surface"
              : "ownership_not_verified",
        destination_class: kind,
        adapter_family:
          final || blockedApp
            ? family(kind, final ?? blockedApp!)
            : "unresolved",
        resolution_depth: Math.max(0, result.redirectChain.length - 1),
        origin_chain: [
          {
            url: signal.sourcePostUrl,
            role: "signal_source",
            destination_class: "telegram",
          },
          ...hops,
        ],
        official_source_url:
          final && verified && !intermediate(kind) ? final : null,
        source_origin_status: status,
        enumerable: "not_assessed",
        extraction_feasibility: "not_assessed",
        manual_review_reasons: [...new Set(reasons)].sort(),
      });
    }
  }
  const promotions = selected.filter(
    (s) => s.signal_class === "promotion_signal",
  );
  const offerRecords = records.filter(
    (r) => r.signal_class === "promotion_signal",
  );
  const allLinkRecords = offerRecords.filter((r) => r.outbound_normalized_url);
  // Neighboring roundup links remain context, not this offer's origin evidence.
  const linkRecords = allLinkRecords.filter((r) => r.association === "offer");
  const successful = linkRecords.filter(
    (r) => r.resolution_status === "resolved",
  );
  const signalCount = (rows: AuditRecord[]) =>
    new Set(rows.map((r) => r.signal_id)).size;
  const byClass = (...kinds: string[]) =>
    successful.filter((r) => kinds.includes(r.destination_class));
  const short = [...resolved.values()].filter((r) => isShortUrl(r.originalUrl));
  const domainCounts = counts(
    successful.flatMap((r) => (r.candidate_domain ? [r.candidate_domain] : [])),
  );
  const provenanceInputs = [
    ...new Map(
      selected.map((s) => [
        s.post.input_file,
        { file: s.post.input_file, sha256: s.post.input_sha256 },
      ]),
    ).values(),
  ].sort((a, b) => a.file.localeCompare(b.file));
  const result: AuditResult = {
    version: 1,
    provenance: {
      input_mode:
        options.inputMode ?? selected[0]?.post.input_mode ?? "frozen_local",
      inputs: provenanceInputs,
      authority_review_sha256: options.reviewHash ?? null,
      production_registry_sha256: options.registryHash,
    },
    summary: {
      requested_sample: options.sample,
      available_input_posts: options.availablePosts,
      input_posts: new Set(selected.map((s) => s.signal.sourcePostUrl)).size,
      parsed_promotion_signals: promotions.length,
      non_offer_signals: selected.length - promotions.length,
      sample_shortfall: Math.max(0, options.sample - promotions.length),
      signals_with_outbound_links: promotions.filter(
        (s) => s.signal.outboundLinks.length,
      ).length,
      signals_with_offer_links: signalCount(linkRecords),
      source_post_context_link_records:
        allLinkRecords.length - linkRecords.length,
      resolved_shortlinks: short.filter((r) => r.status === "resolved").length,
      unresolved_shortlinks: short.filter((r) => r.status !== "resolved")
        .length,
      direct_or_authoritative_candidates: signalCount(
        byClass(
          "merchant_web_candidate",
          "issuer_or_platform_candidate",
          "app_or_deep_link",
          "official_social_candidate",
        ),
      ),
      intermediate_publisher_destinations: signalCount(
        byClass("publisher", "deal_aggregator"),
      ),
      social_candidates: signalCount(byClass("official_social_candidate")),
      app_deep_link_candidates: signalCount(byClass("app_or_deep_link")),
      unknown_destinations: signalCount(byClass("unknown")),
      unresolved_signals: signalCount(
        linkRecords.filter((r) => r.resolution_status !== "resolved"),
      ),
      no_outbound_source_signals: signalCount(
        offerRecords.filter((r) => !r.outbound_normalized_url),
      ),
      publisher_requires_deeper_resolution: signalCount(
        byClass("publisher", "deal_aggregator"),
      ),
      unique_resolved_domains: Object.keys(domainCounts).sort(),
      adapter_family_counts: counts(linkRecords.map((r) => r.adapter_family)),
      adapter_family_concentration: counts([
        ...new Map(
          linkRecords.map((r) => [
            `${r.signal_id}:${r.adapter_family}`,
            r.adapter_family,
          ]),
        ).values(),
      ]),
      destination_class_counts: counts(
        linkRecords.map((r) => r.destination_class),
      ),
      resolved_domain_counts: domainCounts,
      candidate_domain_counts: domainCounts,
      transport_final_domain_counts: counts(
        successful.flatMap((r) =>
          r.transport_final_domain ? [r.transport_final_domain] : [],
        ),
      ),
      repeated_domain_counts: Object.fromEntries(
        Object.entries(domainCounts).filter(([, n]) => n > 1),
      ),
      unique_url_domain_counts: counts([
        ...new Map(
          successful
            .filter((r) => r.candidate_domain)
            .map((r) => [r.outbound_normalized_url, r.resolved_domain!]),
        ).values(),
      ]),
    },
    records,
  };
  return {
    audit: result,
    resolvedLinks: [...resolved.values()].sort((a, b) =>
      a.originalUrl.localeCompare(b.originalUrl),
    ),
  };
}
