# Research evidence and decision

## Frozen cohort and account inventory

The corrected source-origin audit is `.local/source-origin-audit/2026-09-30-social-corrected-offline/audit.json`, SHA-256 `a0cb366e8beebc638f0f85e35c28d1acf88ef5718a142d99ced0d5b95fbcd99f`. Its canonical candidate URLs preserve Instagram identities despite Facebook unsupported-browser transport. The original 139 merchant rows contain 138 historical merchants, one registry-only operator (Paradise Group) and 67 separate unresolved historical records. No labels or counts were repaired by guessing.

The generated inventory has 16 normalized merchants with social candidates. It has five exact platform/account candidates: four Instagram accounts and one unverified TikTok account (`dcuisines.restaurant`). Four Instagram accounts are verified; zero exact Instagram accounts remain unverified. Another 11 merchant rows have unverified Instagram **post candidates with account identity unknown**. These are not counted as known Instagram accounts. Sixteen account-unresolved social content records remain separate. Twenty-seven neighboring/context or non-promotion records and eight unresolved merchant identities are excluded from merchant social assignment. Original canonical and transport URLs stay in the inventory/audit.

Historical punctuation/diacritic normalization remains unchanged, so independently named rows such as Marche/Marché and Ajumma’s/Ajumma’s Korean Restaurant are not fuzzy-merged.

## Selection and independent ownership

Selection followed the frozen evidence review; names were not preselected in the plan. Four accounts met independent exact website-backlink ownership evidence and offer useful variation:

| Merchant | Exact Instagram account | Independent website backlink | Variation motivating research |
| --- | --- | --- | --- |
| Ajumma's Korean Restaurant | ajummasg | https://www.ajummassg.com/ | Multi-outlet; text-led meal bundle |
| SHINRAI | shinrai.sg | https://www.shinrai.sg/ | Single venue; promotional reel caption |
| Sinpopo Brand | sinpopobrand | https://www.sinpopo.com/ | Restaurant/retail; image and reel representations |
| Starbucks | starbuckssg | https://www.starbucks.com.sg/ | Multi-outlet; membership promotion |

The checked `docs/research/social-source-authority-review.json` records merchant control review, exact account, URLs, notes, capture file/hash and frozen discovery association. Ownership comes from captured merchant-controlled website hyperlinks, not Telegram, search labels, display names or account badges. Merchant-controlled ordering/menu/contact/location context was reviewed alongside the exact backlink. Sinpopo's independent official privacy policy also identifies Sinpopo Brand Pte Ltd (https://www.sinpopo.com/policies/privacy-policy); no inference is made from a shared social hostname.

Poke Theory's website returned a JavaScript shell with no backlink anchors. The attempted Beard Papa website hostname did not resolve. Neither supplied independent account verification and neither entered the verified batch. The first sandbox DNS failure is retained in a separate manifest; network-enabled captures succeeded for five website pages. It is not reported as merchant access blocking.

## Same public acquisition checks across all four accounts

`tests/fixtures/social-sources/instagram-2026-10-02/manifest.json` retains eight bounded unauthenticated public HTTPS responses: four profiles and four previously linked posts. All returned HTTP 200. No redirect was followed; no login, cookie jar, private API, dynamic API reverse engineering, browser automation, challenge bypass, images or video downloads were used.

| Account | Profile HTML exposed items | Linked post caption | Exact account association | Continuation / chronology |
| --- | ---: | --- | --- | --- |
| ajummasg | 0 | Accessible public metadata | Verified scoped og:url and canonical native ID | No profile feed boundary; chronology unproven |
| shinrai.sg | 12 | Accessible public metadata | Verified; linked /p identity is canonically a reel | Show-more unresolved; chronology unproven |
| sinpopobrand | 6 | Accessible public metadata | Verified; linked /p identity is canonically a reel | Show-more unresolved; chronology unproven |
| starbuckssg | 12 | Accessible public metadata | Verified scoped og:url and canonical native ID | Show-more unresolved; chronology unproven |

Visible IDs are observations, not a claim that the current bounded feed is complete. Profile and post pages can expose different public representations. Standard canonical and account-scoped Open Graph URLs establish the four exact linked item/account associations independently of discovery hints. Unresolved/pinned ordering cannot establish chronological coverage. A signup prompt is present on post HTML, but captions are publicly exposed; this is not falsely labelled an HTTP/login wall. Captured challenges/redirects would instead block readiness.

The frozen SHINRAI post is dated in 2024 in public source representation. Discovery in a September 2026 Telegram signal never makes that a 2026 campaign. Source publication metadata remains publishedAt only; absent caption validity stays unknown.

Public captions deterministically identify promotion semantics for SHINRAI, Sinpopo and Starbucks in the research evaluator. Ajumma's bundle/deal wording is retained as unresolved rather than forced into a default promotion. All are research results, not runtime PromotionCandidates. Text-only fixtures additionally prove explicit year-bearing caption dates, media-only unknowns and ordinary-post rejection. No OCR, image accessibility guess or video/audio fact extraction was added.

## Gate outcome

Bounded autonomous Instagram enumeration is **not established**. Three accounts expose similar item links, but every account lacks verified bounded coverage and continuation. Permitted sustained automated access is also unestablished; the official Terms page fetch returned 429, so this task does not invent an access grant or assert verified policy content.

No runtime InstagramAccountAdapter, merchant-specific social adapter, registered social source ID or production social activation was created. The four exact verified accounts have blocked research acquisition assessments until boundary/access evidence is resolved; they remain visible in the verified-social-needs-enumeration cohort. Other social candidates retain unverified/account-unresolved state. No parallel schema or persistence was introduced. Shared public DOM and caption assessment helpers are research-only.

Website sufficiency remains independent: Pepper Lunch and Shake Shack acquire autonomously; every existing shadow/blocked website assessment is preserved. Source kind and social scope are compatible optional source-definition/provenance fields, with shared transport/publication account checks. Existing direct-source-v2, outlet directories, exact fingerprints, persistence transactions and reviewer behavior remain the same.

## Reproduction

`npm run research:merchant-progress -- --output .local/merchant-source-map/<new-run>` reads frozen/checked bytes only, writes a new JSON/Markdown/CSV report and regenerates the canonical progress document plus inventory/acquisition JSON. It makes no requests and does not ingest. Existing output directories cannot be overwritten; symlink ancestors are rejected.

The checked output for this slice is `.local/merchant-source-map/merchant-progress-social-2026-10-02-verified/`. Full source tracks and cohorts are in merchants.json; `docs/research/merchant-automation-progress.md` is the generated control surface. Research artifacts are evidence, never server activation configuration.
