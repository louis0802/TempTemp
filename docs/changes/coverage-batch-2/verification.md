# Verification — Coverage Expansion Batch 2

The twelve fixed historical merchants were processed through the existing multi-source model. **No new merchant is auto-enabled. Four useful disabled shadow sources, five newly blocked merchants and three remaining candidate merchants are supported by captured evidence.** Conservative negative decisions are completed outcomes; no placeholder Instagram or web adapters were introduced.

## Before/after census and source outcomes

Baseline regenerated before any implementation: historical denominator **138**, registry-only **1**, unresolved records **67**. The final denominator is **137**, registry-only **1**, unresolved records **67**. The explicit alias merge is Ajumma’s → Ajumma's Korean Restaurant, proven by the captured merchant-controlled page's exact title and description; both historical labels, both distinct TG signal URLs, both offer IDs and every historical evidence reference survive on one blocked canonical row. Exact signal URLs and offer IDs are also explicitly serialized on that JSON/CSV row. See identity-review.md, docs/research/merchant-identity-review.json and the immutable original official capture named there. Marché/Marche, Smooy/Smöoy, Tofu G/Tofu G Gelato and Bari Bari Grand/Bari Bari Steak stay separate.

| State | Before | After | Delta |
|---|---:|---:|---:|
| auto_enabled | 2 | 2 | 0 |
| shadow_only | 5 | 9 | +4 |
| blocked | 5 | 10 | +5 |
| source_candidate | 13 | 10 | -3 |
| not_assessed | 113 | 106 | -7 |

Autonomous coverage **1.45% → 1.46%**, solely from the denominator correction; enabled acquisition is still two merchants. All **six selected not_assessed rows** move to evidence-backed states; the seventh reduction is the Ajumma’s identity correction. **Four selected source_candidate rows** move out; Kimpson's newly assessed secondary account adds one candidate, hence net candidate delta -3.

- Newly enabled: none.
- Newly shadow: Captain Kim, McDonald's, Sushiro, Bari Bari Steak.
- Newly blocked: More Yogurt, Shiok Burger, Gelare, 4Fingers, The Coffee Bean & Tea Leaf.
- Remaining selected candidates: Kimpson's Table, Pizza Hut, Kei Kaisendon.

The twelve-row table below is generator-backed. `Candidates` means safe adapter extraction, not every visible marketing signal; zero for a merchant without an adapter does not prove it has no promotions. Dispositions are DB-free generic-gate replay on 2 October 2026 in Singapore, not persisted queue counts or production publications.

