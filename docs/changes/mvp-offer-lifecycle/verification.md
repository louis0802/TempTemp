# Verification — MVP offer lifecycle

Implementation and isolated reviewed artifact delivered, 2026-10-06; independent guard re-review complete, no open actionable findings. Documents: [intent](intent.md), [spec](spec.md), [design](design.md), [plan](plan.md). No commit, live acquisition, deployment, database writes or recurring jobs.

## Evidence so far

- 136 unique original sources / 180 export candidates / 200 dependent corpus children. Seven captured Pepper inputs are separately counted; 34 historical units are diagnostic. The claimed 27 forms were not reproducible. [Inventory](evaluation/inventory-report.json).
- Frozen mandatory 8/8 and holdout safe facts 4/4 pass; all mechanical endpoint gates pass. 79 family folds are correlated diagnostics of one shared parser, not independent accuracy estimates. Source-level output counts do not imply correctness. [Parser report](evaluation/parser-report.md), [source ledger](evaluation/source-review.json).
- Corpus regression: 3 files / 4 tests pass; strict metrics 136 sources, 181 offers, zero approved, 37 excluded, 144 unresolved, 18 require split, zero failed.
- Focused legacy regressions: 175 tests pass. New focused modules, API, UI and atomic storage pass. Final full suite: **66 files / 1,231 tests passed**.
- Typecheck passes; source ESLint passes. `npm run lint` fails on five pre-existing `no-explicit-any` errors in ignored `.local/source-substitution-pilot/{inspect,upstream}.ts`; those files are untouched.
- Next production build passes. UI desktop/mobile 36/36 checks pass after making two existing date-sensitive tests deterministic; intercepted tiles use the existing PNG fixture and actual MapLibre layout. Screenshots visually inspected: `test-results/mvp-policy-desktop.png`, `test-results/mvp-policy-mobile.png`.
- Legacy artifact, reviewed corpus, research, strict resolution/direct-source code remain unchanged. Optional Listing type has an exact outside-type executable comparison, recorded in [scoped diff review](scoped-diff-review.json). Next generated dev references restored to captured baseline.

## Limits and rollout

Pepper and Shake remain historical archives: no reviewed real source currently qualifies for open-ended renewal/withdrawal. State transitions are tested with labelled synthetic current-list fixtures. Only one-shot offline/fixture refresh has run. Runtime/API does not fetch sources.

Default remains legacy. Preview: `.local/mvp-policy-preview/mvp-promotions.json`; it contains 207 records including the captured official candidates, with no live refresh. Enable only an approved separate artifact using `MVP_OFFER_POLICY=source_observed` and `MVP_POLICY_DATA_PATH`; unset policy to roll back. Independent requested-Luna review approved preserving a separate local opt-in artifact, with 70 withheld rows excluded from live.

Actual logs are in ignored `.local/mvp-policy-preview/`; final compact results will be saved in this document.

## Reproducibility and protected files

Two offline policy builds with saved observations produced byte-identical 207-record artifacts (`cmp` passed). All 477 protected paths exist; 476 hashes match. The sole changed path is the explicitly authorised optional shared Listing type, validated against the recorded strict executable surface and before/after hashes. Reader rollback to v2/default legacy is covered by API/unit tests. All evaluator gates pass after scoped review; original mismatched hash remains reported transparently.

Safety-evaluation source output: dated 65, open-ended 10, abstained/unknown 61 out of 136 complete originals. Schedule output: 69 no-rules, 41 partial/abstention, 26 with no parser-reported ambiguity. Held-out sources (28): dated 15, open-ended 3, unknown 10; schedules 15 no-rules, 7 partial, 6 without reported ambiguity. These are output dispositions, not accuracy. Mechanical unsupported endpoint findings: zero.

## Final full-suite caveat

After restoring the task's original Next generated file, final full run reports **1,235 passed / 1 failed (68 files)**. The single failure is the historical NLP protected-baseline assertion for `next-env.d.ts`: old research snapshot expects development route imports (`0f706298…`), while this task's captured starting file and HEAD contain build route imports (`1862ac4b…`). This task preserves its starting bytes and does not rewrite that research seal/test. Earlier 1,231-test run passed while Next dev references were present. Scoped app/domain tests, actual corpus, build and UI checks remain independently verified; this generated-file discrepancy is reported as a blocked historical snapshot check, not a feature regression or full-suite success.

## Acceptance mapping and final delivery

