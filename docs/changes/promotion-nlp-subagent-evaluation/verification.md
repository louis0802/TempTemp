# Verification

Verified local research execution on 2 October 2026 (Asia/Singapore). This evaluates Codex gpt-6-luna subagents, not a production API model. All 49 fresh tasks were explicitly configured with the same model and medium reasoning, fork_context=false; concurrency four. All returned first outputs, all were persisted before parsing, and all 49 distinct agent IDs are recorded. No retries, model fallback, or judging agents.

## Checks actually run

- Before extraction: `vitest run tests/promotion-nlp-subagent.test.ts` — 18/18 passed. Gold/parser sentinel tests, exact projection/prompt boundary, 49 default cases, one case per identity, malformed preservation, no repair, sealed-gold ordering, stable completion order, duplicate/missing/reused-agent failure handling, existing-validator equivalence, credential omission, model fallback rejection, no provider/network acquisition, and protected-state invariants.
- After extraction: `vitest run tests/promotion-nlp.test.ts tests/promotion-nlp-subagent.test.ts` — 89/89 passed.
- `npm test` — initial result 899/900 passed, one unrelated `research-v4.test.ts` 15,000ms timeout under default worker contention.
- `npm test -- --maxWorkers=4` — 900/900 passed in 45 files. Original timeout limits and assertions unchanged; no excluded test or semantic extraction retry.
- `npm run typecheck` — passed.
- Scoped ESLint with `--max-warnings 0` on the two new TypeScript files — passed, zero warnings.
- Prettier check on the two new TypeScript files and change documentation — passed.
- `git diff --check` and added-file whitespace checks — passed.
- Git ignore check confirms the run directory is ignored. All 113 protected files match pre-run hashes; current HEAD matches recorded commit. Existing dirty changes are preserved.
- Post-seal local capture verification — all 49 source texts match their hashed captured fixtures using the existing `readCapturedText`; no acquisition or adapter execution.
- Final artifact checks — 49 unique gpt-6-luna identities, raw seal unchanged, no orchestrator gold/parser keys in raw results, no credential-shaped API keys or credential metadata fields in the six required artifacts.

## Acceptance evidence

Projection creates a new object with only id, merchantHint, titleHint and normalized SOURCE_TEXT. Runtime hints, URLs, publication times, notes, gold, parser output, previous answers, and scores are absent from the subagent message. The current v1 prompt and schema are supplied unchanged with a source-only/no-tools wrapper; per-task input and complete prompt hashes are in the manifest.

All responses are exact saved strings, including five JSON syntax failures with an extra closing brace. No output was repaired. Raw JSON is sealed before the scoring function reads gold. Scoring rereads persisted raw output and verifies its seal and per-record hashes; malformed outputs remain failures in all 49-case denominators. The gold-leak prevention test passed.

Raw seal SHA-256: `786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a`. Benchmark SHA-256: `ec9228dcf8acce9c1e31e5f046d323856bda4db4b2bcfd487fd189d0fcd2791e`. Prompt v1 SHA-256: `6de0db63bf3baffb78a8c38f09ccc9dbd737487507a32f9e567ef2dd21334c6a`. Schema v1 SHA-256: `2b42cb3afc017bc3ece8a16ce068259bd36389532bcd795e4576377ca9d02900`.

Source review enumerates all 18 official critical survivors. Two McDonald's excluded-outlet lists survive with the wrong participation role; a Concrete Craze secondary deadline survives; unknown scope and grouping/coverage/normalization discrepancies also remain. The contest-date and missing-year checks pass naturally. A2 is rejected; production readiness is not inferred.

## Boundaries and limitations

No hosted model/provider API call, production DB operation, activation change, direct-source-v2 change, fresh merchant acquisition, Telegram recollection, OCR/media analysis, project commit, or push. Existing validator/scorer/prompt/schema/provider, adapters, publication/persistence, source registry, migrations and reviewed gold remain byte-for-byte unchanged. Only two research TypeScript files and this change directory were added. Artifacts use allowlisted metadata, never load environment credentials, and raw results contain no orchestrator gold/parser fields.

No shared production code changed; integration/corpus/build were not required for this research-only slice. No live UI changed. Git was already dirty at preparation; whole-tree cleanliness is not a success criterion.

Isolation limitation: agents received fresh conversation contexts, but the Codex spawn tool does not expose mechanical tool denial or a separate filesystem sandbox. No-tools/source-only behavior was required in their prompts. Do not claim stronger technical isolation than the execution interface supplies. Model selection is explicit/accepted gpt-6-luna; backend revision identity is unavailable. Source review is the parent's post-seal review, not an independent model/human judge. Exact-match unsupported totals include source-supported paraphrases/grouping and are not independently established hallucination counts.
