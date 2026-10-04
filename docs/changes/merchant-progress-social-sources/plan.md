# Execution plan

1. [x] Inspect current map, corrected social audit, direct registry, persistence and repository guides. Snapshot frozen/protected file hashes.
2. [x] Write consistent intent/spec/design/plan before application changes.
3. [x] Implement normalized canonical social inventory, independent backlink verification and safe offline public-response assessment (S5–S8).
4. [x] Select evidence-backed batch and capture public profiles/linked content without auth; record acquisition feasibility and adapter decision (S8–S9). Four exact accounts verified/tested; no complete feed boundary or permission established, therefore no runtime adapter/activation.
5. [x] Implement narrow account/path trust and compatible provenance (S7); preserve persistence/publication processor.
6. [x] Refactor ledger into multiple source tracks and generated progress/cohorts/reports (S1–S4).
7. [x] Test census invariants, ownership/scope failure cases, deterministic replay, text semantics, outlet/reconciliation regressions and protected hashes (S1–S10).
8. [x] Run units (771 passed), integration on disposable local DB only (55 passed), corpus (4 passed), typecheck/build, scoped lint/format and diff. Full lint's unrelated pre-existing local-pilot errors are recorded. Self-review against acceptance criteria and synchronized evidence/manifest completed.

Risks: all frozen Instagram links may be accountless; merchant identities must remain unresolved without explicit evidence. Public social access may be blocked or feeds lack a verifiable boundary, resulting in no adapter. Existing uncommitted files must be preserved. Captured bytes are never formatted. Network sandbox restrictions are reported separately from destination access restrictions.

Implementation discoveries: exact website backlinks establish four accounts, and independent standard public post metadata establishes four linked post/account associations (including two reel canonical identities). Eleven other Instagram merchant candidates lack exact accounts. Existing whole-row equality regression was updated to compare every pre-existing field exactly; added ledger fields have dedicated tests. Full lint has five pre-existing errors in ignored local pilot scripts; scoped lint passes. Next build regenerated next-env.d.ts; its exact before-work bytes were restored using the saved hash. No publication processor, database schema, worker, or historical input changed.
