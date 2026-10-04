# Batch verification — 1 October 2026

No new source was enabled. Three useful shadow adapters were implemented after bounded research of all four merchants; CS Foods is blocked without a production adapter. The following counts are captured offline generic-gate dispositions at the Singapore date 2026-10-01, **not persisted review-queue rows or production publications**.

| Merchant | Ownership | Enumeration | Adapter | Activation | Candidates | Excluded | Review | Ready | Primary blockers |
|---|---|---|---|---|---:|---:|---:|---:|---|
| FairPrice | verified | 24 catalogue records / one catalogue-list page; overall campaign/product coverage partial | fairprice | shadow; disabled | 24 | 1 | 23 | 0 | Catalogue detail/product set and physical participation unresolved |
| Kris+ | verified | 12 of 29 campaigns; three reported pages; load-more unresolved | kris-plus | shadow; disabled | 12 | 0 | 12 | 0 | Load-more, embedded offer scope, partner publication configuration |
| Dian Xiao Er | probable | 3 unique rendered cards of 7 slides; lightbox mapping unresolved | dian-xiao-er | shadow; disabled | 3 | 0 | 3 | 0 | Ownership, collection/lightbox completeness, image-only facts |
| CS Foods | verified | Sale catalogue accessible; first linked product blocked; campaign completeness unproven | none | blocked | 0 | 0 | 0 | 0 | CleanTalk 403, undated sale semantics, products ≠ campaigns |

## Evidence and replay

[Research](research.md) contains the four-column decision matrix and exact official URLs/operator basis. [Research ledger](research-ledger.json) contains 32 independent attempts and 31 bounded responses: FairPrice 6 attempts / 4 successes / 2 HTTP failures; Kris+ 17 attempts / 14 successes / 2 HTTP failures / 1 sandbox DNS failure; Dian Xiao Er 5 / 5 / 0; CS Foods 4 / 3 / 1. No redirects occurred. The actual access blocks were FairPrice's legal help page and CS Foods' first product, both HTTP 403. Initial broad string diagnostics falsely matched ordinary Wix/WordPress scripts; the original metadata is preserved and canonical interpretations are separately recorded.

Each response retains requested/final URL, capturedAt/observedAt, HTTP status, content type, bytes, SHA-256 and purpose in immutable merchant research directories. Root manifests compose original bodies. All 31 body hashes/sizes and metadata passed tests. No cookies, credentials, private tokens, image downloads or OCR were saved/used. Public inline state was inspected without JS evaluation or undocumented/private backend calls.

[Replay](replay.json) records candidates, provenance, requests, enumeration and dry-run publication decisions. FairPrice only requests its listing; advertised brochure details remain unavailable, and the existing detail-fetch gate stays false. Its explicit catalogue periods produce one expired Xtra Wine catalogue; the unrelated rolling product validity is never used. Kris+ requests one listing/twelve exact public articles; generic “View Partner” labels are ignored, Esso/iStudio remain partner identities, and Birthday Bash/the seven-merchant Zouk article remain unsplit ambiguous objects. Embedded Esso challenge dates never become the header offer's expiry. Dian requests one listing only; its first current/ghost mirror deduplicates exactly, own-card captions remain isolated and image facts stay unknown.

All new adapters use **40 requests, 5 listing pages, 20 detail pages, 8 evidence pages, 3,000,000 bytes, 12,000 ms timeout and 3 redirects**. No source count override was introduced. Tests exercise isolated exact hosts, foreign URLs, undiscovered/recursive paths, bytes/timeouts/redirects, unavailable pagination, stable evidence/candidate/revision hashes across observation times, duplicate/card correspondence, missing image/app facts and disabling by source evidence. Removing recorded blockers or supplying enabled policy to a run still cannot make incomplete acquisition ready. CS Foods has these same research limits but no runtime limits/registration, since no adapter exists.

## Checks actually run

| Check | Result |
|---|---|
| Focused direct/batch/transport/publication/isolation/Shake/Gourmet/map suites, maxWorkers=1 | **242 tests passed, 9 files** |
| npm test -- --maxWorkers=1 | **726 tests passed, 39 files** |
| npm run test:integration -- --maxWorkers=1 | **53 tests passed, 2 files**, disposable local PostgreSQL/PostGIS |
| npm run test:corpus -- --maxWorkers=1 | **4 tests passed, 3 files**; 136 sources / 181 offers / 0 failed; reviewed MVP baseline preserved |
| npm run typecheck | **passed** after all source/test changes and next-env restoration |
| npm run build | **passed**; existing dynamic-filesystem tracing warning in src/server/mvp.ts, which is unchanged |
| npm run lint | **blocked by five existing no-explicit-any errors** in ignored .local/source-substitution-pilot/{inspect,upstream}.ts; no lint configuration/check was weakened |
| ESLint for every changed TypeScript file | **passed** |
| Prettier for every changed TypeScript file | **passed**; original raw capture bytes excluded |
| git diff --check and no-index whitespace checks for all task code | **passed**; no-index exit 1 denotes new/different files with empty diagnostic output |
| Frozen map regeneration / unrelated-row comparison | **passed**, 139 rows retained; exactly four selected rows changed |

