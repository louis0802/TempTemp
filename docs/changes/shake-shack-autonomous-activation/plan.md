# Execution and verification

- [x] Inspect implementation, fixtures, project guidance and dirty state; preserve original evidence.
- [x] Write intent/spec/design/plan before application changes.
- [x] Add registry profile, tightening-only overrides and full classification ledger; fixture/boundary/CLI tests first (spec 1–2).
- [x] Add explicit Singapore lifecycle, no-resolver excluded persistence, processor v2 and regression tests (spec 4–6).
- [x] Run focused fixture tests; only then one bounded live acquisition and immutable new capture (spec 3).
- [x] Replay twice; inspect actual dispositions and twelve-branch proof; decide activation from evidence (spec 7).
- [x] Rebuild frozen merchant map twice and validate counts/status (spec 8).
- [x] Complete focused/unit/corpus/disposable integration/typecheck/scoped lint/format/diff checks, review diff and synchronize docs.

Risks: site/network failure or changed archive structure keeps source shadow; unknown article detail invalidates completeness. Existing historical fixtures are partial and must remain partial. Existing scratch lint failures are reported separately. Coordinate validation is fixture-mocked and never authorizes production geocoding. No required approval checkpoint remains for authorized implementation.

## Final decisions and deviations

The one approved-network acquisition observed 4 listings / 44 unique articles, with 10 promotion and 34 non-promotion classifications and zero unresolved. The registry budget remained 5 / 50 / 60; no post-acquisition budget increase. The initial sandbox DNS failure retained a separate empty-response manifest. Complete captured replay and twelve-branch fixture proof passed before enabling; the current Parkway campaign auto-published only in a disposable test DB. Other campaigns: four expired exclusions and five review rows.

Added explicit same-bytes expiry-boundary re-evaluation during self-review, with regression coverage; this changes automatic disposition without changing source-byte revision identity or stored promotion facts. Frozen map review input stayed unchanged: optional registry activationReview metadata supplies the current enumeration/blockers to map presentation. All other merchants keep their original registry configuration and behavior.

Default unit concurrency caused timeouts in existing research fixture tests; full identical suite with one worker passed 647 tests without changing timeouts/assertions. Integration passed 53, corpus passed 4, typecheck/scoped ESLint passed. Full lint retains five unrelated scratch errors. Final focused/scoped formatting/diff results and protected hashes are in verification.md.
