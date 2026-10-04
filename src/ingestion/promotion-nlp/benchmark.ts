import { z } from "zod";
import {
  extractionFields,
  promotionTextEvidenceSchema,
  rawPromotionExtractionSchema,
} from "./schema";
import { hasFact } from "./validator";
import type {
  ExtractionField,
  PromotionTextEvidence,
  ValidatedPromotionExtraction,
} from "./types";

const fieldName = z.enum(extractionFields);
export const benchmarkCaseSchema = z
  .strictObject({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    merchant: z.string().min(1),
    canonicalUrl: z.url(),
    nativeId: z.string(),
    evidenceId: z.string(),
    selector: z.string(),
    sourceText: z.string(),
    layout: z.string(),
    sourceReference: z.strictObject({
      file: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      url: z.url(),
      relation: z.enum(["listing", "detail"]),
      fetchedAt: z.iso.datetime(),
      selectors: z.array(z.string()).min(1),
      mode: z.enum(["dom", "instagram-caption"]),
      exclude: z.array(z.string()),
    }),
    expectedClassification: rawPromotionExtractionSchema.shape.classification,
    expectedSupportedFacts: rawPromotionExtractionSchema
      .omit({ classification: true })
      .partial(),
    expectedUnknownFacts: z.array(fieldName),
    acceptableValues: z.partialRecord(fieldName, z.array(z.unknown())),
    notes: z.string().min(1),
    tags: z.array(z.string()),
    currentParser: z.strictObject({
      available: z.boolean(),
      classification: z
        .enum(["promotion", "non_promotion", "uncertain"])
        .nullable(),
      facts: z.partialRecord(fieldName, z.unknown()),
      reference: z.string(),
    }),
  })
  .superRefine((c, ctx) => {
    for (const name of extractionFields) {
      const known = hasFact(c.expectedSupportedFacts[name]?.value),
        unknown = c.expectedUnknownFacts.includes(name);
      if (known === unknown)
        ctx.addIssue({ code: "custom", message: `gold_partition:${name}` });
    }
    if (new Set(c.expectedUnknownFacts).size !== c.expectedUnknownFacts.length)
      ctx.addIssue({ code: "custom", message: "duplicate_unknown_field" });
  });
export const benchmarkSchema = z
  .strictObject({
    version: z.literal(1),
    reviewedAt: z.string(),
    reviewBasis: z.string(),
    cases: z.array(benchmarkCaseSchema).min(1),
  })
  .superRefine((b, ctx) => {
    if (new Set(b.cases.map((c) => c.id)).size !== b.cases.length)
      ctx.addIssue({ code: "custom", message: "duplicate_case_id" });
  });
export type PromotionBenchmarkCase = z.infer<typeof benchmarkCaseSchema>;
export function benchmarkEvidence(
  c: PromotionBenchmarkCase,
): PromotionTextEvidence {
  return promotionTextEvidenceSchema.parse({
    sourceId: c.sourceId,
    canonicalUrl: c.canonicalUrl,
    nativeId: c.nativeId,
    evidenceId: c.evidenceId,
    selector: c.selector,
    merchantHint: c.merchant,
    titleHint: null,
    text: c.sourceText,
  });
}
function canonical(value: unknown): string {
  if (Array.isArray(value))
    return JSON.stringify(value.map((v) => canonical(v)).sort());
  return JSON.stringify(value) ?? "undefined";
}
function matches(
  c: PromotionBenchmarkCase,
  field: ExtractionField,
  value: unknown,
): boolean {
  const expected = c.expectedSupportedFacts[field]?.value;
  if (!hasFact(expected)) return !hasFact(value);
  return [expected, ...(c.acceptableValues[field] ?? [])].some(
    (v) => canonical(v) === canonical(value),
  );
}
export const metricNames = [
  "exact_supported_extraction",
  "missed_supported_fact",
  "incorrect_value",
  "unsupported_invented_fact",
  "evidence_quote_mismatch",
  "validator_rejection",
] as const;
export type FieldMetrics = Record<(typeof metricNames)[number], number>;
export type ParserDifference =
  | "exact_agreement"
  | "nlp_correct_additional_fact"
  | "current_parser_correct_nlp_missed"
  | "nlp_unsupported_invention"
  | "current_parser_limitation"
  | "both_wrong_relative_to_gold";
