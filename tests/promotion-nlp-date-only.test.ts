import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  DATE_ONLY_PROMPT,
  dateOnlyOutputSchema,
  dateOnlyPromptInput,
  extractDateOnlyCampaign,
  projectV4ToDateOnly,
  validateDateOnlyExtraction,
  type DateOnlyOutput,
} from "@/ingestion/promotion-nlp/date-only-profile";
import { assessDateOnlyCore } from "@/ingestion/promotion-nlp/date-only-evaluation";
import { benchmarkSchemaV4 } from "@/ingestion/promotion-nlp/benchmark-v4";
import type { PromotionTextEvidence } from "@/ingestion/promotion-nlp/types";
import type { EvidenceV4 } from "@/ingestion/promotion-nlp/schema-v4";
import {
  DATE_ONLY_V4_RUN,
  dateOnlyReplayMarkdown,
  replayDateOnlyV4,
} from "../scripts/research/promotion-nlp-date-only-replay";

const source =
  "Example Lunch: 20% OFF. Valid from 1 – 31 Oct 2026. Available at JEM.\nWeekdays, 5:30pm Timeslots Only. Flash this page. Takeaway only. Book with EB.";
const input: PromotionTextEvidence = {
  sourceId: "example_test",
  canonicalUrl: "https://example.test/2020/01/01/offer",
  nativeId: "offer",
  evidenceId: "captured_test",
  selector: "article#offer",
  merchantHint: "Example",
  titleHint: null,
  text: source,
};
function output(): DateOnlyOutput {
  return {
    classification: { value: "economic_offer", quote: "20% OFF" },
    merchant: { value: null, quote: null },
    title: { value: "Example Lunch", quote: "Example Lunch" },
    benefit: { value: "20% OFF", quote: "20% OFF" },
    startDate: { value: "2026-10-01", quote: "Valid from 1 – 31 Oct 2026." },
    endDate: { value: "2026-10-31", quote: "Valid from 1 – 31 Oct 2026." },
    locationScope: { value: "named_outlets", quote: "Available at JEM." },
    locationRules: [
      { role: "participating", names: ["JEM"], quote: "Available at JEM." },
    ],
  };
}
type HistoricalTask = {
  taskId: string;
  caseId: string;
  input: {
    evidence: EvidenceV4[];
    proposition: { anchorEvidenceIds: string[] };
  };
};
let cases: ReturnType<typeof benchmarkSchemaV4.parse>["cases"];
let tasks: HistoricalTask[];
let rawRows: { taskId: string; rawOutput: string }[];
beforeAll(async () => {
  cases = benchmarkSchemaV4.parse(
    JSON.parse(
      await readFile("tests/fixtures/promotion-nlp/benchmark-v4.json", "utf8"),
    ),
  ).cases;
  tasks = JSON.parse(
    await readFile(path.join(DATE_ONLY_V4_RUN, "stage5-tasks.json"), "utf8"),
  ).tasks;
  rawRows = JSON.parse(
    await readFile(
      path.join(DATE_ONLY_V4_RUN, "stage5-raw-results.json"),
      "utf8",
    ),
  );
});
function historic(taskId: string) {
  const task = tasks.find((t) => t.taskId === taskId)!;
  const c = cases.find((c) => c.id === task.caseId)!;
  const raw = JSON.parse(rawRows.find((r) => r.taskId === taskId)!.rawOutput);
  const projected = projectV4ToDateOnly(
    raw,
    task.input.evidence,
    task.input.proposition.anchorEvidenceIds,
  );
  return {
    c,
    raw,
    projected,
    validation: validateDateOnlyExtraction(
      { ...input, text: c.sourceText },
      projected,
    ),
  };
}

