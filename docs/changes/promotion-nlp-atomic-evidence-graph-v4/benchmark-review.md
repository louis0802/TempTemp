# Benchmark annotation review (frozen before execution)

This parent-authored review is based on literal `sourceText` carried over from all 49 V3 cases. It is evidence for annotation, not authority over the source. The benchmark preserves each source envelope's ID, text, source reference, merchant hint, and title hint. Each required clause, anchor, and alternative is validated as an exact substring. V3 support and constraint annotations seed the minimum gold; they are not treated as exhaustive segmentation.

## Frozen rules

- Atomic clauses remain source-contiguous. `alternatives` allow only literal equivalent boundaries; they do not license paraphrase. Each clause declares materiality, proposition targets, evidence kind, and allowed relation labels.
- Proposition identity comes from its reviewed anchors. A generic/editorial proposition may coexist with one or more economic offers. Unknown associations are not resolved by borrowing a nearby clause.
- The eight publication classes are `economic_offer`, `contest_or_chance`, `editorial`, `product_launch`, `store_announcement`, `service_information`, `event_or_activity`, and `uncertain`. Only `economic_offer` proceeds to fact normalization.
- `redemption_action` means an action such as flashing/presenting/scanning a page or entering a code. `redemption_channel` means a route such as takeaway, dine-in, app, or delivery.
- A null or absent validity fact stays unknown. `opening_to` contains only its stated upper endpoint. Capture dates and implied years are not evidence.
- Material constraint recall requires a literal material clause to survive as a node, a correct proposition edge, and a normalized constraint attributed to that evidence.

## Reviewed corrections and boundaries

- **Student Meal:** retain separate `student_before5` and `after5` propositions. The explicit Student Meal dine-in and opening-to-5 clause belongs to the before-5 meal; the after-5 main-menu discount has its own weekday, holiday exclusion, and Student Card conditions. These conditions must not cross-contaminate.
- **$uper Value Deal:** both the heading/offer identity (`$uper Value Deal`) and the transactional price/discount wording (`from just $9.90`, `Enjoy savings of up to 32% off...`) identify one offer. Treating only the trailing savings sentence as its proposition boundary is an unnecessarily narrow V3 anchor.
- **Mother's Day bundle:** retain both `Mother’s Day Bundle` and `Complimentary ShackBurger or Chicken Shack` / the source's `From $30.80` bundle clause as equivalent central anchors for the single guaranteed bundle offer. Price is a starting price, not the value of the complimentary item.
- **Bari Salad Bar:** `all_day` and `tea_time` are distinct propositions. All-day is at Tampines 1 and VivoCity with no stated clock endpoint. Tea-time is 2 PM–5 PM at Junction 8 and Great World. Outlet clauses are independently targeted; a time/outlet association cannot transfer between propositions. Monday-to-Thursday and dine-in are shared conditions and are represented as evidence linked to both propositions.
- **Bari senior special:** “from opening until 5pm” is an `opening_to` endpoint of 17:00; do not invent 00:00.
- **Captain takeaway:** “Flash this page” is `redemption_action`; “Takeaway only” is `redemption_channel`. Omission of the former after it has been captured and correctly linked belongs to normalization completeness.
- **Captain Early Bird:** lunch, dinner, and weekend price/time groups are separate propositions; common customer, reservation, social, and validity clauses can be shared only where the source states they apply to all.
- **bfmcsaver:** breakfast meal is `economic_offer`; route challenge and prize are `contest_or_chance`. Contest submission and qualifying-run dates do not establish meal validity. Excluded locations remain exclusions.
- **Collab Partners:** artist/brand content is `editorial`; complimentary White Pepper fries tied to the quiz is a separate `economic_offer`.
- **Local Faves:** weekly treats are one reviewed recurring offer with week-specific item clauses. “Check your Happy Point app every Monday” is an operational check instruction, not availability weekday evidence. Offer weekday normalization remains unknown.
- **Sushiro:** the lunar menu is a product_launch proposition, not an economic offer inferred from listed menu prices. The capture gives no year for its date span, so no year is added.
- **Store and service content:** One Fullerton and Parkway Parade opening stories map to `store_announcement`; delivery directory or app operation content maps to `service_information`; product/menu launches stay `product_launch` where the source describes a launch without an explicit economic entitlement.

## Denominators and limits

The inherited V3 baseline contains 58 proposition units and 43 V3 `promotion` labels. The V4 gold contains 59 proposition identities and 43 `economic_offer` propositions. It splits the Parkway Parade opening story from the source's explicit promo-code discount, retaining that discount as economic. The bfmcsaver contest was already a V3 `non_promotion`; V4 names it `contest_or_chance` without changing the economic denominator. Source-level recovery and proposition-level precision/recall must be reported separately. The gold is a reviewed minimum evidence set, so unlisted non-material prose is not an omission by definition.

No model execution or independent judging is represented by this annotation review. It records source-based decisions made before any V4 evaluation.

Parent final prelaunch review: all49 original source texts and each frozen annotation inspected. Final gold contains 59 identities (43 economic), 350 unique atomic clause annotations, and228 semantic constraint requirements. Rephrased duplicate conditions use literal alternatives. Multi-claim weekday/clock/date/channel clauses were atomized; source-specific collective scope and group identities are separate. Bari all-day constraints contain no tea-time clock. Student Card actions, Captain prebooking/code/social/beneficiary rules, Local Faves login/QR/banner, Instagram reservation/membership, and benefit qualifiers were reviewed under composable attributes. Sushiro/Cheesy/Menu launches are product_launch, app downtime service_information, and Concrete's incomplete entitlement uncertain. This is parent self-review supported by an implementation worker, not independent/human approval or a judge-model review.

Scoring limitations are explicit: minimum non-economic identities do not enumerate every editorial/product subdivision. Unmatched economic units require post-seal source review and are not automatically declared false. Source-contiguous equivalent clauses are accepted; unrelated smaller fragments are rejected. Known scored edge precision uses unique gold-clause/target/relation assignments, with unannotated edges outside its denominator; the post-seal source review examines all publication-critical edges. Atomicity heuristics flag cross-group merges and fragmented clauses for review rather than asserting complete semantic detection. Constraint recall requires the full reviewed atomic meaning plus required composable attributes, and includes upstream losses. Safety counts state assessable/unassessable outputs; validator rejection is never a model-safety success.
