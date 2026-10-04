import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { promotionSchema, sourceSchema } from "@/domain/promotion";
import {
  acquisitionReady,
  directRevisionHash,
  directPromotionId,
  evaluateDirectPublication,
  singaporeObservationDate,
  mapDirectPublication,
  trustedDirectSource,
  type DirectResolvedContext,
} from "@/ingestion/direct-sources/publication";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { parseIngestArgs } from "../scripts/direct-source-ingest";
import { contentHash, makeEvidence } from "@/ingestion/direct-sources/evidence";
import {
  parsePepperOutlets,
  pepperOutletUrl,
} from "@/ingestion/direct-sources/adapters/pepper-outlets";
import {
  capturedPepperRun,
  capturedOutletResolver,
} from "./helpers/direct-source-fixtures";
import { fingerprint } from "@/server/db/publication";

async function complete() {
  const run = await capturedPepperRun({ complete: true });
  const candidate = run.candidates[0];
  const context: DirectResolvedContext = {
    ...(await capturedOutletResolver()(candidate)),
    acquisitionReady: acquisitionReady(run),
    verifiedAt: run.observedAt,
    asOf: singaporeObservationDate(run.observedAt),
  };
  return { run, candidate, context };
}
describe("deterministic direct publication", () => {
  it("accepts complete authoritative facts and verified physical outlets despite optional unknowns", async () => {
    const { candidate, context } = await complete();
    const decision = evaluateDirectPublication(candidate, context);
    expect(decision.result).toBe("ready");
    expect(decision.promotion?.category).toBe("Meals");
    expect(decision.promotion?.outlets.map((o) => o.name)).toEqual(["JEM"]);
    expect(
      decision.issues.find((i) => i.code === "eligibility_unknown")?.severity,
    ).toBe("informational");
    expect(decision.promotion?.hours).toBeNull();
    expect(decision.promotion?.weekdays).toBeNull();
  });
  it.each([
    ["startDate", null, "missing_start_date"],
    ["endDate", null, "missing_end_date"],
    ["locationScope", "source_unspecified", "source_unspecified_locations"],
    ["locationScope", "selected_outlets", "selected_outlets_unresolved"],
    ["locationNames", [], "named_outlets_missing"],
    [
      "issues",
      ["multi_offer_page_requires_association"],
      "multi_offer_page_requires_association",
    ],
    ["issues", ["validity_unparsed"], "validity_unparsed"],
    ["issues", ["validity_contradictory"], "validity_contradictory"],
    ["issues", ["unknown_new_issue"], "unknown_new_issue"],
    ["hours", "lunch hours", "unsupported_source_hours"],
  ])("queues %s=%j", async (field, value, reason) => {
    const { candidate, context } = await complete();
    const result = evaluateDirectPublication(
      {
        ...candidate,
        [field]: value,
        ...(field === "locationScope" && value === "selected_outlets"
          ? { locationNames: [] }
          : {}),
      },
      context,
    );
    expect(result.result).toBe("needs_review");
    expect(result.reasons).toContain(reason);
    expect(result.promotion).toBeNull();
  });
  it.each(["title", "benefit", "description", "terms"] as const)(
    "missing %s never receives a campaign default",
    async (field) => {
      const { candidate, context } = await complete();
      const result = evaluateDirectPublication(
        { ...candidate, [field]: null },
        context,
      );
      expect(result.result).toBe("needs_review");
      expect(result.draft[field]).toEqual(field === "terms" ? [] : "");
    },
  );
  it("blocks failed outlet or acquisition verification", async () => {
    const { candidate, context } = await complete();
    expect(
      evaluateDirectPublication(candidate, {
        ...context,
        outletsVerified: false,
      }).reasons,
    ).toContain("physical_outlets_unresolved");
    expect(
      evaluateDirectPublication(candidate, {
        ...context,
        acquisitionReady: false,
      }).reasons,
    ).toContain("source_acquisition_blocked");
  });
  it("declared source merchant/category can populate stable facts without inventing campaign facts", async () => {
    const { candidate, context } = await complete();
    const unknownMerchant = {
      ...candidate,
      merchant: null,
      issues: [...candidate.issues, "merchant_unknown"],
    };
    const result = evaluateDirectPublication(unknownMerchant, context);
    expect(result.result).toBe("ready");
    expect(result.draft.merchant).toBe("Pepper Lunch");
    expect(result.draft.category).toBe("Meals");
    expect(result.draft.hours).toBeNull();
    expect(result.draft.weekdays).toBeNull();
  });
  it("selected scope with exact participating names resolves only those names", async () => {
    const { candidate, run } = await complete();
    const selected = {
      ...candidate,
      locationScope: "selected_outlets" as const,
    };
    const context = {
      ...(await capturedOutletResolver()(selected)),
      acquisitionReady: true,
      verifiedAt: run.observedAt,
      asOf: singaporeObservationDate(run.observedAt),
    };
    expect(context.outlets.map((o) => o.name)).toEqual(["JEM"]);
    expect(evaluateDirectPublication(selected, context).result).toBe("ready");
  });
  it("copies eligibility and redemption verbatim with exact dedupe", async () => {
    const run = await capturedPepperRun({
      complete: true,
      edit: (body) =>
        body.replace(
          "Available only at JEM.",
          "Available only at JEM.<br>Students only.<br>Present your student card for dine-in.",
        ),
    });
    const candidate = run.candidates[0];
    const context = {
      ...(await capturedOutletResolver()(candidate)),
      acquisitionReady: true,
      verifiedAt: run.observedAt,
      asOf: singaporeObservationDate(run.observedAt),
    };
    const draft = mapDirectPublication(candidate, context);
    expect(draft.terms).toContain("Students only.");
    expect(draft.terms).toContain("Present your student card for dine-in.");
    expect(new Set(draft.terms).size).toBe(draft.terms?.length);
  });
  it("publication metadata cannot populate campaign validity", async () => {
    const run = await capturedPepperRun({
      complete: true,
      edit: (body) =>
        body
          .replace("Available from 1 September to 31 October 2026.", "")
          .replace(
            "<body>",
            '<head><meta property="article:published_time" content="2026-09-01T00:00:00Z"></head><body>',
          ),
    });
    const { context } = await complete();
    const draft = mapDirectPublication(run.candidates[0], context);
    expect(draft.startDate).toBeNull();
    expect(draft.endDate).toBeNull();
    expect(evaluateDirectPublication(run.candidates[0], context).result).toBe(
      "needs_review",
    );
  });
  it("explicit unrepresented weekday/holiday restrictions block", async () => {
    const { candidate, context } = await complete();
    for (const line of [
      "Valid on weekdays only.",
      "Excludes public holidays.",
      "Valid after 2pm.",
    ]) {
      const changed = { ...candidate, terms: [...candidate.terms!, line] };
      expect(evaluateDirectPublication(changed, context).result).toBe(
        "needs_review",
      );
    }
  });
  it("same bytes/time-independent revision hashes and stable promotion UUIDs", async () => {
    const a = await capturedPepperRun({ complete: true }),
      b = await capturedPepperRun({
        complete: true,
        observedAt: "2026-10-01T14:00:00.000Z",
      });
    expect(directRevisionHash(a.candidates[0])).toBe(
      directRevisionHash(b.candidates[0]),
    );
    expect(
      directRevisionHash({
        ...a.candidates[0],
        evidence: [...a.candidates[0].evidence].reverse(),
      }),
    ).toBe(directRevisionHash(a.candidates[0]));
    expect(directPromotionId(a.source.id, a.candidates[0].candidateId)).toBe(
      directPromotionId(b.source.id, b.candidates[0].candidateId),
    );
    const changed = await capturedPepperRun({
      complete: true,
      edit: (body) =>
        body.replace(
          "Not valid with other promotions",
          "Not valid with other discounts",
        ),
    });
    expect(directRevisionHash(changed.candidates[0])).not.toBe(
      directRevisionHash(a.candidates[0]),
    );
  });
  it("mixed direct/legacy arrays parse; HTTPS/direct identity validation is explicit", async () => {
    const { candidate, context } = await complete();
    const p = evaluateDirectPublication(candidate, context).promotion!;
    const legacy = {
      label: "Historical signal",
      url: "https://t.me/sgfooddeals/1",
    };
    expect(sourceSchema.parse(legacy)).toEqual(legacy);
    expect(
      promotionSchema.parse({ ...p, sources: [...p.sources, legacy] }).sources,
    ).toHaveLength(2);
    expect(
      sourceSchema.safeParse({
        ...p.sources[0],
        url: "http://www.pepperlunch.com.sg/promo/",
      }).success,
    ).toBe(false);
    expect(() =>
      trustedDirectSource(
        sourceDefinition(candidate.sourceId),
        "https://evil.example/offer",
      ),
    ).toThrow();
    expect(fingerprint({ ...p, sources: [...p.sources, legacy] })).toBe(
      fingerprint(p),
    );
  });
  it("requires a single explicit enabled source and rejects --all", () => {
    expect(parseIngestArgs(["--source", "pepper_lunch_sg"]).id).toBe(
      "pepper_lunch_sg",
    );
    for (const args of [
      [],
      ["--all"],
      ["--source", "paradise_group_sg"],
      ["--source", "unknown"],
      ["--source", "pepper_lunch_sg", "--all"],
    ])
      expect(() => parseIngestArgs(args)).toThrow();
    expect(
      sourceDefinition("paradise_group_sg").publicationPolicy.enabled,
    ).toBe(false);
  });
});
it("the seven-offer fixture retains every original captured response byte", async () => {
  const root = "tests/fixtures/direct-sources/pepper-captured-seven/";
  const provenance = JSON.parse(
    await readFile(root + "capture-provenance.json", "utf8"),
  );
  const manifest = JSON.parse(await readFile(root + "manifest.json", "utf8"));
  for (const capture of provenance.captures) {
    const body = await readFile(root + manifest.pages[capture.url].path);
    expect(contentHash(body)).toBe(capture.contentHash);
    expect(body.length).toBe(capture.bytes);
  }
});

