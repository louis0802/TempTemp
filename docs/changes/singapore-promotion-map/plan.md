# Plan: Singapore promotion map

Status: Implementation in progress. Inputs: [Intent](intent.md), [Specification](spec.md), [Design](design.md).

## Progress
- [x] Inspect project: empty directory, no existing stack or commands.
- [x] Record user-selected sources: SG Food Deals and TasteSoul.
- [x] Inspect public previews and identify representative content patterns.
- [x] Close public-access clarification: both channels can be viewed without login or administrator access; the earlier Telegram Web login obstacle does not apply to public previews.
- [x] Save four consistent planning drafts.
- [x] Record hourly incremental checks, database-backed map publication, and an ongoing-promotions-first launch.
- [x] Select and document a concrete technology baseline, API boundaries, repository layout, and deployment topology.
- [ ] Resolve ingestion feasibility and consequential product decisions.
- [x] Implement and verify the local application, Docker services and approved structured-import path.
- [ ] Complete live Telegram adapter, source-specific extraction and verified pilot after source access is resolved.

## 1. Validate sources and rules
Public viewing is verified and the access clarification is closed. Select an appropriate automated collection/reuse route. Investigate channel-owner cooperation only if choosing a channel bot; administrator access is not a prerequisite for public viewing. Verify external channel IDs before using the earlier numeric references.

Review approximately 30 representative posts across both sources, including edited posts, roundups, image-dependent conditions, missing dates, all-outlet offers, and selected-outlet offers. The completed preview inspection is preliminary, not this full validation sample.

Hourly checking and ongoing-only default map scope are decided. Set initial historical scan depth and unknown-expiry review policy. Confirm a current TasteSoul sample.

Deliverable: automated ingestion decision and sample classification/outlet-resolution results. Covers AC2–AC6 and AC8.

## 2. Complete implementation design
Use the concrete technology baseline and repository layout in design.md: Next.js/TypeScript, MapLibre + MapTiler, OneMap, Supabase PostgreSQL/PostGIS/Auth, Node fetch + Cheerio + Zod cleanup, and Render web/hourly job. Validate the preview adapter before implementing dependent ingestion. Resolve budget, provider credentials/regions, and backfill depth. Scaffold the documented npm scripts and encode API schemas; verify actual installed versions and commands.

Deliverable: implementation-ready design with no consequential access or product decisions left implicit.

## 3. Build the ongoing-promotion MVP
Create merchant/outlet/offer storage, protected review operations for exceptions, validated automatic publication, and published-offer reads. Build mobile map/list discovery, filters, details, and directions using curated examples. Enforce validity and publication rules on the server.

Affected components: database/schema, public API, administration/authentication, map/list frontend, offer detail view. Planned file locations are src/app, src/components/map, src/server, src/domain, and supabase/migrations, as detailed in design.md.

Verification: AC1–AC7, including narrow mobile layouts, map/list consistency, denied geolocation, unauthorised administrator actions, multiple branches, and expiry boundaries.

