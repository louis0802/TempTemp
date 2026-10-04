# Revision 6 runtime completeness repair — plan

- [x] Inspect capture, acquisition, recovery, service, tracker and frozen study semantics; back up local research evidence and hash protected files.
- [x] Write consistent intent, spec, design and plan before code changes.
- [x] Implement explicit enumeration/extraction classification and independent rev6 acquisition gates (spec 1–3, 6).
- [x] Validate checkpoint read/write boundaries, retain prior valid state and wire rev6 incremental live traversal (spec 4–5).
- [x] Expose independent tracker diagnostics and precise blockers, preserving read-only commands (spec 7).
- [x] Add focused ambiguity/scoring, failure, checkpoint, incremental, offline recovery and historical regressions (spec 1–6, 8).
- [x] Update rev6 implementation documentation and transition exclusion; synchronize discoveries.
- [x] Run research tests/typecheck, scoped ESLint/Prettier, diff check, tracker text/JSON, protected hash comparisons; self-review acceptance criteria.

Risks: invalid legacy Eatbook checkpoint may leave downtime unprovable; capped bootstrap may require a later genuinely trustworthy observation before reseeding. This must remain non-scoring. Unknown pagination/order cannot be inferred from HTTP success. No major architectural or product decision is unresolved.

Verification: [verification.md](verification.md). All acceptance checks completed; 132 tests pass with two workers. Review clarified that rev6 recovery covers each actual missed cadence window rather than requiring a morning proof to extend through future day-end. The common checkpoint safety repair rejects unsafe mutable state without changing rev5 summaries/evaluators. Default-concurrency I/O timeouts were addressed by bounding test workers, without changing test limits. No runtime activation was performed because no local worker was running.
