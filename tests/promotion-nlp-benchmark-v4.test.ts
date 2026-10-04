import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raw from "./fixtures/promotion-nlp/benchmark-v4.json";
import {
  aggregateScoresV4,
  benchmarkSchemaV4,
  scoreCaseV4,
  type GoldCaseV4,
  type PipelineCaseV4,
} from "../src/ingestion/promotion-nlp/benchmark-v4";

const benchmark = benchmarkSchemaV4.parse(raw);
const get = (part: string) => benchmark.cases.find((c) => c.id.includes(part))!;
const pipelineFor = (gold: GoldCaseV4): PipelineCaseV4 => {
  const evidence = gold.requiredClauses.map((c, i) => ({
    id: `e${i + 1}`,
    quote: c.quote,
    kind: c.kind,
  }));
  const propositions = gold.propositions.map((p) => ({
    id: p.id,
    anchorEvidenceIds: evidence
      .filter((e) => p.acceptableAnchors.some((a) => e.quote.includes(a)))
      .map((e) => e.id),
    propositionTypeHint: p.taxonomy,
  }));
  const edges = gold.requiredClauses.map((c) => ({
    evidenceId: evidence[gold.requiredClauses.indexOf(c)].id,
    propositionIds: c.propositionIds,
    relation: c.relations[0],
  }));
  const eligibility = Object.fromEntries(
    propositions.map((p) => [
      p.id,
      {
        taxonomy: gold.propositions.find((g) => g.id === p.id)!.taxonomy,
        evidenceIds: p.anchorEvidenceIds,
      },
    ]),
  );
  const normalization = Object.fromEntries(
    gold.propositions
      .filter((p) => p.taxonomy === "economic_offer")
      .map((p) => {
        const e = gold.expected[p.id] as Record<string, unknown>;
        const byQuote = (quote: string) =>
          evidence.find((x) => x.quote === quote)?.id ??
          evidence[0]?.id ??
          "missing";
        return [
          p.id,
          {
            merchant: { value: gold.merchantHint, evidenceId: null },
            title: {
              value: p.acceptableAnchors[0] ?? null,
              evidenceId: byQuote(p.acceptableAnchors[0]!),
            },
            benefit: {
              value: p.acceptableAnchors[0] ?? null,
              evidenceId: byQuote(p.acceptableAnchors[0]!),
            },
            startDate: {
              value: typeof e.startDate === "string" ? e.startDate : null,
              evidenceId: null,
            },
            endDate: {
              value: typeof e.endDate === "string" ? e.endDate : null,
              evidenceId: null,
            },
            weekdays: { value: e.weekdays ?? null, evidenceId: null },
            locationScope: { value: e.locationScope ?? null, evidenceId: null },
            timeConstraints: [],
            locationRules: [],
            constraints: [],
          },
        ];
      }),
  );
  return {
    evidence,
    propositions,
    edges,
    eligibility,
    normalization,
  } as PipelineCaseV4;
};

