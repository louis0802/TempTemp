# Requirements

1. Select all 49 reviewed cases by default; one unique case maps to one fresh gpt-6-luna task. No model mixing, answer retries, or external judges.
2. Supply only case ID, merchant/title hints, normalized SOURCE_TEXT, v1 extraction instructions, and strict schema. Hints are not evidence. Exclude gold, notes, parser results, URL/date context, prior answers, and scores. A secret-sentinel test must prove projection and prompt isolation.
3. Preserve each exact response before validation/scoring. Invalid JSON/schema is a model failure, not an invitation to repair. Infrastructure failure is execution_error. Duplicate results fail closed; missing cases are explicit failures.
4. Finish extraction and seal persisted raw results before reviewing gold. Scoring must reread sealed disk records, verify hashes, and reuse the unchanged validator and scorer. All cases remain in denominators.
5. Report existing classification/field/safety metrics, task/completion/error counts, accepted facts, zero-fact/uncertain/validator-changed cases, parser differences, and every critical survivor. Review McDonald's contest dates, Sushiro year, Bari segmentation, Captain layouts, Shake Shack/FairPrice classification, and Instagram conservatism.
6. Write the six requested ignored run artifacts and metadata with benchmark/prompt/schema hashes, commit/dirty state, timestamps, explicit model configuration, and task identity. Do not serialize credentials or gold into raw results.
7. Recommend at most A2; justify each safety criterion. Preserve critical failures without prompt/schema/validator patches. API-model evaluation is a separate future decision.
8. Verify focused tests, unit suite, typecheck, scoped lint, format/diff, and protected file hashes. No production operations or fresh merchant/Telegram/OCR/media acquisition.

Open product decisions: none. User explicitly selected gpt-6-luna for every task. If that selection or fresh-context spawning is unavailable, stop the live run and report it.
