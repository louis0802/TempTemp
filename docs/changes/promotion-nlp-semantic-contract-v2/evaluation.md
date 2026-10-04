# Evaluation

**Decision A — v2 is not yet safe enough for A2.** It improves participation polarity and removes several v1 false promotion/date errors, but does not materially solve primary proposition/availability association or consistent restriction roles. A structural association quote cannot establish entailment.

Executed 3 October 2026 Asia/Singapore. Parent-authored source review, no independent judge. 49 cases, 49 fresh gpt-6-luna/medium subagents, concurrency four, no forked history/tools permitted in prompts, no retries/fallback/semantic repair. Tools are not mechanically denied by runtime. The accepted requested model is fixed; backend revision unavailable. The parent necessarily reviewed source/v1 gold before freezing annotations; blind agents received only ID/hints/source/v2 prompt/schema. Evaluation gold loaded only after persisted seal.

## Contract and run identities

| Item | Version | SHA-256 |
| --- | --- | --- |
| Schema | promotion-nlp-schema-v2 | 34d800a5f94d3b4ff0ac56223908164f3779f31cf411132ae6f388f3d92d9180 |
| Prompt | promotion-nlp-prompt-v2 | 01e7fb0191bcf359a2c74de53dbf8bd628227a10dc70a98633fbf227ce2ba39c |
| Annotation | benchmark-v2 | 51624f31f62ac7af751f788da29a9ad28f31c4d9525cac016529d13d4efb2f5e |
| Validator | promotion-nlp-validator-v2 | 7c71447ca7f8d1948a885c01d30a66bcdca4b707ae516c5ab941a3f688490c89 |
| Roles | frozen semantic-contract.md | 240908cbd9eba0840030b3fe7703d807572f76c0976bc82ecdf59fcb67e67c01 |
| V1 gold | unchanged benchmark.json | ec9228dcf8acce9c1e31e5f046d323856bda4db4b2bcfd487fd189d0fcd2791e |

V2 raw seal: `f5a7a70afd38085ba1c615833ee913432d452e376726c7bc35e39e0e730b248a`. Schema hash is emitted JSON schema; prompt hash is exact instruction text; validator/annotation/roles hashes are file bytes. Manifest also freezes all implementation file bytes, including schema/prompt TS files, scorer and runner.

Run root: `.local/promotion-nlp-subagent-v2/2026-10-03T07-01-35-641Z-258f1bbf-b09c-443b-b714-5d7492cc98f8`. `manifest.json`, `launches/`, `records/`, `raw-results.json`, `raw-seal.json`, `validated-results.json`, `scores.json`, `source-review.json` preserve provenance. Every raw response has its own SHA. First output was persisted before parsing/scoring. All 49 agents closed.

49 completed outputs; 9 syntax malformed; 0 schema malformed among JSON-parseable outputs; 0 execution errors; 0 missing; usable outputs 40. Every malformed response retained exactly, including extra braces and suffix/control-like material. No repair or semantic retry. Free-form Codex response formatting is not equivalent to a strict Structured Outputs API.

## Classification and coverage

| Denominator | Precision | Recall | Non-promotion correctness | Uncertain rate |
| --- | ---: | ---: | ---: | ---: |
| V1 all 49 | 89.47% | 87.18% | 62.50% | 12.24% |
| V2 all 49 | 100.00% | 69.23% | 87.50% | 8.16% |
| V2 usable 40 | 100.00% | 90.00% | 87.50% | 10.00% |

Malformed rate increased from 5/49 (10.20%) to 9/49 (18.37%). V2 usable precision is useful, but all-case recall regresses and safe uncertainty misses definite offers. Uncertainty definitions differ: the sealed v1 official 12.24% includes five malformed fail-closed uncertain defaults; v2's 8.16% excludes malformed outputs from uncertainty and reports them separately while retaining denominator 49. Harmonized usable accepted-uncertainty counts are v1 1/49 (2.04%) and v2 4/49 (8.16%); among usable cases 1/44 (2.27%) versus 4/40 (10%). Do not present the official rates as a direct uncertainty improvement. Raw-label non-promotion correctness among usable cases is 8/8; accepted correctness is 7/8 because Aloha's exact quote fails. Uncertain rate here means usable explicit accepted uncertainty divided by the stated denominator; malformed outcomes are a separate class, not added as model uncertainty.


