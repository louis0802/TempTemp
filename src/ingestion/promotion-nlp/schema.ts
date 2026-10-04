import { z } from "zod";

export const SCHEMA_VERSION = "promotion-nlp-schema-v1";
export const MAX_SOURCE_CHARS = 20_000;
export const normalizeSourceText = (text: string) =>
  text.replace(/\s+/g, " ").trim();

export const promotionTextEvidenceSchema = z.strictObject({
  sourceId: z.string().min(1).max(160),
  canonicalUrl: z.url().refine((s) => /^https?:\/\//.test(s)),
  nativeId: z.string().max(500).nullable(),
  evidenceId: z.string().min(1).max(500),
  selector: z.string().min(1).max(1000),
  merchantHint: z.string().max(500).nullable(),
  titleHint: z.string().max(1000).nullable(),
  text: z
    .string()
    .min(1)
    .max(MAX_SOURCE_CHARS)
    .refine(
      (s) =>
        !!normalizeSourceText(s) &&
        !/<\/?(?:html|body|script|article|div|p|section)\b/i.test(s),
      { message: "isolated_plain_text_required" },
    ),
});
const quote = z.string().max(MAX_SOURCE_CHARS).nullable();
const field = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), quote });
const string = z.string().max(4000);
const strings = z.array(z.string().max(4000)).max(100);
export const classificationSchema = z.enum([
  "promotion",
  "non_promotion",
  "uncertain",
]);
export const rawPromotionExtractionSchema = z.strictObject({
  classification: z.strictObject({ value: classificationSchema, quote }),
  merchant: field(string),
  title: field(string),
  benefit: field(string),
  startDate: field(z.string().max(100)),
  endDate: field(z.string().max(100)),
  weekdays: field(z.array(z.number().int()).max(14)),
  hours: field(z.string().max(500)),
  locationScope: field(
    z.enum([
      "all_outlets",
      "selected_outlets",
      "named_outlets",
      "source_unspecified",
    ]),
  ),
  locationNames: field(strings),
  locationWording: field(string),
  eligibility: field(strings),
  redemption: field(strings),
  terms: field(strings),
});
export const extractionFields = [
  "merchant",
  "title",
  "benefit",
  "startDate",
  "endDate",
  "weekdays",
  "hours",
  "locationScope",
  "locationNames",
  "locationWording",
  "eligibility",
  "redemption",
  "terms",
] as const;
export function extractionJsonSchema() {
  const schema = z.toJSONSchema(rawPromotionExtractionSchema);
  delete schema.$schema;
  return schema;
}

export function emptyExtraction(
  classification: "promotion" | "non_promotion" | "uncertain" = "uncertain",
  quote: string | null = null,
): z.infer<typeof rawPromotionExtractionSchema> {
  return rawPromotionExtractionSchema.parse({
    classification: { value: classification, quote },
    ...Object.fromEntries(
      extractionFields.map((name) => [name, { value: null, quote: null }]),
    ),
  });
}
