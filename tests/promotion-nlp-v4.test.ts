import { describe, expect, it } from "vitest";
import {
  ATTRIBUTES_V4,
  EVIDENCE_KINDS_V4,
  RELATIONS_V4,
  TAXONOMY_V4,
  TYPE_HINTS_V4,
  type EvidenceV4,
  type PropositionV4,
  emptyNormalizationV4,
  schemasV4,
} from "../src/ingestion/promotion-nlp/schema-v4";
import {
  PROMPTS_V4,
  stagePromptV4,
} from "../src/ingestion/promotion-nlp/prompt-v4";
import { validateStageV4 } from "../src/ingestion/promotion-nlp/validator-v4";

const evidence = (
  id: string,
  quote: string,
  kind: EvidenceV4["kind"] = "other",
): EvidenceV4 => ({
  id,
  quote,
  kind,
});
const prop = (id: string, ...anchorEvidenceIds: string[]): PropositionV4 => ({
  id,
  anchorEvidenceIds,
  propositionTypeHint: "offer",
});
const edge = (
  evidenceId: string,
  propositionIds: string[],
  relation = "constraint",
) => ({
  evidenceId,
  propositionIds,
  relation,
});
const valid = (
  stage: 1 | 2 | 3 | 4 | 5,
  value: unknown,
  ctx: Parameters<typeof validateStageV4>[2] = {},
) => validateStageV4(stage, value, ctx);

describe("v4 stage 1 immutable atomic evidence", () => {
  const source =
    "Flash this page to enjoy 20% OFF All Regular Items - Takeaway only!";

  it("accepts exact contiguous clauses as separate evidence nodes", () => {
    const nodes = [
      evidence("e1", "Flash this page", "redemption_instruction"),
      evidence("e2", "20% OFF All Regular Items", "economic_claim"),
      evidence("e3", "Takeaway only", "channel"),
    ];
    expect(
      valid(1, { evidence: nodes }, { SOURCE_TEXT: source }),
    ).toMatchObject({
      valid: true,
      data: { evidence: nodes },
    });
  });

  it("rejects synthetic concatenations, paraphrases, and duplicate quote nodes", () => {
    for (const quote of ["Flash this page Takeaway only", "Show this page"]) {
      expect(
        valid(1, { evidence: [evidence("e1", quote)] }, { SOURCE_TEXT: source })
          .issues,
      ).toContain("non_source_evidence:e1");
    }
    expect(
      valid(
        1,
        { evidence: [evidence("e1", "20% OFF"), evidence("e2", "20% OFF")] },
        { SOURCE_TEXT: source },
      ).issues,
    ).toContain("duplicate_evidence_quote");
  });

  it("keeps independent material clauses independently representable", () => {
    const clauses = [
      evidence("e1", "Save $5 on lunch", "economic_claim"),
      evidence("e2", "Monday to Friday", "weekday"),
      evidence("e3", "11am to 2pm", "time"),
      evidence("e4", "at Orchard outlet", "location"),
    ];
    const result = valid(
      1,
      { evidence: clauses },
      {
        SOURCE_TEXT: clauses.map((x) => x.quote).join("; "),
      },
    );
    expect(result.valid).toBe(true);
    expect(
      result.data && "evidence" in result.data ? result.data.evidence : null,
    ).toHaveLength(4);
  });

  it("prompt describes exact spans, material clauses, qualifiers, and literal opening-to", () => {
    const p = PROMPTS_V4[1];
    for (const phrase of [
      "exact contiguous source substring",
      "material conditions must survive",
      "From/Up to/selected items",
      "Opening to 5PM remains literal",
      "do not infer a claim from hints",
    ])
      expect(p).toContain(phrase);
    expect(p).toContain("Flash this page and Takeaway only may be separate");
  });
});

