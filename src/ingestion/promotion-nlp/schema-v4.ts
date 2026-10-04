import { z } from "zod";

export const EVIDENCE_KINDS_V4 = [
  "economic_claim",
  "date",
  "weekday",
  "time",
  "location",
  "participation",
  "channel",
  "audience",
  "purchase_condition",
  "redemption_instruction",
  "social_condition",
  "availability",
  "exclusion",
  "contest",
  "editorial",
  "product",
  "service",
  "other",
] as const;
export const TYPE_HINTS_V4 = [
  "offer",
  "contest",
  "editorial",
  "product",
  "service",
  "event",
  "other",
] as const;
export const RELATIONS_V4 = [
  "benefit",
  "validity",
  "weekday",
  "time",
  "location",
  "exclusion",
  "participation",
  "constraint",
  "redemption",
  "context",
] as const;
export const TAXONOMY_V4 = [
  "economic_offer",
  "contest_or_chance",
  "editorial",
  "product_launch",
  "store_announcement",
  "service_information",
  "event_or_activity",
  "uncertain",
] as const;
export const ATTRIBUTES_V4 = [
  "purchase",
  "audience",
  "redemption_channel",
  "redemption_action",
  "social",
  "timing",
  "availability",
  "reservation",
  "frequency",
  "item",
  "exclusion",
] as const;
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const quote = z.string().min(1).max(24000);
export const evidenceSchemaV4 = z.strictObject({
  id,
  quote,
  kind: z.enum(EVIDENCE_KINDS_V4),
});
export const propositionSchemaV4 = z.strictObject({
  id,
  anchorEvidenceIds: z.array(id).min(1).max(20),
  propositionTypeHint: z.enum(TYPE_HINTS_V4),
});
export const edgeSchemaV4 = z.strictObject({
  evidenceId: id,
  propositionIds: z.array(id).max(100),
  relation: z.enum(RELATIONS_V4),
});
export const evidenceOutputSchemaV4 = z.strictObject({
  evidence: z.array(evidenceSchemaV4).max(200),
});
export const propositionOutputSchemaV4 = z.strictObject({
  propositions: z.array(propositionSchemaV4).max(100),
});
export const edgeOutputSchemaV4 = z.strictObject({
  edges: z.array(edgeSchemaV4).max(200),
});
export const eligibilityOutputSchemaV4 = z.strictObject({
  taxonomy: z.enum(TAXONOMY_V4),
  evidenceIds: z.array(id).min(1).max(200),
});
const field = <T extends z.ZodType>(value: T) =>
  z.strictObject({ value: value.nullable(), evidenceId: id.nullable() });
const text = z.string().min(1).max(4000);
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const timeConstraintSchemaV4 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("range"),
    start: clock,
    end: clock,
    evidenceId: id,
  }),
  z.strictObject({ kind: z.literal("before"), time: clock, evidenceId: id }),
  z.strictObject({ kind: z.literal("after"), time: clock, evidenceId: id }),
  z.strictObject({ kind: z.literal("opening_to"), end: clock, evidenceId: id }),
]);
export const normalizationSchemaV4 = z.strictObject({
  merchant: field(text),
  title: field(text),
  benefit: field(text),
  startDate: field(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: field(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  weekdays: field(z.array(z.number().int().min(1).max(7)).max(7)),
  timeConstraints: z.array(timeConstraintSchemaV4).max(30),
  locationScope: field(
    z.enum(["all_outlets", "selected_outlets", "named_outlets"]),
  ),
  locationRules: z
    .array(
      z.strictObject({
        role: z.enum(["participating", "excluded"]),
        names: z.array(text).min(1).max(100),
        evidenceId: id,
      }),
    )
    .max(100),
  constraints: z
    .array(
      z.strictObject({
        text,
        attributes: z.array(z.enum(ATTRIBUTES_V4)).min(1).max(11),
        evidenceId: id,
      }),
    )
    .max(200),
});
export type EvidenceV4 = z.infer<typeof evidenceSchemaV4>;
export type PropositionV4 = z.infer<typeof propositionSchemaV4>;
export type EdgeV4 = z.infer<typeof edgeSchemaV4>;
export type EvidenceOutputV4 = z.infer<typeof evidenceOutputSchemaV4>;
export type PropositionOutputV4 = z.infer<typeof propositionOutputSchemaV4>;
export type EdgeOutputV4 = z.infer<typeof edgeOutputSchemaV4>;
export type EligibilityOutputV4 = z.infer<typeof eligibilityOutputSchemaV4>;
export type NormalizationV4 = z.infer<typeof normalizationSchemaV4>;
export type StageV4 = 1 | 2 | 3 | 4 | 5;
export const STAGES_V4 = [1, 2, 3, 4, 5] as const;
export const schemasV4 = {
  1: evidenceOutputSchemaV4,
  2: propositionOutputSchemaV4,
  3: edgeOutputSchemaV4,
  4: eligibilityOutputSchemaV4,
  5: normalizationSchemaV4,
};
export function jsonSchemaV4(stage: StageV4) {
  const s = z.toJSONSchema(schemasV4[stage]);
  delete s.$schema;
  return s;
}
export function emptyNormalizationV4(): NormalizationV4 {
  return normalizationSchemaV4.parse({
    ...Object.fromEntries(
      [
        "merchant",
        "title",
        "benefit",
        "startDate",
        "endDate",
        "weekdays",
        "locationScope",
      ].map((f) => [f, { value: null, evidenceId: null }]),
    ),
    timeConstraints: [],
    locationRules: [],
    constraints: [],
  });
}
