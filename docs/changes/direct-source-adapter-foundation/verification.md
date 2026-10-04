# Verification and final execution report

Implemented the first source-specific crawling slice under src/ingestion. Direct-source evidence is authoritative candidate input; Telegram remains signal-only. Website content is not converted to SourcePost or PostOfferParser text. No production activation/publication has occurred.

## Exact task-attributable files

32 files created/changed: package.json gains only direct-sources:preview relative to the starting workspace; all other listed files are new. Existing AGENTS.md, next-env.d.ts, research package scripts and untracked prior research work were already present and were not edited.

- `docs/changes/direct-source-adapter-foundation/design.md`
- `docs/changes/direct-source-adapter-foundation/intent.md`
- `docs/changes/direct-source-adapter-foundation/plan.md`
- `docs/changes/direct-source-adapter-foundation/spec.md`
- `docs/changes/direct-source-adapter-foundation/verification.md`
- `package.json`
- `scripts/direct-source-preview.ts`
- `src/ingestion/direct-sources/adapter.ts`
- `src/ingestion/direct-sources/adapters/paradise-group.ts`
- `src/ingestion/direct-sources/adapters/pepper-lunch.ts`
- `src/ingestion/direct-sources/candidate.ts`
- `src/ingestion/direct-sources/dates.ts`
- `src/ingestion/direct-sources/evidence.ts`
- `src/ingestion/direct-sources/fetch.ts`
- `src/ingestion/direct-sources/fixtures.ts`
- `src/ingestion/direct-sources/html.ts`
- `src/ingestion/direct-sources/pdf.ts`
- `src/ingestion/direct-sources/registry.ts`
- `src/ingestion/direct-sources/runner.ts`
- `src/ingestion/direct-sources/types.ts`
- `tests/direct-source-adapters.test.ts`
- `tests/direct-source-transport.test.ts`
- `tests/fixtures/direct-sources/README.md`
- `tests/fixtures/direct-sources/manifest.json`
- `tests/fixtures/direct-sources/paradise-anniversary.html`
- `tests/fixtures/direct-sources/paradise-detail.html`
- `tests/fixtures/direct-sources/paradise-hotpot.html`
- `tests/fixtures/direct-sources/paradise-listing.html`
- `tests/fixtures/direct-sources/paradise-menu.pdf`
- `tests/fixtures/direct-sources/pepper-detail.html`
- `tests/fixtures/direct-sources/pepper-listing.html`
- `tests/fixtures/direct-sources/protected-production-hashes.json`

## Final acquisition contract

```ts
interface DirectSourceAdapter {
  readonly sourceId: DirectSourceDefinition["id"];
  enumerate(ctx: DirectSourceContext): Promise<EnumerationResult>;
  fetchDetail?(
    entry: ListingEntry,
    ctx: DirectSourceContext,
  ): Promise<DetailResult>;
  extract(
    entry: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ): Promise<DirectPromotionCandidate[]>;
}
```

Context: explicit source definition, BoundedDirectFetch, fixed run observedAt. Enumeration: entries, evidence, complete, issues, requested/discovered/unresolved pagination, observedAt. Entry: canonicalUrl, title, nativeId, listingUrl, evidenceId, detail/menu relation and listing metadata. Detail: main page, directly linked related evidence and issues. An adapter can omit fetchDetail when its listing contains complete facts. Both implemented adapters currently retrieve details.

## Final candidate schema

`DirectPromotionCandidate` is validated by `directPromotionCandidateSchema` in src/ingestion/direct-sources/types.ts:

- schemaVersion = 1, candidateId, sourceId, sourceLabel, canonicalUrl, listingUrl, nullable nativeId;
- nullable merchant, title, benefit, description, startDate, endDate, weekdays (ISO 1–7), hours;
- locationScope (all_outlets / selected_outlets / named_outlets / source_unspecified), locationNames and nullable locationWording;
- nullable eligibility, redemption and terms arrays;
- observedAt, nullable publishedAt; extractionStatus (complete / partial / failed), issues;
- facts keyed by merchant/title/benefit/description/validity/weekdays/hours/locations/eligibility/redemption/terms/publishedAt, each holding evidenceIds, selector and quote;
- same-source evidence nodes holding id/sourceId/url/requestedUrl/relation/fetchedAt/contentHash/contentType/httpStatus/notes.

