# Verification — 2026-09-25

Implemented revision-4 scheduled Telegram slots, explicit tiered source passes, occurrence retention and immutable daily merge/freeze, plus a stable design tracker and read-only human/JSON commands. No production ingestion expansion or Telegram replacement conclusion.

## Executed checks

- `npm run research:monitor:test`: **74 tests passed, 10 files**, including existing Telegram preview tests and revision-3 regressions. All new observations use local temporary roots, mocked HTTP and fixture review data; no live acquisition required.
- `npm run typecheck`: passed.
- `npx eslint scripts/research tests/research-*.test.ts tests/preview.test.ts`: passed, no warnings/errors.
- `git diff --check`: passed. Additional no-index whitespace checks passed for changed/new research files. The byte-preserved original registry has pre-existing trailing whitespace; it was deliberately not reformatted because that would change its frozen hash.
- Both `npm run research:monitor:tracker` and `npm run research:monitor:tracker -- --json` ran against the current research root. Full-root hashes before/after both commands matched.
- All **349 protected files** in the preservation baseline match their pre-edit SHA-256: historical monitor files, September 25 service run files, original revision-3 protocol/registry and `next-env.d.ts`.
- Production DB touched: **no**. No production ingest, database command, preflight network probe, worker start/restart, deployment, commit or push was invoked.

## Acceptance evidence

Telegram tests cover +4 ms, +2 sec and +4 min jitter; six-minute late success; slow completion; actual missing hour; failed fetch; multiple offline hours; same-slot restart/idempotence; interrupted attempts. Raw failures remain failures. Revision 3 keeps original coverage semantics.

Service tests exercise a full synchronized revision-4 day: 24 on-time slots per channel; first pass with all registered sources and seven later publisher-only passes; mid-day restart without duplicate work; repeated candidate observations retaining earliest first_seen and nine distinct occurrences including the prior-day baseline; one immutable daily freeze with all 54 source snapshots. An interrupted midnight source set resumes after the next publisher slot without erasing late coverage. Separate tests preserve old hashes and demonstrate revision-3 resume followed by revision-4 opening.

Tracker fixtures cover no state, active rehearsal, partial sealed interval, valid sealed interval, multiple valid intervals with insufficient sample evidence, adapter capabilities and snapshot limitations, merchant coverage without same-offer coverage, tamper rejection and read-only behavior. It validates frozen reviewed match provenance and one-to-one assignments.

## Limits and rollout

Code is prepared; the running research process was not restarted. The active interval still uses revision 3 and remains non-scoring. New code resumes an existing revision-3 interval using its pinned assets and selects revision 4 for subsequent intervals. Establish baselines before the first intended scoring day. Source-specific semantic adapters and production bridge remain unfinished. Source limitations are reported independently of scheduled capture completeness. Benchmark sample sufficiency remains a researcher judgment because no defensible minimum has been established.

The reported McDonald's 20pc McNuggets/$9.90 independent recovery is preserved as qualitative rehearsal context in the stable tracker document. Current files do not contain frozen benchmark/match reviews, so the command correctly leaves reviewed matches and recall unknown.

## Real command sample (dated snapshot; not a live counter)

