# Plan

- [x] Inspect baseline and capture original 28 IDs.
- [x] Write and cross-check the four documents before application edits.
- [x] Extend opt-in MVP discovery, safe source matching, location-label retention and precise audit codes.
- [x] Integrate pipeline/schema/server/detail UI, preserving strict path and gates.
- [x] Focused unit/browser regressions for spec 1-6: ambiguity, country, street numbers/ranges, closed anchors, units, cache and pagination.
- [x] Live Google build, review all original outcomes, offline replay and exact 28-row ledger (spec 7-8).
- [x] Run npm test, test:integration, test:corpus, analyze:mvp, typecheck, lint, build, focused Playwright, diff check and screenshot inspection.
- [x] Review acceptance/diffs, synchronize evidence, commit locally and confirm clean Git without push/remote.

Risks: provider variability, missing address business status, floor fragments, ambiguous venue names, refreshed results affecting already-ready records. Prefer concrete residuals over forced readiness.

## Execution evidence and deviations

All implementation and verification steps completed; see verification.md and ledger.md. The first live pass had seven residual primary blockers. Captured-response review justified structured route matching, complete numeric range equivalence, typed exact-address anchor preference and supermarket category/name equivalence, resulting in zero primary blockers while preserving three unresolved named locations across two partially ready records. No product scope or acceptance criteria changed.

The final scoped commit and clean-tree confirmation are recorded in the task completion response. No remote/push. Initial sandbox network/socket failures were retried with authorized access. Live HTTP/network errors now protect the previously generated artifact from accidental replacement, a safeguard prompted by the observed initial failure.
