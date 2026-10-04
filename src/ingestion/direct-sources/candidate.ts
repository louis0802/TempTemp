import { candidateId } from "./evidence";
import {
  directPromotionCandidateSchema,
  type DirectPromotionCandidate,
  type FactField,
  type FetchedPage,
  type ListingEntry,
} from "./types";
import type { DirectSourceContext } from "./adapter";
export function newCandidate(
  entry: ListingEntry,
  ctx: DirectSourceContext,
  pages: FetchedPage[],
): DirectPromotionCandidate {
  const listing = ctx.http.capturedPages.find(
    (p) => p.evidence.id === entry.evidenceId,
  );
  if (!listing) throw new Error("missing_listing_evidence");
  return {
    schemaVersion: 1,
    candidateId: candidateId(ctx.source.id, entry.canonicalUrl, entry.nativeId),
    sourceId: ctx.source.id,
    sourceLabel: ctx.source.label,
    canonicalUrl: entry.canonicalUrl,
    listingUrl: entry.listingUrl,
    nativeId: entry.nativeId,
    merchant: null,
    title: null,
    benefit: null,
    description: null,
    startDate: null,
    endDate: null,
    weekdays: null,
    hours: null,
    locationScope: "source_unspecified",
    locationNames: [],
    locationWording: null,
    eligibility: null,
    redemption: null,
    terms: null,
    observedAt: ctx.observedAt,
    publishedAt: null,
    extractionStatus: "partial",
    issues: [],
    facts: {},
    evidence: [
      ...new Map(
        [listing, ...pages].map((p) => [p.evidence.id, p.evidence]),
      ).values(),
    ],
  };
}
export function cite(
  candidate: DirectPromotionCandidate,
  field: FactField,
  evidenceId: string,
  selector: string,
  quote: string,
) {
  candidate.facts[field] = { evidenceIds: [evidenceId], selector, quote };
}
export function finalizeCandidate(
  candidate: DirectPromotionCandidate,
): DirectPromotionCandidate {
  for (const [field, value] of Object.entries({
    merchant: candidate.merchant,
    title: candidate.title,
    benefit: candidate.benefit,
    description: candidate.description,
    start_date: candidate.startDate,
    end_date: candidate.endDate,
    weekdays: candidate.weekdays,
    hours: candidate.hours,
    locations: candidate.locationWording,
    eligibility: candidate.eligibility,
    redemption: candidate.redemption,
    terms: candidate.terms,
  }))
    if (value === null) candidate.issues.push(`${field}_unknown`);
  candidate.issues = [...new Set(candidate.issues)].sort();
  candidate.extractionStatus = candidate.issues.some((issue) =>
    issue.startsWith("detail_fetch_failed"),
  )
    ? "failed"
    : candidate.issues.length
      ? "partial"
      : "complete";
  return directPromotionCandidateSchema.parse(candidate);
}
/** Only explicit source declarations; brand/type labels do not establish physical participation. */
export function sourceLocations(
  candidate: DirectPromotionCandidate,
  lines: string[],
  evidenceId: string,
  selector: string,
) {
  const declarations = lines.filter((line) =>
    /\b(?:(?:all|selected|participating) .*?(?:outlets|restaurants|stores)|available (?:only )?at|valid (?:only )?at)\b/i.test(
      line,
    ),
  );
  if (!declarations.length) return;
  candidate.locationWording = declarations.join("\n");
  const allScope = declarations.some((line) =>
    /\ball .*?(?:outlets|restaurants|stores)\b/i.test(line),
  );
  const restricted = declarations.some((line) =>
    /\b(?:selected|participating|except|excluding)\b/i.test(line),
  );
  const typeOnly =
    !allScope &&
    declarations.some((line) =>
      /\b(?:outlets|restaurants|stores) only\b/i.test(line),
    );
  candidate.locationScope = restricted
    ? "selected_outlets"
    : allScope
      ? "all_outlets"
      : typeOnly
        ? "source_unspecified"
        : "named_outlets";
  if (typeOnly) candidate.issues.push("location_identity_unresolved");
  if (candidate.locationScope === "named_outlets")
    candidate.locationNames = declarations.map((line) =>
      line
        .replace(/^.*?\b(?:available|valid) (?:only )?at\s+/i, "")
        .replace(/\.$/, ""),
    );
  cite(candidate, "locations", evidenceId, selector, candidate.locationWording);
}
