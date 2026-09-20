# Verification — Singapore promotion map

Date: 16 September 2026. Initial MVP evidence is preserved below; the follow-on section records live public-preview collection and the newer checks. No complete Telegram archive or production guarantee is claimed.

## Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed on final source and tests. |
| `npm run lint` | Passed. |
| `npm test` | 15 tests passed. Validity, public query validation, demo honesty, unavailable database, anonymous admin rejection. |
| `npm run test:integration` | 10 tests passed against an isolated real PostgreSQL/PostGIS database and local Supabase Auth. |
| `npm run test:e2e` | 6 tests passed in Chromium desktop (1440 × 1000) and iPhone 13 emulation. |
| `npm run build` | Passed on the final source; all pages and API routes compiled. |
| Docker local services | PostGIS, GoTrue authentication and nginx gateway running. Migration and local administrator provisioning succeeded. |
| Visual review | Desktop discovery, mobile discovery and mobile map screenshots inspected. No horizontal overflow; readable cards, visible demo labels, matching numbered pins. |

## Acceptance evidence

- **AC1:** Map and list share the same filtered result set. Browser tests cover category filters, neighbourhood search, denied geolocation, mobile list/map switching, keyboard Escape and overflow. Geographic SQL filtering is exercised with PostGIS.
- **AC2–AC4:** Schema validates required facts and participating outlet evidence. Tests cover inclusive end dates at Singapore midnight, future/withdrawn/unknown-expiry exclusion, weekdays, exclusive closing time, public holidays, unknown redemption hours, invalid dates and unsafe source links. Full offer detail fetch returns all participating outlets. Actual branch/term accuracy requires real verified content.
- **AC5:** Unstructured/image-dependent content cannot auto-publish. Multiple structured candidates are supported per post. Source-specific classification, article exclusion, free-text date extraction, roundup interpretation and image-dependent extraction remain unimplemented; raw content goes to review.
- **AC6:** Real database tests exercise duplicate delivery, cross-source equivalent merging, both-source conflicts, edited-post suspension and rollback after an injected failed publication write. Prior facts are preserved and raw revisions are durable. Reconciliation of source deletion is unsupported.
- **AC7:** Tests verify anonymous rejection, valid non-admin rejection, real local admin identity, withdrawal, optimistic revision conflict detection, audit records and one-time approval of a corrected unstructured candidate. Review UI currently edits JSON records.
- **AC8–AC9:** Database tests verify source provenance, collection rollback without checkpoint advancement, independent source progress and durable processing retry after checkpoint advancement. Live hourly collection is not implemented or scheduled. Approved-file completion is a declared adapter contract, not proof of Telegram completeness.
- **AC10–AC11:** Read-time expiry is tested while ingestion is inactive. Browser tests advance the browser clock past 60 seconds and verify a new request; focus also refreshes. Initial coverage is configurable and validated against export metadata. Real historical coverage remains gated.

## Review fixes

- Review due dates now serialize in UTC; a timezone-format assertion caught the mismatch.
- Docker health checking now waits for TCP PostgreSQL readiness, avoiding the temporary initialization server race; auth/gateway restart on failure.
- Browser tests use `127.0.0.1:3100`, avoiding an unrelated application on localhost:3000. No unrelated service was modified.
- Both conflicting source claims are held for review; old processing work checks the latest post hash before publishing.
- The detail dialog fetches the full record instead of assuming viewport-limited outlets are the complete participation list.
- Admin inbox excludes superseded raw revisions. Completed review actions resolve associated candidates.

## Screenshots

- [Desktop discovery](screenshots/desktop-discovery.png)
- [Mobile discovery](screenshots/mobile-discovery.png)
- [Mobile map](screenshots/mobile-map.png)

## Remaining limitations and gates

1. No live Telegram HTTP adapter, raw-post cleanup pipeline or verified real promotions. Resolve source access/reuse and collect representative approved fixtures before implementing them.
2. MapTiler and OneMap integration code exists but live provider paths were not exercised without credentials. Local map is explicitly a schematic, not navigable geographic cartography.
3. Production performance, 10,000-offer capacity, rate limiting, provider quotas, retention, backups/restore, hosted auth, deletion detection and monitoring alerts are unverified or unfinished. NFR targets remain targets.
4. Admin inbox and offer lists currently show at most 200 records; large review queues need pagination. Overnight redemption windows need a schema extension and tests.
5. Import windows are bounded to 10 MB / 10,000 posts. Transactions commit per source export. No guarantee is made about catching edits omitted from an export.
6. The web preview uses in-memory fictional fixtures; persistent ingestion and review paths were verified in isolated test databases. The main local database starts empty.
7. Local credentials are intentionally development-only. The Compose stack is not a production deployment template.

## Final build

Final `npm run build` passed (Next.js 16.3.5). The production server started successfully at http://127.0.0.1:3100. No remote deployment occurred.

The final review also removed duplicate browser auth-client creation under React Strict Mode and prevented cancelled refresh requests from changing the loading state of a newer request.


# Follow-on verification — remaining local features

This section supersedes the initial MVP limitations where explicitly resolved.

