# Activation verification — Shake Shack Singapore

Final registry decision: **enabled=true, autoPublish=true**. All thirteen source-level activation conditions passed. This enables CLI selection; no production/shared database ingest command was executed.

## Exact execution report

| Measure                                          | Observed result                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Observation instant / Singapore as-of            | 2026-10-01T10:48:33.000Z / 2026-10-01                                              |
| Listing pages                                    | 4                                                                                  |
| Discovered / classified articles                 | 44 / 44                                                                            |
| Promotion / non-promotion articles               | 10 / 34                                                                            |
| Unresolved articles                              | 0                                                                                  |
| Limits: requests / listings / details / evidence | 60 / 5 / 50 / 8                                                                    |
| Network limits                                   | 3,000,000 bytes per response; 12,000 ms; 3 redirects                               |
| Successful structural live HTTP requests         | 48                                                                                 |
| Redirects / HTTP or detail failures              | 0 / 0                                                                              |
| Promotion candidates                             | 10                                                                                 |
| Expired excluded / review / auto-publishable     | 4 / 5 / 1                                                                          |
| Explicit active / upcoming                       | 1 / 0                                                                              |
| Disposable DB active campaign auto-published     | 1 — Hello, Parkway Parade!                                                         |
| Official directory                               | authoritative; twelve exact branches; zero issues                                  |
| Processor                                        | direct-source-v2; version change preserves byte revision hash                      |
| Exact replay                                     | ten unchanged candidates; no duplicate candidate, revision or Promotion            |
| Final policy                                     | enabled=true; autoPublish=true                                                     |
| Remaining activation blockers                    | none                                                                               |
| Distinct adapters in frozen merchant map         | enabled=2 (Pepper, Shake); shadow=1 (Paradise)                                     |
| Merchant map rows                                | 139; enabled=2, shadow=2, none=135 (Paradise brand and group share shadow adapter) |
| Historical merchant / unresolved record counts   | 138 / 67                                                                           |

The initial sandbox attempt received zero HTTP responses (DNS ENOTFOUND); its separate failed-attempt manifest is retained under `complete-2026-10-01/`. After network permission, exactly one bounded structural acquisition fetched four registered archive pages and forty-four discovered article bodies. No acquisition budget was increased again. No directory live refetch was needed: the existing official captured directory structural/identity/count tests remain authoritative at twelve branches. Coordinate resolution in unit/integration checks is synthetic and fixture-controlled, with no live geocoding.

## Candidate dispositions and exact review blockers

Every promotion was re-evaluated as of 2026-10-01; no previous five-candidate outcome list was reused. Editorial articles remain outside DirectPromotionCandidate. Publication dates never supply missing campaign dates.

| Campaign                           | Start      | End        | Outcome      |
| ---------------------------------- | ---------- | ---------- | ------------ |
| 100% Angus Beef – Just for You     | 2025-09-23 | 2025-09-26 | exclude      |
| All About Chickens                 | 2025-07-07 | 2025-07-07 | exclude      |
| Feeding a Crowd?                   | unknown    | unknown    | needs_review |
| Hello, Parkway Parade!             | 2026-09-11 | 2026-10-10 | ready        |
| National Cheeseburger Day          | 2026-09-14 | 2026-09-18 | exclude      |
| Shack Meal                         | unknown    | unknown    | needs_review |
| Singlish Lingo                     | unknown    | unknown    | needs_review |
| Study Breaks Just Got Better       | unknown    | unknown    | needs_review |
| This One’s For Your Mom            | unknown    | unknown    | needs_review |
| We’re introducing Chicken Sundays! | 2025-11-30 | 2025-12-28 | exclude      |

Excluded campaigns carry `expired_campaign`, persist item/revision/artifact/candidate provenance, create no Promotion, have no inbox row and never call the outlet resolver. Changed bytes may become active and publish on the same source item. Existing generic same-title promotions and managed facts are untouched by expiry exclusion.

Exact blocker codes for each review candidate:

- **Feeding a Crowd?**: `missing_start_date`, `missing_end_date`, `source_unspecified_locations`, `physical_outlets_unresolved`, `outlet_scope_unresolved`, `end_date_unknown`, `locations_unknown`, `start_date_unknown`, `invalid_promotion:outlets`.
- **Shack Meal**: `missing_start_date`, `missing_end_date`, `unsupported_holiday_validity`, `unresolved_hour_restriction`, `end_date_unknown`, `start_date_unknown`, `validity_unparsed`, `missing_validity`.
- **Singlish Lingo**: `missing_start_date`, `missing_end_date`, `source_unspecified_locations`, `physical_outlets_unresolved`, `outlet_scope_unresolved`, `end_date_unknown`, `locations_unknown`, `start_date_unknown`, `validity_unparsed`, `invalid_promotion:outlets`.
- **Study Breaks Just Got Better**: `missing_start_date`, `missing_end_date`, `unsupported_holiday_validity`, `end_date_unknown`, `start_date_unknown`, `missing_validity`.
- **This One’s For Your Mom**: `missing_start_date`, `missing_end_date`, `end_date_unknown`, `start_date_unknown`, `missing_validity`.

Complete decision data is in [dispositions.json](dispositions.json). The active Parkway campaign has explicit 11 September–10 October 2026 validity and exact Parkway Parade participation. It passed the unchanged generic gate and actual transactional disposable-DB path. Incomplete dates/locations/hours/holiday restrictions were not invented or relaxed.

## Activation gates and acceptance evidence

| Gate / requirement                                                          | Evidence                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ownership remains verified                                                  | Existing legal PDF hash, native operator text and recorded review tests pass; ownership.json and prior probable assessment unchanged.                                                                    |
| Bounded, understood pagination and stable listing structure                 | All four numbered pages traversed; pagination unresolved=[]; no structure/load-more/infinite control issues.                                                                                             |
| Every discovered article classified                                         | Deterministic URL ledger: 44 unique URLs, 44 classifications, 10 + 34 = 44, unresolved=0.                                                                                                                |
| All detail fetches inside budget / enumeration complete / acquisition ready | 48 successful live requests; enumeration.complete=true; live gate production-adapter-ready and acquisition_ready=true.                                                                                   |
| Official outlet directory proof                                             | Ten captured directory cards plus independently linked One Fullerton/Parkway details agree with twelve exact map identities and official count.                                                          |
| Expired lifecycle and no external work                                      | Pure explicit Singapore date tests; integration proves excluded audit rows, no resolver/inbox/Promotion writes; same bytes crossing expiry also re-evaluate.                                             |
| Complete current/future gate                                                | Captured Parkway passes hypothetical enabled test before registry activation; one published row confirmed in disposable DB. Upcoming cases pass the normal gate in focused tests.                        |
| Incomplete remains review                                                   | Five exact captured review decisions above; explicit missing/ambiguous end tests stay review.                                                                                                            |
| No research/Telegram dependency                                             | AST dependency closure checks pass; no legacy source table queries, parser/collector/signal imports, map runtime dependency, or startup/scheduler integration.                                           |
| Budgets / CLI safety                                                        | Pepper/Paradise default equality; automatic production preview/ingest runner profile; no CLI raise flags; test-only tightening; detail/request/redirect boundaries fail closed.                          |
| Processor/revision/idempotency                                              | v1 stored disposition re-evaluates under v2 with one source revision; same hashes stay stable; byte changes create new revision; repeated v2 excludes do not duplicate; manual review decisions persist. |
| Existing publication rules                                                  | Captured Pepper seven remain review; synthetic Pepper publication/update, incomplete replacement, admin correction, fingerprint attach, material title conflict and admin union checks pass.             |

## Replay and protected evidence

New immutable complete capture: [manifest](../../../tests/fixtures/direct-sources/shake-shack/complete-2026-10-01-network-enabled/manifest.json), capture-provenance.json, classification-ledger.json, semantic-replay.json and replay-proof.json. Every captured response retains URL/requested URL, actual retrieval timestamp, observation timestamp, HTTP status, content type, byte length, SHA-256 and purpose. Body files are named by content hash; historical fixture bytes were not replaced.