Populated facts require provenance. Missing business fields stay null with explicit issues. Publication dates are not used as campaign dates; publishedAt remains unknown because none of the narrow detail selectors in this slice establish publication metadata. Native PDF decoding is not implemented. Supplied native-text association is separately tested; ambiguous columns/pages or a different heading return no usable text. PDF acquisition refusal cannot contribute facts.

## Network and output safety

Exact source hosts: www.pepperlunch.com.sg, pepperlunch.com.sg; www.paradisegp.com, paradisegp.com. HTTP(S) only; credentials, non-default ports and non-public destinations are rejected. DNS is checked and pinned. User-Agent: PromotionAroundYou-DirectSourcePreview/1.0 (bounded public acquisition). No cookies/authentication, browser automation, arbitrary recursion, bypass, LLM, private APIs or Google Places.

Per source: 40 requests, 5 listings, 20 details, 8 menu/terms pages, 3 MB/response, 12 s/acquisition, 3 redirects, 16 KB headers. Bodies are stream-bounded; compression is refused. Redirects count toward the request budget and must stay on an exact allowed host. Timeout, denial, size and coverage failures remain acquisition issues. Every request is an exact registered listing, a narrowly DOM-discovered detail/pagination/evidence link, or an attributable redirect hop.

`npm run direct-sources:preview -- --source pepper_lunch_sg` / `--source paradise_group_sg` / `--all`. `--fixture tests/fixtures/direct-sources/manifest.json` selects deterministic offline transport with no network fallback. `--output` must be a new child of ignored .local/direct-source-preview; arbitrary production paths, existing destinations, symlinks and fixture escapes are rejected. Outputs: run.json, enumeration.json, candidates.json, evidence raw bodies/metadata, report.md. No DB/env credentials or production data files are loaded.

## Actual bounded live preview

Command: `npm run direct-sources:preview -- --all --output .local/direct-source-preview/live-2026-09-30-foundation`. One live acquisition run per source; no second live preview. Two earlier bounded Paradise detail inspections supplied faithful reduced fixture DOM and are separately documented in the fixture README. The initial sandbox DNS restriction was resolved by approved bounded network execution; no source access control was bypassed.

| Source         |     Listings | HTML details |                 Menu attempts | Entries/candidates | Complete | Gate                       |
| -------------- | -----------: | -----------: | ----------------------------: | -----------------: | -------- | -------------------------- |
| Pepper Lunch   | 1/1 HTTP 200 | 7/7 HTTP 200 |                             0 |                7/7 | true     | production-adapter-ready   |
| Paradise Group | 2/2 HTTP 200 | 7/7 HTTP 200 | 1 refused: response_too_large |                8/8 | false    | production-adapter-partial |

Pepper: full observed current promo container has seven unique canonical offer links, no exposed successor/page/load-more controls and no unresolved pagination. Complete means this observed current directory boundary, not historical completeness. All seven details match the inspected main-page structure. No source acquisition issue. $uper Value Deal explicitly supplies 2026-09-01 through 2026-10-31 and the $9.90 proposition. All candidates still have field-level unknowns; acquisition readiness does not establish publication readiness.

Paradise: six corporate carousel cards, one Hotpot promotion and the directly linked current menu. Corporate surfaces cannot prove complete promotion coverage; Hotpot LOAD MORE is unresolved and was not reverse-engineered. Menu bytes exceeded 3,000,000 and were refused. Therefore detail_fetch_success is false across all detail/evidence objects despite 7/7 successful HTML offer retrievals. The menu candidate retains listing provenance and failure, not invented menu facts. Multi-brand anniversary/Members’ Day pages preserve evidence with association issues. No historical PDF root was requested.

### Final per-source candidate inventory

**pepper_lunch_sg**

ownership_verified=true (explicit reviewed operator evidence); enumeration_complete=true; listing_fetch_success=true; detail_fetch_success=true; deterministic_extraction=true; candidate_count=7.

