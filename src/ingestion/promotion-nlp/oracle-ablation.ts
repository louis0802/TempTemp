import { createHash } from "node:crypto";
import {
  benchmarkSchemaV4,
  type GoldCaseV4,
  type PipelineCaseV4,
} from "./benchmark-v4";
import { deterministicSpans } from "./deterministic-spans";
import { stagePromptV4 } from "./prompt-v4";
import {
  schemasV4,
  type EvidenceV4,
  type PropositionV4,
  type EdgeV4,
  type NormalizationV4,
  type StageV4,
} from "./schema-v4";
import { validateStageV4 } from "./validator-v4";

export { benchmarkSchemaV4 };
export const ARMS = ["a", "b", "c", "d", "e"] as const;
export type Arm = (typeof ARMS)[number];
export const CONFIG = {
  model: "gpt-6-luna",
  reasoningEffort: "medium",
  forkContext: false,
  concurrency: 4,
  retries: 0,
  fallback: null,
} as const;
export const THRESHOLDS = {
  aRecall: 0.95,
  aEconomicMerges: 0,
  bRecall: 0.95,
  bWrongTargets: 0,
  cRecall: 0.95,
  cFalseEconomic: 0,
  dRecall: 0.95,
  dContracts: 0.9,
  dUnsupported: 0,
  dInventedEndpoints: 0,
  dPolarity: 0,
  eGap: 0.05,
} as const;
export const sha = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
export const serialize = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
export const ratio = (n: number, d: number) => ({
  numerator: n,
  denominator: d,
  value: d ? n / d : null,
});
const opaque = (prefix: string, i: number) =>
  `${prefix}${String(i + 1).padStart(3, "0")}`;
type Clause = GoldCaseV4["requiredClauses"][number];
type Expected = GoldCaseV4["expected"][string];
export type Projection = {
  caseId: string;
  evidence: EvidenceV4[];
  propositions: PropositionV4[];
  edges: EdgeV4[];
  privateMapping: {
    evidence: Record<string, string>;
    propositions: Record<string, string>;
  };
  taxonomy: Record<string, string>;
  annotatedFacts: Record<string, Expected>;
};

export function projectOracle(c: GoldCaseV4, caseIndex: number): Projection {
  const evidence: EvidenceV4[] = c.requiredClauses.map((cl, i) => ({
    id: opaque("e", i),
    quote: cl.quote,
    kind: cl.kind,
  }));
  // Preserve original source order, keeping IDs stable in reviewed annotation order.
  const evidenceMap = Object.fromEntries(
    c.requiredClauses.map((cl, i) => [opaque("e", i), cl.id]),
  );
  const propMap = Object.fromEntries(
    c.propositions.map((p, i) => [opaque("p", i), p.id]),
  );
  const toOpaque = (id: string) =>
    Object.keys(propMap).find((k) => propMap[k] === id)!;
  const propositions = c.propositions.map((p, i) => {
    let anchor = evidence.find((e) =>
      p.acceptableAnchors.some((a) => e.quote.includes(a)),
    );
    if (!anchor) {
      anchor = {
        id: opaque("e", evidence.length),
        quote: p.acceptableAnchors[0],
        kind: "other",
      };
      evidence.push(anchor);
    }
    return {
      id: opaque("p", i),
      anchorEvidenceIds: [anchor.id],
      propositionTypeHint: "other" as const,
    };
  });
  const edges: EdgeV4[] = evidence.map((e) => {
    const cl = c.requiredClauses.find((cl) => cl.id === evidenceMap[e.id]);
    return {
      evidenceId: e.id,
      propositionIds: cl
        ? cl.propositionIds.map(toOpaque)
        : propositions
            .filter((p) => p.anchorEvidenceIds.includes(e.id))
            .map((p) => p.id),
      relation: cl?.relations[0] ?? "context",
    };
  });
  evidence.sort(
    (a, b) =>
      c.sourceText.indexOf(a.quote) - c.sourceText.indexOf(b.quote) ||
      a.id.localeCompare(b.id),
  );
  if (evidence.some((e) => !c.sourceText.includes(e.quote)))
    throw new Error("oracle_not_literal");
  return {
    caseId: opaque("s", caseIndex),
    evidence,
    propositions,
    edges,
    privateMapping: { evidence: evidenceMap, propositions: propMap },
    taxonomy: Object.fromEntries(
      c.propositions.map((p) => [toOpaque(p.id), p.taxonomy]),
    ),
    annotatedFacts: Object.fromEntries(
      c.propositions.map((p) => [toOpaque(p.id), c.expected[p.id]]),
    ),
  };
}