| Criteria         | Evidence / outcome                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 dates         | Spec table, trusted anchor/timezone, invalid initial/intermediate dates, role/multiple-period abstention, original literal quotes; focused regressions pass.                                                                                                                                                                                        |
| A2 lifecycle     | Presence/absence/valid empty/reappearance, partial/failure/cache/out-of-order, immutable receipt, 14/7-day SGT boundary, no archive renewals; pure/storage/captured CLI tests pass.                                                                                                                                                                 |
| A3 schedule      | Grouping, point/opening-to, last order, PH/eve/LNY eve, inclusive weekday ranges, quota/rhetorical exclusions; unknown wording retained. 8 mandatory and 4 holdout cases pass; all mechanical gates pass.                                                                                                                                           |
| A4 outlets       | Official-first captured providers, source units/addresses, named/excluded/online, no fake coordinates; 12 outlet tests + captured-provider no-network check pass.                                                                                                                                                                                   |
| A5 UI/API        | 36 desktop/mobile checks pass; 6 further filter checks pass; saved reviewed artifact public list/detail/search excludes withheld active dated records; production Telegram privacy preserved, official text escaped.                                                                                                                                |
| A6 corpus/review | 136-source output report, 200 dependent corpus children + 7 official diagnostics, 34 historical diagnostic units, 79 correlated family folds. All originally104 changed/addition rows semantically adjudicated; final ledger102 still changed. No human-gold/accuracy claim.                                                                        |
| A7 preservation  | Legacy artifact/golden/research/strict paths byte-preserved from this task; approved optional Listing type outside-type exact comparison; offline preview and reviewed outputs byte-identical; failed review retains previous artifact; rollback reader tests pass. Old NLP Next mode hash check remains incompatible with captured starting state. |
| A8 delivery      | Build, typecheck, source lint, scoped Prettier, actual corpus, meaningful units/UI and independent review performed. Global lint has5 existing ignored-local errors; full1235pass/1oldNext-hash failure recorded without modifying seals. Final focused affected checks pass.                                                                       |

Separate artifact: `data/mvp-promotions-source-observed.json`,207records. Independent semantic review: [v1](evaluation/semantic-review.md) and [v2](evaluation/semantic-review-v2.md). v2 pins current inputs:34 factual/abstention approvals,70 withheld,0 outstanding semantic corrections. Application helper preserves all records while forcing withheld content/status to needs_content_resolution and appending audit reason. No enablement/deployment/commit has occurred.

Reviewer findings repaired: P2 eligibility filter, P1 lack of per-row semantics; four source semantic issues (bounded-month ambiguity, quota daily, rhetorical weekday, inclusive weekday grammar); final P2 output guard protects all inputs, frozen corpus and captured protected paths before writing. Test-only and actual saved-artifact privacy/exposure checks pass.

Operation: `npm run mvp:sources:refresh -- --source <reviewed-id>` defaults to captured fixtures; only explicit `--live --source` can acquire live. `npm run build:mvp-policy-data` defaults to ignored preview; `npm run mvp:artifact:review` requires exact current review hashes. Enable with `MVP_OFFER_POLICY=source_observed` (optional MVP_POLICY_DATA_PATH), rollback by unsetting it. API requests never acquire sources; no recurring process remains.

## Holdout interpretation

The 28-source hash split is a source-group diagnostic split, while the four safe-fact cases explicitly withheld from worker prompts are the blind safety-case check. Mandatory development fixtures can overlap the nominal28-source split; that aggregate is therefore not an independent accuracy estimate. The 79 family folds deliberately report shared-parser development-family overlap. No human-gold whole-corpus performance claim is made, and no incomplete record is promoted merely to improve these counts.

## Final independent review closure

R 未參與實作，先完成代碼 review，再以 exact original inputs 審查原104rows，最後複查 gate/output-path 修复。其最後結論：沒有 open actionable findings，207record separate opt-in artifact可本機保存，70withheld rows仍blocked，preview/ledger/v2review/artifact hashes未漂移。所有agents已close；沒有process聆聽3100留存（Playwright supervisedserver已結束）。

Late affected evidence: review-path/cache/input protection＋actual saved-artifact API checks5tests pass（`path-guard-tests-final.log`）；same-input failures preserve prior bytes；final affected module checks78pass；scopedformat/source-lint/typecheck pass，finalproductionbuildpass，canonical/reviewed offlineoutputs兩次byte-identical。所有lint/NLPfreeze限制仍如上保留。
