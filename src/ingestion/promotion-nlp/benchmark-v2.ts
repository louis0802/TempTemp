import { z } from "zod";
import {
  RESTRICTION_ROLES_V2,
  type RawPromotionExtractionV2,
} from "./schema-v2";
import type { ValidationV2 } from "./validator-v2";

const identity = z.strictObject({
  identity: z.string(),
  labels: z.array(z.string()),
  quote: z.string(),
});
const schedule = z.strictObject({
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  weekdays: z.array(z.number()).nullable(),
  hours: z.string().nullable(),
});
export const annotationCaseSchemaV2 = z.strictObject({
  id: z.string(),
  sourceId: z.string(),
  sourceText: z.string(),
  sourceReference: z.strictObject({
    file: z.string(),
    sha256: z.string(),
    url: z.string(),
    relation: z.enum(["listing", "detail"]),
    fetchedAt: z.string(),
    selectors: z.array(z.string()),
    mode: z.enum(["dom", "instagram-caption"]),
    exclude: z.array(z.string()),
  }),
  selector: z.string(),
  evidenceId: z.string(),
  canonicalUrl: z.string(),
  nativeId: z.string(),
  layout: z.string(),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  expectedClassification: z.enum(["promotion", "non_promotion", "uncertain"]),
  primaryAnchor: z.string().nullable(),
  secondaryEvidence: z.array(z.string()),
  schedule,
  scheduleEvidence: z.record(z.string(), z.string().nullable()),
  positiveScope: z
    .enum(["all_outlets", "selected_outlets", "named_outlets"])
    .nullable(),
  scopeEvidence: z.string().nullable(),
  participating: z.array(identity),
  excluded: z.array(identity),
  restrictions: z.array(
    z.strictObject({
      text: z.string(),
      quote: z.string(),
      allowedRoles: z.array(z.enum(RESTRICTION_ROLES_V2)),
    }),
  ),
  benefitQualifiers: z.array(
    z.strictObject({ anchor: z.string(), required: z.array(z.string()) }),
  ),
  quantifiedBenefitSupported: z.boolean(),
  derivation: z.strictObject({
    capturedSource: z.string(),
    v1Gold: z.string(),
    postSealReview: z.string(),
    interpretationChanges: z.array(z.string()),
    v1Notes: z.string(),
  }),
});
export const benchmarkSchemaV2 = z
  .strictObject({
    version: z.literal(2),
    reviewedAt: z.string(),
    reviewBasis: z.string(),
    v1BenchmarkSha256: z.string(),
    cases: z.array(annotationCaseSchemaV2).length(49),
  })
  .superRefine((b, ctx) => {
    if (new Set(b.cases.map((c) => c.id)).size !== 49)
      ctx.addIssue({ code: "custom", message: "duplicate_case_id" });
    for (const c of b.cases) {
      const quotes = [
        c.primaryAnchor,
        ...c.secondaryEvidence,
        ...Object.values(c.scheduleEvidence),
        c.scopeEvidence,
        ...c.participating.map((r) => r.quote),
        ...c.excluded.map((r) => r.quote),
        ...c.restrictions.flatMap((r) => [r.text, r.quote]),
      ];
      if (quotes.some((q) => q !== null && !c.sourceText.includes(q)))
        ctx.addIssue({
          code: "custom",
          message: `annotation_quote_mismatch:${c.id}`,
        });
    }
  });
export type AnnotationCaseV2 = z.infer<typeof annotationCaseSchemaV2>;
export const SEMANTIC_METRICS_V2 = [
  "primary_secondary_association_errors",
  "participation_polarity_errors",
  "invented_validity_facts",
  "invented_participating_location_identity",
  "unsupported_positive_location_scope",
  "unrelated_schedule_association",
  "restriction_role_errors",
  "benefit_qualifier_loss",
  "primary_classification_errors",
  "cross_campaign_contamination",
  "unstated_year_inference",
] as const;
export type SemanticMetricV2 = (typeof SEMANTIC_METRICS_V2)[number];
export interface SemanticFindingV2 {
  metric: SemanticMetricV2;
  field: string;
  value: unknown;
  expected: unknown;
  quote: string | null;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const overlaps = (a: string, b: string) =>
  a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a));

