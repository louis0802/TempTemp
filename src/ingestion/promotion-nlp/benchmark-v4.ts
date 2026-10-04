import { z } from "zod";
import {
  ATTRIBUTES_V4,
  EVIDENCE_KINDS_V4,
  RELATIONS_V4,
  TAXONOMY_V4,
  type EvidenceV4,
  type EdgeV4,
  type PropositionV4,
  type NormalizationV4,
  type EligibilityOutputV4,
} from "./schema-v4";

import { supportedTimeV3 } from "./validator-v3";

export { ATTRIBUTES_V4, EVIDENCE_KINDS_V4, RELATIONS_V4, TAXONOMY_V4 };

const propositionSchema = z.strictObject({
  id: z.string(),
  taxonomy: z.enum(TAXONOMY_V4),
  acceptableAnchors: z.array(z.string()).min(1),
});
const clauseSchema = z.strictObject({
  id: z.string(),
  quote: z.string(),
  alternatives: z.array(z.string()),
  kind: z.enum(EVIDENCE_KINDS_V4),
  material: z.boolean(),
  propositionIds: z.array(z.string()),
  relations: z.array(z.enum(RELATIONS_V4)),
});
const expectedSchema = z.strictObject({
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  weekdays: z.array(z.number().int().min(1).max(7)).nullable(),
  timeConstraints: z.array(z.record(z.string(), z.string())),
  locationScope: z
    .enum(["all_outlets", "selected_outlets", "named_outlets"])
    .nullable(),
  participating: z.array(
    z.strictObject({
      identity: z.string(),
      labels: z.array(z.string()),
      quote: z.string(),
    }),
  ),
  excluded: z.array(
    z.strictObject({
      identity: z.string(),
      labels: z.array(z.string()),
      quote: z.string(),
    }),
  ),
  constraints: z.array(
    z.strictObject({
      text: z.string(),
      attributes: z.array(z.enum(ATTRIBUTES_V4)),
      evidenceQuote: z.string(),
      alternatives: z.array(z.string()).optional(),
    }),
  ),
  benefitQualifiers: z.array(
    z.strictObject({ anchor: z.string(), required: z.array(z.string()) }),
  ),
});
const caseSchema = z.strictObject({
  id: z.string(),
  sourceText: z.string(),
  sourceReference: z.record(z.string(), z.unknown()),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  requiredClauses: z.array(clauseSchema),
  propositions: z.array(propositionSchema),
  expected: z.record(z.string(), expectedSchema),
  ambiguousClauses: z.array(z.string()),
  notes: z.string(),
});
export const benchmarkSchemaV4 = z
  .strictObject({
    version: z.literal(4),
    reviewBasis: z.string(),
    sourceBenchmarkSha256: z.string(),
    annotationRules: z.array(z.string()),
    cases: z.array(caseSchema).length(49),
  })
  .superRefine((b, ctx) => {
    const ids = new Set<string>();
    for (const c of b.cases) {
      if (ids.has(c.id))
        ctx.addIssue({ code: "custom", message: `duplicate_case:${c.id}` });
      ids.add(c.id);
      const propIds = new Set(c.propositions.map((p) => p.id));
      if (
        propIds.size !== c.propositions.length ||
        new Set(c.requiredClauses.map((x) => x.id)).size !==
          c.requiredClauses.length ||
        new Set(c.requiredClauses.map((x) => x.quote)).size !==
          c.requiredClauses.length
      )
        ctx.addIssue({
          code: "custom",
          message: `duplicate_gold_identity:${c.id}`,
        });
      if (
        Object.keys(c.expected).length !== propIds.size ||
        Object.keys(c.expected).some((id) => !propIds.has(id))
      )
        ctx.addIssue({
          code: "custom",
          message: `gold_expected_identity_mismatch:${c.id}`,
        });
      for (const q of [
        ...c.requiredClauses.map((x) => x.quote),
        ...c.requiredClauses.flatMap((x) => x.alternatives),
        ...c.propositions.flatMap((x) => x.acceptableAnchors),
        ...c.ambiguousClauses,
      ])
        if (!q || !c.sourceText.includes(q))
          ctx.addIssue({
            code: "custom",
            message: `annotation_not_literal:${c.id}:${q}`,
          });
      for (const cl of c.requiredClauses)
        for (const id of cl.propositionIds)
          if (!propIds.has(id))
            ctx.addIssue({
              code: "custom",
              message: `unknown_clause_target:${c.id}:${id}`,
            });
      const visitLiteralFields = (value: unknown, path: string[] = []) => {
        if (Array.isArray(value)) {
          value.forEach((item, i) =>
            visitLiteralFields(item, [...path, String(i)]),
          );
          return;
        }
        if (!value || typeof value !== "object") return;
        for (const [key, item] of Object.entries(value)) {
          if (
            typeof item === "string" &&
            ["quote", "text", "identity", "anchor"].includes(key) &&
            !c.sourceText.includes(item)
          )
            ctx.addIssue({
              code: "custom",
              message: `expected_annotation_not_literal:${c.id}:${[...path, key].join(".")}`,
            });
          else visitLiteralFields(item, [...path, key]);
        }
      };
      visitLiteralFields(c.expected, ["expected"]);
    }
  });
