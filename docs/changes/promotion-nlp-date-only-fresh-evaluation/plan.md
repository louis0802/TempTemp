# Plan — fresh date-first evaluation

- [x] Read AGENTS.md, architecture, date-only records/modules/replay, oracle decision and existing subagent isolation/first-answer/seal mechanisms.
- [x] Verify Codex subagent model override supports gpt-6-luna and medium; tool has no backend identity/token-usage attestation.
- [x] Capture starting preservation hashes and Git staged-diff hash in /private/tmp before new files.
- [x] Persist intent.md, spec.md, design.md and plan.md before research implementation (workflow checkpoint).
- [x] Select 49 regression and up to 20 disjoint retained-source holdouts, review full text and fix separate agent-authored semantic notes (A1/A2/A5).
- [x] Implement isolated runner/scorer and meaningful tests; resolve findings before freeze (A2–A7).
- [x] Run focused/NLP/type/lint/format checks with snapshot logs outside repository, record next-env.d.ts limitation without changing old tests (A7).
- [x] Freeze prompt/schema/validator/scorer/tasks/samples/notes/capture hashes and preservation baseline; verify (A2–A4).
- [x] Execute one new isolated subagent per source with four-open-agent maximum; persist first final answer then close each agent (A1/A3).
- [x] Seal complete raw archive, verify bindings/concurrency/protection, then score reproducibly (A4/A5).
- [x] Review every high-risk error without changing frozen evaluative material; create full failure evidence, bounded historical pairs and final decision (A6).
- [x] Synchronize documents and record actual verification, limitations and deliverable paths (A7).

Dependencies: installed Node 24/npm/tsx/Vitest/Zod/Cheerio, retained source fixtures and enabled multi_agent_v1 Codex tools. Parent handles source review, implementation and orchestration; no extraction agent handles labels or code. Consequential decision: preserve the existing single-output date-only contract, so genuinely independent whole-source offers may abstain rather than split with evaluator help.

Risks: regression is design-exposed; holdout availability/merchant coverage must be audited; semantic quotes alone do not prove date ownership; unknown matches are not completeness; source/field length limits may block storage. Sampling stability is unmeasured. Scope prohibits production, network source acquisition, retries, fallback, commit/push and future study activation.

## Pre-freeze evidence

Selected 49 regression envelopes and 20 distinct whole-source holdouts from the retained review-inbox export. There are 18 distinct named holdout merchants plus one multi-merchant roundup source (20 records total). Regression notes: 38 economic sources, eight definite nonoffers, three ambiguous whole-source cases. Holdout notes: 16 economic, two nonoffers and two ambiguous cases. Notes were reviewed by the parent agent, not a human annotator. Some holdouts describe campaigns/merchants also seen in other source families; source-level holdout is not campaign-level independence.

19 focused tests pass. Existing NLP suite: 333 pass / one unchanged next-env.d.ts hash baseline failure (334 total). Typecheck passes. Scoped lint/format pass after removal of an unused type import. 2,477 protected files and the initial Git index are unchanged. Logs remain in /private/tmp during snapshot tests. No independent reviewer was used.

## Final execution record

69/69 fresh first answers were archived and every agent closed after saving; no retry, repair or fallback. All 69 IDs are unique and differ from 702 prior IDs; maximum four open agents. Raw seal verified before annotation loading/scoring. Two independent reconstructions exactly match results.json. The frozen regression/holdout contract counts are 23/49 and 15/20, completeness 3/49 and 0/20. The predeclared limited-trial gate fails.

49 diagnostic error records (including every one of 23 frozen high-risk flags and source-backed physical omissions) are source reviewed in error-review.md without changing frozen notes/scorer/results. Physical alias/collective-label/boundary-policy flags and an inherited all-scope recognizer false rejection are explicitly separated from confirmed fact errors. Historical pairing contains 28 units from 26 sources; no aggregate V4-to-new accuracy-improvement claim is made.

Final typecheck, scoped lint/format, score reproduction and 2,477 preservation hashes pass. Focused tests 19/19; existing NLP 333 pass / one unchanged next-env.d.ts hash failure. Git HEAD/index are unchanged. New documents are synchronized; no production path or future experiment is activated.
