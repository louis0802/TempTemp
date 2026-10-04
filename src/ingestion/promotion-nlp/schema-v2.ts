import { z } from "zod";
import { MAX_SOURCE_CHARS } from "./schema";

export const SCHEMA_VERSION_V2 = "promotion-nlp-schema-v2";
const quote = z.string().min(1).max(MAX_SOURCE_CHARS).nullable();
const text = z.string().min(1).max(4000);
const field = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), quote });
const associated = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), quote, associationQuote: quote });
export const RESTRICTION_ROLES_V2 = [
  "eligibility",
  "purchase_requirement",
  "redemption_channel",
  "social_requirement",
  "timing_requirement",
  "item_restriction",
  "exclusion",
  "general_term",
] as const;
export const rawPromotionExtractionSchemaV2 = z.strictObject({
  classification: z.strictObject({
    value: z.enum(["promotion", "non_promotion", "uncertain"]),
    quote,
  }),
  primaryProposition: z.strictObject({
    quote,
    title: field(text),
    benefit: field(text),
  }),
  merchant: field(text),
  startDate: associated(z.string().max(100)),
  endDate: associated(z.string().max(100)),
  weekdays: associated(z.array(z.number().int()).max(7)),
  hours: associated(z.string().max(500)),
  locationScope: associated(
    z.enum(["all_outlets", "selected_outlets", "named_outlets"]),
  ),
  locationRules: z
    .array(
      z.strictObject({
        role: z.enum(["participating", "excluded"]),
        names: z.array(text).min(1).max(100),
        quote,
        associationQuote: quote,
      }),
    )
    .max(100),
  restrictions: z
    .array(
      z.strictObject({
        text,
        role: z.enum(RESTRICTION_ROLES_V2),
        quote,
        associationQuote: quote,
      }),
    )
    .max(100),
});
export type RawPromotionExtractionV2 = z.infer<
  typeof rawPromotionExtractionSchemaV2
>;
export const ASSOCIATED_FIELDS_V2 = [
  "startDate",
  "endDate",
  "weekdays",
  "hours",
  "locationScope",
] as const;
export function extractionJsonSchemaV2() {
  const schema = z.toJSONSchema(rawPromotionExtractionSchemaV2);
  delete schema.$schema;
  return schema;
}
export function emptyExtractionV2(
  classification: RawPromotionExtractionV2["classification"]["value"] = "uncertain",
  quote: string | null = null,
): RawPromotionExtractionV2 {
  return rawPromotionExtractionSchemaV2.parse({
    classification: { value: classification, quote },
    primaryProposition: {
      quote: null,
      title: { value: null, quote: null },
      benefit: { value: null, quote: null },
    },
    merchant: { value: null, quote: null },
    ...Object.fromEntries(
      ASSOCIATED_FIELDS_V2.map((name) => [
        name,
        {
          value: null,
          quote: null,
          associationQuote: null,
        },
      ]),
    ),
    locationRules: [],
    restrictions: [],
  });
}
