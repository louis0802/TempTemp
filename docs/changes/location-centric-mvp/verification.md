# Verification — location-centric MVP

Date: 2026-09-22. Baseline verified before edits: branch `feat/production-evidence-coverage`, HEAD `f1b86be`; only `next-env.d.ts` was dirty.

## Delivered behavior

Both MapLibre and schematic render the shared six-decimal anchor grouping. Place IDs also union matching rows; names never merge venues. Each group counts unique promotion IDs, preserves original outlet variants, opens a location dialog, and allows selection of each exact promotion. List selection highlights every returned group for that promotion. One native dialog handles both views, Escape, focus restoration, and mobile layout.

The server independently gates explicit `live`, `live_with_expired`, and `corpus` modes. Only corpus bypasses viewport bounds. Default API responses redact the raw description and its duplicate terms in copies, without modifying stored records. The development opt-in reveals one labelled raw source section. Structured information, location provenance, directions and Telegram links remain.

## Counts and concrete anchor

Counts are deterministic at **2026-09-22 12:00 Singapore time**, using the committed artifact. See [counts.json](counts.json).

| Bounds | Active promotions | Active groups | Active + expired promotions | Active + expired groups |
| --- | ---: | ---: | ---: | ---: |
| Initial `[103.813, 1.265, 103.872, 1.315]` | 11 | 24 | 66 | 194 |
| All Singapore `[103.6, 1.15, 104.1, 1.5]` | 12 | 108 | 83 | 649 |

Actual map fitting can expand the returned viewport according to screen aspect ratio, so rendered totals can vary after the initial bounds event. Expired mode retains the same filtering rules.

Suntec City: `ChIJ20X__K4Z2jERRE8GRs-d8HE`, `1.2950324, 103.8583015`, `3 Temasek Blvd, Singapore 038983`. One pin, **2 promotions**:
- `bcdf6cb5-fc27-579d-a579-68f8f6b93ab2`: Morganfield’s — 1-for-1 Angus Ribeye Steak (U.P. $42.90++); source `Suntec City, 01-645`.
- `c37e7902-2e92-5d6b-ab62-e6b77b44147e`: Morganfield's — 1-for-1 Angus Ribeye Steak; source `Suntec City outlet`.

Both ended 2026-08-30 and are absent from live mode. Nearby Genki Sushi and Coffee Bean anchors remain separate because their coordinates and Place IDs differ. At wide zoom, distinct pins can overlap; broad clustering is explicitly excluded. Multi-promotion pins have drawing priority and focused pins rise above neighbours. Direct pointer selection is tested on a shared-anchor fixture; keyboard selection tests the dense real corpus.

## Requested checks

| Command | Result |
| --- | --- |
| `npm test` | 12 files, 257 tests passed |
| `npm run test:integration` | 19 tests passed against isolated local test database |
| `npm run test:corpus` | 3 files, 4 tests passed; 136 sources, 181 offers, 0 failed |
| `npm run analyze:mvp` | Passed; 200 records, 86 map-ready, 180 benchmark candidates; existing 34 differences, 1 extra, 0 unmatched unchanged |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed in `/tmp/promotion-location-build`, a copy of final working files with Node 24 and cloned installed dependencies |
| `npx playwright test tests/e2e/mvp.spec.ts` | 24 passed across desktop and mobile on port 3100 |
| `git diff --check` | Passed |

Build emits a warning on the existing dynamic `MVP_DATA_PATH` filesystem loader: whole-project tracing. No loader or deployment behavior was changed to suppress it.

Initial sandbox attempts could not bind port 3100/connect to local Docker; authorized reruns passed. The existing localhost dev server rejected 127.0.0.1 dev resources in this Next version; `next.config.ts` now allows only the two loopback names. Initial browser assertions also caught a stale raw-body expectation, obscured neighbouring anchors, and Escape focus restoration; those were addressed and the full requested suite passed.

## Development browser matrix

