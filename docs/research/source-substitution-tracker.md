# Source Substitution Goal

Build an independent public-source acquisition path with source-backed offer facts. Telegram may become supplemental, benchmark-only, or removable; total removal is not guaranteed. Source substitution is not proven by the current rehearsal.

```text
Independent Public Sources
        ↓
Source Discovery Adapters
        ↓
Source-Specific Extraction
        ↓
Normalized PromotionCandidate
        ↓
Evidence / Deduplication / Merge
        ↓
Promotion Pipeline
        ↓
Published Promotions

Telegram
        ↓
supplemental discovery / validation
        ↓
eventually optional or removable
```

This document defines architecture and stage contracts, not live counters. Run `npm run research:monitor:tracker` (or `-- --json`) for computed evidence, blockers and next gate. `status` describes current operational health; `metrics` describes finalized scored evidence; `tracker` relates implementation and evidence to the target architecture. All read research files only, without production database access or network calls.

# Target Architecture

## 1. Source registry

Defines sources, enumerability, cadence class, scope, origin routes and page/entry caps. Revision 5 keeps the revision-4 registered set and cadence classes; catch-up capability is explicit and separate. Runtime code never infers cadence from names.

The **fresh_publisher** set is `singpromos_ongoing`, `confirmgood_deals`, `eatbook_deals`, `mustsharenews_deals`, and `everydayonsales_food`. Their existing registry descriptions and captured article cards establish dated publisher/archive or active-offer indexes. They run at Singapore 00:00, 03:00, …, 21:00. This is evidence for freshness-oriented observation, not proof of complete enumeration: SINGPromos and ConfirmGood retain route gaps, Eatbook cap truncation, and other sources date/scope ambiguity.

Remaining sources are daily **directory** or **static_campaign** entries, explicitly listed in `source-registry-revision-5.json`. Rolling roundups without reliable update timestamps remain daily. Each source retains its existing per-pass safety caps. A source pass must finish before the next source slot/day end; absent/failed/late passes remain gaps. Captured pages can still have blocked, pagination, category-route, dynamic-page, response-size, temporal or cap limitations.

## 2. Source acquisition adapter

Target contract: `enumerate()` returns bounded listing cards and coverage evidence; `fetchDetail()` captures source-specific readable evidence. Current `discovery.ts` has source-specific listing selectors/table/roundup readers and generic detail fetching. A custom listing parser does not imply a production-quality semantic adapter.

## 3. Source extraction adapter

Target contract: `extractMerchant()`, `extractOffer()`, `extractDates()`, `extractLocations()`, `extractEligibility()`, `extractRedemption()`. Current semantic extraction is generic and conservative; missing or conflicting facts require review. Production-ready per-source adapters require representative source fixtures and verified fact provenance. Research may proceed before every source has one.

## 4. Normalized candidate

Target fields: merchant, promotion_name, offer, start_date, end_date, location, eligibility, redemption_method, evidence, source occurrences, first_seen_at. Existing proposals retain these fields with confidence, URLs and hashes; incomplete proposals are not publication-ready.

Repeated conservative offer identities retain the earliest actual independent `first_seen_at`. Occurrences retain source_id, seen_at, candidate_url (legacy `url` also retained), and source_snapshot_hash. Later observations confirm presence without changing the first observation. Daily freeze includes all target-blind passes; Telegram never selects acquisition candidates.

## 5. Evidence / merge layer

Establish same-offer identity from merchant AND offer/value/product, compatible dates, location, eligibility and redemption. Preserve source authority/provenance, conflicts and cross-source corroboration. Conflicting offers stay separate. Match only after acquisition and raw benchmark freeze.

Report **merchant_coverage** separately from **same_offer_coverage**. McDonald's $1 Coffee can cover the merchant for a McSpicy 1-for-1 benchmark but cannot cover that offer. Tracker merchant coverage is a conservative normalized-name diagnostic over frozen reviewed offers; it does not establish corporate identity. Same-offer coverage comes from explicit exact/probable reviewed assignments. Only replacement-eligible sealed revision-5 days contribute to revision-5 benchmark recall. Legacy strict metrics have a separate denominator.

