# Execution plan

- [x] Verify branch/HEAD and preserve next-env.d.ts; inspect corpus/parser/runtime boundaries.
- [x] Write consistent intent/spec/design/plan before code.
- [x] Implement types, extraction, registry classifier, isolated signal/evidence builder.
- [x] Implement bounded pinned-DNS resolver and persistent cache; CLI offline and explicit network modes.
- [x] Add focused fixture tests and generate separate analysis artifact.
- [x] Verify fixed-cache byte stability, Morganfield’s independent evidence and public/MVP isolation.
- [x] Run npm test, test:integration, test:corpus, analyze:mvp, typecheck, lint, build, targeted MVP Playwright and git diff --check.
- [x] Review diff/acceptance, record verification and local scoped commit excluding next-env.d.ts. No push.

Checks map to spec: extraction and graph tests (1–3), unsafe target and bounded transport tests (4), registry isolation tests (5), repeated artifact generation (6), two-source fixture (7), baseline hashes/counts and existing regression suites (8). Network access/environment failures must be reported without weakening checks. Production registry remains intentionally empty. Live resolution is optional; deterministic transport fixtures exercise network behavior safely.

## Completion notes

All requested checks passed; see verification.md for counts, hashes and the existing build warning. Native resolver runs were exercised through synthetic transport fixtures, with no live external destination claims. Corpus inspection added adjacent-wrapper extraction coverage. Next automatically regenerated next-env.d.ts during build; exact pre-task bytes were preserved using the baseline hash and remain excluded from commit.

## Follow-up: offer-associated authority

Small-fix path for the review of `3fc3860`; existing intent remains unchanged.

- [x] Verify branch/HEAD and hash protected files before editing.
- [x] Reproduce primary and secondary state leakage with a parsed same-merchant, two-offer roundup.
- [x] Copy link association to evidence nodes (null on permalink); scope authority and fallback states to offer-associated outbound evidence.
- [x] Regenerate the offline artifact and verify repeatability, unchanged identities and retained evidence data.
- [x] Pass focused/full units, typecheck, lint, integration, corpus, MVP analysis and diff checks; synchronize spec/design/verification.
- [x] Review and prepare the scoped local fix commit, excluding next-env.d.ts; no remote changes.
