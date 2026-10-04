import { z } from "zod";
import { MAX_SOURCE_CHARS } from "./schema";

export const CONSTRAINT_ATTRIBUTES_V3 = [
  "audience",
  "purchase",
  "redemption_channel",
  "social",
  "timing",
  "item",
  "availability",
  "frequency",
  "reservation",
  "exclusion",
] as const;
const text = z.string().min(1).max(4000);
const quote = z.string().min(1).max(MAX_SOURCE_CHARS);
const field = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), quote: quote.nullable() });
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const timeConstraintSchemaV3 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("range"), start: clock, end: clock, quote }),
  z.strictObject({ kind: z.literal("before"), time: clock, quote }),
  z.strictObject({ kind: z.literal("after"), time: clock, quote }),
  z.strictObject({ kind: z.literal("opening_to"), end: clock, quote }),
]);
export const rawExtractionSchemaV3 = z.strictObject({
  classification: z.strictObject({
    value: z.enum(["promotion", "non_promotion", "uncertain"]),
    quote: quote.nullable(),
  }),
  merchant: field(text),
  title: field(text),
  benefit: field(text),
  startDate: field(z.string().max(100)),
  endDate: field(z.string().max(100)),
  weekdays: field(z.array(z.number().int()).max(7)),
  timeConstraints: z.array(timeConstraintSchemaV3).max(20),
  locationScope: field(
    z.enum(["all_outlets", "selected_outlets", "named_outlets"]),
  ),
  locationRules: z
    .array(
      z.strictObject({
        role: z.enum(["participating", "excluded"]),
        names: z.array(text).min(1).max(100),
        quote,
      }),
    )
    .max(100),
  constraints: z
    .array(
      z.strictObject({
        text,
        attributes: z.array(z.enum(CONSTRAINT_ATTRIBUTES_V3)).min(1).max(10),
        quote,
      }),
    )
    .max(100),
});
export type ExtractionV3 = z.infer<typeof rawExtractionSchemaV3>;
export type TimeConstraintV3 = z.infer<typeof timeConstraintSchemaV3>;
export const FACT_FIELDS_V3 = [
  "merchant",
  "title",
  "benefit",
  "startDate",
  "endDate",
  "weekdays",
  "locationScope",
] as const;
export function extractionJsonSchemaV3() {
  const schema = z.toJSONSchema(rawExtractionSchemaV3);
  delete schema.$schema;
  return schema;
}
export function emptyExtractionV3(
  value: ExtractionV3["classification"]["value"] = "uncertain",
  quote: string | null = null,
): ExtractionV3 {
  return rawExtractionSchemaV3.parse({
    classification: { value, quote },
    ...Object.fromEntries(
      FACT_FIELDS_V3.map((f) => [f, { value: null, quote: null }]),
    ),
    timeConstraints: [],
    locationRules: [],
    constraints: [],
  });
}