Semantic live + offline replay 1 + offline replay 2 SHA-256: `dc5cd45c778207b651e5e71f834fb56f23267ce6d059df538008fa51d5885887`. Focused tests repeat offline replay and verify every retained response hash/length/provenance. Mode-only/policy presentation is excluded from semantic comparison; classification, candidates, observation, effective limits, issues and acquisition readiness are included.

Merchant map uses the exact four frozen input files and their unchanged hashes, plus the final registry. Historical source observations and original probable ownership are retained. Current presentation uses the recorded registry activation review; no map status was manually forced. JSON/Markdown/CSV were regenerated twice and compared as raw bytes:

```json
{
  "merchants.json": "e8e5bdc96acfc337c828a35c7b69844e5bd1713d1eefb72e488a817406811ea9",
  "report.md": "2ca96b80e994d1d736dbbc212d3cb7e6f3809542be6347c8729cd797226d4912",
  "report.csv": "1ca4ed54d11bf98a7a0dd303940848dcaf7d0d25c88350907f44f263461e9b9d"
}
```

Map evidence: [merchant-map-replay.json](merchant-map-replay.json), outputs `.local/merchant-source-map/shake-activation-final-a/` and `shake-activation-final-b/`. `docs/research/merchant-source-map.md` mirrors the generated Markdown. All 3851 protected file hashes matched the pre-implementation snapshot, including original source-origin/direct audits, source-discovery-service evidence, historical Shake fixture set and next-env.d.ts. No historical Telegram evidence was changed. Prior bounded live captures were never opened for writing.

## Verification commands and outcomes

- Focused acquisition/classification/publication/isolation/map tests: passed before acquisition and after activation; final focused result recorded below.
- `npm run test:integration`: **53 tests passed**, two suites, disposable local PostgreSQL/PostGIS only; test databases dropped by suite teardown. Legacy ingestion and direct admin review union pass.
- `npm run test:corpus`: **4 tests passed**, three suites. Metrics: 136 sources, 181 offers, 37 excluded, 144 unresolved, 18 require split, zero failed. Reviewed MVP baseline not regenerated.
- `npm run typecheck`: passed.
- Scoped ESLint over all changed runtime/CLI/map/test files: passed.
- `npm run lint`: only five existing no-explicit-any errors in `.local/source-substitution-pilot/inspect.ts` (four) and `upstream.ts` (one). These unrelated scratch files were left untouched.
- Default `npm test`: 643 passed, two research tests timed out at unchanged 15-second/5-second limits; cleanup also reported ENOTEMPTY. A standalone retry reproduced them. Same full suite is rerun with `--maxWorkers=1`, without changing assertions or timeouts; final outcome recorded below.
- Scoped Prettier and `git diff --check`: final results recorded below. Immutable raw captures and generated research map output are not reformatted.

Self-review covered scope, gates, lifecycle, byte identity, conservative update/conflict behavior, and acceptance criteria. No independent review is claimed. No production ingest, Telegram recollection, scheduler/worker, other merchant implementation, commit or push occurred.

Final full unit result: `npm test -- --maxWorkers=1` — **647 tests passed in 37 files**, 46.37 seconds, unchanged assertions/timeouts. The original parallel-run failures are retained in the verification logs. The extra path/control classifier cases are included in this complete pass.

Final focused run: **163 tests passed in seven files** (Shake, acquisition adapters/transport, publication, isolation and merchant map). Final typecheck, scoped ESLint, scoped Prettier and `git diff --check` all passed. An additional `git diff --no-index --check` for each of sixteen changed code files covers untracked changes. The original protected snapshot still matches after formatting. All 24 prior bounded live response bodies also match their original stored evidence SHA-256 hashes. See [protected-evidence-check.json](protected-evidence-check.json).