Actual output is retained in [verification-logs](verification-logs). Initial test failures are also preserved: an incorrect test CLI export, a generic partner navigation label, and an incorrect test assumption that the Zouk article was a single merchant. Source inspection showed seven explicit merchant names; the negative test now asserts preserved multi-merchant scope. No application behavior or acceptance criterion was relaxed to make it publish. Final complete runs use unchanged assertions/timeouts outside the necessary new-source count/ownership expectations.

## Existing source and persistence regressions

- Pepper captured seven: disposable replay observes 7, publishes 0, updates 0, reviews 7; repeated replay unchanged=7. Original dates/participant gaps and all eight original artifacts are preserved. Synthetic complete Pepper restricted-role publish/update scenarios pass.
- Shake captured corpus: 10 candidates, 4 excluded, 5 review, 1 ready. Disposable replay publishes the active Parkway Parade campaign with fixture coordinates, updates 0, repeated replay unchanged=10. Expired offers skip outlet calls; no extra promotions/revisions are created.
- Gourmet: still shadow with exactly partial_enumeration, service_page_campaign_outside_listing and gourmet_service_boundary_unproven. Its adapter/provider bytes and evidence are unchanged.
- Paradise: still shadow/partial; original unresolved load-more/oversized evidence gates persist.
- Existing direct persistence, admin correction/review, publication update/conflict/dedupe and legacy Telegram ingestion integration checks pass. Direct runtime dependency-closure tests pass without Telegram collectors/parsers/table queries or research map imports; no startup/scheduler import was added.

All three new shadow sources reject both CLI ingestion and persistDirectSourceRun before DB query/connect or outlet operations, verified with spies. CS Foods is absent from SourceId/registry and cannot obtain an ingestion path. Since this batch has no enabled merchant, enabled-source DB replay metrics are **not applicable**. No new-source DB rows were written. Existing integration tests only created/removed isolated local test databases; production/shared DBs were not used.

## Map, preservation and review

The same four frozen input hashes plus final registry produce [merchant-map-after.json](merchant-map-after.json), compared with [before](merchant-map-before.json) in [merchant-map-diff.json](merchant-map-diff.json). Merchant count **139 → 139**; distinct registry adapters **2 enabled / 2 shadow → 2 enabled / 5 shadow**. Row statuses **2 enabled / 3 shadow / 134 none → 2 enabled / 6 shadow / 131 none** (Paradise Hotpot's linked brand row explains the additional row-level shadow). Exactly CS Foods, Dian Xiao Er, FairPrice and Kris+ change; all unrelated rows and historical observations remain equal. CS Foods stays adapter=none with explicit blockers and separately labelled current research ownership evidence; no production status extension was made.

[Protected evidence check](protected-evidence-check.json) compares the retained [pre-task baseline](protected-baseline.json): **4,185 existing files**, **4,178 preserved**, seven intentionally modified code/test/onboarding files, zero unexpected changes. All **131 prior direct-source fixture files** and **3,665 source-discovery-service files** retain original bytes, including frozen history/review data, migration and publication/persistence/review/outlet modules. The original four registry definitions retain their serialized SHA-256. Build regenerated next-env.d.ts; its exact original user bytes were restored and verified. The pre-existing working-tree change remains untouched in the delivered tree.

Self-review compared each adapter against intent/acceptance, source evidence and hostile association cases. It retained source-level blockers, generic-label filtering, conflicting/multiple merchant review, exact card identity and source policies. No independent review is claimed. [changed-files.json](changed-files.json) lists exact task files and hashes, including new evidence and ignored generated map output. Existing unrelated uncommitted work is preserved.

No migration, publication/persistence redesign, outlet-provider refactor, scheduler/worker start, production/shared ingestion, fresh Telegram collection, access bypass, commit or push occurred. Processor remains **direct-source-v2**.

## Acceptance mapping

Spec 1/3: research matrix/source decisions and final table. Spec 2/4/5: batch/adverse tests, existing transport tests, replay and immutable ledger. Spec 6: focused/full/integration regressions and preserved original registry/module hashes. Spec 7: frozen-input map/diff and row-equality test. Spec 8: shadow rejection tests and blocked-source absence; enabled-source replay condition does not apply. Spec 9: exact files, logs, preservation audit and operation exclusions above. Remaining merchant blockers are final scoped outcomes, not unfinished implementation.