```text
> promotion-around-you@0.1.0 research:monitor:tracker
> node --import tsx scripts/research/source-monitor-worker.ts tracker

SOURCE SUBSTITUTION TRACKER

Target
------
Independent sources → normalized offers → evidence/merge → production ingestion → Telegram supplemental or removable
Stage: S4 → S8

Implementation
--------------
source registry                    complete
independent enumeration            complete
generic candidate extraction       complete
source specific extraction         partial
persistent observation service     complete
synchronized benchmark             partial
multi day scored evidence          insufficient_evidence
production ingestion bridge        not_started
telegram demotion decision         not_started

Current observation
-------------------
Protocol revision: 3 (configured: 4)
Active interval: 2026-09-25
Scoring eligibility: non_scoring
Telegram sgfooddeals: baseline_not_complete_before_interval, no_successful_poll_at_interval_start, hourly_poll_gap, missed_hourly_poll, poll_failed, failed_required_poll
Telegram tastesoulsg: baseline_not_complete_before_interval, no_successful_poll_at_interval_start, hourly_poll_gap, missed_hourly_poll, poll_failed, failed_required_poll
Coverage gaps: 40
Independent acquisition health: {"last_success_at":"2026-09-24T16:48:16.065Z","cadence_gaps":null}

Latest acquisition
------------------
registered sources: 19
sources captured: 18
sources with snapshots: 19
incomplete sources: 17
candidates: 54
cards evaluated: 352
detail failures: 0

Benchmark
---------
new_telegram_posts_observed: 5
eligible_benchmark_offers_reviewed: unknown / unreviewed
same_offer_matches: unknown / unreviewed
no_match_cases: unknown / unreviewed
merchant_coverage: unknown / unreviewed
same_offer_coverage: unknown / unreviewed
Scored synchronized days: 0
Scored eligible benchmark offers: unknown / unreviewed
Benchmark recall: unknown / unreviewed
Candidate validity precision: unknown / unreviewed
Matched fact completeness: unknown / unreviewed
Source concentration: {"matched_candidate_days_by_source":{},"note":"Cross-source occurrences can contribute to multiple sources; inspect concentration alongside recall."}

Evidence gates
--------------
Next gate: Collect and review at least 3 complete synchronized intervals under revision 4, then assess benchmark sample sufficiency.
Blockers:
- active_interval_uses_revision_3_daily_acquisition
- service_started_after_interval_start
- 2026-09-25_rehearsal_non_scoring
- incomplete_telegram_coverage
- incomplete_source_enumeration_or_extraction
- active_observations_not_frozen
- fewer_than_3_complete_synchronized_intervals
- benchmark_sample_sufficiency_requires_researcher_review
Known limitations:
- Public previews may miss transient/deleted posts and media edits.
- First-seen timing is bounded by source cadence; absence is not a publication timestamp.
- Generic semantic extraction requires source-backed review; custom listing parsers are not production adapters.
- Registered blocked probes and incomplete routes do not establish full source coverage.
- Telegram replacement is not proven.

Source adapter maturity and observed limitations
-----------------------------------------------
singpromos_ongoing: cadence=fresh_publisher; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=registered_category_or_tab_routes_not_traversed,candidate_temporal_ambiguous,candidate_scope_ambiguous,candidate_merchant_ambiguous,temporal_ambiguous,category_routes_untraversed
confirmgood_deals: cadence=fresh_publisher; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=registered_category_or_tab_routes_not_traversed,category_routes_untraversed
eatbook_deals: cadence=fresh_publisher; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=safety_cap_reached_with_remaining_cards_or_pages,candidate_merchant_ambiguous,candidate_temporal_ambiguous,pagination_incomplete,cap_truncated,temporal_ambiguous
mustsharenews_deals: cadence=fresh_publisher; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=candidate_temporal_ambiguous,temporal_ambiguous
everydayonsales_food: cadence=fresh_publisher; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=candidate_temporal_ambiguous,candidate_scope_ambiguous,temporal_ambiguous
great_world_promotions: cadence=directory; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=registered_category_or_tab_routes_not_traversed,candidate_merchant_ambiguous,category_routes_untraversed
capitaland_mall_deals: cadence=directory; enumeration=false; custom listing=false; detail fetch=true; semantics=generic; production=false; capture=probe_only; issues=no_supported_card_parser,probe_does_not_establish_directory_coverage
jewel_general_promotions: cadence=directory; enumeration=false; custom listing=false; detail fetch=true; semantics=generic; production=false; capture=probe_only; issues=no_supported_card_parser,pagination_control_without_fetchable_link,probe_does_not_establish_directory_coverage,pagination_incomplete,dynamic_page_unsupported
jewel_student_privileges: cadence=static_campaign; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=candidate_temporal_ambiguous,temporal_ambiguous
jewel_ticket_privileges: cadence=static_campaign; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=captured; issues=none observed
singapore_river_festival: cadence=directory; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=blocked; issues=blocked
grab_promo_codes: cadence=static_campaign; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=campaign_table_does_not_identify_physical_merchants
grab_full_house: cadence=static_campaign; enumeration=false; custom listing=false; detail fetch=true; semantics=generic; production=false; capture=probe_only; issues=no_supported_card_parser,probe_does_not_establish_directory_coverage
grab_dineout_directory: cadence=directory; enumeration=false; custom listing=false; detail fetch=true; semantics=generic; production=false; capture=probe_only; issues=no_supported_card_parser,probe_does_not_establish_directory_coverage
divedeals_food: cadence=directory; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=registered_category_or_tab_routes_not_traversed,candidate_temporal_ambiguous,candidate_scope_ambiguous,candidate_merchant_ambiguous,temporal_ambiguous,category_routes_untraversed
hsbc_dining: cadence=directory; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=registered_category_or_tab_routes_not_traversed,candidate_scope_ambiguous,category_routes_untraversed
syioknya_central_food: cadence=directory; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=partial; issues=candidate_scope_ambiguous,candidate_temporal_ambiguous,temporal_ambiguous
ordinary_patrons_news: cadence=static_campaign; enumeration=true; custom listing=true; detail fetch=true; semantics=generic; production=false; capture=captured; issues=none observed
misslobang_roundup: cadence=static_campaign; enumeration=false; custom listing=false; detail fetch=true; semantics=generic; production=false; capture=probe_only; issues=no_supported_card_parser,probe_does_not_establish_directory_coverage
```

