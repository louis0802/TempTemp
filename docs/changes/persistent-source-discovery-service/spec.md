# Specification — persistent source discovery research service

## Researcher journeys

1. A researcher runs preflight to check preview connectivity, source registry, protocol integrity, storage writability, and state shape without adding an observation.
2. The researcher starts one local service process. It polls `sgfooddeals` and `tastesoulsg` near hourly wall-clock boundaries and runs registered, independent source discovery once each Singapore calendar day. Status shows the next times, latest successes, counts, failures, and gaps.
3. After shutdown or a crash, the researcher restarts the same command and data directory. Existing post identities and first-seen times remain, missed polls are gaps, and an interrupted daily acquisition is resumed or recorded as incomplete without duplicate scheduled runs.
4. At a day boundary, a daily interval closes. Acquisition is frozen before the raw Telegram observation set. Source-side candidate reviews and Telegram offer adjudication may be supplied later; the service records pending review and seals/evaluates only when inputs meet the protocol. Partial evidence is retained even when scoring is impossible.

## Rules

- `first_seen_at` is the timestamp of the first successful preview observation or candidate-side capture. Telegram publication time stays separate. Baseline IDs are never new observations. A failure never creates observed posts or a successful poll.
- Every day uses `[00:00, 00:00)` in Asia/Singapore. A fresh start after the day begins makes that interval partial. Both channels need pre-start baselines and gap-free required polls for benchmark scoring. Public previews cannot prove transient between-poll posts were seen.
- Discovery starts only from the frozen registered indexes and their linked pagination/details, with each source's safety caps. Telegram content and benchmark offers are invisible to source enumeration, extraction, deduplication, and candidate validity review.
- Save all cards and inspect eligible-looking linked details up to each source cap, rather than a handpicked one-per-source subset. Record cards seen/evaluated, candidate proposals, remaining pagination, cap truncation, listing/detail failures, and incomplete extraction. A proposed candidate is not an audited valid promotion.
- Raw observations and frozen acquisition/benchmark inputs are immutable. A sealed run cannot be rewritten. Corrections need a supplemental run or protocol revision.
- Exact/probable one-to-one offer matching, candidate validity, completeness, and miss diagnosis use the pinned research protocol. Where source or benchmark review is pending, show null metrics with a reason. Cumulative benchmark denominators include only complete synchronized, reviewed intervals; no historical or rehearsal run is imported as a service interval.
- Comparative timestamps are retained, but lead/lag is reported as bounded by daily acquisition cadence, never as sub-hour precision.
- One source or channel failure does not stop other observations. Retries are bounded and polite. SIGTERM/SIGINT close the current write safely.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| S1 | A configurable research data root persists validated service and channel state with atomic replacement; a restart preserves identities/times and records downtime gaps. |
| S2 | Both allowlisted channels use `collectPreview()` hourly; baseline, duplicate, channel, failure, and first-seen behavior is covered by offline tests. |
| S3 | Daily target-blind discovery uses the pinned registry, stores listing/detail evidence and per-source coverage counters up to caps, and never reads benchmark input during acquisition. |
| S4 | Each Singapore day has explicit prepared, observing, acquisition_frozen, benchmark_frozen, evaluated, and sealed transitions or an explicit pending/partial reason; a seal verifies its hashes and resists rewriting. |
| S5 | Reviewed complete days expose daily and eligible cumulative recall/overlap, precision, inspectability, completeness, miss classes, and timing caveat. Incomplete Telegram coverage has null recall and is outside cumulative recall denominators. |
| S6 | Preflight is read-only for observations; status exposes schedule, health, interval, counts, and gaps. Restart and scheduler tests use fake time/network. |
| S7 | Production ingestion/database paths and historical runs remain untouched; research scripts, tests, runbook, and npm commands are isolated. |

## Review boundary

Automatic extraction from heterogeneous public pages is conservative. Raw daily listing/detail capture and candidate proposals continue without a reviewer. Final candidate validity, Telegram offer interpretation, and ambiguous matching remain research review inputs; a day is not reported as scored until those inputs are complete and independently frozen.
