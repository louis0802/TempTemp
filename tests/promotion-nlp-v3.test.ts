import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  segmentationSchemaV3,
  validateSegmentationV3,
} from "../src/ingestion/promotion-nlp/segmentation-v3";
import {
  emptyExtractionV3,
  rawExtractionSchemaV3,
  CONSTRAINT_ATTRIBUTES_V3,
  type ExtractionV3,
  type TimeConstraintV3,
} from "../src/ingestion/promotion-nlp/schema-v3";
import { validateExtractionV3 } from "../src/ingestion/promotion-nlp/validator-v3";
import {
  benchmarkSchemaV3,
  scoreSegmentationV3,
  scoreExtractionV3,
} from "../src/ingestion/promotion-nlp/benchmark-v3";
import {
  buildStage1InputV3,
  buildStage2InputV3,
  stage1PromptV3,
  stage2PromptV3,
} from "../scripts/research/promotion-nlp-subagent-v3-evaluation";
const gold = benchmarkSchemaV3.parse(
  JSON.parse(
    readFileSync("tests/fixtures/promotion-nlp/benchmark-v3.json", "utf8"),
  ),
);
const unit = (quote: string, supportingQuotes: string[] = []) => ({
  id: "p1",
  propositionQuote: quote,
  supportingQuotes,
});
const output = (quote: string) => emptyExtractionV3("promotion", quote);
function validateTime(quote: string, time: TimeConstraintV3) {
  const d = output(quote);
  d.timeConstraints = [time];
  return validateExtractionV3(unit(quote), d);
}