export type GoldCaseV4 = z.infer<typeof benchmarkSchemaV4>["cases"][number];
export type {
  EvidenceV4,
  PropositionV4,
  EdgeV4,
  NormalizationV4,
  EligibilityOutputV4,
};
export type EvidenceOutputV4 = { evidence: EvidenceV4[] };
export type PropositionOutputV4 = { propositions: PropositionV4[] };
export type EdgeOutputV4 = { edges: EdgeV4[] };
export type PipelineCaseV4 = {
  evidence: EvidenceV4[] | null;
  propositions: PropositionV4[] | null;
  edges: EdgeV4[] | null;
  eligibility: Record<string, EligibilityOutputV4 | null>;
  normalization: Record<string, NormalizationV4 | null>;
  malformedStages?: number[];
};
export type FindingV4 = {
  code: string;
  stage: number;
  propositionId: string | null;
  evidenceId?: string;
  detail?: string;
  requirementId?: string;
};
export type ScoredCaseV4 = ReturnType<typeof scoreCaseV4>;

const ratio = (n: number, d: number) => ({
  numerator: n,
  denominator: d,
  value: d ? n / d : null,
});
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).sort().join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "evidenceId")
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${key}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const containsClause = (
  quote: string,
  clause: GoldCaseV4["requiredClauses"][number],
) =>
  [clause.quote, ...clause.alternatives].some((span) => quote.includes(span));

type RequirementTrace = {
  requirementId: string;
  clauseId: string;
  propositionId: string;
  material: boolean;
  node: boolean;
  proposition: boolean;
  edge: boolean;
  taxonomy: boolean;
  normalized: boolean | null;
  earliestStage: number | null;
  failureCode: string | null;
};

