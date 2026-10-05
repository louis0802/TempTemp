# Plan

- [x] Inspect actual source/validator/candidate/publication behavior and installed Next.js Vitest guide.
- [x] Clarify scope: user selected research experiment and reassessment first.
- [x] Record intent, spec, design and plan before application edits.
- [x] Capture a preservation baseline for original NLP/research/fixture/sealed evidence: 655 existing files.
- [x] Implement the independent full-source date-only schema/prompt/extractor/validator and archived-output projection (A1–A4).
- [x] Implement deterministic sealed V4 replay and separate core semantic/operational metrics (A4–A5).
- [x] Add original-text regression cases for Early Bird, Flash/Takeaway, Bari branches, unknown dates, contest ownership, evidence integrity and source-length handling (A1–A5): 24 focused tests.
- [x] Run focused tests, NLP regressions, typecheck, scoped lint/format and diff/preservation checks (A6). Focused checks pass; old NLP suite has one pre-existing generated-file hash mismatch, recorded in verification.md.
- [x] Generate/reproduce the report, examine failures and review the diff against acceptance.
- [x] Synchronize design/spec discoveries and record verification evidence.

Dependencies: installed Node/npm/tsx/Vitest/Zod and existing sealed local V4 artifacts. No fresh model or external data collection is required for replay. Hosted credentials/model configuration are absent; do not claim a fresh prompt success rate. No subagent execution is authorized in this task.

Risks: removing clocks changes the success definition; raw-reply acceptance must not be reported as new model reliability. A full source Description may exceed current 5,000-character publication storage or include multiple economic offers; preserve it and flag rather than truncate or merge unrelated facts. Existing structural quote/year checks do not prove campaign-date ownership; report semantic benchmark checks separately. Production integration and source/coordinate proof remain outside scope.

## Execution findings

Among 34 available sealed replies, old contract acceptance is 26 and the date-only profile accepts 28. The two recovered replies are Early Bird weekday dinner and weekend; complete Description is retained for all 34. Nineteen replies lack campaign dates and 22 lack positive physical participation. Only one has all retained core/display fields and matching existing annotations; this does not supply directory/coordinate verification or current-date eligibility.

No fresh provider is configured, so prepared-inputs.json supplies 49 full-source cases plus the new prompt/schema for a later model experiment. This delivery's reassessment is retrospective only. The user's requested simplification is recorded as a changed product contract, not a repair of old frozen scores.

The old V1 protection test expects a historical development next-env.d.ts hash. The current file is byte-identical to Git HEAD and untouched by this task; neither it nor the old baseline/test was changed to make the check pass. A first logging attempt also changed a new docs log during V4's whole-repository snapshot test. Retrying with output in /private/tmp removed that interference without changing any test. Preserve logs outside the snapshot tree until such tests finish.