## Git status at delivery

Existing work was already uncommitted/untracked when this task began. `AGENTS.md` and `next-env.d.ts` modifications predate this task and were left untouched. No commit or push.

```text
 M AGENTS.md
 M next-env.d.ts
 M package.json
?? docs/changes/persistent-source-discovery-service/
?? docs/changes/source-substitution-observation-v4/
?? docs/research/
?? scripts/research/
?? tests/research-discovery.test.ts
?? tests/research-evaluation.test.ts
?? tests/research-intervals.test.ts
?? tests/research-scheduler.test.ts
?? tests/research-service.test.ts
?? tests/research-storage.test.ts
?? tests/research-telegram.test.ts
?? tests/research-tracker.test.ts
?? tests/research-v4.test.ts
```

## Follow-up verification — 2026-09-26

Review found that the forward three-day tracker gate counted all scored protocol revisions. The tracker now derives a separate revision-4 aggregate from each sealed interval's pinned revision. Historical scored days remain visible in the all-protocol aggregate but cannot advance the revision-4 gate or S4/S5 stage. A mixed-revision fixture verifies three scored revision-3 days plus one scored revision-4 day remain at S4, with the next gate still requiring three revision-4 days.

- `npm run research:monitor:test`: **75 passed, 10 files**, including existing Telegram preview tests.
- `npm run typecheck`: passed.
- `npx eslint scripts/research tests/research-*.test.ts tests/preview.test.ts`: passed.
- `git diff --check`: passed; edited tracker and fixture files were formatted with Prettier.
- `npm run research:monitor:tracker -- --json`: passed; a complete SHA-256 manifest of the research service directory matched before and after the command.
- Protected historical/service/protocol/`next-env.d.ts` file hashes: **352 matched** the pre-check baseline. No production database or ingestion command was used.

Current live-file tracker sample at verification: S4; active 2026-09-26 interval on protocol 3, non-scoring; configured protocol 4; 19 registered sources, 100 current candidates, 0 revision-4 scored days. The current interval is partial, and the next gate remains three complete, reviewed revision-4 intervals plus researcher assessment of benchmark sample sufficiency. These values are a dated read of research files, not live counters in the tracker design document.
