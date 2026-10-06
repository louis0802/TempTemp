import { DateTime } from "luxon";
import { mvpPromotionSchema, type MvpPromotion } from "@/domain/mvp";
import { sourceDefinition } from "../direct-sources/registry";
import { hasRecordedDirectOwnership } from "../direct-sources/types";
import type { ScopeResolution } from "../resolution/types";
import { OutletScopeResolver } from "../resolution/patterns";
import { stableId } from "./pipeline";
import { buildOfferPolicy } from "./policy";
import { evaluateMvpLifecycle } from "./lifecycle";
import { resolveMvpOutlets } from "./outlets";
import type { MvpSourceState } from "./source-refresh";

export async function directStateToMvp(
  state: MvpSourceState,
  options: Parameters<typeof resolveMvpOutlets>[2],
  now: DateTime,
): Promise<MvpPromotion[]> {
  const output: MvpPromotion[] = [];
  for (const [key, entry] of Object.entries(state.candidates).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const c = entry.candidate,
      source = sourceDefinition(c.sourceId);
    if (c.sourceId !== state.sourceId || !hasRecordedDirectOwnership(source))
      throw new Error("untrusted_direct_mvp_source");
    const wordingScope = new OutletScopeResolver().resolve(
      c.locationWording ?? "",
    );
    const scope: ScopeResolution = {
      scope:
        c.locationScope === "source_unspecified" ? "unclear" : c.locationScope,
      raw: c.locationWording ?? "",
      names: c.locationNames,
      exclusions: wordingScope.exclusions,
    };
    if (scope.exclusions.length) scope.scope = "all_outlets_with_exclusions";
    const text = [
      ...new Set(
        [c.description, ...(c.terms ?? []), c.locationWording].filter(
          (x): x is string => !!x,
        ),
      ),
    ].join("\n");
    const normalized = buildOfferPolicy(
      text,
      {
        firstSeenAt: entry.firstReceivedAt,
        publishedAt:
          c.publishedAt && c.facts.publishedAt ? c.publishedAt : null,
        observation: state.observations[key] ?? null,
        sourceTextPolicy: "official_public",
      },
      scope,
    );
    const merchant = c.merchant ?? source.publicationPolicy.merchant;
    const contentStatus =
      c.title && c.benefit && c.description
        ? "resolved"
        : "needs_content_resolution";
    const validityStatus =
      normalized.dates.validityType && !normalized.dates.audit.blockers.length
        ? "resolved"
        : "needs_validity";
    const resolved =
      contentStatus === "resolved" && validityStatus === "resolved"
        ? await resolveMvpOutlets(merchant, scope, options)
        : {
            outlets: [],
            locationAudit: [],
            issues: [],
            directoryBasis: "unresolved" as const,
            directoryComplete: false,
          };
    const policy = {
      ...normalized.policy,
      directoryBasis: resolved.directoryBasis,
      directoryComplete: resolved.directoryComplete,
    };
    const mapStatus = resolved.outlets.length ? "ready" : "needs_location";
    const record: MvpPromotion = {
      id: stableId(key),
      sourceUrl: c.canonicalUrl,
      offerKey: key,
      parentKey: key,
      merchant,
      title: c.title ?? "",
      benefit: c.benefit ?? "",
      description: text,
      startDate: normalized.dates.startDate,
      endDate: normalized.dates.endDate,
      weekdays:
        policy.scheduleRules.length === 1
          ? policy.scheduleRules[0].weekdays
          : null,
      hours: null,
      redemptionCutoff: null,
      outletScope: scope.scope === "unclear" ? "unspecified" : scope.scope,
      mapCoverageBasis:
        scope.scope === "named_outlets"
          ? "source_named_outlets"
          : "google_merchant_locations",
      outlets: resolved.outlets,
      contentStatus,
      validityStatus,
      mapStatus,
      status:
        contentStatus !== "resolved"
          ? "needs_content_resolution"
          : validityStatus !== "resolved"
            ? "needs_validity"
            : mapStatus !== "ready"
              ? "needs_location"
              : "ready",
      lifecycle: evaluateMvpLifecycle(
        { ...normalized.dates, sourceObservation: policy.sourceObservation },
        now,
      ),
      reasons: [...normalized.dates.audit.blockers, ...resolved.issues],
      locationAudit: resolved.locationAudit,
      datePattern: "mvp_source_observed",
      genuine: true,
      offerPolicy: policy,
    };
    output.push(mvpPromotionSchema.parse(record));
  }
  return output;
}
