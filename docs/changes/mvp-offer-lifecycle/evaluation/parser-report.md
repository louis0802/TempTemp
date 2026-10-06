# Offline MVP offer-policy evaluation

Codex automated review; not human reviewed. No whole-corpus correctness or accuracy claim.

Inputs: 136 exact original sources; 180 export candidates; 200 legacy children. Preview: 200 original-corpus children plus 7 additional official children (207 total). 34 historical units are diagnostic only.

Source-level output coverage: {"dated":65,"openEnded":8,"abstainedOrUnknown":63}. Schedule output dispositions: {"no_rules_found_not_correctness_credit":70,"partial_fields_or_abstention":40,"rules_without_reported_ambiguity_not_gold_verified":26}. No-rule absence earns no correctness credit.

Frozen gates: mandatory 8/8; holdout 4/4. 12 cases refer to 11 unique sources.

Frozen inputs: PASS; 6 frozen input checks. Protected baseline: 477 hashes checked; 1 byte differences require parent scoped review. Preview/current parser parity: PASS.

Mechanical safety: 0 original sources / 0 preview children have findings. Patterns: {}. These checks are not complete semantic adjudication.

Preview ledger: 51 children have scalar date/schedule differences; 88 have added schedule structure. Every preview child is recorded in source-review.json with source text or captured adapter text with raw receipt reference, trusted publication or first-receipt anchor, parser input, new audit, literal mapping, diff and unresolved blockers. All differences remain subject to semantic review.

Family folds: 79 correlated per-source diagnostics, with shared parser development-family overlap. They are not independent training splits and must not be pooled.

Failed frozen cases:

- None.

Run offline: `node --import tsx scripts/evaluate-mvp-offer-policy.ts`. Reports are written even when semantic gates fail; exit status is 1 on a failed integrity, frozen-case, source-safety or artifact-safety gate. Tests: `npx vitest run tests/mvp-offer-evaluation.test.ts`.
