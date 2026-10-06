# Specification — one fresh answer per full source

## Observable requirements

Each model task receives the fixed existing date-only prompt/schema, complete original source string and optional merchant/title context hints only. Evaluation notes, parser outputs, previous answers, dates/classifications/outlet answers and correct offer boundaries are excluded. Sources remain whole; the evaluator does not split them for the model.

Extract classification, merchant, title, literal benefit with From/Up to/quantity qualifiers, campaign start/end dates and participating/excluded physical outlets. Every populated fact has a literal contiguous source quote. Dates require explicit source years; publication metadata, URLs, present dates and contest deadlines cannot fill economic validity. Mentioning a branch is insufficient participation; all_outlets requires explicit wording. Missing dates/participation remain null/empty. Multiple independent offers or incompatible dates that cannot be safely isolated require uncertain. Weekdays, hours, membership, reservations, holidays and redemption restrictions stay in Description, without a redeemable-now judgment.

The caller copies Description verbatim including newlines, even for failed/uncertain responses. Overlong source or fields remain preserved with blockers; nothing is truncated to pass storage checks. Null facts can be semantically correct but never count as complete.

Before any extraction call freeze prompt, schema, validator dependencies, scorer, sample list, evaluation notes, source/capture hashes and task messages. Persist the raw first final response before parsing. Seal all responses before scoring. Detect duplicate tasks, agent reuse, input/raw tampering, missing responses, configuration drift and concurrency violations. Preserve refusal, malformed, missing and uncertain units in their applicable denominators. Agent-authored notes are labelled as such, never human ground truth.

## Acceptance criteria

- A1: 49 fresh regression calls and up to 20 disjoint holdout calls, requested gpt-6-luna/medium/fork_context=false, maximum four open agents. No retry/repair/fallback. Every saved agent is closed.
- A2: Strict whitelist input projection excludes evaluation and historical content. Full-source hashes and literal Description equality are verified.
- A3: Exclusive first-response records bind task, agent, requested configuration, source/input/message/raw hashes; launch and closure records support a chronological concurrency audit. Backend model identity and usage are unavailable unless the tool actually returns them.
- A4: Freeze and final seals cover all evaluative inputs and raw records; scoring rejects changes and reproduces exactly after sealing.
- A5: Separate cohort counts with numerator/denominator for execution/refusal/parse/schema/contract, identity and safe abstention, known/unknown/missing/wrong dates, positive and negative outlet roles, validator-pass wrong facts, core completeness/blockers, deterministic Description and storage readiness. Missing/malformed/uncertain responses cannot vanish from denominators. Available elapsed time is measured; token usage is unavailable.
- A6: High-risk errors show complete source, raw answer, validator result and agent-authored pre-frozen expected notes. V4 34-unit replay is historical only; paired comparison is limited to exact source and compatible single-campaign boundaries, with different routed versus whole-source flows disclosed.
- A7: Focused meaningful tests, existing NLP regressions, typecheck, scoped lint/format, diff review and preservation hashes are recorded. Existing next-env.d.ts baseline failure is separate and unchanged; snapshot test logs remain in /private/tmp during execution.

## Predeclared decision rule

Remain research-only in every outcome. Recommend a limited candidate-organization trial requiring human review of every fact only if the actual holdout has 20 sources/five merchants, at least 90% contract validity and 80% economic recognition on unambiguous economic sources, no false economic classification on definite nonoffers, and zero validator-pass wrong campaign dates or physical role facts. Completeness is reported separately, including intrinsic missing-source blockers. If these conditions fail, recommend contract/evaluator correction before a trial. No threshold is changed after results; no automatic next experiment follows.
