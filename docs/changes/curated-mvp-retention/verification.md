# Curated MVP retention verification

Implementation and self-review completed. No independent-agent review, deployment, push, recurring collection or strict publication was performed. The working tree was clean at entry. A local scoped commit and final Git status are reported in the task response.

## Result

All 136 curated sources retain their 200 deterministic records. No MVP record has an exclude disposition. Curated inclusion establishes promotional intent; the legacy genuine field now records that inclusion, not proven savings or publication approval. Source wording supplies the display proposition. Strict parser, resolution, Google discovery and publication implementation files are unchanged.

The four design records are [intent.md](intent.md), [spec.md](spec.md), [design.md](design.md), and [plan.md](plan.md).

## Reproducible metrics

Artifact evaluation remains **21 September 2026, 00:00 Asia/Singapore**, matching the prior baseline. Live serving recalculates lifecycle at request time; these snapshot counts are not a claim that every active-dated record qualifies for the live feed.

| Primary status (mutually exclusive) | Count |
| --- | ---: |
| Total curated records | 200 |
| ready | 58 |
| needs_validity | 72 |
| needs_location | 28 |
| needs_content_resolution | 42 |

| Independent informational dimension | Count |
| --- | ---: |
| Content resolved | 158 |
| Content unresolved | 42 |
| Validity resolved | 92 |
| Validity unresolved (including content-review records) | 108 |
| Map ready | 58 |
| Needs location (including deferred lookup) | 138 |
| Online only | 4 |
| Explicit malformed/unsupported source text | 1 |
| Active with resolved validity | 17 |
| Expired with resolved validity | 72 |
| Upcoming with resolved validity | 3 |
| Unknown lifecycle | 108 |
| Failed source processing | 0 |

The 58 ready physical records comprise 10 active, 47 expired and 1 upcoming. The live physical feed requires resolved content, resolved complete dates, active lifecycle and accepted Google outlets; only the 10 active ready records qualify at the artifact evaluation time. Online-only records never enter this physical feed, even if their content and validity are ready.

## Every former exclusion and remaining content gap

[former-exclusions.md](former-exclusions.md) lists **all 79** original exclude IDs, source links, titles, new statuses, independent mapping states, decisions and reasons. [former-exclusions.json](former-exclusions.json) is the machine-readable ledger. Outcomes: **38 needs_validity, 36 needs_content_resolution, 5 needs_location**. Four of those records independently have online_only mapping state and zero outlets.

The audit categories are 42 promotions retained, 4 online-only promotions retained without pins, and 33 unsupported source/extraction records requiring content review. The last category includes missing merchant/offer ownership; it does not mean 33 literally malformed posts. Only sgfooddeals/4889 is an explicit unsupported/empty-text marker.

[content-review.md](content-review.md) identifies every one of the **42** current content-review records and its exact reasons. All are represented as preview cards; none is dropped. Current extraction limitations include priced links without merchant identities, neighbourhood-group links, channel invitations/quiz posts, event/venue ownership, product/roadshow ownership, network cashback/dining offers, and some unstructured headings. Existing date-parser limits also remain: inline event periods, prose “1 to 5 September” and ambiguous campaign waves do not become invented dates.

[source-review.json](source-review.json) preserves original source text, owned child text, old/new semantic values and review rationale for all **87** changed semantic records, including the 79 exclusions. The baseline was updated only after inspecting source text. Every changed expectation was constrained to reviewed record IDs; dates, scope, identities and splitting were asserted unchanged. Historical offerStructure metadata remains in the benchmark and conformance report; it no longer creates an inclusion mismatch or gate. All 180 historical candidates remain mapped, plus the previously explained tenth neighbourhood child; 34 date/scope comparison differences remain descriptive.

Named regressions: Pizza Hut’s $61 National Day bundle, Dian Xiao Er’s $9.90 lunch set, and Sushiro’s Pokémon collaboration are content-resolved and needs_validity. Their prices/collaboration wording is preserved, not rewritten as savings. Pizza Hut’s possessive campaign heading now yields the merchant Pizza Hut. Sushiro’s unassigned waves retain requires_split. Koi Thé’s $52 pack is online_only and needs_validity. foodpanda/GrabFood link-only children remain online_only but require proposition review.

## Acceptance and boundary checks

- All 200 record IDs, source descriptions, dates, weekdays, hours, redemption cutoffs, outlet scopes, map coverage bases and Google outlet arrays match the original artifact byte-for-value. Only MVP inclusion/content handling and independent status metadata changed.
- No expiry was invented. Missing, unbounded, ambiguous and conflicting validity remains blocked from live serving. Preview may show partial dates alongside clear unresolved labels.
- No live Google requests were made. Cached responses were replayed; the five newly location-eligible records without matching cached queries honestly remain needs_location. Provider matching, named-versus-merchant queries, operational status and participation disclaimers remain unchanged. Existing unresolved content/validity continues to defer physical lookup; the 138 map-incomplete metric includes those deferred records and does not claim 138 failed requests.
- `/corpus` displays every record independently of viewport: complete, incomplete, online-only, expired and upcoming. List/detail rendering tolerates absent merchant, proposition, dates and outlets; sorting missing end dates no longer crashes. Pins still derive only from actual outlet arrays.
- The existing development-only includeExpired flag now selects this full corpus preview. Production ignores that flag; production `/corpus` remains unavailable. Live bounds filtering and lifecycle gates remain enforced.
- Strict corpus replay remains **181 offers, 37 excluded, 144 unresolved, 0 approvals, 0 failures**. Existing publication, authentication, transactional rollback and reviewer preservation integration checks pass.

## Commands and observed results

| Command | Result |
| --- | --- |
| `npm test` | PASS — 210 tests across 8 files |
| `npm run test:integration` | PASS — all 19 tests against isolated local PostgreSQL/Auth, no skips |
| `npm run test:corpus` | PASS — 3 tests across strict and MVP suites; all 136 sources and all 79 audit IDs checked |
| `npm run build:mvp-data` | PASS — deterministic offline cache replay; artifact version 2 |
| `npm run analyze:mvp` | PASS — 180 candidates, 200 records, 0 unmatched, 1 explained extra child; dimension and status metrics printed |
| `npm run build` | PASS — production compile, typechecking and route generation |
| `npm run typecheck` | PASS — run after build to avoid generated-type races |
| `npm run lint` | PASS |
| `npx playwright test tests/e2e/mvp.spec.ts` | PASS — 6 desktop/mobile checks, real list/detail endpoints, all 200 cards, incomplete-date sort, online detail/no outlets and actual MapLibre layout |
| `git diff --check` | PASS |

Initial integration setup failed with sandbox EPERM on local sockets. The same suite passed with authorized local-socket access; no tests were weakened or skipped. Automated browser tests intercepted public tiles with the existing fixture. Desktop/mobile screenshots were inspected; screenshots remain ignored local test artifacts. The full legacy browser suite and live Google refresh were outside the focused verification scope.

## Artifact and rollback

The checked-in artifact is version 2 with required contentStatus, validityStatus and mapStatus fields plus explicit statusCounts. `build:mvp-data` now regenerates both JSON and Markdown non-ready reports together, preventing stale exclusion descriptions. Roll back code and artifact together if needed; no database migration is involved. The prior MVP documents are explicitly labelled historical where superseded.
