# Verification — 30 September 2026

Full workflow documents: [intent.md](intent.md), [spec.md](spec.md), [design.md](design.md), [plan.md](plan.md). Acceptance A1–A6 is covered by the focused tests, actual research inspection, deterministic replay and protected manifests below. Existing unrelated dirty changes are preserved.

## Authoritative outputs and provenance

Final direct report: `.local/direct-source-audit/2026-09-30T14-13-48-529Z/report.md`. Required `candidates.json`, `audit.json`, `report.csv` are beside it; `protected-input-verification.json` records boundary evidence. The `-replay` sibling was generated offline from identical input/evidence, with all four required files byte-identical. Final audit SHA-256: `7db66e5cebf01e304905b0899dee26761eddd4c367b3e83ac28f5d32b3c86b05`.

Corrected source-origin run: `.local/source-origin-audit/2026-09-30-social-corrected-offline/`. Original immutable input: `.local/source-origin-audit/2026-09-30T13-08-06-774Z/`. Its captured signals/cache were reclassified through existing auditSignals, without reparsing/collecting Telegram or running network resolution. Original one_off_refresh provenance is preserved. Signals/cache copies are byte-identical. The corrected resolved-links.json is byte-identical to original transport evidence; every audit row's redirect chain and transport URL matches the original row. Repeated offline classification is covered by source-origin tests.

Reviewed capture bundle: `.local/direct-source-audit/2026-09-30-captured-evidence/reviewed-evidence-final.json`. It references 42 captures: 17 direct candidate GETs, 24 narrowly relevant listing/corporate/redirect follow-ups and one native-PDF text inspection. HTTP captures used disabled redirects and bounded timeouts; only separately observed follow-ups were requested. No recursive crawl, unrelated publisher following, OCR, app login/private API or anti-bot bypass. A guessed Pepper Lunch policy path returned 404 and was retained as a failed observation; the actual linked /privacy/ policy was captured separately. The first sandbox-restricted fetch attempt could not reach the network; authorized bounded retrieval succeeded subsequently. These transport/tool failures did not become source-authority or login claims.

## Social regression evidence and corrected counts

Focused cases cover Instagram content → exact Facebook unsupportedbrowser; genuine Facebook content; ordinary Instagram; Facebook content → exact fallback; arbitrary Facebook final destinations; similar unsupportedbrowser path; spoofed Instagram hostname; older Instagram separated by unrelated hops; and unchanged complete chains/resolver results. Authority stays unknown without separate ownership evidence. Unsupported fallback with no supported prior has no canonical URL and is a resolved unknown destination. Resolver and security behavior are untouched.

The social count remains **29 signals**. Offer-associated meaningful domains are **Instagram 26, Facebook 2, TikTok 1**. Facebook 2 refers to observed Facebook share/reel content URLs, not unsupportedbrowser. Unique original URLs: Instagram 25, Facebook 2, TikTok 1. Transport diagnostics retain **Facebook 28**, exactly as captured. All social research authority remains unknown.

Other meaningful domain record counts: CS Foods 7; Telegram 5 (excluded from direct phase); Grab 2; app.happypointcard.com.sg, app.krisplus.com, dianxiaoer.com.sg, eatbook.sg, fairprice.com.sg, google.com, paradisegp.com, pepperlunch.com.sg, royalplaza.com.sg and shakeshack.com.sg each 1. Unique candidate domains in origin reporting: 16, versus 15 transport domains. Candidate/social metrics still exclude neighboring roundup context links.

## Direct inventory and categories

**17 candidate observations, 16 distinct signals, 10 domains**. Merchant web: 13 observations / 12 signals; issuer/platform: 2 / 2; app: 2 / 2. One CS Foods signal links to both a sale catalogue and product. Duplicate signal/URL observations dedupe, preserving their source-origin indexes. Seven CS Foods records are one domain pattern.

| Category             | Counts                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------- |
| Ownership            | verified 6; probable 11; unverified 0; contradicted 0                                  |
| Enumeration          | yes 2; partial 11; no 4; unknown 0                                                     |
| Extraction           | structured 1; semi_structured 7; free_text 0; image_only 2; app_only 2; inaccessible 5 |
| Reusable observation | yes 12; no 3; unknown 2                                                                |

Verified research ownership: Royal Plaza 1, Pepper Lunch 1, Paradise Group 1 (separate operator documents/corporate linkage), FairPrice 1 (corporate group domain links retail domain), Grab 2 (separate corporate operator/platform declaration). Probable: CS Foods 7, Kris+ app alias 1, Happy Point 1, Dian Xiao Er 1, Shake Shack 1. Probable sources have concrete branding/affiliation but lack the required additional ownership confirmation. The direct CLI defaults ownership to unverified when no explicit reviewed evidence exists; research statuses never populate the production registry. These observations are not publication approval or confirmation of current sampled offer validity.

| Adapter pattern                    | Candidate count | Distinct domains | Enumerable yes + partial |
| ---------------------------------- | --------------: | ---------------: | -----------------------: |
| app_deeplink_only                  |               1 |                1 |                        0 |
| app_deeplink_with_public_directory |               1 |                1 |                        0 |
| corporate_html_promotion_directory |               1 |                1 |                        1 |
| json_backed_retail_promotions      |               1 |                1 |                        1 |
| platform_static_campaign           |               2 |                1 |                        0 |
| wix_promotion_collection           |               1 |                1 |                        1 |
| woocommerce_sale_catalog           |               7 |                1 |                        7 |
| wordpress_dated_promotions         |               1 |                1 |                        1 |
| wordpress_promotion_directory      |               2 |                2 |                        2 |

