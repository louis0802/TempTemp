# Evaluation — decision A

Executed 3 October 2026, Asia/Singapore. Research implementation and evaluation completed; semantic readiness failed. Parent source review, no judge agents, retries, best-of-N, semantic repair or fallback. Both stages use requested and accepted gpt-6-luna, medium reasoning, fork_context=false, concurrency at most four. All 127 agents are distinct and closed. Backend revision unavailable. Tool prohibition is prompt-enforced because spawn has no mechanical disable parameter.

Run root: `.local/promotion-nlp-subagent-v3/2026-10-03T09-56-16-103Z-8c53a050-3330-4cee-87ec-f4bfc68cc3d7`. Raw responses are stored exclusively before parsing in stage-specific records; both raw seals precede gold scoring. Gold was authored/reviewed by the parent in benchmark preparation, then frozen before launch; blind agents received no annotations, parser, old outputs or source review. Runtime task preparation/generation hashes gold bytes without interpreting it. Stage 2 inputs are exactly case/proposition IDs, neutral merchant/title hints and sealed central/supporting quotes. No sibling/unassigned/full-source object is forwarded.

| Artifact | SHA-256 |
| --- | --- |
| segmentationSchema | `056099742d21bcf860d2325238e5939ea4e3cdc503c4334528e107d9e7c27e4b` |
| segmentationPrompt | `637dea6ee5b11fb68fc1ecd699612bbf5a7b017f56185875d0eb62149d3e94a4` |
| extractionSchema | `4f0fcdc0e3fdccb7df2edcb8cdf593cd9c4b7334778972e067bd65a8ff2dc392` |
| extractionPrompt | `d851f298263982ca11bad4ecee6b75f1e5033aea5cb0bd204faf59a29a24ca8f` |
| validator | `fbac3d5865596175e0463a0d5049b95f025b617123b67021ed2baf0fab9f0aec` |
| benchmark | `fcd2cddd9d8327499d1ab12cd4bb306ba77c4c4ef02e6254ea9b2f43edb8e46a` |

Segmentation raw seal: `ae4320c80a46b4c2135934abdb8e976ab3f30c685dda4f02fa7eb29470e73b37`.
Extraction raw seal: `a24a8f92bbf7971832d87b1a13dbb3bd9b331076143396724de6f4af7443d153`.
V2 raw seal: `f5a7a70afd38085ba1c615833ee913432d452e376726c7bc35e39e0e730b248a`.
V1 raw seal: `786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a`.

Manifest freezes schema/prompt file bytes in addition to the emitted-schema and instruction-content hashes above, validator/scorer/runner/annotation/contracts, source captures and all code/tests protected at preparation. Initial baseline protects all preexisting code/config/docs/captures/sealed V1/V2 files. Seals are integrity detectors, not claims of filesystem immutability or semantic truth.

49 sources; Stage 1 49 completed, no syntax/schema/transport errors, two exact-span rejected sources, 47 usable. 78 sealed valid units produce 78 extraction tasks. Stage 2 78 completed, eight syntax failures, two schema failures, no execution/missing results; 68 usable. Malformed outputs retain braces/suffixes exactly and are never repaired. Ten extraction failures occur on ten sources; with two different Stage-1 rejects, 12/49 sources have some unassessable output. All49 sources and all78 generated units stay in the relevant quality denominators.

Stage 1 source review: presence 53/58 expected propositions (91.38%), 27 extra units relative to minimal gold (26 harmless editorial subdivisions and one harmful Student economics fragment), two risky merge cases, one harmful split, one operational Monday attachment, eight required support clauses missed, two cross-proposition group attachment cases. Presence includes members of merges: only 47/58 are independently complete/scoped. Frozen automated scores remain 46/58 recall, 34 unexpected, one merge, zero harmful splits, six pairwise attachments and three missed support flags. Equivalent central wording explains seven additional recalled targets; source review finds the supporting-group Bari merge and Student economics split not captured by the frozen central-anchor tests.

Stage 2 reviewed local classification: promotion precision 30/31 (96.77%), recall 30/39 (76.92%) across all generated inputs; usable recall 30/31 (96.77%). Non-promotion correctness 35/38 (92.11%), usable 35/36 (97.22%); explicit uncertainty 2/78 (2.56%). Input-conditioned targets reflect actual sealed inputs: Student's isolated product unit correctly appears non-economic because its economic context was split off; that loss remains an end-to-end segmentation failure. Per-unit classification and every raw/accepted field/constraint audit are stored in source-review.json. No gold target or frozen score was rewritten.

Source-level independent economic identity/classification recovery is 28/43, with 15 misses and one false contest promotion. It does not mean complete, safe fact/restriction coverage. Source-presence recall is 29/39 (74.36%): Bari's merged source still has real economics but not correct independent groups. Presence precision is 100% only because collapsing units hides the false contest within an already-positive source. Never use that number as a safety claim.

