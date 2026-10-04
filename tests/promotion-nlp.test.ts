import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import {
  benchmarkEvidence,
  benchmarkSchema,
  scoreBenchmarkCase,
  summarizeBenchmark,
  type PromotionBenchmarkCase,
} from "@/ingestion/promotion-nlp/benchmark";
import {
  emptyExtraction,
  extractionJsonSchema,
  normalizeSourceText,
  promotionTextEvidenceSchema,
  rawPromotionExtractionSchema,
} from "@/ingestion/promotion-nlp/schema";
import { validatePromotionExtraction } from "@/ingestion/promotion-nlp/validator";
import { FixturePromotionNlpProvider } from "@/ingestion/promotion-nlp/extractor";
import {
  OpenAiPromotionNlpProvider,
  hostedConfigFromEnvironment,
} from "@/ingestion/promotion-nlp/openai-provider";
import { promotionPromptInput } from "@/ingestion/promotion-nlp/prompt";
import { mapPromotionNlpCandidate } from "@/ingestion/promotion-nlp/candidate-mapper";
import {
  DIRECT_SOURCE_PROCESSOR_VERSION,
  evaluateDirectPublication,
} from "@/ingestion/direct-sources/publication";
import { directPromotionCandidateSchema } from "@/ingestion/direct-sources/types";
import {
  sourceDefinition,
  directSources,
} from "@/ingestion/direct-sources/registry";
import { BoundedDirectFetch } from "@/ingestion/direct-sources/fetch";
import { makeEvidence } from "@/ingestion/direct-sources/evidence";
import {
  capturedCandidate,
  loadReviewedBenchmark,
  parseBenchmarkArgs,
  runPromotionNlpBenchmark,
} from "../scripts/research/promotion-nlp-benchmark";
import { isolateCapturedText } from "../scripts/research/promotion-nlp-captures";
import type {
  PromotionTextEvidence,
  RawPromotionExtraction,
} from "@/ingestion/promotion-nlp/types";

const text =
  "Pepper Lunch Value Deal: 20% off. Valid from 1 October to 31 October 2026. Monday to Friday, 11:00–14:00. Available at all Pepper Lunch outlets. Valid at JEM. Selected outlets. Students only. Dine-in only.";
const evidence: PromotionTextEvidence = {
  sourceId: "pepper_lunch_sg",
  canonicalUrl: "https://www.pepperlunch.com.sg/promo/2024/01/01/value/",
  nativeId: "value",
  evidenceId: "test-original-evidence",
  selector: "article#exact-campaign",
  merchantHint: "Pepper Lunch",
  titleHint: null,
  text,
};
function raw() {
  const r = emptyExtraction("promotion", "20% off");
  r.benefit = { value: "20% off", quote: "20% off" };
  return r;
}
const validate = (r: unknown, e = evidence) =>
  validatePromotionExtraction(e, r);
async function context(e = evidence) {
  const source = sourceDefinition("pepper_lunch_sg"),
    body = Buffer.from(e.text);
  const page = {
    evidence: {
      ...makeEvidence(
        source.id,
        e.canonicalUrl,
        e.canonicalUrl,
        "detail",
        body,
        "text/plain",
        200,
        "2030-12-31T00:00:00.000Z",
      ),
      id: e.evidenceId,
    },
    body,
  };
  class Captured extends BoundedDirectFetch {
    override get capturedPages() {
      return [page];
    }
  }
  return {
    source,
    http: new Captured(source, async () => {
      throw new Error("network_forbidden");
    }),
    observedAt: "2030-12-31T00:00:00.000Z",
  };
}
let cases: PromotionBenchmarkCase[], checkedOutputs: Record<string, unknown>;
beforeAll(async () => {
  cases = (await loadReviewedBenchmark()).benchmark.cases;
  checkedOutputs = JSON.parse(
    await readFile(
      "tests/fixtures/promotion-nlp/provider-outputs.json",
      "utf8",
    ),
  ).outputs;
});

