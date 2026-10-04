# Design

Parallel modules under src/ingestion/promotion-nlp/{schema-v2,prompt-v2,validator-v2,benchmark-v2}.ts; no v1 export edits. Shared v1 plain-text evidence/calendar helpers may be imported read-only. No candidate mapper is needed; v2 has no production call site.

Primary object carries main quote, source-supported title and benefit evidence. Schedule/scope envelopes carry value, quote and associationQuote; location rules carry role, names, quote and associationQuote; restrictions carry verbatim text, role, quote and associationQuote. Strict Zod objects disallow extra fields. A null model scope is retained, never manufacturing internal source_unspecified.

Validator rejects missing/non-exact quotes, associations, invalid dates/year/weekdays/hour forms, unsupported label/text containment, conflicting location roles and facts on non-promotions. It cannot prove quote entailment or a claimed positive role; misleading but exact evidence is detected in the separately annotated semantic evaluation. Do not write exclusion/contest keyword semantic regex. Schema tests demonstrate structural distinction; benchmark regression tests demonstrate role correctness.

Separate benchmark-v2.json stores unchanged source envelope and reviewed semantic targets/allowed identities/secondary evidence/restriction roles/qualifiers plus derivation notes. Freeze canonical role definitions and all module/artifact hashes before first spawn. Source annotation is necessarily read in preparation by the parent; scoring loads it only after sealing. Blind agents receive no annotations or history.

Separate scripts/research/promotion-nlp-subagent-v2-evaluation.ts prepares sanitized tasks, records exclusive first responses, seals, verifies snapshots and scores. Run root .local/promotion-nlp-subagent-v2/<run-id>/. Keep raw JSON parse failures separate from schema errors and evidence rejection. Semantic scorer produces auditable case findings; parent source review validates all findings and records any supported wording/grouping differences separately. Compare sealed v1 source-reviewed outcomes without modifying v1. No network/provider/database imports. Freeze and verify whole research implementation plus protected source files.

No migration, rollout or recurring process. Rollback is removing only newly added v2 files. Free-form subagent syntax is not equivalent to strict API Structured Outputs. Model configuration is accepted requested gpt-6-luna/medium; backend revision is unavailable. Tool isolation is prompt-enforced, not mechanical.

## Execution evidence and discovered limits

The completed run has 49 unique fixed-configuration agents and a verified raw seal; all contract/validator/scorer/annotation/role-definition hashes remain frozen. Parent source review is an explicit post-seal overlay, stored separately from unchanged automated scores. It reviews all fields and each emitted restriction, confirms/dismisses finite-alias/anchor flags, and adds unflagged association failures. No semantic oracle or independent judge is claimed.

Accepted restriction arrays reindex after rejected items are removed. Source review therefore determines whether a raw restriction survived by matching the original full item to the accepted list, rather than comparing raw/accepted numeric field paths. Raw-response indices remain in source-review.json for audit. No frozen scorer code is changed to incorporate post-run discoveries.

The initial date metric covers normalized start/end dates; invented numeric opening-hour availability is separately exposed and still fails the wider validity/conservatism gate. Malformed-readable Monday text is qualitative only, never repaired into usable data. Zero observed usable date/polarity/physical-identity errors does not establish safety for nine unassessable responses. Decision remains A; no production rollout.
