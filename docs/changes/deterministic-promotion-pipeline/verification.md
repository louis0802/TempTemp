# Verification — deterministic promotion pipeline

Verified 17 September 2026 (Asia/Singapore).

| Check | Result |
| --- | --- |
| `npm test` | 86 passed: 30 existing tests plus 56 resolver/parser/cache/safety regressions. |
| `npm run test:integration` | 17 passed: 15 PostgreSQL/Auth/persistence tests plus 2 inbox pipeline integration tests. Uses a disposable local database; operational inbox untouched. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed; existing Next.js routes compile. |
| Real source corpus | All 136 distinct posts from the 180-candidate inbox processed in tests. No unverified result approved. Original exports unchanged. |
| Real provider format | Official Genki locator retrieved read-only, inspected, and captured as a 22-card regression fixture. Card IDs, matching tabs, status/address extraction and layout failures tested. |
| External place APIs | Google/OneMap responses mocked; identity, closure conflicts, postal-code fallback and conservative precision tested. Live Google/OneMap credentials/results not exercised. |

The initial sandbox blocked local test sockets; the suite passed with authorized local network access. No tests were weakened or skipped to obtain the passing results. No UI changes were made, so browser/visual tests were not rerun. The workspace has no Git repository metadata; changed files were reviewed directly against the spec rather than using a Git diff.

## Acceptance evidence

- AC1: Now/Today use the source Singapore date; explicit ranges, rollover, weekdays, unknown expiry, invalid dates and additional/conflicting date claims are tested. Redemption hours remain separate from store hours; last order is retained with a review blocker when not safely representable.
- AC2: Single offers, single-line roundups with shared footers, explicitly shared terms, per-entry dates, ambiguous footer ownership and branch/product periods are tested. Incompatible periods return structured `requiresSplit` audit data. LLM output must match exact source excerpts and pass a strict Zod contract; it remains unverified.
- AC3–AC5: Selected lists never substitute the full directory; named matching retains unit identity; exclusions and closure/unavailability decisions retain evidence. Incomplete pagination/counts, unknown exclusions and failed coordinates block chains. Eligibility independently reconciles enumeration and audit counts. Google existence alone fails participation validation. App ordering alone is not online-only. Stable UUIDs include merchant and physical location, retaining database relocation guards.
- AC6: Fully verified synthetic raw offers publish through the existing transaction. Schema rejection, missing expiry/media terms, expiry exclusion, duplicate candidates, conflicting conditions and missing evidence are covered. Publication time is rechecked after external resolution. Candidate/source locks serialize publication against review.
- AC7: Directory, source-page, branch, Google and OneMap cache namespaces retain URL/hash/time, expire after one hour and coalesce requests; errors retry. Audits persist in candidate data. Reconciliation updates the stored audit decision and canonical promotion ID. Parser upgrades preserve raw revisions containing completed candidates.
- AC8: Real McDonald's, Genki, Sushiro multi-wave and selected-outlet source examples plus the full distinct source corpus are exercised. A synthetic full 22-branch raw offer is published exactly once in the isolated database. Existing structured ingestion, rollback, source reconciliation, authentication and review tests still pass.

## Limits and deliberate choices

- Initial real merchant coverage is **Genki Sushi only**. McDonald's and other unsupported merchants remain unresolved; this does not claim the example McDonald's chain can already publish. Add an authoritative complete merchant adapter to extend coverage.
- The Genki adapter supports its inspected static locator layout. It rejects missing cards/tabs, known pagination controls, bad addresses and inconsistent counts; it does not implement arbitrary JavaScript crawling. Future pagination or a layout change requires an adapter update.
- The locator lists 22 cards but does not advertise a separate official outlet count. The audit records `officialCount: null`; it never invents an independent count.
- The selected-outlet provider is an injectable promotion-specific contract; no generic official T&C participation scraper is enabled. Unsupported/inaccessible lists remain unresolved.
- Image terms, complex restrictions and ambiguous ownership still require review. Existing raw text is preserved as terms. Outlet research proceeds independently when its participation context is clear. There is no OCR or automatic redirect/link research; source-page caching currently serves the supported official locator and is reusable by future source adapters.
- LLM fallback is optional and injected, with no model provider/key configured. It extracts source spans only and cannot turn unresolved evidence into approval.
- Caches are bounded and process-local. Published identities persist in existing `app.outlets`; UUIDs are stable for identical physical facts. Address or coordinate changes require a different identity/review rather than silently moving an existing outlet. No new registry migration was necessary.
- Raw revisions containing any completed candidate are preserved as a group on parser upgrades, to prevent changed splitting rules recreating reviewed offers. Remaining siblings can still be handled with the existing review API.
- All place outputs are conservatively building-level. Actual live place resolution, quotas and broader merchant coverage remain operational validation work.

No deployment, recurring worker, actual promotion publication, collection checkpoint change, or operational review decision was performed for this implementation.

## Google discovery follow-on — 18 September 2026

Supersedes the earlier limitation that every merchant needs its own adapter before any outlet lookup. Google discovery is now wired into the default pipeline for merchants without an official adapter. Named participating branches can complete their outlet audit using a unique operating Singapore Google match. Merchant-wide discovery retains branch evidence but remains non-authoritative. Selected lists must still be verified before lookup.

- `npm test`: **105 passed**, including 19 generic Google discovery regressions.
- `npm run test:integration`: **17 passed**, including existing raw publication, replay and complete inbox checks.
- Typecheck, ESLint and production build passed. One concurrent typecheck encountered generated Next.js files being replaced by build; a sequential post-build typecheck passed. Run those checks sequentially when generated types are being rebuilt.
- Coverage: merchant/branch/unit matching; operating status, country and geographic filtering; named approval without a directory adapter; selected-list prerequisites; non-authoritative all-outlet evidence; pagination exhaustion; place-ID deduplication; cache reuse; missing credentials; preserved unit numbers; response-page evidence hashes.
- No Google key is configured locally. Tests use mocked API responses and do not demonstrate live Google result quality or coverage. OneMap cannot independently establish merchant existence when Google lookup is unavailable.
- No operational ingestion, checkpoint edits, publishing or scheduling was performed. The reviewed-revision preservation rule remains.

API contract checked against [Google Text Search documentation](https://developers.google.com/maps/documentation/places/web-service/text-search) and [REST request reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText). Pagination follows returned tokens with stable query parameters and a three-page limit; exhausted search pagination is never treated as authoritative chain completeness.


2026-09-20 user-directed policy update: Generic T&Cs / more-info links are retained verbatim in description and rendered as clickable HTTP(S) links. They do not independently block approval or imply linked pages were verified. Missing dates, unresolved participation, explicit material conflicts and unread media still require review. Parser version v6 applies this policy on subsequent processing; no operational replay is performed by this change.

Policy-change checks: 109 unit tests passed; lint, production build and typecheck passed. Added approval tests preserving linked terms and regression checks for missing expiry / explicit branch restrictions. No live API or operational ingestion was run; description link rendering was build-checked, not visually inspected.
Integration rerun: 2 inbox tests passed; 15 database tests skipped because local authentication setup timed out in beforeAll (after retrying outside the socket sandbox). Database integration is not verified for this change.