export function scoreCaseV4(gold: GoldCaseV4, pipeline: PipelineCaseV4) {
  const findings: FindingV4[] = [];
  const fail = (
    code: string,
    stage: number,
    propositionId: string | null,
    detail?: string,
    evidenceId?: string,
    requirementId?: string,
  ) =>
    findings.push({
      code,
      stage,
      propositionId,
      ...(detail ? { detail } : {}),
      ...(evidenceId ? { evidenceId } : {}),
      ...(requirementId ? { requirementId } : {}),
    });
  const malformed = [...new Set(pipeline.malformedStages ?? [])].sort(
    (a, b) => a - b,
  );
  if (malformed.length)
    fail("MALFORMED_OUTPUT", malformed[0]!, null, `stage_${malformed[0]}`);
  const evidence = pipeline.evidence ?? [];
  const props = pipeline.propositions ?? [];
  const edges = pipeline.edges ?? [];
  const clauseNodes = new Map(
    gold.requiredClauses.map((clause) => [
      clause.id,
      evidence.filter((node) => containsClause(node.quote, clause)),
    ]),
  );
  const inventedEvidenceNodes = evidence.filter(
    (node) => !gold.sourceText.includes(node.quote),
  );
  const evidenceQuoteCounts = new Map<string, number>();
  for (const node of evidence)
    evidenceQuoteCounts.set(
      node.quote,
      (evidenceQuoteCounts.get(node.quote) ?? 0) + 1,
    );
  const duplicateEvidenceNodes = [...evidenceQuoteCounts.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0,
  );
  const crossGroupNodes = evidence.filter((node) => {
    const matched = gold.requiredClauses.filter(
      (clause) => clause.material && containsClause(node.quote, clause),
    );
    return matched.some((left, i) =>
      matched
        .slice(i + 1)
        .some(
          (right) =>
            !left.propositionIds.some((id) =>
              right.propositionIds.includes(id),
            ),
        ),
    );
  });
  const fragmentCandidates = gold.requiredClauses.filter(
    (clause) =>
      clause.material &&
      !clauseNodes.get(clause.id)?.length &&
      clause.quote
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .every((word) => evidence.some((node) => node.quote.includes(word))),
  );
  for (const node of crossGroupNodes)
    fail("NODE_BAD_BOUNDARY", 1, null, node.quote, node.id);
  for (const clause of fragmentCandidates)
    fail(
      "NODE_BAD_BOUNDARY",
      1,
      clause.propositionIds[0] ?? null,
      clause.quote,
      undefined,
      clause.id,
    );
  const propositionMatches = (
    goldProp: GoldCaseV4["propositions"][number],
    modelProp: PropositionV4,
  ) =>
    modelProp.anchorEvidenceIds.some((id) => {
      const node = evidence.find((item) => item.id === id);
      return (
        !!node &&
        goldProp.acceptableAnchors.some((anchor) => node.quote.includes(anchor))
      );
    });
  const pMatches = new Map(
    props.map((prop) => [
      prop.id,
      gold.propositions
        .filter((item) => propositionMatches(item, prop))
        .map((item) => item.id),
    ]),
  );
  const goldToModels = new Map(
    gold.propositions.map((item) => [
      item.id,
      props.filter((prop) => pMatches.get(prop.id)?.includes(item.id)),
    ]),
  );
  const recalledProps = gold.propositions.filter(
    (item) => (goldToModels.get(item.id)?.length ?? 0) > 0,
  );
  const harmfulMerges = props.filter(
    (prop) => (pMatches.get(prop.id)?.length ?? 0) > 1,
  );
  const harmfulSplits = gold.propositions.filter(
    (item) => (goldToModels.get(item.id)?.length ?? 0) > 1,
  );
  const overgeneratedPropositions = props.filter(
    (prop) => (pMatches.get(prop.id)?.length ?? 0) === 0,
  );
  for (const prop of harmfulMerges)
    fail(
      "PROPOSITION_BAD_MERGE",
      2,
      pMatches.get(prop.id)?.[0] ?? null,
      prop.id,
    );
  for (const item of harmfulSplits) fail("PROPOSITION_BAD_SPLIT", 2, item.id);

  // Gold target assignments are tuples. Model proposition IDs are translated through anchor matches.
  const expectedAssignments = new Map<string, string[]>();
  for (const clause of gold.requiredClauses) {
    const targetIds = clause.propositionIds.length
      ? clause.propositionIds
      : [""];
    for (const target of targetIds)
      expectedAssignments.set(`${clause.id}\0${target}`, clause.relations);
  }
  const predictedAssignments: {
    key: string;
    clauseId: string;
    target: string;
    relation: string;
    evidenceId: string;
  }[] = [];
  for (const edge of edges) {
    const node = evidence.find((item) => item.id === edge.evidenceId);
    if (!node) {
      for (const target of edge.propositionIds)
        predictedAssignments.push({
          key: `unknown\0${target}\0${edge.relation}`,
          clauseId: "unknown",
          target: pMatches.get(target)?.[0] ?? `unmatched:${target}`,
          relation: edge.relation,
          evidenceId: edge.evidenceId,
        });
      continue;
    }
    const clauses = gold.requiredClauses.filter((clause) =>
      containsClause(node.quote, clause),
    );
    for (const clause of clauses) {
      const targets = edge.propositionIds.length
        ? edge.propositionIds.flatMap((id) =>
            pMatches.get(id)?.length ? pMatches.get(id)! : [`unmatched:${id}`],
          )
        : [""];
      for (const target of targets)
        predictedAssignments.push({
          key: `${clause.id}\0${target}`,
          clauseId: clause.id,
          target,
          relation: edge.relation,
          evidenceId: edge.evidenceId,
        });
    }
  }
  const matchedExpected = new Set<string>();
  const seenPredictions = new Set<string>();
  let wrongTarget = 0,
    wrongRelation = 0,
    edgeFalsePositive = 0;
  for (let i = 0; i < predictedAssignments.length; i++) {
    const item = predictedAssignments[i]!;
    const allowedRelations = expectedAssignments.get(item.key);
    if (
      allowedRelations?.includes(item.relation) &&
      !matchedExpected.has(item.key)
    ) {
      matchedExpected.add(item.key);
      continue;
    }
    // Multiple overlapping nodes supporting one required target do not add false positives.
    if (
      allowedRelations?.includes(item.relation) &&
      matchedExpected.has(item.key)
    )
      continue;
    const predictionKey = `${item.key}\0${item.relation}`;
    if (seenPredictions.has(predictionKey)) continue;
    seenPredictions.add(predictionKey);
    edgeFalsePositive++;
    const relevant = gold.requiredClauses.find(
      (clause) => clause.id === item.clauseId,
    );
    if (relevant && !relevant.propositionIds.includes(item.target)) {
      wrongTarget++;
      fail(
        "EDGE_WRONG_TARGET",
        3,
        relevant.propositionIds[0] ?? null,
        item.target,
        item.evidenceId,
        `${relevant.id}:${relevant.propositionIds[0] ?? ""}`,
      );
    } else if (
      relevant &&
      relevant.propositionIds.includes(item.target) &&
      !relevant.relations.includes(
        item.relation as (typeof RELATIONS_V4)[number],
      )
    ) {
      wrongRelation++;
      fail(
        "EDGE_WRONG_RELATION",
        3,
        item.target,
        item.relation,
        item.evidenceId,
        `${relevant.id}:${item.target}`,
      );
    }
  }
  const edgeTP = matchedExpected.size;
  const edgeFN = expectedAssignments.size - edgeTP;
  const wronglyAssignedAmbiguous = gold.ambiguousClauses.filter((quote) => {
    const nodes = evidence.filter((node) => node.quote.includes(quote));
    return nodes.some((node) =>
      edges.some(
        (edge) => edge.evidenceId === node.id && edge.propositionIds.length > 0,
      ),
    );
  });
  const falseEdges = edgeFalsePositive;
  const edgePrecision = ratio(edgeTP, edgeTP + falseEdges);
  const edgeRecall = ratio(edgeTP, expectedAssignments.size);

  const confusion: Record<string, Record<string, number>> = Object.fromEntries(
    TAXONOMY_V4.map((type) => [
      type,
      Object.fromEntries(TAXONOMY_V4.map((predicted) => [predicted, 0])),
    ]),
  );
  let taxonomyCorrect = 0,
    taxonomyAssessed = 0,
    falseEconomic = 0,
    falseEconomicReviewedUnmatched = 0;
  const matchedModelForGold = new Map<string, PropositionV4>();
  for (const goldProp of gold.propositions) {
    const models = goldToModels.get(goldProp.id) ?? [];
    if (models.length !== 1) continue;
    const model = models[0]!;
    matchedModelForGold.set(goldProp.id, model);
    const result = pipeline.eligibility[model.id];
    if (!result) {
      fail("ELIGIBILITY_FALSE_NEGATIVE", 4, goldProp.id, "eligibility_missing");
      continue;
    }
    taxonomyAssessed++;
    confusion[goldProp.taxonomy][result.taxonomy]++;
    if (goldProp.taxonomy === result.taxonomy) taxonomyCorrect++;
    matchedModelForGold.set(goldProp.id, model);
    if (
      goldProp.taxonomy !== "economic_offer" &&
      result.taxonomy === "economic_offer"
    ) {
      falseEconomic++;
      fail("ELIGIBILITY_FALSE_POSITIVE", 4, goldProp.id);
    }
  }
  for (const model of props) {
    if (pipeline.eligibility[model.id]?.taxonomy !== "economic_offer") continue;
    if ((pMatches.get(model.id)?.length ?? 0) !== 1) {
      // Over-generation outside the minimal reviewed gold needs source review; report its bound separately.
      falseEconomicReviewedUnmatched++;
    }
  }
  const goldEconomic = gold.propositions.filter(
    (item) => item.taxonomy === "economic_offer",
  );
  const economicIdentitySuccess = goldEconomic.filter((item) => {
    const models = goldToModels.get(item.id) ?? [];
    return (
      models.length === 1 &&
      pMatches.get(models[0]!.id)?.length === 1 &&
      pipeline.eligibility[models[0]!.id]?.taxonomy === "economic_offer"
    );
  });
  const economicPredicted = props.filter(
    (model) => pipeline.eligibility[model.id]?.taxonomy === "economic_offer",
  ).length;
  const economicPrecision = ratio(
    economicIdentitySuccess.length,
    economicPredicted,
  );
  const economicRecall = ratio(
    economicIdentitySuccess.length,
    goldEconomic.length,
  );

  const trace: RequirementTrace[] = [];
  let materialNodes = 0;
  const materialExpected = gold.requiredClauses.filter(
    (clause) => clause.material,
  ).length;
  let missingMaterialEdges = 0,
    missingMaterialConstraint = 0,
    expectedConstraints = 0,
    normalizedConstraints = 0;
  const clauseForConstraint = (quote: string) =>
    gold.requiredClauses.find(
      (clause) => clause.quote === quote || clause.alternatives.includes(quote),
    ) ?? gold.requiredClauses.find((clause) => quote.includes(clause.quote));
  // Constraint requirements come from reviewed constraint annotations, not every material benefit/date/place clause.
  const constraintRequirements = gold.propositions.flatMap((prop) => {
    const expected =
      (gold.expected as Record<string, Record<string, unknown>>)[prop.id] ?? {};
    const constraints = Array.isArray(expected.constraints)
      ? (expected.constraints as Record<string, unknown>[])
      : [];
    return constraints.map((constraint, i) => ({
      prop,
      constraint,
      id: `${prop.id}:constraint:${i}`,
      clause: clauseForConstraint(String(constraint.text ?? "")),
    }));
  });
  expectedConstraints = constraintRequirements.length;
  const normalizedConstraintMatches = (
    req: (typeof constraintRequirements)[number],
    model: PropositionV4,
    nodes: EvidenceV4[],
  ) => {
    const expectedText = String(req.constraint.text ?? "");
    const expectedAttributes = Array.isArray(req.constraint.attributes)
      ? (req.constraint.attributes as string[])
      : [];
    const output = pipeline.normalization[model.id];
    if (!output || !expectedText) return false;
    return output.constraints.some((item) => {
      const textMatch = [
        expectedText,
        ...((req.constraint.alternatives as string[] | undefined) ?? []),
      ].some((text) => item.text.includes(text));
      const attributesMatch = expectedAttributes.every((attribute) =>
        item.attributes.includes(attribute as (typeof ATTRIBUTES_V4)[number]),
      );
      const evidenceMatch = nodes.some((node) => item.evidenceId === node.id);
      return textMatch && attributesMatch && evidenceMatch;
    });
  };
  const independentModel = (pid: string) => {
    const models = goldToModels.get(pid) ?? [];
    return models.length === 1 && pMatches.get(models[0]!.id)?.length === 1
      ? models[0]!
      : null;
  };
  const pathFailure = (
    clause: GoldCaseV4["requiredClauses"][number],
    pid: string,
    needsNormalization: boolean,
    normalized: boolean,
  ) => {
    const nodes = clauseNodes.get(clause.id) ?? [];
    const models = goldToModels.get(pid) ?? [];
    const model = independentModel(pid);
    const related = edges.filter((edge) =>
      nodes.some((node) => node.id === edge.evidenceId),
    );
    const edgeOK =
      !!model &&
      related.some(
        (edge) =>
          edge.propositionIds.includes(model.id) &&
          clause.relations.includes(edge.relation),
      );
    const expectedTaxonomy = gold.propositions.find(
      (prop) => prop.id === pid,
    )!.taxonomy;
    let stage: number | null = null,
      code: string | null = null;
    if (!nodes.length) {
      stage = 1;
      code = fragmentCandidates.includes(clause)
        ? "NODE_BAD_BOUNDARY"
        : "NODE_MISSING";
    } else if (!nodes.some((node) => !crossGroupNodes.includes(node))) {
      stage = 1;
      code = "NODE_BAD_BOUNDARY";
    } else if (!models.length) {
      stage = 2;
      code = "PROPOSITION_MISSING";
    } else if (models.length > 1) {
      stage = 2;
      code = "PROPOSITION_BAD_SPLIT";
    } else if (!model) {
      stage = 2;
      code = "PROPOSITION_BAD_MERGE";
    } else if (!edgeOK) {
      stage = 3;
      code = related.some((edge) => edge.propositionIds.includes(model.id))
        ? "EDGE_WRONG_RELATION"
        : related.some((edge) => edge.propositionIds.length)
          ? "EDGE_WRONG_TARGET"
          : "EDGE_MISSING";
    } else if (
      expectedTaxonomy === "economic_offer" &&
      pipeline.eligibility[model.id]?.taxonomy !== "economic_offer"
    ) {
      stage = 4;
      code = "ELIGIBILITY_FALSE_NEGATIVE";
    } else if (needsNormalization && !normalized) {
      stage = 5;
      code = "NORMALIZATION_MISSING";
    }
    if (
      stage !== null &&
      malformed.includes(stage) &&
      (stage < 4 ||
        (stage === 4
          ? !pipeline.eligibility[model?.id ?? ""]
          : !pipeline.normalization[model?.id ?? ""]))
    )
      code = "MALFORMED_OUTPUT";
    return { nodes, model, edgeOK, stage, code };
  };
  for (const clause of gold.requiredClauses.filter((item) => item.material)) {
    const nodes = clauseNodes.get(clause.id) ?? [];
    if (nodes.length) materialNodes++;
    for (const pid of clause.propositionIds) {
      const req = constraintRequirements.find(
        (req) => req.prop.id === pid && req.clause?.id === clause.id,
      );
      const model = independentModel(pid);
      const normalized =
        req && model ? normalizedConstraintMatches(req, model, nodes) : null;
      const state = pathFailure(clause, pid, !!req, normalized === true);
      if (state.stage === 3) missingMaterialEdges++;
      if (state.code)
        fail(
          state.code,
          state.stage!,
          pid,
          clause.quote,
          nodes[0]?.id,
          `${clause.id}:${pid}`,
        );
      trace.push({
        requirementId: `${clause.id}:${pid}`,
        clauseId: clause.id,
        propositionId: pid,
        material: true,
        node: nodes.length > 0,
        proposition: !!state.model,
        edge: state.edgeOK,
        taxonomy:
          !!state.model &&
          pipeline.eligibility[state.model.id]?.taxonomy ===
            gold.propositions.find((prop) => prop.id === pid)?.taxonomy,
        normalized,
        earliestStage: state.stage,
        failureCode: state.code,
      });
    }
  }
  for (const req of constraintRequirements) {
    const nodes = req.clause ? (clauseNodes.get(req.clause.id) ?? []) : [];
    const model = independentModel(req.prop.id);
    const normalized =
      !!model && normalizedConstraintMatches(req, model, nodes);
    const state = req.clause
      ? pathFailure(req.clause, req.prop.id, true, normalized)
      : { stage: 1, code: "NODE_MISSING", edgeOK: false };
    if (!state.code && normalized && state.edgeOK) normalizedConstraints++;
    else {
      missingMaterialConstraint++;
      fail(
        state.code ?? "NORMALIZATION_MISSING",
        state.stage ?? 5,
        req.prop.id,
        String(req.constraint.text ?? ""),
        nodes[0]?.id,
        req.clause ? `${req.clause.id}:${req.prop.id}` : req.id,
      );
    }
  }
  const normalizationFindings: FindingV4[] = [];
  let normalizedFieldCorrect = 0,
    normalizedFieldAssessed = 0;
  const safetyKeys = [
    "invented_validity",
    "wrong_validity",
    "missing_validity",
    "invalid_validity_association",
    "invented_numeric_time_endpoint",
    "wrong_schedule_association",
    "participation_polarity_reversal",
    "invented_participating_identity",
    "unstated_year_inference",
    "benefit_qualifier_loss",
  ] as const;
  const safety = Object.fromEntries(
    safetyKeys.map((key) => [key, { errors: 0, assessed: 0, unassessed: 0 }]),
  ) as Record<
    (typeof safetyKeys)[number],
    { errors: number; assessed: number; unassessed: number }
  >;
  const markSafety = (
    key: (typeof safetyKeys)[number],
    error: boolean,
    assessable: boolean,
  ) => {
    if (!assessable) safety[key]!.unassessed++;
    else {
      safety[key]!.assessed++;
      if (error) safety[key]!.errors++;
    }
  };
  const normalizedByGold = new Map<string, NormalizationV4 | null>();
  for (const goldProp of goldEconomic) {
    const model = matchedModelForGold.get(goldProp.id);
    const norm =
      model && pipeline.eligibility[model.id]?.taxonomy === "economic_offer"
        ? (pipeline.normalization[model.id] ?? null)
        : null;
    normalizedByGold.set(goldProp.id, norm);
    const expected =
      (gold.expected as Record<string, Record<string, unknown>>)[goldProp.id] ??
      {};
    if (!norm) {
      for (const key of safetyKeys) markSafety(key, false, false);
      if (
        model &&
        pipeline.eligibility[model.id]?.taxonomy === "economic_offer"
      )
        fail(
          malformed.includes(5) ? "MALFORMED_OUTPUT" : "NORMALIZATION_MISSING",
          5,
          goldProp.id,
        );
      continue;
    }
    const fields = [
      "startDate",
      "endDate",
      "weekdays",
      "locationScope",
      "timeConstraints",
      "locationRules",
      "constraints",
    ] as const;
    for (const field of fields) {
      if (expected[field] === undefined && field !== "locationRules") continue;
      const expectedValue = expected[field];
      let equal = false;
      if (field === "startDate" || field === "endDate") {
        equal = canonical(norm[field].value) === canonical(expectedValue);
      } else if (field === "weekdays" || field === "locationScope") {
        equal = canonical(norm[field].value) === canonical(expectedValue);
      } else if (field === "timeConstraints") {
        equal =
          canonical(
            norm.timeConstraints.map((item) =>
              Object.fromEntries(
                Object.entries(item).filter(([key]) => key !== "evidenceId"),
              ),
            ),
          ) === canonical(expectedValue);
      } else if (field === "locationRules") {
        const actual = norm.locationRules
          .flatMap((rule) => rule.names.map((name) => `${rule.role}:${name}`))
          .sort();
        const identities = [
          ...(
            (expected.participating as
              { identity: string; labels: string[] }[] | undefined) ?? []
          ).map((item) => ({ ...item, role: "participating" })),
          ...(
            (expected.excluded as
              { identity: string; labels: string[] }[] | undefined) ?? []
          ).map((item) => ({ ...item, role: "excluded" })),
        ];
        equal =
          identities.every((item) =>
            (item.labels ?? [item.identity]).some((name) =>
              actual.includes(`${item.role}:${name}`),
            ),
          ) &&
          actual.every((item) =>
            identities.some((identity) =>
              (identity.labels ?? [identity.identity]).some(
                (name) => item === `${identity.role}:${name}`,
              ),
            ),
          );
      } else if (field === "constraints") {
        equal = constraintRequirements
          .filter((req) => req.prop.id === goldProp.id)
          .every((req) =>
            normalizedConstraintMatches(
              req,
              model!,
              req.clause ? (clauseNodes.get(req.clause.id) ?? []) : [],
            ),
          );
      }
      normalizedFieldAssessed++;
      if (equal) normalizedFieldCorrect++;
      if (!equal && field !== "constraints")
        normalizationFindings.push({
          code: "NORMALIZATION_INCORRECT",
          stage: 5,
          propositionId: goldProp.id,
          detail: field,
        });
      if (field === "startDate" || field === "endDate") {
        const value = (norm[field] as { value: string | null }).value;
        const expectedDate = expectedValue as string | null;
        markSafety(
          "invented_validity",
          value !== null && expectedDate === null,
          true,
        );
        markSafety(
          "wrong_validity",
          value !== null && expectedDate !== null && value !== expectedDate,
          true,
        );
        markSafety(
          "missing_validity",
          value === null && expectedDate !== null,
          true,
        );
        if (value && model) {
          const dateEvidenceId = norm[field].evidenceId;
          const dateNode = evidence.find((node) => node.id === dateEvidenceId);
          const linked =
            dateNode &&
            edges.some(
              (edge) =>
                edge.evidenceId === dateNode.id &&
                edge.propositionIds.some((id) =>
                  pMatches.get(id)?.includes(goldProp.id),
                ) &&
                edge.relation === "validity",
            );
          markSafety("invalid_validity_association", !linked, true);
          markSafety(
            "unstated_year_inference",
            !dateNode?.quote.includes(value.slice(0, 4)),
            true,
          );
        } else markSafety("invalid_validity_association", false, false);
      }
      if (field === "weekdays" || field === "timeConstraints") {
        markSafety("wrong_schedule_association", !equal, true);
        if (field === "timeConstraints") {
          for (const item of norm.timeConstraints) {
            const { evidenceId, ...localTime } = item;
            const node = evidence.find(
              (candidate) => candidate.id === evidenceId,
            );
            const linked =
              !!node &&
              edges.some(
                (edge) =>
                  edge.evidenceId === node.id &&
                  edge.propositionIds.some((id) =>
                    pMatches.get(id)?.includes(goldProp.id),
                  ) &&
                  edge.relation === "time",
              );
            if (!linked) markSafety("wrong_schedule_association", true, true);
            markSafety(
              "invented_numeric_time_endpoint",
              !node || !supportedTimeV3({ ...localTime, quote: node.quote }),
              true,
            );
          }
        }
      }
      if (field === "locationRules") {
        const expectedRules = [
          ...(
            (expected.participating as
              { labels?: string[]; identity?: string }[] | undefined) ?? []
          ).map((item) => ({
            role: "participating",
            names: item.labels ?? [item.identity ?? ""],
          })),
          ...(
            (expected.excluded as
              { labels?: string[]; identity?: string }[] | undefined) ?? []
          ).map((item) => ({
            role: "excluded",
            names: item.labels ?? [item.identity ?? ""],
          })),
        ];
        for (const item of norm.locationRules) {
          const names = item.names;
          const correctRole = expectedRules.find(
            (value) =>
              value.role === item.role &&
              canonical(value.names) === canonical(names),
          );
          markSafety(
            "participation_polarity_reversal",
            !correctRole &&
              expectedRules.some(
                (value) =>
                  value.role !== item.role &&
                  Array.isArray(value.names) &&
                  names.some((name) =>
                    (value.names as string[]).includes(name),
                  ),
              ),
            true,
          );
          markSafety(
            "invented_participating_identity",
            item.role === "participating" && !correctRole,
            true,
          );
        }
      }
    }
    const qualifiers = Array.isArray(expected.benefitQualifiers)
      ? (expected.benefitQualifiers as { anchor: string; required: string[] }[])
      : [];
    for (const qualifier of qualifiers)
      markSafety(
        "benefit_qualifier_loss",
        qualifier.required.some(
          (term) =>
            !(norm.benefit.value ?? "")
              .toLowerCase()
              .includes(term.toLowerCase()) &&
            !norm.constraints.some((c) =>
              c.text.toLowerCase().includes(term.toLowerCase()),
            ),
        ),
        true,
      );
  }
  findings.push(...normalizationFindings);
  const byRequirement = new Map<string, FindingV4>();
  for (const finding of findings) {
    const key =
      finding.requirementId ??
      `${finding.propositionId ?? "case"}:${finding.detail ?? finding.evidenceId ?? finding.code}`;
    const previous = byRequirement.get(key);
    if (!previous || finding.stage < previous.stage)
      byRequirement.set(key, finding);
  }
  const earliestFindings = [...byRequirement.values()];
  const assessedSafety = Object.fromEntries(
    safetyKeys.map((key) => [
      key,
      {
        ...safety[key],
        rate: ratio(safety[key].errors, safety[key].assessed),
        count: safety[key].assessed,
        denominator: safety[key].assessed,
        unassessed: safety[key].unassessed,
      },
    ]),
  );
  return {
    caseId: gold.id,
    assessable: malformed.length === 0,
    nodes: {
      expected: gold.requiredClauses.length,
      materialExpected,
      materialRecalled: materialNodes,
      invented: inventedEvidenceNodes.length,
      duplicates: duplicateEvidenceNodes,
      crossGroupBadBoundaries: crossGroupNodes.length,
      fragmentSplitCandidates: fragmentCandidates.length,
      missing: gold.requiredClauses.filter(
        (c) => c.material && !clauseNodes.get(c.id)?.length,
      ).length,
      materialRecall: ratio(materialNodes, materialExpected),
    },
    propositions: {
      expected: gold.propositions.length,
      recalled: recalledProps.length,
      precision: ratio(
        props.filter((p) => (pMatches.get(p.id)?.length ?? 0) > 0).length,
        props.length,
      ),
      recall: ratio(recalledProps.length, gold.propositions.length),
      harmfulSplits: harmfulSplits.map((x) => x.id),
      harmfulMerges: harmfulMerges.map((x) => x.id),
      overgenerated: overgeneratedPropositions.length,
    },
    edges: {
      expected: expectedAssignments.size,
      truePositive: edgeTP,
      falsePositive: falseEdges,
      falseNegative: edgeFN,
      wrongTarget,
      wrongRelation,
      missingMaterial: missingMaterialEdges,
      wronglyAssignedAmbiguous: wronglyAssignedAmbiguous.length,
      precision: edgePrecision,
      recall: edgeRecall,
    },
    taxonomy: {
      confusion,
      correct: taxonomyCorrect,
      assessed: taxonomyAssessed,
      falseEconomic,
      falseEconomicReviewedUnmatched,
      economicPrecision,
      economicRecall,
    },
    normalization: {
      correct: normalizedFieldCorrect,
      assessed: normalizedFieldAssessed,
      materialConstraints: {
        recalled: normalizedConstraints,
        expected: expectedConstraints,
        recall: ratio(normalizedConstraints, expectedConstraints),
        missing: missingMaterialConstraint,
      },
      safety: assessedSafety,
    },
    endToEnd: {
      economicPropositionIdentityRecall: economicRecall,
      economicPropositionPrecision: economicPrecision,
      falseEconomicPropositions: falseEconomic,
      materialConstraintRecall: ratio(
        normalizedConstraints,
        expectedConstraints,
      ),
      materialConstraintDenominator: expectedConstraints,
      crossPropositionLeakage: wrongTarget,
      wrongEvidenceEdges: wrongTarget + wrongRelation,
      missingMaterialEdges,
      inventedValidity: assessedSafety.invented_validity,
      invalidValidityAssociation: assessedSafety.invalid_validity_association,
      inventedNumericTimeEndpoint:
        assessedSafety.invented_numeric_time_endpoint,
      wrongScheduleAssociation: assessedSafety.wrong_schedule_association,
      participationPolarityReversal:
        assessedSafety.participation_polarity_reversal,
      inventedParticipatingIdentity:
        assessedSafety.invented_participating_identity,
      unstatedYearInference: assessedSafety.unstated_year_inference,
      benefitQualifierLoss: assessedSafety.benefit_qualifier_loss,
    },
    requirementTrace: trace,
    findings: earliestFindings,
  };
}

