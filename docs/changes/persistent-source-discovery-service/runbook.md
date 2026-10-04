# Persistent source monitor runbook

## Scope

This worker collects research evidence from public previews and registered public source indexes. It does not publish promotions, use the application database, or start through `npm run worker` or `npm run ingest`. The default protocol is revision 4; revision 3 and its original registry remain pinned for historical intervals. Protocol assets live under `scripts/research/source-monitor/protocol/`. The earlier sealed Day 0 and failed rehearsal stay under ignored `.local/source-discovery-monitor/` and are never read as service observations.

## Start and stop

Use Node 24 and `npm ci`. From the repository root:

```bash
npm run research:monitor:preflight
npm run research:monitor
```

Preflight contacts only the two allowlisted Telegram public previews. It verifies protocol and registry hashes, checks directory writability and any existing state schema, and does not add observations. It exits nonzero if either preview is unreachable. The service starts polling at the current wall-clock hour. Revision 4 attempts five explicitly registered fresh publishers every three Singapore wall-clock hours and the other source classes once per Singapore date. See [the stable tracker](../../research/source-substitution-tracker.md) for the exact contract and selected set. It stays in the foreground; keep the terminal/process alive with the user's normal local process supervisor. Press Ctrl-C or send SIGTERM to stop. The worker finishes or interrupts the current bounded operation, persists state, and releases its process lock. Do not run two copies on the same data root.

`SOURCE_MONITOR_DATA_DIR=/persistent/path` selects a mounted data directory. By default the service uses ignored `.local/source-discovery-service/`. Keep this directory across restarts. It contains:

```text
state.json                 durable service, Telegram and discovery state
health.json                latest compact health snapshot
service.lock               present only while the worker owns the directory
runs/YYYY-MM-DD/           one Singapore calendar-day interval per directory
  interval.json            run identity and phase transitions
  discovery/               per-source checkpoints and raw listing/detail HTML
    passes/<slot>/         revision-4 pass.json, result.json and source checkpoints
  discovery-result.json    merged revision-4 daily acquisition at close (revision 3: single completed pass)
  acquisition.json         write-once frozen source-side input
  telegram-raw.json        write-once observed posts and coverage
  OBSERVATIONS_SEALED      hash seal of source and raw Telegram evidence
  reviews/                 researcher-supplied adjudications
  evaluation.json          final daily metrics after review
  manifest.json, SEALED    final immutable hash seal after evaluation
logs/YYYY-MM-DD.jsonl      structured research events
```

Generated state, HTML and observations remain ignored by Git. `state.json` uses an atomic sibling temporary file and rename. Orphan `.tmp` files from a crash can be left in place; the reader opens only the named JSON file. A dead process lock is recovered by checking the recorded PID. Do not manually delete a lock held by a live worker.

## Inspect and recover

```bash
npm run research:monitor:status
npm run research:monitor:metrics
npm run research:monitor:tracker
npm run research:monitor:tracker -- --json
SOURCE_MONITOR_DATA_DIR=/persistent/path node --import tsx scripts/research/source-monitor-worker.ts verify YYYY-MM-DD
```

Status lists the active interval, last successful Telegram and discovery work, next expected times, candidate/post counts, failures and gaps. `metrics` includes only fully reviewed, synchronized, finally sealed service days in cumulative scoring. `verify` checks the raw observation seal and, when present, the final manifest. A day with `OBSERVATIONS_SEALED` but no `SEALED` has immutable captured evidence and is waiting for review.

Restart the same command with the same data directory. Existing channel IDs and `first_seen_at` values are retained. Revision 4 derives coverage from scheduled slots, with five inclusive minutes to successful completion; missing, failed and late slots remain distinct. Revision 3 keeps its original elapsed-gap semantics. Neither invents missed observations. If a daily source capture was interrupted, completed source checkpoints are reused and unfinished sources can resume **only during the same Singapore day**. Once the day closes, the worker freezes the honest partial evidence. A source failure or unsupported dynamic listing is shown in that source's snapshot; it does not silently count as a covered index. The first day started after midnight or a day with a late/failed baseline is non-scoring.

## Review and finalization

The worker independently freezes `acquisition.json` before `telegram-raw.json` at day close. Raw posts are immutable and can include excluded/non-offer posts. Rule-based source extraction produces conservative candidate proposals; it does not claim validity precision until a researcher audits them. Before preparing files in `runs/YYYY-MM-DD/reviews/`, inspect `interval.json` and follow the workflow for its pinned `protocol_revision`. Do not use Telegram to alter acquisition candidates.

### Revisions 3–5

For an unsealed revision-3, revision-4, or revision-5 interval, follow the existing candidate review workflow for that protocol revision. Use the candidate set and candidate IDs frozen under that revision. Do not reinterpret those intervals as revision 6, and do not re-review or migrate sealed historical evidence.

### Revision 6

Revision 6 separates the full diagnostic registry from the evidence projections that are actually reviewed and scored:

- `candidate-validity.json` reviews `acquisition.json` → `core_candidates`. Cover every core candidate if there are 50 or fewer; otherwise cover the first 50 core projection IDs in deterministic SHA-256 order. Use only frozen core candidate evidence for verdicts and fact scores.
- `matches.json` matches eligible offers from the independently reviewed Telegram benchmark against `acquisition.json` → `core_candidates`. Exact and probable assignments are one-to-one. A `no_match` has `candidate_id: null` and a `miss_diagnosis`. Fact scores must come from frozen core candidate evidence; provide them here for matched candidates outside the 50-ID validity audit sample. Missing scores leave matched fact completeness null.
- `telegram-offers.json` remains the shared, independently reviewed Telegram benchmark. Review every raw post exactly once. Multiple offers may refer to one post; an ineligible offer needs an `exclusion_reason`. Its `benchmark_id` values are shared between the core and optional supplemental comparisons.
- `supplemental.json` is optional. It contains separate validity and match reviews against `acquisition.json` → `supplemental_candidates` and must use supplemental projection IDs only. It reuses `telegram-offers.json`; it does not contain or replace the benchmark review.