export function localGraph(p: Projection, prop: PropositionV4) {
  const edges = p.edges
    .filter((e) => e.propositionIds.includes(prop.id))
    .map((e) => ({ ...e, propositionIds: [prop.id] }));
  const ids = new Set([
    ...prop.anchorEvidenceIds,
    ...edges.map((e) => e.evidenceId),
  ]);
  return {
    proposition: prop,
    evidence: p.evidence.filter((e) => ids.has(e.id)),
    edges,
  };
}
export type Task = {
  taskId: string;
  caseIndex: number;
  caseId: string;
  propositionId: string | null;
  stage: StageV4;
  input: Record<string, unknown>;
  prompt: string;
  inputSha256: string;
  promptSha256: string;
};
export function buildTasks(cases: GoldCaseV4[], arm: Arm): Task[] {
  return cases.flatMap((c, i) => {
    const p = projectOracle(c, i);
    const hints = {
      caseId: p.caseId,
      merchantHint: c.merchantHint,
      titleHint: c.titleHint,
    };
    const stage: StageV4 =
      arm === "a" || arm === "e" ? 2 : arm === "b" ? 3 : arm === "c" ? 4 : 5;
    const inputs: {
      input: Record<string, unknown>;
      propositionId: string | null;
    }[] =
      arm === "a" || arm === "e"
        ? [
            {
              input: {
                ...hints,
                evidence:
                  arm === "a" ? p.evidence : deterministicSpans(c.sourceText),
              },
              propositionId: null,
            },
          ]
        : arm === "b"
          ? [
              {
                input: {
                  ...hints,
                  evidence: p.evidence,
                  propositions: p.propositions,
                },
                propositionId: null,
              },
            ]
          : p.propositions
              .filter(
                (prop) =>
                  arm !== "d" || p.taxonomy[prop.id] === "economic_offer",
              )
              .map((prop) => ({
                input: {
                  ...hints,
                  ...localGraph(p, prop),
                  ...(arm === "d" ? { taxonomy: "economic_offer" } : {}),
                },
                propositionId: prop.id,
              }));
    return inputs.map(({ input, propositionId }) => {
      const prompt = stagePromptV4(stage, input);
      return {
        taskId: `${p.caseId}${propositionId ? `-${propositionId}` : ""}`,
        caseIndex: i,
        caseId: p.caseId,
        propositionId,
        stage,
        input,
        prompt,
        inputSha256: sha(JSON.stringify(input)),
        promptSha256: sha(prompt),
      };
    });
  });
}