| Check | Result |
| --- | --- |
| TypeScript + ESLint | Passed on follow-on implementation. |
| Unit/API/parser/worker tests | 30 passed. |
| PostgreSQL/Auth integration | 13 passed, isolated disposable database. |
| Browser tests | 12 passed, desktop and mobile. Includes real MapLibre viewport with synthetic tiles, visible attribution, tile-failure fallback, labelled approval form, pagination and import feedback. No automated requests reached public tile servers. |
| Live initial preview scan | 60 SG Food Deals posts from 3 pages; 80 TasteSoul posts from 4 pages. Both reached the configured 30-day cutoff; full boundary pages may contain older posts. |
| Live incremental replay | Zero new/duplicate posts, one page per source. |
| Local capacity | 100 reads at 10/sec against 10,000 offers and 20,000 outlets: p50 84 ms, p95 106 ms, max 160 ms. Service query path only, excluding HTTP/network. See load-check.json. |
| Local restore | App schema restored to a temporary database; counts and source identities/hashes matched. 140 posts, 140 revisions, 195 candidates, zero promotions/audits. See restore-check.json. Main database unchanged. |
| Visual inspection | Ordinary in-app browser view showed real Singapore OSM tiles, pins, and attribution. Desktop/mobile form screenshots inspected. |
| Follow-on production build | Passed with all pages and API routes compiled (Next.js 16.3.5). |

## Source sample findings

Inspected the 30 most recent imported posts spanning both channels. Observed source-specific merchant/title headings, date/location cues, cross-channel variants with different exclusions, selected/all-outlet claims, app-required offers, articles and product launches, expired dates, missing expiry, keycap-numbered roundups, and media-dependent conditions. Some promotional details are inconsistent enough to require human review. This sample supports conservative suggestions, not a claim that all formats or edits are covered. No real offer was automatically published.

## Follow-on regression fixes

- MapLibre's late stylesheet could override container positioning and collapse its height. A stronger scoped rule fixes it; viewport-height and attribution tests cover both layouts.
- Optional logging originally short-circuited the worker's `run()` expression. Execution now occurs independently of logging; failure/retry/stop behaviour is tested without a logger.
- Raw parser replay retires superseded candidate sections and does not revive already reviewed records.
- Roundup entries retain separate text; missing-year rollover and lists containing “today” remain unresolved instead of inventing a range.
- Curator pagination uses stable independent cursors, and candidate responses include an existing promotion even when it lies outside the current offer page.

## Current remaining limits

- 140 imported posts are available for curation. No actual participating outlet or live offer has been approved; the public preview remains in demo mode.
- Preview HTML is not a documented archive API. Deletions, image-only edits and preview-invisible messages are not detected. Active-post refresh is bounded and reports unavailable references.
- Raw suggestions never auto-publish. Complex multi-window schedules, source images and branch lists still need human verification; no OCR/AI extraction is used.
- The optional hourly worker is stopped; no recurring task, cloud scheduler, service purchase or deployment was created.
- OSM is verified for ordinary local browsing. Hosted MapTiler/OneMap, full HTTP latency, mobile network targets, retention/rate controls and hosted recovery guarantees remain unverified.

Screenshots: [desktop curator form](screenshots/desktop-curator-form.png), [mobile curator form](screenshots/mobile-curator-form.png). Earlier discovery screenshots show the initial schematic and remain historical evidence.

## Real-data-only display update
User requested removal of fictional examples. Set the active local configuration and setup/example defaults to `DEMO_MODE=false`. Fictional fixtures remain available only for explicit tests/demo mode; the visitor app reads verified ongoing records from PostgreSQL. Runtime verification after restart passed: public API HTTP 200 with `demo: false` and zero offers; the former fictional detail ID returns HTTP 404. Database contains 140 imported posts and zero published offers.


## One-time automatic approval — 16 September 2026
The user requested “auto approve for now.” A source-checked operational batch published two current offers and resolved their four channel candidates, retaining both source references per offer:
- Bari Bari Steak, 313@somerset: 15–18 September 2026, 11am–10pm. Dine-in restriction, excluded Teppan dishes, equal/lower-value second main and voucher conditions retained. Sources: channel posts 4935/4483; https://greatnewplaces.com/culinary/bari-bari-steak-somerset/; official mall hours; building coordinates from https://mapcarta.com/W52236347.
- Lucine by LUNA, 111 Somerset: 2 September–23 October 2026, Wed–Fri, dining 5pm–10pm with a 9pm last-order cutoff. Sources: channel posts 4929/4465; https://sg.everydayonsales.com/2-september-23-october-2026-lucine-by-luna-1-for-1-mains-promotion-every-wednesday-to-friday-at-tripleone-somerset/; official mall address; building coordinates from https://en.wikipedia.org/wiki/111_Somerset. The earlier August-ending campaign was not reused as current validity.

Both records use building-level coordinates with branch units displayed explicitly. Changes went through the shared schema, publication checks and transactional save, with `auto_approve_once` audit records. Public API verification returned HTTP 200, `demo: false`, two offers and two references each. This is a one-time batch, not a blanket recurring approval policy. Other records with unknown participation, missing validity or no clear promotion remain unpublished.

## Deterministic resolution follow-on

The prior “raw suggestions never auto-publish” limitation is superseded by the evidence-gated pipeline described in [deterministic pipeline verification](../deterministic-promotion-pipeline/verification.md). Only complete deterministic results can use the existing publication path. Actual inbox media/terms and unsupported merchant directories remain review blockers. See that record for current test counts, Genki provider coverage and live API limits.