describe("promotion NLP benchmark v4", () => {
  it("preserves all 49 literal source envelopes and validates every required substring", () => {
    const v3 = JSON.parse(
      readFileSync("tests/fixtures/promotion-nlp/benchmark-v3.json", "utf8"),
    ) as {
      cases: {
        id: string;
        sourceText: string;
        sourceReference: unknown;
        merchantHint: string | null;
        titleHint: string | null;
      }[];
    };
    expect(benchmark.cases).toHaveLength(49);
    for (let i = 0; i < 49; i++) {
      expect(benchmark.cases[i]).toMatchObject({
        id: v3.cases[i]!.id,
        sourceText: v3.cases[i]!.sourceText,
        sourceReference: v3.cases[i]!.sourceReference,
        merchantHint: v3.cases[i]!.merchantHint,
        titleHint: v3.cases[i]!.titleHint,
      });
      for (const clause of benchmark.cases[i]!.requiredClauses) {
        expect(benchmark.cases[i]!.sourceText).toContain(clause.quote);
        for (const alternate of clause.alternatives)
          expect(benchmark.cases[i]!.sourceText).toContain(alternate);
      }
    }
    const invalid = structuredClone(raw) as typeof raw;
    invalid.cases[0]!.requiredClauses[0]!.quote += " synthetic";
    expect(benchmarkSchemaV4.safeParse(invalid).success).toBe(false);
  });

  it("keeps the publication taxonomy distinctions and only treats a guaranteed offer as economic", () => {
    const c = get("bfmcsaver");
    expect(c.propositions.find((p) => p.id === "offer")?.taxonomy).toBe(
      "economic_offer",
    );
    expect(c.propositions.find((p) => p.id === "contest")?.taxonomy).toBe(
      "contest_or_chance",
    );
    expect(
      get("veggie-shack").propositions.find((p) => p.id === "contest")
        ?.taxonomy,
    ).toBe("contest_or_chance");
    expect(
      get("collab-partners").propositions.map((p) => p.taxonomy),
    ).toContain("editorial");
    expect(
      get("collab-partners").propositions.find((p) => p.id === "fries")
        ?.taxonomy,
    ).toBe("economic_offer");
  });

  it("does not let contest dates become meal dates and catches a false economic contest label", () => {
    const gold = get("bfmcsaver"),
      pipeline = pipelineFor(gold);
    const meal = pipeline.propositions!.find((p) => p.id === "offer")!;
    const contestDate = pipeline.evidence!.find((e) =>
      e.quote.includes("Contest Submission Period"),
    )!;
    pipeline.edges!.find(
      (e) => e.evidenceId === contestDate.id,
    )!.propositionIds = [meal.id];
    pipeline.eligibility.contest = {
      taxonomy: "economic_offer",
      evidenceIds: [],
    };
    const scored = scoreCaseV4(gold, pipeline);
    expect(
      scored.findings.some(
        (f) => f.code === "EDGE_WRONG_TARGET" && f.propositionId === "contest",
      ),
    ).toBe(true);
    expect(
      scored.findings.some(
        (f) =>
          f.code === "ELIGIBILITY_FALSE_POSITIVE" &&
          f.propositionId === "contest",
      ),
    ).toBe(true);
  });

  it("records distinct Bari Salad time and outlet groups and separates opening-to semantics", () => {
    const gold = get("bari_bari_steak_sg-promotions-2");
    const allDay = gold.requiredClauses.filter((c) =>
      c.propositionIds.includes("all_day"),
    );
    const tea = gold.requiredClauses.filter((c) =>
      c.propositionIds.includes("tea_time"),
    );
    expect(
      allDay.some((c) => c.quote.includes("Tampines 1 and VivoCity")),
    ).toBe(true);
    expect(
      tea.some((c) => c.quote.includes("Junction 8 and Great World")),
    ).toBe(true);
    expect(tea.some((c) => c.quote.includes("2 PM – 5 PM"))).toBe(true);
    const senior = get("bari_bari_steak_sg-promotions-3");
    expect(senior.propositions).toHaveLength(1);
    expect(
      (senior.expected.offer as Record<string, unknown>).timeConstraints,
    ).toContainEqual({ kind: "opening_to", end: "17:00" });
  });

  it("keeps Student Meal propositions distinct, classifies Monday source schedule, and detects wrong edges", () => {
    const student = get("student-meal");
    expect(student.propositions.map((p) => p.id)).toEqual([
      "student_before5",
      "after5",
    ]);
    expect(
      student.requiredClauses.some(
        (c) =>
          c.quote === "Dine-in only" &&
          c.propositionIds.includes("student_before5"),
      ),
    ).toBe(true);
    expect(
      student.requiredClauses.some(
        (c) =>
          c.quote === "Mon-Fri, opening till 5pm" &&
          c.propositionIds.includes("student_before5"),
      ),
    ).toBe(true);
    expect(
      student.propositions
        .find((p) => p.id === "after5")
        ?.acceptableAnchors.some((a) => a.includes("15% OFF")),
    ).toBe(true);
    const local = get("local-faves");
    const monday = local.requiredClauses.find((c) =>
      c.quote.includes("every Monday"),
    )!;
    expect(monday.relations).not.toContain("schedule");
    const p = pipelineFor(local),
      node = p.evidence!.find((e) => e.quote === monday.quote)!;
    p.edges!.find((e) => e.evidenceId === node.id)!.relation = "weekday";
    expect(
      scoreCaseV4(local, p).findings.some(
        (f) => f.code === "EDGE_WRONG_RELATION",
      ),
    ).toBe(true);
  });

  it("attributes Captain takeaway action loss to normalization and distinguishes it from channel", () => {
    const gold = get("captain_kim_sg-captain-kim-delivery"),
      p = pipelineFor(gold);
    const n = p.normalization.offer!;
    const flash = gold.requiredClauses.find(
      (c) => c.quote === "Flash this page",
    )!;
    const flashEvidenceId = p.evidence!.find(
      (e) => e.quote === flash.quote,
    )!.id;
    expect(flash.kind).toBe("redemption_instruction");
    expect(
      gold.requiredClauses.find((c) => c.quote === "Takeaway only")?.kind,
    ).toBe("channel");
    n.constraints = n.constraints.filter(
      (c) => c.evidenceId !== flashEvidenceId,
    );
    const scored = scoreCaseV4(gold, p);
    expect(
      scored.findings.some(
        (f) =>
          f.code === "NORMALIZATION_MISSING" &&
          f.stage === 5 &&
          f.detail === flash.quote,
      ),
    ).toBe(true);
  });

  it("supports multiple equivalent literal anchors without paraphrase", () => {
    const c = get("uper-value-deal");
    const proposition = c.propositions[0]!;
    expect(
      proposition.acceptableAnchors.some((anchor) =>
        c.sourceText.includes(anchor),
      ),
    ).toBe(true);
    const clause = c.requiredClauses.find((x) => x.kind === "economic_claim")!;
    expect(clause.alternatives.every((x) => c.sourceText.includes(x))).toBe(
      true,
    );
    expect(aggregateScoresV4([scoreCaseV4(c, pipelineFor(c))]).cases).toBe(1);
  });

  it("maps arbitrary model proposition IDs and treats shared gold targets as valid", () => {
    const gold = get("bari_bari_steak_sg-promotions-2");
    const pipeline = pipelineFor(gold);
    const idMap = new Map(
      pipeline.propositions!.map((p) => [p.id, `model_${p.id}`]),
    );
    pipeline.propositions = pipeline.propositions!.map((p) => ({
      ...p,
      id: idMap.get(p.id)!,
    }));
    pipeline.edges = pipeline.edges!.map((edge) => ({
      ...edge,
      propositionIds: edge.propositionIds.map((id) => idMap.get(id)!),
    }));
    pipeline.eligibility = Object.fromEntries(
      Object.entries(pipeline.eligibility).map(([id, value]) => [
        idMap.get(id)!,
        value,
      ]),
    );
    const sharedId = pipeline.evidence!.find(
      (node) => node.quote === "enjoy 23% savings",
    )!.id;
    const sharedEdge = pipeline.edges!.find(
      (edge) => edge.evidenceId === sharedId,
    )!;
    expect(sharedEdge.propositionIds).toHaveLength(2);
    const result = scoreCaseV4(gold, pipeline);
    expect(result.edges.wrongTarget).toBe(0);
    expect(result.edges.truePositive).toBe(result.edges.expected);
  });

  it("requires constraint text and attributes in addition to the matching evidence ID", () => {
    const gold = get("captain_kim_sg-captain-kim-delivery");
    const pipeline = pipelineFor(gold);
    const flashId = pipeline.evidence!.find(
      (node) => node.quote === "Flash this page",
    )!.id;
    pipeline.normalization!.offer!.constraints = [
      {
        text: "Takeaway only",
        attributes: ["redemption_channel"],
        evidenceId: flashId,
      },
    ];
    const result = scoreCaseV4(gold, pipeline);
    expect(result.normalization.materialConstraints.missing).toBeGreaterThan(0);
  });

  it("keeps upstream nulls unassessed and reports the full economic denominator", () => {
    const gold = get("bfmcsaver");
    const result = scoreCaseV4(gold, {
      evidence: null,
      propositions: null,
      edges: null,
      eligibility: {},
      normalization: {},
    });
    expect(result.propositions.recall.denominator).toBe(
      gold.propositions.length,
    );
    expect(
      result.normalization.safety.invented_validity.unassessed,
    ).toBeGreaterThan(0);
    expect(
      benchmark.cases
        .flatMap((item) => item.propositions)
        .filter((item) => item.taxonomy === "economic_offer"),
    ).toHaveLength(43);
  });
});
