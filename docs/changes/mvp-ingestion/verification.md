# MVP ingestion verification

Verified 21 September 2026. Implementation and self-review completed. No independent-agent review was performed. No deployment, push, remote change, recurring collection, or strict publication occurred.

## Outcome and metrics

The 136 original sources produce 200 deterministic MVP records. All 180 benchmark candidates are mapped; none are silently dropped. The original strict corpus still produces 181 offers, 37 excluded, 144 unresolved, 0 approvals and 0 failures. Strict publication requirements remain unchanged.

| Metric | Count |
| --- | ---: |
| Sources | 136 |
| Parsed records | 200 |
| MVP ready / map-ready promotions | 58 |
| Needs validity | 32 |
| Needs content resolution | 8 |
| Needs location | 23 |
| Excluded total | 79 |
| Excluded non-offers | 75 |
| Excluded online-only | 4 |
| Genuine offers with valid expired dates (including unresolved locations) | 68 |
| Active map-ready promotions | 10 |
| Expired map-ready promotions | 47 |
| Upcoming map-ready promotions | 1 |
| Distinct observed Google Place IDs | 607 |
| Failed source processing | 0 |

Evaluation date: 2026-09-21 in Asia/Singapore. All records with parsed dates, including excluded/non-offer records, have 72 expired, 17 active, 3 upcoming and 108 unknown lifecycle values. The product metrics above distinguish active map-ready offers from merely having current dates. Serving recalculates lifecycle on every request. The historical preview includes active and expired ready offers; upcoming offers remain stored but are not displayed.

## Benchmark accounting

180 historical candidates become 181 strict parser offers because `sgfooddeals/4917` contains a tenth numbered geographic-guide child (🔟) that the old export merged into its ninth child. MVP preserves that child. The two candidates in `sgfooddeals/4900` are redemption instructions for a single Cai-Ca promotion, so MVP merges them (minus 1). Ten sources produce independently owned windows (plus 20):

| Source | MVP records | Increase |
| --- | ---: | ---: |
| sgfooddeals/4883 | 2 | 1 |
| sgfooddeals/4901 | 6 | 5 |
| sgfooddeals/4904 | 3 | 2 |
| sgfooddeals/4909 | 2 | 1 |
| sgfooddeals/4924 | 2 | 1 |
| sgfooddeals/4927 | 3 | 2 |
| tastesoulsg/4418 | 2 | 1 |
| tastesoulsg/4453 | 2 | 1 |
| tastesoulsg/4463 | 4 | 3 |
| tastesoulsg/4469 | 4 | 3 |

Thus 180 + 1 - 1 + 20 = 200. Mapping uses source URL, original section ordinal/ownership and deterministic offer identity, never food category. All candidate IDs and runtime IDs appear in [conformance.json](conformance.json). There are 68 candidate-level classification differences, not 68 unexplained failures. Each has a source-based explanation and frozen semantic expectations in [the reviewed baseline](../../../tests/corpus/mvp-conformance-reviewed.json). Examples include explicit dates mislabelled as unbounded recurrence, ordinary menu/event-guide recommendations mislabelled as promotions, mixed online/in-store scope, and source-owned windows. Baseline changes require source review; tests do not automatically accept regenerated output. Provider availability is tested separately from these content facts.

## Every remaining record

[non-ready.json](non-ready.json) lists all 142 non-ready records, including all 79 explicit exclusions, with source URL, stable ID, merchant/title, status and exact reasons. [non-ready.md](non-ready.md) provides a readable version. No location lookup failure is classified as parser failure. Missing validity is needs_validity; missing or ambiguous merchant/benefit is needs_content_resolution.

The 8 content records cover unsupported source text, a steak offer without a merchant identity, a branded product/roadshow advertisement needing redemption-merchant and benefit ownership resolution (two windows), a multi-merchant Grab Dine Out network offer (two source posts), and two editorial promotions without an established benefit. These are not represented as successfully resolved content. Named Google matches remain conservative about addresses/units: spacing/diacritic equivalence is allowed for merchant names only in MVP mode; street typos, absent mall identity, address ranges and mismatched units are not silently rewritten. Twenty-three records have no accepted Google location. Full original conditions remain in descriptions.

No generic official-promotion-page retriever existed: available official infrastructure is fixed merchant-directory adapters. Corpus links are predominantly shortlinks. No expiry was guessed from them or fetched through an unrestricted URL path.

## Checks actually run

| Command | Final result |
| --- | --- |
| `npm test` | PASS: 200 tests, 8 files |
| `npm run test:integration` | PASS: 19 tests, isolated local PostgreSQL/Auth database removed by suite |
| `npm run test:corpus` | PASS: both original strict and MVP suites; 136 sources replayed, no failures; all benchmark candidates accounted for |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS: production routes compiled, generated and typechecked |
| `npx playwright test tests/e2e/mvp.spec.ts` | PASS: 4 desktop/mobile UI and actual API checks |
| `npm run build:mvp-data -- --google` | PASS: live Google responses collected, validated and cached locally |
| `npm run build:mvp-data` | PASS: offline cache replay; deterministic artifact |
| `npm run analyze:mvp` | PASS: 180 mapped candidates, 200 runtime records, zero unmatched candidates, one explained extra child |

Focused MVP tests cover complete/missing dates, Singapore anchoring, bounded recurrence, explicit single days, finite date lists and preserved qualifiers, contradictory dates, branch windows, selected/excluded scope, online-only, Google pagination/cache/deduplication/country/status/optional components, merchant spacing, and list lifecycle/bounds filtering. Strict provider tests remain passing. Browser checks intercept public tiles using the existing raster fixture; desktop and mobile screenshots were visually inspected. Full legacy browser suites were not run; focused MVP checks exercised the changed shared Explorer and real list/detail endpoints.

An initial tsx CLI invocation failed because sandbox IPC sockets were unavailable; the command now uses the repository-supported `node --import tsx` pattern. The first live provider run exposed omitted Google address-component `types`; defaulting only that optional array fixed it and a regression test covers it. An initial browser run hit the project's stale production server, returning 404 for new routes; the project server on port 3100 was restarted and all checks passed. No failed check was weakened or skipped to obtain a pass.

## Use and rollback

- Open `/mvp` for active Google-backed MVP offers; `/corpus` for development historical preview. `/api/mvp/promotions` and its ID route hide expired/upcoming records by default. `includeExpired=true` is honored only outside production. Both routes return no-store responses.
- Set `PROMOTION_DATA_SOURCE=mvp` to use MVP on the home page. The default strict home page and `/api/promotions` remain available. Revert that selector to `strict` for rollback; no database migration is required.
- `npm run build:mvp-data -- --google` refreshes missing/stale Google responses with the server-only key. Repeated assertions reuse query responses. `.local/mvp-google/` is ignored and contains no API key. `npm run build:mvp-data` uses those cached responses offline; a fresh machine without them honestly reports needs_location. The checked-in `data/mvp-promotions.json` is the collected artifact used by serving.
- Deployments must include the generated artifact (or set `MVP_DATA_PATH`). The builder replaces it atomically. Changing `MVP_AS_OF` affects corpus reporting only; live expiry always uses the current Singapore date.
- Google search is observed coverage, capped by its supported traversal, not a complete directory. Search identities/coordinates do not verify promotional participation. UI notices remain visible in both list and mobile map views. No publication verification timestamp or category is fabricated.

## Delivery record

The complete [changed-file list](changed-files.md) includes application, tests, corpus artifact, benchmark and change documents. The source tree was initially clean. Final commit identity and clean working-tree status are reported in the task response. Cached provider responses and browser screenshots remain ignored local verification artifacts.
