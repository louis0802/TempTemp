# Plan — persistent source discovery research service

## Ordered work

1. Inspect existing research protocol/registry/scripts, preview API, test conventions, and git baseline. Done. Historical Day 0 and failed rehearsal stay untouched; `next-env.d.ts` was already modified.
2. Write these four change documents before application/research implementation. Done. Add a tracked revision-3 protocol for autonomous service cadence without editing revision 1/2.
3. Implement validated atomic storage, process lock, state model, Singapore-day interval lifecycle, raw Telegram observer, and fake-clock scheduler. Checkpoint after each channel and source. Done.
4. Implement target-blind daily source capture/detail inspection and conservative candidate proposals with full cap/failure counters and source-side deduplication. Keep human validity audit separate. Done, with unsupported category routes and uncertain dates/scope explicitly partial.
5. Implement acquisition/raw benchmark freezes, review validation, evaluation, cumulative metrics, immutable manifest verification, status and preflight. Done. Scoring excludes incomplete Telegram coverage and missed daily acquisitions.
6. Add CLI/npm commands and a research runbook covering start, stop, persistent storage, restart, pending reviews, and verification. Keep generated observations ignored. Done.
7. Run focused service and preview tests, typecheck, scoped lint, fixture preflight/restart, seal/hash and isolation checks. Inspect git diff/status and verify `next-env.d.ts` matches its starting bytes. Done; see `verification.md`.

## Acceptance mapping

- S1–S2: storage/Telegram/scheduler tests and restart fixture.
- S3: captured HTML fixtures, per-source counters, cap and source failure cases.
- S4–S5: transition/review/seal/metrics tests, especially incomplete interval denominators.
- S6–S7: fixture preflight/status, import scan, git and historical SHA checks.

## Risks and decisions

- Public source layouts differ. The frozen registry has 19 sources, 14 marked enumerable; adapters use captured HTML structures where available, but required category/tab traversal and dynamic indexes can remain explicit incomplete coverage even when an index request succeeds. Candidate proposals are not presented as audited precision.
- Human adjudication may lag raw collection. The worker keeps collecting later days while prior intervals wait for review. Scoring is gated rather than guessed.
- Autonomous cadence changes the revision-2 observation contract. New service runs pin revision 3; historical files retain their original revision and hashes.
- The first service interval begun mid-day and any restart gap exceeding cadence are non-scoring, even if later polls work.
- The collector's snapshot `completeThrough` can precede poll completion. The next cutoff uses `completeThrough` while `first_seen_at` uses actual completion, preventing slow-poll skips. Posts published before baseline but first visible later remain historical anomalies and make the interval non-scoring.
- A crash after day closure but before opening the next day is recovered from `last_completed_interval`; interrupted starts do not exhaust the bounded network-failure retry budget.