## 6. Production ingestion bridge

Not implemented. Begin only after research gates and an explicit production design/authorization. The research service cannot publish or mutate production ingestion state.

## 7. Telegram role

Current legacy state: primary source. Possible future states: supplemental source; benchmark only; removed. Decide with evidence about coverage, timeliness, fact quality, source concentration, operating reliability and cost, rather than one metric.

# Current-State Stages

“Current state” describes implemented capability/evidence category, not manually maintained counters. Live evidence can remain insufficient even when code exists. The command computes the active frontier; it does not call S4 complete because posts exist.

| Stage                                  | Goal                             | Definition of done                                                                    | Current state                                         | Evidence required                                                                         |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| S0 legacy Telegram acquisition         | Existing promotion input         | Legacy acquisition path available                                                     | complete                                              | Existing collector and preview tests                                                      |
| S1 independent source enumeration      | Target-blind registered indexes  | Bounded acquisition with explicit gaps and provenance                                 | complete (bounded framework; not all sources covered) | Registry, capture fixtures and source snapshots                                           |
| S2 candidate extraction                | Normalize source proposals       | Reviewed offer facts and retained source evidence                                     | partial                                               | Generic proposal fixtures; source-specific semantic extraction still needed               |
| S3 continuous target-blind observation | Durable independent observation  | Full scheduled source passes, restart recovery and daily freeze                       | partial                                               | Revision-5 daily pass/recovery evidence and seals                                         |
| S4 reviewed replacement benchmark      | Comparable offer content         | Proven content coverage, frozen acquisition/benchmark, complete reviews               | partial / insufficient_evidence                       | Core replacement-eligible revision-6 intervals; temporal completeness reported separately |
| S5 multi-day replacement evidence      | Assess substitution potential    | Initial and stronger checkpoints plus sample/diversity assessment                     | insufficient_evidence                                 | Multi-day recall, precision, fact completeness, concentration, gaps and timing            |
| S6 production-quality source adapters  | Reliable source-specific facts   | Provenance, conflicts, failure handling and representative tests per selected adapter | not_started                                           | Adapter qualification; all registry sources need not qualify                              |
| S7 shadow production ingestion         | Compare safe production behavior | Authorized isolated shadow bridge and reconciliation                                  | not_started                                           | Independent safety/quality evidence and approved rollout                                  |
| S8 Telegram demotion/removal decision  | Choose supported source role     | Reviewed multi-factor decision with rollback and operational ownership                | not_started                                           | S5–S7 evidence; no automatic threshold decision                                           |

# Historical Revision 4 Observation Contract

One Telegram slot per channel per hour in the interval `[start,end)`. Successful observation must complete within **five inclusive minutes** after its scheduled slot; attempt and preview complete-through must be valid for that slot. `lateness_ms` measures attempt minus scheduled slot; completion delay is also checked using the exact stored timestamps. Thus +4 ms, +2 seconds and +4 minutes are on time if completion is in the window; +6 minutes is successful raw acquisition but a timing gap. A slow poll completing after tolerance is late even if it began on time.

Derived outcomes: successful_on_time, successful_late, failed, missing_slot. Interrupted attempts count as failed; missing offline slots cannot be repaired by a later successful fetch. Raw outcome remains separate. Baselines must precede interval start. No successful-attempt elapsed-gap heuristic applies to revision 4. During an active day, slots still inside tolerance are pending rather than missing. The final hour slot is 23:00; scheduled-snapshot coverage does not claim continuous capture to midnight.

An already observing service can open the next day within the five-minute scheduling tolerance. Starting a new process after the boundary still makes its initial interval partial. Existing revision-3 intervals retain their original hashes and coverage logic; newer reporting never reclassifies September 25.

# Evidence Gates