// Canonical identity wins before colliding literal alternatives. Alternatives never create transitive aliases.
export function clauseNodes(c: GoldCaseV4, evidence: EvidenceV4[], cl: Clause) {
  const exact = evidence.filter((e) => e.quote === cl.quote);
  if (exact.length) return exact;
  return evidence.filter((e) => {
    if (e.quote.includes(cl.quote)) return true;
    if (
      c.requiredClauses.some(
        (other) => other.id !== cl.id && e.quote.includes(other.quote),
      )
    )
      return false;
    return cl.alternatives.some((a) => e.quote.includes(a));
  });
}
const trimBoundary = (s: string) => s.replace(/[.!?]+$/, "");
export function identity(
  c: GoldCaseV4,
  evidence: EvidenceV4[],
  props: PropositionV4[],
  known?: Record<string, string>,
) {
  const match = Object.fromEntries(
    props.map((p) => [
      p.id,
      known?.[p.id]
        ? [known[p.id]]
        : c.propositions
            .filter((g) =>
              p.anchorEvidenceIds.some((id) => {
                const e = evidence.find((e) => e.id === id);
                return (
                  !!e &&
                  g.acceptableAnchors.some(
                    (anchor) =>
                      e.quote.includes(anchor) ||
                      e.quote.includes(trimBoundary(anchor)),
                  )
                );
              }),
            )
            .map((g) => g.id),
    ]),
  );
  const independent = Object.fromEntries(
    c.propositions.map((g) => {
      const found = props.filter((p) => match[p.id].includes(g.id));
      return [
        g.id,
        found.length === 1 && match[found[0].id].length === 1
          ? found[0].id
          : null,
      ];
    }),
  );
  const merges = props.filter((p) => match[p.id].length > 1);
  const splits = c.propositions.filter(
    (g) => props.filter((p) => match[p.id].includes(g.id)).length > 1,
  );
  const recalled = c.propositions.filter((g) => independent[g.id]);
  return {
    match,
    independent,
    recall: ratio(recalled.length, c.propositions.length),
    precision: ratio(
      props.filter((p) => match[p.id].length === 1).length,
      props.length,
    ),
    economicRecall: ratio(
      recalled.filter((p) => p.taxonomy === "economic_offer").length,
      c.propositions.filter((p) => p.taxonomy === "economic_offer").length,
    ),
    nonEconomicRecall: ratio(
      recalled.filter((p) => p.taxonomy !== "economic_offer").length,
      c.propositions.filter((p) => p.taxonomy !== "economic_offer").length,
    ),
    harmfulMerges: merges.length,
    harmfulEconomicMerges: merges.filter((p) =>
      match[p.id].some(
        (id) =>
          c.propositions.find((g) => g.id === id)?.taxonomy ===
          "economic_offer",
      ),
    ).length,
    harmfulSplits: splits.length,
    unmatched: props.filter((p) => !match[p.id].length).map((p) => p.id),
    matches: match,
  };
}
export function edgeScore(
  c: GoldCaseV4,
  evidence: EvidenceV4[],
  props: PropositionV4[],
  edges: EdgeV4[],
  known?: Record<string, string>,
) {
  const ids = identity(c, evidence, props, known);
  const rows = c.requiredClauses.map((cl) => {
    const nodes = clauseNodes(c, evidence, cl);
    const linked = edges.filter((e) =>
      nodes.some((n) => n.id === e.evidenceId),
    );
    const expected = cl.propositionIds.length ? cl.propositionIds : [""];
    const predicted = linked.flatMap((e) =>
      (e.propositionIds.length
        ? e.propositionIds.flatMap((id) =>
            ids.match[id]?.length === 1 ? ids.match[id] : [`unmatched:${id}`],
          )
        : [""]
      ).map((target) => ({ target, relation: e.relation })),
    );
    const ok = expected.filter((target) =>
      predicted.some(
        (e) => e.target === target && cl.relations.includes(e.relation),
      ),
    );
    const wrongTargets = [
      ...new Set(
        predicted
          .filter((e) => !expected.includes(e.target))
          .map((e) => e.target),
      ),
    ];
    const wrongRelations = [
      ...new Set(
        predicted
          .filter(
            (e) =>
              expected.includes(e.target) && !cl.relations.includes(e.relation),
          )
          .map((e) => `${e.target}:${e.relation}`),
      ),
    ];
    return {
      clauseId: cl.id,
      quote: cl.quote,
      material: cl.material,
      expected,
      correct: ok,
      missing: expected.filter((t) => !ok.includes(t)),
      wrongTargets,
      wrongRelations,
      shared: cl.propositionIds.length > 1,
    };
  });
  const material = rows.filter((r) => r.material);
  const good = rows.reduce((n, r) => n + r.correct.length, 0),
    bad = rows.reduce(
      (n, r) => n + r.wrongTargets.length + r.wrongRelations.length,
      0,
    );
  return {
    recall: ratio(
      good,
      rows.reduce((n, r) => n + r.expected.length, 0),
    ),
    materialRecall: ratio(
      material.reduce((n, r) => n + r.correct.length, 0),
      material.reduce((n, r) => n + r.expected.length, 0),
    ),
    criticalPrecision: ratio(
      material.reduce((n, r) => n + r.correct.length, 0),
      material.reduce(
        (n, r) =>
          n +
          r.correct.length +
          r.wrongTargets.length +
          r.wrongRelations.length,
        0,
      ),
    ),
    precision: ratio(good, good + bad),
    wrongTargets: rows.reduce((n, r) => n + r.wrongTargets.length, 0),
    criticalWrongTargets: material.reduce(
      (n, r) => n + r.wrongTargets.filter((t) => t !== "").length,
      0,
    ),
    wrongRelations: rows.reduce((n, r) => n + r.wrongRelations.length, 0),
    missingMaterial: material.reduce((n, r) => n + r.missing.length, 0),
    sharedRecall: ratio(
      rows.filter((r) => r.shared).reduce((n, r) => n + r.correct.length, 0),
      rows.filter((r) => r.shared).reduce((n, r) => n + r.expected.length, 0),
    ),
    rows,
  };
}
const canon = (x: unknown): string => {
  if (Array.isArray(x)) return JSON.stringify(x.map(canon).sort());
  if (x && typeof x === "object")
    return JSON.stringify(
      Object.entries(x)
        .filter(([k]) => k !== "evidenceId")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canon(v)]),
    );
  return JSON.stringify(x);
};
export function constraintMatches(
  req: Expected["constraints"][number],
  n: NormalizationV4,
  evidence: EvidenceV4[],
) {
  const literals = [req.text, ...(req.alternatives ?? [])];
  const items = n.constraints.filter(
    (item) =>
      literals.some(
        (t) =>
          item.text.includes(t) || trimBoundary(item.text) === trimBoundary(t),
      ) &&
      evidence.some(
        (e) => e.id === item.evidenceId && e.quote.includes(item.text),
      ),
  );
  return req.attributes.every((a) =>
    items.some((item) => item.attributes.includes(a)),
  );
}
export function normalizationScore(
  c: GoldCaseV4,
  pid: string,
  value: NormalizationV4 | null,
  evidence: EvidenceV4[],
  annotated?: Expected,
) {
  const expected = c.expected[pid];
  const constraints = expected.constraints.map((req, i) => ({
    index: i,
    text: req.text,
    attributes: req.attributes,
    recalled: annotated
      ? canon(annotated.constraints[i]) === canon(req)
      : !!value && constraintMatches(req, value, evidence),
  }));
  const fields = [
    "startDate",
    "endDate",
    "weekdays",
    "timeConstraints",
    "locationScope",
  ] as const;
  const facts = fields.map((f) => {
    const actual = annotated
      ? annotated[f]
      : !value
        ? undefined
        : f === "timeConstraints"
          ? value[f]
          : value[f].value;
    return {
      field: f,
      correct: canon(actual) === canon(expected[f]),
      expected: expected[f],
      actual,
    };
  });
  const locations = (["participating", "excluded"] as const).flatMap((role) =>
    expected[role].map((l) => ({
      role,
      identity: l.identity,
      correct: annotated
        ? annotated[role].some((a) => a.identity === l.identity)
        : !!value &&
          value.locationRules.some(
            (r) =>
              r.role ===
                (role === "participating" ? "participating" : "excluded") &&
              l.labels.some((label) => r.names.includes(label)) &&
              evidence.some(
                (e) =>
                  e.id === r.evidenceId &&
                  r.names.every((name) => e.quote.includes(name)),
              ),
          ),
    })),
  );
  const qualifiers = expected.benefitQualifiers.map((q) => ({
    ...q,
    correct: annotated
      ? annotated.benefitQualifiers.some((a) => canon(a) === canon(q))
      : !!value &&
        (() => {
          const text = [
            value.benefit.value ?? "",
            ...value.constraints.map((c) => c.text),
          ]
            .join(" ")
            .toLowerCase();
          return (
            !text.includes(q.anchor.toLowerCase()) ||
            q.required.every((r) => text.includes(r.toLowerCase()))
          );
        })(),
  }));
  const dateInventions = !value
    ? 0
    : ["startDate", "endDate"].filter((f) => {
        const field = value[f as "startDate" | "endDate"];
        return (
          field.value !== null &&
          (!expected[f as "startDate" | "endDate"] ||
            !evidence.some(
              (e) =>
                e.id === field.evidenceId &&
                e.quote.includes(field.value!.slice(0, 4)),
            ))
        );
      }).length;
  const wrongTimes = !value
    ? 0
    : value.timeConstraints.filter(
        (t) => !expected.timeConstraints.some((e) => canon(e) === canon(t)),
      ).length;
  const polarityErrors = !value
    ? 0
    : value.locationRules.reduce(
        (n, r) =>
          n +
          r.names.filter((name) =>
            expected[
              r.role === "participating" ? "excluded" : "participating"
            ].some((l) => l.labels.includes(name)),
          ).length,
        0,
      );
  const unsupportedText = !value
    ? []
    : ["merchant", "benefit"].filter((f) => {
        const field = value[f as "merchant" | "benefit"];
        return (
          field.value !== null &&
          !evidence.some(
            (e) => e.id === field.evidenceId && e.quote.includes(field.value!),
          )
        );
      });
  const scheduleScopeErrors = !value
    ? 0
    : ["weekdays", "locationScope"].filter((f) => {
        const field = value[f as "weekdays" | "locationScope"];
        return (
          field.value !== null &&
          canon(field.value) !==
            canon(expected[f as "weekdays" | "locationScope"])
        );
      }).length;
  const unsupportedLiteralRecords = !value
    ? 0
    : value.constraints.filter(
        (item) =>
          !evidence.some(
            (e) => e.id === item.evidenceId && e.quote.includes(item.text),
          ),
      ).length +
      value.locationRules.filter(
        (rule) =>
          !evidence.some(
            (e) =>
              e.id === rule.evidenceId &&
              rule.names.every((name) => e.quote.includes(name)),
          ),
      ).length;
  const missingQualifiers = qualifiers.filter((q) => !q.correct).length;
  // Additional literal constraints/location labels are unannotated, not automatically false.
  const unannotated = !value
    ? []
    : value.constraints
        .filter(
          (item) =>
            !expected.constraints.some((req) =>
              [req.text, ...(req.alternatives ?? [])].some(
                (t) =>
                  item.text.includes(t) ||
                  trimBoundary(t) === trimBoundary(item.text),
              ),
            ),
        )
        .map((item) => item.text);
  return {
    facts,
    locations,
    qualifiers,
    constraints,
    factAccuracy: ratio(
      facts.filter((f) => f.correct).length +
        locations.filter((l) => l.correct).length +
        qualifiers.filter((q) => q.correct).length,
      facts.length + locations.length + qualifiers.length,
    ),
    materialRecall: ratio(
      constraints.filter((r) => r.recalled).length,
      constraints.length,
    ),
    dateInventions,
    timeInventions: wrongTimes,
    polarityErrors,
    unsupportedCritical:
      dateInventions +
      wrongTimes +
      polarityErrors +
      unsupportedText.length +
      missingQualifiers +
      scheduleScopeErrors +
      unsupportedLiteralRecords,
    unsupportedText,
    scheduleScopeErrors,
    unsupportedLiteralRecords,
    missingQualifiers,
    unannotated,
  };
}

