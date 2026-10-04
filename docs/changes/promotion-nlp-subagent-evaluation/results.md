# Final 41-point report

Codex gpt-6-luna subagent semantic capability only. Production OpenAI API model reliability is not evaluated. First outputs and existing scores are preserved.

1. Available; all 49 spawn calls explicitly selected gpt-6-luna with fresh history, medium reasoning, and concurrency four. Backend revision identity unavailable.

2. 49 reviewed benchmark cases (39 promotion, 8 non_promotion, 2 uncertain).

3. 49 fresh subagent tasks launched; 49 distinct agent IDs. No model mixing, fallback, history reuse, or answer retries.

4. 49 completed raw outputs; 44 syntactically/schema-usable outputs.

5. 5 malformed outputs; all have an extra closing brace: pepper_lunch_sg-uper-value-deal, pepper_lunch_sg-dine-with-pride, shake_shack_sg-singlish-lingo, bari_bari_steak_sg-promotions-2, shake_shack_sg-pucker-up-for-2-lemonades. Preserved without repair.

6. 0 execution errors; 0 missing case results.

7. Classification precision: 89.47% (34/38 effective promotion predictions).

8. Classification recall: 87.18% (34/39 gold promotions). Malformed failures remain in denominators.

9. Non-promotion correctness: 62.50% (5/8).

10. Uncertain rate: 12.24% (6/49); the five malformed outputs become effectively uncertain, plus Cheesy Omelette. Neither of the two gold-uncertain cases is predicted uncertain.

11. Per-field extraction metrics: see the unchanged scorer table below, including the six high-risk fields.

12. Raw unsupported facts: 187 (existing raw_model_hallucinations metric, gold-relative exact/list differences; not 187 proven inventions).

13. Validator-caught unsupported facts: 46 (existing hallucinations_caught_by_validator).

14. Unsupported facts surviving validation: 141 (existing unsupported_fact_survived_validation).

15. Unsupported critical facts surviving validation: 18 (existing unsupported_critical_fact_survived_validation).

16. Every critical survivor: the complete 18-row table in semantic-review.md and the sealed-run report lists case, field, accepted value, exact quote, gold value, and source review. Two are definitely excluded-to-participating outlet reversals; other entries include ambiguous secondary validity, unknown scopes, field grouping/coverage and normalization.

17. McDonald’s contest-date result: bfmcsaver startDate=null and endDate=null in raw and validated output. Correctly separated meal validity from Contest Submission Period; excluded-outlet names still survive incorrectly.

18. Sushiro missing-year result: startDate=null and endDate=null, no invented year. Product text incorrectly classified promotion; price-variation mention becomes unknown scope.

19. Bari contamination result: no cross-card contamination observed in the five raw responses. Four are parseable; salad-bar response is malformed and cannot count as usable. No opening time or sibling card dates/outlets inferred into the other cards.

20. Captain venue-layout result: all four venue cases classify promotion and extract all eight dates correctly. Multi-group schedules stay unknown; student/minimum-party constraints are lost/rejected, October lowest-paying-diner eligibility is missed, and Early Bird scope is unsupported.

21. Captain takeaway-layout result: promotion, 20% off, page-flash redemption and takeaway-only are understood using the same schema; no unknown branch/date/hour/merchant supplied. Exact wording/grouping differs from gold.

22. Shake Shack classification result: real incentives and several ordinary articles are distinguished, but Zi Char product launch is falsely promotion and both ambiguous editorial/activity articles become definite promotions. Five malformed outputs also reduce recall.

23. FairPrice semantic result: 3/3 positive campaign classifications and 6/6 explicit date fields correct. No image/product/branch acquisition. Weekly “From 20%” loses “From”; Wine Deals titles become unspecified benefit values; Finest merchant is inferred. No FairPrice non-promotion controls, so broader catalogue/product discrimination is untested.

24. Instagram summary: 4/4 promotion classifications; no inferred years; all three explicit numeric hour ranges correct. Sinpopo reservation preserved; SHINRAI redemption quote mismatches, Starbucks eligibility fails verbatim contract, Ajumma/Starbucks scope remains wrongly non-null.

