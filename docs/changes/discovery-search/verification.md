# Verification — 2026-09-22

Baseline: feat/production-evidence-coverage at ae125c5. Scope acceptance reviewed against spec.md; no ingestion, artifact, corpus, grouping, publication or existing preview-mode changes.

## Commands and results
- npm test: 13 files, 263 tests passed (includes six new structured-search/endpoint cases).
- npm run test:integration: 19 passed against the isolated local test database.
- npm run test:corpus: 3 files, 4 tests passed. Deterministic corpus metrics: 136 sources, 181 offers, 37 excluded, 144 unresolved, 18 requires split, 0 failed.
- npm run analyze:mvp: passed; 200 runtime records, 180 candidates, 0 unmatched, 1 extra, 34 existing benchmark differences. No generated artifact diff. The command is an analysis, not a claim of zero benchmark differences.
- npm run typecheck: passed.
- npm run lint: passed without warnings.
- npm run build: passed, including the new search route.
- npx playwright test tests/e2e/mvp.spec.ts: 30 passed, 15 desktop and 15 mobile, 22.8 seconds.
- git diff --check: passed.

Initial sandbox attempts could not bind port 3100 or connect to local services; reruns with local network permission passed. The first browser run exposed a new test's innerText/textContent mismatch, corrected to compare rendered text consistently; subsequent runs passed. No production code workaround or weakened product assertion was needed.

## Observable evidence
- Default header is Map area, with the loaded promotion count after filters. Explicit Bugis/Suntec targets and successful geolocation use the named label/Near you and “deals in this area”. Manual keyboard pan and user zoom reset the label; automatic fit preserves it. Corpus keeps its existing full-list count semantics.
- Browser navigated to Tampines, verified zero Morganfield cards, then found Morganfield through artifact search. Selecting it moved to Suntec and produced two cards, “2 deals”, and one highlighted grouped pin. This proves search is independent of viewport items.
- Genki: normal live search returns Genki Sushi, one active promotion, 21 locations. Selecting it fits/highlights all 21; header counts one deal.
- Morganfield: historical preview returns one aggregated merchant row, two Angus Ribeye deals, one Suntec anchor. Normal live search returns none on 2026-09-22.
- Suntec: historical search includes the Suntec City artifact location and associated merchant/deal matches. Selecting the location updates the header and viewport.
- Search-selected Angus Ribeye opens the correct existing detail and highlights its group.
- Pure tests verify case/apostrophe normalization, exact-merchant priority, per-kind limits, raw-text exclusion, full-coordinate fitting and empty-coordinate behavior. Endpoint tests freeze 2026-09-22 and execute under both development and production: includeExpired/view=corpus expose historical/corpus records only in development. showSourceText leaves search results identical.
- Browser tests verify loading/clearing, stale-request cancellation, address-provider partial failure without losing merchant results, source-text invariance, default-hidden keyboard-operable Location info, and no geolocation values in local/session storage.
- Existing source links, raw-source visibility modes, corpus records, one-pin/two-Morganfield selection, schematic fallback and mobile map/list tests all pass.
- Visually inspected test-results/discovery-search-mobile.png, discovery-mobile.png and discovery-desktop.png. Automated tests intercept all public tiles with the existing fixture; screenshots verify layout, not live cartographic imagery.

## Limits and preserved state
Live OneMap integration was not exercised because it is not configured locally; existing neighbourhood results and mocked provider failure were tested. Search uses deterministic structured substring matching, with no fuzzy reconciliation or raw source indexing. Corpus searches may return records without map coordinates; these retain detail selection without fabricated locations.

Next build automatically rewrote next-env.d.ts imports to build paths. After verification, only that generated rewrite was undone using the exact pre-task byte snapshot, preserving the original development-path modification. The file is excluded from the task commit. No push, remote mutation, recurring worker or hosted-data operation was performed.
