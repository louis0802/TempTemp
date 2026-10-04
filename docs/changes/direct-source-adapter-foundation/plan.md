# Execution plan

1. [x] Inspect guidance, dependencies, ownership audit and captured DOM; snapshot protected paths.
2. [x] Write and check intent/spec/design/plan before application edits.
3. [x] Implement types/schema, bounded fetch/evidence, registry/context and shared DOM/date primitives (A1,A2,A5,A6).
4. [x] Implement separate Pepper and Paradise adapters and reduced documented fixtures (A3,A4,A5).
5. [x] Implement shadow runner/CLI with safe ignored output and deterministic fixture mode (A7,A8).
6. [x] Test request authorization, redirect/size/timeout/page budgets, identities, provenance, conservative extraction, coverage and dependency isolation (A1–A8).
7. [x] Run focused and existing ingestion/source-evidence tests, typecheck, scoped lint/format, full unit suite where feasible and diff check.
8. [x] Run one bounded live preview per source after fixture tests; compare structural behavior; do not automatically update fixtures.
9. [x] Review diff, compare protected hashes, synchronize verification and readiness report. No commit/push.

Risks: source drift, image-only promotions, Paradise incomplete/load-more coverage, unsupported native PDF tooling and network restrictions. Preserve unknowns and report blockers; do not weaken gates. Review is self-review unless an independent reviewer is actually available.

## Execution findings and review

The 2026-09-30 live run exposed 7 Pepper detail URLs and 7 Paradise HTML detail URLs plus one menu. Pepper exposed no next/page/load-more boundary; Paradise Hotpot exposed LOAD MORE, which remains unresolved rather than invoking a private API. The current menu exceeded the 3 MB cap and was refused without increasing limits or using OCR. Native PDF decoding is deliberately unavailable; the separate supplied-text association helper is tested but not a PDF decoder.

Self-review fixed cached failures becoming successful cache hits, invalid-range partial dates, explicit next-page cycles, all-restaurants scope being mistaken for a physical name, and excluded restaurants being represented as all outlets. LOAD MORE selectors stay in the source adapters. Native transport tests cover DNS pinning and streamed limits. Final parser replay uses the recorded live bodies/failure, makes no second live request, and is byte-equivalent on two executions per source. Fixtures were not refreshed from live output.

60 focused tests passed; full unit suite 544/544 across 32 files passed. Typecheck, scoped ESLint/Prettier and diff checks passed. All 3,892 protected baseline files retained exact hashes with no unexpected protected additions. Review was self-review, not independent review. See verification.md for complete evidence and report.
