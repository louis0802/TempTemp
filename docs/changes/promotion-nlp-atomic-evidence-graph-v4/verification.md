# Verification

The research implementation/execution/reporting scope is complete. AC1–AC6 artifacts and checks are verified; the semantic A2 success gate failed. Decision A. No authorization for B/C/D, production integration or release was inferred.

| Check | Observed result |
| --- | --- |
| V4 focused | 38 passed across3 files |
| All NLP including V1/V2/V3 isolation | 242 passed across9 files |
| Complete unit suite | 1053 passed across52 files, maxWorkers=2 |
| Typecheck | npm run typecheck passed |
| Scoped lint | New V4 modules/runner/tests passed with no warnings |
| Format | Prettier check passed V4 code/tests/benchmark |
| Whitespace | git diff --check passed; new-file trailing-whitespace audit passed |
| Frozen artifacts | All16 hashes verified before execution and after scoring/review |
| Five raw seals | Verified; exact hashes in evaluation.md and verification-results.json |
| Task derivation | Every downstream task file reproduced from sealed upstream output; malformed units fail closed |
| Agents | 228 distinct experimental IDs, fixed requested gpt-6-luna/medium/fork_context=false; no retries/fallback; max4; all closed/released |
| Agent lifecycle check | All228 IDs no longer found after explicit closure; no remaining active agents |
| Original protection | 1406 preexisting substantive files byte-identical; generated tsconfig.tsbuildinfo refreshed by required typecheck |
| Run protection | 1358 existing paths and41 distinct source captures byte-identical |
| Source corpus | All49 V3 sourceText/reference/hint/ID values identical; V4 gold separate |
| Prior runs | All four requested V1/V2/V3 raw hashes verified unchanged |
| Production isolation | Zero V4 references/imports in source outside research promotion-nlp directory; existing registry/adapters/gates/schema/persistence/activation/direct-source-v2 unchanged |
| Research review | Parent self-review of49 sources, all34 raw normalization outputs/232 constraints and228 condition requirements; not independent review or human approval |

Final prelaunch commands actually run:

```sh
npx vitest run tests/promotion-nlp*v4.test.ts --maxWorkers=2
npx vitest run tests/promotion-nlp*.test.ts --maxWorkers=2
npm test -- --maxWorkers=2
npm run typecheck
npx eslint src/ingestion/promotion-nlp/*-v4.ts scripts/research/promotion-nlp-subagent-v4-evaluation.ts tests/promotion-nlp*v4.test.ts
npx prettier --check src/ingestion/promotion-nlp/*-v4.ts scripts/research/promotion-nlp-subagent-v4-evaluation.ts tests/promotion-nlp*v4.test.ts tests/fixtures/promotion-nlp/benchmark-v4.json
git diff --check
```

Logs are in verification-logs/. Early prelaunch checks found fixture typing, scorer target/denominator errors, inherited Bari annotation errors and literal boundary/facet issues. They were corrected before freezing and first experiment agent. No frozen schemas/prompts/benchmark/validator/scorer/runner/contracts were edited after that launch. A post-seal identity review and explicitly upper-bound condition audit are separate from frozen scores; their methodological limits are documented. One inherited clock-lexer false rejection remains in the frozen run, without output repair or a repeated experiment.

Post-run command:

```sh
node --import tsx scripts/research/promotion-nlp-subagent-v4-evaluation.ts verify <run-root>
```

The verifier checks frozen files, captured bytes, raw/task/launch/manifest/seal bindings, individual-record bytes, reprojection and unique agents including disjointness from prior runs. Source-envelope/initial-byte audits and requested model/configuration checks are additionally recorded in verification-results.json. Raw persistence uses exclusive first-response writes before parsing. Launch registration prevents duplicate tasks/reused agents, arbitrary model/reasoning/fork/fallback/retry metadata and concurrency above4.

Test coverage maps to the requested1–59 checks through grouped assertions: evidence span/duplicates/atomic clauses (1–8), anchor references and no support bundles (9–15), valid/unlinked/shared/excluded/incorrect-source edges and scorer regressions (16–24), eight taxonomy contracts/gold and observed classification (25–34), local eligibility/fact/date/time/location/constraint references and action/channel facets (35–44), and five-seal blindness/projection/raw/configuration/provider/credential/source isolation (45–59). Schema or prompt assertions do not prove semantic model behavior; the blind experiment and source review supply observed behavior, including failed/unassessable controls.

No UI/build/integration/DB/live-browser/provider/corpus acquisition checks were required or run for disconnected research code. No worker, scheduler or recurring observation process was started. No production database operation, fresh acquisition, Telegram recollection, OCR/media analysis, hosted provider/model API call, commit or push. Only the explicitly requested Codex subagent transport was used. Mechanical tool denial and effective backend model identity are unavailable from its API and are not falsely claimed.

The full workflow paths are intent.md, spec.md, design.md and plan.md here; architecture/contracts/benchmark review/73-item evaluation/comparison/decision and changed-files.json accompany them. Requirements were not weakened to make the A2 gate pass. Frozen automatic metrics and known matcher/facet limitations remain reproducible.