Each URL below passed on desktop and mobile. Tests intercept public tile traffic with the existing fixture; fallback tests abort tiles. One ordinary interactive localhost visit additionally checked actual live tiles and the Suntec panel. Desktop and mobile screenshots were visually inspected.

| URL (host `http://localhost:3100`; automated host `127.0.0.1:3100`) | Expired ready | Raw body |
| --- | --- | --- |
| `/mvp` | Hidden | Hidden |
| `/mvp?includeExpired=true` | Included | Hidden |
| `/mvp?showSourceText=true` | Hidden | One debug section |
| `/mvp?includeExpired=true&showSourceText=true` | Included | One debug section |
| `/corpus` | Full 200-record corpus | Hidden |
| `/corpus?showSourceText=true` | Full 200-record corpus | One debug section |

Assertions cover absent raw `.source-text`, absence of duplicate “Before you go” raw terms, retained View source links, both Morganfield titles, each correct detail, source unit wording, dot/count pin text, selection highlighting, fallback and focus restoration. Server tests additionally assert empty description/terms by default, unchanged stored values, fixed-date eligibility, and viewport clipping.

## Additional shared-component regression checks

Ran the existing map/discovery specs beyond the requested suite because Explorer and PromotionMap are shared with `/`. On the existing development server (`DEMO_MODE=false`), the two admin sign-in checks passed and six discovery/map checks failed their six-demo-offer count (one live record was served). Re-ran against the isolated production copy with `DEMO_MODE=true`: all six map/discovery/filter/refresh checks passed; the two admin sign-in checks reported “Failed to fetch” from that temporary production environment. Authentication was not modified or relaxed. These supplemental runs are recorded separately from the fully passing requested MVP suite.

Temporary verification infrastructure: final production smoke used loopback 3101; demo regression configuration changed only the temporary copy's test base URL and used the required Node 24 explicitly. The original repository's Playwright target remains port 3100.

## Actual production verification

Ran `next start` from the final build copy on loopback port 3101. Compared `/api/mvp/promotions` with `?includeExpired=true&showSourceText=true&view=corpus`: responses were identical, with 12 active physical records, no raw description/duplicate terms, and retained source links. `/corpus` and `/corpus?showSourceText=true` both returned 404. Desktop and mobile browsers opened `/mvp?includeExpired=true&showSourceText=true`: raw section absent, View source present. Unit tests also exercise both list and detail route gates and reject Morganfield detail in production.

The development flag is an inspection feature, not an identity boundary if a developer exposes the dev server to other people.

## Preservation and review

Self-reviewed the diff against all 23 acceptance items. No independent review was requested. No ingestion, Google fallback, parsing, publication, source artifacts, lifecycle dates, or corpus/conformance expectations changed. `scripts/audit-mvp-locations.ts` only names the new explicit `live` serving mode.

`next-env.d.ts` was copied to a byte snapshot before work and compared unchanged after development, tests and builds. Builds ran in a temporary copy specifically to avoid Next overwriting the user's file. It is excluded from the commit. No push or remote changes.

## Task file inventory

- `next.config.ts`
- `scripts/audit-mvp-locations.ts`
- `src/app/api/mvp/promotions/route.ts`
- `src/app/api/mvp/promotions/[id]/route.ts`
- `src/app/mvp/page.tsx`
- `src/app/corpus/page.tsx`
- `src/app/globals.css`
- `src/components/Explorer.tsx`
- `src/components/map/PromotionMap.tsx`
- `src/domain/map-locations.ts`
- `src/domain/mvp.ts`
- `src/server/mvp.ts`
- `tests/map-locations.test.ts`
- `tests/mvp-preview.test.ts`
- `tests/mvp.test.ts`
- `tests/e2e/mvp.spec.ts`
- `docs/changes/location-centric-mvp/{intent,spec,design,plan,verification}.md`
- `docs/changes/location-centric-mvp/counts.json`
