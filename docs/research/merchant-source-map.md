# Merchant source onboarding map

Research-only engineering onboarding map; historical counts are discovery signals, never production authority.

```json
{
  "merchant_count": 139,
  "distinct_adapter_counts": {
    "enabled": 2,
    "shadow": 1
  },
  "historical_merchant_count": 138,
  "adapter_status_counts": {
    "enabled": 2,
    "none": 135,
    "shadow": 2
  },
  "autonomous_status_counts": {
    "disabled_shadow": 2,
    "enabled": 2,
    "not_onboarded": 135
  },
  "source_family_counts": {
    "app_deeplink_only": 1,
    "app_deeplink_with_public_directory": 1,
    "corporate_html_promotion_directory": 1,
    "json_backed_retail_promotions": 1,
    "platform_static_campaign": 1,
    "wix_promotion_collection": 1,
    "woocommerce_sale_catalog": 1,
    "wordpress_dated_promotions": 1,
    "wordpress_promotion_directory": 3
  },
  "unresolved_record_count": 67
}
```

Signals are post identities, not authority or automatic priority. Unknown source evidence stays unknown. Brands and source families remain separate.

| Merchant | Signals | Offers | Adapter | Ownership | Enumeration | Families | Blockers |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| 21 on Rajah | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| 4Fingers | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| 7-Eleven | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| AFTER HOURS | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Ajumma’s | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Ajumma's Korean Restaurant | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| ALC Rice Bowls | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Andaz | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Baci Baci | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Bari Bari Grand | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Bari Bari Steak | 3 | 3 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Beard Papa's | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| BlackTree | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| BOMUL Samgyetang | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Bottega JB | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Braek Acai & Coffee | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Brash Boys Coffee | 1 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Brasserie Astoria | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| BURNT CONES | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Burnt Ends Bakery | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Cai-Ca | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Captain Kim | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Carlton City | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Carnaby | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Casa Lola | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Cavern Restaurant | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Central Plaza | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| CHAGEE | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Chateraise | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Chinatown Tai Chong Kok | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Chin Mee Chin | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Chix Hot Chicken | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Coffeehouse by Kobashi | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Common Grill | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| CS Foods | 1 | 6 | none | probable | partial | woocommerce_sale_catalog | Blocked product pages limit full extraction; Catalogue pattern is observed on another page, not assumed product body structure; Current product price is not proof of Telegram discount; HTTP 403 CleanTalk anti-crawler page; not bypassed; No independent ownership confirmation; historical offer not verified; Old/new sale prices deterministic; no dated campaign terms; Ownership confirmation and anti-crawler access policy needed; Ownership not independently verified; Retail priceValidUntil must not become campaign validity |
| Dancing Crab | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Daya Izakaya | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| D'Cuisine | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Dian Xiao Er | 2 | 2 | none | probable | partial | wix_promotion_collection | Determine public Wix collection/lightbox mapping and ownership before adapter work; Do not assign neighboring gallery captions to selected lightbox offer; Important campaign facts require image inspection; no OCR performed |
| Dill | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Din Tai Fung | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Domino’s | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| dorra Slimming | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Estiatorio Milos | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| FairPrice | 1 | 1 | none | verified | partial | json_backed_retail_promotions | JSON-LD block has trailing extra brace and a rolling priceValidUntil that differs from campaign expiry; do not treat as trustworthy campaign structure; Online product/gift does not establish physical promotion outlet coverage; Participating product set and pagination completeness need bounded follow-up |
| FAME by Dad's Corner | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Family Mookata | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Fangko House | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| foodpanda | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Gelare | 1 | 3 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Genki Sushi | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Good Combo Hotpot & BBQ | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Gourmet Carousel | 1 | 1 | none | verified | partial | corporate_html_promotion_directory | Monitor service-page changes as well as offer cards; no claim of complete hotel campaign coverage |
| Grab | 1 | 1 | none | verified | no | platform_static_campaign | Distinct deal sections have different terms/validity; no merged universal offer; Image-led campaign; no OCR; No independent issuer/platform promotion directory proven by sample; Observed app campaignLandingID=17424 is identity evidence, not public enumerable API; Participating outlet details remain app-dependent; Stable sandbox campaign path from chain is not an enumeration endpoint |
| GrabFood | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Guzman y Gomez | 3 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Gwanghwamun Mijin | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Happy Lamb | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Hello Arigato | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Hokkaido Baked Cheese Tart | 1 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| IKEA | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| I’m donut | 1 | 0 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Jack’s Place | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| JEN Shangri-La | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Kafey Haus | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Katsu-an | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Kei Kaisendon | 5 | 5 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| KFC | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Kimpson's Table | 3 | 8 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Koi Thé | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Kotuwa | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Kris+ | 1 | 1 | none | probable | no | app_deeplink_with_public_directory | Confirm independent ownership link for exact app hostname; Load-more completeness and linked campaign fact extraction remain follow-up; do not use private APIs; Public directory is independently discoverable; sampled Birthday Bash correspondence not found |
| Lao Beijing | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| LiHO | 1 | 0 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| LiXin Teochew Fishball Noodles | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Marché | 1 | 0 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Marche | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| McDonald's | 4 | 4 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Meat Smith | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| MilkyShop | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| More Yogurt | 3 | 5 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Morganfield's | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| MOS Burger | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| MUKAI | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Nasty Cookie | 2 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| New Ubin Seafood | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Next Door Spanish Cafe | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| noci bakehouse | 1 | 0 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| NomNom JB | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Nouri | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| OMMA Korean Charcoal BBQ | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Omuplace | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Papi’s Tacos | 2 | 2 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Paradise Group | 0 | 0 | shadow | verified | partial | wordpress_promotion_directory | oversized_evidence; partial_enumeration; unresolved_load_more |
| Paradise Hotpot | 1 | 1 | shadow | verified | partial | wordpress_promotion_directory | Historical menu differs from currently linked PDF; not current-offer proof; Menu rates and early-bird conditions are not campaign validity; Native multi-column extraction needs layout association; no OCR; oversized_evidence; partial_enumeration; unresolved_load_more |
| Park Side | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Pepper Lunch | 2 | 2 | enabled | verified | yes | wordpress_promotion_directory | Separate outlet enumeration needed; Express format is not a full participating branch list |
| Petite Menu | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Pizza Hut | 3 | 8 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Poke Theory | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| POKKA | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Potato Corner | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| POUT Rooftop Cafe | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Racines | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Rollney | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Saizeriya | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| San Shu Gong | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Secret Recipe | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Seoul Garden | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Shake Shack | 2 | 2 | enabled | verified | yes | app_deeplink_only, wordpress_dated_promotions |  |
| Shi Li Fang | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Shin Katsu | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| SHINRAI | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Shiok Burger | 2 | 5 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| SIDES by the Sidemen | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Singapore Chinese Cultural Centre | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sinpopo Brand | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sip Sip | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Smooy | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Smöoy | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Spicy Noodles SG | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Starbucks | 3 | 3 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Subway | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sukiya | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sushidan | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sushi Express | 2 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Sushiro | 4 | 4 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Takashimaya | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Tavola Aperta | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| The Coffee Bean & Tea Leaf | 3 | 3 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| The Summer Açaí | 1 | 0 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Tofu G | 2 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Tofu G Gelato | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Viva Lavender | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| White Restaurant | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Window on The Park | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Yakiniku Like | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Yo-Chi | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |
| Zapangi Coffee | 1 | 1 | none | unknown | unknown |  | no_captured_direct_source_assessment |