Primary denominator retains all 49 and all 39 gold promotions. True positives 27; promotion recall 27/39, precision 27/27. All eight gold non-promotions remain in the denominator: accepted correctness 7/8. Six usable accepted classification mismatches plus nine unassessable outputs make 15 all-case output classification errors. Five raw label mismatches; Aloha adds the sixth due quote rejection. Parseable precision/recall are 100%/90% (27/30 gold promotions in 40 usable cases). Source role/primary validity is reviewed separately: a numerically matching class label does not guarantee a valid primary proposition.

## Source-reviewed semantic metrics

Counts below are events and case counts over usable outputs. All-case denominator remains 49; 9 unassessable cases are disclosed, not assumed safe. Parseable denominator is 40. Raw and surviving counts exclude unrepaired malformed content.

| Metric | Raw events / cases | Surviving events / cases |
| --- | ---: | ---: |
| primary_secondary_association_errors | 2 / 2 | 2 / 2 |
| participation_polarity_errors | 0 / 0 | 0 / 0 |
| invented_validity_facts | 0 / 0 | 0 / 0 |
| invented_participating_location_identity | 0 / 0 | 0 / 0 |
| unsupported_positive_location_scope | 0 / 0 | 0 / 0 |
| unrelated_schedule_association | 1 / 1 | 1 / 1 |
| restriction_role_errors | 10 / 8 | 7 / 6 |
| benefit_qualifier_loss | 0 / 0 | 0 / 0 |
| primary_classification_errors | 5 / 5 | 6 / 6 |
| cross_campaign_contamination | 1 / 1 | 1 / 1 |
| unstated_year_inference | 0 / 0 | 0 / 0 |

Observed semantic case rates use the primary denominator 49, including nine unassessable cases, and a separate usable denominator 40 in evaluation-metrics.json. For example: primary association 2/49 (4.08%) observed versus 2/40 (5.00%) usable; raw role errors 8/49 (16.33%) versus 8/40 (20.00%); surviving role errors 6/49 (12.24%) versus 6/40 (15.00%). Zero observed error rate with nine unknowns is not a 49-case safety pass.

`primary_classification_errors` in the semantic table are five raw label mismatches / six accepted label mismatches among usable outputs. The wrong declared economic primary in Collab Partners is additionally counted as primary association error; do not hide it behind a matching promotion label. Missing/malformed classes remain in all-case output quality, not in fabricated semantic facts.

There are zero invented start/end dates in usable outputs, but **one invented availability boundary survives**: Bari Weekday Lunch assigns `00:00–17:00` to `Opening to 5PM`. The date-only metric does not establish broader validity safety. `opening–17:00` in Bari Senior is a rejected nonnumeric representation, not an invented numeric hour. No Sushiro year inference, no Bari sibling-card contamination, no newly acquired text or source-boundary contamination.

Two accepted primary association errors: Student Meal includes a dine-in condition explicitly associated with before-5pm Student Meal Dishes while selected primary is after-5pm main-menu discount (association ambiguous, should omit); Collab Partners declares merchandise editorial as the primary while definite promotion classification points at a separate fries offer. The first is counted as within-source cross-proposition restriction contamination. Local Faves additionally has visible `[1]` Monday in its malformed raw response. That qualitative observation is excluded from numeric structured metrics, never converted into repaired JSON; the regression is therefore not proven fixed.

Automated identity flags (3) are reviewed rather than renamed hallucinations: Tampines 1 outlet is the same source-supported physical identity; two all-outlet phrases are generic scope mistakenly put in locationRules, not fabricated branches. **Physical identity invention 0; location-rule domain errors 3 usable cases / 4 items** (two all-outlet phrases and two holiday names). A correct Parkway full label is a canonical-label difference only.