describe("source-specific Pepper directory", () => {
  async function page() {
    const body = await readFile(
      "tests/fixtures/direct-sources/pepper-outlets.html",
    );
    return {
      body,
      evidence: makeEvidence(
        "pepper_lunch_sg",
        pepperOutletUrl,
        pepperOutletUrl,
        "listing",
        body,
        "text/html",
        200,
        "2026-10-01T00:00:00.000Z",
      ),
    };
  }
  it("enumerates all captured branch identities and explicit restaurant scope without trusting map coordinates", async () => {
    const p = await page(),
      all = parsePepperOutlets(p, null),
      restaurants = parsePepperOutlets(
        p,
        "Available at all Pepper Lunch restaurants.",
      );
    expect(all.authoritative).toBe(true);
    expect(all.branches).toHaveLength(24);
    expect(restaurants.branches).toHaveLength(9);
    expect(all.branches.every((b) => b.resolvedPlace === undefined)).toBe(true);
  });
  it("refuses missing cards, marker/address mismatch and changed pagination", async () => {
    const p = await page();
    for (const edit of [
      (s: string) => s.replace('data-marker="0"', 'data-marker="99"'),
      (s: string) => s.replace("#03-11 Hougang Mall", "#03-12 Hougang Mall"),
      (s: string) =>
        s.replace(
          'class="branchlist__container"',
          'class="branchlist__container"><button>Load more</button><div',
        ),
    ]) {
      expect(
        parsePepperOutlets(
          { ...p, body: Buffer.from(edit(p.body.toString())) },
          null,
        ).authoritative,
      ).toBe(false);
    }
  });
  it("unresolved exact names never fuzzy-match directory outlets", async () => {
    const { candidate } = await complete();
    const resolution = await capturedOutletResolver()({
      ...candidate,
      locationNames: ["Tampines One"],
    });
    expect(resolution.outletsVerified).toBe(false);
    expect(resolution.outlets).toHaveLength(0);
  });
});