## Frozen inputs

```json
{
  "inputs": [
    {
      "file": "tests/corpus/mvp-conformance-reviewed.json",
      "sha256": "680ce13809180fb76715253ceafefb73ba4f53eb88a394d44ed0e6e887918986"
    },
    {
      "file": ".local/source-origin-audit/2026-09-30-social-corrected-offline/signals.json",
      "sha256": "43ecab993bc5b6640e56c385d9b2a2b13e8f29ae51a94cf0a7eadcef76e08d87"
    },
    {
      "file": ".local/direct-source-audit/2026-09-30T14-13-48-529Z/audit.json",
      "sha256": "7db66e5cebf01e304905b0899dee26761eddd4c367b3e83ac28f5d32b3c86b05"
    },
    {
      "file": "docs/research/merchant-source-map-review.json",
      "sha256": "0ad4ad7269e90f92548a1dec7ade62a26ea31c56ea07c734f9e1680d8e3151d1"
    }
  ],
  "registry_sha256": "a54e26a0e63bab82fb61c67b21bfdafaef51845519b14b76b25abbd933319f10",
  "original_signal_provenance": "Previously captured one_off_refresh signals, now frozen local replay; not new Telegram collection."
}
```

Unresolved historical records: 67. Their labels remain in merchants.json rather than being guessed into brands.