describe("v3 exact proposition boundaries", () => {
  it("allows zero through multiple units with stable supplied IDs/order and unassigned context", () => {
    expect(
      validateSegmentationV3("Save $3. Save $4. Ambiguous.", {
        propositions: [],
        unassignedQuotes: ["Ambiguous."],
      }).accepted,
    ).not.toBeNull();
    const s = {
      propositions: [unit("Save $3."), { ...unit("Save $4."), id: "p2" }],
      unassignedQuotes: ["Ambiguous."],
    };
    expect(
      validateSegmentationV3("Save $3. Save $4. Ambiguous.", s).accepted,
    ).toEqual(s);
  });
  it.each([
    ["central", { propositions: [unit("Save $9")], unassignedQuotes: [] }],
    [
      "support",
      { propositions: [unit("Save $3", ["Fake term"])], unassignedQuotes: [] },
    ],
    ["unassigned", { propositions: [], unassignedQuotes: ["Fake term"] }],
    [
      "synthetic",
      { propositions: [unit("Save $3 terms end")], unassignedQuotes: [] },
    ],
  ])("rejects absent or noncontiguous %s quote", (_, s) => {
    expect(
      validateSegmentationV3("Save $3 intervening terms end", s).accepted,
    ).toBeNull();
  });
  it("rejects nine units without truncation and duplicate IDs", () => {
    expect(
      segmentationSchemaV3.safeParse({
        propositions: Array.from({ length: 9 }, (_, i) => ({
          ...unit("Save"),
          id: `p${i}`,
        })),
        unassignedQuotes: [],
      }).success,
    ).toBe(false);
    expect(
      segmentationSchemaV3.safeParse({
        propositions: [unit("Save"), unit("Save")],
        unassignedQuotes: [],
      }).success,
    ).toBe(false);
  });
  it("Stage 1 projects away gold/parser/results/review metadata and rejects appended keys", () => {
    const sentinel = "GOLD_PARSER_V1_V2_V3_982341";
    const input = buildStage1InputV3({
      id: "x",
      merchant: "Acme",
      sourceText: "Save $3",
      gold: sentinel,
      parser: sentinel,
      v1Output: sentinel,
      v2Output: sentinel,
      review: sentinel,
    } as Parameters<typeof buildStage1InputV3>[0]);
    expect(Object.keys(input)).toEqual([
      "id",
      "merchantHint",
      "titleHint",
      "SOURCE_TEXT",
    ]);
    expect(stage1PromptV3(input)).not.toContain(sentinel);
    expect(() =>
      stage1PromptV3({ ...input, gold: sentinel } as typeof input),
    ).toThrow();
  });
  it("Stage 2 never receives full source, siblings, unassigned clauses or gold", () => {
    const sentinel = "SIBLING_SECRET_PROPOSITION_481995";
    const s = buildStage1InputV3({
      id: "x",
      merchant: "Acme",
      sourceText: `Save $3 ${sentinel} UNASSIGNED_SECRET_321`,
    });
    const input = buildStage2InputV3(s, unit("Save $3"));
    expect(Object.keys(input)).toEqual([
      "caseId",
      "propositionId",
      "merchantHint",
      "titleHint",
      "propositionQuote",
      "supportingQuotes",
    ]);
    for (const secret of [sentinel, "UNASSIGNED_SECRET_321", s.SOURCE_TEXT])
      expect(stage2PromptV3(input)).not.toContain(secret);
    expect(() =>
      stage2PromptV3({
        ...input,
        SOURCE_TEXT: s.SOURCE_TEXT,
        gold: sentinel,
      } as typeof input),
    ).toThrow();
  });
  it("local fact evidence cannot cross quote boundaries or cite a sibling", () => {
    const d = output("Save $3");
    d.benefit = { value: "Save $3 Terms", quote: "Save $3 Terms" };
    expect(
      validateExtractionV3(unit("Save $3", ["Terms"]), d).issues,
    ).toContainEqual({ field: "benefit", code: "quote_mismatch" });
    d.benefit = { value: "Save $99", quote: "Save $99" };
    expect(
      validateExtractionV3(unit("Save $3"), d).accepted.benefit.value,
    ).toBeNull();
  });
});
describe("v3 temporal semantics", () => {
  it.each<[string, TimeConstraintV3]>([
    [
      "11am–2pm",
      { kind: "range", start: "11:00", end: "14:00", quote: "11am–2pm" },
    ],
    ["before 5pm", { kind: "before", time: "17:00", quote: "before 5pm" }],
    ["after 5pm", { kind: "after", time: "17:00", quote: "after 5pm" }],
    [
      "Opening to 5PM",
      { kind: "opening_to", end: "17:00", quote: "Opening to 5PM" },
    ],
    ["2–5PM", { kind: "range", start: "14:00", end: "17:00", quote: "2–5PM" }],
    [
      "11:30am-12pm",
      { kind: "range", start: "11:30", end: "12:00", quote: "11:30am-12pm" },
    ],
  ])("retains explicit clock semantics for %s", (q, t) =>
    expect(validateTime(q, t).accepted.timeConstraints).toEqual([t]),
  );
  it("never invents midnight from opening-to or guessed opening hours", () => {
    expect(
      validateTime("Opening to 5PM", {
        kind: "range",
        start: "00:00",
        end: "17:00",
        quote: "Opening to 5PM",
      }).accepted.timeConstraints,
    ).toEqual([]);
    expect(
      validateTime("from opening hours", {
        kind: "range",
        start: "10:00",
        end: "17:00",
        quote: "from opening hours",
      }).accepted.timeConstraints,
    ).toEqual([]);
    expect(
      validateExtractionV3(
        unit("from opening hours"),
        output("from opening hours"),
      ).accepted.timeConstraints,
    ).toEqual([]);
  });
  it.each(["2025-02-29", "2026-13-01", "2026-00-12"])(
    "rejects invalid date %s",
    (date) => {
      const q = `Save $3 on ${date}`;
      const d = output(q);
      d.startDate = { value: date, quote: q };
      expect(
        validateExtractionV3(unit(q), d).accepted.startDate.value,
      ).toBeNull();
    },
  );
  it("rejects unstated year and reversed dates", () => {
    const q = "Save $3 from 11 to 17 August";
    const d = output(q);
    d.startDate = { value: "2026-08-11", quote: q };
    expect(validateExtractionV3(unit(q), d).issues).toContainEqual({
      field: "startDate",
      code: "unstated_year",
    });
    const s = "Save $3 from 1 to 31 October 2026";
    const o = output(s);
    o.startDate = { value: "2026-10-31", quote: s };
    o.endDate = { value: "2026-10-01", quote: s };
    expect(
      validateExtractionV3(unit(s), o).accepted.startDate.value,
    ).toBeNull();
  });
  it.each([[[0]], [[8]], [[1, 1]]])(
    "rejects invalid weekday set %j",
    (days) => {
      const d = output("Save $3 Monday");
      d.weekdays = { value: days, quote: "Monday" };
      expect(
        validateExtractionV3(unit("Save $3 Monday"), d).accepted.weekdays.value,
      ).toBeNull();
    },
  );
  it("does not structurally convert app-check/release language into availability", () => {
    const q = "Save $3. Check the app every Monday.";
    expect(
      validateExtractionV3(unit(q), output(q)).accepted.weekdays.value,
    ).toBeNull();
    // Exact Monday evidence cannot prove availability; independent gold catches semantic failure.
    const c = gold.cases.find((c) => c.id.includes("local-faves"))!,
      g = c.propositions[0],
      u = unit(g.acceptableAnchors[0], [
        "check your Happy Point app every Monday",
      ]),
      d = output(g.acceptableAnchors[0]);
    d.weekdays = {
      value: [1],
      quote: "check your Happy Point app every Monday",
    };
    expect(
      scoreExtractionV3(c, u, d).findings.some(
        (f) => f.metric === "incorrect_availability_weekday",
      ),
    ).toBe(true);
  });
});
describe("v3 location and atomic constraints", () => {
  it.each([
    "all outlets",
    "all Shake Shack outlets",
    "public holidays",
    "PH",
    "dine-in",
    "in stores",
    "takeaway",
  ])("rejects %s as physical identity", (name) => {
    const q = `Save $3 ${name}`;
    const d = output(q);
    d.locationRules = [{ role: "participating", names: [name], quote: q }];
    expect(validateExtractionV3(unit(q), d).accepted.locationRules).toEqual([]);
  });
  it("retains literal longer physical labels and negative-only rules without positive scope", () => {
    const q = "Save $3. Not available at Lido outlet.";
    const d = output(q);
    d.locationRules = [{ role: "excluded", names: ["Lido outlet"], quote: q }];
    const v = validateExtractionV3(unit(q), d);
    expect(v.accepted.locationRules).toEqual(d.locationRules);
    expect(v.accepted.locationScope.value).toBeNull();
  });
  it("schema preserves polarity; review catches excluded-to-participating reversal", () => {
    const c = gold.cases.find((c) => c.id === "mcdonalds_sg-McSaver")!,
      g = c.propositions[0],
      q = g.excluded[0].quote,
      u = unit(g.acceptableAnchors[0], [q]),
      d = output(g.acceptableAnchors[0]);
    d.locationRules = [
      { role: "participating", names: [g.excluded[0].labels[0]], quote: q },
    ];
    expect(
      scoreExtractionV3(c, u, d).findings.some(
        (f) => f.metric === "participation_polarity_errors",
      ),
    ).toBe(true);
    d.locationRules[0].role = "excluded";
    expect(
      scoreExtractionV3(c, u, d).findings.some(
        (f) => f.metric === "participation_polarity_errors",
      ),
    ).toBe(false);
  });
  it("retains all-outlet scope separately from physical names and channels", () => {
    const q = "Save $3 at all outlets, dine-in only";
    const d = output(q);
    d.locationScope = { value: "all_outlets", quote: "all outlets" };
    d.constraints = [
      { text: "dine-in only", attributes: ["redemption_channel"], quote: q },
    ];
    expect(validateExtractionV3(unit(q), d).accepted.locationScope.value).toBe(
      "all_outlets",
    );
    const channel = output("Dine-in only");
    expect(
      validateExtractionV3(unit("Dine-in only"), channel).accepted.locationScope
        .value,
    ).toBeNull();
  });
  it("rejects conflicting participation roles and named scope without positive identity", () => {
    const q = "Save $3 at Lido";
    const d = output(q);
    d.locationScope = { value: "named_outlets", quote: q };
    d.locationRules = [
      { role: "participating", names: ["Lido"], quote: q },
      { role: "excluded", names: ["Lido"], quote: q },
    ];
    const v = validateExtractionV3(unit(q), d);
    expect(v.accepted.locationRules).toEqual([]);
    expect(v.accepted.locationScope.value).toBeNull();
  });
  it.each<[string, ExtractionV3["constraints"][number]["attributes"]]>([
    ["dine-in only", ["redemption_channel"]],
    ["buy two", ["purchase"]],
    ["follow our account", ["social"]],
    ["order before 5pm", ["timing"]],
    ["Reservation required", ["reservation"]],
    ["while stocks last", ["availability"]],
    ["selected items of the same price", ["item"]],
    ["Reserve through the app", ["reservation", "redemption_channel"]],
    ["not valid for delivery", ["exclusion", "redemption_channel"]],
  ])("accepts composable attributes for %s", (text, attributes) => {
    const q = `Save $3, ${text}.`,
      d = output(q);
    d.constraints = [{ text, attributes, quote: q }];
    expect(validateExtractionV3(unit(q), d).accepted.constraints).toEqual(
      d.constraints,
    );
  });
  it("requires atomic text in a larger exact quote and rejects unknown/duplicate attributes", () => {
    const q = "Save $3, dine-in only.";
    const d = output(q);
    d.constraints = [
      { text: "students only", attributes: ["audience"], quote: q },
    ];
    expect(validateExtractionV3(unit(q), d).accepted.constraints).toEqual([]);
    expect(
      rawExtractionSchemaV3.safeParse({
        ...d,
        constraints: [
          { text: "dine-in only", quote: q, attributes: ["eligibility"] },
        ],
      }).success,
    ).toBe(false);
    d.constraints = [
      {
        text: "dine-in only",
        quote: q,
        attributes: ["redemption_channel", "redemption_channel"],
      },
    ];
    expect(validateExtractionV3(unit(q), d).accepted.constraints).toEqual([]);
    expect(CONSTRAINT_ATTRIBUTES_V3).toHaveLength(10);
  });
  it("rejects merchant hint inference, nonpromotion facts and obsolete wrappers", () => {
    const q = "Save $3",
      d = output(q);
    d.merchant = { value: "Acme", quote: q };
    expect(validateExtractionV3(unit(q), d).accepted.merchant.value).toBeNull();
    d.classification.value = "non_promotion";
    expect(
      validateExtractionV3(unit(q), d).issues.some(
        (i) => i.code === "classification_fact_incoherence",
      ),
    ).toBe(true);
    expect(
      rawExtractionSchemaV3.safeParse({
        ...emptyExtractionV3(),
        associationQuote: q,
        primaryProposition: {},
      }).success,
    ).toBe(false);
  });
});
describe("source-reviewed critical regressions", () => {
  it("preserves all 49 source envelopes byte-equivalently", () => {
    const prior = JSON.parse(
      readFileSync("tests/fixtures/promotion-nlp/benchmark-v2.json", "utf8"),
    );
    for (const c of gold.cases) {
      const p = prior.cases.find((p: { id: string }) => p.id === c.id);
      for (const f of [
        "sourceText",
        "sourceReference",
        "merchantHint",
        "titleHint",
      ] as const)
        expect(c[f]).toEqual(p[f]);
    }
  });
  it("Student Meal separates before/after terms and detects harmful attachment", () => {
    const c = gold.cases[0],
      [before, after] = c.propositions;
    const s = {
      propositions: [
        {
          ...unit(before.acceptableAnchors[0], before.requiredSupporting),
          id: "before",
        },
        {
          ...unit(after.acceptableAnchors[0], after.requiredSupporting),
          id: "after",
        },
      ],
      unassignedQuotes: c.ambiguousClauses,
    };
    expect(
      scoreSegmentationV3(c, s).units.flatMap((u) => u.crossAttachments),
    ).toEqual([]);
    s.propositions[1].supportingQuotes.push(before.requiredSupporting[0]);
    expect(scoreSegmentationV3(c, s).units[1].crossAttachments).toHaveLength(1);
  });
  it("distinguishes equivalent boundaries, harmful merges and support-distributing splits", () => {
    const c = gold.cases[0],
      [a, b] = c.propositions;
    const harmless = {
      propositions: [
        {
          ...unit(
            c.sourceText.slice(0, c.sourceText.indexOf("Get a 15%")),
            a.requiredSupporting,
          ),
          id: "a",
        },
        { ...unit(b.acceptableAnchors[0], b.requiredSupporting), id: "b" },
      ],
      unassignedQuotes: [],
    };
    expect(scoreSegmentationV3(c, harmless).recalled).toBe(2);
    expect(scoreSegmentationV3(c, harmless).merged).toBe(0);
    expect(
      scoreSegmentationV3(c, {
        propositions: [unit(c.sourceText)],
        unassignedQuotes: [],
      }).merged,
    ).toBe(1);
    expect(
      scoreSegmentationV3(c, {
        propositions: [
          unit(b.acceptableAnchors[0]),
          { ...unit(b.acceptableAnchors[0]), id: "duplicate_scope" },
        ],
        unassignedQuotes: [],
      }).harmfulSplits,
    ).toContain("after5");
  });
  it.each([
    ["meet-our-collab-partners", 2],
    ["bfmcsaver", 2],
  ])(
    "%s has independent editorial/contest and promotion units",
    (id, count) => {
      const c = gold.cases.find((c) => c.id.includes(id))!;
      expect(c.propositions).toHaveLength(count);
      expect(c.propositions.map((p) => p.type).sort()).toEqual([
        "non_promotion",
        "promotion",
      ]);
    },
  );
  it("Bari opening_to and Captain takeaway retain source-local semantics", () => {
    const b = gold.cases.find(
      (c) => c.id === "bari_bari_steak_sg-promotions-1",
    )!;
    expect(b.propositions[0].timeConstraints).toEqual([
      { kind: "opening_to", end: "17:00" },
    ]);
    const c = gold.cases.find((c) => c.id.includes("captain-kim-delivery"))!;
    expect(c.propositions[0].constraints).toContainEqual({
      text: "Takeaway only",
      requiredAttributes: ["redemption_channel"],
      allowedAttributes: ["redemption_channel"],
      material: true,
    });
  });
  it("Sushiro remains product/nonpromotion/no year and Instagram channels never imply scope", () => {
    const c = gold.cases.find((c) => c.id.startsWith("sushiro"))!;
    expect(c.propositions[0].type).toBe("non_promotion");
    expect(c.propositions[0].startDate).toBeNull();
    expect(c.propositions[0].positiveScope).toBeNull();
    for (const c of gold.cases.filter((c) => c.id.startsWith("instagram"))) {
      expect(c.propositions[0].positiveScope).toBeNull();
      expect(c.propositions[0].startDate).toBeNull();
    }
  });
});