| Merchant | TG Signals | TG Offers | Web State | Social State | Ownership | Enumeration | Candidates | Excluded | Review | Ready | Final Progress | Next Action | Main Blockers |
|---|---:|---:|---|---|---|---|---:|---:|---:|---:|---|---|---|
| Kimpson's Table | 3 | 8 | blocked | instagram:kimpsonstable.sg:candidate; instagram:kimpsonstable:blocked | unverified; verified | not_enumerable | 0 | 0 | 0 | 0 | source_candidate | verify_instagram_ownership | automated_access_permission_unestablished, bounded_feed_boundary_unproven, current_venue_account_ownership_unverified, ownership_unverified, post_account_association_unproven, promotion_directory_absent, public_feed_not_exposed, storefront_closed |
| More Yogurt | 3 | 5 | blocked | no merchant-controlled link verified | probable | not_established | 0 | 0 | 0 | 0 | blocked | blocked_no_safe_public_source | global_news_not_singapore_campaign_authority, singapore_operator_and_domain_unverified, singapore_outlet_directory_unavailable |
| Shiok Burger | 2 | 5 | blocked | instagram:shiokburger_sg:blocked | verified | not_enumerable | 0 | 0 | 0 | 0 | blocked | blocked_no_safe_public_source | automated_access_permission_unestablished, bounded_feed_boundary_unproven, official_outlet_directory_unavailable, post_account_association_unproven, promotion_directory_absent, unknown_continuation |
| Gelare | 1 | 3 | blocked | instagram:gelaresg:blocked | verified | gallery_visible | 0 | 0 | 0 | 0 | blocked | blocked_no_safe_public_source | automated_access_permission_unestablished, bounded_feed_boundary_unproven, image_only_campaign_facts, opaque_gallery_titles, post_account_association_unproven, safe_textual_acquisition_unavailable, unknown_continuation |
| 4Fingers | 2 | 2 | blocked | instagram:gimme4fingers:blocked | verified | not_enumerable | 0 | 0 | 0 | 0 | blocked | blocked_no_safe_public_source | automated_access_permission_unestablished, bounded_feed_boundary_unproven, no_public_bounded_enumeration, post_account_association_unproven, public_promotion_html_js_shell, unknown_continuation |
| Captain Kim | 2 | 2 | shadow | instagram:captainkimsg:blocked | verified | partial | 7 | 1 | 6 | 0 | shadow_only | resolve_web_enumeration | automated_access_permission_unestablished, bounded_feed_boundary_unproven, captain_campaigns_outside_central_index, image_text_equivalence_unproven, post_account_association_unproven, unknown_continuation, venue_page_scope_requires_review |
| Pizza Hut | 3 | 8 | blocked | instagram:pizzahut_sg:candidate | probable; unverified | not_enumerable | 0 | 0 | 0 | 0 | source_candidate | verify_instagram_ownership | automated_access_permission_unestablished, blocked_public_access, bounded_feed_boundary_unproven, exact_social_ownership_backlink_unavailable, location_dependent_commerce_unresolved, ownership_unverified, public_promotion_html_js_shell, unknown_continuation |
| Kei Kaisendon | 5 | 5 | blocked | instagram:keikaisendon:blocked; instagram:account unresolved:candidate; instagram:account unresolved:candidate | unverified; verified | not_enumerable | 0 | 0 | 0 | 0 | source_candidate | verify_instagram_ownership | automated_access_permission_unestablished, bounded_feed_boundary_unproven, cached_social_widget_not_authoritative_feed, exact_account_unresolved, ownership_unverified, post_account_association_unproven, promotion_directory_absent, unknown_continuation |
| McDonald's | 4 | 4 | shadow | instagram:mcdsg:blocked | verified | partial | 2 | 0 | 2 | 0 | shadow_only | resolve_web_enumeration | automated_access_permission_unestablished, bounded_feed_boundary_unproven, mcd_campaigns_outside_news_directory, mcd_news_load_more_unresolved, multiple_propositions_require_review, official_outlet_directory_app_only, unknown_continuation |
| Sushiro | 4 | 4 | shadow | instagram:sushirosingapore:blocked | verified | partial | 1 | 0 | 1 | 0 | shadow_only | resolve_web_enumeration | automated_access_permission_unestablished, bounded_feed_boundary_unproven, outlet_participation_unstated, sushiro_directory_boundary_unproven, unknown_continuation, validity_year_unstated |
| Bari Bari Steak | 3 | 3 | shadow | facebook:61583504727882:candidate; instagram:baribaristeaksg:blocked | verified | partial | 5 | 0 | 5 | 0 | shadow_only | resolve_web_enumeration | automated_access_permission_unestablished, bari_grid_continuation_unproven, bounded_feed_boundary_unproven, campaign_validity_unspecified, detail_campaign_body_unassociated, outlet_time_groups_require_review, unknown_continuation |
| The Coffee Bean & Tea Leaf | 3 | 3 | blocked | instagram:coffeebeansg:blocked | verified | not_enumerable | 0 | 0 | 0 | 0 | blocked | blocked_no_safe_public_source | app_voucher_validity_not_public, automated_access_permission_unestablished, bounded_feed_boundary_unproven, commerce_catalogue_not_campaigns, promotion_directory_absent, unknown_continuation |

## Dual-path decisions and exact account results

[Research](research.md) records every merchant's official operator, website/promotion/location roots, ownership chain, enumeration and campaign/participation semantics, captured URLs and remaining action. [Selection](selection.md) retains every pre-task cohort row and reason. [Replay](replay.json) contains all 15 extracted candidates, exact acquisition requests and generic decisions: **1 excluded / 14 review / 0 ready**.