/** Frozen annotation comparisons are review flags, not a semantic oracle. Review every output. */
export function semanticFindingsV2(
  c: AnnotationCaseV2,
  data: RawPromotionExtractionV2 | null,
) {
  const findings: SemanticFindingV2[] = [];
  const restrictionReview: {
    index: number;
    text: string;
    role: string;
    status: string;
    expectedRoles: string[];
  }[] = [];
  if (!data)
    return {
      findings,
      restrictionReview,
      canonicalLabelDifferences: [] as string[],
    };
  const flag = (
    metric: SemanticMetricV2,
    field: string,
    value: unknown,
    expected: unknown,
    quote: string | null,
  ) => {
    findings.push({ metric, field, value, expected, quote });
  };
  if (data.classification.value !== c.expectedClassification)
    flag(
      "primary_classification_errors",
      "classification",
      data.classification.value,
      c.expectedClassification,
      data.classification.quote,
    );
  if (
    c.expectedClassification !== "promotion" &&
    data.classification.value === "promotion" &&
    c.secondaryEvidence.length
  )
    flag(
      "primary_secondary_association_errors",
      "primaryProposition",
      data.primaryProposition,
      "uncertain/null primary",
      data.primaryProposition.quote,
    );
  for (const f of ["startDate", "endDate", "weekdays", "hours"] as const) {
    const actual = data[f],
      expected = c.schedule[f];
    if (actual.value !== null && !same(actual.value, expected)) {
      flag(
        f === "startDate" || f === "endDate"
          ? "invented_validity_facts"
          : "unrelated_schedule_association",
        f,
        actual.value,
        expected,
        actual.quote,
      );
      if (
        c.secondaryEvidence.some(
          (q) =>
            overlaps(actual.quote ?? "", q) ||
            overlaps(actual.associationQuote ?? "", q),
        )
      ) {
        flag(
          "primary_secondary_association_errors",
          f,
          actual.value,
          expected,
          actual.quote,
        );
        flag(
          "cross_campaign_contamination",
          f,
          actual.value,
          expected,
          actual.quote,
        );
      }
      if (
        (f === "startDate" || f === "endDate") &&
        typeof actual.value === "string" &&
        !new RegExp(`\\b${actual.value.slice(0, 4)}\\b`).test(
          actual.quote ?? "",
        )
      )
        flag("unstated_year_inference", f, actual.value, null, actual.quote);
    }
  }
  if (
    data.locationScope.value !== null &&
    data.locationScope.value !== c.positiveScope
  )
    flag(
      "unsupported_positive_location_scope",
      "locationScope",
      data.locationScope.value,
      c.positiveScope,
      data.locationScope.quote,
    );
  const canonicalLabelDifferences: string[] = [];
  for (const [i, r] of data.locationRules.entries())
    for (const name of r.names) {
      const positive = c.participating.find((p) => p.labels.includes(name));
      const negative = c.excluded.find((p) => p.labels.includes(name));
      if (
        (r.role === "participating" && negative) ||
        (r.role === "excluded" && positive)
      )
        flag(
          "participation_polarity_errors",
          `locationRules.${i}`,
          name,
          r.role === "participating" ? "excluded" : "participating",
          r.quote,
        );
      else if (r.role === "participating" && !positive)
        flag(
          "invented_participating_location_identity",
          `locationRules.${i}`,
          name,
          c.participating.map((p) => p.identity),
          r.quote,
        );
      if (positive && name !== positive.identity)
        canonicalLabelDifferences.push(name);
    }
  for (const [i, r] of data.restrictions.entries()) {
    const matches = c.restrictions.filter((a) => overlaps(r.text, a.text));
    const roles = [...new Set(matches.flatMap((a) => a.allowedRoles))];
    const status = !matches.length
      ? "needs_source_review"
      : roles.includes(r.role)
        ? "supported_anchor"
        : "role_mismatch";
    restrictionReview.push({
      index: i,
      text: r.text,
      role: r.role,
      status,
      expectedRoles: roles,
    });
    if (status === "role_mismatch")
      flag(
        "restriction_role_errors",
        `restrictions.${i}`,
        r.role,
        roles,
        r.quote,
      );
    if (
      c.expectedClassification === "promotion" &&
      c.secondaryEvidence.some((q) => overlaps(r.text, q))
    ) {
      flag(
        "primary_secondary_association_errors",
        `restrictions.${i}`,
        r.text,
        "secondary fact omitted",
        r.quote,
      );
      flag(
        "cross_campaign_contamination",
        `restrictions.${i}`,
        r.text,
        null,
        r.quote,
      );
    }
  }
  const benefit = data.primaryProposition.benefit.value ?? "";
  const qualificationRepresentation = [
    benefit,
    ...data.restrictions.map((r) => r.text),
  ]
    .join(" ")
    .toLowerCase();
  for (const q of c.benefitQualifiers)
    if (
      benefit.toLowerCase().includes(q.anchor.toLowerCase()) &&
      q.required.some(
        (r) => !qualificationRepresentation.includes(r.toLowerCase()),
      )
    )
      flag(
        "benefit_qualifier_loss",
        "primaryProposition.benefit",
        benefit,
        q,
        data.primaryProposition.benefit.quote,
      );
  return { findings, restrictionReview, canonicalLabelDifferences };
}
export function scoreCaseV2(
  c: AnnotationCaseV2,
  raw: RawPromotionExtractionV2 | null,
  validated: ValidationV2,
) {
  return {
    caseId: c.id,
    expectedClassification: c.expectedClassification,
    rawClassification: raw?.classification.value ?? null,
    acceptedClassification: validated.accepted.classification.value,
    raw: semanticFindingsV2(c, raw),
    surviving: semanticFindingsV2(c, raw ? validated.accepted : null),
    quoteMismatches: validated.issues.filter((i) =>
      i.code.includes("quote_mismatch"),
    ).length,
    validatorRejections: validated.issues.length,
    missedScheduleFields: Object.entries(c.schedule)
      .filter(
        ([f, v]) =>
          v !== null &&
          !same(validated.accepted[f as keyof typeof c.schedule].value, v),
      )
      .map(([f]) => f),
  };
}
export function classificationSummaryV2(
  rows: { expectedClassification: string; predicted: string | null }[],
) {
  const ratio = (a: number, b: number) => (b ? a / b : null);
  const tp = rows.filter(
    (r) =>
      r.expectedClassification === "promotion" && r.predicted === "promotion",
  ).length;
  return {
    cases: rows.length,
    promotion_precision: ratio(
      tp,
      rows.filter((r) => r.predicted === "promotion").length,
    ),
    promotion_recall: ratio(
      tp,
      rows.filter((r) => r.expectedClassification === "promotion").length,
    ),
    non_promotion_correctness: ratio(
      rows.filter(
        (r) =>
          r.expectedClassification === "non_promotion" &&
          r.predicted === "non_promotion",
      ).length,
      rows.filter((r) => r.expectedClassification === "non_promotion").length,
    ),
    uncertain_rate: ratio(
      rows.filter((r) => r.predicted === "uncertain").length,
      rows.length,
    ),
    primary_classification_errors: rows.filter(
      (r) => r.predicted !== r.expectedClassification,
    ).length,
  };
}
