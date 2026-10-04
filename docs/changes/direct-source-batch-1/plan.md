# Execution and verification plan

1. [x] Read request, AGENTS, local Next guide, direct-source contracts, onboarding and frozen-map builder. Preserve existing uncommitted work; capture baseline hashes and 139-row map.
2. [x] Phase A: independently research all four, capture bounded public responses and failure ledgers, verify ownership/linkage and campaign boundaries. Write research.md decision matrix. (Acceptance 1, 4, 5)
3. [x] Finalize adapter decisions, update design/spec as necessary, check all documents consistently before production code. Three useful shadow adapters; CS Foods blocked without registration. No enabled sources or new providers. (1–3)
4. [x] Phase B: implement only justified merchant adapters/registry, exhaustive factory dispatch. No new outlet provider or dispatch refactor was warranted. Processor/schema/generic semantics unchanged. (2–4, 6)
5. [x] Add captured and adversarial replay tests for implemented families; blocked-source evidence tests and source isolation/gates. 46 new batch tests plus existing regressions. (2–6, 8)
6. [x] Regenerate merchant map from frozen inputs/final registry; 139 rows retained, exactly four selected rows change, CS Foods adapter=none with explicit blockers. (7)
7. [x] Run focused/unit/integration/corpus/typecheck/lint/build/format/diff checks; inspect changes, resolve findings, verify protected hashes. Focused 242, unit 726, integration 53, corpus 4 pass. Typecheck/build/scoped lint/format/diff pass. Full lint has five pre-existing ignored-local-script errors; unchanged existing build tracing warning retained. (6–9)
8. [x] Synchronize research/design/plan/verification and exact changed-files inventory. Three shadow sources, one blocked source, zero newly enabled. (1–9)

Source-level risks: FairPrice campaign versus price semantics/product completeness; Kris+ directory load-more and partner identity; Wix lightbox/image boundaries; CS Foods CleanTalk and undated sales. Research resolves or records these without forcing activation. No shared research budget or blocked merchant dependency.

Baseline captured in /tmp/direct-source-batch-1-baseline.json and /tmp/direct-source-batch-1-map-before.json. Existing working-tree files are treated as user-owned; only task changes are reported.

Final durable baseline/evidence is retained in protected-baseline.json, merchant-map-before.json and verification.md. No required implementation remains; activation gaps are explicitly scoped source outcomes. No enabled-source DB test applies. Existing local disposable integration runs verify unchanged publication/review/legacy behavior.
