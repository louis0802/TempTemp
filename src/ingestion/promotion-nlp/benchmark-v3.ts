import { z } from "zod";
import {
  CONSTRAINT_ATTRIBUTES_V3,
  type ExtractionV3,
  type TimeConstraintV3,
} from "./schema-v3";
import {
  type SegmentationV3,
  type PropositionV3,
  propositionEvidenceV3,
} from "./segmentation-v3";

const identity = z.strictObject({
  identity: z.string(),
  labels: z.array(z.string()),
  quote: z.string(),
});
const constraint = z.strictObject({
  text: z.string(),
  requiredAttributes: z.array(z.enum(CONSTRAINT_ATTRIBUTES_V3)),
  allowedAttributes: z.array(z.enum(CONSTRAINT_ATTRIBUTES_V3)),
  material: z.boolean(),
});
export const goldPropositionSchemaV3 = z.strictObject({
  id: z.string(),
  type: z.enum(["promotion", "non_promotion", "uncertain"]),
  acceptableAnchors: z.array(z.string()).min(1),
  requiredSupporting: z.array(z.string()),
  forbiddenClauses: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  weekdays: z.array(z.number()).nullable(),
  timeConstraints: z.array(z.record(z.string(), z.string())),
  positiveScope: z
    .enum(["all_outlets", "selected_outlets", "named_outlets"])
    .nullable(),
  participating: z.array(identity),
  excluded: z.array(identity),
  constraints: z.array(constraint),
  benefitQualifiers: z.array(
    z.strictObject({ anchor: z.string(), required: z.array(z.string()) }),
  ),
  notes: z.string(),
});
export const benchmarkSchemaV3 = z
  .strictObject({
    version: z.literal(3),
    reviewBasis: z.string(),
    v1BenchmarkSha256: z.string(),
    v2BenchmarkSha256: z.string(),
    annotationRules: z.array(z.string()),
    cases: z
      .array(
        z.strictObject({
          id: z.string(),
          sourceText: z.string(),
          sourceReference: z.record(z.string(), z.unknown()),
          merchantHint: z.string().nullable(),
          titleHint: z.string().nullable(),
          propositions: z.array(goldPropositionSchemaV3),
          ambiguousClauses: z.array(z.string()),
          notes: z.string(),
        }),
      )
      .length(49),
  })
  .superRefine((b, ctx) => {
    if (new Set(b.cases.map((c) => c.id)).size !== 49)
      ctx.addIssue({ code: "custom", message: "duplicate_case_id" });
    for (const c of b.cases) {
      if (
        new Set(c.propositions.map((p) => p.id)).size !== c.propositions.length
      )
        ctx.addIssue({ code: "custom", message: `duplicate_gold_id:${c.id}` });
      const quotes = [
        ...c.ambiguousClauses,
        ...c.propositions.flatMap((p) => [
          ...p.acceptableAnchors,
          ...p.requiredSupporting,
          ...p.forbiddenClauses,
          ...p.constraints.map((r) => r.text),
          ...p.participating.map((i) => i.quote),
          ...p.excluded.map((i) => i.quote),
        ]),
      ];
      if (quotes.some((q) => !q || !c.sourceText.includes(q)))
        ctx.addIssue({
          code: "custom",
          message: `annotation_quote_mismatch:${c.id}`,
        });
    }
  });
export type GoldCaseV3 = z.infer<typeof benchmarkSchemaV3>["cases"][number];
export type GoldPropositionV3 = z.infer<typeof goldPropositionSchemaV3>;
const ratio = (n: number, d: number) => (d ? n / d : null);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const matches = (spans: string[], clause: string) =>
  spans.some((s) => s.includes(clause));