export function scoreBenchmarkCase(
  c: PromotionBenchmarkCase,
  raw: unknown,
  validated: ValidatedPromotionExtraction,
) {
  const rawObject =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawValue = (field: ExtractionField) => {
    const f = rawObject[field];
    return f && typeof f === "object" && "value" in f
      ? (f as { value: unknown }).value
      : f;
  };
  const fields = Object.fromEntries(
    extractionFields.map((name) => {
      const expected = c.expectedSupportedFacts[name]?.value,
        value = validated.accepted[name]?.value;
      const rawPresent = hasFact(rawValue(name)),
        rawWrong = rawPresent && !matches(c, name, rawValue(name));
      const surviving = hasFact(value) && !matches(c, name, value);
      return [
        name,
        {
          exact_supported_extraction: Number(
            hasFact(expected) && matches(c, name, value),
          ),
          missed_supported_fact: Number(hasFact(expected) && !hasFact(value)),
          incorrect_value: Number(hasFact(expected) && surviving),
          unsupported_invented_fact: Number(
            !hasFact(expected) && hasFact(value),
          ),
          evidence_quote_mismatch: Number(
            validated.issues.some(
              (i) => i.field === name && i.code === "rejected_quote_mismatch",
            ),
          ),
          validator_rejection: Number(
            !!validated.rejected[name] ||
              (rawPresent && !validated.structurallyValid),
          ),
          rawUnsupported: Number(rawWrong),
          caught: Number(rawWrong && !surviving),
          survived: Number(surviving),
          rawValue: rawValue(name) ?? null,
          validatedValue: value ?? null,
          goldValue: expected ?? null,
        },
      ];
    }),
  ) as Record<
    ExtractionField,
    FieldMetrics & {
      rawUnsupported: number;
      caught: number;
      survived: number;
      rawValue: unknown;
      validatedValue: unknown;
      goldValue: unknown;
    }
  >;
  const comparison: Partial<Record<ExtractionField, ParserDifference>> = {};
  if (c.currentParser.available)
    for (const name of extractionFields) {
      const p = c.currentParser.facts[name],
        n = fields[name].validatedValue;
      const pRight = matches(c, name, p),
        nRight = matches(c, name, n);
      comparison[name] =
        !nRight && hasFact(n)
          ? pRight
            ? "nlp_unsupported_invention"
            : "both_wrong_relative_to_gold"
          : nRight && pRight && canonical(p ?? null) === canonical(n ?? null)
            ? "exact_agreement"
            : nRight && !pRight
              ? !hasFact(p) && hasFact(n)
                ? "nlp_correct_additional_fact"
                : "current_parser_limitation"
              : pRight && !nRight
                ? "current_parser_correct_nlp_missed"
                : !pRight && !nRight
                  ? "both_wrong_relative_to_gold"
                  : "exact_agreement";
    }
  return {
    id: c.id,
    expectedClassification: c.expectedClassification.value,
    classification: validated.classification.value,
    classificationCorrect:
      c.expectedClassification.value === validated.classification.value,
    classificationQuoteMismatch: Number(
      validated.issues.some(
        (i) =>
          i.field === "classification" && i.code === "rejected_quote_mismatch",
      ),
    ),
    parserClassificationCorrect:
      c.currentParser.available && c.currentParser.classification !== null
        ? c.currentParser.classification === c.expectedClassification.value
        : null,
    fields,
    comparison,
  };
}
export const highRiskFields = [
  "startDate",
  "endDate",
  "locationScope",
  "locationNames",
  "hours",
  "eligibility",
] as const;
export function summarizeBenchmark(
  scores: ReturnType<typeof scoreBenchmarkCase>[],
) {
  const ratio = (n: number, d: number) => (d ? n / d : null);
  const tp = scores.filter(
    (s) =>
      s.classification === "promotion" &&
      s.expectedClassification === "promotion",
  ).length;
  const fields = Object.fromEntries(
    extractionFields.map((f) => [
      f,
      Object.fromEntries(
        metricNames.map((m) => [
          m,
          scores.reduce((n, s) => n + s.fields[f][m], 0),
        ]),
      ),
    ]),
  ) as Record<ExtractionField, FieldMetrics>;
  const sum = (
    k: "rawUnsupported" | "caught" | "survived",
    only: readonly ExtractionField[] = extractionFields,
  ) =>
    scores.reduce(
      (n, s) => n + only.reduce((a, f) => a + s.fields[f][k], 0),
      0,
    );
  return {
    cases: scores.length,
    classification: {
      promotion_precision: ratio(
        tp,
        scores.filter((s) => s.classification === "promotion").length,
      ),
      promotion_recall: ratio(
        tp,
        scores.filter((s) => s.expectedClassification === "promotion").length,
      ),
      non_promotion_correctness: ratio(
        scores.filter(
          (s) =>
            s.expectedClassification === "non_promotion" &&
            s.classification === "non_promotion",
        ).length,
        scores.filter((s) => s.expectedClassification === "non_promotion")
          .length,
      ),
      uncertain_rate: ratio(
        scores.filter((s) => s.classification === "uncertain").length,
        scores.length,
      ),
    },
    fields,
    highRisk: Object.fromEntries(highRiskFields.map((f) => [f, fields[f]])),
    raw_model_hallucinations: sum("rawUnsupported"),
    hallucinations_caught_by_validator: sum("caught"),
    unsupported_fact_survived_validation: sum("survived"),
    unsupported_critical_fact_survived_validation: sum(
      "survived",
      highRiskFields,
    ),
    evidence_quote_mismatch:
      scores.reduce((n, s) => n + s.classificationQuoteMismatch, 0) +
      extractionFields.reduce(
        (n, f) => n + fields[f].evidence_quote_mismatch,
        0,
      ),
    parser_classification: {
      compared_cases: scores.filter(
        (s) => s.parserClassificationCorrect !== null,
      ).length,
      correct_cases: scores.filter(
        (s) => s.parserClassificationCorrect === true,
      ).length,
      nlp_correct_parser_wrong: scores
        .filter(
          (s) =>
            s.classificationCorrect && s.parserClassificationCorrect === false,
        )
        .map((s) => s.id),
      parser_correct_nlp_wrong: scores
        .filter(
          (s) =>
            !s.classificationCorrect && s.parserClassificationCorrect === true,
        )
        .map((s) => s.id),
    },
    comparison: Object.fromEntries(
      [
        "exact_agreement",
        "nlp_correct_additional_fact",
        "current_parser_correct_nlp_missed",
        "nlp_unsupported_invention",
        "current_parser_limitation",
        "both_wrong_relative_to_gold",
      ].map((k) => [
        k,
        scores.reduce(
          (n, s) =>
            n + Object.values(s.comparison).filter((v) => v === k).length,
          0,
        ),
      ]),
    ),
  };
}
