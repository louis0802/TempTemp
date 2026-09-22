import { digest } from "../resolution/cache";
import { PostOfferParser } from "../resolution/parser";
import { DateResolver } from "../resolution/dates";
import { OutletScopeResolver } from "../resolution/patterns";
import type { SourcePost } from "../resolution/types";
import { extractLinks } from "./links";
import { classifySource } from "./registry";
import type {
  EvidenceState,
  PromotionSignal,
  PromotionSourceEvidence,
  SourceRegistry,
} from "./types";
import type { SourceRedirectCache } from "./cache";
import type { SourceLinkResolver } from "./resolver";

export async function createSignals(
  sources: SourcePost[],
): Promise<PromotionSignal[]> {
  const signals: PromotionSignal[] = [];
  for (const source of [...sources].sort((a, b) =>
    a.url.localeCompare(b.url),
  )) {
    if (!/^https:\/\/t\.me\/(sgfooddeals|tastesoulsg)\/\d+$/.test(source.url))
      throw new Error("untrusted_corpus_source");
    const postLinks = extractLinks(source.text, source.url);
    const offers = await new PostOfferParser().parse(
      source.text,
      source.channel,
    );
    if (!offers.length)
      throw new Error(`source_produced_no_offers:${source.url}`);
    for (const offer of offers) {
      const dates = new DateResolver().resolve(offer.text, source.publishedAt);
      const scope = new OutletScopeResolver().resolve(offer.text);
      const offerLinks = new Set(
        extractLinks(offer.text, source.url).map((l) => l.normalizedUrl),
      );
      signals.push({
        id: digest(["promotion-signal-v1", source.url, offer.key]),
        offerKey: offer.key,
        sourcePostUrl: source.url,
        sourceAuthority: "discovery",
        sourceKind: "telegram_feed",
        merchantHint: offer.merchant,
        titleHint: offer.title,
        benefitHint: offer.benefit,
        startDateHint: dates.startDate,
        endDateHint: dates.endDate,
        locationHints: scope.names,
        issues: [...new Set([...offer.issues, ...dates.issues])].sort(),
        outboundLinks: postLinks.map((l) => ({
          ...l,
          association: offerLinks.has(l.normalizedUrl)
            ? "offer"
            : "source_post",
        })),
      });
    }
  }
  return signals;
}
export async function buildSourceEvidence(
  signals: PromotionSignal[],
  registry: SourceRegistry,
  cache: SourceRedirectCache,
  resolver?: SourceLinkResolver,
) {
  const records: {
    signal: PromotionSignal;
    state: EvidenceState;
    evidence: PromotionSourceEvidence[];
  }[] = [];
  for (const signal of signals) {
    const source: PromotionSourceEvidence = {
      id: digest([signal.id, signal.sourcePostUrl]),
      signalId: signal.id,
      relation: "source_permalink",
      originalUrl: signal.sourcePostUrl,
      normalizedUrl: signal.sourcePostUrl,
      resolvedUrl: null,
      redirectChain: [],
      checkedAt: null,
      resolutionStatus: "unresolved",
      reason: "source_permalink_not_fetched",
      httpStatus: null,
      ...classifySource(signal.sourcePostUrl, signal.merchantHint, registry),
    };
    const evidence = [source];
    for (const link of signal.outboundLinks) {
      const resolved = await cache.resolve(link.normalizedUrl, resolver);
      evidence.push({
        id: digest([signal.id, link.normalizedUrl]),
        signalId: signal.id,
        relation: "outbound_link",
        originalUrl: link.originalUrl,
        normalizedUrl: link.normalizedUrl,
        resolvedUrl: resolved.finalUrl,
        redirectChain: resolved.redirectChain,
        checkedAt: resolved.checkedAt,
        resolutionStatus: resolved.status,
        reason: resolved.reason,
        httpStatus: resolved.httpStatus,
        ...classifySource(
          resolved.status === "resolved" ? resolved.finalUrl! : "",
          signal.merchantHint,
          registry,
        ),
      });
    }
    const state: EvidenceState = evidence.some((e) => e.authority === "primary")
      ? "primary_found"
      : evidence.some((e) => e.authority === "strong_secondary")
        ? "strong_secondary_found"
        : !signal.outboundLinks.length
          ? "no_outbound_links"
          : evidence.slice(1).some((e) => e.resolutionStatus !== "resolved")
            ? "unresolved_links"
            : "discovery_only";
    records.push({ signal, state, evidence });
  }
  const evidence = records.flatMap((r) => r.evidence);
  const outbound = evidence.filter((e) => e.relation === "outbound_link");
  return {
    version: 1,
    records,
    metrics: {
      sourcePosts: new Set(signals.map((s) => s.sourcePostUrl)).size,
      signals: signals.length,
      sourcePostsWithOutboundLinks: new Set(
        signals
          .filter((s) => s.outboundLinks.length)
          .map((s) => s.sourcePostUrl),
      ).size,
      signalsWithOutboundLinks: signals.filter((s) => s.outboundLinks.length)
        .length,
      uniqueOutboundLinks: new Set(outbound.map((e) => e.normalizedUrl)).size,
      uniqueResolvedLinks: new Set(
        outbound
          .filter((e) => e.resolutionStatus === "resolved")
          .map((e) => e.normalizedUrl),
      ).size,
      authorityEvidenceNodes: Object.fromEntries(
        ["primary", "strong_secondary", "discovery", "unknown"].map((a) => [
          a,
          evidence.filter((e) => e.authority === a).length,
        ]),
      ),
      outboundResolutionNodes: Object.fromEntries(
        ["resolved", "unresolved", "blocked", "failed"].map((s) => [
          s,
          outbound.filter((e) => e.resolutionStatus === s).length,
        ]),
      ),
    },
  };
}
