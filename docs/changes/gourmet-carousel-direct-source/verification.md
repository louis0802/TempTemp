# Gourmet Carousel direct-source verification

Final decision: **gourmet_carousel_sg is shadow; enabled=false, autoPublish=false**. Operator/domain ownership is verified. The named Gourmet Carousel Barista counter is independently established. Source enumeration is partial. Candidate publication completeness is evaluated separately.

## Execution results

| Measure                                             | Result                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Registered source / operator / merchant             | gourmet_carousel_sg / Royal Plaza on Scotts / Gourmet Carousel                                                    |
| Acquisition roots                                   | https://www.royalplaza.com.sg/dine/offers and https://www.royalplaza.com.sg/dine/barista                          |
| Allowed hosts                                       | www.royalplaza.com.sg only                                                                                        |
| Bounded structural requests                         | 10 successful HTTP responses: 2 roots + 8 details; no redirects or failures                                       |
| Discovered / classified / unresolved paths          | 9 / 9 / 0                                                                                                         |
| Merchant promotion / non-promotion paths            | 2 / 7; seven comprise two other-venue Carousel campaigns and five pages without a Gourmet campaign proposition    |
| Promotion candidates                                | 2                                                                                                                 |
| Actual generic gate expired / review / ready        | 0 / 2 / 0 as of Singapore date 2026-10-01                                                                         |
| Enumeration / complete service coverage             | partial / not proven                                                                                              |
| Visible pagination / load-more / category filtering | none observed; unsupported controls fail closed in tests                                                          |
| Official named physical venue                       | Gourmet Carousel - Barista Experience, Level 1 (Lobby), Royal Plaza on Scotts, 25 Scotts Road, 228220             |
| Venue/provider authority                            | official named counter proven; no exhaustive brand branch-count claim; coordinates mocked for offline checks only |
| Effective count limits                              | requests=40, listing=5, detail=20, evidence=8                                                                     |
| Effective network limits                            | 3,000,000 bytes, 12,000 ms, 3 redirects; existing DNS/SSRF controls unchanged                                     |
| Processor / schema                                  | direct-source-v2 unchanged / no migration                                                                         |
| Production policy                                   | enabled=false, autoPublish=false                                                                                  |
| Gourmet DB publication / replay                     | not executed: shadow CLI/persistence rejects before database or outlet lookup                                     |

Structural evidence is in `tests/fixtures/direct-sources/gourmet-carousel/live-2026-10-01/`. Initial narrow research adds 13 official responses under the two research directories. Every response retains requested/final URL, capture/observation instant, HTTP status/content type/byte count/SHA-256/purpose. Raw bodies are immutable. One sandbox DNS attempt failed before response; authorized bounded acquisition succeeded. No menu image/OCR/asset/QR endpoint/Google lookup/recursive crawl.

The current two campaigns are reachable, but Coffee Day bypasses the offers cards. There is no exhaustive deterministic Gourmet service-page enumeration. All nine currently discovered paths being classified is not a completeness proof. Source activation blockers are exactly `partial_enumeration`, `service_page_campaign_outside_listing`, `gourmet_service_boundary_unproven`.

## Ownership versus venue versus publication