> **Warning:** Never use `acquisition.candidates` candidate IDs for revision-6 primary reviews. `candidate-validity.json` and `matches.json` must use IDs from `core_candidates`.

The revision-6 projection removes supplemental evidence and creates evidence-bound `cohort:<original-id>:<hash>` candidate IDs. Manual review must therefore be bound to exactly the evidence being scored. Copying a full-registry review onto the core projection can leak supplemental facts into primary scoring or fail final evaluation with an unknown candidate ID.

A concise revision-6 ID example:

```yaml
acquisition.json:
  candidates:
    - candidate_id: "offer-full-registry"
  core_candidates:
    - candidate_id: "cohort:offer-full-registry:core-hash"
  supplemental_candidates:
    - candidate_id: "cohort:offer-full-registry:supplemental-hash"

reviews/candidate-validity.json:
  complete: true
  assessments:
    - candidate_id: "cohort:offer-full-registry:core-hash" # from core_candidates

reviews/matches.json:
  complete: true
  assessments:
    - benchmark_id: "sgfooddeals:123:offer-1" # shared benchmark ID
      candidate_id: "cohort:offer-full-registry:core-hash" # from core_candidates

reviews/telegram-offers.json:
  complete: true
  offers:
    - benchmark_id: "sgfooddeals:123:offer-1" # shared by both comparisons

reviews/supplemental.json:
  validity:
    complete: true
    assessments:
      - candidate_id: "cohort:offer-full-registry:supplemental-hash" # from supplemental_candidates
  matches:
    complete: true
    assessments:
      - benchmark_id: "sgfooddeals:123:offer-1" # same shared benchmark ID
        candidate_id: "cohort:offer-full-registry:supplemental-hash" # from supplemental_candidates
```

Keep the existing review schemas: candidate-validity assessments include the verdict, evidence reason, and fact scores; Telegram offers retain post IDs, first-seen time, reviewed facts, eligibility, and any exclusion reason; match assessments include their classification, reason, and candidate-side fact scores where required.

If `supplemental.json` is omitted, supplemental observed-match metrics remain unknown/null where appropriate, not zero. A supplemental review is descriptive only and cannot change primary core recall, fact completeness, timing, or replacement eligibility. It must never:

- rescue a core `no_match`;
- improve core fact completeness;
- contribute lead/lag timing; or
- alter core replacement eligibility.

#### Revision-6 pre-seal checklist

1. Confirm `interval.json` has `protocol_revision == 6`.
2. Open the frozen `acquisition.json`.
3. Review `core_candidates`, not `candidates`.
4. Use core projection IDs in `candidate-validity.json`.
5. Use core projection IDs in `matches.json`.
6. Review Telegram posts independently in `telegram-offers.json`.
7. Optionally review `supplemental_candidates` in `supplemental.json`.
8. Run the normal worker/finalization or `verify` flow.
9. Do not edit a sealed interval.

The running worker checks completed reviews on subsequent cycles and writes `evaluation.json`, `manifest.json`, and `SEALED`. For a day with incomplete Telegram coverage or a missing daily acquisition, benchmark recall and overlap remain null; candidate validity may still be reviewed, and the day can be finally sealed as non-scoring evidence. Individual source failures remain visible in acquisition coverage metadata. Review files are included in the final seal. Do not rewrite a sealed day; issue a supplemental study record or protocol revision for corrections. `npm run research:monitor:metrics` does not include the old Day 0 or rehearsal.

## Timing and limitations

Telegram `first_seen_at` is when a successful public-preview poll completed. Independent candidate `first_seen_at` is from the earliest actual source capture and is carried forward with all distinct occurrences when the same proposal recurs. Publication timestamps are never used as observation times. Revision-4 comparative lead/lag is bounded by three-hour publisher and daily directory/campaign cadence versus hourly Telegram; revision 3 remains daily. Public previews cannot prove capture of transient between-poll posts, deleted posts or media edits. Unsupported/dynamic source layouts and ambiguous offer facts remain visible as incomplete coverage or pending review.

No local daemon or production hosting is installed by this delivery. If ongoing collection is desired, start the foreground worker in a persistent local terminal or a separately approved supervisor setup.

## Revision-4 rollout

This delivery does not restart the existing process or change its historical files. On the next separately authorized start/restart, the new worker validates and resumes any active revision-3 interval with its existing hashes and coverage rules, then opens subsequent intervals with revision 4. Start before the intended scoring day's midnight to establish channel baselines. September 25 remains non-scoring. Normal midnight opening by an already observing process is allowed within the five-minute slot tolerance; late initial starts remain partial.

Revision-4 passes checkpoint their original source set, retain raw results after failure/interruption, and never turn a missed scheduled capture into a timely one. Daily freeze merges all passes, deduplicates offer identities and preserves occurrence timestamps. Historical occurrences may predate the frozen day; only candidates actually observed that day enter that day's acquisition. Independent source limitations remain separate from scheduled acquisition coverage and must be interpreted alongside recall.

The tracker is read-only, including when no state exists. It shows code capability separately from evidence maturity, verifies sealed inputs, distinguishes merchant coverage from same-offer coverage and leaves sample sufficiency for researcher review. Unfrozen rehearsal narratives are not converted into match counts.