export function oracleControl(cases: GoldCaseV4[]) {
  const rows = cases.map((c, i) => {
    const p = projectOracle(c, i),
      identityScore = identity(
        c,
        p.evidence,
        p.propositions,
        p.privateMapping.propositions,
      ),
      edge = edgeScore(
        c,
        p.evidence,
        p.propositions,
        p.edges,
        p.privateMapping.propositions,
      );
    const norms = c.propositions
      .filter((g) => g.taxonomy === "economic_offer")
      .map((g) =>
        normalizationScore(c, g.id, null, p.evidence, c.expected[g.id]),
      );
    return {
      caseId: c.id,
      clauses: ratio(
        c.requiredClauses.filter((cl) => clauseNodes(c, p.evidence, cl).length)
          .length,
        c.requiredClauses.length,
      ),
      identity: identityScore.recall,
      edges: edge.recall,
      edgePrecision: edge.precision,
      taxonomy: ratio(
        p.propositions.filter(
          (prop) =>
            p.taxonomy[prop.id] ===
            c.propositions.find(
              (g) => g.id === p.privateMapping.propositions[prop.id],
            )!.taxonomy,
        ).length,
        p.propositions.length,
      ),
      normalization: ratio(
        norms.reduce((n, r) => n + r.factAccuracy.numerator, 0),
        norms.reduce((n, r) => n + r.factAccuracy.denominator, 0),
      ),
      constraints: ratio(
        norms.reduce((n, r) => n + r.materialRecall.numerator, 0),
        norms.reduce((n, r) => n + r.materialRecall.denominator, 0),
      ),
    };
  });
  const metrics = Object.fromEntries(
    [
      "clauses",
      "identity",
      "edges",
      "edgePrecision",
      "taxonomy",
      "normalization",
      "constraints",
    ].map((key) => {
      const values = rows.map((r) => r[key as "clauses"]);
      return [
        key,
        ratio(
          values.reduce((n, r) => n + r.numerator, 0),
          values.reduce((n, r) => n + r.denominator, 0),
        ),
      ];
    }),
  );
  return {
    description:
      "reviewed benchmark oracle; annotated normalization representation only",
    perfect: Object.values(metrics).every((r) => r.value === 1),
    metrics,
    rows,
  };
}
export function spanCoverage(cases: GoldCaseV4[]): {
  totalSpans: number;
  maxSpans: number;
  literal: ReturnType<typeof ratio>;
  material: ReturnType<typeof ratio>;
  anchors: ReturnType<typeof ratio>;
  rows: {
    caseId: string;
    spans: number;
    literal: ReturnType<typeof ratio>;
    material: ReturnType<typeof ratio>;
    anchors: ReturnType<typeof ratio>;
    missing: string[];
  }[];
} {
  const rows = cases.map((c) => {
    const evidence = deterministicSpans(c.sourceText);
    const covered = (cl: Clause) =>
      [cl.quote, ...cl.alternatives].some((q) =>
        evidence.some((e) => e.quote.includes(q)),
      );
    return {
      caseId: c.id,
      spans: evidence.length,
      literal: ratio(
        c.requiredClauses.filter(covered).length,
        c.requiredClauses.length,
      ),
      material: ratio(
        c.requiredClauses.filter((cl) => cl.material && covered(cl)).length,
        c.requiredClauses.filter((cl) => cl.material).length,
      ),
      anchors: ratio(
        c.propositions.filter((p) =>
          p.acceptableAnchors.some((a) =>
            evidence.some((e) => e.quote.includes(a)),
          ),
        ).length,
        c.propositions.length,
      ),
      missing: c.requiredClauses
        .filter((cl) => !covered(cl))
        .map((cl) => cl.id),
    };
  });
  return {
    totalSpans: rows.reduce((n, r) => n + r.spans, 0),
    maxSpans: Math.max(...rows.map((r) => r.spans)),
    literal: ratio(
      rows.reduce((n, r) => n + r.literal.numerator, 0),
      rows.reduce((n, r) => n + r.literal.denominator, 0),
    ),
    material: ratio(
      rows.reduce((n, r) => n + r.material.numerator, 0),
      rows.reduce((n, r) => n + r.material.denominator, 0),
    ),
    anchors: ratio(
      rows.reduce((n, r) => n + r.anchors.numerator, 0),
      rows.reduce((n, r) => n + r.anchors.denominator, 0),
    ),
    rows,
  };
}
export const LOSS = [
  "STAGE1_EVIDENCE_LOSS",
  "STAGE2_IDENTITY_LOSS",
  "STAGE3_OWNERSHIP_LOSS",
  "STAGE4_ELIGIBILITY_LOSS",
  "STAGE5_NORMALIZATION_LOSS",
  "SURVIVES",
] as const;
export function counterfactualCeilings(
  cases: GoldCaseV4[],
  pipelines: PipelineCaseV4[],
) {
  const economic: {
      caseId: string;
      propositionId: string;
      survival: boolean[];
      earliest: string;
    }[] = [],
    constraints: {
      caseId: string;
      propositionId: string;
      index: number;
      text: string;
      survival: boolean[];
      earliest: string;
    }[] = [];
  cases.forEach((c, i) => {
    const pipe = pipelines[i],
      evidence = pipe.evidence ?? [],
      props = pipe.propositions ?? [],
      edges = pipe.edges ?? [],
      ids = identity(c, evidence, props);
    for (const g of c.propositions) {
      if (g.taxonomy !== "economic_offer") continue;
      const m = ids.independent[g.id];
      const anchorNodes = evidence.filter((e) =>
        g.acceptableAnchors.some(
          (a) => e.quote.includes(a) || e.quote.includes(trimBoundary(a)),
        ),
      );
      const s1 = anchorNodes.length > 0,
        s2 = s1 && !!m,
        s3 =
          s2 &&
          edges.some(
            (e) =>
              e.propositionIds.includes(m!) &&
              anchorNodes.some((n) => n.id === e.evidenceId),
          ),
        s4 = s3 && pipe.eligibility[m!]?.taxonomy === "economic_offer";
      const n = m ? pipe.normalization[m] : null;
      const scored = normalizationScore(c, g.id, n ?? null, evidence);
      const s5 =
        s4 &&
        !!n &&
        scored.factAccuracy.value === 1 &&
        (scored.materialRecall.value === 1 ||
          scored.materialRecall.denominator === 0) &&
        scored.unsupportedCritical === 0;
      const survival = [s1, s2, s3, s4, s5];
      economic.push({
        caseId: c.id,
        propositionId: g.id,
        survival,
        earliest:
          LOSS[
            survival.findIndex((s) => !s) < 0
              ? 5
              : survival.findIndex((s) => !s)
          ],
      });
    }
    for (const g of c.propositions)
      for (const [index, req] of c.expected[g.id].constraints.entries()) {
        const cl =
          c.requiredClauses.find(
            (cl) => cl.quote === req.evidenceQuote || cl.quote === req.text,
          ) ??
          c.requiredClauses.find(
            (cl) =>
              cl.propositionIds.includes(g.id) && req.text.includes(cl.quote),
          );
        const nodes = cl
          ? clauseNodes(c, evidence, cl)
          : evidence.filter((e) => e.quote.includes(req.text));
        const m = ids.independent[g.id],
          s1 = nodes.length > 0,
          s2 = s1 && !!m,
          s3 =
            s2 &&
            edges.some(
              (e) =>
                nodes.some((n) => n.id === e.evidenceId) &&
                e.propositionIds.includes(m!) &&
                (!cl || cl.relations.includes(e.relation)),
            ),
          s4 =
            s3 &&
            (g.taxonomy !== "economic_offer" ||
              pipe.eligibility[m!]?.taxonomy === "economic_offer"),
          n = m ? pipe.normalization[m] : null,
          s5 = s4 && !!n && constraintMatches(req, n, evidence);
        const survival = [s1, s2, s3, s4, s5];
        constraints.push({
          caseId: c.id,
          propositionId: g.id,
          index,
          text: req.text,
          survival,
          earliest:
            LOSS[
              survival.findIndex((s) => !s) < 0
                ? 5
                : survival.findIndex((s) => !s)
            ],
        });
      }
  });
  return {
    basis:
      "sealed V4 + reviewed benchmark oracle; optimistic recoverability of annotated identities/conditions, not full pipeline accuracy",
    ceilings: [0, 1, 2, 3].map((i) => ({
      boundary: `C${i + 1}`,
      economic: ratio(
        economic.filter((r) => r.survival[i]).length,
        economic.length,
      ),
      material: ratio(
        constraints.filter((r) => r.survival[i]).length,
        constraints.length,
      ),
    })),
    distribution: {
      economic: Object.fromEntries(
        LOSS.map((l) => [l, economic.filter((r) => r.earliest === l).length]),
      ),
      constraints: Object.fromEntries(
        LOSS.map((l) => [
          l,
          constraints.filter((r) => r.earliest === l).length,
        ]),
      ),
    },
    economic,
    constraints,
  };
}
export function parseTask(task: Task, raw: string | null) {
  if (raw === null)
    return {
      valid: false,
      data: null,
      issues: ["missing_response"],
      schemaValid: false,
    };
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return {
      valid: false,
      data: null,
      issues: ["malformed_json"],
      schemaValid: false,
    };
  }
  const parsed = schemasV4[task.stage].safeParse(v);
  if (!parsed.success)
    return {
      valid: false,
      data: null,
      issues: parsed.error.issues.map(
        (i) => `schema:${i.path.join(".")}:${i.message}`,
      ),
      schemaValid: false,
    };
  const result = validateStageV4(task.stage, v, {
    evidence: task.input.evidence as EvidenceV4[],
    propositions: (task.input.propositions ??
      (task.input.proposition
        ? [task.input.proposition]
        : [])) as PropositionV4[],
    edges: task.input.edges as EdgeV4[],
    taxonomy: task.input.taxonomy as string,
  });
  return { ...result, schemaValid: true, schemaData: parsed.data };
}

