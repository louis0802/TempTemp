<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project commands and boundaries
- Node 24 and npm; use `npm ci`, `npm run dev` (port 3100), `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.
- Local services: `npm run local:up`, `npm run local:setup`, `npm run db:migrate`, `npm run local:admin`. Docker is required for integration checks.
- `npm run test:integration` creates and removes an isolated local test database. Never redirect it to hosted data.
- `npm run test:e2e` targets `http://127.0.0.1:3100`; localhost:3000 can belong to another project. Assert the app heading before any browser mutations.
- Read `docs/changes/singapore-promotion-map/verification.md` for actual coverage and gates. Live preview collection and conservative review suggestions are implemented; no raw post can publish without verified facts/outlets.
- Demo data is fictional. Keep it labelled, never seed it as verified production promotions.
- Keep database credentials in server modules. Use the shared publication rules and transactional save path; do not publish directly from text parsing.

- Public tile requests must be intercepted in automated browser tests. Test real MapLibre layout with `tests/fixtures/tile.png`; use ordinary interactive browsing for a single live visual check.
- `npm run worker` starts recurring collection; do not leave it running without explicit scheduling scope. Local setup does not start it.
- `npm run test:load` and `npm run test:restore` use temporary local databases; do not retarget them to hosted systems.

- Deterministic raw resolution lives in `src/ingestion/resolution/`; read `docs/changes/deterministic-promotion-pipeline/verification.md` for provider coverage and limits. Extend merchant enumeration separately from place enrichment; Google results cannot establish a complete branch list or promotion participation.
- Keep external lookups outside publication transactions, then lock/recheck candidate and source state before saving. Parser replay must preserve completed reviewer decisions. Resolver tests use captured locator HTML and mocked coordinates, never live tiles or operational seeds.

- `npm test` includes focused units and original-text golden cases, but excludes the 136-source corpus. Run `npm run test:corpus` separately; it prints deterministic audit/disposition metrics. See `docs/changes/autonomous-ingestion/verification.md` for v7 evidence and controlled-provider limits.
- Only the exact feed-export media marker is informational; actual media-dependent facts and unknown issue codes still block. When parsing roundup footers, strip only recognized channel metadata, never arbitrary text after an @handle.

- Production directory coverage: `npm run analyze:evidence` regenerates conservative blocker reports; `npm run compare:evidence` performs a separately labelled captured-provider comparison. Papi's Tacos requires its official count, cards and navigation to agree. Preserve source address typos; never fuzzy-match them into participation or change physical outlet identity. See `docs/changes/production-evidence-coverage/verification.md`.

- MVP ingestion is separate from strict publication: `npm run build:mvp-data` replays locally cached Google responses; `npm run build:mvp-data -- --google` refreshes missing/stale responses with the configured server key. No cache means explicit needs_location, never synthetic coordinates. `.local/mvp-google/` is ignored.
- `npm run analyze:mvp` writes benchmark mapping; `npm run test:corpus` includes the reviewed 180-candidate MVP baseline. Do not regenerate `tests/corpus/mvp-conformance-reviewed.json` just to pass tests; review source-backed differences.
- `/mvp` serves active MVP data; `/corpus` shows every curated record (including incomplete, online-only, expired and upcoming) only in development. `PROMOTION_DATA_SOURCE=mvp` selects MVP on `/`. See `docs/changes/curated-mvp-retention/verification.md` for current metrics, commands and limits. Curated inclusion never relaxes strict publication or live physical-feed eligibility.

- MVP source-location fallback is explicitly isolated in `GoogleOutletDiscovery.discoverMvp`; strict `discover` never uses it. Preserve source labels separately from Google formatted addresses and retain `coordinateBasis` plus per-location audit, including failures on partially ready records. See `docs/changes/mvp-source-location/verification.md`; regenerate the frozen-28 ledger with `node --import tsx scripts/audit-mvp-locations.ts`. Typed fallback cache keys include the field mask; live transport failures must retain the prior artifact.

- Research-only source monitoring uses `npm run research:monitor:preflight`, `npm run research:monitor`, `npm run research:monitor:status`, and `npm run research:monitor:metrics`. It writes only to `SOURCE_MONITOR_DATA_DIR` (default ignored `.local/source-discovery-service/`), never to the production database or ingestion worker. See `docs/changes/persistent-source-discovery-service/runbook.md` for restart, review, and seal handling. Do not leave the continuous process running unless local observation is intended.

- Direct source DB ingestion uses `npm run direct-sources:ingest -- --source pepper_lunch_sg` after the additive direct-source migration. Preview stays DB-free; production ingestion has no `--all`, scheduler, or startup hook. Use captured fixtures and disposable local databases for checks. See `docs/changes/autonomous-direct-source-ingestion/verification.md` and `onboarding.md` for gates and operation.
