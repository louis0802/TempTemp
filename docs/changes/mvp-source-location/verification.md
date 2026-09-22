# Verification — MVP source-location coordinates

## Outcome and exact accounting

Baseline: clean `feat/production-evidence-coverage` at `029134663794383b457d4fe43616bb8fde2f599f`. Frozen [baseline.json](baseline.json) contains exactly 28 original primary needs_location IDs. [ledger.md](ledger.md) has one row per ID; [ledger.json](ledger.json) adds complete per-location queries, outcomes, Google IDs, source labels, Google formatted addresses and coordinates. Reproduce with `node --import tsx scripts/audit-mvp-locations.ts`.

| Measure | Before | After |
| --- | ---: | ---: |
| Original primary needs_location | 28 | 0 |
| Total map-ready | 58 | 86 |
| Active live-ready at fixed artifact date, 2026-09-21 SGT | 10 | 13 |
| Active live-ready at task date, 2026-09-22 SGT | 9 | 12 |
| Curated records | 200 | 200 |
| Primary needs_validity | 72 | 72 |
| Primary needs_content_resolution | 42 | 42 |

Of the original 28, **2 resolved by merchant Place only** (KFC and IKEA), and **26 resolved with source-location fallback**. Five original records had cache-miss reasons. Two of those became ready merely through live cache refresh (the same KFC/IKEA merchant-only records); the other three required fallback. These counts must not be added as independent categories. No original record remains primary needs_location.

The dimensional `Needs location` metric is still 110 because unresolved content/validity continues to defer lookup. It does not mean 110 physical lookups failed. Content resolved remains 158, validity resolved 92, online-only 4. All 58 previously ready records remain ready.

## Partial location coverage, retained exactly

Readiness retains the existing rule of at least one usable outlet. Zero primary blockers does not imply every named location resolved:

- IKEA — `ce678cf7-e97a-53ba-af36-e138b4be89b2`, https://t.me/tastesoulsg/4430: Alexandra Bistro resolves as a merchant Place. `source_location_not_found:IKEA Tampines Bistro, L1 & L3` and `source_location_not_found:IKEA Jurong Bistro` remain. Returned restaurant/store names do not deterministically establish those exact bistro anchors.
- Hokkaido Baked Cheese Tart — `faeea915-05e1-5a2a-a3fa-7b943fba860d`, https://t.me/tastesoulsg/4453: Bugis Junction resolves as a venue anchor; `source_location_not_found:Changi Airport T3, B2-11` remains. Terminal lookup does not provide a uniquely matching acceptable terminal venue; the similarly named bus stop is rejected.

All other original records resolve their requested source locations. No generic no_operational_google_location remains. Neither source anchors nor merchant Places assert promotion participation.

## Checks actually run

| Check | Result |
| --- | --- |
| `npm test` | PASS, 245 tests across 10 files, including 33 focused source-location tests and 2 build-failure retention tests |
| `npm run test:integration` | PASS, 19 tests against isolated local database/Auth; no skips |
| `npm run test:corpus` | PASS, 4 tests across 3 files; original strict metrics remain 181 offers, 37 excluded, 144 unresolved, 0 approvals, 0 failures |
| `npm run build:mvp-data -- --google` | PASS; live responses captured on 2026-09-22, then reused within cache TTL for final build |
| `npm run build:mvp-data` | PASS; byte-identical artifact and both non-ready reports compared with final Google-backed build |
| `npm run analyze:mvp` | PASS; 180 candidates, 200 records, 0 unmatched, 1 previously explained extra child; reviewed baseline unchanged |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; production compile, typechecking and all 12 static pages generated |
| `npx playwright test tests/e2e/mvp.spec.ts` | PASS, 8 desktop/mobile tests; two detail tests rerun to capture scrolled outlet section for visual QA |
| `git diff --check` | PASS |

Focused tests cover merchant preference, mall/unit preservation, Singapore country/bounds rejection, ambiguity including competing buildings, closed/unavailable anchors, missing address business status, exact street number/route/range, conflicting address/name, typed anchor preference, supermarket identity, bus-stop rejection, pagination, cache miss, validity gating, shared building IDs and partial coverage. `tests/fixtures/mvp-location-google.json` contains captured public Google responses for all original 28; the corpus replay verifies their complete records against the artifact twice without network access. The original 180-candidate reviewed conformance baseline was not regenerated. Two isolated subprocess tests inject network/HTTP failures and verify a failed live build leaves the prior artifact byte-for-byte intact.

Initial sandboxed Google/network and local integration sockets were blocked. The authorized network/local-socket runs passed. The initial network failure revealed that a transport outage could overwrite the artifact with location failures; the build now retains the prior artifact and exits unsuccessfully for live transport/HTTP failures. No tests were skipped or weakened. No worker or recurring process was started.

Both desktop and mobile source-anchor screenshots were inspected. The source unit, coordinate explanation, separate Google address/link and directions are visible and readable; screenshots are ignored local artifacts. Automated tiles use the existing fixture; no automated public tile fetches.

## Determinism and scope review

Artifact SHA-256: `e49d9e12ce6fb2c22e1b5c6f936e1025a6ab7f00d688438d9fae36d310e3844b`.

The baseline comparison verifies all IDs, source URLs, offer keys, merchant/title/benefit/descriptions, dates, weekdays, hours, cutoff, scopes, map coverage basis, content/validity status and inclusion flags are unchanged across all 200 records. Deferred content/validity records are identical except the added empty locationAudit. Strict provider discovery retains original schema and behavior; only MvpPipeline opts into fallback. No static production coordinates, publication changes or validity/content ordering changes. The self-review checked the code diff and all original ledger entries; no independent review is claimed.

No database migration. Roll back code and generated artifact together. Only a local scoped commit is authorized; no remote added or push performed.