export type V4ReviewedAudit = {
  cases: {
    caseId: string;
    reviewedIdentityMap: Record<string, string[]>;
    independentEconomicRecovered: string[];
    sourceTextSha256: string;
  }[];
  taxonomyUnits: {
    caseId: string;
    propositionId: string;
    goldIds: string[];
    expectedLocalTaxonomy: string;
    actualTaxonomy: string;
  }[];
  materialConstraints: {
    caseId: string;
    goldPropositionId: string;
    quote: string;
    nodeCaptured: boolean;
    edgeSurvived: boolean;
    requiredFacetsSurvived: boolean;
    earliestStage: number | null;
  }[];
  harmlessEconomicVariants: string[];
};
/** Preserve the prior explicit source review as an independently labelled optimistic ceiling. */
export function reviewedV4Ceilings(
  cases: GoldCaseV4[],
  pipelines: PipelineCaseV4[],
  review: V4ReviewedAudit,
) {
  const strict = counterfactualCeilings(cases, pipelines);
  const economic = cases.flatMap((c, i) => {
    const r = review.cases.find((r) => r.caseId === c.id)!;
    if (!r || r.sourceTextSha256 !== sha(c.sourceText))
      throw new Error("review_source_mismatch");
    const pipe = pipelines[i],
      evidence = pipe.evidence ?? [],
      props = pipe.propositions ?? [];
    return c.propositions
      .filter((g) => g.taxonomy === "economic_offer")
      .map((g) => {
        const models = props.filter((p) =>
          r.reviewedIdentityMap[p.id]?.includes(g.id),
        );
        const independent = models.filter(
          (p) => r.reviewedIdentityMap[p.id].length === 1,
        );
        const s1 =
          evidence.some((e) =>
            g.acceptableAnchors.some((a) => e.quote.includes(trimBoundary(a))),
          ) ||
          models.some((p) =>
            p.anchorEvidenceIds.some((id) => evidence.some((e) => e.id === id)),
          );
        const s2 =
          s1 &&
          independent.length > 0 &&
          (independent.length === 1 ||
            review.harmlessEconomicVariants.includes(c.id));
        const local = review.taxonomyUnits.filter(
          (u) =>
            u.caseId === c.id &&
            independent.some((p) => p.id === u.propositionId),
        );
        const s3 =
          s2 && local.some((u) => u.expectedLocalTaxonomy === "economic_offer");
        const s4 =
          s3 && local.some((u) => u.actualTaxonomy === "economic_offer");
        const s5 =
          s4 &&
          independent.some((p) => {
            const n = pipe.normalization[p.id];
            if (!n) return false;
            const score = normalizationScore(c, g.id, n, evidence);
            return (
              score.factAccuracy.value === 1 &&
              (score.materialRecall.value === 1 ||
                score.materialRecall.denominator === 0) &&
              score.unsupportedCritical === 0
            );
          });
        const survival = [s1, s2, s3, s4, s5],
          first = survival.findIndex((s) => !s);
        return {
          caseId: c.id,
          propositionId: g.id,
          survival,
          earliest: LOSS[first < 0 ? 5 : first],
          modelIds: models.map((p) => p.id),
        };
      });
  });
  const constraints = review.materialConstraints.map((r, index) => {
    const survival = [1, 2, 3, 4, 5].map(
      (s) => r.earliestStage === null || r.earliestStage > s,
    );
    return {
      caseId: r.caseId,
      propositionId: r.goldPropositionId,
      index,
      text: r.quote,
      survival,
      earliest: LOSS[r.earliestStage === null ? 5 : r.earliestStage - 1],
    };
  });
  if (economic.length !== 43 || constraints.length !== 228)
    throw new Error("review_denominator_mismatch");
  return {
    basis:
      "sealed V4 plus existing source-review adjudications, benchmark-relative optimistic ceiling; prior condition facet audit is an explicitly labelled upper bound, not objective truth",
    ceilings: [0, 1, 2, 3].map((i) => ({
      boundary: `C${i + 1}`,
      economic: ratio(economic.filter((r) => r.survival[i]).length, 43),
      material: ratio(constraints.filter((r) => r.survival[i]).length, 228),
    })),
    distribution: {
      economic: Object.fromEntries(
        LOSS.map((l) => [l, economic.filter((r) => r.earliest === l).length]),
      ),
      constraints: Object.fromEntries(
        LOSS.map((l) => [
          l,
          constraints.filter((r) => r.earliest === l).length,
        ]),
      ),
    },
    economic,
    constraints,
    literalControlCeilings: strict,
  };
}
