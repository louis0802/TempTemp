# Around — Singapore promotion map

A local-first implementation of the [Singapore promotion map plan](docs/changes/singapore-promotion-map/plan.md). Next.js 16 / React / TypeScript, PostgreSQL/PostGIS, Supabase Auth, and MapLibre.

**Current state:** working local discovery and curator app, with an approved structured-JSON ingestion pipeline. Live public-preview collection and conservative source-text suggestions are implemented. The default public view shows only verified ongoing database offers on a real OpenStreetMap basemap. Imported live posts enter the curator inbox until verified. No paid services or recurring jobs are needed to try it.

## Run locally

Requires Node.js 24, npm, and Docker Desktop. From this directory:

```sh
npm ci
npm run local:up
npm run local:setup
npm run db:migrate
npm run local:admin
npm run dev -- --hostname 127.0.0.1
```

Open **http://127.0.0.1:3100**. Port 3100 keeps this app separate from other local projects.

- `local:up` starts PostGIS, Supabase Auth (GoTrue), and a local auth gateway.
- `local:setup` creates `.env.local` without replacing an existing file.
- `db:migrate` applies versioned SQL migrations atomically.
- `local:admin` creates least-privilege database logins and the local administrator. Run after migrations and once auth has started. It is safe to rerun.
- Curator login at `/admin`: **admin@local.test** / **LocalReview2026!**. These credentials and Docker secrets are intentionally local-only; never use this Compose configuration for hosting.
- `npm run local:down` stops containers and preserves the database volume.

The application runs on the host; the database and authentication run in Docker. Database and auth gateway ports bind to loopback. There is no cloud account dependency for this setup. `docker/compose.yml` uses amd64 PostGIS for compatibility (emulated on Apple Silicon).

## Configuration

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE=false` | Serve real database offers by default. Explicit true enables synthetic examples; never claim real source freshness. Set `false` to serve the database. An unconfigured database returns 503 instead of demo data. |
| `BACKFILL_DAYS=30` | Configurable initial required export coverage, 1–3650 days. |
| `UNKNOWN_EXPIRY_REVIEW_DAYS=7` | Configurable due date assigned when expiry is unknown, 1–3650 days. Unknown expiry never publishes. |
| `DATABASE_URL` | Public server connection, a login in `promotion_web`. |
| `ADMIN_DATABASE_URL` | Server-only administrative connection, a login in `promotion_admin`. |
| `INGEST_DATABASE_URL` | Collector connection, a login in `promotion_ingest`. |
| `MIGRATION_DATABASE_URL` | Schema-owner connection used only for migrations. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local or hosted Supabase Auth configuration. The anon key is public; admin access additionally requires the database allowlist. |
| `NEXT_PUBLIC_MAPTILER_KEY` | Optional MapTiler browser key, restricted to application origins. Without it the map uses OpenStreetMap raster tiles with attribution. |
| `ONEMAP_TOKEN` | Optional server-only OneMap token for address search. Built-in neighbourhood search works without it. |
| `APPROVED_IMPORT_FILE` | Explicit filesystem path to an approved structured JSON export. |

Restart the application after changing environment settings. Local auth CORS and site URLs are configured for `http://127.0.0.1:3100`.

## Approved imports

Only import data you are authorised to store and reuse. The approved-file importer is separate from the public-preview collector described below; a declared export window is not proof of an entire channel archive. An export is an array of independently complete source windows:

```json
[
  {
    "source": "sgfooddeals",
    "complete": true,
    "coverageStart": "2026-08-01T00:00:00Z",
    "completeThrough": "2026-09-16T00:00:00Z",
    "posts": [
      {
        "messageId": 123,
        "publishedAt": "2026-09-15T00:00:00Z",
        "text": "Approved evidence text",
        "candidates": [
          { "key": "stable-offer-key", "promotion": {} }
        ]
      }
    ]
  }
]
```

Replace `promotion` with a complete record conforming to [the shared schema](src/domain/promotion.ts). The empty object above deliberately fails publication and enters review. Each candidate needs a stable key; a roundup can contain several candidates. Unstructured posts use `candidates: []` and enter the review inbox. Required promotion fields include:

