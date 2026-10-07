# Design — official-source promotion map

Inputs: [intent.md](intent.md), [spec.md](spec.md). Paths are relative to the repository root. Existing modules are reused where noted; "new" marks code that does not exist yet.

## 1. Flow

```text
merchant registry ──► daily job ──► acquire (web | social) ──► source snapshot (text, images, postedAt)
                                                                      │
                                                                      ▼
                                       PromotionReader (LLM, quoted facts, kind)
                                                                      │
                                                                      ▼
            verify quotes ─► compute dates/schedule ─► resolve outlets ─► lifecycle ─► map artifact
                                                                                        │
                                                                                        ▼
                                                                          /api + Explorer (single path)
```

Evaluation runs the same pipeline output against the Telegram answer key (§9). Telegram is never fetched.

## 2. Merchant registry (new)

- **Location:** `data/merchant-registry.json`, versioned. It replaces the closed `sourceIdSchema` enum (`src/ingestion/direct-sources/types.ts:4`) as the list of what to fetch.
- **Shape:** `{ merchantId, name, operator?, sources: [{ sourceId, type: "website"|"instagram"|"facebook"|"tiktok", url, ownershipSignals[], discoveredBy, acceptedAt, status }] }`.
- **Seed:** one script reads [merchants.json](../../research/merchants.json), [social-source-inventory.json](../../research/social-source-inventory.json) and the existing 11 registry definitions (`src/ingestion/direct-sources/registry.ts:19`). It drops platform entries (Grab/GrabFood, foodpanda, `kris_plus_sg`, banks, publishers) per spec S4.
- **Discovery:** `scripts/discover-merchant-sources.ts` (new). It calls the reader provider with a search tool and applies the S3 signal checks in code. The LLM proposes; code accepts.
- **Hand-written adapters:** the existing `DirectSourceAdapter` implementations (`adapter.ts:14`) remain as optional precise extractors. A source with an adapter uses it; every other source uses the generic reader.

## 3. Acquisition

- **Website:** `BoundedDirectFetch` (`src/ingestion/direct-sources/fetch.ts:143`) with `validateTarget` (`network-target.ts:43`). A new generic listing step finds offer links on a promotion page by asking the reader for the offer URLs on that page. The URLs are then checked against the allowed hosts.
- **Social:** a `SocialAcquirer` interface (new), whose implementation is chosen in spec O1:

  ```ts
  interface SocialAcquirer {
    listRecentPosts(account: SourceRef, since: string): Promise<{ status: "complete"|"partial"|"failed"; posts: SourcePost[] }>;
  }
  ```

- **Snapshot:** `SourcePost = { url, text, images: {hash, mime, bytes}[], postedAt?, postedAtBasis?, fetchedAt, mode: "daily"|"backfill" }`. Snapshots are stored by content hash. Images are capped at 10 per post and 5 MB each.
- **Backfill (spec S5b):** `listRecentPosts(account, since: "2026-08-01")` for social sources. Websites use the O3 method (archive snapshots or none). Backfill snapshots never update current-sighting state.
- **JS-only sites:** a headless renderer only if O4 approves it; otherwise the site is marked `js_only`.

## 4. Reader (LLM)

- **Interface:** a new `PromotionReader`. It generalises `PromotionNlpProvider` (`src/ingestion/promotion-nlp/types.ts:24`) to text plus images:

  ```ts
  interface PromotionReader {
    readonly metadata: { provider: string; model: string; promptVersion: string; schemaVersion: string };
    read(input: { url: string; text: string; images: ImageRef[]; postedAt?: string }): Promise<unknown>;
  }
  ```

- **Output:** validated by a zod schema derived from `dateOnlyOutputSchema` (`src/ingestion/promotion-nlp/date-only-profile.ts:23`). It is extended with:
  - `kind`;
  - `limitedTime` and `openEndedWording`, each quoted;
  - roles on date phrases;
  - schedule phrases;
  - `evidence: {kind:"text"} | {kind:"image", index}` on every fact.
