# Verification

The implementation/evaluation is complete with negative semantic readiness **A**. No A2/B/C/D authorization. Original intent/spec acceptance concerns research execution and honest evidence; the semantic success bar was measured and not achieved. No requirements were rewritten to make outputs pass.

## Checks actually run

| Check | Result |
| --- | --- |
| Prelaunch focused v1/v2 NLP/schema/integrity tests | 133 passed across four files |
| Prelaunch full unit suite | 944 passed across 47 files with two workers |
| Initial full parallel attempt | 942 passed; two existing research tests timed out and had cleanup races. Assertions/timeouts unchanged; two-worker rerun passed |
| Post-run added source-backed midnight regression | Documented accepted syntactic evidence versus semantic safety finding; no frozen implementation edits |
| Final focused v1/v2 tests | 134 passed across four files |
| Final full unit suite | 945 passed across 47 files with two workers |
| Typecheck | npm run typecheck passed |
| Scoped lint | New v2 modules, runner and both test files passed ESLint |
| Formatting | New code/tests/annotation Prettier check passed |
| Whitespace | git diff --check and direct new-report trailing-whitespace check passed |
| Self-review | Checked diff/change set against primary/polarity/role contract and authorized boundaries; not described as independent review |

Relevant commands:

```sh
npx vitest run tests/promotion-nlp-v2.test.ts tests/promotion-nlp-subagent-v2.test.ts tests/promotion-nlp.test.ts tests/promotion-nlp-subagent.test.ts
npm test -- --maxWorkers=2
npm run typecheck
npx eslint src/ingestion/promotion-nlp/*-v2.ts scripts/research/promotion-nlp-subagent-v2-evaluation.ts tests/promotion-nlp-v2.test.ts tests/promotion-nlp-subagent-v2.test.ts
npx prettier --check src/ingestion/promotion-nlp/*-v2.ts scripts/research/promotion-nlp-subagent-v2-evaluation.ts tests/promotion-nlp-v2.test.ts tests/promotion-nlp-subagent-v2.test.ts tests/fixtures/promotion-nlp/benchmark-v2.json
git diff --check
```

No UI, production build, integration DB, e2e, external corpus, live source acquisition or provider API check required/performed for these disconnected research modules. No running service or worker remains. Production compatibility is protected by unchanged bytes and zero production v2 imports, not a claim of deploying/testing NLP in production.

## Integrity after blind execution

- Exactly 49 case IDs and unchanged sourceText/sourceReference/capture SHA/selector/evidence/isolation/merchantHint/null titleHint.
- All referenced source capture bytes verified before preparation and after run.
- Exactly 49 distinct new agent IDs, none reused from sealed v1; all requested and accepted gpt-6-luna, medium, fork_context=false, maximum concurrency four. Backend revision unavailable.
- No retries, fallback, repaired answers or reused history. First raw outputs recorded exclusively, per-response hash, input/prompt hash, actual agent ID/configuration. Duplicate/unknown/reused IDs and changed hashes tested fail-closed.
- All raw outputs sealed before evaluation annotation loading/scoring. 49 completed, nine unchanged syntax-malformed, zero execution errors/missing results. All 49 stay in primary quality denominators; usable semantic denominator 40 with nine unassessable explicitly reported.
- V2 raw seal f5a7a70afd38085ba1c615833ee913432d452e376726c7bc35e39e0e730b248a verified from raw-results.json. Manifest/launch/individual-record seals verified.
- V1 raw seal 786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a verified from unchanged v1 raw file.
- Frozen schema/prompt/validator/scorer/runner/annotation/role-definition file hashes and schema/prompt content hashes verified after run. No frozen edits after first launch.
- Initial 245-file protected byte snapshot verified identical, including all prior src modules, migrations, package/config files, v1 NLP fixtures/checked outputs, original research scripts/docs, original tests and sealed v1 run. Snapshot retained as ignored run artifact initial-protected-files.json.
- Source activation, direct-source-v2, registry, enabled adapters, persistence/publication gates, Telegram and v1 candidate mapper unchanged. No production import of v2 research modules.
- No hosted model provider API, fresh acquisition, production database operation, source activation, recurring job, commit or push performed.
- Agent tools prohibited by prompt; runtime lacks mechanical denial parameter. Do not claim stronger sandboxing. Source review is parent-authored, not an independent or human-approved oracle.

Verification command: node --import tsx scripts/research/promotion-nlp-subagent-v2-evaluation.ts verify <run-root>. Raw run root is recorded in evaluation.md. Re-scoring writes exclusive result files and cannot overwrite original run scores; preserve the original first-output artifacts.

## Acceptance audit

AC1: exact source/agent/model/blindness/seal integrity complete.
AC2: schema/validator and critical-case review complete; observed semantic regressions explicitly retained rather than patched/retried.
AC3: named metrics, all-case/usable denominators, quote/syntax/rejection separation, manual flag dispositions and v1 comparison complete.
AC4: required checks completed before launch; final checks passed, including source-backed regression.
AC5: complete four-document checkpoint plus requested failure/contract/schema/prompt/benchmark/evaluation/comparison/decision/verification/file-ledger artifacts. Research outcome A; safety success/A2 gate fails. No release action.
