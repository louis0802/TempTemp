# Plan

- [x] Read request, repository guidance, prompt/schema/validator/scorer, and spawn tool contract without reading gold values.
- [x] Write intent/spec/design/plan before research implementation. Explicit model selection supported by tool schema.
- [x] Implement allowlisted task projection, immutable persistence, sealing, existing scoring, and focused isolation/integrity tests (requirements 1–4, 6, 8).
- [x] Verify 18 focused tests before extraction; snapshot protected files and git state.
- [x] Run 49 first attempts using fresh gpt-6-luna agents with bounded concurrency (requirements 1–3). No retries or fallback; all 49 returned.
- [x] Seal raw results; only then access gold, validate/score, and review critical cases (requirements 4–5). Five malformed responses scored as failures. All 18 critical survivors reviewed.
- [x] Run unit suite/typecheck/scoped lint/format/diff, verify boundaries, and complete reports/decision/changed-files (requirements 6–8). Unit rerun with four workers passed 900/900, preserving timeout limits; focused NLP tests passed 89/89.

Outcome: A2 rejected because semantic role/association failures survive validation. No semantic fixes applied. Initial default-worker unit run had one unrelated research-v4 15-second timeout (899/900 passed); the unchanged suite passed with four workers. No application/shared production code changes, so integration/corpus/build were outside this research-only change's required regression boundary.

Risks: context isolation does not itself deny agent filesystem tools; explicit no-tool extraction instructions are required. Exact matching can overcount unsupported paraphrases; report unchanged scorer alongside source review. Infrastructure failure and malformed responses cannot be replaced/retried. Pre-existing dirty work makes whole-tree cleanliness inappropriate; compare task-owned files and protected hashes instead.