describe("full-source campaign-date profile", () => {
  it("copies complete Description including formatting instead of generating conditions", () => {
    const result = validateDateOnlyExtraction(input, output());
    expect(result.contractValid).toBe(true);
    expect(result.candidate?.description).toBe(source);
    expect(result.candidate?.description).toContain(
      "Flash this page. Takeaway only.",
    );
    expect(result.candidate?.researchOnly).toBe(true);
    expect(result.unresolved).toEqual([]);
  });

  it.each([
    "description",
    "hours",
    "weekdays",
    "timeConstraints",
    "constraints",
  ])(
    "does not accept a model-generated %s field in the new contract",
    (name) => {
      expect(
        dateOnlyOutputSchema.safeParse({ ...output(), [name]: [] }).success,
      ).toBe(false);
    },
  );

  it("gives a provider complete original text without URL/date metadata", async () => {
    const extract = vi.fn(async () => output());
    const result = await extractDateOnlyCampaign(
      {
        metadata: { provider: "test-fixture", model: "no-model-executed" },
        extract,
      },
      input,
    );
    expect(extract).toHaveBeenCalledWith({
      CONTEXT_HINTS: { merchant: "Example", title: null },
      SOURCE_TEXT: source,
    });
    expect(JSON.stringify(dateOnlyPromptInput(input))).not.toContain(
      "2020/01/01",
    );
    expect(result.validation.candidate?.description).toBe(source);
    expect(DATE_ONLY_PROMPT).toContain("Contest submission");
  });

  it("keeps missing dates and selected participants unresolved rather than inventing them", () => {
    const raw = output();
    raw.startDate = { value: null, quote: null };
    raw.endDate = { value: null, quote: null };
    raw.locationScope = {
      value: "selected_outlets",
      quote: "Available at JEM.",
    };
    raw.locationRules = [];
    const result = validateDateOnlyExtraction(input, raw);
    expect(result.contractValid).toBe(true);
    expect(result.unresolved).toEqual([
      "missing_start_date",
      "missing_end_date",
      "physical_participation_unresolved",
    ]);
  });

  it("rejects a quote absent from the full original source", () => {
    const raw = output();
    raw.startDate.quote = "Valid through 2026.";
    expect(validateDateOnlyExtraction(input, raw).issues).toContain(
      "missing_or_non_source_quote:startDate",
    );
  });

  it("does not treat whitespace-only quoted benefits as complete facts", () => {
    const raw = output();
    raw.benefit = { value: " ", quote: " " };
    expect(validateDateOnlyExtraction(input, raw).contractValid).toBe(false);
  });

  it("rejects an unsupported year despite a real date-less quote", () => {
    const raw = output();
    raw.startDate.quote = "Example Lunch";
    expect(validateDateOnlyExtraction(input, raw).issues).toContain(
      "unstated_year:startDate",
    );
  });

  it("rejects invalid and reversed calendar dates", () => {
    const invalid = output();
    invalid.startDate.value = "2026-02-30";
    expect(validateDateOnlyExtraction(input, invalid).issues).toContain(
      "invalid_calendar_date:startDate",
    );
    const reversed = output();
    reversed.startDate.value = "2026-10-31";
    reversed.endDate.value = "2026-10-01";
    expect(validateDateOnlyExtraction(input, reversed).issues).toContain(
      "reversed_date_range",
    );
  });

  it("keeps field value provenance instead of accepting fabricated benefits", () => {
    const raw = output();
    raw.benefit.value = "50% OFF";
    expect(validateDateOnlyExtraction(input, raw).issues).toContain(
      "nonverbatim_benefit",
    );
  });

  it("rejects invented participant names and role conflicts", () => {
    const invented = output();
    invented.locationRules[0].names = ["Orchard"];
    expect(validateDateOnlyExtraction(input, invented).issues).toContain(
      "nonverbatim_location:Orchard",
    );
    const conflicted = output();
    conflicted.locationRules.push({
      ...conflicted.locationRules[0],
      role: "excluded",
    });
    expect(validateDateOnlyExtraction(input, conflicted).issues).toContain(
      "conflicting_location_roles",
    );
  });

  it("does not turn all items at outlets into universal participation", () => {
    const raw = output();
    raw.locationScope = { value: "all_outlets", quote: "All items at outlets" };
    raw.locationRules = [];
    expect(
      validateDateOnlyExtraction(
        { ...input, text: source + " All items at outlets" },
        raw,
      ).issues,
    ).toContain("all_scope_without_explicit_wording");
  });

  it("flags long source text without truncating it", () => {
    const long = source + "x".repeat(5000);
    const result = validateDateOnlyExtraction(
      { ...input, text: long },
      output(),
    );
    expect(result.candidate?.description).toBe(long);
    expect(result.unresolved).toContain(
      "description_exceeds_publication_limit",
    );
  });

  it("does not accept named scope without an explicit participant rule", () => {
    const raw = output();
    raw.locationRules = [];
    expect(validateDateOnlyExtraction(input, raw).issues).toContain(
      "named_scope_without_participating_rule",
    );
  });

  it("treats a structural quote pass and correct campaign-date ownership separately", () => {
    const c = cases.find((c) => c.id === "mcdonalds_sg-bfmcsaver")!;
    const raw = output();
    raw.title = { value: null, quote: null };
    raw.benefit = {
      value: "Breakfast Wrap McSaver™ Meal for just $6.50.",
      quote: "Breakfast Wrap McSaver™ Meal for just $6.50.",
    };
    raw.classification.quote = raw.benefit.quote;
    raw.startDate = {
      value: "2026-10-01",
      quote: "Contest Submission Period: 1 October to 15 October 2026",
    };
    raw.endDate = { value: "2026-10-15", quote: raw.startDate.quote };
    raw.locationScope = { value: null, quote: null };
    raw.locationRules = [];
    const result = validateDateOnlyExtraction(
      { ...input, text: c.sourceText },
      raw,
    );
    expect(result.contractValid).toBe(true);
    expect(result.candidate?.researchOnly).toBe(true);
    expect(
      assessDateOnlyCore(raw, [c.expected.offer]).dateAnnotationMatch,
    ).toBe(false);
  });
});

