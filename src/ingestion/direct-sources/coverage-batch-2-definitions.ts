import type { DirectSourceDefinition } from "./types";
import {
  bariPromotions,
  captainRoots,
  mcCampaigns,
  sushiroPromotions,
} from "./adapters/coverage-batch-2";

const review =
  "docs/changes/coverage-batch-2/research.md (captured official source boundaries, 2026-10-02)";
const definitions = [
  {
    id: "bari_bari_steak_sg",
    merchant: "Bari Bari Steak",
    operator: "EN Group",
    origin: "https://baribaristeak.com.sg",
    adapter: "bari-bari-steak",
    roots: [bariPromotions],
    authority: ["https://baribaristeak.com.sg/", "https://engroup.com.sg/"],
    blockers: [
      "bari_grid_continuation_unproven",
      "campaign_validity_unspecified",
      "outlet_time_groups_require_review",
      "detail_campaign_body_unassociated",
    ],
  },
  {
    id: "captain_kim_sg",
    merchant: "Captain Kim",
    operator: "Kingdom Food Holding Pte Ltd",
    origin: "https://kingdomfood.sg",
    adapter: "captain-kim",
    roots: captainRoots,
    authority: [
      "https://kingdomfood.sg/terms-of-use-privacy-policy/",
      captainRoots[0],
    ],
    blockers: [
      "captain_campaigns_outside_central_index",
      "image_text_equivalence_unproven",
      "venue_page_scope_requires_review",
    ],
  },
  {
    id: "sushiro_sg",
    merchant: "Sushiro",
    operator: "SUSHIRO GH SINGAPORE PTE. LTD.",
    origin: "https://www.sushiro.com.sg",
    adapter: "sushiro",
    roots: [sushiroPromotions],
    authority: [
      "https://www.sushiro.com.sg/privacy-policy/",
      "https://www.sushiro.com.sg/contact-location/",
    ],
    blockers: [
      "sushiro_directory_boundary_unproven",
      "validity_year_unstated",
      "outlet_participation_unstated",
    ],
  },
  {
    id: "mcdonalds_sg",
    merchant: "McDonald's",
    operator:
      "McDonald's Singapore (website controller; local legal entity not stated in captured terms)",
    origin: "https://www.mcdonalds.com.sg",
    adapter: "mcdonalds",
    roots: mcCampaigns,
    authority: [
      "https://www.mcdonalds.com.sg/website-terms",
      "https://www.mcdonalds.com.sg/",
    ],
    blockers: [
      "mcd_news_load_more_unresolved",
      "mcd_campaigns_outside_news_directory",
      "multiple_propositions_require_review",
      "official_outlet_directory_app_only",
    ],
  },
] as const;
export const coverageBatch2Sources: readonly DirectSourceDefinition[] =
  definitions.map((d) => ({
    id: d.id,
    label: d.merchant,
    operator: d.operator,
    sourceKind: "merchant_web",
    origin: d.origin,
    allowedHosts: [new URL(d.origin).hostname],
    listingUrls: d.roots,
    adapter: d.adapter,
    authority: { ownership: "verified", evidenceUrls: d.authority, review },
    activationReview: {
      enumeration: "partial",
      blockers: d.blockers,
      evidenceRefs: [
        review,
        "docs/changes/coverage-batch-2/source-decisions.json",
      ],
    },
    publicationPolicy: {
      enabled: false,
      autoPublish: false,
      merchant: d.merchant,
      category: "Meals",
      outletStrategy: "official_directory",
    },
  }));
