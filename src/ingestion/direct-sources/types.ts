import { z } from "zod";
import type { AuthoritativeSourceKind, SocialScope } from "./source-scope";

export const sourceIdSchema = z.enum([
  "pepper_lunch_sg",
  "paradise_group_sg",
  "shake_shack_sg",
  "gourmet_carousel_sg",
  "fairprice_sg",
  "kris_plus_sg",
  "dian_xiao_er_sg",
  "bari_bari_steak_sg",
  "captain_kim_sg",
  "sushiro_sg",
  "mcdonalds_sg",
]);
export type SourceId = z.infer<typeof sourceIdSchema>;
export const relationSchema = z.enum(["listing", "detail", "terms", "menu"]);
export type EvidenceRelation = z.infer<typeof relationSchema>;
const httpUrl = z.url().refine((value) => /^https?:\/\//.test(value));
export const evidenceSchema = z.object({
  id: z.string(),
  sourceId: sourceIdSchema,
  url: httpUrl,
  requestedUrl: httpUrl,
  relation: relationSchema,
  fetchedAt: z.iso.datetime(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.string(),
  httpStatus: z.number().int(),
  notes: z.array(z.string()),
});
export type DirectEvidence = z.infer<typeof evidenceSchema>;
export const factFields = [
  "merchant",
  "title",
  "benefit",
  "description",
  "validity",
  "weekdays",
  "hours",
  "locations",
  "eligibility",
  "redemption",
  "terms",
  "publishedAt",
] as const;
export type FactField = (typeof factFields)[number];
const provenanceSchema = z.object({
  evidenceIds: z.array(z.string()).min(1),
  selector: z.string(),
  quote: z.string().min(1),
});
export const directPromotionCandidateSchema = z
  .object({
    schemaVersion: z.literal(1),
    candidateId: z.string().regex(/^direct_[a-f0-9]{64}$/),
    sourceId: sourceIdSchema,
    sourceLabel: z.string(),
    canonicalUrl: httpUrl,
    listingUrl: httpUrl,
    nativeId: z.string().nullable(),
    merchant: z.string().nullable(),
    title: z.string().nullable(),
    benefit: z.string().nullable(),
    description: z.string().nullable(),
    startDate: z.iso.date().nullable(),
    endDate: z.iso.date().nullable(),
    weekdays: z.array(z.number().int().min(1).max(7)).nullable(),
    hours: z.string().nullable(),
    locationScope: z.enum([
      "all_outlets",
      "selected_outlets",
      "named_outlets",
      "source_unspecified",
    ]),
    locationNames: z.array(z.string()),
    locationWording: z.string().nullable(),
    eligibility: z.array(z.string()).nullable(),
    redemption: z.array(z.string()).nullable(),
    terms: z.array(z.string()).nullable(),
    observedAt: z.iso.datetime(),
    publishedAt: z.string().nullable(),
    extractionStatus: z.enum(["complete", "partial", "failed"]),
    issues: z.array(z.string()),
    facts: z.partialRecord(z.enum(factFields), provenanceSchema),
    evidence: z.array(evidenceSchema).min(1),
  })
  .superRefine((candidate, ctx) => {
    const ids = new Set(candidate.evidence.map((e) => e.id));
    if (candidate.evidence.some((e) => e.sourceId !== candidate.sourceId))
      ctx.addIssue({ code: "custom", message: "cross_source_evidence" });
    for (const field of factFields) {
      const value =
        field === "validity"
          ? (candidate.startDate ?? candidate.endDate)
          : field === "locations"
            ? candidate.locationWording
            : candidate[field];
      const provenance = candidate.facts[field];
      if (value !== null && !provenance)
        ctx.addIssue({
          code: "custom",
          message: `missing_provenance:${field}`,
        });
      if (provenance?.evidenceIds.some((id) => !ids.has(id)))
        ctx.addIssue({ code: "custom", message: `unknown_evidence:${field}` });
    }
  });
export type DirectPromotionCandidate = z.infer<
  typeof directPromotionCandidateSchema
>;
export interface DirectSourceDefinition {
  sourceKind?: AuthoritativeSourceKind;
  socialScope?: SocialScope;
  id: SourceId;
  label: string;
  operator: string;
  authority: {
    ownership: "verified" | "probable" | "unverified";
    evidenceUrls: readonly string[];
    review: string;
  };
  origin: string;
  allowedHosts: readonly string[];
  listingUrls: readonly string[];
  adapter:
    | "pepper-lunch"
    | "paradise-group"
    | "shake-shack"
    | "gourmet-carousel"
    | "fairprice"
    | "kris-plus"
    | "dian-xiao-er"
    | "bari-bari-steak"
    | "captain-kim"
    | "sushiro"
    | "mcdonalds";
  /** Trusted registry count budgets; network safety is not source-configurable. */
  acquisitionLimits?: {
    maxRequests?: number;
    maxListingPages?: number;
    maxDetailPages?: number;
    maxEvidencePages?: number;
  };
  /** Recorded activation evidence for registry-derived onboarding presentation; never a runtime gate bypass. */
  activationReview?: {
    enumeration: "complete" | "partial";
    blockers: readonly string[];
    evidenceRefs: readonly string[];
  };
  publicationPolicy: {
    enabled: boolean;
    merchant: string;
    category: "Meals" | "Cafés" | "Drinks" | "Desserts";
    outletStrategy: "official_directory";
    autoPublish: boolean;
  };
}
export interface ListingEntry {
  canonicalUrl: string;
  title: string | null;
  nativeId: string | null;
  listingUrl: string;
  evidenceId: string;
  relation: "detail" | "menu";
  metadata: {
    description: string | null;
    merchant: string | null;
    selector: string;
  };
}
export interface AcquisitionIssue {
  code: string;
  url: string;
  relation: EvidenceRelation;
}
export interface ArticleClassification {
  url: string;
  result: "promotion" | "non_promotion" | "unresolved";
  evidenceId: string | null;
  reason: string;
}
export interface ArchiveClassification {
  discovered_articles: number;
  classified_articles: number;
  promotion_articles: number;
  non_promotion_articles: number;
  unresolved_articles: number;
  articles: ArticleClassification[];
}
export interface EnumerationResult {
  classification?: ArchiveClassification;
  entries: ListingEntry[];
  evidence: DirectEvidence[];
  complete: boolean;
  issues: AcquisitionIssue[];
  pagination: {
    requested: string[];
    discovered: string[];
    unresolved: string[];
  };
  observedAt: string;
}
export interface FetchedPage {
  evidence: DirectEvidence;
  body: Buffer;
}
export interface DetailResult {
  page: FetchedPage | null;
  related: FetchedPage[];
  issues: AcquisitionIssue[];
}

/** Registry-reviewed ownership still needs its recorded independent evidence and review basis. */
export function hasRecordedDirectOwnership(
  source: DirectSourceDefinition,
): boolean {
  return (
    source.authority.ownership === "verified" &&
    source.authority.evidenceUrls.length > 0 &&
    source.authority.evidenceUrls.every((url) => url.startsWith("https://")) &&
    source.authority.review.trim().length > 0
  );
}
