# Offline evaluator readiness

The reusable evaluator and tests are ready. This record covers evaluator infrastructure checks, not a final evaluation of the integrated preview. Parent reported that the initial preview was stale and will regenerate it after parser workers finish.

Owned implementation: `scripts/evaluate-mvp-offer-policy.ts` and `tests/mvp-offer-evaluation.test.ts`. All existing frozen manifests, expectations and receipts remain byte-identical. No parser, data artifact, research file or shared contract was edited by this work.

Checks actually run on 2026-10-06:

- Focused infrastructure/guardrail tests: **9 passed, 15 semantic/preview tests deliberately not run yet**. Command: `npx vitest run tests/mvp-offer-evaluation.test.ts -t 'integrity|grouping|denominators|mechanical unsupported endpoint'`.
- Scoped ESLint: passed without warnings.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Scoped Prettier: passed.
- Whitespace inspection of both newly added files: no findings (`git diff --no-index --check /dev/null <path>` returns 1 for an added file, even with no whitespace diagnostics).

The snapshot inspected during infrastructure checks contained **136 original sources / 180 export candidates / 200 legacy children / 207 preview records**. The evaluator separates the 200 original-corpus children from seven additional captured Pepper inputs. Those seven use their stored candidate and capture/receipt provenance and never enter the 136-source coverage denominator.

The parent protected snapshot currently reports changed bytes in `src/domain/promotion.ts` and `next-env.d.ts`. The evaluator preserves the expected and actual hashes and reports that a scoped parent review is required. It does not claim that an authorised shared type edit is byte-identical, nor infer semantic preservation from a hash difference. The frozen sidecar artifacts, export and legacy artifact checks pass.

After the final preview is regenerated, run:

```sh
node --import tsx scripts/evaluate-mvp-offer-policy.ts
npx vitest run tests/mvp-offer-evaluation.test.ts
```

The runner writes `parser-report.json`, `parser-report.md` and `source-review.json` under this directory even when safety gates fail, and returns exit status 1 for any failed gate. It records preview/current-parser parity so stale artifacts cannot be treated as current results. Exact findings remain in the reports; tests do not tune parsers or frozen expectations.

All review labels are Codex automated review, not human reviewed. Missing output is unknown or abstention, not correctness credit. The 79 family folds are correlated per-source diagnostics of the same shared parser, with development-family overlap; the 34 historical units remain diagnostic only.
