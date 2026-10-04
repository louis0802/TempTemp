import { z } from "zod";
import { MAX_SOURCE_CHARS, normalizeSourceText } from "./schema";

export const MAX_PROPOSITIONS_V3 = 8;
const quote = z.string().min(1).max(MAX_SOURCE_CHARS);
export const propositionSchemaV3 = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  propositionQuote: quote,
  supportingQuotes: z.array(quote).max(100),
});
export const segmentationSchemaV3 = z
  .strictObject({
    propositions: z.array(propositionSchemaV3).max(MAX_PROPOSITIONS_V3),
    unassignedQuotes: z.array(quote).max(100),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.propositions.map((p) => p.id)).size !== v.propositions.length)
      ctx.addIssue({ code: "custom", message: "duplicate_proposition_id" });
  });
export type SegmentationV3 = z.infer<typeof segmentationSchemaV3>;
export type PropositionV3 = z.infer<typeof propositionSchemaV3>;
export function segmentationJsonSchemaV3() {
  const schema = z.toJSONSchema(segmentationSchemaV3);
  delete schema.$schema;
  return schema;
}
export function validateSegmentationV3(source: string, raw: unknown) {
  const parsed = segmentationSchemaV3.safeParse(raw);
  if (!parsed.success)
    return {
      accepted: null,
      structurallyValid: false,
      issues: ["invalid_segmentation_schema"],
    };
  const normalized = normalizeSourceText(source);
  const issues = [
    ...parsed.data.propositions.flatMap((p) => [
      p.propositionQuote,
      ...p.supportingQuotes,
    ]),
    ...parsed.data.unassignedQuotes,
  ]
    .filter((q) => !q.trim() || !normalized.includes(q))
    .map(() => "exact_span_failure");
  return {
    accepted: issues.length ? null : parsed.data,
    structurallyValid: true,
    issues,
  };
}

/** No synthetic evidence joining: each quote remains a separate evidence boundary. */
export function propositionEvidenceV3(
  unit: Pick<PropositionV3, "propositionQuote" | "supportingQuotes">,
) {
  return [unit.propositionQuote, ...unit.supportingQuotes];
}
