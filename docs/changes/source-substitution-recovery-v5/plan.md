# Revision 5 plan

1. Inspect service, storage, protocol, acquisition and scoring; snapshot protected hashes. Done.
2. Write consistent intent/spec/design/plan before implementation. Done.
3. Add frozen revision-5 assets and provenance with backward-compatible types.
4. Implement durable catch-up and overdue-day reconciliation with conservative completeness.
5. Split eligibility, cumulative metrics and tracker gates.
6. Add regression tests A–H with temporary roots and mocked network.
7. Run research tests, typecheck, scoped lint/format, diff check; verify protected bytes and read-only tracker. Record evidence and limits.

Risk: generic listing adapters lack reliable historical publication boundaries. Report partial/unsupported; do not grant replacement eligibility from a current listing response. No unresolved product decision blocks implementation.

## Completion

Steps 3–7 are complete. Regression coverage maps A–H to `tests/research-v5.test.ts`; existing revision-4 tests now request revision 4 explicitly, and tracker tests assert that legacy days cannot advance revision-5 gates. Self-review checked recovery namespaces, interrupted passes, earliest receipt preservation, source checkpoint selection, unknown publication dates, strict scoring compatibility, seals and read-only commands. No independent review was claimed or delegated.

No production scope was added. The planned conservative adapter limitation remains: 14 sources provide partial recovery and 5 are unsupported; no existing adapter can prove complete downtime history. See [verification.md](verification.md) for exact hashes, commands, protected-file evidence and the changed-file inventory.