describe("original captured failure regressions", () => {
  it.each(["weekday_dinner_early_bird", "weekend_lunch_dinner_early_bird"])(
    "retains correct campaign dates despite historical %s clock fields",
    (suffix) => {
      const h = historic(
        `captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2::${suffix}`,
      );
      expect(h.validation.contractValid).toBe(true);
      expect(h.projected.startDate.value).toBe("2026-10-01");
      expect(h.projected.endDate.value).toBe("2026-10-31");
      expect(h.validation.candidate?.description).toBe(h.c.sourceText);
      expect(h.validation.candidate?.description).toContain(
        "prebook on web link and key in “EB”",
      );
      expect(h.projected).not.toHaveProperty("timeConstraints");
      expect(h.validation.unresolved).toContain(
        "physical_participation_unresolved",
      );
    },
  );

  it("restores omitted restrictions by copying source rather than repairing the old LLM answer", () => {
    const h = historic("captain_kim_sg-captain-kim-delivery::offer_1");
    expect(h.raw.constraints).toHaveLength(1);
    expect(h.validation.candidate?.description).toBe(
      "Flash this page to enjoy 20% OFF All Regular Items - Takeaway only!",
    );
    expect(h.validation.unresolved).toContain("missing_end_date");
  });

  it("permits one source campaign Description to retain both Bari time/branch groups", () => {
    const h = historic("bari_bari_steak_sg-promotions-2::p1");
    expect(h.validation.candidate?.description).toContain(
      "All-Day Free-Flow Salad Bar: Available at Tampines 1 and VivoCity.",
    );
    expect(h.validation.candidate?.description).toContain(
      "Tea-Time Free-Flow Salad Bar (2 PM – 5 PM): Available at Junction 8 and Great World.",
    );
    expect(
      assessDateOnlyCore(h.projected, [
        h.c.expected.all_day,
        h.c.expected.tea_time,
      ]).participationAnnotationMatch,
    ).toBe(true);
    expect(h.validation.unresolved).toContain("missing_start_date");
  });

  it("does not merge incompatible annotated campaign date windows", () => {
    const h = historic("bari_bari_steak_sg-promotions-2::p1");
    const different = {
      ...h.c.expected.tea_time,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    };
    expect(
      assessDateOnlyCore(h.projected, [h.c.expected.all_day, different])
        .findings,
    ).toContain("incompatible_campaign_windows");
  });

  it("replays sealed input deterministically without claiming a fresh model or map rate", async () => {
    const first = await replayDateOnlyV4();
    const second = await replayDateOnlyV4();
    expect(second).toEqual(first);
    expect(first.report.inputs.sourceEnvelopes).toBe(49);
    expect(first.report.inputs.rawNormalizationUnits).toBe(34);
    expect(first.report.metrics.sourceDescriptionPreserved.numerator).toBe(34);
    expect(first.report.metrics.newPromptModelSuccessRate).toBeNull();
    expect(first.report.metrics.endToEndAutomaticMapRate).toBeNull();
    expect(first.prepared.cases).toHaveLength(49);
    expect(dateOnlyReplayMarkdown(first.report)).toContain(
      "not a new model experiment",
    );
  });
});
