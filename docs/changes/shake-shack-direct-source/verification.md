# Verification — 1 October 2026

[Intent](intent.md), [specification](spec.md), [design](design.md), [plan](plan.md) were created before application edits. Final scope is delivered with evidence-dependent shadow activation, as requested. Independent reviewer tooling was unavailable; this is a completed self-review, not independent review.

## Merchant map

Authoritative output: `.local/merchant-source-map/2026-10-01T05-18-04-159Z/`. Required merchants.json/report.md/report.csv are all byte-identical to the `-replay` sibling. The build is `node --import tsx scripts/research/build-merchant-source-map.ts`; no collector, network refresh or DB mode. Protected-input evidence is an additional diagnostic in the authoritative directory.

Frozen inputs used:

- `tests/corpus/mvp-conformance-reviewed.json`: existing reviewed 180-candidate baseline; use reviewed actual merchant/offer identities, never re-run the parser.
- `.local/source-origin-audit/2026-09-30-social-corrected-offline/signals.json`: previously captured September 30 signal snapshots; 77 signals, 50 classified promotion signals, with their original one_off_refresh provenance retained. These are frozen input now, not a new collection.
- `.local/direct-source-audit/2026-09-30T14-13-48-529Z/audit.json`: final corrected captured direct-source audit, 17 direct observations and 16 distinct signal IDs; SHA-256 7db66e5cebf01e304905b0899dee26761eddd4c367b3e83ac28f5d32b3c86b05.
- `docs/research/merchant-source-map-review.json`: this slice’s explicit, source-backed signal-ID entity associations and cited current adapter blockers. This is engineering research, never runtime authority. All four input hashes plus registry metadata hash are in merchants.json and [status documentation](../../research/merchant-source-map.md).

Result: **138 distinct historical normalized merchant identities, 139 total rows**, including one registry/research-only Paradise Group row. Historical per-brand totals: 179 distinct source-post observations and 193 reviewed/captured offer identities. Roundup posts may contribute to several brands; these are not global post counts. 67 unresolved records are separately retained rather than inventing a merchant. Count definitions and conservative spelling-variant limitations are explicit.

Merchant-row adapter coverage: enabled **1**, shadow **3**, none **135**. Distinct source adapters: enabled **1** (Pepper Lunch), shadow **2** (Paradise Group, Shake Shack). Paradise Hotpot has an explicitly observed parent-adapter linkage but remains a separate brand row. No automatic Dynasty/Hotpot merge or unproved brand-parent assignment.

Enabled autonomous ingestion: **Pepper Lunch only**. Unadapted merchants with direct evidence: **CS Foods, Dian Xiao Er, FairPrice, Gourmet Carousel, Grab, Kris+**. Independent ownership is already recorded for FairPrice, Gourmet Carousel/Royal Plaza and Grab; enumeration/extraction/participation remains incomplete. Kris+ public directory findings remain separate from the non-enumerable sampled Birthday Bash deep link; no Kris+ adapter is added. Rows without captured source evidence stay unknown. Source families and explicit blockers support next-onboarding decisions without scoring or runtime hard-coding.

## Ownership and fixtures

