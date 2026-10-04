import type { z } from "zod";
import type {
  promotionTextEvidenceSchema,
  rawPromotionExtractionSchema,
  extractionFields,
} from "./schema";

export type PromotionTextEvidence = z.infer<typeof promotionTextEvidenceSchema>;
export type RawPromotionExtraction = z.infer<
  typeof rawPromotionExtractionSchema
>;
export type ExtractionField = (typeof extractionFields)[number];
export interface ExtractedField<T> {
  value: T | null;
  quote: string | null;
}
export interface ProviderMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
}
/** Unknown at the trust boundary; every provider response requires deterministic validation. */
export interface PromotionNlpProvider {
  readonly metadata: ProviderMetadata;
  extract(evidence: PromotionTextEvidence): Promise<unknown>;
}
export interface ValidationIssue {
  field: ExtractionField | "classification" | "output" | "input";
  code: string;
}
export interface ValidatedPromotionExtraction {
  classification: RawPromotionExtraction["classification"];
  accepted: Partial<Pick<RawPromotionExtraction, ExtractionField>>;
  rejected: Partial<
    Record<
      ExtractionField | "classification",
      { value: unknown; quote: string | null; reasons: string[] }
    >
  >;
  issues: ValidationIssue[];
  structurallyValid: boolean;
}
