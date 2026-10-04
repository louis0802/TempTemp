import type { DirectSourceAdapter, DirectSourceContext } from "./adapter";
import {
  BoundedDirectFetch,
  type DirectTransport,
  type FetchLimits,
} from "./fetch";
import { acquisitionIssue } from "./html";
import { sourceAdapter } from "./registry";
import { hasRecordedDirectOwnership } from "./types";
import type {
  AcquisitionIssue,
  DirectPromotionCandidate,
  DirectSourceDefinition,
} from "./types";
export async function runDirectSource(
  source: DirectSourceDefinition,
  options: {
    transport?: DirectTransport;
    observedAt?: string;
    limits?: Partial<FetchLimits>;
    mode?: "live" | "fixture";
    adapter?: DirectSourceAdapter;
  } = {},
) {
  const observedAt = options.observedAt ?? new Date().toISOString();
  const http = new BoundedDirectFetch(
    source,
    options.transport,
    () => observedAt,
    options.limits,
  );
  const ctx: DirectSourceContext = { source, http, observedAt };
  const adapter = options.adapter ?? sourceAdapter(source);
  if (adapter.sourceId !== source.id)
    throw new Error("adapter_source_mismatch");
  const enumeration = await adapter.enumerate(ctx);
  const candidates: DirectPromotionCandidate[] = [];
  const issues: AcquisitionIssue[] = [...enumeration.issues];
  let extractionFailures = 0;
  for (const entry of enumeration.entries) {
    try {
      const detail = adapter.fetchDetail
        ? await adapter.fetchDetail(entry, ctx)
        : null;
      issues.push(...(detail?.issues ?? []));
      candidates.push(...(await adapter.extract(entry, detail, ctx)));
    } catch (error) {
      extractionFailures++;
      issues.push(acquisitionIssue(error, entry.canonicalUrl, entry.relation));
    }
  }
  const requests = http.attempts;
  const listingSuccess =
    enumeration.pagination.requested.length > 0 &&
    enumeration.pagination.requested.every((url) =>
      http.capturedPages.some(
        (p) =>
          p.evidence.requestedUrl === url &&
          p.evidence.httpStatus === 200 &&
          p.evidence.contentType === "text/html",
      ),
    ) &&
    !issues.some(
      (i) =>
        i.relation === "listing" &&
        /http_|timeout|limit|structure|content/.test(i.code),
    );
  const detailSuccess =
    enumeration.entries.length > 0 &&
    enumeration.entries.every((entry) =>
      http.capturedPages.some(
        (p) =>
          p.evidence.requestedUrl === entry.canonicalUrl &&
          p.evidence.httpStatus === 200,
      ),
    ) &&
    !issues.some((i) => i.relation !== "listing");
  const deterministic =
    extractionFailures === 0 &&
    candidates.length > 0 &&
    !candidates.some((c) => c.issues.includes("detail_structure_changed"));
  const ready =
    hasRecordedDirectOwnership(source) &&
    enumeration.complete &&
    (!enumeration.classification ||
      (enumeration.classification.discovered_articles ===
        enumeration.classification.classified_articles &&
        enumeration.classification.unresolved_articles === 0)) &&
    listingSuccess &&
    detailSuccess &&
    deterministic &&
    issues.length === 0;
  const gate = {
    ownership_verified: hasRecordedDirectOwnership(source),
    ownership_basis: source.authority,
    enumeration_complete: enumeration.complete,
    listing_fetch_success: listingSuccess,
    detail_fetch_success: detailSuccess,
    deterministic_extraction: deterministic,
    acquisition_ready: ready,
    classification: enumeration.classification ?? null,
    candidate_count: candidates.length,
    candidate_issues: Object.fromEntries(
      candidates.map((c) => [c.candidateId, c.issues]),
    ),
    status:
      options.mode === "fixture"
        ? "fixture-validated"
        : ready
          ? "production-adapter-ready"
          : "production-adapter-partial",
    production_active: false,
  };
  return {
    source,
    mode: options.mode ?? "live",
    observedAt,
    limits: http.limits,
    enumeration,
    candidates,
    issues,
    requests,
    gate,
    pages: http.capturedPages,
  };
}
export type DirectSourceRun = Awaited<ReturnType<typeof runDirectSource>>;
