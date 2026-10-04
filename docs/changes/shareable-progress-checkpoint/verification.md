# Shareable full-progress checkpoint

Date: 4 October 2026 (Singapore). Branch: `research/source-substitution-pilot`.
Pre-checkpoint HEAD: `8c8b278ccd1d5d0c1430a699b20b18d185e3887f`.

This is one snapshot of accumulated implementation and research, not reconstructed historical commits. The small-fix workflow applies to this packaging task: existing feature/change documents remain authoritative for their individual work, and this record covers README editing, preservation, auditing, verification, and local commit preparation. No application implementation, source activation, or research contract was changed by this task.

## Included scope

The checkpoint includes all meaningful modified/untracked work: bounded direct acquisition, registry/authority model, merchant adapters, candidate/evidence contracts, outlet and publication gates, persistence/history, `002_direct_sources.sql`, shared domain/review/admin integration, source-substitution and monitoring tooling, merchant coverage, direct/social/source research fixtures and tests, Promotion NLP V1–V4, oracle ablation and deterministic spans, historical change/research documents, package scripts, operating notes, and the canonical architecture.

[README.md](../../../README.md) now provides a friend-facing introduction, a prominent architecture link, the three ingestion/research paths, an architecture flow, implementation status, preview/ingest commands, registry versus acquisition/deployment distinctions, the `STOP_AUTONOMOUS_EXTRACTION` conclusion, and a repository tour. Useful local setup/login/import/map instructions remain. The migration instructions cover both intended migrations, in order: `001_initial.sql` and `002_direct_sources.sql`. README relative links were checked against the filesystem.

[docs/architecture.md](../../architecture.md) remains the canonical current overview; `docs/changes/**` is historical/change documentation. Existing accumulated files were preserved byte-for-byte. [file-manifest.json](file-manifest.json) classifies every checkpoint path and the deliberately excluded generated path; it has no unexplained entries.

## Verification actually run

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | Passed, including repeats after build/development type generation and after restoring the committed references. |
| `npm run lint` | Failed solely on five `no-explicit-any` findings in ignored `.local/source-substitution-pilot/inspect.ts` and `upstream.ts`. These scratch files are excluded from git. |
| `npm run lint -- --ignore-pattern '.local/**'` | Passed across the shareable repository. No tracked-code rule or assertion was disabled. |
| `npm test` | Initial default-concurrency run: 1,100 passed; two filesystem-heavy research tests timed out, with subsequent cleanup racing unfinished work. |
| `npm test -- --maxWorkers=2` | Final isolated run: **1,102/1,102 passed across 54 files** with unchanged assertions and timeout thresholds. An earlier overlapping build exposed the historical generated-reference assertion, and a run overlapping browser/audit work timed out in one capture-replay test. |
| `npm run test:corpus` | **4/4 passed across 3 files**, including the separate parser/MVP corpus. |
| `npm run test:integration` | Attempted against hardcoded local disposable databases. Both suites failed during `CREATE DATABASE`; **55 tests skipped**. PostgreSQL reported `No space left on device`. Container disk inspection showed a 59 GB filesystem at 100% usage; inode availability was adequate. No migration/test case ran, and no shared/hosted database was migrated. |
| `npm run build` | Passed with application pages and API routes compiled, including the direct-candidate review endpoint. |
| `npm run test:e2e` | First run with explicit demo/strict data and schematic map: 22/44 passed. Schematic mode incorrectly prevented real-map checks; corrected run recorded below. |
| Corrected E2E | `DEMO_MODE=true PROMOTION_DATA_SOURCE=strict NEXT_PUBLIC_MAP_MODE=auto NEXT_PUBLIC_MAPTILER_KEY='' npm run test:e2e -- --workers=2`: **30/44 passed, 14 failed** (seven cases on both desktop/mobile). Real MapLibre and unified discovery checks passed. Eight auth-dependent cases were blocked by local auth's “Database error querying schema”; two legacy discovery cases use the obsolete “Search neighbourhood” selector, two corpus cases expect an upcoming offer on the current date, and two search-privacy cases fail the “Genki Sushi” result expectation. No assertion was changed. Desktop/mobile unified-discovery screenshots were visually inspected; they use synthetic tiles. |
| Research integrity | Passed read-only checks described below; results in [research-integrity.json](research-integrity.json). |
| `git diff --check` / `git diff --cached --check` | Worktree check passed. Full staged check is nonzero: 16,800 existing whitespace diagnostics across 165 files, confined to captured fixtures and frozen `scripts/research/source-monitor/protocol/source-registry.json`. Those protected bytes are intentionally retained; scoped application/documentation changes are clean. |

The ordinary unit command covers all focused direct-source, source-research, NLP, oracle-ablation, and deterministic-span test files. No hosted model experiment command was run. Integration/browser limitations remain limitations of this checkpoint; older historical verification reports were not rewritten to imply a new successful run.

## Generated-reference preservation caveat

Inspection confirmed that the entire `next-env.d.ts` diff replaced `.next/types/` references with `.next/dev/types/` references. It is restored to HEAD for this checkpoint. `.next/`, `.local/`, `*.tsbuildinfo`, browser results/traces, credentials, and auth state are excluded.

The historical NLP protected snapshots also include the development-state `next-env.d.ts` hash. Before cleanup, every stored protected-file hash matched the existing worktree. The final unit pass used those unchanged development references. A build, or the restored committed references, changes this generated file and makes `tests/promotion-nlp.test.ts`'s protected-byte assertion fail on that single path. A post-restoration `npm test -- tests/promotion-nlp.test.ts --maxWorkers=2` confirmed **70 passed / one failed**, solely the `next-env.d.ts` protected-byte assertion. This is a known generated-state dependency, not a changed benchmark or extraction behavior; it is intentionally reported rather than repaired by editing the sealed baseline or weakening its assertion. `next dev` recreates the historical development references.