Web-first: Kimpson's older branded catalogue is closed; a distinct exact landlord-linked account remains unverified. More Yogurt's global news cannot establish Singapore ownership/campaign coverage. Shiok has menu/corporate news without a promotion directory. Gelare's opaque image gallery does not support useful textual extraction. 4Fingers' promotions return a JS shell but its official order/legal shell verifies an exact Instagram backlink. Captain Kim's exact venue and takeaway sections support seven shadow candidates; one September campaign is explicitly expired.

Social-first: Pizza Hut post identifies pizzahut_sg exactly but captured official backlink ownership is unverified; web roots remain JS shells and the profile is interrupted. Kei's owned profile is verified but its two frozen posts still have no exact account association; cached website social cards do not prove a feed. McDonald's public campaign fallback yields two shadow review documents, without borrowing contest dates or inventing an app-only outlet list. Sushiro's exact linked directory/detail yields one shadow candidate without an inferred validity year/outlet scope. Bari's five own listing cards yield five review candidates; detail bodies contain related posts and never supply requested-card facts. Coffee Bean's commerce/social home offers no complete campaign directory; its owned Instagram account is still acquisition-blocked.

Ten newly verified Instagram accounts: kimpsonstable, shiokburger_sg, gelaresg, gimme4fingers, captainkimsg, keikaisendon, mcdsg, sushirosingapore, baribaristeaksg, coffeebeansg. Inventory totals fourteen verified Instagram accounts, plus two exact unverified candidates pizzahut_sg and kimpsonstable.sg. The latter was not probed. Actual acquisition review has fifteen assessed accounts, including Pizza Hut. Kei's frozen DdWQHfKBdiK and DdMLD32Ivbz remain exact_account_unresolved; unsupportedbrowser is transport only. Bari's frozen Facebook reel independently binds to numeric Facebook account 61583504727882 and the merchant's exact numeric backlink. Facebook and Instagram identities remain platform-specific.

**No InstagramAccountAdapter is justified:** no two accounts have a proven complete safe public acquisition contract, deterministic continuation or chronological coverage. Initial visible identities/captions are insufficient. Unknown continuation and feed boundaries remain blockers; Kimpson's older profile exposes no feed, and Pizza Hut's profile is interrupted. Existing automated-access permission findings are preserved, without claiming a platform-permission determination from this batch. Image/video facts remain unknown and timestamps remain publishedAt only.

## Registry, publication and existing merchant regressions

Four disabled definitions are appended after all seven original definitions: bari_bari_steak_sg, captain_kim_sg, sushiro_sg, mcdonalds_sg. Their exact allowlisted hosts/roots and source-level blockers are in the registry. No new social source kind, runtime social source, outlet provider, publication bypass, schema migration, database redesign or processor-version change. All four new sources reject persistence before DB query/connect and before outlet operations. Captain's shared-page native identities remain disabled and require persistence-identity review before future activation.

Pepper Lunch and Shake Shack stay enabled. Paradise, Gourmet Carousel, FairPrice, Kris+ and Dian Xiao Er stay shadow; CS Foods stays blocked. Full-row equality checks preserve all unrelated pre-task merchant rows, and old direct/source/publication/review/dedupe and legacy Telegram tests pass. The original four Instagram account assessments and bindings reconstruct byte-identically to the pre-task SHA-256, without a new request.

## Checks actually run