Initial revision-6 checkpoint: at least **three core replacement-eligible revision-6 intervals AND enough eligible benchmark offers for a meaningful first analysis**. Revision-3/4/5 evaluations cannot advance this gate. Live-complete days and timing samples form a separate temporal evidence family. A statistically justified sample minimum has not been established; the tracker therefore leaves sample sufficiency as `researcher_review_required`, even after three days. This is an explicit unresolved research judgment, not an implied approval.

Prefer **five to seven core replacement-eligible revision-6 days** and a materially larger benchmark sample, with diversity across merchants, mechanics, channels and sources. Inspect source concentration, coverage gaps, timing and review completeness. Research targets of recall ~80%, validity precision ~95%, and matched fact completeness ~70% are exploratory, never automatic pass/fail or production gates.

# Rehearsal Evidence and Preservation

The September 25 rehearsal reported a real independent recovery of McDonald's **20pc Chicken McNuggets for $9.90**, observed independently before Telegram, with compatible offer/date facts. This qualitative case motivates better temporal resolution. It is not scored recall. The tracker displays concrete reviewed cases only when frozen, hash-verified observations and review files exist; it does not manufacture a review from this narrative.

Historical `.local/source-discovery-monitor/`, September 25 service evidence, revision 3 and its source registry remain unchanged. Revisions 4 and 5 have separate frozen assets; existing active intervals stay pinned and only newly opened intervals default to revision 6. No worker restart, scheduling change, production bridge or Telegram demotion is performed by this code delivery.

Implementation and verification record: [observation revision 4](../changes/source-substitution-observation-v4/plan.md).

# Revision 5: content recovered ≠ live coverage restored

Content backfill is allowed. Observation backfill is forbidden. A post published at 14:30 during downtime and received at 01:05 after restart retains those two times separately; its `first_seen_at` and `recovered_at` are 01:05 and its mode is `catch_up`. Missing hourly slots and source passes remain gaps forever.

Restart reconciles each overdue revision-5 Singapore day before freezing. Telegram traverses exposed preview history from its last successful complete-through checkpoint. If bounded traversal cannot reach it, already fetched posts are retained as partial catch-up; the checkpoint does not advance and scheduled coverage remains failed. Independent acquisition uses the existing registered enumeration infrastructure in a separate `discovery/recovery/<window-id>/` directory, with durable source checkpoints and immutable recovery results. A repeated restart reuses the same completed window. No recovery path creates historical scheduled-pass success. An interrupted pass is retained as a failed cadence observation and content recovery uses a separate checkpoint. Overdue days freeze with explicit partial reasons when historical enumeration is insufficient; evaluation still requires manual review.

Recovered Telegram posts are assigned by publication time. Independent detail metadata supports explicit timezone-bearing `article:published_time` and `datePublished` timestamps. Undated recovered offers cannot be silently assigned backwards; they remain in recovery evidence with an unassigned-day reason. Actual receipt times and occurrence provenance survive merging. Current listing success alone proves no historical completeness.

Revision-5 runtime recovery now treats `confirmgood_deals`, `eatbook_deals`, and `everydayonsales_food` as **complete-capable dated archives** without changing the frozen registry. Their listing cards carry source-backed publication timestamps; recovery must traverse in non-increasing publication order, cross the durable live checkpoint boundary, encounter a matching canonical URL + content-hash overlap identity, and consume one deterministic extra overlap page (or reach the terminal page). Repeated page bodies, URL loops, ordering violations, listing failures, or hitting the safety cap before proof keep the result partial/failed. Detail-fetch or semantic-extraction failures remain separate from historical enumeration proof.

`singpromos_ongoing` remains partial because its active/current index does not prove publications made during downtime. `mustsharenews_deals` remains partial because stale/cache/order ambiguity prevents deterministic historical proof. Other runtime capabilities remain partial or unsupported according to their actual enumerability and frozen registry constraints. The source adapter table exposes runtime capability, latest successful live observation, durable checkpoint, latest recovery window/status, checkpoint crossing, pagination proof, and limitation.