### Cleanup implementation and verification
Implement the [incoming-data cleanup pipeline](design.md#6-deep-dives) in this order: source revisions and processing records; source-specific normalisation/classification; structured fact extraction; date/term validation; merchant/outlet matching; duplicate reconciliation; transactional publication and review routing.

Before enabling automatic publication, run meaningful fixtures for lossless conditions (including “up to” and “++”), relative dates, year rollover, holiday exclusions, missing expiry, ambiguous branches, roundup revisions, image-dependent terms, cross-source conflicts, protected administrator corrections, parser-version replay, and failed transactional writes. Verify that invalid records remain off the public API and that valid records retain provenance. These are planned checks, not executed tests.

## 4. Integrate one source, then the second
Implement the validated source adapter and import review flow, then add the second source. Add source-post identities, cross-source offer linking, retries, edit handling, and visible sync health. Automatically publish validated ongoing offers; send ambiguous or conflicting records to review. Implement independent hourly source runs, durable processing work, checkpoint advancement after successful persistence, and a one-minute map refresh default.

Verification: AC5, AC6, AC8–AC11. Exercise duplicate delivery, identical message timestamps, multi-page catch-up after downtime, partial import failure without checkpoint advancement, independent source failure, extraction retry after checkpoint advancement, edited conditions, source conflicts, initial ongoing-offer selection, automatic map refresh, expiry during collector outage, and traceable source links. Do not claim deletion detection unless supported by the chosen route.

## 5. Pilot and final review
Exercise the end-to-end journey with verified Singapore listings. Record accuracy, freshness, review effort, and user feedback. Review the diff against all acceptance criteria; run the repository's actual relevant checks and inspect the UI. Resolve actionable findings and synchronise these documents.

Checks and limitations are recorded in [verification.md](verification.md). Unit/API, PostgreSQL integration, browser and build checks have run; live-source and production checks remain gated. Deployment and recurring jobs are separate actions requiring scope and authorisation; this plan does not create them.

## Risks and dependencies
- Automated collection feasibility and permitted reuse remain unverified despite confirmed public viewing: resolve before adapter implementation.
- Branch ambiguity can produce misleading pins: verify before publication.
- Missing dates and old posts can look current: preserve uncertainty and source timestamps.
- Promotional conditions may live in images or linked pages: route incomplete offers to review.
- Manual review may become costly: measure effort before expanding source coverage.

## System-design verification checkpoint
The design follows requirements → entities → interfaces → data flow → high-level architecture → deep dives. Verify AC1–AC11 and proposed NFR1–NFR7 together: load-test the API and mobile page at the stated capacity envelope; time hourly import and map visibility; inject collection/publication failures; test private-data and admin access; simulate tile/geocoding outages; inspect run-health reporting; and perform a backup restore drill before committing recovery targets. Record actual results and any unsupported targets without treating planning numbers as measured performance.

The diagram, API boundaries and deep dives are documentation only. Provider budget, retention, backup plan and source adapter feasibility remain deployment/design gates.

## Authorised build sequence
1. Scaffold app, commands, environment examples and private database migration.
2. Implement shared validation/SGT validity, demo repository and geographic public APIs.
3. Implement map/list/details/search/location and protected review/source health UI.
4. Implement approved JSON ingestion, durable revisions, independent checkpoints and review-safe publication.
5. Run unit, database integration where a local database is available, browser, type/lint/build checks; review results and document blocked live checks.

Source access remains unresolved; no live preview adapter will be implemented without resolving the documented prerequisite. Provider credentials are absent. This gates live integration and pilot verification, not independent implementation.

## Delivery progress — 16 September 2026
- [x] Next.js/TypeScript scaffold, readable formatting, configuration, setup docs and local Docker database/authentication.
- [x] Shared Zod contracts, Singapore-time validity, publication gates and demo/public APIs.
- [x] Responsive map/list discovery, categories, availability, neighbourhood search, geolocation fallback, full detail records and source freshness.
- [x] Server-verified admin identity, allowlist, review inbox, corrections/approval/withdrawal, stale-write conflict detection and audit.
- [x] Bounded approved JSON imports, configurable history/review intervals, per-source transactions/checkpoints, revision handling, cross-source reconciliation and durable retry.
- [x] Unit/API and real PostgreSQL/auth integration checks; desktop/mobile browser checks and screenshot review.
- [ ] Live source feasibility/reuse validation, 30-post source sample, source-specific extraction and complete incremental/edit coverage.
- [ ] Live map/geocoder checks, 10k-offer load test, verified-listing pilot, hosted budget/backup/restore drill.

Material decisions: Docker requested by user; BACKFILL_DAYS and UNKNOWN_EXPIRY_REVIEW_DAYS are configurable. Approved structured JSON replaces the unvalidated preview adapter for local work only. Raw text stays in review. Nothing is deployed or scheduled. The local implementation does not complete the original live-channel collection objective; remaining gates are explicit.

## Follow-on implementation plan
- [x] F1: keyless real basemap, robust lifecycle/viewport sync, attribution and offline fallback; intercept public tiles during tests.
- [x] F2/F3: structured curator editor, audited dismissal, independent pagination and source backlog counts.
- [x] F4: overnight validity rules with weekday/holiday/expiry boundary tests.
- [x] F5/F6: conservative raw extraction suggestions and protected approved-export upload; preserve existing durable/review gates.
- [x] Verify unit/API, isolated PostGIS/auth integration and desktop/mobile browser workflows; build, inspect screenshots and update verification.
- [x] Follow user instruction to proceed with the public-preview route; bounded live import and duplicate-free replay verified. No deployment or recurring schedule is enabled.

- [x] F7: user requested proceeding with live public-preview collector; validate live page structure, implement bounded pagination and active-post refresh, test failures/replay with synthetic HTML and a bounded live run. This replaces the prior wait-for-source-route implementation gate; publisher cooperation is not asserted.


## Follow-on verification and remaining scope
- [x] 30 unit/API/parser/worker tests, 13 isolated PostgreSQL/auth tests, 12 desktop/mobile browser tests.
- [x] Local 10k-offer/20k-outlet capacity check: query p95 106 ms; app-schema restore drill with matching record counts and source hashes.
- [x] Inspect real basemap plus desktop/mobile curator screenshots; fix collapsed map height and optional-logger worker execution bug, with regression tests.
- [ ] Verify actual participating outlets and approve real ongoing offers. The local visitor page intentionally stays in demo mode until curation is complete.
- [ ] Hosted deployment, provider quotas, production retention/rate controls, full HTTP/mobile performance targets and hosted backup guarantees. No paid provider or deployment was configured.
- [ ] Enable recurring execution only when requested; the hourly worker command is available but stopped.

The former source-route gate is superseded by the user's explicit instruction to proceed. The live adapter covers public-preview-visible messages and never asserts full Telegram archive/deletion/media-edit coverage. OneMap and hosted MapTiler remain untested without credentials; keyless OSM is verified for local map browsing.

### Real-data-only display
User requested real data only. Disabled active demo mode and changed setup defaults to database mode. Imported unverified candidates remain off the public map; no approval status is bypassed.

### One-time approval batch
Completed the user-requested auto-approval operation for two source-checked ongoing offers, resolving four duplicate candidates. Verified both appear in the real-data public API. Unknown outlets/validity remain in review; no blanket recurring policy was enabled. Details and evidence are in verification.md.