export function aggregateScoresV4(rows: ScoredCaseV4[]) {
  const sum = (f: (row: ScoredCaseV4) => number) =>
    rows.reduce((total, row) => total + f(row), 0);
  const totalCases = rows.length;
  const findings = rows.flatMap((row) => row.findings);
  const safetyKeys = [
    "invented_validity",
    "invalid_validity_association",
    "invented_numeric_time_endpoint",
    "wrong_schedule_association",
    "participation_polarity_reversal",
    "invented_participating_identity",
    "unstated_year_inference",
    "benefit_qualifier_loss",
  ] as const;
  const safety = Object.fromEntries(
    safetyKeys.map((key) => {
      const entries = rows.map((row) => row.normalization.safety[key]);
      const errors = entries.reduce((n, x) => n + x.errors, 0),
        assessed = entries.reduce((n, x) => n + x.assessed, 0),
        unassessed = entries.reduce((n, x) => n + x.unassessed, 0);
      return [
        key,
        {
          errors,
          assessed,
          denominator: assessed,
          unassessed,
          rate: ratio(errors, assessed),
        },
      ];
    }),
  );
  return {
    cases: totalCases,
    malformedByStage: Array.from({ length: 5 }, (_, i) => {
      const count = rows.filter((row) =>
        row.findings.some(
          (f) => f.code === "MALFORMED_OUTPUT" && f.stage === i + 1,
        ),
      ).length;
      return { stage: i + 1, ...ratio(count, totalCases) };
    }),
    materialNodeRecall: ratio(
      sum((row) => row.nodes.materialRecalled),
      sum((row) => row.nodes.materialExpected),
    ),
    propositionRecall: ratio(
      sum((row) => row.propositions.recalled),
      sum((row) => row.propositions.expected),
    ),
    harmfulSplits: sum((row) => row.propositions.harmfulSplits.length),
    harmfulMerges: sum((row) => row.propositions.harmfulMerges.length),
    edgePrecision: ratio(
      sum((row) => row.edges.truePositive),
      sum((row) => row.edges.truePositive + row.edges.falsePositive),
    ),
    edgeRecall: ratio(
      sum((row) => row.edges.truePositive),
      sum((row) => row.edges.expected),
    ),
    edgeWrongTarget: sum((row) => row.edges.wrongTarget),
    edgeWrongRelation: sum((row) => row.edges.wrongRelation),
    edgeMissingMaterial: sum((row) => row.edges.missingMaterial),
    taxonomyAccuracy: ratio(
      sum((row) => row.taxonomy.correct),
      sum((row) => row.taxonomy.assessed),
    ),
    taxonomyConfusion: rows.reduce(
      (matrix, row) => {
        for (const [truth, values] of Object.entries(row.taxonomy.confusion))
          for (const [predicted, count] of Object.entries(values))
            matrix[truth]![predicted] += count;
        return matrix;
      },
      Object.fromEntries(
        TAXONOMY_V4.map((type) => [
          type,
          Object.fromEntries(TAXONOMY_V4.map((predicted) => [predicted, 0])),
        ]),
      ) as Record<string, Record<string, number>>,
    ),
    economicPropositionPrecision: ratio(
      sum((row) => row.taxonomy.economicPrecision.numerator),
      sum((row) => row.taxonomy.economicPrecision.denominator),
    ),
    economicPropositionRecall: ratio(
      sum((row) => row.taxonomy.economicRecall.numerator),
      sum((row) => row.taxonomy.economicRecall.denominator),
    ),
    falseEconomicPropositions: sum((row) => row.taxonomy.falseEconomic),
    normalizedFactAccuracy: ratio(
      sum((row) => row.normalization.correct),
      sum((row) => row.normalization.assessed),
    ),
    materialConstraintRecall: ratio(
      sum((row) => row.normalization.materialConstraints.recalled),
      sum((row) => row.normalization.materialConstraints.expected),
    ),
    safety,
    earliestFailures: Object.fromEntries(
      [...new Set(findings.map((f) => f.code))].map((code) => [
        code,
        findings.filter((f) => f.code === code).length,
      ]),
    ),
  };
}
