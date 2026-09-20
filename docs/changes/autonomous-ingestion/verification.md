# Verification — autonomous ingestion v7

Verified 20 September 2026, Asia/Singapore. Implementation and self-review complete; no independent-agent review was performed. This workspace has no Git metadata, so source/test changes were reviewed against copies captured before editing.

## Final checks

| Exact command | Result |
| --- | --- |
| `npx vitest run tests/resolution.test.ts tests/validity.test.ts tests/golden/resolution-golden.test.ts` | PASS — 108 tests (83 resolution, 16 validity, 9 golden). |
| `npm test` | PASS — 143 tests in 6 files; excludes integration, e2e and corpus. |
| `npm run test:integration` | PASS — all 19 PostgreSQL/PostGIS/Auth integration tests, no skipped tests; disposable local database removed by suite. |
| `npm run test:corpus` | PASS — 136 unique original sources, fresh-pipeline replay equality and audit/ownership assertions. |
| `npm run typecheck` | PASS — `tsc --noEmit`, exit 0. |
| `npm run lint` | PASS — `eslint .`, exit 0. |

Incremental commands also run successfully: `npx vitest run tests/resolution.test.ts` (67 at that stage); `npx vitest run tests/resolution.test.ts tests/validity.test.ts tests/google-discovery.test.ts` (100); `npx vitest run tests/golden/resolution-golden.test.ts` (9); `npx vitest run tests/resolution.test.ts tests/golden/resolution-golden.test.ts` (76 at that stage). Later focused/grouped runs and normal suite reruns passed after added regressions. Changed TypeScript files were formatted with Prettier.

`npx vitest run tests/integration/ingestion.test.ts` initially FAILED in setup with sandbox EPERM on localhost ports 54321/55432 (19 skipped). The same command with authorized local-socket access PASSED all 19. The final `npm run test:integration` also PASSED all 19 with local access. No test was weakened or skipped. Build/e2e/live provider checks were not run; no UI or framework-route behavior changed.

## Corpus metrics

Evaluation time: `2026-09-17T00:00:00Z`. Inputs: ORIGINAL `source.originalText`, deduplicated by URL from `exports/review-inbox-2026-09-16/review-inbox.json`.

| Metric | Count |
| --- | ---: |
| Sources | 136 |
| Offers | 181 |
| Approved | 0 |
| Excluded | 37 |
| Unresolved | 144 |
| Requires split | 18 |
| Failed | 0 |

Requires split is a subset of unresolved offers. Failed counts source processing/assertion failures. The conservative corpus provider uses a captured Genki locator, fixed test evidence timestamps and deliberately unavailable coordinates; it supplies no fabricated merchant coverage. Zero approvals is an observed result, not an assertion or target. Any future approved result must pass schema/publication validation and existence/participation/coordinate/enumeration audit checks. Full result objects, including IDs and audits, match replay through a fresh pipeline. Every numbered corpus section equals its own original source section; no unrelated terms/date/location/media are copied. Recognizing 🔟 corrects the previously merged ninth/tenth entries and yields 181 offers.

## Golden dispositions

All seven real cases load original export text. Most evaluate on 14 September; Subway evaluates at its source timestamp. Thus these assess source-time parsing/evidence, not whether a historical promotion is current on 20 September.