Replacement eligibility requires complete benchmark content, complete independent content and completed validity/benchmark/match reviews. It permits catch-up observations. Temporal eligibility additionally requires complete scheduled Telegram coverage and independent cadence. Lead/lag uses explicit live first-receipt evidence only, excluding recovered or unknown provenance. The legacy `scoring_eligible` and `scoring_records` stay strict; content-only evidence uses `replacement_records` and `replacement_metrics`.

`metrics.replacement` and `metrics.temporal` are separate revision-5 families. Tracker shows replacement days, reviewed benchmark offers, same-offer recall, recovered matches and unresolved content gaps separately from live-complete days, missing Telegram/source observations and live timing samples. Merchant coverage is diagnostic; same-offer review remains the substitution criterion. These changes improve laptop-based replacement research without claiming observations occurred while it was offline.

Change contracts and verification: [revision 5](../changes/source-substitution-recovery-v5/plan.md) and [complete historical catch-up](../changes/revision-5-complete-historical-catch-up/verification.md).

# Revision 6: frozen core replacement cohort

Revision 5 proved safe historical content recovery but required completeness across all nineteen sources. Current-state directories and partial publishers made laptop downtime practically unscorable. Revision 6 freezes a production-like core selected by acquisition and recovery capability **before rev6 benchmark observations**, independently of match performance: `confirmgood_deals`, `eatbook_deals`, `everydayonsales_food`.

Every other source remains monitored as supplemental. A source cannot receive asymmetric treatment where its match helps the numerator but its missing historical coverage does not affect completeness. Therefore supplemental discoveries cannot rescue a core miss, upgrade a probable match, supply facts, or enter primary timing. Expanding the core requires a future protocol revision, even if a supplemental adapter becomes complete-capable.

`core_content_complete` and `telegram_content_complete`, plus required manual reviews, gate primary replacement scoring. `core_cadence_complete` and `telegram_coverage_complete` additionally gate temporal scoring. `all_registry_content_complete`, `all_registry_cadence_complete`, supplemental failures and missing passes remain visible independently. Missing daily Jewel/Grab observations cannot block core replacement scoring.

When all five fresh publishers miss a scheduled slot, complete proof for the three core archives restores core content while SingPromos/MustShareNews remain partial. The result can be replacement-eligible and temporally ineligible. **content recovered ≠ live coverage restored**. **supplemental evidence ≠ primary cohort recovery**.

Acquisition freeze includes separate `core_candidates` and `supplemental_candidates` projections. Each retains only the selected sources' occurrences, source evidence, URLs, facts and actual first receipt. Projection IDs bind reviews to that evidence; never copy full-registry candidate reviews onto core IDs. Use `reviews/candidate-validity.json` and `reviews/matches.json` for the frozen core projection. Optional `reviews/supplemental.json` uses the same validity/matches schema against supplemental projection IDs. `reviews/telegram-offers.json` remains the shared independently reviewed two-channel benchmark. Omitted supplemental review produces unknown observed-match counts, not zero or recall.

Primary metrics live under `cumulativeMetrics(...).revision6` with `core_*` names. Revision-5 replacement/temporal metrics and revision-3/4 strict metrics remain separate. Zero core matches over a positive eligible reviewed denominator is recall 0; unscorable metrics are null. Timing requires explicit live core and Telegram evidence and complete scheduled coverage; mixed catch-up core fact variants are conservatively excluded.

Deployment preserves an already-active revision-5 interval's hashes and semantics until close. Only the next newly opened interval adopts revision 6. Sealed older evaluations are never reinterpreted. No worker restart or scheduling change is part of this delivery.

See the [rev6 design](../changes/source-substitution-core-cohort-v6/design.md), [capability audit and verification](../changes/source-substitution-core-cohort-v6/verification.md), and frozen `scripts/research/source-monitor/protocol/*revision-6.json` assets. `npm run research:monitor:tracker` and its `-- --json` form are read-only.