25. Cases NLP classifies correctly where parser is wrong: pepper_lunch_sg-delivery, instagram-Dc-kxPJzx9B, shake_shack_sg-flock-this-way, shake_shack_sg-meet-our-collab-partners, shake_shack_sg-more-perks-less-fuss, shake_shack_sg-local-faves-our-treat. Field advantages: pepper_lunch_sg-student-meal (weekdays, locationScope, redemption); pepper_lunch_sg-weekday-lunch (merchant, weekdays, locationScope, locationNames, locationWording); pepper_lunch_sg-cheesy-omelette-2 (merchant); pepper_lunch_sg-peppie-meal (weekdays, eligibility); pepper_lunch_sg-delivery (merchant, title, locationScope, locationWording); shake_shack_sg-concrete-craze (title); shake_shack_sg-shack-meal (hours); shake_shack_sg-study-breaks-just-got-better (eligibility); captain_kim_sg-captain-kim-delivery (merchant, terms); captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-1 (merchant, weekdays); captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2 (merchant); captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-3 (merchant, weekdays); captain_kim_sg-captain-kim-korean-bbq-hotpot-3 (merchant, weekdays); bari_bari_steak_sg-promotions-1 (weekdays, locationScope, locationNames, locationWording); bari_bari_steak_sg-promotions-3 (weekdays, locationScope, locationNames, locationWording, eligibility, redemption); bari_bari_steak_sg-promotions-4 (weekdays, hours, locationScope, locationNames); bari_bari_steak_sg-promotions-5 (merchant); mcdonalds_sg-McSaver (locationScope); mcdonalds_sg-bfmcsaver (locationScope); instagram-DDJfz9bynW- (weekdays, locationScope); instagram-Dc-kxPJzx9B (weekdays, hours); instagram-DdQA3EChsjx (merchant, benefit, weekdays, hours, locationScope, redemption); instagram-DdfecQUjNZ5 (merchant, hours, redemption); shake_shack_sg-flock-this-way (title, startDate, endDate, locationScope); shake_shack_sg-meet-our-collab-partners (merchant); shake_shack_sg-more-perks-less-fuss (title); shake_shack_sg-local-faves-our-treat (title). Counts: 42 exact additional fields and 22 current-parser limitations; these cases are not necessarily fully correct.

26. Cases parser classifies correctly where NLP is wrong: pepper_lunch_sg-uper-value-deal, pepper_lunch_sg-dine-with-pride, shake_shack_sg-singlish-lingo, shake_shack_sg-zi-char-menu, bari_bari_steak_sg-promotions-2. Exact field advantages: pepper_lunch_sg-student-meal (eligibility); pepper_lunch_sg-uper-value-deal (merchant, title, startDate, endDate, terms); pepper_lunch_sg-dine-with-pride (merchant, title); shake_shack_sg-all-about-chickens (redemption); shake_shack_sg-national-cheeseburger-day (terms); shake_shack_sg-shack-meal (redemption, terms); shake_shack_sg-singlish-lingo (merchant, title, terms); shake_shack_sg-study-breaks-just-got-better (redemption, terms); captain_kim_sg-captain-kim-delivery (title); bari_bari_steak_sg-promotions-2 (merchant, title, benefit). Count: 21 fields. Some cases appear in both comparisons because fields differ.

27. Every effective uncertain case: pepper_lunch_sg-uper-value-deal, pepper_lunch_sg-dine-with-pride, pepper_lunch_sg-cheesy-omelette-2, shake_shack_sg-singlish-lingo, bari_bari_steak_sg-promotions-2, shake_shack_sg-pucker-up-for-2-lemonades.

28. Every identified semantic-association error is enumerated in semantic-review.md: Concrete secondary validity; Veggie contest/primary switch; both McDonald’s excluded-name reversals; Local Faves app-check Monday assigned as offer weekday; and six unsupported scope/quote role associations. Scope-contract failures are separately distinguished from invented physical branches.

29. A2 justified: no. Real publication-critical semantic role errors survive validation, classification is not robust, and failures are not uniformly conservative. Retain A; B/C/D unauthorized.

30. API-model benchmark justified next: not as the immediate readiness step. Investigate prompt-v2, evidence segmentation, and schema roles first; a separate API-model portability study may follow with explicit authorization. No production API model was validated.

31. Benchmark SHA-256: ec9228dcf8acce9c1e31e5f046d323856bda4db4b2bcfd487fd189d0fcd2791e; prompt v1 SHA-256: 6de0db63bf3baffb78a8c38f09ccc9dbd737487507a32f9e567ef2dd21334c6a; schema v1 SHA-256: 2b42cb3afc017bc3ece8a16ce068259bd36389532bcd795e4576377ca9d02900. Each full task prompt and input has its own manifest hash. Raw seal SHA-256: 786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a.

32. Gold-leak prevention test: passed, including distinctive gold/parser secret sentinel absent from input and prompt; all 18 new isolation/integrity tests pass.

