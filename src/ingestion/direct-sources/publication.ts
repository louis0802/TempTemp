import {
  promotionSchema,
  publicationIssues,
  type Promotion,
} from "../../domain/promotion";
import { contentHash } from "./evidence";
import { sourceDefinition } from "./registry";
import {
  directPromotionCandidateSchema,
  hasRecordedDirectOwnership,
  type DirectPromotionCandidate,
  type DirectSourceDefinition,
} from "./types";
import type { DirectSourceRun } from "./runner";
import { assertSourceScope } from "./source-scope";

export const DIRECT_SOURCE_PROCESSOR_VERSION = "direct-source-v2";
export type DirectPublicationDraft = Partial<Promotion>;
export type ClassifiedIssue = {
  code: string;
  severity: "publication_blocking" | "informational";
};
export interface DirectResolvedContext {
  asOf: string;
  acquisitionReady: boolean;
  outlets: Promotion["outlets"];
  outletsVerified: boolean;
  outletIssues: string[];
  verifiedAt: string;
}
/** The supplied run instant, interpreted on the Singapore calendar; no ambient clock. */
export function singaporeObservationDate(observedAt: string): string {
  const instant = new Date(observedAt);
  if (!Number.isFinite(instant.valueOf()))
    throw new Error("invalid_observation_time");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
function explicitDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
/** Expiry requires explicit valid end evidence, never ambiguous extraction or article dates. */
export function directCampaignLifecycle(
  candidate: DirectPromotionCandidate,
  asOf: string,
): "expired" | "continue" {
  if (!explicitDate(asOf)) throw new Error("invalid_as_of_date");
  if (
    !directPromotionCandidateSchema.safeParse(candidate).success ||
    !candidate.facts.validity ||
    candidate.issues.some((code) => /validity|end_date/.test(code)) ||
    !explicitDate(candidate.endDate) ||
    (candidate.startDate !== null &&
      (!explicitDate(candidate.startDate) ||
        candidate.startDate > candidate.endDate))
  )
    return "continue";
  return candidate.endDate < asOf ? "expired" : "continue";
}
const informational = new Set([
  "weekdays_unknown",
  "hours_unknown",
  "eligibility_unknown",
  "redemption_unknown",
  "published_at_unknown",
  "merchant_unknown",
]);
export function classifyDirectIssues(
  candidate: DirectPromotionCandidate,
): ClassifiedIssue[] {
  return candidate.issues.map((code) => ({
    code,
    severity: informational.has(code)
      ? "informational"
      : "publication_blocking",
  }));
}
export function acquisitionReady(run: DirectSourceRun): boolean {
  return (
    run.gate.acquisition_ready &&
    run.gate.ownership_verified &&
    run.gate.enumeration_complete &&
    run.gate.listing_fetch_success &&
    run.gate.detail_fetch_success &&
    run.gate.deterministic_extraction &&
    run.issues.length === 0
  );
}
export function directPromotionId(
  sourceId: string,
  candidateId: string,
): string {
  const hash = contentHash(
    JSON.stringify(["direct-promotion-v1", sourceId, candidateId]),
  );
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export function trustedDirectSource(
  source: DirectSourceDefinition,
  url: string,
) {
  const target = assertSourceScope(source, url);
  return {
    kind: "direct" as const,
    sourceId: source.id,
    label: source.label,
    url: target.href,
    ...(source.sourceKind ? { sourceKind: source.sourceKind } : {}),
    ...(source.sourceKind === "merchant_social" && source.socialScope
      ? { platform: source.socialScope.platform }
      : {}),
  };
}
export function directRevisionHash(
  candidate: DirectPromotionCandidate,
): string {
  const evidence = candidate.evidence.map((e) => [
    e.relation,
    e.url,
    e.requestedUrl,
    e.contentHash,
    e.contentType,
    e.httpStatus,
  ]);
  evidence.sort((a, b) => {
    const left = JSON.stringify(a),
      right = JSON.stringify(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return contentHash(
    JSON.stringify([
      candidate.sourceId,
      candidate.canonicalUrl,
      candidate.nativeId,
      evidence,
    ]),
  );
}
export function mapDirectPublication(
  candidate: DirectPromotionCandidate,
  context: DirectResolvedContext,
): DirectPublicationDraft {
  const source = sourceDefinition(candidate.sourceId);
  const terms = [
    ...new Set([
      ...(candidate.terms ?? []),
      ...(candidate.eligibility ?? []),
      ...(candidate.redemption ?? []),
    ]),
  ];
  const parsedHours = candidate.hours?.match(
    /^([0-2]\d:[0-5]\d)\s*(?:–|-|to)\s*([0-2]\d:[0-5]\d)$/,
  );
  const hours = parsedHours
    ? { start: parsedHours[1], end: parsedHours[2] }
    : null;
  const scheduleLabel = [
    candidate.startDate && candidate.endDate
      ? `${candidate.startDate} to ${candidate.endDate}`
      : "Campaign validity unknown",
    candidate.weekdays
      ?.map((n) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][n - 1])
      .join(", "),
    candidate.hours,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    id: directPromotionId(source.id, candidate.candidateId),
    merchant: candidate.merchant ?? source.publicationPolicy.merchant,
    title: candidate.title ?? "",
    benefit: candidate.benefit ?? "",
    description: candidate.description ?? "",
    category: source.publicationPolicy.category,
    terms,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    weekdays: candidate.weekdays,
    hours,
    scheduleLabel,
    excludePublicHolidays: false,
    holidayDates: [],
    holidayCalendarThrough: null,
    outlets: context.outlets,
    sources: [trustedDirectSource(source, candidate.canonicalUrl)],
    verifiedAt: context.verifiedAt,
    reviewDueAt: null,
    status: "published",
    revision: 1,
  };
}
export function evaluateDirectPublication(
  candidate: DirectPromotionCandidate,
  context: DirectResolvedContext,
): {
  result: "ready" | "needs_review" | "exclude";
  reasons: string[];
  issues: ClassifiedIssue[];
  draft: DirectPublicationDraft;
  promotion: Promotion | null;
} {
  const source = sourceDefinition(candidate.sourceId);
  if (directCampaignLifecycle(candidate, context.asOf) === "expired")
    return {
      result: "exclude",
      reasons: ["expired_campaign"],
      issues: classifyDirectIssues(candidate),
      draft: mapDirectPublication(candidate, context),
      promotion: null,
    };
  const reasons: string[] = [];
  if (!source.publicationPolicy.enabled || !hasRecordedDirectOwnership(source))
    reasons.push("source_not_authoritative");
  if (!source.publicationPolicy.autoPublish)
    reasons.push("automatic_publication_disabled");
  if (!context.acquisitionReady) reasons.push("source_acquisition_blocked");
  if (!directPromotionCandidateSchema.safeParse(candidate).success)
    reasons.push("invalid_direct_candidate");
  if (
    candidate.merchant &&
    candidate.merchant !== source.publicationPolicy.merchant
  )
    reasons.push("merchant_configuration_conflict");
  if (!candidate.startDate) reasons.push("missing_start_date");
  if (!candidate.endDate) reasons.push("missing_end_date");
  if (candidate.locationScope === "source_unspecified")
    reasons.push("source_unspecified_locations");
  if (
    candidate.locationScope === "selected_outlets" &&
    !candidate.locationNames.length
  )
    reasons.push("selected_outlets_unresolved");
  if (
    candidate.locationScope === "named_outlets" &&
    !candidate.locationNames.length
  )
    reasons.push("named_outlets_missing");
  if (!context.outletsVerified || !context.outlets.length)
    reasons.push("physical_outlets_unresolved");
  reasons.push(...context.outletIssues);
  if (
    candidate.hours &&
    !/^([0-2]\d:[0-5]\d)\s*(?:–|-|to)\s*([0-2]\d:[0-5]\d)$/.test(
      candidate.hours,
    )
  )
    reasons.push("unsupported_source_hours");
  // Optional unknowns cannot conceal explicit restrictions the adapter has not represented.
  const copy = [candidate.description, ...(candidate.terms ?? [])].join("\n");
  if (/public holidays|\bPH\b/i.test(copy))
    reasons.push("unsupported_holiday_validity");
  if (
    !candidate.weekdays &&
    /\b(?:weekdays?|weekends?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i.test(
      copy,
    )
  )
    reasons.push("unresolved_weekday_restriction");
  if (!candidate.hours && /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(copy))
    reasons.push("unresolved_hour_restriction");
  const issues = classifyDirectIssues(candidate);
  reasons.push(
    ...issues
      .filter((i) => i.severity === "publication_blocking")
      .map((i) => i.code),
  );
  const draft = mapDirectPublication(candidate, context);
  const parsed = promotionSchema.safeParse(draft);
  if (!parsed.success)
    reasons.push(
      ...parsed.error.issues.map(
        (i) => `invalid_promotion:${i.path.join(".")}`,
      ),
    );
  else reasons.push(...publicationIssues(parsed.data));
  const unique = [...new Set(reasons)];
  return {
    result: unique.length ? "needs_review" : "ready",
    reasons: unique,
    issues,
    draft,
    promotion: unique.length || !parsed.success ? null : parsed.data,
  };
}
