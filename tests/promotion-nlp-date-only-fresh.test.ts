import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { DateOnlyOutput } from "../src/ingestion/promotion-nlp/date-only-profile";
import {
  makeTask,
  sha,
  json,
  prepareFresh,
  reserveFresh,
  bindFresh,
  recordFresh,
  closeFresh,
  sealFresh,
  verifySealFresh,
  verifyFrozenFresh,
  auditConcurrency,
  CONFIG,
  type Sample,
  type ResponseRecord,
} from "../scripts/research/promotion-nlp-date-only-fresh-evaluation";
import {
  noteSchema,
  scoreResponse,
  aggregateFresh,
  scoreFresh,
  type Note,
} from "../scripts/research/promotion-nlp-date-only-fresh-scoring";
const source =
  "Shop: 20% OFF meals.\nValid 1-31 October 2026 at Alpha outlet.\nExcluded: Beta outlet.\nFlash this page; Takeaway only!";
function sample(id = "s1", text = source): Sample {
  return {
    id,
    cohort: "regression",
    merchantGroup: "Shop",
    sourceSha256: sha(text),
    origin: { file: "tests/fixtures/promotion-nlp/benchmark-v4.json" },
    evidence: {
      sourceId: "shop",
      canonicalUrl: "https://example.test/offer",
      nativeId: id,
      evidenceId: sha(text),
      selector: "original",
      merchantHint: "Shop",
      titleHint: null,
      text,
    },
  };
}
const note: Note = noteSchema.parse({
  id: "s1",
  author: "parent-agent, not human gold",
  kind: "economic",
  acceptableClassifications: ["economic_offer"],
  economicIdentityIds: ["offer"],
  singleCampaignComparable: false,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  locationScope: "named_outlets",
  participating: [
    { identity: "Alpha", labels: ["Alpha"], quote: "at Alpha outlet." },
  ],
  excluded: [
    { identity: "Beta", labels: ["Beta"], quote: "Excluded: Beta outlet." },
  ],
  benefitAny: ["20% OFF"],
  merchantAny: ["Shop"],
  qualifiers: [],
  review: "pre-frozen",
});
const nil = () => ({ value: null, quote: null });
function answer(): DateOnlyOutput {
  return {
    classification: { value: "economic_offer", quote: "20% OFF meals" },
    merchant: { value: "Shop", quote: "Shop" },
    title: { value: "20% OFF meals", quote: "20% OFF meals" },
    benefit: { value: "20% OFF meals", quote: "20% OFF meals" },
    startDate: { value: "2026-10-01", quote: "Valid 1-31 October 2026" },
    endDate: { value: "2026-10-31", quote: "Valid 1-31 October 2026" },
    locationScope: { value: "named_outlets", quote: "at Alpha outlet." },
    locationRules: [
      {
        role: "participating" as "participating" | "excluded",
        names: ["Alpha"],
        quote: "at Alpha outlet.",
      },
      {
        role: "excluded" as "participating" | "excluded",
        names: ["Beta"],
        quote: "Excluded: Beta outlet.",
      },
    ],
  };
}
function response(raw: string | null): ResponseRecord {
  return {
    taskId: "s1",
    agentId: "a1",
    status: raw === null ? "transport_error" : "completed",
    rawOutput: raw,
    rawOutputSha256: raw === null ? null : sha(raw),
    savedAt: "2026-10-05T01:01:00Z",
    transportError: null,
    inputSha256: makeTask(sample()).inputSha256,
    sourceSha256: sha(source),
    requested: CONFIG,
    usage: "unavailable",
  };
}
const temp: string[] = [];
afterEach(async () => {
  await Promise.all(
    temp.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function run(samples = [sample()]) {
  const d = await mkdtemp(path.join(tmpdir(), "nlp-date-fresh-test-"));
  temp.push(d);
  await writeFile(path.join(d, "samples.json"), json(samples));
  await writeFile(
    path.join(d, "evaluation-notes.json"),
    json(samples.map((s) => ({ ...note, id: s.id }))),
  );
  await writeFile(path.join(d, "protected-baseline.json"), json({ files: {} }));
  await prepareFresh(d);
  return d;
}
async function save(d: string, id = "s1", agent = "a1", raw = json(answer())) {
  await reserveFresh(d, id);
  await bindFresh(d, id, agent);
  await recordFresh(d, {
    taskId: id,
    agentId: agent,
    status: "completed",
    rawOutput: raw,
  });
  await closeFresh(d, id, agent, { previous_status: { completed: raw } });
}
describe("isolated date-first research", () => {
  it("projects only full text and allowed hints, never labels/parser/prior answers", () => {
    const s = {
      ...sample(),
      expected: { endDate: "ANSWER_SENTINEL" },
      parser: { benefit: "PARSER_SENTINEL" },
      prior: "PRIOR_SENTINEL",
    };
    const t = makeTask(s);
    expect(Object.keys(t.input)).toEqual(["CONTEXT_HINTS", "SOURCE_TEXT"]);
    expect(t.message).not.toMatch(
      /ANSWER_SENTINEL|PARSER_SENTINEL|PRIOR_SENTINEL/,
    );
    expect(t.input.SOURCE_TEXT).toBe(source);
    expect(t.message).toContain("Do not use tools");
  });
  it("does not normalize newlines or drop restrictions", () => {
    const scored = scoreResponse(sample(), note, response(json(answer())));
    expect(scored.description).toBe(source);
    expect(scored.descriptionExact).toBe(true);
    expect(scored.complete).toBe(true);
  });
  it("preserves malformed first answer before parse and cannot overwrite", async () => {
    const d = await run();
    await reserveFresh(d, "s1");
    await bindFresh(d, "s1", "a1");
    await recordFresh(d, {
      taskId: "s1",
      agentId: "a1",
      status: "completed",
      rawOutput: "NOT JSON\n",
    });
    expect(
      await readFile(path.join(d, "raw", `${sha("s1")}.txt`), "utf8"),
    ).toBe("NOT JSON\n");
    await expect(
      recordFresh(d, {
        taskId: "s1",
        agentId: "a1",
        status: "completed",
        rawOutput: json(answer()),
      }),
    ).rejects.toMatchObject({ code: "EEXIST" });
  });
  it("rejects duplicate attempts and agent reuse", async () => {
    const d = await run([sample(), sample("s2", source + "\nSecond")]);
    await save(d);
    await expect(reserveFresh(d, "s1")).rejects.toThrow(
      "duplicate_task_attempt",
    );
    await reserveFresh(d, "s2");
    await expect(bindFresh(d, "s2", "a1")).rejects.toThrow(
      "reused_agent_identity",
    );
  });
  it("counts answered but unclosed agents toward four-slot ceiling", async () => {
    const d = await run(
      Array.from({ length: 5 }, (_, i) => sample(`s${i}`, source + `\n${i}`)),
    );
    for (let i = 0; i < 4; i++) {
      await reserveFresh(d, `s${i}`);
      await bindFresh(d, `s${i}`, `a${i}`);
      await recordFresh(d, {
        taskId: `s${i}`,
        agentId: `a${i}`,
        status: "completed",
        rawOutput: "{}",
      });
    }
    await expect(reserveFresh(d, "s4")).rejects.toThrow("concurrency_exceeded");
    await closeFresh(d, "s0", "a0", { previous_status: { completed: "{}" } });
    await expect(reserveFresh(d, "s4")).resolves.toMatchObject({ id: "s4" });
  });
  it("audits chronological concurrency, detecting retroactive violations", () => {
    const attempts = Array.from({ length: 5 }, (_, i) => ({
      taskId: `s${i}`,
      reservedAt: "2026-10-05T00:00:00Z",
      requested: CONFIG,
    }));
    const closures = attempts.map((a) => ({
      taskId: a.taskId,
      closedAt: "2026-10-05T00:01:00Z",
    }));
    expect(() => auditConcurrency(attempts, closures)).toThrow(
      "concurrency_exceeded",
    );
  });
  it("rejects mismatched agent before saving raw", async () => {
    const d = await run();
    await reserveFresh(d, "s1");
    await bindFresh(d, "s1", "a1");
    await expect(
      recordFresh(d, {
        taskId: "s1",
        agentId: "wrong",
        status: "completed",
        rawOutput: "{}",
      }),
    ).rejects.toThrow("agent_identity_mismatch");
  });
  it("requires saved first response before closure", async () => {
    const d = await run();
    await reserveFresh(d, "s1");
    await bindFresh(d, "s1", "a1");
    await expect(
      closeFresh(d, "s1", "a1", { previous_status: "running" }),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("seals all raw/launch/closure records and scores reproducibly", async () => {
    const d = await run();
    await save(d);
    await sealFresh(d);
    const a = await scoreFresh(d),
      b = await scoreFresh(d);
    expect(a).toEqual(b);
    expect(a.cohorts.regression.execution.completed).toMatchObject({
      numerator: 1,
      denominator: 1,
    });
    await expect(
      recordFresh(d, {
        taskId: "s1",
        agentId: "a1",
        status: "completed",
        rawOutput: "{}",
      }),
    ).rejects.toThrow("run_already_sealed");
  });
  it("rejects raw tampering and extra archive files", async () => {
    const d = await run();
    await save(d);
    await sealFresh(d);
    await writeFile(path.join(d, "raw", `${sha("s1")}.txt`), "changed");
    await expect(verifySealFresh(d)).rejects.toThrow("raw_seal_mismatch");
  });
  it("rejects frozen notes/task/config drift", async () => {
    const d = await run();
    await writeFile(path.join(d, "evaluation-notes.json"), "[]");
    await expect(verifyFrozenFresh(d)).rejects.toThrow("frozen_input_changed");
  });
  it("requires seal before scoring", async () => {
    const d = await run();
    await save(d);
    await expect(scoreFresh(d)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("retains undelivered tasks in sealed denominator without fake agents", async () => {
    const d = await run();
    const seal = await sealFresh(d);
    expect(seal.agents).toBe(0);
    const scored = await scoreFresh(d);
    expect(scored.cohorts.regression.execution.missingOrFailed).toMatchObject({
      numerator: 1,
      denominator: 1,
    });
    expect(
      scored.cohorts.regression.dates.allEndpointOutcomes.unavailable,
    ).toMatchObject({ numerator: 2, denominator: 2 });
  });
  it("retains failed, malformed, refusal and uncertain in applicable denominators", () => {
    const u = {
      ...answer(),
      classification: { value: "uncertain", quote: null as string | null },
      merchant: nil(),
      title: nil(),
      benefit: nil(),
      startDate: nil(),
      endDate: nil(),
      locationScope: nil(),
      locationRules: [],
    };
    const rs = [
      undefined,
      response(null),
      response("{"),
      response("I cannot comply with this request"),
      response(json(u)),
    ].map((r) => scoreResponse(sample(), note, r));
    const c = aggregateFresh(rs);
    expect(c.execution.completed).toMatchObject({
      numerator: 3,
      denominator: 5,
    });
    expect(c.execution.explicitTextRefusals.numerator).toBe(1);
    expect(c.identity.economicRecognition).toMatchObject({
      numerator: 0,
      denominator: 5,
    });
    expect(c.dates.knownCorrect).toMatchObject({
      numerator: 0,
      denominator: 10,
    });
    expect(c.locations.roles.participating.omitted).toMatchObject({
      numerator: 5,
      denominator: 5,
    });
  });
  it("detects source-year-matching date error passing structural validator", () => {
    const a = answer();
    a.endDate.value = "2026-10-30";
    const r = scoreResponse(sample(), note, response(json(a)));
    expect(r.validation.contractValid).toBe(true);
    expect(r.dates.endDate).toBe("wrong");
    expect(r.wrongDateFactsPassingValidator).toBe(1);
    expect(r.highRisk).toBe(true);
  });
  it("detects participating/excluded reversal despite exact source quote", () => {
    const a = answer();
    a.locationRules = [
      {
        role: "participating",
        names: ["Beta"],
        quote: "Excluded: Beta outlet.",
      },
    ];
    const r = scoreResponse(sample(), note, response(json(a)));
    expect(r.validation.contractValid).toBe(true);
    expect(r.participating.reversals).toEqual(["Beta"]);
    expect(r.excluded.omitted).toEqual(["Beta"]);
    expect(r.wrongOutletFactsPassingValidator).toBe(1);
  });
  it("correct unknown is semantic correctness but not completeness", () => {
    const a = answer();
    a.startDate = nil();
    a.endDate = nil();
    const n = { ...note, startDate: null, endDate: null };
    const r = scoreResponse(sample(), n, response(json(a)));
    expect(r.dates).toEqual({
      startDate: "correct_unknown",
      endDate: "correct_unknown",
    });
    expect(r.complete).toBe(false);
  });
  it("preserves overlong source and reports storage blocker", () => {
    const s = sample("s1", source + "\n" + "x".repeat(5100));
    const r = scoreResponse(s, note, response(json(answer())));
    expect(r.description).toBe(s.evidence.text);
    expect(r.storageBlockers).toContain(
      "description_exceeds_publication_limit",
    );
    expect(r.complete).toBe(false);
  });
  it("rejects identity/qualifier omission and unsafe multi-offer commitment", () => {
    const a = answer();
    const n = { ...note, qualifiers: [{ anchor: "20%", required: ["up to"] }] };
    expect(scoreResponse(sample(), n, response(json(a))).findings).toContain(
      "benefit_qualifier_omitted",
    );
    expect(
      scoreResponse(
        sample(),
        {
          ...note,
          kind: "ambiguous",
          acceptableClassifications: ["uncertain"],
        },
        response(json(a)),
      ).findings,
    ).toContain("unsafe_boundary_commitment");
  });
});
