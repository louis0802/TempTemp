# Design

## Repository grounding

V1 candidate-mapper.ts already preserves normalized full text but still maps schedule/condition fields. V4 normalizes only evidence routed to one proposition and can lose restrictions upstream. Its validator-v4.ts rejects unsupported_time_semantics, while original raw replies remain sealed locally. Production domain validity distinguishes ongoing campaign dates from redeemableNow; neither production contract nor map UI needs changing for this research scope.

## Implementation

Add independent research modules under src/ingestion/promotion-nlp/date-only*.ts. Use strict Zod objects, existing input/source and calendar helpers read-only. The new model output contains classification, merchant/title/benefit, start/end dates, location scope and physical location rules with literal quotes; it has no Description, weekday, clock or extracted condition fields. A pure validator builds Description directly from the exact input text and marks every result research-only. Non-null facts require source quotes, dates require source year/calendar/range checks, and physical rules require source-literal identities and coherent roles. Structural validation cannot prove all date ownership or participation semantics; benchmark scoring must retain those separate failures.

A pure archived V4 projection selects only the new core fields and translates evidence IDs to their archived quotes. It does not repair rejected benefit/merchant facts or use gold to construct output. Full Description comes from the source envelope, not the truncated Stage5 task. Original weekday/clock/constraint fields remain only in the immutable historical reply.

Implemented files: date-only-profile.ts contains the profile/prompt/provider-neutral entry point and archived projection; date-only-evaluation.ts evaluates date windows and physical role sets separately. Description preserves the supplied source string including line breaks. Blank facts/quotes fail the new schema. Description, title, merchant and benefit exceeding the existing publication limits are reported without truncation.

A standalone research command reads benchmark-v4, archived stage5 tasks/raw/seal, scores and existing source-review. It verifies raw/task/source capture hashes, validates every normalization response with the new contract, and evaluates dates and physical participation against the separately supplied reviewed annotations. Mapped time-only variants may be compared against the union of their reviewed physical branch sets; incompatible dates fail explicitly. Annotated aliases remain evaluation equivalents, not runtime identity rewrites. Unknown/unannotated values are labelled rather than assumed correct. Save deterministic JSON and a readable Markdown report in the new change directory. No DB, worker, acquisition or hosted-provider import belongs in the replay script.

The implemented script calls the existing read-only frozen-run and recursive stage-seal verifiers, then independently checks capture and raw-response hashes. It produces replay.json/replay.md plus unexecuted prepared-inputs.json. Run with `node --import tsx scripts/research/promotion-nlp-date-only-replay.ts`; arguments are rejected, and no package/startup hook is added. Source input metadata is preserved separately; only context hints and complete SOURCE_TEXT enter the provider-neutral model input.

Metrics have separate denominators: 49 source envelopes, 43 historical economic identities and the available raw normalization units. Contract compatibility is not autonomous correctness. Missing dates/participation and overlong Description are separate operational blockers. Physical directory/coordinates and production authority are never supplied by this replay.

## Preservation and rollback

Do not edit original research implementations, fixtures, source-review, sealed .local runs, registry, production publication/persistence or UI. Remove only the new profile, command, tests and change documents to roll back. Capture and compare a SHA-256 baseline of old NLP modules, fixtures, original change records and the selected sealed V4 run. No data migration or deployment is involved.
