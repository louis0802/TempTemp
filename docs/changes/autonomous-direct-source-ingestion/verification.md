# Verification

Change documents: [intent](intent.md), [spec](spec.md), [design](design.md), [plan](plan.md), and [merchant onboarding](onboarding.md).

## Delivered behavior

Telegram is merchant/source discovery only. Enabled merchant adapters ingest independently, and direct candidates do not need a Telegram counterpart. Complete authoritative candidates can auto-publish; incomplete authoritative candidates enter review. Generic promotion dedupe exists only against the origin-agnostic promotions table after constructing a complete draft; direct runtime never queries legacy candidate/post/provenance tables.

Pepper Lunch is explicitly enabled; Paradise remains disabled and acquisition-partial. No revision-6 work, new merchant promotion adapter, scheduler, startup ingestion, commit or push. No direct ingest CLI was executed against production/shared data. No fresh Telegram acquisition occurred.

The additive migration creates direct health/items/revisions/artifacts/candidates/provenance independently of the legacy tables. Publication, autonomous updates, admin protections, generic exact dedupe/conflicts and direct review operate transactionally. Current provenance links the latest authoritative observation; incomplete/admin-blocked observations do not replace prior facts. Source disappearance has no lifecycle action.

## Captured evidence and observed disposition

The original 2026-09-30 Pepper adapter-foundation capture was copied byte-identically into tests/fixtures/direct-sources/pepper-captured-seven: 8 accepted responses (one listing, seven details), 749169 bytes total. Each original response hash/size is retained in capture-provenance.json and checked independently. No new promotion crawl was required.

The real disposable PostgreSQL replay observes 7 candidates, creates 7 item/revision/candidate rows and 8 artifacts, auto-publishes 0, updates 0 and queues 7 for review. Replay reports 7 unchanged with no duplicate candidates/revisions/promotions. Extracted dates are compared with original candidate dates rather than filled to improve publication counts. Acquisition readiness therefore does not automatically publish any of the seven.

Complete scenarios add explicitly labelled synthetic participating-outlet wording to captured HTML and use the captured verified directory plus mocked coordinates. Those scenarios prove autonomous publication/update paths without pretending operational campaign facts or geocoding are complete. They are never production seeds.

A single necessary structural observation of the linked official location page returned HTTPS 200, 433270 bytes. Its source-specific Singapore card/marker/navigation boundary contains 24 branch identities (9 restaurant-format branches). The reduced directory fixture retains source cards, type navigation and native marker data; original hash/size/capture metadata is recorded separately. Zero marker coordinates are ignored; existing place resolution supplies coordinates. Exact named mismatches remain unresolved.

## Checks and acceptance coverage

- Focused direct unit/adapter/transport/audit/isolation tests: 104 passed across 5 files. Covers mapper/gate completeness, missing dates/scope/participants, unsupported/contradictory validity, multi-offer/unknown issues, optional informational issues, trusted merchant/category, exact terms, publication-date isolation, stable identities/revision hashes, SSRF/DNS/size/pagination, directory proof and dependency closure (requested checks 9,14–25,39,48–55).
- Real PostgreSQL/PostGIS integration suite: 47 tests passed (28 direct + 19 existing Telegram). Each suite creates and removes its own local disposable database. Direct coverage includes additive migration/legacy column preservation/public-role denial, restricted ingest-role permissions, artifacts/replays/last_seen, content revisions, integrity/cross-source/disabled-source rejection, health failure/rollback, autonomous revisions/admin protection, generic dedupe/conflicts, mixed inbox/pagination, stale/manual/excluded review and trusted provenance (requested checks 1–13,26–38,40–47).
- Desktop/mobile Playwright direct inbox tests: 2 passed; both origin labels/links, read-only official reference, direct approval even with an existing offer, exclusion endpoint dispatch and feedback. Admin endpoints are intercepted; sign-in uses local test authentication. Screenshots were visually inspected; existing layout remains readable on both viewports. No public tiles were requested.
- Full unit suite with `npm test -- --maxWorkers=1`: 577 tests passed across 34 files (final run, 42.70 seconds).
- `npm run typecheck`: passed.
- Scoped ESLint on changed direct modules, routes, form/UI, command and tests: passed.
- Scoped Prettier: passed; `git diff --check`: passed. Original captured HTML bytes are intentionally not reformatted.
- Preservation snapshot and final file-set comparison: all 3704 files under docs/research, scripts/research, .local/source-discovery-service and next-env.d.ts matched their before-work SHA-256 hashes, with no added or removed paths. Legacy live/service/source-evidence modules and merchant-source registry retain the checked-in protected hashes. Existing next-env.d.ts modifications were not touched (requested checks 56–58).

## Repairs and practical limits

Sandbox network/listen restrictions initially blocked local database and browser checks; approved reruns completed using local services. Docker database was stopped and the local auth gateway needed a restart after service recovery. No test timeouts or assertions were relaxed.

The archived September Telegram inbox test initially returned excluded on the October wall clock. The test now supplies its historical 2026-09-16 observation date to the unchanged pipeline, retaining all outlet/evidence assertions. It also separately asserts that the same untouched capture is excluded on 2026-10-01. The legacy runtime remains byte-identical.

The old protection test froze promotion.ts byte-for-byte. This task explicitly requires its compatible direct source extension; the domain-only freeze is replaced with legacy/mixed source parsing and validation tests. All other protected hashes remain unchanged. Direct networking no longer imports the source-evidence resolver because that module transitively exposes PromotionSignal types; the direct tree owns the equivalent security primitive.

Production/shared migration application, live geocoding, operational ingestion, onboarding another merchant, scheduling and missing-offer withdrawal are outside this verification. No claim is made that the seven operational candidates are publication-complete.

## Final review

Acceptance criteria A1–A9 were checked against the implementation, captured-seven replay, synthetic complete scenarios and recorded tests. Self-review resolved the signal-type dependency, stale-crawl health overwrite, prior-processor inbox duplication and latest-revision provenance handling. Explicit selected-outlet lists resolve only exact source-named participants; selected scope without names remains review. No independent-review claim is made.

Final focused checks ran after the last source changes; final integration result is 47/47 and final full-unit result is 577/577. Desktop/mobile API-dispatch and visual checks passed 2/2. Typecheck, scoped ESLint, scoped Prettier, diff check and preservation comparison all passed. All temporary databases were removed by their test suites; migrations were not applied to shared/production application data.
