# Specification

## Coverage map

C1. Build from the smallest authoritative existing frozen reviewed/captured inputs, inspect and retain hashes/provenance. One deterministically ordered row per normalized merchant brand, preserving display labels and operator separately. Never consolidate Paradise Hotpot and Paradise Dynasty by parent ownership. Unresolved labels remain visible with blockers.
C2. Retain merchant, normalized_merchant, historical_signal_count, historical_offer_count, observed_direct_domains, observed_direct_candidate_count, ownership_status, enumerability_status, extraction_status, adapter_status (none/research_only/shadow/enabled), direct_source_id, source_family, publication_enabled, autonomous_ingestion_status, known_blockers and evidence_refs. Explicit unknowns for unassessed merchants, no numeric scoring. Retain source-specific observations when a merchant has multiple sources.
C3. Produce merchants.json, report.md and report.csv in a new .local/merchant-source-map/<timestamp>/; same frozen inputs plus identical registry/evidence produce identical semantic output. Record limitations, coverage totals and feasible follow-ups in docs/research/merchant-source-map.md. Pepper enabled, Paradise shadow/disabled, Shake Shack prior probable/dated archive research retained, Kris+ directory distinct from sampled deep link.

## Shake Shack

S1. Establish ownership using independent official legal/operator or corporate evidence; exact URLs, capture dates, hashes, sizes and basis recorded. Branding/domain/Telegram/search labels are insufficient. If unproven, shadow only.
S2. Enumerate only the registered archive and its exposed numbered/next pagination, with existing bounds. Complete only with recognized structure, exhausted pagination, deterministic filtering, no unknown load-more and no reached cap. Deduplicate canonical article links; terminate cycles. Reject unapproved hosts/paths and recursive crawling.
S3. Use deterministic source-specific promotion evidence, never currency/free/deal keywords alone. Editorial posts emit zero promotion candidates. Retain uncertain article evidence without inventing promotions.
S4. Extract merchant/title/benefit/description, explicit campaign validity, restrictions, locations, eligibility, redemption and terms with fact provenance. Article publication date may populate publishedAt only; absent year/end remains unresolved rather than deriving from publication metadata. Represent weekdays/hours only when explicit and unambiguous; otherwise block. Unknown location is never all outlets.
S5. Establish a complete authoritative Singapore outlet directory before treating branches as authority. Exact official identities only; Google is coordinate resolution only. Unknown/fuzzy participants stay unresolved.
S6. Use existing generic gate/revision/save path: complete enabled authoritative facts may publish; missing expiry/location/date or ambiguity requires review. Stable candidate/Promotion identity across source revisions; changed incomplete bytes preserve prior facts; admin corrections and origin-independent dedupe remain intact.
S7. Activation follows recorded ownership, enumeration, directory and extraction proof. Unresolved conditions mean enabled=false/autoPublish=false, preview accepts and ingest rejects via existing generic CLI. Do not weaken requirements to obtain activation.

## Regression and operation

R1. Pepper captured seven retain dispositions and parser bytes/behavior. Paradise remains disabled/partial. Legacy tests and direct persistence/publication tests pass.
R2. Direct dependency closure excludes Telegram collector/parser/signals, legacy signal tables and merchant-map research. Existing origin/audit artifacts and source-discovery-service remain unchanged.
R3. Captured fixture tests precede a single bounded live structural preview if needed. Use disposable local DB only if Shake Shack is enabled; no production/shared operation. Document all actual checks and blocked checks.

No product decisions remain unresolved. Evidence-dependent activation is deliberately unresolved until bounded verification completes.
