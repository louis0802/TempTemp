# Verification record — 2 October 2026, Singapore

Implementation follows intent/spec/design/plan and adds only the NLP module, two research scripts, focused tests/fixtures/docs and one npm command. The four workflow documents were persisted before application code. The checked benchmark is Codex-reviewed source text, not independent human gold. Review was self-review; no independent review was performed.

## Checks actually run

| Check                         | Result                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused NLP tests             | 71 passed; schema, quote/date/outlet/hour boundaries, provenance, merchant conflict, capture isolation, fixture determinism, scoring, provider bounds/errors and research gate |
| `npm test -- --maxWorkers=2`  | 44 files, 882 tests passed with existing timeout settings; covers direct sources, publication/persistence, social, progress ledger, Batch 1/2 and research regressions         |
| `npm run test:integration`    | 2 files, 55 passed; disposable local databases only                                                                                                                            |
| `npm run test:corpus`         | 3 files, 4 passed; 136 sources, 181 offers, 0 approved, 37 excluded, 144 unresolved, 18 requires split, 0 failed                                                               |
| `npm run typecheck`           | passed                                                                                                                                                                         |
| `npm run build`               | passed; existing dynamic filesystem tracing warning in src/server/mvp.ts remains                                                                                               |
| Scoped ESLint                 | passed for all NLP module/research/test code                                                                                                                                   |
| `npm run lint`                | fails in pre-existing ignored .local/source-substitution-pilot/inspect.ts (4 no-explicit-any errors) and upstream.ts (1); no task-code lint failures                           |
| Scoped Prettier check         | passed for changed code, fixtures, package.json and change documents                                                                                                           |
| `git diff --check`            | passed; new files additionally checked by Prettier                                                                                                                             |
| Offline 49-case benchmark     | passed, immutable four-artifact run; not a model-accuracy evaluation                                                                                                           |
| Adversarial McDonald's replay | scoring exposes 2 surviving contest-date fields; documented structural semantic limit                                                                                          |
| Hosted model benchmark        | not executed: no usable configured credentials/model; no hosted request attempted                                                                                              |

The first unrestricted parallel `npm test` run exposed an incorrect newly added parameterized weekday test plus two existing research timeouts/cleanup errors. The weekday test was corrected. With two workers and unchanged time limits, the full suite passes; test implementations and thresholds were not weakened. Temporary authoring scripts created for gold review were removed; their checked output artifacts remain.

## Acceptance evidence

Provider-independent strict input/output schemas and shared prompt exist. Vendor HTTP/envelope code remains in openai-provider.ts, never the direct-source domain. Every accepted nonempty fact has an exact supporting quote; invalid/missing quotes and malformed/unsupported outputs fail closed. Gregorian dates/year support/range ordering and outlet/scope/hour constraints are exercised. Exact strings do not establish semantic entailment, as the adversarial date result demonstrates.

Mapper reuses newCandidate/cite/finalizeCandidate and passes the unchanged directPromotionCandidateSchema. It retains source evidence IDs/selectors/exact provenance, separates registry merchant context, reports explicit conflicts and blocks all research candidates. Non-promotions yield no candidate; uncertain cannot be complete. Candidate mapping retains full isolated source text, including unrepresented restrictions. There is no DB write or publication hook.

Gold includes 49 cases across seven web merchants and four Instagram accounts, with exact capture hash/selector verification and supported/unknown partitions. Bari card isolation excludes related and neighboring offers, McDonald's meal dates stay unknown, Sushiro cannot gain a missing year, and Captain Kim venue/takeaway inputs share one schema. Checked outputs and scoring are deterministic; default CLI has no model/network requirement. The explicit hosted path is bounded, times out and makes no retries.

375 protected files are byte-verified, including existing direct-source modules/registry/publication/persistence, captured fixtures/corpus and the previously recorded next-env.d.ts development baseline. Next build regenerated next-env.d.ts; its known development content was restored and matched the pre-existing coverage-batch-2 SHA-256. Production enabled sources remain Pepper Lunch and Shake Shack; Paradise, Gourmet Carousel, FairPrice, Kris+, Dian Xiao Er, Captain Kim, McDonald's, Sushiro and Bari remain shadow. Existing blocked/candidate states and direct-source-v2 remain unchanged.

No production/shared application records were read or written. Integration tests used only temporary local test databases, creating/removing them through the existing local test harness. No migrations were applied to application databases. No scheduler, worker, continuous observation process, merchant acquisition, Telegram recollection, Instagram acquisition, OCR, image/video interpretation, commit or push occurred. Documentation lookup used official OpenAI API documentation only. No UI changes were made; browser/E2E UI tests were not required for this isolated research module.

## Review and limits

Self-review checked source boundaries, metadata exclusion, malformed output handling, merchant context, provenance group spans, filename/run isolation, provider secret/error handling, zero retry behavior, scoring denominators and current-parser/gold separation. It narrowed all-outlet wording validation so 'all items at outlets' does not count as universal outlet scope, retained accepted location wording while citing a covering source span, and removed an overly broad reviewed benefit alternative that omitted price.

The production-critical zero-survivor target is not established by fixture replay. Two deliberately injected contest-date fields survive structural checks. Exact quotes can similarly mask a wrong scalar interpretation or participation role. Gold equivalence/grouping is conservative and requires review before claiming model hallucinations. Live provider/API compatibility and reliability remain unverified. Readiness is A (benchmark only); B/C/D are not justified/authorized. See evaluation.md, evaluation-metrics.json and validator.md.