export function matchedGoldV3(c: GoldCaseV3, p: PropositionV3) {
  // Central anchors determine identity; supporting anchors alone cannot silently choose another offer.
  return c.propositions.filter((g) =>
    g.acceptableAnchors.some((a) => p.propositionQuote.includes(a)),
  );
}
export function scoreSegmentationV3(c: GoldCaseV3, s: SegmentationV3 | null) {
  const units = (s?.propositions ?? []).map((p) => {
    const spans = propositionEvidenceV3(p),
      gold = matchedGoldV3(c, p);
    return {
      propositionId: p.id,
      goldIds: gold.map((g) => g.id),
      unexpected: !gold.length,
      merged: gold.length > 1,
      crossAttachments: gold.flatMap((g) =>
        g.forbiddenClauses
          .filter((q) => matches(spans, q))
          .map((quote) => ({ goldId: g.id, quote })),
      ),
      ambiguousAttached: c.ambiguousClauses.filter((q) => matches(spans, q)),
      missedSupporting: gold.flatMap((g) =>
        g.requiredSupporting
          .filter((q) => !matches(spans, q))
          .map((quote) => ({ goldId: g.id, quote })),
      ),
    };
  });
  const recalled = c.propositions.filter((g) =>
    units.some((u) => u.goldIds.includes(g.id)),
  );
  const harmfulSplits = c.propositions.filter(
    (g) =>
      units.filter((u) => u.goldIds.includes(g.id)).length > 1 &&
      !units.some(
        (u) =>
          u.goldIds.includes(g.id) &&
          !u.missedSupporting.some((q) => q.goldId === g.id),
      ),
  );
  return {
    caseId: c.id,
    assessable: s !== null,
    expected: c.propositions.length,
    recalled: recalled.length,
    recall: ratio(recalled.length, c.propositions.length),
    unexpected: units.filter((u) => u.unexpected).length,
    merged: units.filter((u) => u.merged).length,
    harmfulSplits: harmfulSplits.map((g) => g.id),
    units,
  };
}
export const SAFETY_METRICS_V3 = [
  "cross_proposition_leakage",
  "invented_dates",
  "invented_time_boundary",
  "incorrect_availability_weekday",
  "participation_polarity_errors",
  "invented_participating_branch",
  "unsupported_positive_scope",
  "unstated_year_inference",
  "constraint_text_accuracy",
  "constraint_attribute_errors",
  "benefit_qualifier_loss",
  "missing_material_restriction",
] as const;
export type FindingV3 = {
  metric: (typeof SAFETY_METRICS_V3)[number];
  field: string;
  value: unknown;
  expected: unknown;
  quote: string | null;
};
const timeValue = (t: TimeConstraintV3) => {
  const { quote, ...rest } = t;
  void quote;
  return rest;
};
export function scoreExtractionV3(
  c: GoldCaseV3,
  unit: PropositionV3,
  d: ExtractionV3 | null,
) {
  const candidates = matchedGoldV3(c, unit),
    gold = candidates.length === 1 ? candidates[0] : null;
  const findings: FindingV3[] = [];
  const flag = (
    metric: FindingV3["metric"],
    field: string,
    value: unknown,
    expected: unknown,
    quote: string | null,
  ) => findings.push({ metric, field, value, expected, quote });
  if (!d)
    return {
      goldId: gold?.id ?? null,
      expectedType: gold?.type ?? null,
      predicted: null,
      findings,
      datesCorrect: false,
      weekdaysCorrect: false,
      timeCorrect: false,
      constraintReview: [],
    };
  const outputQuotes = [
    d.classification.quote,
    ...[
      d.merchant,
      d.title,
      d.benefit,
      d.startDate,
      d.endDate,
      d.weekdays,
      d.locationScope,
    ].map((f) => f.quote),
    ...d.timeConstraints.map((t) => t.quote),
    ...d.locationRules.map((l) => l.quote),
    ...d.constraints.map((r) => r.quote),
  ].filter((q): q is string => q !== null);
  if (gold)
    for (const q of gold.forbiddenClauses)
      if (outputQuotes.some((s) => s.includes(q)))
        flag("cross_proposition_leakage", "evidence", q, null, q);
  if (!gold)
    return {
      goldId: null,
      expectedType: null,
      predicted: d.classification.value,
      findings,
      datesCorrect: null,
      weekdaysCorrect: null,
      timeCorrect: null,
      constraintReview: d.constraints.map((r) => ({
        ...r,
        status: "unmatched_proposition_requires_source_review",
      })),
    };
  for (const f of ["startDate", "endDate"] as const)
    if (d[f].value !== null && d[f].value !== gold[f]) {
      flag("invented_dates", f, d[f].value, gold[f], d[f].quote);
      if (!d[f].quote?.includes(d[f].value!.slice(0, 4)))
        flag("unstated_year_inference", f, d[f].value, null, d[f].quote);
    }
  if (d.weekdays.value !== null && !same(d.weekdays.value, gold.weekdays))
    flag(
      "incorrect_availability_weekday",
      "weekdays",
      d.weekdays.value,
      gold.weekdays,
      d.weekdays.quote,
    );
  for (const [i, t] of d.timeConstraints.entries())
    if (!gold.timeConstraints.some((g) => same(g, timeValue(t))))
      flag(
        "invented_time_boundary",
        `timeConstraints.${i}`,
        timeValue(t),
        gold.timeConstraints,
        t.quote,
      );
  if (
    d.locationScope.value !== null &&
    d.locationScope.value !== gold.positiveScope
  )
    flag(
      "unsupported_positive_scope",
      "locationScope",
      d.locationScope.value,
      gold.positiveScope,
      d.locationScope.quote,
    );
  for (const [i, r] of d.locationRules.entries())
    for (const n of r.names) {
      const belongs = (ids: typeof gold.participating) =>
        ids.some((x) => x.labels.some((l) => l === n || n.includes(l)));
      const correct = belongs(
          r.role === "participating" ? gold.participating : gold.excluded,
        ),
        reverse = belongs(
          r.role === "participating" ? gold.excluded : gold.participating,
        );
      if (reverse)
        flag(
          "participation_polarity_errors",
          `locationRules.${i}`,
          { role: r.role, name: n },
          null,
          r.quote,
        );
      else if (r.role === "participating" && !correct)
        flag(
          "invented_participating_branch",
          `locationRules.${i}`,
          n,
          gold.participating,
          r.quote,
        );
    }
  const constraintReview = d.constraints.map((r, i) => {
    const targets = gold.constraints.filter(
      (t) =>
        r.text.includes(t.text) ||
        (t.text.includes(r.text) && r.text.length >= 12),
    );
    if (!r.quote.includes(r.text))
      flag(
        "constraint_text_accuracy",
        `constraints.${i}`,
        r.text,
        null,
        r.quote,
      );
    if (targets.length) {
      const required = new Set(targets.flatMap((t) => t.requiredAttributes)),
        allowed = new Set(targets.flatMap((t) => t.allowedAttributes));
      if (
        [...required].some((a) => !r.attributes.includes(a)) ||
        r.attributes.some((a) => !allowed.has(a))
      )
        flag(
          "constraint_attribute_errors",
          `constraints.${i}`,
          r.attributes,
          { required: [...required], allowed: [...allowed] },
          r.quote,
        );
    }
    return {
      ...r,
      targets: targets.map((t) => t.text),
      status: targets.length ? "matched" : "source_review_required",
    };
  });
  for (const t of gold.constraints.filter((t) => t.material))
    if (
      !d.constraints.some(
        (r) =>
          r.text.includes(t.text) ||
          (t.text.includes(r.text) && r.text.length >= 12),
      )
    )
      flag("missing_material_restriction", "constraints", null, t.text, null);
  const economic = [d.benefit.value ?? "", ...d.constraints.map((r) => r.text)]
    .join(" ")
    .toLowerCase();
  for (const q of gold.benefitQualifiers)
    if (
      (d.benefit.value ?? "").toLowerCase().includes(q.anchor.toLowerCase()) &&
      q.required.some((r) => !economic.includes(r.toLowerCase()))
    )
      flag(
        "benefit_qualifier_loss",
        "benefit",
        d.benefit.value,
        q,
        d.benefit.quote,
      );
  return {
    goldId: gold.id,
    expectedType: gold.type,
    predicted: d.classification.value,
    findings,
    datesCorrect:
      d.startDate.value === gold.startDate && d.endDate.value === gold.endDate,
    weekdaysCorrect: same(d.weekdays.value, gold.weekdays),
    timeCorrect: same(d.timeConstraints.map(timeValue), gold.timeConstraints),
    constraintReview,
  };
}
export function classificationSummaryV3(
  rows: { expectedType: string | null; predicted: string | null }[],
) {
  const tp = rows.filter(
    (r) => r.expectedType === "promotion" && r.predicted === "promotion",
  ).length;
  return {
    units: rows.length,
    truePositives: tp,
    promotionPrecision: ratio(
      tp,
      rows.filter((r) => r.predicted === "promotion").length,
    ),
    promotionRecall: ratio(
      tp,
      rows.filter((r) => r.expectedType === "promotion").length,
    ),
    nonPromotionCorrectness: ratio(
      rows.filter(
        (r) =>
          r.expectedType === "non_promotion" && r.predicted === "non_promotion",
      ).length,
      rows.filter((r) => r.expectedType === "non_promotion").length,
    ),
    uncertainRate: ratio(
      rows.filter((r) => r.predicted === "uncertain").length,
      rows.length,
    ),
  };
}