- UUID identity, merchant, title, category (`Meals`, `Cafés`, `Drinks`, `Desserts`), benefit, description, and nonempty complete terms.
- Explicit `startDate`, `endDate` (`YYYY-MM-DD` or null); nullable ISO weekdays 1–7; nullable `{start,end}` in `HH:mm`; a readable `scheduleLabel`.
- Public-holiday exclusion flag, an explicit date list, and calendar coverage through the end date when exclusions apply. No holiday calendar is guessed. An end time earlier than the start crosses midnight. Weekdays refer to the starting day; holiday exclusion refers to the actual redemption day. The overall last valid date still ends at midnight.
- Participating outlets with UUID, branch name, address, Singapore coordinates, evidence and verification time. A coordinate alone is insufficient.
- Source links to the selected channel posts, nullable verification/review timestamps, status, and revision. Imports attach the actual imported post reference and determine publication status themselves.

All timestamps must use UTC ISO strings ending in `Z`. Publication is based on verified structured facts, **not** text heuristics or AI. Unknown/malformed fields remain in review. Curators can use labelled form fields to correct a record, approve it, dismiss a non-offer, or withdraw an existing offer; changes are audited and stale revisions are rejected.

```sh
APPROVED_IMPORT_FILE=/absolute/path/export.json npm run ingest
npm run ingest -- --retry
```

The first export must cover at least the configured backfill window. Later exports must reach back to the last successful checkpoint and have a completion time no later than the run start. Export completeness is a declared adapter contract, not something this application can prove. Each source commits independently. Edits must be included in the supplied export; deletions are not detected. The optional hourly worker is not started by local setup.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

Integration tests create a separate temporary database on **localhost:55432**, run real PostGIS/auth/transaction tests, and remove it. They require the local setup above and never truncate the main `promotions` database. Browser tests expect demo mode and local authentication, on port 3100.

See [verification.md](docs/changes/singapore-promotion-map/verification.md) for measured results, screenshots, remaining scope and production gates.

## Boundaries before a real launch

Public-preview coverage is limited to visible posts. Confirm permitted reuse, verified listings, retention, provider quotas and production budget before a real launch. Local capacity and app-schema restore checks are recorded below; hosted service guarantees remain unverified. Deployment and starting the recurring worker remain separate actions.


## Live public-preview collection

```sh
npm run ingest -- --live
```

This fetches only the two selected public previews, follows backward pagination to the configured cutoff, retains a five-minute overlap, and rechecks accessible source posts linked to published offers. `PREVIEW_MAX_PAGES` defaults to 60 per source (1–100). Requests use timeouts, bounded response sizes, one-second pacing and bounded retries. An inaccessible page or incomplete catch-up leaves that source's checkpoint unchanged; the other source proceeds independently.

Preview HTML is not a documented full-history feed. The collector does not detect deletions, image-only edits or posts the preview never exposes. Media-dependent conditions and ambiguous dates/outlets remain in review. A 30-day launch scan may include older messages from its boundary page.

The first local run stored 140 posts, and a second incremental run stored zero duplicates. Review them at `/admin` with the local account. Source-specific suggestions preserve conditions, recognise channel headers, suggest explicit/source-relative dates, and separate numbered roundup entries. Inferred years or start dates are labelled for verification. No AI or OCR is used.

## Optional hourly worker

```sh
npm run worker
```

Runs a collection immediately, then at hourly intervals without overlapping executions in that process. Failures are logged and retried on the next interval. Stop with Ctrl-C. **This worker is implemented but has not been left running.** No operating-system cron, cloud scheduler or Codex automation was created.

## Curator workflow

1. Sign in at `/admin`; import an approved JSON export or run live collection from the CLI.
2. Open a review candidate and check the original post. Suggestions are not verified facts.
3. Fill the merchant, benefit, full terms, dates, schedule and participating branches. Record branch evidence and exact coordinates; OneMap token configuration remains optional and unavailable locally.
4. Confirm the verification checkbox, give an audit reason, then approve. Dismiss articles or non-offers with a reason.
5. Set `DEMO_MODE=false` and restart to serve approved database offers. The database map stays empty until a valid ongoing offer is approved. Fictional fixtures are never copied into the live database.

Both lists have load-more controls; current source health shows review and processing backlogs.

## Map modes and verification