describe("explicit Singapore direct lifecycle", () => {
  it.each([
    ["2026-09-01", "2026-09-30", "exclude"],
    ["2026-09-01", "2026-10-01", "ready"],
    ["2026-10-01", "2026-10-01", "ready"],
    ["2026-10-02", "2026-10-31", "ready"],
    ["2026-09-01", null, "needs_review"],
  ])(
    "%s to %s evaluated at supplied as-of date gives %s",
    async (startDate, endDate, result) => {
      const { candidate, context } = await complete();
      const decision = evaluateDirectPublication(
        { ...candidate, startDate, endDate },
        { ...context, asOf: "2026-10-01" },
      );
      expect(decision.result).toBe(result);
      if (result === "exclude") {
        expect(decision.reasons).toEqual(["expired_campaign"]);
        expect(decision.promotion).toBeNull();
      }
    },
  );
  it.each(["validity_unparsed", "validity_contradictory"])(
    "ambiguous validity never becomes expiry (%s)",
    async (issue) => {
      const { candidate, context } = await complete();
      const decision = evaluateDirectPublication(
        {
          ...candidate,
          endDate: "2026-09-30",
          issues: [...candidate.issues, issue],
        },
        { ...context, asOf: "2026-10-01" },
      );
      expect(decision.result).toBe("needs_review");
      expect(decision.reasons).toContain(issue);
      expect(decision.reasons).not.toContain("expired_campaign");
    },
  );
  it("observation uses Singapore rollover and evaluation is repeatable", async () => {
    expect(singaporeObservationDate("2026-09-30T16:00:00.000Z")).toBe(
      "2026-10-01",
    );
    expect(singaporeObservationDate("2026-09-30T15:59:59.000Z")).toBe(
      "2026-09-30",
    );
    const { candidate, context } = await complete();
    expect(JSON.stringify(evaluateDirectPublication(candidate, context))).toBe(
      JSON.stringify(evaluateDirectPublication(candidate, context)),
    );
    expect(() =>
      evaluateDirectPublication(candidate, { ...context, asOf: "invalid" }),
    ).toThrow("invalid_as_of_date");
  });
});

it("explicit unambiguous expired end is sufficient even when start is unknown", async () => {
  const { candidate, context } = await complete();
  expect(
    evaluateDirectPublication(
      {
        ...candidate,
        startDate: null,
        endDate: "2026-09-30",
        issues: [...candidate.issues, "start_date_unknown"],
      },
      { ...context, asOf: "2026-10-01" },
    ).result,
  ).toBe("exclude");
});