describe("v4 stage 2 proposition anchors", () => {
  it("accepts anchor IDs only and rejects invented or duplicate anchors", () => {
    const nodes = [evidence("e1", "Save $4", "economic_claim")];
    expect(
      valid(2, { propositions: [prop("p1", "e1")] }, { evidence: nodes }).valid,
    ).toBe(true);
    expect(
      valid(2, { propositions: [prop("p1", "ghost")] }, { evidence: nodes })
        .issues,
    ).toContain("invented_anchor:ghost");
    expect(
      valid(2, { propositions: [prop("p1", "e1", "e1")] }, { evidence: nodes })
        .issues,
    ).toContain("duplicate_anchor:p1");
    expect(
      schemasV4[2].safeParse({
        propositions: [{ ...prop("p1", "e1"), supportingQuotes: ["Save $4"] }],
      }).success,
    ).toBe(false);
  });

  it("allows sibling editorial, offer, and contest proposition anchors", () => {
    const nodes = [
      evidence("e1", "Our chef collaboration", "editorial"),
      evidence("e2", "Fries for $2", "economic_claim"),
      evidence("e3", "Enter the draw", "contest"),
    ];
    const propositions: PropositionV4[] = [
      { ...prop("p1", "e1"), propositionTypeHint: "editorial" },
      prop("p2", "e2"),
      { ...prop("p3", "e3"), propositionTypeHint: "contest" },
    ];
    expect(valid(2, { propositions }, { evidence: nodes }).valid).toBe(true);
  });

  it("prompt keeps stage 2 IDs-only and forbids bundles or primary proposition", () => {
    for (const phrase of [
      "sealed evidence nodes only",
      "anchorEvidenceIds",
      "Do not assign supporting evidence",
      "synthetic text",
      "One source can have zero/one/many propositions",
      "meal + chance-to-win are separate",
    ])
      expect(PROMPTS_V4[2]).toContain(phrase);
  });
});

describe("v4 stage 3 complete edge assignments", () => {
  const evidenceNodes = [
    evidence("e1", "Save $4"),
    evidence("e2", "Takeaway only"),
    evidence("e3", "Maybe relevant"),
  ];
  const propositions: PropositionV4[] = [
    prop("p1", "e1"),
    { ...prop("p2", "e1"), propositionTypeHint: "other" },
  ];

  it("requires exactly one edge per evidence node and allows unlinked and shared targets", () => {
    const assignments = [
      edge("e1", ["p1", "p2"], "benefit"),
      edge("e2", ["p1"], "constraint"),
      edge("e3", [], "context"),
    ];
    expect(
      valid(
        3,
        { edges: assignments },
        { evidence: evidenceNodes, propositions },
      ).valid,
    ).toBe(true);
    expect(
      valid(
        3,
        { edges: assignments.slice(0, 2) },
        { evidence: evidenceNodes, propositions },
      ).issues,
    ).toContain("missing_edge_assignment");
  });

  it("rejects duplicate evidence edges, duplicate targets, and unknown IDs", () => {
    const ctx = { evidence: evidenceNodes, propositions };
    expect(
      valid(3, { edges: [edge("e1", ["p1"]), edge("e1", [])] }, ctx).issues,
    ).toContain("duplicate_edge");
    expect(
      valid(
        3,
        { edges: [edge("e1", ["p1", "p1"]), edge("e2", []), edge("e3", [])] },
        ctx,
      ).issues,
    ).toContain("duplicate_edge_target:e1");
    expect(
      valid(
        3,
        { edges: [edge("fake", []), edge("e2", []), edge("e3", [])] },
        ctx,
      ).issues,
    ).toContain("invented_evidence_id:fake");
    expect(
      valid(
        3,
        { edges: [edge("e1", ["fake"]), edge("e2", []), edge("e3", [])] },
        ctx,
      ).issues,
    ).toContain("invented_target:fake");
  });

  it("prompts explicit full target sets, conservative unlinked edges, and exclusion polarity", () => {
    for (const phrase of [
      "EVERY evidence node",
      "possibly []",
      "genuinely shared",
      "emit all targets explicitly",
      "emit []",
      "Preserve exclusion polarity",
      "Never move a time clause across groups",
    ])
      expect(PROMPTS_V4[3]).toContain(phrase);
  });
});