- **Cheesy Omelette** — `https://www.pepperlunch.com.sg/promo/cheesy-omelette-2/`; partial; issues: benefit_unknown, eligibility_unknown, end_date_unknown, hours_unknown, locations_unknown, outlet_type_only, start_date_unknown, weekdays_unknown.
- **Have Your Meals Delivered!** — `https://www.pepperlunch.com.sg/promo/delivery/`; partial; issues: benefit_unknown, eligibility_unknown, end_date_unknown, hours_unknown, redemption_unknown, start_date_unknown, terms_unknown, weekdays_unknown.
- **Dine with Pride** — `https://www.pepperlunch.com.sg/promo/dine-with-pride/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, start_date_unknown, weekdays_unknown.
- **Peppie Meal** — `https://www.pepperlunch.com.sg/promo/peppie-meal/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, start_date_unknown, weekdays_unknown.
- **Student Meal** — `https://www.pepperlunch.com.sg/promo/student-meal/`; partial; issues: benefit_unknown, end_date_unknown, hours_unknown, start_date_unknown, weekdays_unknown.
- **$uper Value Deal** — `https://www.pepperlunch.com.sg/promo/uper-value-deal/`; partial; issues: eligibility_unknown, hours_unknown, locations_unknown, outlet_type_only, redemption_unknown, weekdays_unknown.
- **Weekday Lunch** — `https://www.pepperlunch.com.sg/promo/weekday-lunch/`; partial; issues: benefit_unknown, eligibility_unknown, end_date_unknown, hours_unknown, start_date_unknown, validity_unparsed, weekdays_unknown.

**paradise_group_sg**

ownership_verified=true (explicit reviewed operator evidence); enumeration_complete=false; listing_fetch_success=true; detail_fetch_success=false; deterministic_extraction=true; candidate_count=8.

- **Celebrating Paradise Gourmet Rewards’ 15th Anniversary** — `https://www.paradisegp.com/promotions/celebrating-paradise-gourmet-rewards-15th-anniversary/`; partial; issues: benefit_unknown, end_date_unknown, hours_unknown, locations_unknown, multi_offer_page_requires_association, redemption_unknown, start_date_unknown, weekdays_unknown.
- **Irresistible Lunch Sets to Power Your Day** — `https://www.paradisegp.com/promotions/irresistible-lunch-sets-to-power-your-day/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, start_date_unknown, validity_unparsed, weekdays_unknown.
- **Celebrate Members’ Day with exclusive deals on every Monday** — `https://www.paradisegp.com/promotions/mondayismembersday/`; partial; issues: benefit_unknown, end_date_unknown, hours_unknown, locations_unknown, multi_offer_page_requires_association, redemption_unknown, start_date_unknown.
- **Supper Special** — `https://www.paradisegp.com/promotions/supper-special/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, start_date_unknown, weekdays_unknown.
- **Tea Time in True H.K. Style** — `https://www.paradisegp.com/promotions/tea-time-in-true-h-k-style/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, locations_unknown, start_date_unknown, validity_unparsed, weekdays_unknown.
- **The Perfect Centrepiece for Every Gathering** — `https://www.paradisegp.com/promotions/the-perfect-centrepiece-for-every-gathering/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, locations_unknown, start_date_unknown, weekdays_unknown.
- **Up to 30% OFF Freshest Live Seafood is here!** — `https://www.paradisegp.com/promotions/up-to-30-off-freshest-live-seafood-is-here/`; partial; issues: eligibility_unknown, end_date_unknown, hours_unknown, weekdays_unknown.
- **Paradise Hotpot menu** — `https://www.paradisegp.com/wp-content/uploads/Viewing-All-you-can-eat-90mins_6pp.pdf`; failed; issues: benefit_unknown, description_unknown, detail_fetch_failed:response_too_large, eligibility_unknown, end_date_unknown, hours_unknown, locations_unknown, redemption_unknown, start_date_unknown, terms_unknown, weekdays_unknown.

## Fixture/live comparison and replay

Captured live pages match the audited Pepper promo card/main section selectors and Paradise corporate/Hotpot/detail selectors. Reduced fixture mode emits one Pepper candidate and three Paradise candidates; fixtures intentionally retain fewer cards and contain a labelled synthetic menu PDF. They are not live coverage evidence. Fixture files were not rewritten from live output.

After self-review changes, the final parser was replayed against the actual live response bodies and the recorded menu-size refusal. Output: .local/direct-source-preview/captured-live-final-replay. Each source was replayed twice and complete semantic candidate JSON was byte-equivalent. This output is labelled fixture/offline validation, with replay-basis.json recording the live input; no fresh HTTP or claimed fresh observation. Final replay preserves 7/8 candidate counts, Pepper complete, Paradise partial, and the same acquisition blockers. The raw initial live run is retained unchanged, including its earlier issue wording and null status on the rejected PDF.

