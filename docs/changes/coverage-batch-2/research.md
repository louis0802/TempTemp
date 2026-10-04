# Bounded dual-path research — 2 October 2026

All twelve selected merchants were assessed independently. The pre-task census and cohort are frozen in baseline-merchants.json and selection.md/json. Identity review preceded merchant acquisition: the explicit Ajumma’s merge is separate from the batch's source outcomes. The canonical reports are generated from checked identity/authority reviews, source-decisions.json, immutable captures and the runtime source definitions, rather than manual row-status changes.

## Capture scope and budgets

research-ledger.json records **90 public request attempts: 69 HTTP 200 responses, one HTTP 404, one HTTP 301, and 19 transport failures**. Eighteen failures are the initial sandbox DNS restriction, not merchant access blocks. The remaining failure is the linked Pizza Hut JavaScript asset exceeding the existing 3 MB ceiling; no body was retained and the ceiling was not increased. The EN Group 301 was recorded, and its exact HTTPS destination was then explicitly captured. No other redirects were followed. Each merchant used 3–17 attempts, within its independent 24-request budget.

Capture manifests record requested URL, response status/content type, capture time, bytes, SHA-256, redirect destination and error. research-ledger.json adds explicit purpose and per-merchant totals. New merchant fixture directories contain only actual captured responses and attempt manifests. No prior capture is overwritten. The reusable public transport validates public addresses, uses HTTPS GET with identity encoding, sends no cookies/authentication, strips response cookies from recorded metadata and stops at limits or interruption. No browser execution, private backend endpoints, credential submission, recursion, challenge retries, media downloads, OCR or audio/frame extraction occurred.

Live discovery search located candidate pages; exact captures provide replay authority. Indexed legal copy where capture is a JS shell remains separately qualified. Source families reuse existing WordPress/corporate HTML/merchant-campaign categories; Cococart's headless catalogue is structurally distinct commerce, not a promotion directory. Shiok's promotional source family stays unknown despite its observed Wix technology: CMS recognition does not prove promotion semantics.

## Track A

### Kimpson's Table — source_candidate

