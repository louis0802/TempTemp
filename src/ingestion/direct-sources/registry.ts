import { ShakeShackAdapter } from "./adapters/shake-shack";
import { GourmetCarouselAdapter } from "./adapters/gourmet-carousel";
import type { DirectSourceAdapter } from "./adapter";
import { PepperLunchAdapter } from "./adapters/pepper-lunch";
import { ParadiseGroupAdapter } from "./adapters/paradise-group";
import { FairPriceAdapter } from "./adapters/fairprice";
import { KrisPlusAdapter } from "./adapters/kris-plus";
import { DianXiaoErAdapter } from "./adapters/dian-xiao-er";
import type { DirectSourceDefinition, SourceId } from "./types";
import { coverageBatch2Sources } from "./coverage-batch-2-definitions";
import {
  BariBariAdapter,
  CaptainKimAdapter,
  SushiroAdapter,
  McDonaldsAdapter,
} from "./adapters/coverage-batch-2";
const review =
  "docs/changes/direct-source-candidate-audit/verification.md (verified operator evidence, 2026-09-30)";
export const directSources: readonly DirectSourceDefinition[] = [
  {
    id: "pepper_lunch_sg",
    label: "Pepper Lunch Singapore",
    operator: "Hot Palette (Asia Pacific) Pte. Ltd.",
    authority: {
      ownership: "verified",
      evidenceUrls: ["https://www.pepperlunch.com.sg/privacy/"],
      review,
    },
    origin: "https://www.pepperlunch.com.sg",
    allowedHosts: ["www.pepperlunch.com.sg", "pepperlunch.com.sg"],
    listingUrls: ["https://www.pepperlunch.com.sg/promo/"],
    adapter: "pepper-lunch",
    publicationPolicy: {
      enabled: true,
      merchant: "Pepper Lunch",
      category: "Meals",
      outletStrategy: "official_directory",
      autoPublish: true,
    },
  },
  {
    id: "paradise_group_sg",
    label: "Paradise Group Singapore",
    operator: "Paradise Group Holdings Pte. Ltd.",
    authority: {
      ownership: "verified",
      evidenceUrls: [
        "https://www.paradisegp.com/privacy-policy/",
        "https://www.paradisegp.com/paradise-hotpot/",
      ],
      review,
    },
    origin: "https://www.paradisegp.com",
    allowedHosts: ["www.paradisegp.com", "paradisegp.com"],
    listingUrls: [
      "https://www.paradisegp.com/",
      "https://www.paradisegp.com/paradise-hotpot/",
    ],
    adapter: "paradise-group",
    publicationPolicy: {
      enabled: false,
      merchant: "Paradise Group",
      category: "Meals",
      outletStrategy: "official_directory",
      autoPublish: false,
    },
  },
  {
    id: "shake_shack_sg",
    label: "Shake Shack Singapore",
    operator: "Shake Shack Singapore Jewel Ptd Ltd",
    authority: {
      ownership: "verified",
      evidenceUrls: [
        "https://www.shakeshack.com.sg/wp-content/uploads/2024/12/SS-Data-Protection-Notice-for-Customers.pdf",
      ],
      review:
        "docs/changes/shake-shack-direct-source/research.md; tests/fixtures/direct-sources/shake-shack/ownership.json (independent legal operator declaration, 2026-10-01)",
    },
    origin: "https://www.shakeshack.com.sg",
    allowedHosts: ["www.shakeshack.com.sg", "shakeshack.com.sg"],
    listingUrls: ["https://www.shakeshack.com.sg/blog/"],
    adapter: "shake-shack",
    acquisitionLimits: {
      maxListingPages: 5,
      maxDetailPages: 50,
      maxRequests: 60,
    },
    activationReview: {
      enumeration: "complete",
      blockers: [],
      evidenceRefs: [
        "docs/changes/shake-shack-autonomous-activation/verification.md",
        "tests/fixtures/direct-sources/shake-shack/complete-2026-10-01-network-enabled/capture-provenance.json",
      ],
    },
    publicationPolicy: {
      enabled: true,
      merchant: "Shake Shack",
      category: "Meals",
      outletStrategy: "official_directory",
      autoPublish: true,
    },
  },
  {
    id: "gourmet_carousel_sg",
    label: "Gourmet Carousel Singapore",
    operator: "Royal Plaza on Scotts",
    authority: {
      ownership: "verified",
      evidenceUrls: [
        "https://www.royalplaza.com.sg/policies/privacy-policy",
        "https://www.royalplaza.com.sg/dine/barista",
      ],
      review:
        "docs/changes/gourmet-carousel-direct-source/research.md; tests/fixtures/direct-sources/gourmet-carousel/ownership.json (independent operator/domain declaration and separate Gourmet Carousel Barista venue evidence, 2026-10-01)",
    },
    origin: "https://www.royalplaza.com.sg",
    allowedHosts: ["www.royalplaza.com.sg"],
    listingUrls: [
      "https://www.royalplaza.com.sg/dine/offers",
      "https://www.royalplaza.com.sg/dine/barista",
    ],
    adapter: "gourmet-carousel",
    activationReview: {
      enumeration: "partial",
      blockers: [
        "partial_enumeration",
        "service_page_campaign_outside_listing",
        "gourmet_service_boundary_unproven",
      ],
      evidenceRefs: [
        "docs/changes/gourmet-carousel-direct-source/verification.md",
        "tests/fixtures/direct-sources/gourmet-carousel/research-2026-10-01/capture-provenance.json",
      ],
    },
    publicationPolicy: {
      enabled: false,
      merchant: "Gourmet Carousel",
      category: "Cafés",
      outletStrategy: "official_directory",
      autoPublish: false,
    },
  },
  {
    id: "fairprice_sg",
    label: "FairPrice Singapore",
    operator: "NTUC FairPrice Co-operative Limited",
    authority: {
      ownership: "verified",
      evidenceUrls: [
        "https://help.fairprice.com.sg/hc/en-us/articles/360025882372-Terms-Conditions",
      ],
      review:
        "docs/changes/direct-source-batch-1/research.md (official terms identify the exact service website; direct legal-page 403 retained, no bypass)",
    },
    origin: "https://www.fairprice.com.sg",
    allowedHosts: ["www.fairprice.com.sg", "promotions.fairprice.com.sg"],
    listingUrls: ["https://www.fairprice.com.sg/weekly-promotions"],
    adapter: "fairprice",
    activationReview: {
      enumeration: "partial",
      blockers: [
        "partial_enumeration",
        "catalogue_product_set_unresolved",
        "catalogue_detail_facts_unavailable",
        "physical_participation_unresolved",
      ],
      evidenceRefs: [
        "docs/changes/direct-source-batch-1/research.md",
        "tests/fixtures/direct-sources/fairprice/manifest.json",
      ],
    },
    publicationPolicy: {
      enabled: false,
      autoPublish: false,
      merchant: "FairPrice",
      category: "Meals",
      outletStrategy: "official_directory",
    },
  },
  {
    id: "kris_plus_sg",
    sourceKind: "issuer_platform",
    label: "Kris+ Singapore public promotions",
    operator: "Kris+ Pte Ltd",
    authority: {
      ownership: "verified",
      evidenceUrls: ["https://www.krisplus.com/en/sg/terms-and-conditions"],
      review:
        "docs/changes/direct-source-batch-1/research.md (exact website legal operator declaration, separately captured from directory)",
    },
    origin: "https://www.krisplus.com",
    allowedHosts: ["www.krisplus.com"],
    listingUrls: ["https://www.krisplus.com/en/sg/promotions"],
    adapter: "kris-plus",
    activationReview: {
      enumeration: "partial",
      blockers: [
        "partial_enumeration",
        "unresolved_load_more",
        "campaign_offer_scopes_unresolved",
        "partner_publication_configuration_unmodeled",
      ],
      evidenceRefs: [
        "docs/changes/direct-source-batch-1/research.md",
        "tests/fixtures/direct-sources/kris-plus/manifest.json",
      ],
    },
    publicationPolicy: {
      enabled: false,
      autoPublish: false,
      merchant: "Kris+",
      category: "Meals",
      outletStrategy: "official_directory",
    },
  },
  {
    id: "dian_xiao_er_sg",
    label: "Dian Xiao Er Singapore",
    operator: "Dian Xiao Er (legal operator not independently established)",
    authority: {
      ownership: "probable",
      evidenceUrls: [
        "https://www.dianxiaoer.com.sg/",
        "https://www.dianxiaoer.com.sg/membership",
      ],
      review:
        "docs/changes/direct-source-batch-1/research.md (contact/copyright and membership pages do not independently establish legal ownership)",
    },
    origin: "https://www.dianxiaoer.com.sg",
    allowedHosts: ["www.dianxiaoer.com.sg"],
    listingUrls: ["https://www.dianxiaoer.com.sg/promo"],
    adapter: "dian-xiao-er",
    activationReview: {
      enumeration: "partial",
      blockers: [
        "ownership_unverified",
        "partial_enumeration",
        "lightbox_mapping_unresolved",
        "image_only_campaign_facts",
      ],
      evidenceRefs: [
        "docs/changes/direct-source-batch-1/research.md",
        "tests/fixtures/direct-sources/dian-xiao-er/manifest.json",
      ],
    },
    publicationPolicy: {
      enabled: false,
      autoPublish: false,
      merchant: "Dian Xiao Er",
      category: "Meals",
      outletStrategy: "official_directory",
    },
  },
  ...coverageBatch2Sources,
];
export function sourceDefinition(id: SourceId) {
  const source = directSources.find((s) => s.id === id);
  if (!source) throw new Error("unknown_direct_source");
  return source;
}
export function sourceAdapter(
  source: DirectSourceDefinition,
): DirectSourceAdapter {
  if (!Object.hasOwn(adapterFactories, source.adapter))
    throw new Error("unknown_direct_adapter");
  const adapter = adapterFactories[source.adapter]();
  if (adapter.sourceId !== source.id)
    throw new Error("adapter_source_mismatch");
  return adapter;
}
const adapterFactories = {
  "pepper-lunch": () => new PepperLunchAdapter(),
  "paradise-group": () => new ParadiseGroupAdapter(),
  "shake-shack": () => new ShakeShackAdapter(),
  "gourmet-carousel": () => new GourmetCarouselAdapter(),
  fairprice: () => new FairPriceAdapter(),
  "kris-plus": () => new KrisPlusAdapter(),
  "dian-xiao-er": () => new DianXiaoErAdapter(),
  "bari-bari-steak": () => new BariBariAdapter(),
  "captain-kim": () => new CaptainKimAdapter(),
  sushiro: () => new SushiroAdapter(),
  mcdonalds: () => new McDonaldsAdapter(),
} satisfies Record<
  DirectSourceDefinition["adapter"],
  () => DirectSourceAdapter
>;
