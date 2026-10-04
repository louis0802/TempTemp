# Revision 6 specification

Revision 6 separates primary cohort evidence from full-registry diagnostics.

The frozen primary cohort is exactly `confirmgood_deals`, `eatbook_deals`, and `everydayonsales_food`. Every other registered source is `supplemental`. Each revision-6 registry entry records this role explicitly. A source that later gains complete catch-up capability remains supplemental until a future protocol revision changes the frozen cohort.

At minimum every revision-6 interval exposes:

- `core_content_complete`
- `core_cadence_complete`
- `all_registry_content_complete`
- `all_registry_cadence_complete`
- `telegram_content_complete`
- `telegram_coverage_complete`

Primary replacement eligibility requires core content completeness, Telegram content completeness, and all required manual reviews. Primary temporal eligibility additionally requires complete scheduled cadence for the core cohort and complete scheduled Telegram coverage. Supplemental completeness never gates either primary field.

Primary scoring uses an explicit core-only candidate view created without benchmark information. The view retains only core occurrences, core evidence and core-supported facts/provenance. Supplemental evidence cannot rescue an unmatched benchmark offer, upgrade match classification, fill missing date/location/eligibility/redemption facts, or improve primary fact-completeness scoring. Supplemental-only matches are reported separately.

Revision-6 primary metrics are named with an explicit core denominator: `core_replacement_intervals`, `core_benchmark_offer_count`, `core_same_offer_recovered`, `core_same_offer_recall`, `core_merchant_coverage`, `core_candidate_validity_precision`, `core_matched_fact_completeness`, `core_catch_up_recovered_offers`, `core_temporal_complete_intervals`, `core_live_matched_offers`, `core_lead_lag_minutes`, and `core_median_lead_lag_minutes`. A scored eligible day with eligible benchmark offers and zero core matches has recall 0. Null continues to mean the metric cannot be scored.

Supplemental diagnostics include `supplemental_candidates`, `supplemental_observed_matches`, `supplemental_only_matches`, and `supplemental_sources_contributing_matches`. Incomplete supplemental observations are not described as recall.

Recovery reuses revision-5 proof requirements unchanged. A core source cadence gap becomes content-complete only when recovery returns `status = complete` after crossing the durable checkpoint, verifying overlap and ordering, completing pagination, avoiding cap truncation, and avoiding listing failure. Partial, unsupported, and failed supplemental recovery remains visible without setting `core_content_complete = false`.

Telegram remains benchmark-wide across `sgfooddeals` and `tastesoulsg`. Recovered posts may enter replacement scoring according to supported publication day, while `first_seen_at` remains actual receipt time. Catch-up posts never provide timing evidence.

The initial revision-6 research gate requires at least three revision-6 core replacement-eligible intervals. Revision-3/4/5 intervals do not advance that gate. Preferred final evidence remains five to seven valid revision-6 core replacement days plus researcher review of benchmark diversity and sample sufficiency.

Acceptance criteria:

- A. A clean continuous rev6 day with complete core and Telegram observation is replacement- and temporal-eligible after required review.
- B. Missing one scheduled slot across all five fresh publishers can still yield `core_content_complete = true` after complete recovery of the three core archives while SingPromos and MustShareNews remain partial; replacement is eligible and temporal is not.
- C. A core adapter that cannot prove complete recovery makes core content incomplete and blocks replacement scoring.
- D. A benchmark offer found only by a supplemental source remains a primary miss and increments supplemental-only diagnostics.
- E. When a merged offer appears in both core and supplemental sources, primary scoring uses only core evidence; supplemental facts cannot improve primary fact completeness.
- F. Missing a daily/static supplemental pass does not block primary replacement eligibility when core and Telegram content are complete.
- G. Offline-across-midnight reconciliation preserves gaps, assigns recovered dated content to supported publication day, reuses recovery artifacts idempotently, and opens the current day as rev6.
- H. Repeated restart creates no duplicate Telegram observations, candidates, occurrences, recovery artifacts, or checkpoints.
- I. Revision-3/4/5 asset hashes and sealed evidence remain unchanged; an active rev5 interval keeps rev5 semantics until close, and the next newly opened interval uses rev6.
- J. A scored eligible interval with benchmark offers and zero core matches reports `core_same_offer_recall = 0`.
- K. Facts present only in supplemental evidence do not improve core fact completeness.
- L. Any newly complete-capable supplemental adapter remains `research_role = supplemental` and does not change the rev6 primary denominator.

Tracker output must show the frozen core cohort, core replacement evidence, core temporal evidence, both core and all-registry completeness, supplemental gaps, recovery status by source, supplemental-only observed matches, and both methodological distinctions: content recovered does not restore live coverage; supplemental evidence does not equal primary cohort recovery.

Review contract: primary validity and match reviews identify candidates from the frozen core-only projection. Optional supplemental reviews identify the separate supplemental projection. IDs are bound to projected evidence, so a full-registry review cannot silently serve as a core review. Unreviewed supplemental match diagnostics are null. Primary fact scores remain explicit human assessments of core-side evidence. Timing conservatively excludes a match that depends on mixed live/catch-up core evidence.