describe("v4 stage 4 publication taxonomy contract", () => {
  it("freezes all eight taxonomy values in both runtime schema and JSON schema", () => {
    expect(TAXONOMY_V4).toEqual([
      "economic_offer",
      "contest_or_chance",
      "editorial",
      "product_launch",
      "store_announcement",
      "service_information",
      "event_or_activity",
      "uncertain",
    ]);
    for (const taxonomy of TAXONOMY_V4) {
      expect(
        schemasV4[4].safeParse({ taxonomy, evidenceIds: ["e1"] }).success,
      ).toBe(true);
    }
    expect(
      schemasV4[4].safeParse({ taxonomy: "promotion", evidenceIds: ["e1"] })
        .success,
    ).toBe(false);
    expect(JSON.stringify(schemasV4[4].toJSONSchema())).toContain(
      "contest_or_chance",
    );
  });

  it("keeps classification evidence local and unique", () => {
    const ctx = {
      evidence: [evidence("e1", "Prize draw"), evidence("e2", "Meal discount")],
    };
    expect(
      valid(4, { taxonomy: "contest_or_chance", evidenceIds: ["e1"] }, ctx)
        .valid,
    ).toBe(true);
    expect(
      valid(4, { taxonomy: "contest_or_chance", evidenceIds: ["ghost"] }, ctx)
        .issues,
    ).toContain("nonlocal_classification_evidence:ghost");
    expect(
      valid(4, { taxonomy: "economic_offer", evidenceIds: ["e1", "e1"] }, ctx)
        .issues,
    ).toContain("duplicate_classification_evidence");
  });

  it("states guaranteed transactional entitlement versus chance semantics without claiming model proof", () => {
    const p = PROMPTS_V4[4];
    expect(p).toContain("guaranteed free item conditional on purchase");
    expect(p).toContain(
      "Chance to win, draw, contest prize or giveaway chance",
    );
    expect(p).toContain("No merchant-specific exceptions");
  });
});