33. Hosted model/provider API calls: 0. Codex subagent runtime was the sole model execution surface; OpenAiPromotionNlpProvider remained unchanged.

34. Production DB operations: 0.

35. Source activation changes: 0.

36. direct-source-v2: unchanged; all existing src and migration file contents match pre-run hashes.

37. Fresh merchant acquisition: none.

38. Telegram recollection: none.

39. OCR/media analysis: none.

40. No commit in the project repository.

41. No push.

## Per-field extraction metrics

| Field           | Exact supported | Missed supported | Incorrect value | Invented unknown | Quote mismatch | Validator rejection |
| --------------- | --------------: | ---------------: | --------------: | ---------------: | -------------: | ------------------: |
| merchant        |               9 |                5 |              11 |                7 |              0 |                   9 |
| title           |              19 |                6 |              12 |                7 |              0 |                   3 |
| benefit         |               4 |                5 |              27 |                7 |              0 |                   0 |
| startDate       |              13 |                3 |               0 |                0 |              0 |                   0 |
| endDate         |              13 |                3 |               0 |                1 |              0 |                   0 |
| weekdays        |              15 |                2 |               0 |                1 |              0 |                   0 |
| hours           |               5 |                0 |               0 |                0 |              0 |                   0 |
| locationScope   |              16 |                4 |               0 |                6 |              0 |                   4 |
| locationNames   |               4 |                1 |               1 |                2 |              0 |                   1 |
| locationWording |               3 |                4 |              13 |                5 |              0 |                   0 |
| eligibility     |               3 |                7 |               2 |                6 |              1 |                   6 |
| redemption      |               4 |               17 |              12 |                1 |              5 |                  10 |
| terms           |               1 |               17 |              15 |                5 |              9 |                  13 |

## Subagent metrics and integrity

Average accepted facts per gold promotion case: 5.8718 (229/39). Cases with zero accepted facts: 10: pepper_lunch_sg-uper-value-deal, pepper_lunch_sg-dine-with-pride, pepper_lunch_sg-delivery, shake_shack_sg-hello-one-fullerton, shake_shack_sg-singlish-lingo, bari_bari_steak_sg-promotions-2, shake_shack_sg-introducing-aloha-shack, shake_shack_sg-pucker-up-for-2-lemonades, shake_shack_sg-well-be-right-back, shake_shack_sg-our-french-onion-menu.

Validator changed effective output in 35 cases (any deterministic rejection/output failure): pepper_lunch_sg-student-meal, pepper_lunch_sg-uper-value-deal, pepper_lunch_sg-weekday-lunch, pepper_lunch_sg-dine-with-pride, pepper_lunch_sg-cheesy-omelette-2, pepper_lunch_sg-delivery, shake_shack_sg-100-angus-beef-just-for-you, shake_shack_sg-all-about-chickens, shake_shack_sg-concrete-craze, shake_shack_sg-everything-in-our-veggie-shack, shake_shack_sg-feeding-a-crowd, shake_shack_sg-hello-one-fullerton, shake_shack_sg-hello-parkway-parade, shake_shack_sg-national-cheeseburger-day, shake_shack_sg-shack-meal, shake_shack_sg-singlish-lingo, shake_shack_sg-study-breaks-just-got-better, shake_shack_sg-this-ones-for-your-mom, shake_shack_sg-were-introducing-chicken-sundays, shake_shack_sg-zi-char-menu, captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-1, captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2, captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-3, captain_kim_sg-captain-kim-korean-bbq-hotpot-3, bari_bari_steak_sg-promotions-2, mcdonalds_sg-bfmcsaver, sushiro_sg-to-the-moon-and-back, instagram-DDJfz9bynW-, instagram-DdfecQUjNZ5, shake_shack_sg-flock-this-way, shake_shack_sg-introducing-aloha-shack, shake_shack_sg-local-faves-our-treat, shake_shack_sg-pucker-up-for-2-lemonades, shake_shack_sg-our-french-onion-menu, fairprice_sg-xtra-wine-flash-sale.

Malformed responses are counted as model-output failures, not infrastructure errors. No manually repaired parse was used. Fact counts exclude classification. Gold-relative safety scores are not source-reviewed hallucination rates.

## Run artifacts

/Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/promotion-nlp-subagent/2026-10-02T12-38-23-377Z-ebde54a7-5856-4b50-8752-395c50bb7cfe/

Required artifacts: raw-results.json, validated-results.json, scores.json, failures.json, run-metadata.json, report.md. Additional audit artifacts: blind-tasks.json, manifest.json, raw-seal.json, per-case records, semantic-review.json. This directory is ignored by Git.