For seal verification, the original generated reference was saved outside the repository and used only in a temporary historical verification view. V2 additionally used the exact historical protected-file set, because its original whole-tree equality check predates later additive NLP modules. All historical entries matched current bytes before cleanup, and historical copies matched their manifest hashes. All non-generated source, fixture, contract, and raw-evaluation bytes remained unchanged. The checkpoint's sole intentional protected-byte difference is the requested generated-file restoration.

## Research integrity

Read-only verification imported existing validators without dispatching agents or hosted models. V1 checked its raw seal, individual response bindings, benchmark hash and 113 protected files. V2 used `verifySealV2` for its raw/manifest/launch/individual bindings and 118 historical protected files. V3 used `verifyStageSealV3` for both segmentation and extraction, including task projection and stage boundaries. V4 used `verifyRunV4` for all five stages, 228 distinct agents, 1,358 protected files, 41 captures and 16 frozen files.

Oracle ablation used `verifyFrozen` and `verifySeal` for each of the five arms, checked all 249 distinct agent IDs against prior IDs, and checked all 1,872 protected files. This deliberately avoided its `verify` CLI's derived `verification.json` write. The oracle benchmark hash remains `ef7c4b4ef6195e0b0c28f3e62e9f32357dc932bd05f50c65344f80b2e0d7abc7`; projection, scorer and all arm seal hashes are recorded in the companion integrity result. All benchmark-v1 (named `benchmark.json`), v2, v3 and v4 bytes remain unchanged.

A before/after SHA-256 inventory checked 955 initial repository files and 1,457 existing ignored local NLP run files. Research documents, raw outputs, manifests, seals, protected snapshots, changed-file records, prior-run artifacts, and test fixtures were not normalized or cleaned up. Historical absolute paths remain where they record provenance or participate in protected evidence. New README/checkpoint prose uses repository-relative links. `.local/` run data is retained locally, excluded from git, and required for full replay of the original model evaluations; the shareable repository carries the research code, fixtures, recorded results and conclusions rather than those local raw-run directories.

## Shareability and security audit

The targeted audit inspected all trackable repository files, including the complete new/modified set, for OpenAI/cloud/API keys, private keys, database passwords, literal bearer/auth values, JWTs, cookie headers, credential/auth filenames, and generated/local paths. Suspect matches were inspected in context without copying credential values into this report.

Thirty value-shaped candidates were classified: 25 documented localhost/Docker credentials, four occurrences of public merchant Google Maps browser keys in captured HTML, and one unit-test sentinel. The public Maps configuration belongs to captured merchant pages (Coffee Bean, FairPrice twice, and Shake Shack), not this application's server credentials; captured evidence bytes were preserved. No project OpenAI/API key, Supabase service-role secret, production database credential, private SSH key, authenticated cookie/session state, or unexpected local artifact was found. This is a targeted content/path audit, not a claim that arbitrary future files are secret-free.

`git check-ignore -v` confirmed exclusion of `.env.local`, `.local/`, `.next/`, `*.tsbuildinfo`, credential/service-account JSON patterns, `.auth/`, `playwright/.auth/`, `test-results/`, and `playwright-report/`. `.env.example` contains placeholders. The staged-file audit rejects these paths; documented local-only Docker/test values remain.

## Staged-file and size audit

All **758 meaningful paths** are included: 61 runtime/research/application files, 55 scripts, 380 test/fixture files, 254 historical/research documents, three project/architecture/operating documents, three checkpoint evidence files, one package-script file and one migration. README, canonical architecture, direct-source code, NLP research, source-substitution research and admin integration are all present. No generated/sensitive/local-only path is staged.

Index audit: **758 files**, **350,871 added lines**, **34 deleted lines**, one binary file; approximately **64.53 MB** of staged file content. The staged path set exactly matches the manifest. All other initial repository bytes match the task-entry inventory; the requested generated-reference restoration and README are the only existing-file changes made during packaging.

| Largest staged files | Bytes |
| --- | ---: |
| FairPrice captured HTML, `research-2026-10-01T13-09-18-820Z/b9ca9ac…html` | 2,742,367 |
| `docs/changes/direct-source-batch-1/protected-evidence-check.json` | 1,315,639 |
| `docs/changes/coverage-batch-2/protected-baseline.json` | 1,129,610 |
| CS Foods captured HTML, `research-2026-10-01T13-09-29-783Z/d266bbf…html` | 1,002,257 |
| `docs/changes/direct-source-batch-1/protected-baseline.json` | 980,740 |

The largest files are deliberate captured HTML or research evidence. No staged file is greater than 50,000,000 bytes or at least 100,000,000 bytes. No hosting-size blocker was found.

## Commit and boundaries

One local snapshot uses the explicitly requested header (the user's exact message overrides the git-commit skill's scoped-header/multiple-commit convention):

```text
feat: checkpoint direct-source ingestion and promotion research
```

Its body summarizes bounded official ingestion/publication, source-substitution and merchant coverage research, direct-candidate review/admin integration, Promotion NLP through oracle ablation, the stop conclusion, canonical architecture and the refreshed README.

No database operation targeted a non-local service. The integration suites attempted only their disposable local databases; browser sign-in used local auth, with review mutations intercepted. No hosted model API call, live source acquisition, ingestion CLI, collector/monitor/worker startup, scheduler, source enablement change, deployment, or push occurred. Existing branch activation configuration was preserved. Docker disk cleanup was not performed.

No git remote is configured. Sharing first requires a user-chosen repository URL, then separately authorized commands such as:

```sh
git remote add origin <repository-url>
git push -u origin research/source-substitution-pilot
```
