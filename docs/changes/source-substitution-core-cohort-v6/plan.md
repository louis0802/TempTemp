# Revision 6 plan

1. Inspect the current rev5 protocol, recovery, discovery, evaluation, service, tracker, tests and project-local Next.js guidance. Done.
2. Create consistent revision-6 intent/spec/design/plan documents before application-code edits. Done.
3. Add frozen revision-6 assets and hashes; extend revision types and validate the exact three-source core role assignment while preserving historical hashes.
4. Preserve source-specific candidate variants through merge and implement target-blind cohort projection.
5. Add revision-6 core/all completeness summarization using unchanged recovery proof requirements; allow observing rev5/rev6 intervals to use recovery.
6. Add explicit revision-6 evaluation and cumulative metric families with core-only replacement/timing and separate supplemental diagnostics.
7. Update service lifecycle/reconciliation so active rev5 remains rev5 through close and newly opened intervals default to rev6.
8. Update tracker and research documentation for rev6 cohort, completeness, capability audit, supplemental diagnostics and the >=3 rev6 gate.
9. Add end-to-end regression coverage A–L, emphasizing the five-fresh-publisher offline slot, supplemental isolation, zero-recall scoring, restart idempotence, protocol immutability and rev5 transition.
10. Run `npm run research:monitor:test`, `npm run typecheck`, scoped ESLint and Prettier checks, and `git diff --check`. Verify protected historical hashes/evidence, `next-env.d.ts`, no production ingestion/database activity, read-only tracker behavior, and no worker left running. Record exact hashes, changed files, capability audit and evidence in `verification.md`.

No consequential product or architectural decision remains unresolved. Revision 6 deliberately keeps the primary cohort fixed even if another adapter becomes complete-capable during implementation; such a source remains supplemental until a future protocol revision.

Progress: steps 3–10 complete. Verification results and exact delivery files are recorded in verification.md. New regressions use actual five-publisher adapters with controlled HTML, both Telegram channel collectors, persisted passes/checkpoints, restart reconciliation, sealed observation files, and source-isolated manual reviews. Existing rev5 tests now request revision 5 explicitly; default-transition behavior is covered separately for rev6. The ConfirmGood live-enumeration scope correction and conservative timing filter are recorded in design.md.
