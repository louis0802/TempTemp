# Verification — production evidence coverage

Verified 20 September 2026, Asia/Singapore. Self-review completed against AC1–AC6; no independent-agent review. No architecture, publication rules, database schema, physical identity, remote, worker scheduling or production data changes.

## Git bootstrap and baseline

Inspected physical cwd `/Users/louis/Documents/Projects/vibe coding/PromotionAroundYou`, each ancestor through `/`, and Git discovery: no existing repository/worktree. Initialized the root repository after the filesystem sandbox required Git metadata access. No user Git configuration changed. All 107 candidate file paths were reviewed before staging an explicit path list. Existing `.env.local`, dependencies, build/test output, tsbuildinfo and duplicate export ZIP excluded. Corpus JSON, schemas, source fixtures and documentation/screenshots retained intentionally. Secret-pattern inspection found no matching private keys/cloud/GitHub/API credentials in candidate text; checked environment example is blank and Docker credentials are explicit local development constants. This is an inspection, not a claim of exhaustive secret detection.

`.gitignore` expanded for coverage, caches, output, logs/temp/editor/OS files, local databases, credential/key files and local auth/runtime directories; preserved `.env.example`. Existing captured Genki HTML whitespace was retained byte-for-byte despite Git whitespace warnings. Baseline commit: `89c4c78 feat(ingestion): establish autonomous ingestion v7 baseline`. Branch: `feat/production-evidence-coverage`. Analysis commit: `a8debf2 chore(ingestion): measure autonomous ingestion evidence gaps`.

Before baseline commit: `npm test` PASS 143; `npm run test:integration` PASS 19; `npm run test:corpus` PASS one full-corpus test; `npm run typecheck` PASS; `npm run lint` PASS. Initial integration attempt failed setup with sandbox EPERM (19 skipped); rerun with local-socket access passed all 19. No test changed to bypass it. Initial `tsx` analysis invocation hit its sandbox IPC restriction; using `node --import tsx` avoids the IPC listener and runs the same TypeScript script.

## Final verification

| Exact command | Result |
| --- | --- |
| `npm test` | PASS — 174 tests in 7 files, including 31 new provider/coordinate tests; offline |
| `npm run test:integration` | PASS — 19 tests, disposable local PostgreSQL/Auth database, no skips |
| `npm run test:corpus` | PASS — 136 source replay, ownership and publication audit checks |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run analyze:evidence` | PASS — deterministic JSON/Markdown blocker reports regenerated |
| `npm run compare:evidence` | PASS — fresh-provider replay equality across 136 sources; 2 evidence changes, 0 classification changes |
| `npx vitest run tests/papis-directory.test.ts` | PASS — 25 then 29 tests during implementation; final `npm test` includes all 31 |
| `git diff --check` | PASS for changes to tracked files; newly captured original HTML retains upstream whitespace |

One-time live read-only smoke used `node --import tsx --input-type=module -e` to invoke `new PapisOutletProvider(new ResolutionCache()).getSingaporeBranches("Papi’s Tacos")`. PASS at `2026-09-20T15:42:58.741Z`: authoritative true, fullyTraversed true, officialCount 4, four branches, empty issues. Source URL https://www.papis-tacos.com/ and digest `5ff472c54cb4ed023efd4261837c1cc6906f9dbdef7b98b8b4dea9d886b4cdc7` matched the captured fixture. Fixture raw-byte SHA-256 independently verified against metadata. No live coordinates or promotion publication attempted. Build/UI/e2e checks not run because no UI/framework route behavior changed.

## Acceptance evidence

- AC1: baseline, ignore inspection, explicit staging and requested branch completed; no remote or push.
- AC2: `evidence-gaps.{json,md}` contains every offer identity/source/action/reason, merchant totals, exact reasons, overlapping categories and technical ranking. Observed missing directories: 28 offers; incomplete all-outlet audit/enumeration reason: 18; selected list: 4; observed place failures: 1 offer (22 branch failures); missing validity: 114; benefit/title/merchant parsing: 95; unresolved requires_split: 17; material-media: 0; other reasons: 144 (includes aggregate outlet/schema/scope failures). Total requires_split is 18 because one excluded offer carries it. Unattempted downstream evidence is not counted as a known failure; merchant labels retain original parsing variants.
- AC3: reusable fixed-source cached retrieval and audited enumeration helper; dedicated Papi adapter and unmodified captured HTML/hash metadata. Explicit source count and independent navigation agree. Missing cards/count, malformed/truncated responses, continuation, duplicates, invalid provenance, foreign address and unknown status all block. Runtime rejects invalid snapshots even for named scopes. Registered only after provider tests passed.
- AC4: synthetic complete promotion approves with independent mocked coordinates and passes schema/publication/outlet evidence assertions. Incomplete traversal, count mismatch, missing existence/coordinates and temporary closure block. Permanent closure/coming-soon branches are excluded with evidence. Actual named Papi offer remains unresolved; typo mismatch is explicitly asserted. Existing publication tests retain unknown-code/media/validity/participation gates.
- AC5: four new coordinate regressions retain ambiguity/business-status blocking, address/unit and building precision. No coordinate or stable identity code changed. Selected outlet directory fallback remains blocked by test. Source research documents why current selected-source contracts are insufficient.
- AC6: all normal tests use captured/mock evidence. Fixed-time reports reproduced. Only two source audits change; no approval or classification change. Contemporary directory applied to historical evaluation is labelled a sensitivity comparison, not historical production evidence.

## Metrics and changed offers

Both conservative corpus and captured-provider comparison: Sources 136; Offers 181; Approved 0; Excluded 37; Unresolved 144; Requires split 18; Failed 0.

`tastesoulsg/4478`: missing-directory reason replaced by authoritative four-branch directory evidence; one source address mismatches the directory typo and required matched-branch coordinates/validity remain absent. `tastesoulsg/4471`: same four-branch evidence; coordinates for all four branches, validity and redemption hours remain blocking. No classification changed. Full before/after reasons and source hashes: `provider-comparison.json`.

## Files and remaining limits

New application files: `src/ingestion/resolution/official-directory.ts`, `papis-directory.ts`; registration in `pipeline.ts`. New tests/fixture: `tests/papis-directory.test.ts`, `tests/fixtures/resolution/papis-home.{html,metadata.json}`; fixture README and conservative helper extended. New analysis scripts: `scripts/evidence-gaps.ts`, `compare-provider-evidence.ts`; npm commands in `package.json`. Project guidance in `AGENTS.md`. Four documents plus JSON/Markdown reports, source research and this record reside in `docs/changes/production-evidence-coverage/`.

Only Papi's production directory coverage added. Other merchants need provable official traversal; Shiok remains deferred. Date/benefit/scope ownership, exact branch conflicts, live place quality and promotion-specific selected participation remain real blockers. Markup drift fails closed and may require a new captured fixture/adapter revision. A one-time successful live fetch does not establish ongoing source availability. No real-world promotion approval is claimed.