[Merchant-branded Cococart shop](https://kimpsontable.cococart.co/) serves a subscription/product catalogue, explicitly reports that the shop is closed, and links exact Instagram `kimpsonstable`. Menu/catalogue availability does not establish dated restaurant promotion acquisition. The captured merchant-controlled shop verifies that account for that storefront; its public profile exposes no feed items, so it is blocked on feed boundary and public-feed exposure. The shop does not establish a current physical outlet directory or local legal operator.

[Official landlord venue article](https://www.fareastmalls.com.sg/en/discover/Kimpsons-Table) names founder Patrick Kim, identifies the Chef X location at Clarke Quay Central and links the distinct exact account `kimpsonstable.sg`. Its tenancy period is venue context, not campaign validity. The landlord cannot establish merchant-controlled account ownership. This second account remains unverified and was not probed; the current venue/storefront relationship needs independent merchant evidence. Do not silently combine these account tracks or assume the older catalogue is the current restaurant source. No adapter.

### More Yogurt — blocked

[Global brand about page](https://www.more-yogurt.com/index/about) identifies Shanghai BUOY Catering Management Co., Ltd. The explicitly linked [/index/news](https://www.more-yogurt.com/index/news) is a corporate HTML card archive with three indicated pages. Its older global promotional/news posts and article dates establish neither Singapore campaign coverage nor validity. We stopped before pagination/detail implementation because Singapore operator/domain participation is unproven.

[Jewel's official tenant page](https://www.jewelchangiairport.com/en/dine/more-yogurt.html) establishes a tenant at #B2-234; one landlord tenant page is not authoritative enumeration of all merchant outlets. No captured merchant-controlled Singapore website, promotion root or supported Instagram backlink was found. Third-party search hints of a similarly named social account are discovery only and were not followed or verified. No adapter; resolve Singapore operator, merchant-controlled source and outlet authority first.

### Shiok Burger — blocked

[Official merchant site](https://www.shiokburger.com/) has menu imagery, ordering/franchise links and funding news, plus exact `shiokburger_sg` Instagram/Facebook/TikTok links. Merchant menus/contact/franchise control provide the reviewed website ownership chain; local legal operator remains unverified in the captured merchant pages. The shown Aljunied contact address is not a complete restaurant branch directory.

No independently enumerable promotion collection is exposed by the captured homepage. Instagram ownership is verified through its exact website backlink, and one bounded public profile assessment sees nine items plus unresolved continuation. Chronology and feed boundary remain unproven. No adapter; do not substitute menu products or funding news for campaigns. No other social network was probed.

### Gelare — blocked

[Official promotions page](https://www.gelare.com.sg/promotions/) contains three unique, exactly linked gallery assets. Their lightbox titles are opaque export metadata, and campaign facts are image-only. Filenames, upload directories and gallery order cannot supply title, benefit or validity. The linked menu PDF is ordinary menu context, not a complete campaign source. The [official story](https://www.gelare.com.sg/our-story/) and [contact/location page](https://www.gelare.com.sg/contact-us/) establish brand control and a location surface; captured copy does not establish the local legal entity or independently corroborated directory completeness.

Exact website backlink verifies `gelaresg`. Its profile exposes twelve items and continuation, without deterministic feed coverage. No useful safe textual web model was proven, so no metadata-only placeholder adapter was created. Neither old 2024 asset paths nor post timestamps establish current promotion validity.

### 4Fingers — blocked

[Official homepage](https://www.4fingers.com.sg/) and [promotions root](https://www.4fingers.com.sg/promotions) return the same public Angular shell, with no bounded campaign cards or public continuation contract. We did not execute scripts or access internal APIs. Indexed official promotion text is qualified as discovery, not stable offline acquisition.

The [public ordering-shell page with inline legal terms](https://order.4fingers.com.sg/corp/my_profile) explicitly identifies 4Fingers Pte. Ltd., the main website, and exact `gimme4fingers` social backlinks. Only publicly returned footer/legal text was inspected; no account fields were completed or authenticated data obtained. This independently verifies Instagram ownership. The profile exposes twelve items and unresolved continuation. No captured complete official physical-outlet directory; no web or Instagram adapter.

### Captain Kim — shadow_only

[Kingdom Food legal page](https://kingdomfood.sg/terms-of-use-privacy-policy/) identifies Kingdom Food Holding Pte Ltd. Its [promotion index](https://kingdomfood.sg/promotions/) tells readers to follow brand pages but does not enumerate all Captain Kim campaign surfaces. Two exact venue pages provide deterministic isolated campaign sections: [Tampines Junction / Junction 10](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot-tamp-j10/) and [Clementi Grantral Mall](https://kingdomfood.sg/captain-kim-korean-bbq-hotpot/). Their stated three locations and physical addresses establish an official outlet source; no Google enumeration is used.

The implemented adapter separately enumerates these venue sections and the [takeaway page](https://kingdomfood.sg/captain-kim-delivery/). It extracts seven candidates: October student/early-bird/4+1 variants, the explicitly dated September 4+1 variant, and the undated takeaway discount. Candidate native identity is the exact page/section ID; duplicate heading strings or the same image appearing on different venue pages cannot merge scopes. Explicit same-month ranges carry their stated year. Section/page venue context is retained but does not invent physical participation. Image-to-text equivalence, complete campaign boundary and shared-page item identity still need review before activation.

Offline generic gate: **7 candidates / 1 expired excluded / 6 review / 0 ready**. The undated takeaway has no validity inferred from page publication. No runtime outlet provider or publication bypass was introduced. Exact legacy HTTP social hyperlink, safely upgraded without changing account, verifies `captainkimsg`; its profile exposes twelve items with unresolved continuation. Registry source `captain_kim_sg` stays disabled.

## Track B

### Pizza Hut — source_candidate

Frozen canonical post URL resolves through exact matching canonical/Open Graph native identity to **`pizzahut_sg`**, rather than a name-based account guess. The captured official homepage/privacy/deal/location routes return the same JS shell. No captured exact merchant-controlled Instagram backlink verifies ownership. Indexed [official privacy policy](https://www.pizzahut.com.sg/privacy) identifies Pizza Hut Singapore Pte Ltd, but its policy text is not claimed as raw-capture replay evidence. The [Find a Hut](https://www.pizzahut.com.sg/find-a-hut) surface is location-dependent commerce, not demonstrated outlet enumeration.

The exact account profile assessment is access-interrupted; the linked post has public caption metadata and ten visible items, but unresolved continuation and chronology. A linked public asset exceeded the byte limit and was not retried with higher limits. No app/backend reverse engineering or adapter. Account outcome `exact_account_unverified`; acquisition blocked; merchant remains candidate because ownership is still unresolved.

### Kei Kaisendon — source_candidate

[Official merchant home](https://www.keikaisendon.com/) and [terms](https://www.keikaisendon.com/terms-conditions/) provide reviewed domain control, while the local legal entity remains unverified. [Find Us](https://www.keikaisendon.com/find-us/) is an official physical-outlet source. Website products and the cached Instagram widget are not a complete promotion feed: visible truncated captions and a fixed slice of posts do not prove enumeration, continuation or campaign classification.

Exact website backlink verifies **`keikaisendon`**; public profile contains eight items with unresolved continuation. Both frozen canonical posts `DdWQHfKBdiK` and `DdMLD32Ivbz` return public shells without native/account metadata. They remain **`exact_account_unresolved`**, separately from the owned profile. Transport-final Facebook unsupportedbrowser URLs are not identity evidence. No web or Instagram adapter. Next research must bind those post identities from independent exact public evidence; do not re-verify the already owned profile or assign it to those posts from the merchant name.

### McDonald's — shadow_only

[Official website](https://www.mcdonalds.com.sg/) and [terms](https://www.mcdonalds.com.sg/website-terms) establish Singapore website control; the captured terms do not explicitly establish the local legal operating entity. Exact backlink verifies **`mcdsg`**, and both frozen post IDs resolve to it through standard metadata, including a /p/ request canonically represented as a reel with the same native ID. Its profile/post captions are accessible, with continuation and chronology unproven.

[News and Updates](https://www.mcdonalds.com.sg/news-and-updates) reports eight records, renders three and has load-more; current homepage campaigns lie outside that news archive. The [locator](https://www.mcdonalds.com.sg/locate-us) refers visitors to the app instead of returning a public official branch list. A useful bounded shadow adapter extracts the two explicit public campaign documents [McSaver](https://www.mcdonalds.com.sg/McSaver) and [Breakfast McSaver](https://www.mcdonalds.com.sg/bfmcsaver). Each document is a deterministic review candidate; meal variants and an embedded exercise contest remain unsplit review context. Contest dates never become meal validity, and explicit outlet exclusions cannot be turned into an invented participating directory. **2 candidates / 0 excluded / 2 review / 0 ready**. Source `mcdonalds_sg` stays disabled.

### Sushiro — shadow_only

[Official policy](https://www.sushiro.com.sg/privacy-policy/) identifies SUSHIRO GH SINGAPORE PTE. LTD. Exact promotion-page backlink verifies **`sushirosingapore`**, and the frozen post's matching native Open Graph/canonical URL binds it to that account. Profile/post public HTML exposes visible identities with unknown continuation and unproven chronology.

The [official promo directory](https://www.sushiro.com.sg/promo/) exposes one exactly associated card and a [linked campaign detail](https://www.sushiro.com.sg/2026/09/23/to-the-moon-and-back/). The card/title/canonical/detail-content relationship is replayable. Its text has a Sep–Oct range without a year; neither the article URL nor publication metadata supplies that year. Prices/new items and image-only facts do not prove a complete promotional proposition or physical participation. The [official location directory](https://www.sushiro.com.sg/contact-location/) distinguishes operating, upcoming and closed branches; preserve source spelling and closure statuses. No coordinates or participation were fabricated. **1 candidate / 0 excluded / 1 review / 0 ready**. Boundary, validity year and outlet participation keep `sushiro_sg` disabled. The unrelated site search submit button is not falsely treated as campaign pagination.

### Bari Bari Steak — shadow_only

[Merchant site](https://baribaristeak.com.sg/) identifies the concept as EN Group and links the [corporate site](https://engroup.com.sg/), whose destination was captured after its explicit redirect. [Official locations](https://baribaristeak.com.sg/locations/) lists six named steak outlets. Bari Bari Grand has separate branding/venue and remains a separate historical merchant; shared operator does not establish an alias.

[Promotions](https://baribaristeak.com.sg/promotions/) has five unique WordPress post cards with complete own-card textual copy, dates absent. Grid Ajax continuation/total coverage is unproven. Five exact detail URLs were captured; each canonical/title identifies the requested post, but the body template exposes related promotions and lacks an unambiguous requested-campaign body. The adapter never imports related-post facts. It deterministically takes each candidate's title/benefit/text only from its exact listing card, retains the detail association blocker, and keeps differently timed outlet groups in review. **5 candidates / 0 excluded / 5 review / 0 ready**. Source `bari_bari_steak_sg` stays disabled.

Exact official backlink verifies Instagram **`baribaristeaksg`**; both frozen content IDs resolve to that account, with /p/ requests represented as reels. The frozen Facebook reel independently has exact canonical/Open Graph association to numeric Facebook account **`61583504727882`**, matching the merchant site's exact profile.php?id backlink. It is platform-specific and never inherits Instagram authority. One Facebook post is not account feed enumeration; no Facebook profile crawl or runtime adapter was added. Instagram public structure still has unresolved continuation/chronology.

### The Coffee Bean & Tea Leaf — blocked

[Official store home](https://www.coffeebean.com.sg/) identifies The Coffee Bean & Tea Leaf Pte Ltd and links exact **`coffeebeansg`**. The frozen post resolves to a same-native-ID reel through standard metadata, independently from website ownership. Public profile/reel captions are accessible but continuation and chronological boundary are unproven.

The official web home is a Magento commerce catalogue with two linked social reels, not an enumerable promotion directory. The [public locator](https://www.coffeebean.com.sg/amlocator) is a legitimate merchant outlet surface; its presence alone does not establish promotion participation. App vouchers have individual validity/restrictions unavailable in a bounded public campaign source. No products, merchandise or app membership rules were converted to physical campaign facts. No adapter.

## Instagram decision

Ten newly verified accounts: **kimpsonstable, shiokburger_sg, gelaresg, gimme4fingers, captainkimsg, keikaisendon, mcdsg, sushirosingapore, baribaristeaksg, coffeebeansg**. Combined with the prior four, inventory has fourteen verified Instagram accounts. Pizza Hut `pizzahut_sg` and landlord-discovered `kimpsonstable.sg` remain exact unverified profile candidates. The latter was not probed and does not receive an acquisition assessment. There are fifteen actual account assessments including Pizza Hut. The two Kei historical post/account identities remain unresolved.

No shared **InstagramAccountAdapter** is justified. Several public responses expose a similar initial feed slice, but none proves deterministic continuation, complete bounded feed boundary, chronological coverage and safe repeated acquisition. Kimpson's older profile does not expose a feed; Pizza Hut's profile is interrupted. Existing permission-unestablished findings remain separate from technical completeness. Caption extraction is evidence of text access only. Publication timestamps remain publishedAt; media-only facts remain unknown. Existing ajummasg, shinrai.sg, sinpopobrand and starbuckssg capture/conclusion bytes are preserved by reconstructing and hash-checking the pre-task acquisition review, without re-requesting those accounts.

## Reproducible decisions and limits

Run `node --import tsx scripts/research/coverage-batch-2.ts` for offline capture replay, generic-gate dispositions, count delta, batch table, research request ledger and canonical report regeneration. Run `npm run research:merchant-progress -- --output .local/merchant-source-map/<new-directory>` to obtain an additional immutable report snapshot. These commands consume existing checked inputs and captures only, without network or a database.

Four new runtime definitions are appended to the existing registry and are disabled shadow sources. No social definition, outlet provider, persistence change, migration, scheduler or processor-version change. Current generic persistence rejects a new shadow before connection/query/outlet calls. Captain's same-page native section candidates are research-only while disabled; the current persistence uniqueness check must also be considered before a future activation. All publication/outlet/holiday/weekdays/media ambiguities remain review, never merchant-specific exceptions.

Enabled acquisition remains Pepper Lunch and Shake Shack. Paradise, Gourmet Carousel, FairPrice, Kris+ and Dian Xiao Er remain shadow; CS Foods remains blocked. The entire original cohort outside the twelve selected merchants and Ajumma’s alias correction retains its prior full ledger rows.
