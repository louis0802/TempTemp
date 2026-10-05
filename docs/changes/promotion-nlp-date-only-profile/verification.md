# Verification — date-only research profile

Documents: [intent](intent.md), [spec](spec.md), [design](design.md), [plan](plan.md). Created before implementation. User selected experiment repair and reassessment first. This is a self-review; no independent reviewer or experimental subagents were used.

## Delivered

Independent date-only prompt/schema/provider-neutral extractor and validator. Description is copied exactly from complete supplied isolated source text. Structured weekdays, clocks, holiday rules, booking/redemption conditions and their taxonomy are omitted. Core fact provenance, calendar/year/range validity and physical location roles remain checked. Candidates always carry researchOnly=true.

Sealed V4 raw answers, including rejected Early Bird replies, are projected into the new contract without model-answer repair or gold-filled facts. Evaluation gold is used only after construction to assess date windows and participation. Original V1–V4, oracle, fixtures, production modules and selected sealed run retain all 655 preservation-baseline hashes.

Artifacts: [replay](replay.md), [machine-readable results](replay.json), [49 prepared full-source inputs and prompt/schema](prepared-inputs.json), [preservation evidence](protected-evidence-check.json).

## Results and denominator limits

49 original source envelopes, 43 historical economic identities; only 34 normalization replies from 29 sources exist. Those same 34 replies yield 26/34 original contract passes (76.47%) and 28/34 date-only passes (82.35%). Early Bird weekday dinner and weekend no longer fail solely for clock semantics. Original statuses remain unchanged.

Description is exactly preserved for 34/34 replies. Captain Flash/Takeaway restrictions and Bari all-day/tea-time branch wording are retained without asking a model to reconstruct missing conditions. This 100% is deterministic text copying, not LLM accuracy.

31/33 matched reviewed date annotations and 31/33 matched reviewed physical annotations. Unknown dates/scope can match unknown annotations; those percentages do not measure complete validity or directory accuracy. One additional output lacks a mapped reviewed economic identity and is explicitly unscored. Twenty-four units pass contract plus both annotation comparisons; only one also has all retained core/display fields within storage limits. It still lacks runtime directory/coordinate/source-policy proof and may be a historical expired campaign.

Remaining overlapping blockers include 19 missing start dates, 19 missing end dates, 22 unresolved positive participation, five single-quote benefit provenance mismatches, one merchant provenance mismatch, ten benefits longer than current publication storage, two date-annotation mismatches and two participation-annotation mismatches. Provenance or annotation mismatch is not automatically proof of invented semantic meaning. No autonomous publication or fresh-prompt model rate is reported.

## Checks actually run

- Focused `node_modules/.bin/vitest run tests/promotion-nlp-date-only.test.ts --maxWorkers=1`: **24/24 passed**. Covers exact complete Description, full provider inputs, excluded model condition fields, both captured Early Bird replies, Flash/Takeaway, Bari branch union, missing dates/participation, quote/year/calendar/range/branch/role/blank protections, long text, incompatible campaign windows, contest-date semantic scoring and deterministic replay.
- NLP regression `node_modules/.bin/vitest run tests/promotion-nlp*.test.ts --maxWorkers=2`: **314 passed, one existing failure**, 12 files/315 tests. Old V1 preservation test expects historical next-env.d.ts hash 0f706298…; current file hash 1862ac4b… matches Git HEAD exactly. See [proof](existing-test-limitation.json) and [final log](nlp-regression.log). Old assertions and baselines remain unchanged.
- `npm run typecheck`: **passed**, after final source changes.
- Scoped ESLint for the two new modules, replay command and test file: **passed**.
- Scoped Prettier: **passed**. Whitespace checks include new untracked files.
- Frozen V4 run/task/seal/response/source hash verification: **passed**. Replay determinism is checked by independently constructing two reports and comparing all values.
- Protected-evidence comparison: **655/655 unchanged**.

An intermediate broad-test run also failed because tee appended to a new docs log during the existing V4 test's repository snapshot. The same checks were rerun with output captured outside the repository; that failure disappeared. The initial log is retained separately. No timeout, assertion or protection was relaxed.

No UI, application DB, migration, integration service, deployment, public tile, fresh source collection or continuous process is involved. Build/e2e/integration/corpus were not required for this disconnected research change; old publication/persistence/UI files are byte-preserved. Hosted API key and model configuration are absent, so no new prompt call was performed. Prepared inputs are explicitly unexecuted.

## Acceptance review

A1–A5 are exercised by captured-original regressions, negative core checks, semantic annotation scoring and reproducible preservation-verified replay. A6's new focused/type/lint/format/whitespace checks pass; the requested broad historical NLP regression check is partially blocked by its pre-existing generated-file baseline mismatch. That limitation is not represented as a passing suite.

Self-review retained campaign-date ownership and participation scoring separately from structural quote acceptance, prevented Description generation/truncation, checked full-source versus routed-evidence input, preserved calendar/source/branch blockers, and confirmed no production imports or activation. This repairs the experiment's product contract; it does not authorize or verify automatic publication.
