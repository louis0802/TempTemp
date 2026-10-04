import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  emptyExtractionV2,
  rawPromotionExtractionSchemaV2,
  RESTRICTION_ROLES_V2,
  type RawPromotionExtractionV2,
} from "../src/ingestion/promotion-nlp/schema-v2";
import { validatePromotionExtractionV2 } from "../src/ingestion/promotion-nlp/validator-v2";
import {
  benchmarkSchemaV2,
  semanticFindingsV2,
} from "../src/ingestion/promotion-nlp/benchmark-v2";
import { PROMOTION_NLP_PROMPT_V2 } from "../src/ingestion/promotion-nlp/prompt-v2";
const source =
  "Acme Save up to 25% on selected pastries with a $12 purchase. Valid 1–3 June 2026, Monday, 10am–2pm at all Acme outlets. Valid only at North Hall. Not available at South Hall. Dine-in only. Follow our page. Contest closes 8 June 2026.";
const evidence = (text = source) => ({
  sourceId: "synthetic",
  canonicalUrl: "https://example.test/offer",
  nativeId: "a",
  evidenceId: "a",
  selector: "caption",
  merchantHint: "Hint Only",
  titleHint: null,
  text,
});
const output = (): RawPromotionExtractionV2 => ({
  ...emptyExtractionV2(
    "promotion",
    "Save up to 25% on selected pastries with a $12 purchase.",
  ),
  primaryProposition: {
    quote: "Save up to 25% on selected pastries with a $12 purchase.",
    title: { value: null, quote: null },
    benefit: {
      value: "Save up to 25% on selected pastries with a $12 purchase.",
      quote: "Save up to 25% on selected pastries with a $12 purchase.",
    },
  },
});
const linked = <T>(
  value: T,
  quote: string,
  associationQuote: string | null = quote,
) => ({ value, quote, associationQuote });
const benchmark = benchmarkSchemaV2.parse(
  JSON.parse(
    readFileSync("tests/fixtures/promotion-nlp/benchmark-v2.json", "utf8"),
  ),
);
describe("parallel semantic contract v2", () => {
  it("exposes the observed opening-time-to-midnight invention even when exact evidence passes syntax", () => {
    const c = benchmark.cases[26];
    const data = emptyExtractionV2("promotion", c.primaryAnchor);
    data.primaryProposition.quote = c.primaryAnchor;
    data.hours = linked("00:00–17:00", "Opening to 5PM", c.primaryAnchor);
    const validated = validatePromotionExtractionV2(
      evidence(c.sourceText),
      data,
    );
    expect(validated.accepted.hours.value).toBe("00:00–17:00");
    expect(semanticFindingsV2(c, validated.accepted).findings).toContainEqual(
      expect.objectContaining({
        metric: "unrelated_schedule_association",
        field: "hours",
        value: "00:00–17:00",
        expected: null,
      }),
    );
  });
  it("removes source_unspecified and accepts unknown null scope", () => {
    const data = output();
    expect(rawPromotionExtractionSchemaV2.safeParse(data).success).toBe(true);
    expect(
      rawPromotionExtractionSchemaV2.safeParse({
        ...data,
        locationScope: linked("source_unspecified", "Acme"),
      }).success,
    ).toBe(false);
    expect(
      validatePromotionExtractionV2(evidence(), data).accepted.locationScope
        .value,
    ).toBeNull();
  });
  it("keeps exclusions negative with no inferred positive scope", () => {
    const data = output();
    data.locationRules = [
      {
        role: "excluded",
        names: ["South Hall"],
        quote: "Not available at South Hall.",
        associationQuote: "Not available at South Hall.",
      },
    ];
    const v = validatePromotionExtractionV2(evidence(), data);
    expect(v.accepted.locationRules.map((r) => r.role)).toEqual(["excluded"]);
    expect(v.accepted.locationScope.value).toBeNull();
    expect(
      v.accepted.locationRules.filter((r) => r.role === "participating"),
    ).toEqual([]);
  });
  it.each(["Dine-in only.", "Redeem in stores"])(
    "channel wording retains null scope: %s",
    (quote) => {
      const data = output();
      data.restrictions = [
        {
          text: quote,
          role: "redemption_channel",
          quote,
          associationQuote: quote,
        },
      ];
      const v = validatePromotionExtractionV2(
        evidence(source + " " + quote),
        data,
      );
      expect(v.accepted.restrictions[0].role).toBe("redemption_channel");
      expect(v.accepted.locationScope.value).toBeNull();
    },
  );
  it.each(["all_outlets", "selected_outlets"] as const)(
    "positive %s needs evidence and association",
    (scope) => {
      const data = output();
      data.locationScope = {
        value: scope,
        quote: null,
        associationQuote: null,
      };
      expect(
        validatePromotionExtractionV2(evidence(), data).accepted.locationScope
          .value,
      ).toBeNull();
      data.locationScope = linked(
        scope,
        "Valid 1–3 June 2026, Monday, 10am–2pm at all Acme outlets.",
      );
      expect(
        validatePromotionExtractionV2(evidence(), data).accepted.locationScope
          .value,
      ).toBe(scope);
    },
  );
  it("named positive scope needs an explicitly participating rule and its association", () => {
    const data = output();
    data.locationScope = linked("named_outlets", "Valid only at North Hall.");
    expect(
      validatePromotionExtractionV2(evidence(), data).accepted.locationScope
        .value,
    ).toBeNull();
    data.locationRules = [
      {
        role: "participating",
        names: ["North Hall"],
        quote: "Valid only at North Hall.",
        associationQuote: null,
      },
    ];
    expect(
      validatePromotionExtractionV2(evidence(), data).accepted.locationRules,
    ).toEqual([]);
    data.locationRules[0].associationQuote = "Valid only at North Hall.";
    expect(
      validatePromotionExtractionV2(evidence(), data).accepted.locationScope
        .value,
    ).toBe("named_outlets");
  });
  it("rejects a declared identity in both positive and negative roles", () => {
    const data = output();
    data.locationRules = ["participating", "excluded"].map((role) => ({
      role: role as "participating" | "excluded",
      names: ["North Hall"],
      quote: "Valid only at North Hall.",
      associationQuote: "Valid only at North Hall.",
    }));
    const v = validatePromotionExtractionV2(evidence(), data);
    expect(v.accepted.locationRules).toEqual([]);
    expect(
      v.issues.some((i) => i.code === "conflicting_participation_roles"),
    ).toBe(true);
  });
  it.each([
    "startDate",
    "endDate",
    "weekdays",
    "hours",
    "locationScope",
  ] as const)("%s rejects missing/mismatched association", (f) => {
    const data = output();
    const value = {
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      weekdays: [1],
      hours: "10:00–14:00",
      locationScope: "all_outlets",
    }[f];
    for (const associationQuote of [null, "not in source"]) {
      Object.assign(data, {
        [f]: linked(
          value,
          "Valid 1–3 June 2026, Monday, 10am–2pm at all Acme outlets.",
          associationQuote,
        ),
      });
      expect(
        validatePromotionExtractionV2(evidence(), data).accepted[f].value,
      ).toBeNull();
    }
  });
  it("a secondary contest date may occur while primary validity stays unknown", () => {
    const v = validatePromotionExtractionV2(evidence(), output());
    expect(v.accepted.startDate.value).toBeNull();
    expect(v.accepted.endDate.value).toBeNull();
    expect(source).toContain("Contest closes 8 June 2026");
  });
  it.each(["2026-02-30", "2026-13-01", "June 1"])(
    "rejects invalid calendar %s",
    (value) => {
      const data = output();
      data.startDate = linked(
        value,
        "Valid 1–3 June 2026, Monday, 10am–2pm at all Acme outlets.",
      );
      expect(
        validatePromotionExtractionV2(evidence(), data).accepted.startDate
          .value,
      ).toBeNull();
    },
  );
  it("does not infer source years or accept invalid weekday/hour forms", () => {
    const data = output();
    data.startDate = linked(
      "2027-06-01",
      "Save up to 25% on selected pastries with a $12 purchase.",
    );
    data.weekdays = linked([1, 1], "Monday");
    data.hours = linked("25:00–26:00", "10am–2pm");
    expect(
      validatePromotionExtractionV2(evidence(), data).issues.map((i) => i.code),
    ).toEqual(
      expect.arrayContaining([
        "unstated_year",
        "invalid_weekdays",
        "unsupported_hours",
      ]),
    );
  });
  it("restriction roles are strict and purchase/eligibility/channel/social stay distinct", () => {
    expect(RESTRICTION_ROLES_V2).toHaveLength(8);
    const data = output();
    data.restrictions = [
      {
        text: "with a $12 purchase",
        role: "purchase_requirement",
        quote: "with a $12 purchase",
        associationQuote:
          "Save up to 25% on selected pastries with a $12 purchase.",
      },
      {
        text: "Dine-in only.",
        role: "redemption_channel",
        quote: "Dine-in only.",
        associationQuote: "Dine-in only.",
      },
      {
        text: "Follow our page.",
        role: "social_requirement",
        quote: "Follow our page.",
        associationQuote: "Follow our page.",
      },
    ];
    const v = validatePromotionExtractionV2(evidence(), data);
    expect(v.accepted.restrictions.map((r) => r.role)).toEqual([
      "purchase_requirement",
      "redemption_channel",
      "social_requirement",
    ]);
    expect(v.accepted.merchant.value).toBeNull();
    expect(v.accepted.locationRules).toEqual([]);
    expect(
      rawPromotionExtractionSchemaV2.safeParse({
        ...data,
        restrictions: [{ ...data.restrictions[0], role: "terms" }],
      }).success,
    ).toBe(false);
  });
  it("rejects unrepresented restriction text and invented merchant hints", () => {
    const data = output();
    data.merchant = { value: "Hint Only", quote: "Acme" };
    data.restrictions = [
      {
        text: "Members only",
        role: "eligibility",
        quote: "Acme",
        associationQuote: "Acme",
      },
    ];
    const v = validatePromotionExtractionV2(evidence(), data);
    expect(v.accepted.merchant.value).toBeNull();
    expect(v.accepted.restrictions).toEqual([]);
  });
  it("does not silently drop a starting discount qualifier behind the full quote", () => {
    const data = output();
    data.primaryProposition.benefit = {
      value: "20% off",
      quote: "From 20% off",
    };
    const v = validatePromotionExtractionV2(
      evidence(source + " From 20% off"),
      data,
    );
    expect(v.accepted.primaryProposition.benefit.value).toBeNull();
    expect(
      v.issues.some((i) => i.code === "benefit_must_preserve_verbatim_clause"),
    ).toBe(true);
    const c = benchmark.cases[46];
    data.primaryProposition = {
      quote: "20% Off",
      title: { value: null, quote: null },
      benefit: { value: "20% Off", quote: "20% Off" },
    };
    expect(
      semanticFindingsV2(c, data).findings.some(
        (f) => f.metric === "benefit_qualifier_loss",
      ),
    ).toBe(true);
  });
  it("definite promotion requires a primary quote; non-promotion cannot retain facts", () => {
    const data = output();
    data.primaryProposition.quote = null;
    expect(
      validatePromotionExtractionV2(evidence(), data).accepted.classification
        .value,
    ).toBe("uncertain");
    data.classification = { value: "non_promotion", quote: "Acme" };
    const v = validatePromotionExtractionV2(evidence(), data);
    expect(v.accepted.primaryProposition.benefit.value).toBeNull();
    expect(v.issues.some((i) => i.code === "non_promotion_facts")).toBe(true);
  });
  it("uncertain may emit no primary and does not mask a quote mismatch", () => {
    expect(
      validatePromotionExtractionV2(evidence(), emptyExtractionV2()).issues,
    ).toEqual([]);
    expect(
      validatePromotionExtractionV2(
        evidence(),
        emptyExtractionV2("uncertain", "missing"),
      ).issues.some((i) => i.code === "quote_mismatch"),
    ).toBe(true);
  });
  it.each([31, 32])(
    "source-reviewed negative-only McDonald's case %i detects mislabeled positives without semantic regex",
    (i) => {
      const c = benchmark.cases[i],
        data = output();
      data.primaryProposition.quote = c.primaryAnchor;
      data.classification.quote = c.primaryAnchor;
      data.locationScope = linked("named_outlets", c.excluded[0].quote);
      data.locationRules = [
        {
          role: "participating",
          names: ["Lido"],
          quote: c.excluded[0].quote,
          associationQuote: c.excluded[0].quote,
        },
      ];
      expect(c.positiveScope).toBeNull();
      expect(c.participating).toEqual([]);
      const flags = semanticFindingsV2(c, data).findings;
      expect(
        flags.some((f) => f.metric === "participation_polarity_errors"),
      ).toBe(true);
      expect(
        flags.some((f) => f.metric === "unsupported_positive_location_scope"),
      ).toBe(true);
      // Honest limitation: exact evidence checking alone cannot prove the negative sentence's role.
      expect(
        validatePromotionExtractionV2(evidence(c.sourceText), data).accepted
          .locationRules[0].role,
      ).toBe("participating");
    },
  );
  it("all/selected/channel scopes and secondary dates are judged separately from quote syntax", () => {
    const c = benchmark.cases[32],
      data = output();
    data.startDate = linked("2026-10-01", c.secondaryEvidence[1]);
    const flags = semanticFindingsV2(c, data).findings;
    expect(flags.some((f) => f.metric === "invented_validity_facts")).toBe(
      true,
    );
    expect(
      flags.some((f) => f.metric === "primary_secondary_association_errors"),
    ).toBe(true);
    for (const i of [34, 35, 36, 37]) {
      const c = benchmark.cases[i];
      data.startDate = { value: null, quote: null, associationQuote: null };
      data.locationScope = linked("all_outlets", c.sourceText);
      expect(
        semanticFindingsV2(c, data).findings.some(
          (f) => f.metric === "unsupported_positive_location_scope",
        ),
      ).toBe(true);
    }
  });
  it("source-supported longer labels are canonical differences, not invented branches", () => {
    const c = benchmark.cases[13],
      data = output();
    data.locationRules = [
      {
        role: "participating",
        names: ["Parkway Parade Shake Shack Singapore outlet"],
        quote: c.participating[0].quote,
        associationQuote: c.participating[0].quote,
      },
    ];
    const flags = semanticFindingsV2(c, data);
    expect(
      flags.findings.filter(
        (f) => f.metric === "invented_participating_location_identity",
      ),
    ).toEqual([]);
    expect(flags.canonicalLabelDifferences).toHaveLength(1);
  });
  it("v2 prompt contains no benchmark merchant examples and annotations retain all source envelopes", () => {
    expect(PROMOTION_NLP_PROMPT_V2).not.toMatch(
      /McDonald|Shake Shack|Captain Kim|Bari Bari|Sushiro|FairPrice|PPOPENING|CHICKENSUNDAY/,
    );
    const v1 = JSON.parse(
      readFileSync("tests/fixtures/promotion-nlp/benchmark.json", "utf8"),
    );
    for (const c of benchmark.cases) {
      const old = v1.cases.find((o: { id: string }) => o.id === c.id);
      expect(c.sourceText).toBe(old.sourceText);
      expect(c.sourceReference).toEqual(old.sourceReference);
      expect(c.merchantHint).toBe(old.merchant);
      expect(c.titleHint).toBeNull();
    }
  });
});