`NEXT_PUBLIC_MAP_MODE=auto` (default) uses MapTiler when keyed, otherwise keyless OpenStreetMap raster tiles. `schematic` explicitly selects the offline preview. Provider failure falls back to the schematic while retaining the list. OpenStreetMap attribution is always visible; normal browser caching/referrer behaviour is retained. No bulk downloads, offline map archives or tile prefetch are implemented. Automated tests intercept all public tile requests. Public OSM tiles have best-effort availability and must follow [the tile policy](https://operations.osmfoundation.org/policies/tiles/); choose an appropriate provider for production traffic.

```sh
npm run test:load
npm run test:restore
```

These commands are fixed to the local Docker database. The load check creates/removes a temporary database with 10,000 synthetic offers and 20,000 outlets, then measures 100 service-query requests at 10 per second (not full HTTP latency). The restore drill backs up the local **app schema only** in memory, restores it into a temporary database, compares counts and source hashes, then removes that temporary database. It never overwrites the working database. Neither command establishes hosted availability or recovery guarantees.

## Real-data display
The local app now runs with `DEMO_MODE=false`, as requested. Unverified imported posts remain in the curator inbox and cannot appear as real offers. Demo fixtures are retained only for automated tests and explicit demo mode.

## Deterministic promotion resolution

Raw source ingestion now runs `src/ingestion/resolution/pipeline.ts` before candidate persistence. Date/scope parsing, participation, directory enumeration, place enrichment and eligibility are separate services. Complete verified results use the existing transactional publication/reconciliation path. Incomplete results retain `resolutionAudit` in candidate data for the existing review endpoint; clearly excluded results retain their audit with status `excluded`.

The first official directory adapter is [Genki Sushi Singapore](https://www.genkisushi.com.sg/locate-us/). Merchants without an adapter now fall back to Google Places: explicitly named branches can resolve and pass eligibility; merchant-wide searches retain discovered branches but cannot alone establish complete chain coverage. `GOOGLE_PLACES_API_KEY` enables Google Places (New) identity/address enrichment. OneMap exact postal-code lookup is the fallback (`ONEMAP_TOKEN` when required). Credentials stay server-side. Lookup failures never authorize partial publication. Google and OneMap coordinates are conservatively labelled building-level.

Directory snapshots, source pages, branch queries, Google results and OneMap responses use bounded one-hour process caches with request coalescing, timestamps, URLs and source hashes. Restarting a process discards the cache and causes fresh verification. Stable physical-address/coordinate UUIDs reuse branch identity across promotions; changed locations receive different IDs, with the existing database identity guard retained.

Unknown expiry, ambiguous date/term ownership, unsupported participation, inaccessible linked/media terms and complex schedules stay in review. Outlet research can still proceed independently of unresolved terms. An optional injected LLM extractor accepts only Zod-validated source excerpts; it cannot certify facts or approve candidates. No model provider is enabled by default.

Parser upgrades preserve revisions containing already reviewed/published/excluded raw candidates; they do not recreate those offers under new section keys. Existing pending raw candidates can be reprocessed by the new parser version during the next ordinary ingestion run. This does not alter collection checkpoints to apply review decisions, and `review-decisions.json` remains unsupported as an import format.

Design, acceptance criteria and verification: [deterministic pipeline change](docs/changes/deterministic-promotion-pipeline/plan.md). Tests use the captured official locator and mocked API responses; synthetic coordinates are never operational seeds.

### Google lookup for other merchants

Set the server-only `GOOGLE_PLACES_API_KEY` in `.env.local` and restart the app/ingestion process. The default pipeline uses Google Text Search for merchants without directory adapters. Named branch queries include the merchant, location and unit; only unique operating Singapore matches pass. API-provided coordinates are reused, with distinct source participation and Google existence/location evidence. OneMap remains available for enriching directory-backed branches. Google errors or missing credentials are recorded explicitly in the candidate audit.

Search follows up to three result pages, deduplicates place IDs and caches results for one hour. Exhausting search results does not prove complete merchant enumeration. Selected-outlet offers still require the participation list before Google lookup. Parser version v5 makes pending unreviewed source revisions eligible for the new processing path on the next ingestion run; completed raw revisions remain protected. No live Google lookup has been verified in this workspace because the key is absent.