- **Quote check:** text quotes must match the source verbatim after whitespace normalisation. Failing facts are dropped and logged. The output is otherwise untrusted.
- **Providers:**
  - `SubagentReader` (development) writes a task file, waits for a subagent's response file, then validates it. It follows the ledger pattern of `scripts/research/promotion-nlp-date-only-fresh-evaluation.ts`. The model is the cheapest available (Haiku 4.5 in Claude Code).
  - `HttpReader` (owner's model) is configured by `READER_BASE_URL`, `READER_API_KEY`, `READER_MODEL` and `READER_PROTOCOL` (`openai` | `anthropic`). Images are sent as base64 or URLs according to the protocol. It reuses timeout and token settings from `openai-provider.ts:56`.
- **Prompt:** one versioned prompt file. Prompt and schema versions are recorded on every result.

## 5. Computing (code)

- **Dates:** reuse the arithmetic in `normalizeMvpDates` (`src/ingestion/mvp/date-policy.ts:215`), but feed it the reader's date phrases with their roles instead of regex-detected fragments. A new wrapper, `computeOfferDates(phrases, anchor)`, maps reader roles onto the existing fragment roles. This fixes misreadings such as "2nd Venti" being taken as a date, because the reader decides what is a date.
- **Schedule:** `parseMvpSchedule` (`schedule.ts:141`) runs on each quoted schedule phrase, not the whole text, so prices such as "$200" are never parsed as schedules. `evaluateMvpSchedule` (`:296`) drives the live status.
- **Holidays:** `MOM_HOLIDAY_CALENDAR` / `holidayKindsOn` (`holiday-calendar.ts:99,108`).
- **Validity:** `buildOfferPolicy` (`policy.ts:16`) is extended so that an undated offer becomes `open_ended` even without a weekly pattern (S16).

## 6. Outlets

- **Resolver:** reuse `resolveMvpOutlets` (`src/ingestion/mvp/outlets.ts:101`), with `ScopeResolution` built from the reader's scope and its included and excluded phrases.
- **Behaviour change:** an unmatched exclusion no longer blocks the offer. It is recorded in `unmatchedExclusions` and the remaining outlets are mapped (S20).
- **Official directories:** `capturedMvpDirectoryProviders` (`official-directories.ts:15`) currently covers 3 merchants. Directory discovery reuses the S3 mechanism, and Google fallback needs the server key and its cache.

## 7. Lifecycle

- **Reuse:** `evaluateMvpLifecycle` (`src/ingestion/mvp/lifecycle.ts:6`) and `applyMvpSourceSnapshot` (`source-observations/index.ts:171`).
- **Capabilities:** the source capability table (`MVP_SOURCE_CAPABILITIES`, `:414`) currently marks both entries `historical_archive`. It gains a `current_list` capability, which applies to registry website listing pages whose enumeration is complete (spec S22a).
- **Social sources:** never a current list. An undated social offer is active for M days from its anchor (O6, default 30) and is extended only by a new post of the same offer.
- **Matching a re-post:** same merchant + equivalent benefit, proposed by the reader and confirmed by code on normalised benefit text.
- **New code:** an `open_ended` offer without a weekly pattern, the M-day social expiry and the 7-day `limitedTime` threshold are all additions to `evaluateMvpLifecycle`.

## 8. Storage and serving

- **Storage (proposed answer to O5):** file artifacts, written atomically with `writeMvpSnapshotAtomic` (`source-observations/index.ts:441`).
  - `.local/pipeline/snapshots/` holds fetched sources.
  - `.local/pipeline/readings/` holds reader outputs, keyed by snapshot hash plus prompt and model.
  - `data/promotions-official.json` holds the map artifact.
- **Re-runs:** readings are cached by hash, so a re-run with the same snapshot and model makes no LLM call.
- **Serving:** `readMvpData` (`src/server/mvp.ts:38`) loads the official artifact. The `MVP_OFFER_POLICY` switch (`mvpOfferPolicyMode`, `:26`) and the `PROMOTION_DATA_SOURCE` switch (`src/app/page.tsx:3`) are removed. `/`, `/mvp` and the API serve that one artifact; `/corpus` stays development-only.
- **UI:** in `OfferPolicyDetails`, drop the public audit rows ("First observed", date-fragment quotes) and the `mayShowSourceText` restriction. The official source text is always shown (spec S24).
- **Database:** the direct-source tables (`supabase/migrations/002_direct_sources.sql`) are left untouched. Moving to the database is a later change, if needed.

## 9. Evaluation

- `scripts/build-answer-key.ts` (new) classifies the 200 pinned records (spec S26) and stores the kinds and quotes.
  - It uses a different model or prompt version from the pipeline reader, so the reader cannot grade itself.
  - A person reviews each `not_promotion` before it leaves the denominator; verdicts are stored.
- `scripts/evaluate-coverage.ts` (new):
  1. Matches answer-key promotions to mapped offers (same merchant, equivalent benefit, overlapping validity). The LLM proposes matches; the code records them.
  2. Assigns one S28 reason to each miss.
  3. Writes a report per source type.
- `scripts/sample-spot-check.ts` (new) draws a seeded random sample for human review and records the verdicts.

## 10. Rule changes required (draft for owner approval)

These replace or amend current AGENTS.md lines and the corresponding sections of `docs/architecture.md`. None are applied by this design.

| Current rule (AGENTS.md) | Proposed |
| --- | --- |
| "no raw post can publish without verified facts/outlets" | The map shows official-source promotions read by the pipeline; inferred facts follow the change spec, are audited internally, and the full source text is always shown. |
| "Use the shared publication rules and transactional save path; do not publish directly from text parsing." | Map output comes only from the official-source pipeline (reader + deterministic computation + quote check). The strict publication path is retired. |
| "Google results cannot establish a complete branch list or promotion participation." | Google merchant locations may be used as an all-outlets fallback when no official directory exists; the basis is recorded. |
| MVP/curated rules ("Curated inclusion never relaxes strict publication…") | Removed with the strict path retirement. |
| "`npm run worker` starts recurring collection; do not leave it running without explicit scheduling scope." | The Telegram worker is retired. The daily official-source job is the only scheduled process and is enabled explicitly per environment. |
| Promotion NLP research-only boundary (architecture.md:459 "Outputs must not independently establish publication facts") | The reader's quoted facts plus deterministic computation establish map facts. Research artifacts stay frozen. |
| Direct source ingestion "has no `--all`, scheduler, or startup hook" | The daily job fetches all accepted registry sources; manual one-source runs remain for debugging. |
| "`/mvp` serves active MVP data … `PROMOTION_DATA_SOURCE=mvp` selects MVP on `/`" | `/` and `/mvp` serve the single official artifact; the env switches are removed. |
| "MVP source-location fallback is explicitly isolated in `GoogleOutletDiscovery.discoverMvp`; strict `discover` never uses it" | Strict `discover` is retired; the source-location fallback is the only outlet discovery path, with `coordinateBasis` and audit preserved. |

Unchanged:

- Demo data stays fictional and labelled.
- Credentials stay server-side.
- Tests intercept public tile requests.
- Integration, load and restore tests use disposable databases.

## 11. Retirement

- **Removed from serving:** the strict DB feed on `/`, the Telegram MVP artifacts (`data/mvp-promotions.json`, `data/mvp-promotions-source-observed.json`) and the Telegram worker (`src/ingestion/worker.ts`).
- **Preserved:** their code, migrations and research documents, until a separate cleanup change.

## 12. Security and limits

- **Fetching:** all fetches go through the SSRF guard and request budgets. Social acquisition never logs in and never uses private APIs.
- **Credentials:** LLM keys and the Google key are read only by server and job code, never sent to the client.
- **Untrusted input:** source text and images are treated as data. The reader prompt states that instructions inside sources are ignored, and outputs are schema-validated.
- **Scheduler:** the daily job reuses `hourlyLoop` (`src/ingestion/hourly.ts:2`, `intervalMs` option) with a 24-hour interval as `npm run pipeline:daily`. The single-instance lock is new code, since `hourlyLoop` has none. The job exits cleanly on signal.
