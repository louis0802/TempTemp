# Gourmet Carousel official-source research

Observed 1 October 2026 (Singapore). Evidence is immutable HTML, not OCR, and no Telegram source was fetched or matched. The frozen 139-row map remains historical context only.

## Operator ownership and venue identity are separate

The existing verified Royal Plaza assessment is confirmed by [the operator privacy policy](https://www.royalplaza.com.sg/policies/privacy-policy): it explicitly identifies Royal Plaza on Scotts as the operator of royalplaza.com.sg. Capture: `tests/fixtures/direct-sources/gourmet-carousel/research-2026-10-01/privacy.html`; metadata in that directory's capture-provenance.json. Hostname/logo alone was not used.

[The official Barista page](https://www.royalplaza.com.sg/dine/barista) names **Gourmet Carousel - Barista Experience**, identifies its relationship to Carousel and Royal Plaza, gives daily operating timing, and explicitly locates the counter at **Level 1 (Lobby), Royal Plaza on Scotts, 25 Scotts Road, 228220**. The hotel/dining footer independently gives Singapore 228220. This proves that named counter, not every Carousel operation. The buffet restaurant **Carousel**, **Palm Café**, **In-Room Dining**, **Royal Club Lounge**, and operator-wide offers remain separate. `ownership.json` records the operator/venue evidence independently.

## Exact boundary answers

1. No dedicated complete Gourmet Carousel promotion directory was established. The Barista page is a venue/service surface with an isolated Coffee Day campaign, not an exhaustive acquisition root by itself.
2. `/dine/offers` is a broader mixed dining directory with eight static cards. `/dine` supplies hotel dining navigation; it was inspected only as linkage evidence.
3. All eight cards, their Discover links, and the Coffee Day callout are present in server HTML. The pastry detail also contains an explicit complimentary-delivery proposition.
4. No visible pagination, load-more, AJAX collection control, or dynamic category filter appears in the captured listing. Venue navigation links are separate pages. Menus on Barista are collapsed **already-rendered** HTML panels, not additional campaign records. Image/logo carousels are not candidate collections. JavaScript assets/API collections were not recursively inspected, so hidden/unbounded acquisition is not claimed absent across the site.
5. The two observed Gourmet campaigns can be reached by the registered roots `/dine/offers` and `/dine/barista`. This proves captured reachability only. No deterministic exhaustive list of all Gourmet service/campaign pages was established.
6. Eight individual `/dine/offers/<slug>` detail URLs exist; Coffee Day is embedded in the Barista service page and has no separate observed detail URL. All eight detail paths were fetched/classified.
7. **Yes:** Coffee Day exists on `/dine/barista` without a matching card in `/dine/offers`. Service pages can bypass the central offer cards. Adding that one observed service root does not prove every future/other Gourmet campaign path is covered.
8. The site distinguishes Gourmet Carousel's Barista counter, Carousel buffet, Palm Café and other dining services. Gourmet Carousel also appears explicitly on the Moon Pastry detail. Brand identity there does not establish participation at the Barista counter.

`/dine/carousel` was a narrow exploratory alias probe; its response rendered Dining rather than a named venue. It is retained as evidence and is neither registered nor used as venue authority. No acquisition relies on that alias.

## Campaign versus non-campaign classification

The nine inspected candidate paths comprise **two in-scope Gourmet promotion pages**, **two other-venue Carousel campaign pages**, and **five pages without an isolated Gourmet promotional proposition**. In the merchant-scoped ArchiveClassification, the latter seven are `non_promotion`; this does not deny that the other venue runs promotions.

- Barista: Coffee Day callout explicitly offers free coffee, dated terms, registration, one coffee per person and exact counter participation. Extract only that isolated block; do not include evergreen menus, daily opening hours or sibling campaigns as campaign facts.
- Carousel Moon Pastries: seasonal collection plus explicit complimentary islandwide delivery for orders of 50 boxes and above. Ordinary $88 box pricing alone does not qualify it. Terms are preserved verbatim; the compact benefit label cites the complete original delivery clause. Collection beginning 20 August 2026 does **not** establish promotion start/end validity. Hotel self-collection does **not** establish Barista-counter participation.
- Lunch SG61 and Thai campaign: explicitly Carousel buffet, never relabelled Gourmet Carousel.
- À la carte, breakfast/dinner buffet descriptions, vouchers and high-tea information: no isolated Gourmet campaign proposition; ordinary prices/limited menu descriptions alone are not candidate defaults.

Unknown paths, changed structure, unknown controls, unisolated/overlapping callouts and ambiguous venue association fail classification/completeness conservatively. All current nine paths classify, but source enumeration remains **partial**.

## Bounded acquisition and immutable evidence

Initial research: five explicitly named official roots, then eight visible card details using the captured offers listing as parent (13 actual HTTP responses). Defaults were unchanged. One sandbox attempt failed DNS for the five roots before any response; authorized network execution succeeded. No failed attempt was treated as evidence.

After 27 initial source tests passed, one structural adapter acquisition fetched **two registered roots + eight details = ten successful HTTP responses**, zero HTTP/redirect failures. All response bodies and requested/final URL, capture/observation instant, status, content type, bytes, SHA-256 and purpose are under `tests/fixtures/direct-sources/gourmet-carousel/live-2026-10-01/`. The existing fetcher uses a frozen acquisition instant for fetchedAt; metadata explicitly records that convention. No assets, QR targets, menu images, Google/OneMap requests or arbitrary service pages were fetched.

Effective limits: 40 requests, 5 listing pages, 20 detail pages, 8 evidence pages; 3,000,000 bytes per response; 12,000 ms timeout; 3 redirects; unchanged DNS pinning/SSRF protections. No source-specific count profile.

## Final source decision

Register **gourmet_carousel_sg**, operator **Royal Plaza on Scotts**, merchant **Gourmet Carousel**; this is a merchant-specific shadow, not an operator-wide crawler. `enabled=false`, `autoPublish=false`, `enumeration.complete=false`.

Exact source activation blockers: `partial_enumeration`, `service_page_campaign_outside_listing`, `gourmet_service_boundary_unproven`. Missing pastry validity/physical participation are separate candidate review blockers. Do not force activation or lower the generic gate.
