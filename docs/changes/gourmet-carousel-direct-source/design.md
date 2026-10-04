# Gourmet Carousel direct source — design

Extend existing source IDs/adapter registry with a merchant-specific `gourmet_carousel_sg` only if official evidence supports that scope. Keep operator Royal Plaza on Scotts separate from merchant Gourmet Carousel and Carousel/Palm Café/other venues. Start policy disabled/autoPublish false.

Use BoundedDirectFetch, canonical URLs, immutable hashes, Cheerio, listing enumeration helpers, campaignDates, newCandidate/cite/finalizeCandidate, existing directCampaignLifecycle and publication/persistence unchanged. No new tables or migration; direct-source-v2 stays unchanged.

Initial candidate boundary: `/dine/offers` for static card classification and `/dine/barista` only after confirming its Gourmet Carousel identity and campaign block. These are explicit roots, not permission to crawl arbitrary dining pages. Unknown card destinations, controls and service bypasses retain issues and incomplete enumeration. Document captured selectors and precise final path allowlists before implementation.

Add an official Gourmet Carousel venue provider only if the service-page evidence establishes a fixed venue. Use MerchantOutletProvider/DirectorySnapshot and the existing PromotionParticipationResolver; never import research/Telegram or use Google to decide venue existence/participation.

Tests use immutable bounded captures and semantic mutations, mocked coordinates and disposable local PostgreSQL. Preserve global network limits and count defaults. Raw captures are never formatted or replaced. Record protected before/after hashes and per-candidate generic gate reasons.

Risk: the dining offers directory may omit independent service-page campaigns and the site has multiple distinct dining identities. A safe shadow adapter is useful even when complete future discovery cannot be proven.

## Captured design decisions

Final acquisition roots are `/dine/offers` and `/dine/barista`, exact `www.royalplaza.com.sg` host. Dining cards are `section.blocks-offer-cards article` with h3 and Discover anchors. Detail discovery accepts only `/dine/offers/<slug>`; the service root is captured directly, never recursively discovered. All eight current cards require bounded detail classification. Promotion blocks are isolated `.blocks-about-dining .better-rich-text .bb-callout` with a campaign h4, explicit economic proposition and venue-associated campaign copy. Each isolated block gets a stable heading-based native ID; no sibling/menu/footer facts are merged. Unknown identity/structure/multiple overlapping campaigns remain unresolved.

The current service campaign is not represented in the eight-card directory. `enumeration.complete` therefore stays false with `partial_enumeration`, `service_page_campaign_outside_listing` and `gourmet_service_boundary_unproven`. Even a locally complete captured card traversal is not a complete merchant promotion boundary. Registry policy stays disabled.

Official provider: exact h1 `Gourmet Carousel - Barista Experience`, standalone fixed-address paragraph outside campaign callouts, operating daily timing and explicit Royal Plaza/Carousel relationship. Provide that one named physical venue only; do not infer the buffet restaurant or an exhaustive Gourmet branch list. Exact address is `Level 1 (Lobby), Royal Plaza on Scotts, 25 Scotts Road, 228220`. Existing place resolution preserves branch.address and supplies coordinates; no live place requests are needed for this shadow slice.

## Final extraction and publication integration

The dedicated pastry detail uses `.dine-offer-single .better-rich-text`, title `.tagline-header-title` and individual `.terms-and-conditions li` nodes. Its seasonal collection identity plus explicit complimentary-delivery term qualifies the campaign; box/menu pricing alone does not. Normalize only the benefit display label to fit the existing 60-character Promotion contract; retain the full delivery clause in fact provenance, eligibility and terms. Collection dates and hotel self-collection remain unsupported campaign validity/Barista participation.

Service callouts must have exactly one h4 and distinct normalized heading identities. Terms stop before the separate data-consent section. Campaign date parsing accepts explicit campaign-validity declarations only, not menu/price/publication labels; one-day dates expand within source-specific code for existing campaignDates. Hours normalize explicit campaign terms to HH:mm–HH:mm. Unknown weekday restrictions remain null and the shared gate fails closed.

Only source ID/adapter registration and the default provider list change shared modules. Revision hashing, dedupe, lifecycle, processor version, review storage and persistence remain byte-identical. The provider preserves official addresses; existing ApiPlaceResolver already supplies coordinates while retaining branch.address. No schema migration.
