# Plan

1. [x] Extend discovery listing evidence with source-backed publication timestamps and recovery traversal diagnostics for the three dated archive sources.
2. [x] Add durable research-only per-source recovery checkpoints derived from successful live enumeration, with backward-compatible seeding from persisted live pass evidence.
3. [x] Add source-specific dated-archive proof construction and derive SourceRecovery.status from proof instead of registry capability alone.
4. [x] Stop dated recovery after checkpoint crossing plus one deterministic overlap page so deep archive tails do not force artificial cap truncation; detect repeated pages, ambiguous pagination, and ordering violations.
5. [x] Integrate live checkpoint updates in the revision-5 service while keeping recovery idempotent and sealed evidence immutable.
6. [x] Update tracker output/documentation with runtime capability, checkpoint, proof, window, and limitations.
7. [x] Add deterministic rev5 tests for complete traversal, caps, loops, ordering, unproven checkpoints, scoring separation, idempotence, and historical hash immutability.
8. [x] Run npm run research:monitor:test, npm run typecheck, scoped ESLint/Prettier, and git diff --check; record exact verification results in verification.md.

No protocol revision is planned because the pinned revision-5 protocol/registry semantics and hashes do not need to change. If implementation discovers that a frozen semantic field must change, stop that mutation and introduce a new revision instead.