Reviewed usable safety: one surviving cross-proposition time/location leakage case; zero fabricated literal calendar dates, but two wrongly scoped economic-validity fields on the false contest; zero invented numeric clock endpoints, with one wrong time-group association; zero availability-Monday errors, polarity reversals, physical participating-identity inventions and unstated years. Two generic location-domain errors survive. Constraints: seven raw / six accepted attribute errors, at least three material meaning changes, three raw text-containment failures / zero accepted, nine raw / twelve accepted material clauses missing across nine cases. One benefit qualifier/portion-loss case. Rejections can safely omit evidence yet still lose required conditions. These observed zeros cover 68 usable outputs only; failures are unknown.

Accepted field audit: 22 date fields, twenty with correct economic-validity role and two false-contest validity fields; explicit clocks are supported but Bari Salad loses outlet/time correlation. Bari Dinner's duplicate equivalent 17–18 ranges are harmless. Frozen matched-anchor field totals (dates34/weekdays36/times35) are retained in evaluation-metrics.json and are not all-unit semantic percentages. Validator produces 52 issue events (including ten malformed-envelope issues), three counted local-quote mismatches and three constraint containment failures. Benefit rejection happens in three usable units. Every output is reviewed beyond automatic flags; source-review.json records dispositions, field evidence, rejected and surviving facts, every emitted condition, missed clauses and comparison rationale.

| Case | Reviewed outcome |
| --- | --- |
| Student Meal | Before/after source units separate; no forbidden dine-in in after-task. Before-offer economics harmful split; after extraction malformed. Cannot claim a usable Student success. |
| Collab Partners | Editorial non_promotion + fries promotion, zero editorial fact leakage. Quiz redemption tagged timing incorrectly. |
| Local Faves | Usable promotion; weekdays null and no inferred year. Operational Monday remains attached in Stage 1; mandatory login/QR/cashier steps unassigned and omitted. |
| Bari Weekday Lunch | opening_to end 17:00 accepted; no midnight. Separately, Bari Salad Bar has surviving group/time leakage; Bari Senior extraction malformed. |
| McSaver | Proper segmented exclusion input; economic output syntax malformed. No repaired claim that V2 polarity gain is fully retained here. |
| bfmcsaver | Meal promotion has null dates and explicit exclusions; contest separate but falsely promotion, with invalid economic validity from its own submission dates. |
| Sushiro | Two usable product non-promotions, one malformed product. No invented year, positive coverage or accepted participation from price variation. |
| Captain Kim venue/takeaway | Same schema supports student, September 4+1 and takeaway; early-bird merged/schema-malformed, October 4+1 malformed. Lowest-paying diner eligibility wrong; Flash this page omitted. |
| Instagram | Shinrai/off-peak/Starbucks usable with unknown years, extracted clocks and null scope; Sinpopo malformed. Reservation success unassessable; Starbucks member restriction omitted. |

The frozen scorer's false physical-invention flags are reclassified as generic domain misuse; whole-clause atomic-attribute flags are reviewed under the frozen composable definitions. Supporting-group leakage omitted by the automated scorer is explicitly added by parent review. No semantic oracle or independent assessment is claimed. Source review is a separate immutable-run overlay, never used to alter tasks, responses, gold or frozen code.

Full required final-report coverage:

| # | Requested item | Result |
| ---: | --- | --- |
| 1 | Segmentation schema/prompt hashes | 056099742d21bcf860d2325238e5939ea4e3cdc503c4334528e107d9e7c27e4b / 637dea6ee5b11fb68fc1ecd699612bbf5a7b017f56185875d0eb62149d3e94a4 |
| 2 | Extraction schema/prompt hashes | 4f0fcdc0e3fdccb7df2edcb8cdf593cd9c4b7334778972e067bd65a8ff2dc392 / d851f298263982ca11bad4ecee6b75f1e5033aea5cb0bd204faf59a29a24ca8f |
| 3 | Validator hash | fbac3d5865596175e0463a0d5049b95f025b617123b67021ed2baf0fab9f0aec |
| 4 | V3 benchmark hash | fcd2cddd9d8327499d1ab12cd4bb306ba77c4c4ef02e6254ea9b2f43edb8e46a |
| 5 | Source cases | 49 unchanged captures |
| 6 | Stage-1 fresh agents launched | 49 |
| 7 | Stage-1 completed | 49 |
| 8 | Stage-1 malformed | 0 syntax; 0 schema |
| 9 | Stage-1 execution errors | 0; exact-span rejection 2, usable 47 |
| 10 | Sealed proposition units | 78, automatically generated after Stage-1 seal |
| 11 | Stage-2 fresh agents launched | 78 |
| 12 | Stage-2 completed | 78 |
| 13 | Stage-2 malformed | 8 syntax + 2 schema = 10/78 (12.82%) |
| 14 | Stage-2 execution errors | 0 |
| 15 | Proposition recall | Reviewed presence 53/58 (91.38%); frozen anchor 46/58 (79.31%); independently complete/scoped 47/58 (81.03%) |
| 16 | Merge errors | 2 reviewed cases: Captain Early Bird and Bari Salad; frozen central anchors detect 1 |
| 17 | Harmful splits | 1 Student Meal economics fragmentation; frozen scorer reports 0 |
| 18 | Ambiguous clauses attached | 1 operational Monday clause, no accepted availability-day error |
| 19 | Promotion precision | 30/31 = 96.77% per generated unit, source reviewed |
| 20 | Promotion recall | 30/39 = 76.92% input-conditioned generated units; usable 30/31 = 96.77%; independent E2E identity 28/43 = 65.12% |
| 21 | Non-promotion correctness | 35/38 = 92.11% all generated non-promotion units; usable 35/36 = 97.22%; complete source controls 5/8 |
| 22 | Cross-proposition leakage | 1 accepted Bari Salad time/location group case |
| 23 | Invented dates | 0 fabricated literal calendar values; 2 invalid economic-validity fields on false contest; 1 raw uncertain activity end rejected |
| 24 | Invented numeric time boundaries | 0 observed usable; wrong time-group association 1; ten malformed extraction units unknown |
| 25 | Unrelated weekday associations | 0 observed usable; Local Faves availability weekdays null |
| 26 | Participation polarity errors | 0 observed usable; McSaver economic malformed |
| 27 | Invented participating physical branches | 0; generic collective-location domain errors 2 |
| 28 | Constraint attribute errors | 7 raw / 6 surviving reviewed events; frozen flags 17 / 17 are not semantic error totals |
| 29 | Benefit qualifier-loss cases | 1 $uper Value Deal portion/from-loss value risk; frozen qualifier flags 0 |
| 30 | Student Meal result | Before/after source units separate; no forbidden dine-in in after-task. Before-offer economics harmful split; after extraction malformed. Cannot claim a usable Student success. |
| 31 | Collab Partners result | Editorial non_promotion + fries promotion, zero editorial fact leakage. Quiz redemption tagged timing incorrectly. |
| 32 | Local Faves result | Usable promotion; weekdays null and no inferred year. Operational Monday remains attached in Stage 1; mandatory login/QR/cashier steps unassigned and omitted. |
| 33 | Bari opening-to result | opening_to end 17:00 accepted; no midnight. Separately, Bari Salad Bar has surviving group/time leakage; Bari Senior extraction malformed. |
| 34 | McSaver result | Proper segmented exclusion input; economic output syntax malformed. No repaired claim that V2 polarity gain is fully retained here. |
| 35 | bfmcsaver result | Meal promotion has null dates and explicit exclusions; contest separate but falsely promotion, with invalid economic validity from its own submission dates. |
| 36 | Sushiro result | Two usable product non-promotions, one malformed product. No invented year, positive coverage or accepted participation from price variation. |
| 37 | Captain venue/takeaway result | Same schema supports student, September 4+1 and takeaway; early-bird merged/schema-malformed, October 4+1 malformed. Lowest-paying diner eligibility wrong; Flash this page omitted. |
| 38 | Instagram result | Shinrai/off-peak/Starbucks usable with unknown years, extracted clocks and null scope; Sinpopo malformed. Reservation success unassessable; Starbucks member restriction omitted. |
| 39 | V2/V3 semantic comparison | Partial association/time gains, remaining Stage-1 correlation leak and local classification/constraint errors; decision remains A |
| 40 | V2/V3 malformed comparison | V2 9/49 vs V3 Stage 2 10/78; source incompleteness V3 12/49 including span rejects |
| 41 | Cases improved | 13 |
| 42 | Cases regressed | 14; syntax/coverage regressions distinct from semantic regressions |
| 43 | Segmentation eliminates V2 association failures | No: named Student/Collab boundary gains, but Student malformed and new Bari merge leakage |
| 44 | Time representation removes invented lower bounds | Yes in usable Bari Lunch; Senior malformed so no success claim for that output |
| 45 | Constraint representation sufficiently stable | No: material role errors and restriction omissions remain despite valid composable overlaps |
| 46 | A2 justified | No; decision A |
| 47 | Strict-output/API evaluation next | Not the immediate next step; first improve segmentation correlation and local semantic contract, then consider separately authorized comparison |
| 48 | Production files unchanged | All 1,063 preexisting file byte hashes unchanged; only new research files added |
| 49 | Activation unchanged | Verified in protected bytes |
| 50 | direct-source-v2 unchanged | Verified in protected bytes |
| 51 | Production DB operation | None |
| 52 | Fresh acquisition | None |
| 53 | Telegram recollection | None |
| 54 | OCR/media analysis | None |
| 55 | Hosted model API call | None; only requested Codex subagents |
| 56 | Commit | None |
| 57 | Push | None |