| Fixture | Golden result | Evidence and genuine remaining limitations |
| --- | --- | --- |
| tastesoulsg/4485 McDonald's | approve with controlled complete authoritative directory; unresolved with conservative provider | Correct merchant/title/$6 meal benefit, 2026-09-14–16, all_outlets. Export marker informational, verifiedAt retained, directory lookup attempted. No production McDonald's adapter added. |
| tastesoulsg/4468 Subway | approve with controlled complete authoritative directory | 2026-09-07 only; hours null, cutoff 11:00, no invented start. Five selectors audited against six excluded branches, including two airport terminals. Production complete-chain evidence still required. |
| tastesoulsg/4478 Papi’s Tacos | unresolved | $10 OFF, Friday [5], both exact street addresses independently resolved using controlled non-authoritative named evidence. Missing required start/expiry remains blocking. |
| tastesoulsg/4477 Sushiro | unresolved / requires_split | Original two-wave text retained; no flattened dates or publication. Source does not establish product/merchandise allocation or a definite benefit for each wave. |
| sgfooddeals/4931 Smooy | unresolved | selected_outlets; no chain fallback. Complete promotion-specific participation list absent. |
| tastesoulsg/4486 Koi Thé | exclude | Exact reason online_only_not_for_map. |
| sgfooddeals/4928 buffet roundup | five unresolved offers | Independent merchants/titles and benefits: 2-for-2, $10 Buffet, Hotpot Buffet from $9.99, 1-for-1, 2-for-2. Missing validity and physical participation; no inferred September range and no header/footer/media leakage. |
| Synthetic Genki | approve | Controlled authoritative directory, coordinates and source participation; schema-valid. Existing database test still publishes the captured 22-branch synthetic control exactly once. |
| Synthetic ordinary-menu article | exclude | no_promotional_benefit. |

## Acceptance and safety evidence

- AC1: Default-blocking unknown codes tested. Exact marker alone approves a complete control; actual media benefit, validity, outlet, eligibility and restriction references stay blocking. Both issue severities retained in audit.
- AC2: Benefit patterns, ordinary-price negatives, leading URL removal, local restrictions/media isolation, unknown header/footer blockers and original roundup entries covered. Generic deal intent does not supply validity or participation.
- AC3–AC4: Singapore Today boundary/rollover tests retained; Every Fri and conflicting abbreviations tested. Missing expiry/multiple periods remain blockers. Cutoff schema/fingerprint/label/date audit and conservative validity tested, including invalid and multiple cutoffs. Every exclusion selector must match. Address numbers, street suffixes and ambiguous multiple-unit branches cannot be silently conflated.
- AC5: Full replay/UUID equality and changed source identity tested. Physical outlet identity algorithm unchanged. Existing count/traversal, coordinates, existence, participation, selected-list, duplicate and Google non-authority tests still pass.
- AC6: Database tests cover published-only, article/online excluded-only, mixed terminal completed, unresolved siblings, no repeat processing, reconciliation/reviewer preservation and transaction retries. Network resolution remains outside publication locks; no lock or publication path removed.
- AC7: Dedicated golden and corpus suites, no normal corpus iteration, schema/audit checks and printed metrics implemented. v7 records new behavior.

## Changed files

Application: `src/ingestion/resolution/issues.ts` (new); `pipeline.ts`, `parser.ts`, `dates.ts`, `patterns.ts`, `outlets.ts`, `eligibility.ts` in the same directory; `src/ingestion/service.ts`; `src/ingestion/cleanup/index.ts`; `src/domain/promotion.ts`; `src/server/db/publication.ts`.

Tests: `tests/resolution.test.ts`, `tests/validity.test.ts`, `tests/integration/ingestion.test.ts`; new `tests/golden/resolution-golden.test.ts`, `tests/corpus/review-inbox-regression.test.ts`, `tests/helpers/resolution-fixtures.ts`. Removed `tests/integration/resolution-inbox.test.ts` after moving representative and corpus coverage to the dedicated suites.

Commands/guidance: `package.json`, `AGENTS.md`. Change records: `docs/changes/autonomous-ingestion/{intent,spec,design,plan,verification}.md`. No changes to the original export, physical outlet identity semantics, database migration files, or production provider configuration.

## Operational limits

No live API quality/coverage has been established by these tests. General chain discovery remains non-authoritative; missing complete merchant adapters and coordinate evidence still prevent production approval. Selected lists, unread material media, missing validity and ambiguous benefit/period ownership remain genuine blockers. No deployment, scheduled worker, collection checkpoint update or operational promotion publication/replay was performed.
