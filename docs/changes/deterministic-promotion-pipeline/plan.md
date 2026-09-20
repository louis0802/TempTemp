# Plan and completion

Change documents: [intent](intent.md), [specification](spec.md), [design](design.md), and this implementation plan.

1. [x] Inspect authoritative contracts and representative inbox patterns.
2. [x] Implement types, deterministic patterns, dates and structured splitting (AC1–2).
3. [x] Implement cache, real Genki directory, place adapters, participation and identity (AC3–5, AC7).
4. [x] Implement deterministic eligibility/orchestration and raw candidate integration preserving review/publication paths (AC6–7).
5. [x] Add pattern, safety, provider and representative/full inbox integration coverage (AC8).
6. [x] Run typecheck, unit/integration tests, lint/build; review implementation against criteria and document actual limits.

[Verification evidence](verification.md): 86 unit tests, 17 integration tests, typecheck, lint and production build passed. No public schema or review API changes; no migration required.

## Material implementation decisions

- Initial provider is Genki's real static Singapore locator (22 cards in captured fixture). McDonald's remains unsupported rather than publishing a guessed list.
- Missing media facts retain blockers while independent outlet resolution can still reduce review work.
- Explicit shared blocks and footers after single-line offer lists are shared; multiline ambiguous footers and branch/product date differences are unresolved.
- External calls execute before database locks. Candidate/source state and current date are rechecked under publication locks. Already reviewed raw revisions are preserved on parser upgrades.
- Reuse existing persistent outlet storage with stable physical-fact UUIDs and process-local TTL caches. No new database schema.
- Optional LLM extraction and promotion-specific participating-list provider are injection contracts; neither silently supplies unverified production facts.

Review fixes included ISO-date hyphens incorrectly classified as multiple ranges, multiline footer ownership, app ordering misclassified as online-only, exclusions outside location markers, independent completeness validation, canonical merged promotion IDs, and review/publication serialization. Relevant regressions were added.

## Google discovery follow-on
- [x] Add cached paginated Google transport and generic discovery with identity/status/country checks (AC9–12).
- [x] Wire discovery into the default resolver for merchants without adapters; reuse Google coordinates and retain non-authoritative chain audits.
- [x] Test named and selected resolution, all-outlet discovery blockers, ambiguity, pagination, missing credentials and place-ID deduplication.
- [x] Run unit/integration tests, typecheck, lint and build; update verification and runtime setup documentation.

No schema migration or operational ingestion is required. API requests in tests are mocked; live credentials will be checked for presence without exposing values.

Follow-on validation: 105 unit tests, 17 integration tests, lint, production build and typecheck passed. Google response tests are synthetic, with no live Google calls or operational ingestion. `GOOGLE_PLACES_API_KEY` is absent locally. The original complete-chain gate remains; generic discovery is useful evidence, not an exhaustive directory claim.


2026-09-20 user-directed policy update: Generic T&Cs / more-info links are retained verbatim in description and rendered as clickable HTTP(S) links. They do not independently block approval or imply linked pages were verified. Missing dates, unresolved participation, explicit material conflicts and unread media still require review. Parser version v6 applies this policy on subsequent processing; no operational replay is performed by this change.