## Shared primitives and intentional source-specific logic

Both adapters reuse bounded transport/DNS/canonical URLs, DOM card reading/deduplication/pagination, whitespace handling, evidence hashing, candidate construction/provenance, controlled direct campaign dates, conservative source scope and the runner/report boundary. No generic WordPress crawler exists. Source adapters own .promo / .pgh selectors, permitted URL paths, load controls, Pepper merchant/type semantics, Paradise corporate partiality, linked menus/terms and multi-brand handling. The separate PDF association helper has no merchant-specific facts.

Identity is SHA-256(JSON.stringify([1, sourceId, canonicalUrl, nativeId])) prefixed direct_. No Telegram message/signal/title/text is an input; tracking query parameters are removed before identity. Tests prove stability and cross-source distinction. No candidate reconciliation or merging is performed.

## Production isolation and protected evidence

The CLI dependency closure is captured in .local/direct-source-preview/captured-live-final-replay/dependency-closure.json and tested by import traversal. It contains the new direct-source modules, stateless existing source-evidence validators and Node/Cheerio/Zod utilities. It imports no DB client, publication/service/live collector, PostOfferParser, worker or research runtime. CLI execution writes only local artifact files; no DB code/path was invoked and no production operation was attempted.

SHA-256 comparison of all 3,892 baseline protected files shows zero changes/removals and zero unexpected protected additions. Exact evidence: protected-input-verification.json beside the replay. This includes all existing src/ingestion files, src/domain/promotion.ts, data/merchant-source-registry.json, scripts/research, docs/research, .local/direct-source-audit, .local/source-origin-audit and .local/source-discovery-service. Current Telegram production ingestion and its source schema are byte-unchanged. Existing package.json content is identical to its starting state after removing this task’s one new script. No production merchant registry modification, old research evidence mutation, source-origin resolver mutation, revision-6 execution or monitor/scheduler start occurred.

## Checks and review

- Focused: `npx vitest run tests/direct-source-adapters.test.ts tests/direct-source-transport.test.ts --maxWorkers=1` — 60 passed across 2 files. Covers request/host/link authorization, pagination limits/cycles, redirects, timeout, DNS pinning, chunked/declared size bounds, metadata, identities/hashes, missing facts, publication-date non-fallback, outlet scope, terms/provenance, byte-stable replay, PDF association/ambiguity, cross-source isolation, output/fixture safety and DB dependency exclusion.
- Full requested unit suite: `npm test -- --maxWorkers=1` — 544 passed across 32 files; includes all existing ingestion/source-evidence tests and the existing research tests. No timeout/check was weakened. Original-text ingestion fixtures remain unchanged. Corpus/integration/e2e directories remain excluded by the existing npm test script; no production database was needed.
- `npm run typecheck` — passed.
- Scoped ESLint on new source directory, CLI and both new test files — passed.
- Scoped Prettier on new TS, fixture JSON, package.json and change documents — passed.
- `git diff --check` — passed. New task files are untracked, so they also receive a whitespace-error check before delivery.
- Self-review resolved actionable edge cases and checked acceptance criteria A1–A8. Independent review was not run; this review was self-review.

No UI/framework change, DB migration, integration database check, production build or geocoding check was required for this acquisition-only slice. No scheduler/monitor/worker, recurring collection, Telegram fetch, production ingestion/DB operation, commit or push occurred.

## Gates and next boundary

Pepper satisfies production-adapter-ready within the explicitly observed directory boundary: verified operator ownership from the current audit, successful listing/details, no exposed unresolved pagination, deterministic extraction and no source-level acquisition blocker. It remains shadow-only and does not publish. Paradise remains production-adapter-partial because coverage cannot be proven, LOAD MORE is unresolved and its oversized PDF is refused. Unknown fields and multi-offer association require later work; criteria were not relaxed.

Later: DirectSourceAdapter → DirectPromotionCandidate → candidate reconciliation → outlet resolution → Promotion → DB persistence/publication. That slice must revisit source identity, source revision identity, Telegram-only promotion URLs and evidence persistence. None is implemented here.