Shake Shack ownership: **verified**, elevated from the prior audit’s **probable** finding using the official [customer data-protection notice](https://www.shakeshack.com.sg/wp-content/uploads/2024/12/SS-Data-Protection-Notice-for-Customers.pdf). Its opening declaration and operating-store clauses identify **Shake Shack Singapore Jewel Ptd Ltd**. Preserve “Ptd” exactly as written; this is an independent legal operator declaration, not a corporate-register attestation, domain/logo/Telegram/search attribution. Exact captured PDF hash, URL, operator basis and previous probable status are in tests/fixtures/direct-sources/shake-shack/ownership.json. Native text and a rendered page were inspected; no OCR. A temporary writable font configuration resolved the bundled renderer’s initial cache error.

Sixteen bounded source captures record URL, UTC time, hash, byte length, status and purpose in capture-provenance.json. Four archive pages, representative details, official directory, the two missing linked branch pages, contact page and legal PDF are immutable fixtures. Fixture replay does not cover every archived detail and never implies full acquisition. Two initially suspected editorial articles were found to contain real offers: Hello Parkway Parade has an opening discount; All About Chickens has a bundle. Preserve them as promotion fixtures. Our French Onion Menu is the confirmed menu-editorial exclusion fixture.

Promotion inclusion is source-specific: merchant wp-post body must have a terms heading and an explicit economic proposition tied to purchase/bundle, a qualifying discount/on-us proposition, or meal/bundle pricing with terms. Archive membership, title, standalone dollar/free/deal words never suffice. Non-qualifying/uncertain articles remain evidence without promotion candidates. No arbitrary same-site or recursive crawling.

## Bounded actual preview and final offline replay

One live structural CLI preview after fixture checks: `.local/direct-source-preview/2026-10-01-shake-shack-bounded/`. **24 successful requests: four listing pages, twenty detail pages**. All exposed numbered archive pagination was traversed. Four pages contain **44 article cards**; the remaining **24 article details** cannot be classified within the unchanged twenty-detail cap. Complete=false, listing_fetch_success=true, deterministic_extraction=true, detail_fetch_success=false due to the classification cap. This is acquisition-partial, not production-adapter-ready. Existing fetch limits were not raised.

Five promotion candidates were emitted from the bounded subset, not a claim of five total archive campaigns. Final source-specific refinements were replayed offline from those exact 24 captured bodies: `.local/direct-source-preview/2026-10-01-shake-shack-final-offline/`, using the `2026-10-01-shake-shack-replay-input` manifest. No second live crawl.

| Final captured candidate       | Campaign dates from source   | Location             | Material remaining fact issue                                                                            |
| ------------------------------ | ---------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| 100% Angus Beef – Just for You | 23–26 September 2025         | Explicit all outlets | Full benefit quote exceeds shared 60-character publication field; retained rather than guessed/truncated |
| All About Chickens             | 7 July 2025 only             | Explicit all outlets | No fabricated metadata-derived year; shared source gate still blocks                                     |
| Feeding a Crowd?               | Unknown                      | Unknown              | Missing campaign bounds, physical participation and structured redemption                                |
| Hello, Parkway Parade!         | 11 September–10 October 2026 | Exact Parkway Parade | Shared source gate still blocks                                                                          |
| National Cheeseburger Day      | 14–18 September 2026         | Explicit all outlets | Shared source gate still blocks                                                                          |

All five extraction statuses are partial under the existing candidate model because optional eligibility/weekdays/hours can be unknown. Unknown optional restrictions are informational only when not explicitly stated; actual campaign/hour/holiday ambiguity still blocks. National Cheeseburger Day’s article date is 9 September 2026, independently retained in publishedAt and never used as validity. Other captured cases prove missing expiry/year, explicit Sundays, weekday/hours, exact student eligibility and unsupported holiday restrictions.

Official outlet result: **complete twelve-branch proof**. `/locations/` declares twelve results and twelve map identities but only ten cards. The provider fetches only the two missing exposed official branch detail links, One Fullerton and Parkway Parade, and requires exact count/name/address/hour agreement and no unresolved pagination. Ten cards alone are non-authoritative. Unknown/fuzzy participants do not match; mocked Google/OneMap supplies coordinates only, never branch enumeration or participation. No live geocoding.

Shake Shack **publicationPolicy.enabled=false, autoPublish=false**. Exact activation blocker: mixed archive classification cannot be completed within default twenty-detail acquisition bounds; twenty-four articles remain unclassified. Ownership and outlet proof succeeded; no relaxed authority or pagination gate. Generic ingest CLI was actually invoked and printed `direct_publication_disabled` before environment loading/DB access. Preview works. **No Shake Shack DB ingestion or direct-review queue writes** were performed. Evaluation tests return needs_review for incomplete candidates and for the disabled source; an explicitly hypothetical enabled-policy test proves a complete captured campaign can pass the unchanged generic gate. That test restores the disabled policy and is not activation evidence.

## Checks actually run

| Check                                                            | Result                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -- --maxWorkers=1`                                     | **619 tests pass, 36 files** on final implementation                                                                                                                                        |
| Focused map/Shake Shack/direct adapter/publication/isolation run | **130 tests pass, five files**, including the final additional research-dependency assertion                                                                                                |
| `npm run test:corpus -- --maxWorkers=1`                          | **Four tests pass, three files**; existing frozen corpus unchanged                                                                                                                          |
| `npm run test:integration -- --maxWorkers=1`                     | **47 tests pass, two files** on disposable local databases; final regression replay after ownership guard                                                                                   |
| `npm run typecheck`                                              | **Pass**                                                                                                                                                                                    |
| Scoped ESLint on every changed/added TypeScript file             | **Pass, zero warnings**                                                                                                                                                                     |
| `npm run lint`                                                   | **Fails on five pre-existing no-explicit-any errors** in ignored `.local/source-substitution-pilot/inspect.ts` and `upstream.ts`; no slice file errors. Those scratch files were not edited |
| Scoped Prettier check                                            | **Pass** for changed code, docs, JSON provenance and fixture README                                                                                                                         |
| `git diff --check`                                               | **Pass**                                                                                                                                                                                    |
| Three-file merchant-map replay                                   | **Byte-identical JSON/Markdown/CSV**                                                                                                                                                        |
| Build/UI/E2E                                                     | Not run: no application UI or route implementation changed; Node/type/unit/integration/corpus checks exercise this scope                                                                    |

Initial sandbox-only integration attempts failed on localhost EPERM; authorized local replay then passed without changing tests or environment targets. No production/shared DB operation. Integration uses only existing disposable local test databases, including Pepper and generic publication regressions; Shake Shack remains excluded by its policy.

Pepper captured seven retain **zero auto-published, seven needs-review**, replay unchanged; existing synthetic complete/update scenarios still pass. Pepper adapter and outlet-parser bytes are unchanged, as are its captured responses. Paradise remains shadow/disabled and its partial enumeration gate stays false; no load-more repair.

Existing generic integration covers changed complete revisions updating the same Promotion, incomplete revisions preserving prior facts while marking review, admin correction protection, and origin-agnostic fingerprints. New Shake Shack tests separately prove deterministic candidate/Promotion IDs and revision hashes across unchanged/changed source bytes without enabling real ingestion.

## Acceptance evidence by requested check

- 1–9: merchant-source-map.test.ts covers pinned local inputs, no fetch/collector, normalization, brand-parent separation, current Pepper/Paradise status, retained Shake Shack prior audit, unknown source evidence, deterministic reports.
- 10–19: shake-shack-direct-source.test.ts plus existing direct transport tests cover listing, numbered pagination/cycle/caps/load-more, canonical dedupe, structure/card/path/host boundaries, editorial exclusion and real promotions.
- 20–30: captured source tests cover benefit provenance, explicit ranges and single days, independent publication metadata, missing expiry/year, verbatim eligibility/redemption/terms, represented weekday/Sunday restrictions, blocking hours/holidays and unknown participation. No metadata-derived campaign values.
- 31–36: recorded PDF ownership hash/basis test, missing-evidence/probable authority rejection, twelve-branch proof, ten-card rejection, exact/fuzzy participants and coordinate-only mocked providers.
- 37–45: hypothetical enabled-policy complete-campaign gate test, captured incomplete review, stable Shake Shack identity/revision tests, and unchanged generic persistence/publication integration. Real activation is not manufactured to obtain a DB case.
- 46–47: activation follows evidence; case 46 is inapplicable because classification is partial. Case 47 passes via fixture preview, live/offline preview and actual generic CLI rejection.
- 48–53: Pepper/Paradise regressions, complete AST direct-runtime dependency closure including explicit exclusion of map scripts, full legacy unit/corpus/integration and direct persistence/publication tests.
- 54–56: protected byte comparison below, including original source-origin/direct audit and source-discovery-service, plus next-env.d.ts.

## Protected boundaries

Snapshot before edits: **3,995 baseline files**. **3,989 unchanged**, six intentionally changed baseline paths (five shared direct-source modules plus onboarding documentation); no unexpected changes. Additional adapter/map/tests/doc files are new. Existing test registry-count expectations were extended additively, and the isolation assertion strengthened; legacy tests are untouched.

Byte-identical: all **3,665 source-discovery-service files**, **44 source-origin files**, **110 direct-audit files**, pre-existing next-env.d.ts modification, package.json and AGENTS.md. Pepper parsing files and old fixtures remain byte-identical. Proof: authoritative map directory protected-input-verification.json. Existing research/source-origin artifacts and all unrelated dirty work are preserved.

Direct ingestion dependency closure has no Telegram collector, PostOfferParser, PromotionSignal, forbidden legacy table reads, or merchant-map research dependency. Map script is research-only and is never imported by worker/scheduler/application startup. No scheduler or worker started, no fresh Telegram collected, no production/shared data operation, no commit or push.

## Exact files changed by this slice

Paths are repository-relative; pre-existing unrelated changes are excluded.

Modified:

- `docs/changes/autonomous-direct-source-ingestion/onboarding.md`
- `src/ingestion/direct-sources/outlet-resolution.ts`
- `src/ingestion/direct-sources/publication.ts`
- `src/ingestion/direct-sources/registry.ts`
- `src/ingestion/direct-sources/runner.ts`
- `src/ingestion/direct-sources/types.ts`
- `tests/direct-ingestion-isolation.test.ts`
- `tests/direct-source-adapters.test.ts`

Added:

- `docs/changes/shake-shack-direct-source/design.md`
- `docs/changes/shake-shack-direct-source/intent.md`
- `docs/changes/shake-shack-direct-source/plan.md`
- `docs/changes/shake-shack-direct-source/research.md`
- `docs/changes/shake-shack-direct-source/spec.md`
- `docs/changes/shake-shack-direct-source/verification.md`
- `docs/research/merchant-source-map-review.json`
- `docs/research/merchant-source-map.md`
- `scripts/research/build-merchant-source-map.ts`
- `scripts/research/merchant-source-map/build.ts`
- `src/ingestion/direct-sources/adapters/shake-shack-outlets.ts`
- `src/ingestion/direct-sources/adapters/shake-shack.ts`
- `tests/fixtures/direct-sources/shake-shack/README.md`
- `tests/fixtures/direct-sources/shake-shack/capture-provenance.json`
- `tests/fixtures/direct-sources/shake-shack/chicken-bundle-promotion.html`
- `tests/fixtures/direct-sources/shake-shack/contact.html`
- `tests/fixtures/direct-sources/shake-shack/editorial.html`
- `tests/fixtures/direct-sources/shake-shack/legal-native.txt`
- `tests/fixtures/direct-sources/shake-shack/legal.pdf`
- `tests/fixtures/direct-sources/shake-shack/listing.html`
- `tests/fixtures/direct-sources/shake-shack/manifest.json`
- `tests/fixtures/direct-sources/shake-shack/missing-expiry.html`
- `tests/fixtures/direct-sources/shake-shack/named-location.html`
- `tests/fixtures/direct-sources/shake-shack/one-fullerton.html`
- `tests/fixtures/direct-sources/shake-shack/opening-promotion.html`
- `tests/fixtures/direct-sources/shake-shack/outlets.html`
- `tests/fixtures/direct-sources/shake-shack/ownership.json`
- `tests/fixtures/direct-sources/shake-shack/page-2.html`
- `tests/fixtures/direct-sources/shake-shack/page-3.html`
- `tests/fixtures/direct-sources/shake-shack/page-4.html`
- `tests/fixtures/direct-sources/shake-shack/parkway-parade.html`
- `tests/fixtures/direct-sources/shake-shack/promotion.html`
- `tests/fixtures/direct-sources/shake-shack/weekdays.html`
- `tests/merchant-source-map.test.ts`
- `tests/shake-shack-direct-source.test.ts`

Ignored generated outputs are the authoritative/replay merchant-map directories and the live/replay direct-preview directories listed above. Full fixtures never seed operational campaign data.
