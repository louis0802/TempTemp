# Benchmark review

Parent-authored source review of the exact same 49 isolated cases, not independent human annotation. Text, sourceReference, capture SHA, ID, selector, evidence identity, layout, merchantHint and null titleHint equal v1. The immutable v1 gold SHA is ec9228dcf8acce9c1e31e5f046d323856bda4db4b2bcfd487fd189d0fcd2791e. v2 has a separate benchmark-v2.json, never forced into overloaded v1 fields.

Classification/calendar/weekday/hour values inherit the reviewed v1 interpretation unless listed below. Primary anchors, exclusions and atomic restriction roles are reviewed directly from the captured source. v1 post-seal semantic-review.md supplies the documented failure interpretations. All 228 restriction anchors are source substrings; unmatched output clauses are explicitly queued for post-seal source review. Date/association semantics cannot be proved by a copied quote alone.

| Case | Primary classification | Positive scope | Participating identities | Excluded identities | Restriction anchors | Source-reviewed interpretation |
| --- | --- | --- | --- | --- | ---: | --- |
| pepper_lunch_sg-student-meal | promotion | null | none | none | 8 | v1 source_unspecified is an internal fallback; model positive scope is null. No positive outlet coverage declaration. |
| pepper_lunch_sg-uper-value-deal | promotion | null | none | none | 2 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| pepper_lunch_sg-weekday-lunch | promotion | null | none | none | 6 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| pepper_lunch_sg-dine-with-pride | promotion | all_outlets | none | none | 7 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| pepper_lunch_sg-cheesy-omelette-2 | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| pepper_lunch_sg-peppie-meal | promotion | all_outlets | none | none | 6 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| pepper_lunch_sg-delivery | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-100-angus-beef-just-for-you | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-all-about-chickens | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-concrete-craze | uncertain | null | none | none | 0 | Post-seal v1 review confirms secondary activity/contest cannot become primary: retain uncertain, no definite primary dates/benefit. |
| shake_shack_sg-everything-in-our-veggie-shack | uncertain | null | none | none | 0 | Post-seal v1 review confirms secondary activity/contest cannot become primary: retain uncertain, no definite primary dates/benefit. |
| shake_shack_sg-feeding-a-crowd | promotion | null | none | none | 11 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-hello-one-fullerton | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-hello-parkway-parade | promotion | named_outlets | Parkway Parade | none | 8 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-national-cheeseburger-day | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-shack-meal | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-singlish-lingo | promotion | all_outlets | none | none | 11 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-study-breaks-just-got-better | promotion | named_outlets | Westgate; Junction 8; Great World | none | 5 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-this-ones-for-your-mom | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-were-introducing-chicken-sundays | promotion | all_outlets | none | none | 11 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-zi-char-menu | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| captain_kim_sg-captain-kim-delivery | promotion | null | none | none | 3 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-1 | promotion | null | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2 | promotion | null | none | none | 10 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-3 | promotion | null | none | none | 8 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| captain_kim_sg-captain-kim-korean-bbq-hotpot-3 | promotion | null | none | none | 7 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| bari_bari_steak_sg-promotions-1 | promotion | named_outlets | Tampines 1 | none | 2 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| bari_bari_steak_sg-promotions-2 | promotion | named_outlets | Tampines 1; VivoCity; Junction 8; Great World | none | 4 | Four explicitly participating source names use v2 named_outlets; v1 selected_outlets retained unchanged. No all-day/tea-time groups flattened into global hours. |
| bari_bari_steak_sg-promotions-3 | promotion | named_outlets | Tampines 1 | none | 7 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| bari_bari_steak_sg-promotions-4 | promotion | named_outlets | Tampines 1 | none | 7 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| bari_bari_steak_sg-promotions-5 | promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| mcdonalds_sg-McSaver | promotion | null | none | Lido; Gardens by the Bay; Changi Airport (Jewel, T2, T3) | 2 | Source-reviewed exclusion-only sentence: v1 selected_outlets becomes null positive scope; all listed names become excluded, not participating. This is a semantic contract reinterpretation, not edited v1 gold. |
| mcdonalds_sg-bfmcsaver | promotion | null | none | Mandai Wildlife East; Lido; Gardens by the Bay; Changi Airport (Jewel, T2, T2 Transit, T3) | 2 | Source-reviewed exclusion-only sentence: v1 selected_outlets becomes null positive scope; all listed names become excluded, not participating. This is a semantic contract reinterpretation, not edited v1 gold. |
| sushiro_sg-to-the-moon-and-back | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| instagram-DDJfz9bynW- | promotion | null | none | none | 5 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| instagram-Dc-kxPJzx9B | promotion | null | none | none | 4 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| instagram-DdQA3EChsjx | promotion | null | none | none | 2 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| instagram-DdfecQUjNZ5 | promotion | null | none | none | 6 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-flock-this-way | promotion | all_outlets | none | none | 8 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-meet-our-collab-partners | promotion | null | none | none | 1 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-introducing-aloha-shack | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-more-perks-less-fuss | promotion | null | none | none | 2 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-local-faves-our-treat | promotion | null | none | none | 10 | Monday concerns checking/release, not redemption availability; dates have no year and weekly windows cannot establish a single weekday restriction. |
| shake_shack_sg-pucker-up-for-2-lemonades | promotion | all_outlets | none | none | 9 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-well-be-right-back | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| shake_shack_sg-our-french-onion-menu | non_promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| fairprice_sg-price-drop-buy-now-weekly-offers-from-20-off | promotion | null | none | none | 0 | Inherited source-supported schedule/classification; restrictions independently assigned by frozen roles. |
| fairprice_sg-xtra-wine-flash-sale | promotion | null | none | none | 0 | Explicit deal card retains reviewed promotion classification, but no quantified benefit or contextual merchant is supported. |
| fairprice_sg-finest-wine | promotion | null | none | none | 0 | Explicit deal card retains reviewed promotion classification, but no quantified benefit or contextual merchant is supported. |

## Post-seal review limitations (annotations unchanged)

The frozen restriction anchors are source-wide role examples and do not encode complete primary association for every restriction. Student Meal's source has an after-5pm main-menu discount and before-5pm Student Meal Dishes. Parent source review identifies the latter's dine-in condition as unsafe/ambiguous when applied to the selected main-menu proposition. This is an additional finding under the already frozen association rule, not an annotation edit or changed role definition. The exact artifact/hash remains frozen.

Full-label identity aliases are deliberately finite. The frozen automatic scorer flags Tampines 1 outlet although source review confirms the same physical identity; it also flags generic all-outlet phrases in named rules. These are separately recorded as normalization or domain misuse. A quoted holiday is not a physical outlet. Cashier subclause overlap similarly produces a gold-anchor role flag which source review dismisses. No alias or role was added to gold after launch. All unmatched output restrictions are individually reviewed in source-review.json; no automatic unreviewed defaults establish correctness.
