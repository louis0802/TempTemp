# Execution and verification plan
- [x] Inspect ingestion, serving, Explorer, benchmark and existing test boundaries; preserve initial artifact for audit.
- [x] Implement curated proposition extraction and independent status dimensions; retain validity/Google rules.
- [x] Implement all-record development preview, safe cards/details and physical live gates.
- [x] Replay corpus; inspect all changed records against original text; document each former exclusion and update reviewed baseline only after review.
- [x] Add regression cases for fixed-price/bundle/collaboration/launch/event offers, incomplete fields, online-only, full preview and strict invariants.
- [x] Run npm test, test:integration, test:corpus, analyze:mvp, build, typecheck, lint and focused Playwright; inspect screenshots.
- [x] Self-review diff and acceptance criteria, synchronize documents, commit intended files and verify clean status.
Risks: incomplete source text cannot yield invented merchant/offer; new Google queries may lack cache; preview must not accidentally loosen production eligibility. Verify these explicitly in tests and per-record audit.

Verification results and source-review evidence are recorded in [verification.md](verification.md). No scope deviations: offline cache replay intentionally leaves five newly eligible records needing Google locations. Local commit/status is the final delivery step.