describe("strict extraction envelope and evidence boundary", () => {
  it("accepts the contract and exports a strict required JSON schema", () => {
    expect(rawPromotionExtractionSchema.safeParse(raw()).success).toBe(true);
    const schema = extractionJsonSchema();
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("classification");
    expect(schema.required).toHaveLength(14);
  });
  it.each([
    null,
    "{}",
    {},
    { ...raw(), surprise: true },
    { ...raw(), classification: { value: "maybe", quote: text } },
    { ...raw(), locationScope: { value: "nearby", quote: "JEM" } },
  ])("malformed/extra/unsupported output fails closed: %j", (r) => {
    const v = validate(r);
    expect(v.structurallyValid).toBe(false);
    expect(v.accepted).toEqual({});
    expect(v.classification.value).toBe("uncertain");
  });
  it("rejects hidden metadata and full-page HTML on input", () => {
    expect(
      promotionTextEvidenceSchema.safeParse({
        ...evidence,
        publishedAt: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      validate(raw(), {
        ...evidence,
        text: "<html><body>20% off</body></html>",
      }).issues[0].code,
    ).toBe("invalid_source_evidence");
  });
  it("bounds source input and never sends URLs/evidence/timestamps to the model", () => {
    expect(
      promotionTextEvidenceSchema.safeParse({
        ...evidence,
        text: "x".repeat(20_001),
      }).success,
    ).toBe(false);
    const input = JSON.parse(promotionPromptInput(evidence));
    expect(Object.keys(input)).toEqual(["CONTEXT_HINTS", "SOURCE_TEXT"]);
    expect(JSON.stringify(input)).not.toContain("2024/01/01");
    expect(JSON.stringify(input)).not.toContain(evidence.evidenceId);
  });
  it("requires exact quotes for nonempty values without fuzzy rescue", () => {
    const r = raw();
    r.benefit.quote = null;
    expect(validate(r).rejected.benefit?.reasons).toContain(
      "rejected_missing_evidence",
    );
    r.benefit.quote = "20% OFF";
    expect(validate(r).rejected.benefit?.reasons).toContain(
      "rejected_quote_mismatch",
    );
    r.benefit.quote = "20% off";
    expect(validate(r).accepted.benefit).toEqual(r.benefit);
  });
  it("normalizes source whitespace but never normalizes an unsupported quote", () => {
    const e = { ...evidence, text: "20%\n  off" };
    expect(validate(raw(), e).accepted.benefit).toBeDefined();
    const r = raw();
    r.benefit.quote = "20%\n  off";
    expect(validate(r, e).accepted.benefit).toBeUndefined();
  });
  it("normalizes empty fields and lists deterministically", () => {
    const r = raw();
    r.title = { value: "  ", quote: null };
    r.locationNames = { value: [""], quote: null };
    const v = validate(r);
    expect(v.accepted.title).toBeUndefined();
    expect(v.accepted.locationNames).toBeUndefined();
    expect(v.issues).toEqual([]);
  });
});
describe("calendar, schedule and outlet validation", () => {
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-10-32",
    "October 1 2026",
  ])("rejects invalid calendar date %s", (date) => {
    const r = raw();
    r.startDate = {
      value: date,
      quote: "Valid from 1 October to 31 October 2026.",
    };
    expect(validate(r).rejected.startDate?.reasons).toContain(
      "rejected_invalid_calendar_date",
    );
  });
  it("accepts leap days only in real leap years", () => {
    const r = raw();
    r.startDate = { value: "2028-02-29", quote: "29 February 2028" };
    expect(
      validate(r, { ...evidence, text: text + " 29 February 2028" }).accepted
        .startDate?.value,
    ).toBe("2028-02-29");
  });
  it("rejects both endpoints of a reversed date range", () => {
    const r = raw();
    const q = "Valid from 1 October to 31 October 2026.";
    r.startDate = { value: "2026-10-31", quote: q };
    r.endDate = { value: "2026-10-01", quote: q };
    const v = validate(r);
    expect(v.accepted.startDate).toBeUndefined();
    expect(v.accepted.endDate).toBeUndefined();
    expect(v.issues).toHaveLength(2);
  });
  it("rejects a year inferred from hints or timestamps", () => {
    const r = raw();
    r.startDate = { value: "2026-10-01", quote: "1 October" };
    expect(
      validate(r, { ...evidence, text: "20% off from 1 October" }).rejected
        .startDate?.reasons,
    ).toContain("rejected_unstated_year");
  });
  it("requires explicit unrestricted all-outlet quote", () => {
    const r = raw();
    r.locationScope = { value: "all_outlets", quote: "20% off" };
    expect(validate(r).rejected.locationScope).toBeDefined();
    r.locationScope.quote = "Available at all Pepper Lunch outlets.";
    expect(validate(r).accepted.locationScope?.value).toBe("all_outlets");
    r.locationScope.quote = "all outlets except JEM";
    expect(
      validate(r, { ...evidence, text: text + " all outlets except JEM" })
        .accepted.locationScope,
    ).toBeUndefined();
  });
  it("all regular-priced items at outlets does not establish all-outlet participation", () => {
    const r = raw();
    r.locationScope = {
      value: "all_outlets",
      quote: "all regular-priced items at outlets",
    };
    expect(
      validate(r, {
        ...evidence,
        text: text + " all regular-priced items at outlets",
      }).accepted.locationScope,
    ).toBeUndefined();
  });
  it("keeps selected outlets without names unresolved", () => {
    const r = raw();
    r.locationScope = { value: "selected_outlets", quote: "Selected outlets." };
    r.locationNames = { value: [], quote: null };
    expect(validate(r).accepted.locationScope?.value).toBe("selected_outlets");
  });
  it("named outlets require names and exact name support in that quote", () => {
    const r = raw();
    r.locationScope = { value: "named_outlets", quote: "Valid at JEM." };
    expect(validate(r).rejected.locationScope?.reasons).toContain(
      "rejected_named_outlets_without_names",
    );
    r.locationNames = { value: ["JEM"], quote: "Valid at JEM." };
    expect(validate(r).accepted.locationNames?.value).toEqual(["JEM"]);
    r.locationNames.value = ["Westgate"];
    expect(validate(r).rejected.locationNames?.reasons).toContain(
      "rejected_value_not_in_source",
    );
  });
  it("cannot use a branch elsewhere in the source to rescue a different supporting quote", () => {
    const r = raw();
    r.locationNames = { value: ["JEM"], quote: "Selected outlets." };
    r.locationScope = { value: "selected_outlets", quote: "Selected outlets." };
    expect(validate(r).accepted.locationNames).toBeUndefined();
  });
  it.each([{ days: [1, 1] }, { days: [0] }, { days: [8] }])(
    "rejects duplicate/out-of-range weekdays $days",
    ({ days }) => {
      const r = raw();
      r.weekdays = { value: days, quote: "Monday to Friday" };
      expect(validate(r).rejected.weekdays?.reasons).toContain(
        "rejected_invalid_weekdays",
      );
    },
  );
  it.each([
    "opening until 5pm",
    "11am-2pm",
    "25:00–26:00",
    "11:00–12:00, 17:00–18:00",
  ])("does not coerce unsupported hours %s", (hours) => {
    const r = raw();
    r.hours = { value: hours, quote: "11:00–14:00" };
    expect(validate(r).rejected.hours?.reasons).toContain(
      "rejected_unsupported_hours",
    );
  });
  it("accepts the supported single range, including overnight", () => {
    const r = raw();
    r.hours = { value: "11:00–14:00", quote: "11:00–14:00" };
    expect(validate(r).accepted.hours).toEqual(r.hours);
    r.hours = { value: "23:00–02:00", quote: "23:00–02:00" };
    expect(
      validate(r, { ...evidence, text: text + " 23:00–02:00" }).accepted.hours,
    ).toEqual(r.hours);
  });
  it("list rules cannot invent eligibility hidden behind a copied quote", () => {
    const r = raw();
    r.eligibility = { value: ["Members only"], quote: "Students only." };
    expect(validate(r).accepted.eligibility).toBeUndefined();
  });
});
describe("classification, mapping and research isolation", () => {
  it("non-promotions clear and reject all emitted facts", () => {
    const r = raw();
    r.classification.value = "non_promotion";
    const v = validate(r);
    expect(v.accepted).toEqual({});
    expect(v.rejected.benefit?.reasons).toContain(
      "rejected_non_promotion_fact",
    );
  });
  it("non-promotions do not map to candidates", async () => {
    const r = emptyExtraction("non_promotion", "20% off");
    expect(
      mapPromotionNlpCandidate(evidence, validate(r), await context()),
    ).toBeNull();
  });
  it("uncertain cannot become complete even when facts exist", async () => {
    const r = raw();
    r.classification = { value: "uncertain", quote: null };
    const c = mapPromotionNlpCandidate(evidence, validate(r), await context())!;
    expect(c.extractionStatus).toBe("partial");
    expect(c.issues).toContain("nlp_classification_uncertain");
  });
  it("retains original evidence, selector and exact source span; timestamps never become validity", async () => {
    const c = mapPromotionNlpCandidate(
      evidence,
      validate(raw()),
      await context(),
    )!;
    expect(directPromotionCandidateSchema.safeParse(c).success).toBe(true);
    expect(c.facts.benefit).toEqual({
      evidenceIds: [evidence.evidenceId],
      selector: evidence.selector,
      quote: "20% off",
    });
    expect(c.startDate).toBeNull();
    expect(c.endDate).toBeNull();
    expect(c.publishedAt).toBeNull();
    expect(c.observedAt).toContain("2030");
  });
  it("combines grouped provenance into an exact covering source substring", async () => {
    const r = raw();
    r.startDate = {
      value: "2026-10-01",
      quote: "1 October to 31 October 2026",
    };
    r.endDate = { value: "2026-10-31", quote: "31 October 2026" };
    const c = mapPromotionNlpCandidate(evidence, validate(r), await context())!;
    expect(c.facts.validity?.quote).toBe("1 October to 31 October 2026");
    expect(normalizeSourceText(evidence.text)).toContain(
      c.facts.validity!.quote,
    );
  });
  it("registry merchant need not be repeated in source text", async () => {
    const e = { ...evidence, text: "20% off" },
      c = mapPromotionNlpCandidate(e, validate(raw(), e), await context(e))!;
    expect(c.merchant).toBe("Pepper Lunch");
    expect(c.facts.merchant?.selector).toContain(
      "trusted configuration context",
    );
  });
  it("explicit merchant conflict raises review and cannot overwrite registry", async () => {
    const e = { ...evidence, text: text + " Shake Shack" },
      r = raw();
    r.merchant = { value: "Shake Shack", quote: "Shake Shack" };
    const c = mapPromotionNlpCandidate(e, validate(r, e), await context(e))!;
    expect(c.merchant).toBe("Pepper Lunch");
    expect(c.issues).toContain("nlp_merchant_conflict:Shake Shack");
    expect(c.extractionStatus).not.toBe("complete");
  });
  it("mapping boundary revalidates supplied accepted facts and source identity", async () => {
    const v = validate(raw());
    v.accepted.benefit = { value: "50% off", quote: "not present" };
    const c = mapPromotionNlpCandidate(evidence, v, await context())!;
    expect(c.benefit).toBeNull();
    expect(() =>
      mapPromotionNlpCandidate(
        { ...evidence, sourceId: "shake_shack_sg" },
        v,
        {} as never,
      ),
    ).toThrow();
  });
  it("research blocker prevents publication under the unchanged gate", async () => {
    const c = mapPromotionNlpCandidate(
      evidence,
      validate(raw()),
      await context(),
    )!;
    const decision = evaluateDirectPublication(c, {
      asOf: "2026-10-02",
      acquisitionReady: true,
      outlets: [],
      outletsVerified: true,
      outletIssues: [],
      verifiedAt: "2026-10-02T00:00:00.000Z",
    });
    expect(decision.result).toBe("needs_review");
    expect(decision.reasons).toContain("promotion_nlp_research_only");
    expect(decision.promotion).toBeNull();
  });
});
describe("reviewed captured benchmark and deterministic scoring", () => {
  it("verifies every capture, gold field, and checked output without network", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network_forbidden"));
    try {
      const b = await loadReviewedBenchmark();
      expect(b.benchmark.cases).toHaveLength(49);
      const provider = new FixturePromotionNlpProvider(checkedOutputs);
      for (const c of cases) {
        const e = benchmarkEvidence(c),
          first = await provider.extract(e);
        expect(await provider.extract(e)).toEqual(first);
        const v = validatePromotionExtraction(e, first);
        expect(v.issues, c.id).toEqual([]);
        const mapped = await capturedCandidate(c, v);
        if (mapped) {
          expect(directPromotionCandidateSchema.safeParse(mapped).success).toBe(
            true,
          );
          expect(mapped.extractionStatus).not.toBe("complete");
        }
      }
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
  it("Bari input contains only its exact card, regardless of detail-template related text", async () => {
    const c = cases.find((c) => c.id === "bari_bari_steak_sg-promotions-5")!;
    expect(c.sourceText).toBe(
      "1 for 1 Highball, Beers, Sake, Cocktails and House Pours",
    );
    expect(c.sourceText).not.toMatch(/15%|20%|23%/);
    const detail = await readFile(
      "tests/fixtures/coverage-batch-2/baribaristeak/details-1/d314f832ff5d18d0a055b8e817003024d4159b8c43bba1b463b2a6e040ea384d.html",
      "utf8",
    );
    expect(load(detail)("body").text()).toMatch(/15\s*%|20\s*%|23\s*%/);
    const html = await readFile(c.sourceReference.file, "utf8"),
      $ = load(html);
    $("body").append(
      "<aside>RELATED: 99% off at Orchard, valid 2026-12-31</aside>",
    );
    expect(isolateCapturedText($.html(), c.sourceReference)).toBe(c.sourceText);
    const provider = new FixturePromotionNlpProvider(checkedOutputs);
    const spy = vi.spyOn(provider, "extract");
    await provider.extract(benchmarkEvidence(c));
    expect(spy.mock.calls[0][0].text).toBe(c.sourceText);
  });
  it("neighboring Pepper and FairPrice campaign data is excluded", () => {
    const pepper = cases.find(
      (c) => c.id === "pepper_lunch_sg-uper-value-deal",
    )!;
    expect(pepper.sourceText).not.toContain("Student Meal");
    expect(pepper.sourceText).not.toContain("Have Your Meals Delivered");
    const fair = cases.find((c) => c.id.includes("fairprice_sg-price"))!;
    expect(fair.sourceText).not.toContain("Finest Monthly Wine");
  });
  it("McDonald's meal gold never borrows embedded contest validity", async () => {
    const c = cases.find((c) => c.id === "mcdonalds_sg-bfmcsaver")!;
    expect(c.sourceText).toContain(
      "Contest Submission Period: 1 October to 15 October 2026",
    );
    const v = validatePromotionExtraction(
      benchmarkEvidence(c),
      checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
    );
    expect(v.accepted.startDate).toBeUndefined();
    expect(v.accepted.endDate).toBeUndefined();
    const mapped = await capturedCandidate(c, v);
    expect(mapped?.startDate).toBeNull();
    expect(mapped?.endDate).toBeNull();
  });
  it("Sushiro unstated year remains unknown despite date-bearing URL", () => {
    const c = cases.find((c) => c.sourceId === "sushiro_sg")!;
    expect(c.expectedUnknownFacts).toContain("startDate");
    const r = emptyExtraction("promotion", "23 Sep – 6 Oct");
    r.startDate = { value: "2026-09-23", quote: "23 Sep – 6 Oct" };
    expect(
      validatePromotionExtraction(benchmarkEvidence(c), r).rejected.startDate
        ?.reasons,
    ).toContain("rejected_unstated_year");
  });
  it("Captain venue and takeaway layouts use the same schema", () => {
    const captain = cases.filter((c) => c.sourceId === "captain_kim_sg");
    expect(captain).toHaveLength(5);
    expect(captain.some((c) => c.tags.includes("takeaway-layout"))).toBe(true);
    expect(captain.some((c) => c.tags.includes("venue-layout"))).toBe(true);
    for (const c of captain)
      expect(
        promotionTextEvidenceSchema.safeParse(benchmarkEvidence(c)).success,
      ).toBe(true);
  });
  it("scores deterministically and records misses and current-parser advantages", () => {
    const c = cases.find((c) => c.id === "pepper_lunch_sg-uper-value-deal")!;
    const r = structuredClone(
      checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
    ) as RawPromotionExtraction;
    r.startDate = { value: null, quote: null };
    const v = validatePromotionExtraction(benchmarkEvidence(c), r),
      first = scoreBenchmarkCase(c, r, v);
    expect(scoreBenchmarkCase(c, r, v)).toEqual(first);
    expect(first.fields.startDate.missed_supported_fact).toBe(1);
    expect(first.comparison.startDate).toBe(
      "current_parser_correct_nlp_missed",
    );
  });
  it("counts classification quote mismatches separately from fact mismatches", () => {
    const c = cases[0],
      r = structuredClone(
        checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
      ) as RawPromotionExtraction;
    r.classification.quote = "fabricated classification quote";
    const score = scoreBenchmarkCase(
      c,
      r,
      validatePromotionExtraction(benchmarkEvidence(c), r),
    );
    expect(score.classificationQuoteMismatch).toBe(1);
    expect(summarizeBenchmark([score]).evidence_quote_mismatch).toBe(1);
  });
  it("counts quote mismatch, malformed-output hallucinations and caught inventions", () => {
    const c = cases.find((c) => c.id === "bari_bari_steak_sg-promotions-5")!,
      r = structuredClone(
        checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
      ) as RawPromotionExtraction;
    r.endDate = { value: "2026-12-31", quote: "not in source" };
    let s = scoreBenchmarkCase(
      c,
      r,
      validatePromotionExtraction(benchmarkEvidence(c), r),
    );
    expect(s.fields.endDate).toMatchObject({
      rawUnsupported: 1,
      caught: 1,
      survived: 0,
      evidence_quote_mismatch: 1,
      validator_rejection: 1,
    });
    const malformed = { ...r, unexpected: true };
    s = scoreBenchmarkCase(
      c,
      malformed,
      validatePromotionExtraction(benchmarkEvidence(c), malformed),
    );
    expect(s.fields.endDate.caught).toBe(1);
  });
  it("exposes an unrelated exact contest quote surviving structural validation", () => {
    const c = cases.find((c) => c.id === "mcdonalds_sg-bfmcsaver")!,
      r = structuredClone(
        checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
      ) as RawPromotionExtraction;
    r.startDate = {
      value: "2026-10-01",
      quote: "Contest Submission Period: 1 October to 15 October 2026",
    };
    r.endDate = { value: "2026-10-15", quote: r.startDate.quote };
    const v = validatePromotionExtraction(benchmarkEvidence(c), r),
      summary = summarizeBenchmark([scoreBenchmarkCase(c, r, v)]);
    expect(summary.raw_model_hallucinations).toBe(2);
    expect(summary.hallucinations_caught_by_validator).toBe(0);
    expect(summary.unsupported_fact_survived_validation).toBe(2);
    expect(summary.unsupported_critical_fact_survived_validation).toBe(2);
  });
  it("does not treat existing parser as gold and covers useful additional supported facts", () => {
    const c = cases.find((c) => c.id === "shake_shack_sg-flock-this-way")!;
    expect(c.expectedClassification.value).toBe("promotion");
    expect(c.currentParser.classification).toBe("non_promotion");
    const r = checkedOutputs[`${c.evidenceId}:${c.nativeId}`],
      s = scoreBenchmarkCase(
        c,
        r,
        validatePromotionExtraction(benchmarkEvidence(c), r),
      );
    expect(s.comparison.startDate).toBe("nlp_correct_additional_fact");
  });
  it("requires a partition of supported versus unknown gold facts", () => {
    const c = structuredClone(cases[0]);
    c.expectedUnknownFacts.push("benefit");
    expect(
      benchmarkSchema.safeParse({
        version: 1,
        reviewedAt: "2026-10-02",
        reviewBasis: "test",
        cases: [c],
      }).success,
    ).toBe(false);
  });
  it("writes distinct offline run directories and all four artifacts without secrets or network", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network_forbidden"));
    const directories: string[] = [];
    try {
      for (let i = 0; i < 2; i++) {
        const run = await runPromotionNlpBenchmark({ live: false, limit: 1 });
        directories.push(run.runDirectory);
        expect(run.metadata.mode).toBe("offline");
        expect(run.metadata.provider.provider).toBe("fixture");
        for (const name of [
          "results.json",
          "failures.json",
          "run-metadata.json",
          "report.md",
        ])
          expect(
            (await readFile(`${run.runDirectory}/${name}`, "utf8")).length,
          ).toBeGreaterThan(0);
      }
      expect(directories[0]).not.toBe(directories[1]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
      for (const directory of directories)
        await rm(directory, { recursive: true, force: true });
    }
  });
  it("provider failures are scored in denominators and sanitized in artifacts", async () => {
    const run = await runPromotionNlpBenchmark({
      live: false,
      limit: 1,
      provider: {
        metadata: new FixturePromotionNlpProvider({}).metadata,
        extract: async () => {
          throw new Error("sensitive-provider-error-secret");
        },
      },
    });
    try {
      expect(run.metadata.errors).toBe(1);
      expect(run.metadata.summary.classification.promotion_recall).toBe(0);
      expect(
        await readFile(`${run.runDirectory}/results.json`, "utf8"),
      ).not.toContain("sensitive-provider-error-secret");
    } finally {
      await rm(run.runDirectory, { recursive: true, force: true });
    }
  });
  it("unknown cases/CLI arguments cannot silently trigger live evaluation", () => {
    expect(parseBenchmarkArgs([]).live).toBe(false);
    expect(parseBenchmarkArgs(["--live", "--limit", "2"]).live).toBe(true);
    expect(() => parseBenchmarkArgs(["--limit", "0"])).toThrow();
    expect(() => parseBenchmarkArgs(["--livee"])).toThrow();
    expect(() => parseBenchmarkArgs(["--limit", "1000"])).toThrow();
  });
  it("preserves original protected bytes, activation states and direct-source-v2", async () => {
    const hashes = JSON.parse(
      await readFile(
        "tests/fixtures/promotion-nlp/protected-baseline.json",
        "utf8",
      ),
    ) as Record<string, string>;
    for (const [file, sha] of Object.entries(hashes))
      expect(
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
        file,
      ).toBe(sha);
    expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
    expect(
      directSources.filter((s) => s.publicationPolicy.enabled).map((s) => s.id),
    ).toEqual(["pepper_lunch_sg", "shake_shack_sg"]);
  });
});
describe("hosted evaluation provider without network or credentials", () => {
  const config = {
    apiKey: "unit-test-key",
    model: "test-model",
    timeoutMs: 100,
    maxOutputTokens: 4096,
  };
  const respond = (output: unknown) =>
    new Response(
      JSON.stringify({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(output) }],
          },
        ],
      }),
      { status: 200 },
    );
  it("requires configured credentials/model only for live construction", () => {
    expect(() => hostedConfigFromEnvironment({})).toThrow(
      "promotion_nlp_credentials_absent",
    );
    expect(() =>
      hostedConfigFromEnvironment({ OPENAI_API_KEY: "test" }),
    ).toThrow("promotion_nlp_model_unconfigured");
  });
  it("a hosted provider cannot run through offline benchmark mode", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(
      runPromotionNlpBenchmark({
        live: false,
        limit: 1,
        provider: new OpenAiPromotionNlpProvider(config, transport),
      }),
    ).rejects.toThrow("promotion_nlp_live_flag_required");
    expect(transport).not.toHaveBeenCalled();
  });
  it("makes one strict bounded request with no credentials in safe metadata", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(respond(raw())),
      provider = new OpenAiPromotionNlpProvider(config, transport);
    expect(await provider.extract(evidence)).toEqual(raw());
    expect(transport).toHaveBeenCalledTimes(1);
    const options = transport.mock.calls[0][1]!,
      payload = JSON.parse(options.body as string);
    expect(payload.text.format.strict).toBe(true);
    expect(payload.store).toBe(false);
    expect(payload.temperature).toBe(0);
    expect(payload.max_output_tokens).toBe(4096);
    expect(options.redirect).toBe("error");
    expect(
      JSON.stringify({
        metadata: provider.metadata,
        settings: provider.settings,
      }),
    ).not.toContain(config.apiKey);
  });
  it("omits temperature for models that do not support it", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(respond(raw()));
    await new OpenAiPromotionNlpProvider(
      { ...config, temperature: null },
      transport,
    ).extract(evidence);
    expect(
      JSON.parse(transport.mock.calls[0][1]!.body as string).temperature,
    ).toBeUndefined();
  });
  it("does not retry HTTP errors or persist vendor error bodies", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("secret error body", { status: 429 }));
    await expect(
      new OpenAiPromotionNlpProvider(config, transport).extract(evidence),
    ).rejects.toThrow("promotion_nlp_http_429");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("times out once without retry", async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    await expect(
      new OpenAiPromotionNlpProvider(
        { ...config, timeoutMs: 5 },
        transport,
      ).extract(evidence),
    ).rejects.toThrow("promotion_nlp_timeout");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: "incomplete", output: [] },
    {
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal" }] }],
    },
    {
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "invalid json" }],
        },
      ],
    },
  ])("refusals, truncation and malformed JSON fail closed", async (payload) => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(payload)));
    await expect(
      new OpenAiPromotionNlpProvider(config, transport).extract(evidence),
    ).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("bounds response bodies even without content-length", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("x".repeat(200_001)));
    await expect(
      new OpenAiPromotionNlpProvider(config, transport).extract(evidence),
    ).rejects.toThrow("promotion_nlp_response_too_large");
  });
  it("rejects oversized input before any model request", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(
      new OpenAiPromotionNlpProvider(config, transport).extract({
        ...evidence,
        text: "x".repeat(20_001),
      }),
    ).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
});