Restriction role errors: 10 raw events (8 cases), 7 surviving (6 cases). Lowest-paying diner eligibility, purchase prerequisites, social follow, seating deadlines and genuine dine-in/takeaway channels work in several cases; spoken ordering phrase, availability, per-booking condition and reservation still misclassify. The cashier subclause is a correct redemption channel despite overlapping whole-clause gold; its automatic flag is dismissed with rationale. Unmatched administrative clauses were reviewed individually. Mixed clauses retain source conditions but atomic decomposition is imperfect. No role definition changed. See source-review.json for every emitted restriction and automatic-flag disposition.

Benefit qualifier loss is 0 on usable outputs, but not full benefit success: five benefit fields are rejected because a correct source-supported subset differs from the complete supplied quote. FairPrice keeps From in raw/primary evidence but its accepted benefit is null. Finest Wine emits generic Wine Deals in the benefit slot; it is unquantified marketing wording, not a numeric discount hallucination. Literal Finest merchant text is semantically ambiguous and does not establish FairPrice Finest.

Quote mismatches: **13 issue events**, of which **2 literal fact quote mismatches and 11 association quote mismatches**. Some are noncontiguous concatenations of real source fragments. Validator rejections: **32 issue events** across the run, including nine malformed-envelope issues. Different rejection reasons can apply to one field; these are not 32 invented facts. No value or quote was silently repaired.

## Critical cases

| Case/group | Result | Limit |
| --- | --- | --- |
| McDonald's McSaver | Promotion; positive scope null; Lido/Gardens/Changi explicitly excluded | Benefit field rejected on equality, primary quote retains $5 |
| McDonald's bfmcsaver | Uncertain/empty; contest dates and meal validity stay null | All exclusions/meal offer omitted; abstention is not polarity fidelity |
| Concrete Craze | Non-promotion, no primary/date/benefit | Frozen target uncertain; unsafe secondary date removed |
| Veggie Shack | Non-promotion, no contest facts | Frozen target uncertain; secondary contest not elevated |
| Local Faves | Malformed original retained | Visible Monday weekday repeats error; unassessable structured output |
| Sushiro | Non-promotion, all promotion facts null | No year inferred; product control correct |
| Bari | Five usable isolated cards; no sibling/source contamination; named identities source-supported | Lunch invented midnight survives; senior invalid range rejected; dinner dine-in condition rejected |
| Captain venue | Student/Early Bird/September 4+1 usable with dates, roles and safe multi-group hours | October 4+1 malformed; cannot claim 4/4 venue compatibility |
| Captain takeaway | Promotion 20% regular items; takeaway channel; venue/date/scope null | Flash this page requirement omitted |
| Instagram | All four raw scopes are visibly null; three usable retain scope null | Starbucks malformed; Sinpopo reservation rejected; availability constraint loss |

## Comparison and decision

Per-case comparison, exact categories and mixed outcomes are in v1-v2-comparison.md/source-review.json. Precision and non-promotion control quality improve, but all-case recall and syntax rate regress. Material v1 participation reversals are gone in usable v2 outputs; one case preserves exclusions and the other abstains. Primary association is not consistently conservative; restriction taxonomy reduces overloaded grouping but does not eliminate role mistakes. Extra evidence fields invite fabricated concatenated association quotes. The raw safety seal is a provenance boundary, not semantic proof.

A2 is **not justified**: accepted ambiguous cross-proposition restriction, wrong definite primary and invented numeric availability remain; Local Faves is not fixed merely because it is malformed. Next should be another contract/segmentation/output-format research iteration with primary evidence/association review coverage and a real named-location identity boundary. An API-model/strict Structured Outputs comparison would help isolate formatting later, but it should not be the immediate substitute for resolving semantic failures; no API run is authorized or performed. No B/C/D recommendation.

Production files, source activation, direct-source-v2, publication/persistence, merchant adapters and Telegram unchanged. No hosted model API, acquisition, DB action, recurring worker, commit or push. All initially protected 245 file bytes and the complete original sealed v1 artifacts are verified unchanged. Tests are research-only.