## Discovery conclusions and engineering set

- **Merchant promotion directories**: Pepper Lunch is directly enumerable with text detail; Paradise current corporate/brand promotion cards and Royal Plaza dining cards/service-page campaigns are partial discovery surfaces. WordPress directory/detail handling is present across two domains; HTML corporate cards across another. Separate PDF/service-page handling and explicit outlet verification are still required.
- **Dated WordPress promotion archives**: Shake Shack blog exposes the sampled offer and numbered pagination; benefit/dates/redemption exist in public body text. Independent ownership confirmation remains a production-activation condition. Mixed editorial filtering and publication-versus-campaign dates require distinct handling.
- **Public platform promotion directory**: Kris+ web promotions and Singapore Airlines public partner/privilege pages support public independent discovery. Implement a public web source family, conditional on directory ownership/campaign correspondence, detail extraction and Load-more completeness. The sampled Birthday Bash deep link itself supplies no campaign facts. No app/private-API adapter is justified.

These are a small supported engineering set, not numerical ranking. Secondary observed patterns: WooCommerce sale catalogues (CS Foods, with anti-crawler blocks and unverified historical discount facts); JSON-backed retail promotions (FairPrice, with untested pagination and malformed/misleading campaign schema); Wix collection/lightbox (Dian Xiao Er, image-only selected-offer limitation). Recognition of a merchant alone does not justify an adapter.

Independently enumerable yes: **Pepper Lunch, Shake Shack**. Partial: **CS Foods (7 observations on one catalogue), Royal Plaza, Dian Xiao Er, FairPrice, Paradise**. Kris+'s related public directory is independently discoverable but recorded separately from the sampled app alias and candidate counts.

Evidence-only/non-enumerable: **Happy Point download gateway, Kris+ Birthday Bash Branch alias, Grab SALEbration and Grab Full House campaign URLs** within the inspected boundaries. The sampled **Paradise historical PDF** is also evidence-only as an object: a different menu is linked now, although the source has partial independent campaign discovery. Grab's observed consumer What's New URL redirects to a product-event page; no issuer-style searchable promotion directory was established. No bank/card directory candidate was present in this sample.

## Checks and protected boundaries

- `npx vitest run tests/source-origin-audit.test.ts tests/direct-source-audit.test.ts --maxWorkers=1`: **47 tests pass**. Covers allowed filtering/exclusions, exact dedupe, shared-domain concentration, default authority, explicit-evidence/blocked-evidence gates, verified structured non-enumerable validity, app-only handling, retained inaccessible records, captured offline replay, input/registry/source-discovery immutability, capture tampering, output overwrite/symlink rejection and runtime import boundaries.
- `npm test -- --maxWorkers=1`: **484 tests pass across 30 files** (42.79 seconds). Earlier run passed 483 before the additional blocked-ownership/listing regression. No timeouts/checks were weakened.
- `npm run typecheck`: **pass**. Scoped ESLint across the new/changed audit modules/tests: **pass, zero warnings**. Scoped Prettier across all 18 changed/added files: **pass**. `git diff --check`: **pass**. Build/UI/integration/corpus checks are outside this isolated Node research change; no local services were started.
- Actual SHA-256 manifests verify all **8 original source-origin files**, **3,665 source-discovery files**, **production merchant registry** and **production resolver** byte-identical. See final output protected-input-verification.json. Original registry remains empty. Tests separately assert the fixture registry remains unchanged even after verified research ownership.
- Direct audit runtime imports only Node/Zod/research modules, with source-origin types imported as types only. No production ingestion or DB operation/import, no registry write, no source monitor start, no Telegram recollection, no revision-6 work, no production adapter, no commit or push.

## Exact files changed by this slice

Modified existing research files:

- `scripts/research/source-origin-audit/audit.ts`
- `scripts/research/source-origin-audit/classification.ts`
- `scripts/research/source-origin-audit/types.ts`
- `scripts/research/source-origin-audit/report.ts`
- `tests/source-origin-audit.test.ts`
- `docs/research/source-origin-audit.md`

Added:

- `scripts/research/direct-source-audit.ts`
- `scripts/research/direct-source-audit/model.ts`
- `scripts/research/direct-source-audit/run.ts`
- `scripts/research/direct-source-audit/report.ts`
- `tests/direct-source-audit.test.ts`
- `tests/fixtures/direct-source-origin.json`
- `docs/research/direct-source-audit.md`
- `docs/changes/direct-source-candidate-audit/intent.md`
- `docs/changes/direct-source-candidate-audit/spec.md`
- `docs/changes/direct-source-candidate-audit/design.md`
- `docs/changes/direct-source-candidate-audit/plan.md`
- `docs/changes/direct-source-candidate-audit/verification.md`

Generated corrected/captured/direct/replay evidence remains ignored under the research output roots. Earlier development reports are superseded by the authoritative timestamped final run above. Pre-existing AGENTS.md, next-env.d.ts, package.json changes and all revision-6/research-monitor work were preserved and were not edited by this slice.
