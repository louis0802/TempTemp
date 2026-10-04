# Execution and verification

- [x] Read user request, repository/domain/provenance/publication contracts, local Next environment guide; snapshot pre-existing protected bytes and status.
- [x] Create consistent intent/spec/design/plan before application code.
- [x] Implement strict types/schema/shared prompt/providers/validator/mapper.
- [x] Inspect existing captured blocks; persist reviewed gold, checked offline outputs, capture-verification recipes and deterministic parser comparisons.
- [x] Implement scoring and explicit isolated CLI; immutable results/report/failures/metadata.
- [x] Test schema/evidence/date/outlet/hour/classification/merchant/provenance boundaries and deliberate hallucination survivors; verify captures and no production wiring.
- [x] Run offline benchmark. Run live once if configured credentials exist; otherwise record not executed.
- [x] Run requested regressions, integration against disposable local DB only, corpus, typecheck/lint/build/format/diff; check original activation/pipeline bytes.
- [x] Self-review against spec, synchronize evaluation/verification/changed-files and deliver actual readiness.

Acceptance mapping: steps 1–3 establish spec 1–5; captured review establishes 6–7; scoring/CLI establishes 8–9; tests/review establish 10. Main risks are semantically unrelated exact quotes, hidden metadata, arbitrary model values, crop contamination and false accuracy claims from fixture replay. Test/report those explicitly. No production database or continuous process is needed.

## Verification outcome

Completed source review and offline/adversarial runs; live provider was not executed because credentials/model configuration were absent. Existing unit tests passed with two workers and original timeouts after the unrestricted parallel run hit unrelated research-test timeouts. Integration and corpus passed; scoped lint/typecheck/build/format/diff passed. Repository-wide lint remains red in two pre-existing ignored .local scripts. Exact known development next-env.d.ts baseline was restored after Next build regenerated it. See verification.md and evaluation.md for evidence and limits. No production integration, activation, worker, source acquisition, commit or push was introduced.
