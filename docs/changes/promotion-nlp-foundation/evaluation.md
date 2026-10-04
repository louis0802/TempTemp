# Evaluation and operation

49 source-reviewed cases cover Pepper Lunch, Shake Shack, Captain Kim, McDonald's, Sushiro, Bari Bari Steak, FairPrice and existing SHINRAI/Ajumma's/Sinpopo/Starbucks Instagram captions. Web detail, blog, venue section, takeaway heading, exact listing card, multi-offer page, image-led product text, catalogue card and captured caption layouts are represented. See benchmark-design.md for source boundaries and annotation limits.

No live provider/model was used. Credential/configuration presence was checked without exposing values; neither a usable OpenAI key nor PROMOTION_NLP_MODEL was available. Hosted accuracy, actual model hallucination rates, useful NLP additions and cases where the current parser outperforms a real NLP model are unmeasured. Do not interpret fixture replay as evidence of model reliability.

The checked offline contract replay classifies all gold cases correctly: promotion precision 100%, recall 100%, non-promotion correctness 100%, uncertain rate 2/49 (4.08%). These are replay/validator/scorer checks only. Exact accepted supported fields are below; misses, incorrect values, unsupported unknown-field values, quote mismatches and validator rejections are zero for this intentionally gold-matching replay.

| Field           | Exact supported accepted |
| --------------- | -----------------------: |
| merchant        |                       25 |
| title           |                       37 |
| benefit         |                       36 |
| startDate       |                       16 |
| endDate         |                       16 |
| weekdays        |                       17 |
| hours           |                        5 |
| locationScope   |                       20 |
| locationNames   |                        6 |
| locationWording |                       20 |
| eligibility     |                       12 |
| redemption      |                       33 |
| terms           |                       33 |

Date outcomes: 16 accepted starts and 16 ends; missing years/validity remain unknown. Location outcomes: 20 scopes/wordings and 6 name lists; unresolved selected participation stays unresolved. Offline raw unsupported fields/catches/survivors and quote mismatches are all zero because the fixture outputs intentionally match gold.

A separate adversarial replay injects McDonald's contest dates into meal validity with exact quotes. Its two raw unsupported date fields both survive structural validation; catches=0, `unsupported_fact_survived_validation=2`, critical survivors=2. The scorer and report expose the failure. It is a deliberately injected fixture, not a hosted model result. This demonstrates why exact substrings alone cannot establish primary-offer meaning and why the zero-survivor publication target is not proven.

Current parser comparison is available for 46 cases; FairPrice's current candidate boundaries do not correspond to these three minimal textual cards, so comparison is explicitly unavailable there. Current classification matches gold in 35/46 cases. The gold-matching fixture has 419 exact field agreements, 108 supported additional fields, 71 differing parser limitations, zero parser-correct/NLP-missed fields and zero both-wrong fields. These compare the current parser with a checked contract replay, not a live LLM. Some differences are format/grouping or trusted-registry versus text-only merchant context and must be reviewed before claiming semantic superiority.

Useful gold facts the parser misses include Shake Shack's Flock This Way explicit bundle dates/all-outlet scope, Pucker up for $2 Lemonades offer dates, More Perks' explicit 2% earning benefit, and captured off-peak caption hours. A focused injected omission test confirms that a correct current-parser date is classified as `current_parser_correct_nlp_missed`; actual deterministic-parser superiority over a hosted model remains unmeasured. Raw/parser/validated/gold values and per-field classifications are preserved in results.json.

Bari exact-card/actual related-template exclusion, McDonald's unknown meal dates, Sushiro missing-year handling and Captain Kim venue/takeaway schema compatibility all pass. Sushiro gold is explicitly a product launch without a textual economic promotion; a malicious promotion/date payload still cannot invent its year. No media facts were supplied.

Readiness: **A, benchmark only**. **B, shadow execution is not justified** without live cross-merchant evidence and review of known semantic survivors. **C, new merchant adapters are not authorized in this slice**. **D, replacement/migration is not ready or authorized**. Publication, source activation and direct-source-v2 remain unchanged.

Run `npm run research:promotion-nlp` for offline replay. Live requires `npm run research:promotion-nlp -- --live`; `--case <id>` can be repeated and `--limit 1..60` restricts selection. Unknown arguments/IDs fail before requests. Hosted providers are refused in offline harness mode.

Server environment: `PROMOTION_NLP_OPENAI_API_KEY` (or existing OPENAI_API_KEY), required PROMOTION_NLP_MODEL, optional PROMOTION_NLP_TIMEOUT_MS (default 45000, max 60000), PROMOTION_NLP_MAX_OUTPUT_TOKENS (default 4096, max 8192), PROMOTION_NLP_TEMPERATURE (default 0, max 0.2; `omit` for models without temperature support). Configure through the environment; do not put keys into source, examples or artifacts. Transport failures/refusals/incomplete output are sanitized, scored as failures and never retried. Settings are bounded; all selected cases stay in metric denominators.

Each run creates a new ignored `.local/promotion-nlp/<timestamp-uuid>/` directory containing results.json, report.md, failures.json and run-metadata.json. Completed responses are checkpointed within that run. Prior run directories are never overwritten. Metadata includes provider/model, per-case request timestamps, safe settings, selection and benchmark/prompt/schema hashes. `evaluation-metrics.json` stores the exact offline/adversarial run references and summaries, without credentials.
