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
