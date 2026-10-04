/** Revision-6 acquisition dimensions; broad operational status is not a proof. */
import type { SourceSnapshot } from "./discovery";
import { CORE_SOURCE_IDS } from "./protocol";

const ENUMERATION_BLOCKERS = new Set([
  "acquisition_interrupted_during_source",
  "acquisition_interrupted_before_source",
  "no_supported_card_parser",
  "no_cards_extracted_from_enumerable_source",
  "probe_does_not_establish_directory_coverage",
  "registered_category_or_tab_routes_not_traversed",
  "pagination_control_without_fetchable_link",
  "listing_pagination_url_loop",
  "safety_cap_reached_with_remaining_cards_or_pages",
]);

export function datedListingOrderingVerified(snapshot: SourceSnapshot) {
  let previous = Infinity;
  return (
    snapshot.listing_evidence.length > 0 &&
    snapshot.listing_evidence.every((card) => {
      const current = Date.parse(card.published_at ?? "");
      const ordered = Number.isFinite(current) && current <= previous;
      previous = current;
      return ordered;
    })
  );
}

export function classifySnapshotCompleteness(snapshot: SourceSnapshot) {
  const enumeration = new Set(
    snapshot.incomplete_reasons.filter((r) => ENUMERATION_BLOCKERS.has(r)),
  );
  const extraction = new Set(
    snapshot.incomplete_reasons.filter((r) => !ENUMERATION_BLOCKERS.has(r)),
  );
  if (snapshot.listing_failure) enumeration.add("listing_failure");
  if (!snapshot.pages.length) enumeration.add("no_listing_pages_captured");
  if (!snapshot.enumerable) enumeration.add("source_not_enumerable");
  if (snapshot.cap_truncated) enumeration.add("cap_truncated");
  if (snapshot.pagination_remaining)
    enumeration.add("required_pagination_unresolved");
  if (snapshot.pages.some((p) => p.status !== 200))
    enumeration.add("listing_failure");
  if (
    snapshot.errors.some((e) =>
      /Repeated listing page body|Unsafe or repeated listing URL/.test(e),
    )
  )
    enumeration.add("listing_loop_or_repeated_page");
  if (
    CORE_SOURCE_IDS.includes(snapshot.source_id) &&
    !datedListingOrderingVerified(snapshot)
  )
    enumeration.add("publication_order_not_verified");
  const traversal = snapshot.recovery_traversal;
  if (traversal) {
    for (const reason of traversal.reasons) enumeration.add(reason);
    if (!traversal.crossed_checkpoint)
      enumeration.add("checkpoint_boundary_not_reached");
    if (!traversal.overlap_verified)
      enumeration.add("checkpoint_overlap_not_verified");
    if (!traversal.ordering_verified)
      enumeration.add("publication_order_not_verified");
    if (!traversal.pagination_complete)
      enumeration.add("required_pagination_unresolved");
    if (traversal.cap_truncated) enumeration.add("cap_truncated");
    if (traversal.repeated_page_body || traversal.url_loop_detected)
      enumeration.add("listing_loop_or_repeated_page");
  }
  if (snapshot.archive_enumeration) {
    if (!traversal && !snapshot.archive_enumeration.terminal_page_reached)
      enumeration.add("archive_boundary_unproven");
    if (!snapshot.archive_enumeration.ordering_verified)
      enumeration.add("publication_order_not_verified");
    if (
      snapshot.archive_enumeration.repeated_page_body ||
      snapshot.archive_enumeration.url_loop_detected
    )
      enumeration.add("listing_loop_or_repeated_page");
  }
  if (!snapshot.pages.length) extraction.add("semantic_evidence_unavailable");
  if (
    snapshot.detail_failures ||
    snapshot.detail_inspections.some((d) => d.status === "failed")
  )
    extraction.add("detail_fetch_failed");
  if (snapshot.cards_temporal_ambiguous)
    extraction.add("candidate_temporal_ambiguous");
  if (snapshot.extraction_incomplete && !extraction.size && !enumeration.size)
    extraction.add("semantic_extraction_incomplete");
  return {
    enumeration_complete: enumeration.size === 0,
    extraction_complete: extraction.size === 0,
    enumeration_reasons: [...enumeration],
    extraction_reasons: [...extraction],
  };
}
