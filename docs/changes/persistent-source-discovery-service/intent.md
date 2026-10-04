# Intent — persistent source discovery research service

## Problem and outcome

The forward discovery study currently needs a researcher to start each run, poll Telegram, capture public listings, and preserve files by hand. That makes synchronized multi-day evidence fragile: an overnight interruption can erase observation timing or be mistaken for successful coverage. Build a local, continuously running research service that preserves actual observations, records gaps, and prepares a fresh independent acquisition each Singapore calendar day.

The beneficiaries are researchers deciding whether independent sources can eventually substitute for Telegram discovery. Success is durable daily evidence that survives restarts and separates complete synchronized intervals from partial ones. It does not authorize source substitution, publication, or a production deployment.

## Constraints

- Keep all runtime state and raw source material in a configurable persistent research directory, defaulting to ignored `.local/source-discovery-service/`. No application database is required.
- Reuse the allowlisted Telegram preview collector. Never call production ingestion, publication, or database writers.
- Preserve the sealed Day 0 and failed 2026-09-24T160000Z rehearsal under `.local/source-discovery-monitor/` byte for byte; new service intervals have new identities.
- Pin a new service protocol revision and the frozen source registry without rewriting historical revisions. Public-site failures and incomplete parsers must be visible, never converted into success.
- This delivery is local runtime software and documentation. It does not start a permanent job, deploy, commit, or push.

## Success measures

Hourly attempts for both Telegram channels and one target-blind discovery attempt per Singapore day are scheduled by the process; every successful first observation is timestamped once. State and run files recover after a crash, and uncovered time is represented as gaps. Daily and cumulative metrics are calculated only after independent acquisition, raw benchmark, and required human adjudications are frozen; incomplete intervals are excluded from recall denominators. A status and preflight command explain readiness without changing observation state.
