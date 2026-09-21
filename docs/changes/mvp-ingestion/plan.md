> Historical MVP implementation record. Curated inclusion, independent status dimensions and full development preview now follow [curated MVP retention](../curated-mvp-retention/verification.md); earlier exclusion counts and ready-only preview behavior below are superseded.

# MVP ingestion execution plan

- [x] Add independent MVP schema, lifecycle/filtering and pipeline (spec 1–4).
- [x] Reuse Google provider; test named/default scope, deduplication, closed/foreign results and caching (spec 2–3).
- [x] Add corpus builder, benchmark mapping and explicit discrepancies; inspect every unresolved record (spec 1, 6–7).
- [x] Add validated artifact list/detail APIs and map/card integration, historical preview (spec 3, 5).
- [x] Run focused tests, full units/integration/corpus, typecheck, lint, build and browser checks; review diff and record actual limitations.

Risks: no live credentials/captured production Google dataset may be available; report needs_location honestly. Historical benchmark labels can disagree with source text; never feed them into runtime decisions. Ambiguous date ownership must not become invented validity.

## Execution notes

Implemented the separate pipeline, versioned artifact, active list/detail routes, development preview and Explorer source selection. Google’s optional component types were fixed without changing strict policy. Merchant spacing/diacritic equivalence is opt-in for MVP; named addresses remain conservative. Source-owned splits produce 200 records and the reviewed baseline accounts for all 180 historical candidates. Full evidence and remaining source reasons are in verification.md and non-ready.json. All listed checks passed; no deployment or push was performed.