| Check | Actual result |
|---|---|
| Full units: npm test -- --maxWorkers=1 | **811 passed / 43 files**, including final explicit signal/offer identity retention |
| Final evidence/ledger/social/prior-batch focus after reviewed family metadata update | **141 passed / 5 files** |
| New coverage + direct architecture focus | **94 passed / 2 files** before final extra author test; final full suite includes 40 coverage tests |
| Existing local disposable integration: npm run test:integration -- --maxWorkers=1 | **55 passed / 2 files**; suites created/removed their own PostgreSQL/PostGIS databases |
| Corpus: npm run test:corpus -- --maxWorkers=1 | **4 passed / 3 files**; Sources 136, Offers 181, Approved 0, Excluded 37, Unresolved 144, Requires split 18, Failed 0 |
| npm run typecheck | **Passed**, including final research changes |
| npm run build | **Passed** for final application code; existing dynamic filesystem tracing warning in unchanged src/server/mvp.ts |
| npm run lint | **Fails on five pre-existing no-explicit-any errors** in .local/source-substitution-pilot/inspect.ts and upstream.ts; no rules weakened |
| Scoped ESLint on all 19 task code/test files | **Passed** |
| Scoped Prettier --check on all 19 task code/test files | **Passed**; immutable captures and deterministic snapshot/generated bytes deliberately excluded |
| git diff --check plus no-index checks for all 19 task code/test files | **Passed**; no-index exit 1 with no diagnostics denotes a newly added/different file |
| Offline canonical JSON/Markdown/CSV replay and read-after-regenerate equality | **Passed**; nine outputs byte-identical across regeneration, plus final 40-test canonical-input check; generator has no network/DB dependency |
| Frozen inputs/prior captures/workspace preservation | **Passed**; details below |

Logs remain in verification-logs. Initial failures were retained: newly appended source IDs/census required explicit test expectation updates, an unresolved-account track was incorrectly suppressed by an owned-but-unbound profile and now has regression coverage, and repeated HTML parsing caused a research replay timeout. Parsing is now performed once per capture and ownership checking is cached only inside each validated replay; no timeout was increased. Content bindings are deduplicated by platform/native ID/account so the prior four bindings/assessments preserve original bytes. No frozen corpus or publication gate was relaxed.

No UI behavior changed, so a new visual/e2e browser run was not needed. The source report/control surfaces are verified against generated JSON and CSV. No independent review was authorized; final review is explicitly self-review against S1–S8 and the original request. It addressed related-post fact contamination, wrong account/author metadata, unresolved identity retention, false site-search pagination, concrete adapter-review joins, capture integrity and source-level persistence rejection.

## Protected evidence and operation boundaries

The pre-task protected snapshot covers **5078 existing files**: **5062 remain byte-identical**, **16 intentional modifications**, zero missing files and zero unexpected changes. The sixteen modifications are the five relevant existing test files, four canonical research documents, five research generator modules and the direct registry/types. All prior corpus/corrected audits/direct audits, direct/social fixtures, publication/persistence/review/outlet modules, migration and unrelated working-tree files remain byte-identical. Build-generated next-env.d.ts was restored to the user's exact pre-task bytes. See protected-baseline.json, protected-evidence-check.json and changed-files.json.

All requested intent/spec/design/plan documents and research/selection/identity/verification/changed-files outputs are saved in this directory. Canonical outputs are regenerated at docs/research/merchant-automation-progress.md, docs/research/merchants.json, docs/research/report.csv, social-source-inventory.json, social-source-authority-review.json and social-source-acquisition-review.json. Source/identity outcomes are driven by reviewed checked inputs, never hand-edited output statuses.

**No production/shared application-data ingestion or migration.** Database execution was restricted to the existing disposable local integration suites. **No scheduler/worker/continuous monitor start, Telegram recollection/runtime dependency, social login/credentials/cookie harvesting, private social API, anti-bot/CAPTCHA bypass, OCR/frame/audio extraction, commit or push.** Existing uncommitted work is preserved.

## Acceptance mapping

S1: explicit identity tests, exact label/signal/offer retention, row uniqueness/census and protected hash checks. S2: immutable fixed cohort, 90-attempt per-merchant ledger and twelve independent research outcomes. S3: existing progress precedence tests and every selected row's evidence-backed tracks; unbound historical content is not suppressed. S4: four bounded useful shadow parsers, hostile host/recursive/detail/pagination/classification/validity/participation tests and generic offline dispositions. S5: exact canonical/OG/author content association, platform-specific Facebook numeric identity, backlink checks and all inventory/review outcomes. S6: fifteen actual captured-account assessments, original four unchanged, no unsupported feed adapter. S7: deterministic generated canonical Markdown/JSON/CSV/social outputs, exact delta and twelve-row table. S8: preserved merchant states/modules, full units, disposable integration, corpus, type/build, scoped lint/format, diff and preservation evidence. Existing whole-repository lint is the sole reported check limitation.