describe("v4 stage 5 proposition-local normalization structure", () => {
  const localEvidence = [
    evidence("e1", "Captain's crispy chicken wrap", "economic_claim"),
    evidence("e2", "Takeaway only", "channel"),
    evidence("e3", "Flash this page", "redemption_instruction"),
    evidence("e4", "Opening to 5PM", "time"),
    evidence("e5", "From $8 for selected items", "economic_claim"),
    evidence("e6", "11 to 17 August", "date"),
    evidence("e7", "11 to 17 August 2026", "date"),
  ];

  it("accepts linked local facts, literal opening-to, and composable channel/action attributes", () => {
    const n = emptyNormalizationV4();
    n.title = { value: "Captain's crispy chicken wrap", evidenceId: "e1" };
    n.benefit = { value: "From $8 for selected items", evidenceId: "e5" };
    n.timeConstraints = [
      { kind: "opening_to", end: "17:00", evidenceId: "e4" },
    ];
    n.constraints = [
      {
        text: "Takeaway only",
        attributes: ["redemption_channel"],
        evidenceId: "e2",
      },
      {
        text: "Flash this page",
        attributes: ["redemption_action"],
        evidenceId: "e3",
      },
      {
        text: "From $8 for selected items",
        attributes: ["purchase", "item"],
        evidenceId: "e5",
      },
    ];
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" }),
    ).toMatchObject({ valid: true });
  });

  it("requires evidence for non-null facts and rejects evidence references outside this proposition", () => {
    const n = emptyNormalizationV4();
    n.title = { value: "Captain's crispy chicken wrap", evidenceId: "sibling" };
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("nonlocal_fact_evidence:sibling");
    n.title = { value: "Captain's crispy chicken wrap", evidenceId: null };
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("nonlocal_fact_evidence:null");
  });

  it("gates normalization on economic_offer and validates verbatim constraint and attribute uniqueness", () => {
    const n = emptyNormalizationV4();
    n.constraints = [
      {
        text: "Show QR code",
        attributes: ["redemption_action"],
        evidenceId: "e3",
      },
    ];
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "contest_or_chance" })
        .issues,
    ).toContain("normalization_ineligible");
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("nonverbatim_constraint");
    n.constraints = [
      {
        text: "Flash this page",
        attributes: ["redemption_action", "redemption_action"],
        evidenceId: "e3",
      },
    ];
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("duplicate_constraint_attribute");
  });

  it("supports only explicit-year date shapes and time shapes that do not invent endpoints", () => {
    const n = emptyNormalizationV4();
    n.startDate = { value: "2026-08-11", evidenceId: "e6" };
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("unstated_year");
    n.startDate.evidenceId = "e7";
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .valid,
    ).toBe(true);
    n.startDate = { value: "2026-08-11", evidenceId: "ghost" };
    expect(
      valid(5, n, { evidence: localEvidence, taxonomy: "economic_offer" })
        .issues,
    ).toContain("nonlocal_fact_evidence:ghost");
    expect(
      schemasV4[5].safeParse({
        ...emptyNormalizationV4(),
        timeConstraints: [
          { kind: "range", start: "00:00", end: "17:00", evidenceId: "e4" },
        ],
      }).success,
    ).toBe(true); // Shape alone is insufficient; local evidence validation below rejects the invented lower endpoint.
    const invented = emptyNormalizationV4();
    invented.timeConstraints = [
      { kind: "range", start: "00:00", end: "17:00", evidenceId: "e4" },
    ];
    expect(
      valid(5, invented, {
        evidence: localEvidence,
        taxonomy: "economic_offer",
      }).issues,
    ).toContain("unsupported_time_semantics");
    expect(
      schemasV4[5].safeParse({
        ...emptyNormalizationV4(),
        timeConstraints: [
          { kind: "opening_to", end: "17:00", evidenceId: "e4" },
        ],
      }).success,
    ).toBe(true);
    expect(
      schemasV4[5].safeParse({
        ...emptyNormalizationV4(),
        startDate: { value: "08-11", evidenceId: "e6" },
      }).success,
    ).toBe(false);
    // A full-date shape cannot prove the source stated its year; prompt/gold review owns that semantic check.
    expect(PROMPTS_V4[5]).toContain("absent year remains null");
  });
  it("rejects channels and collective/holiday labels as physical branches", () => {
    for (const name of [
      "Takeaway only",
      "Public Holidays",
      "all outlets",
      "app",
    ]) {
      const n = emptyNormalizationV4();
      n.locationRules = [
        { role: "participating", names: [name], evidenceId: "e1" },
      ];
      expect(
        valid(5, n, {
          taxonomy: "economic_offer",
          evidence: [evidence("e1", name)],
        }).issues,
      ).toContain("nonphysical_location_label");
    }
    const n = emptyNormalizationV4();
    n.locationScope = { value: "all_outlets", evidenceId: "e2" };
    expect(
      valid(5, n, { taxonomy: "economic_offer", evidence: localEvidence })
        .issues,
    ).toContain("channel_is_not_location_scope");
  });

  it("has current composable attribute vocabulary and prompt rules for actions, channels, qualifiers, and unstated years", () => {
    expect(ATTRIBUTES_V4).toContain("redemption_action");
    expect(ATTRIBUTES_V4).toContain("redemption_channel");
    expect(EVIDENCE_KINDS_V4).toContain("redemption_instruction");
    expect(RELATIONS_V4).toContain("redemption");
    expect(TYPE_HINTS_V4).toEqual([
      "offer",
      "contest",
      "editorial",
      "product",
      "service",
      "event",
      "other",
    ]);
    const p = PROMPTS_V4[5];
    for (const phrase of [
      "From/Up to/selected-item/quantity qualifiers",
      "absent year remains null",
      "opening_to has end only",
      "Opening to 5PM never creates midnight",
      "redemption_action",
      "redemption_channel",
      "Flash/show page/coupon/QR",
      "exact substring",
      "No generated quote/supportingQuotes/associationQuote fields",
    ])
      expect(p).toContain(phrase);
  });
});

describe("v4 prompt assembly boundary", () => {
  it("assembles the current stage prompt and schema but makes no blind-projection claim", () => {
    const sentinel = "FORBIDDEN_METADATA_SENTINEL_2048";
    const assembled = stagePromptV4(1, {
      caseId: "case-1",
      SOURCE_TEXT: "Save $4",
      gold: sentinel,
    });
    expect(assembled).toContain(sentinel);
    expect(assembled).toContain("Strict output schema:");
    expect(assembled).toContain("Save $4");
    // stagePromptV4 serializes its input as supplied. Runner-side allowlist projection is a separate contract.
  });
});