Operator/domain evidence: [Royal Plaza privacy policy](https://www.royalplaza.com.sg/policies/privacy-policy) explicitly identifies the operator of royalplaza.com.sg, preserving the independently verified frozen assessment. Merchant/venue evidence: [official Barista page](https://www.royalplaza.com.sg/dine/barista), exact venue heading, explicit Royal Plaza/Carousel relationship, fixed lobby-address paragraph and operating timing. See `ownership.json` and research.md. Logo/hostname alone is insufficient; Carousel buffet and Palm Café are not aliases.

Coffee Day has explicit one-day validity on **1 October 2026**, **07:30–18:00**, exact named counter participation and source-backed benefit/terms. Its actual gate result is review because the source policy and acquisition boundary are disabled. A counterfactual unit test passes the unchanged generic ready gate only when source policy, acquisition and venue authorization are explicitly supplied; it never changes runtime registry files or publishes.

Moon Pastry delivery has an explicit complimentary-delivery benefit at 50 boxes and above. Collection from 20 August is not campaign validity, and self-collection at a hotel is not authoritative Barista participation. Dates and physical participation stay unknown. The full source eligibility/redemption/terms are retained; only the benefit display label is condensed to the existing 60-character contract.

Counts use the existing calendar-date lifecycle; Coffee Day's exact hours remain in its schedule. Expired synthetic campaigns exclude using the existing lifecycle; ambiguous/missing dates review. Existing integration tests verify exclusion persists provenance and skips outlet lookup/review/Promotion creation. No shared lifecycle logic was changed.

## Exact review blockers

Coffee Day: `source_not_authoritative`, `automatic_publication_disabled`, `source_acquisition_blocked`. The first code is the unchanged generic gate's label for a disabled source; it does not downgrade verified operator ownership. `weekdays_unknown` is informational.

Moon Pastries: `source_not_authoritative`, `automatic_publication_disabled`, `source_acquisition_blocked`, `missing_start_date`, `missing_end_date`, `source_unspecified_locations`, `physical_outlets_unresolved`, `outlet_scope_unresolved`, `campaign_validity_unspecified`, `end_date_unknown`, `gourmet_pastry_participation_unresolved`, `locations_unknown`, `start_date_unknown`, `invalid_promotion:outlets`.

[dispositions.json](dispositions.json) records exact candidate IDs, revision hashes, schedules, outlet status, classifications and all reasons. These are offline review dispositions, not persisted inbox rows. [replay-candidates.json](replay-candidates.json) is final extraction from unchanged live-captured bytes.

## Activation gates

| Gate                                        | Evidence / status                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1. Operator/domain ownership                | verified policy, independently of campaign                                               |
| 2. Gourmet venue relationship               | proven for the named counter; separate from buffet identity                              |
| 3. Complete acquisition boundary            | **FAIL: partial_enumeration**                                                            |
| 4. Pagination/load-more                     | no exposed controls in captured listing; unknown controls fail closed                    |
| 5. Service-page campaign coverage           | **FAIL: service_page_campaign_outside_listing, gourmet_service_boundary_unproven**       |
| 6. Campaign/non-campaign classification     | nine resolved current paths; distinct venue semantics preserved                          |
| 7. Deterministic detail extraction          | two candidates, captured semantic replay, isolated blocks and dedicated detail selectors |
| 8. Explicit validity where available        | coffee explicit; pastry safely reviews; no collection/menu/metadata dates used           |
| 9. Authoritative physical identity          | named official lobby counter; changed name/address/relationship/timing fails closed      |
| 10. Participation resolution                | coffee exact named venue; pastry unresolved and reviews; coordinate tests mocked         |
| 11. Bounded live acquisition                | ten responses within unchanged defaults                                                  |
| 12. Offline deterministic replay            | candidates, classifications and revision hashes replay identically                       |
| 13. Generic expired/ready/review separation | merchant tests plus existing unit/integration regressions; gate unchanged                |

Failures of gates 3 and 5 prevent activation regardless of complete Coffee Day facts. No activation assertion was weakened.

## Frozen merchant map

Regenerated with `node --import tsx scripts/research/build-merchant-source-map.ts --output .local/merchant-source-map/gourmet-carousel-2026-10-01-shadow`. Only Gourmet Carousel's row changes from none to shadow, with exact operator/source/current blockers. Original historical source observations and every frozen input hash remain identical. Historical generated `docs/research/merchant-source-map.md` is preserved.

| Count                                         |   Before |    After |
| --------------------------------------------- | -------: | -------: |
| Merchant rows                                 |      139 |      139 |
| Distinct enabled adapters                     |        2 |        2 |
| Distinct shadow adapters                      |        1 |        2 |
| Enabled merchant rows                         |        2 |        2 |
| Shadow merchant rows                          |        2 |        3 |
| No-adapter merchant rows                      |      135 |      134 |
| Historical merchant rows / unresolved records | 138 / 67 | 138 / 67 |

Full generated outputs remain in the new research-only child directory. [merchant-map-replay.json](merchant-map-replay.json) records both summaries, exact before/after Gourmet rows, unchanged frozen hashes and the sole changed-row assertion. Map runtime remains offline/research-only.

## Tests and review

- Final merchant tests: **32 passed**, covering exact roots/hosts, canonical dedupe/no recursion, budget/unknown-control/structure failure, service bypass, non-campaign/other-venue/operator ambiguity, isolated campaigns, explicit date/schedule/provenance, menu/price/publication date rejection, official identity/address, place-only coordinate enrichment, lifecycle/generic gate/disabled persistence, immutable captures and live offline replay.
- Focused merchant/direct/transport/publication/isolation/Pepper/Shake/map regression run: **196 tests passed in 8 files**.
- Full units, `npm test -- --maxWorkers=1`: **680 passed in 38 files**; original timeouts/assertions retained.
- PostgreSQL/PostGIS integration, `npm run test:integration -- --maxWorkers=1`: **53 passed in 2 files**. Only isolated local test databases; a post-suite read-only query confirms zero test databases remain.
- Corpus, `npm run test:corpus`: **4 passed in 3 files**. 136 sources, 181 offers, 37 excluded, 144 unresolved, 18 split, 0 failed. Reviewed baseline not regenerated.
- `npm run typecheck`: passed. Scoped ESLint: passed over all eight changed runtime/test files.
- Scoped Prettier: passed for changed code/tests, workflow Markdown and fixture README. `git diff --check` and separate `git diff --no-index --check` checks for all task-written text files: passed; immutable raw HTML is excluded from whitespace normalization.

Pepper's original captured seven remain **7 review / 0 publish**; synthetic ready/publish/update/replay and incomplete revision/admin correction/dedupe scenarios pass unchanged. Shake's ten remain **4 exclude / 5 review / 1 auto-publish**, including Parkway and unchanged replay. Paradise remains disabled/partial. Existing persistence, review, direct isolation and legacy ingestion tests all pass. The registry and preview count assertions now include the new fourth source; no enablement assertions or timeouts changed.

Self-review checked the exact diff against AC1–AC7, edge cases, evidence provenance, venue separation and safe activation. No independent review is claimed. Build/browser UI checks were not needed for this adapter-only slice; no Next.js UI code was edited. The installed Next data-security guide was read before implementation.

## Preservation and operation boundaries

[protected-evidence-check.json](protected-evidence-check.json) confirms **4,132 protected files byte-identical**, out of a 4,135-file baseline with only three intended registry/schema/provider-dispatch edits excluded. Includes historical audits/captures, frozen corpus/map inputs, prior Pepper/Shake evidence, `.local/source-discovery-service`, existing next-env.d.ts change, AGENTS.md and package.json. New captured response hashes are independently tested. All unrelated existing worktree changes remain intact.

No merchant-specific persistence, publication tables, migrations, processor/revision/dedupe/review semantic change, production/shared ingestion, scheduler/worker start, fresh Telegram collection, other merchant onboarding, commit or push. Only the requested local disposable integration operation ran.

The exact task-written file inventory is [changed-files.json](changed-files.json); executable results are [verification-results.json](verification-results.json). Required workflow documents are [intent.md](intent.md), [spec.md](spec.md), [design.md](design.md), [plan.md](plan.md); source findings are [research.md](research.md).
