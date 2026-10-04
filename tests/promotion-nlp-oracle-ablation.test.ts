import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  ARMS,
  CONFIG,
  THRESHOLDS,
  sha,
  serialize,
  benchmarkSchemaV4,
  projectOracle,
  buildTasks,
  localGraph,
  oracleControl,
  identity,
  edgeScore,
  clauseNodes,
  constraintMatches,
  counterfactualCeilings,
  parseTask,
} from "../src/ingestion/promotion-nlp/oracle-ablation";
import { emptyNormalizationV4 } from "../src/ingestion/promotion-nlp/schema-v4";
import {
  register,
  persist,
  verifySeal,
  type Launch,
} from "../scripts/research/promotion-nlp-oracle-ablation";
const text = readFileSync(
  "tests/fixtures/promotion-nlp/benchmark-v4.json",
  "utf8",
);
const b = benchmarkSchemaV4.parse(JSON.parse(text));
const count = { a: 49, b: 49, c: 59, d: 43, e: 49 };
describe("reviewed oracle projection and independent tasks", () => {
  it("benchmark unchanged at reviewed SHA", () =>
    expect(sha(text)).toBe(
      "ef7c4b4ef6195e0b0c28f3e62e9f32357dc932bd05f50c65344f80b2e0d7abc7",
    ));
  it("projects literal canonical clauses, no duplicate alternatives, opaque IDs and neutral hints", () => {
    b.cases.forEach((c, i) => {
      const p = projectOracle(c, i);
      expect(p.evidence.length).toBeGreaterThanOrEqual(
        c.requiredClauses.length,
      );
      for (const e of p.evidence) {
        expect(c.sourceText.includes(e.quote)).toBe(true);
        expect(e.id).toMatch(/^e\d{3}$/);
      }
      for (const prop of p.propositions) {
        expect(prop.id).toMatch(/^p\d{3}$/);
        expect(prop.propositionTypeHint).toBe("other");
        expect(
          prop.anchorEvidenceIds.every((id) =>
            p.evidence.some((e) => e.id === id),
          ),
        ).toBe(true);
      }
    });
  });
  it("preserves shared and intentionally unowned evidence", () => {
    b.cases.forEach((c, i) => {
      const p = projectOracle(c, i);
      for (const [id, clId] of Object.entries(p.privateMapping.evidence)) {
        const cl = c.requiredClauses.find((cl) => cl.id === clId)!;
        expect(
          p.edges
            .find((e) => e.evidenceId === id)!
            .propositionIds.map((id) => p.privateMapping.propositions[id]),
        ).toEqual(cl.propositionIds);
      }
    });
  });
  it("O0 is perfect on every fully annotated metric", () => {
    const o = oracleControl(b.cases);
    expect(o.perfect).toBe(true);
    for (const m of Object.values(o.metrics)) expect(m.value).toBe(1);
    expect(o.metrics.clauses.denominator).toBe(350);
    expect(o.metrics.constraints.denominator).toBe(228);
  });
  it.each(ARMS)("arm %s reproduces deterministic independent tasks", (arm) => {
    const ts = buildTasks(b.cases, arm);
    expect(ts.length).toBe(count[arm]);
    expect(ts).toEqual(buildTasks(b.cases, arm));
    for (const t of ts) {
      expect(sha(t.prompt)).toBe(t.promptSha256);
      expect(sha(JSON.stringify(t.input))).toBe(t.inputSha256);
      expect(t.input).not.toHaveProperty("privateMapping");
    }
  });
  it.each(ARMS)("sentinel gold leakage absent in arm %s", (arm) => {
    const c = structuredClone(b.cases[0]);
    const map = new Map(
      c.propositions.map((p, i) => [
        p.id,
        `SENTINEL_GOLD_${i}_after5_student_before5_contest_salad_all_day_tea_time`,
      ]),
    );
    c.propositions.forEach((p) => (p.id = map.get(p.id)!));
    c.requiredClauses.forEach(
      (cl) => (cl.propositionIds = cl.propositionIds.map((id) => map.get(id)!)),
    );
    c.expected = Object.fromEntries(
      Object.entries(c.expected).map(([id, v]) => [map.get(id)!, v]),
    );
    c.notes = "SENTINEL_NOTES";
    c.expected[c.propositions[0].id].constraints[0].text = "SENTINEL_EXPECTED";
    for (const t of buildTasks([c], arm)) {
      expect(t.prompt).not.toContain("SENTINEL");
      expect(t.prompt).not.toContain("student_before5");
      expect(t.prompt).not.toContain("salad_all_day");
      expect(t.prompt).not.toContain("tea_time");
    }
  });
  it("A evidence input has no gold propositions/edges/expected", () => {
    for (const t of buildTasks(b.cases, "a"))
      expect(Object.keys(t.input).sort()).toEqual(
        ["caseId", "merchantHint", "titleHint", "evidence"].sort(),
      );
  });
  it("B input has neutral nodes but no edge/taxonomy/normalization gold", () => {
    for (const t of buildTasks(b.cases, "b")) {
      expect(t.input).not.toHaveProperty("edges");
      expect(t.input).not.toHaveProperty("taxonomy");
      expect(t.input).not.toHaveProperty("expected");
    }
  });
  it("C has no taxonomy answer or normalized facts", () => {
    for (const t of buildTasks(b.cases, "c")) {
      expect(t.input).not.toHaveProperty("taxonomy");
      expect(t.input).not.toHaveProperty("expected");
      expect(t.input).not.toHaveProperty("annotatedFacts");
      expect(
        (t.input.proposition as { propositionTypeHint: string })
          .propositionTypeHint,
      ).toBe("other");
    }
  });
  it("D sees eligibility and local-only evidence, no expected values", () => {
    for (const t of buildTasks(b.cases, "d")) {
      expect(t.input.taxonomy).toBe("economic_offer");
      expect(t.input).not.toHaveProperty("expected");
      const p = projectOracle(b.cases[t.caseIndex], t.caseIndex);
      expect(t.input.evidence).toEqual(
        localGraph(
          p,
          p.propositions.find((p) => p.id === t.propositionId)!,
        ).evidence,
      );
    }
  });
  it("E only sees deterministic nodes, not V4/oracle evidence", () => {
    for (const t of buildTasks(b.cases, "e")) {
      expect(
        (t.input.evidence as { kind: string }[]).every(
          (e) => e.kind === "other",
        ),
      ).toBe(true);
      expect(t.input).not.toHaveProperty("oracle");
    }
  });
  it("A/E freeze the same proposition contract", () =>
    expect(
      buildTasks(b.cases, "a")[0].prompt.split("Isolated sealed input:")[0],
    ).toBe(
      buildTasks(b.cases, "e")[0].prompt.split("Isolated sealed input:")[0],
    ));
  it("reviewed alternatives accepted without transitive canonical collision", () => {
    const c = b.cases.find((c) => c.id.includes("captain-kim-delivery"))!,
      cl = c.requiredClauses[2];
    expect(
      clauseNodes(
        c,
        [{ id: "e001", quote: cl.quote + "!", kind: "other" }],
        cl,
      ),
    ).toHaveLength(1);
    const alt = b.cases[0].requiredClauses[1];
    expect(
      clauseNodes(
        b.cases[0],
        [{ id: "e001", quote: alt.alternatives[0], kind: "other" }],
        alt,
      ),
    ).toHaveLength(1);
  });
  it("equivalent anchor punctuation boundaries accepted", () => {
    const c = b.cases.find((c) => c.id.includes("bfmcsaver"))!,
      quote = c.propositions[0].acceptableAnchors[0].replace(/\.$/, "");
    expect(
      identity(
        c,
        [{ id: "e001", quote, kind: "other" }],
        [
          {
            id: "p001",
            anchorEvidenceIds: ["e001"],
            propositionTypeHint: "other",
          },
        ],
      ).economicRecall.value,
    ).toBe(1);
  });
  it("merge and split fail independent identity recall", () => {
    const c = b.cases[0],
      p = projectOracle(c, 0);
    const merged = [
      {
        ...p.propositions[0],
        anchorEvidenceIds: p.propositions.flatMap((p) => p.anchorEvidenceIds),
      },
    ];
    expect(identity(c, p.evidence, merged).harmfulMerges).toBe(1);
    expect(identity(c, p.evidence, merged).recall.value).toBe(0);
    expect(
      identity(c, p.evidence, [
        p.propositions[0],
        { ...p.propositions[0], id: "p999" },
      ]).harmfulSplits,
    ).toBe(1);
  });
  it("wrong critical target and missing shared targets count", () => {
    const c = b.cases.find((c) => c.id === "bari_bari_steak_sg-promotions-2")!,
      p = projectOracle(c, 0);
    const edges = p.edges.map((e) => ({ ...e, propositionIds: ["p001"] }));
    const s = edgeScore(
      c,
      p.evidence,
      p.propositions,
      edges,
      p.privateMapping.propositions,
    );
    expect(s.criticalWrongTargets).toBeGreaterThan(0);
    expect(s.sharedRecall.value).toBeLessThan(1);
  });
  it("constraint attributes compose across equivalent literal items", () => {
    const c = b.cases[0],
      req = c.expected.after5.constraints[3],
      n = emptyNormalizationV4();
    n.constraints = req.attributes.map((a) => ({
      text: req.text,
      attributes: [a],
      evidenceId: "e001",
    }));
    expect(
      constraintMatches(req, n, [
        { id: "e001", quote: req.text, kind: "other" },
      ]),
    ).toBe(true);
    n.constraints.pop();
    expect(
      constraintMatches(req, n, [
        { id: "e001", quote: req.text, kind: "other" },
      ]),
    ).toBe(false);
  });
  it("all economic identities/228 constraints have earliest irreversible loss", () => {
    const pipelines = b.cases.map(() => ({
      evidence: null,
      propositions: null,
      edges: null,
      eligibility: {},
      normalization: {},
    }));
    const cs = counterfactualCeilings(b.cases, pipelines);
    expect(cs.economic).toHaveLength(43);
    expect(cs.constraints).toHaveLength(228);
    expect(cs.distribution.economic.STAGE1_EVIDENCE_LOSS).toBe(43);
    expect(cs.distribution.constraints.STAGE1_EVIDENCE_LOSS).toBe(228);
  });
  it("bad outputs do not repair or fallback", () => {
    const t = buildTasks(b.cases, "a")[0];
    for (const raw of [null, "{broken", "```json\n{}\n```", "{}"]) {
      expect(parseTask(t, raw).valid).toBe(false);
    }
    expect(CONFIG).toEqual({
      model: "gpt-6-luna",
      reasoningEffort: "medium",
      forkContext: false,
      concurrency: 4,
      retries: 0,
      fallback: null,
    });
    expect(THRESHOLDS.aRecall).toBe(0.95);
    expect(THRESHOLDS.eGap).toBe(0.05);
  });
  it("no production/provider/acquisition/DB dependencies", () => {
    for (const f of [
      "src/ingestion/promotion-nlp/oracle-ablation.ts",
      "scripts/research/promotion-nlp-oracle-ablation.ts",
    ]) {
      const code = readFileSync(f, "utf8");
      expect(code).not.toMatch(
        /openai-provider|direct-sources|direct-source-v2|supabase|from ["']pg|fetch\(|telegram|capture\.ts/,
      );
    }
  });
});
async function scratch() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "oracle-test-"));
  await writeFile(
    path.join(dir, "manifest.json"),
    serialize({ priorAgentIds: ["PRIOR_AGENT"] }),
  );
  for (const a of ARMS) {
    await mkdir(path.join(dir, `arm-${a}`, "launches"), { recursive: true });
    await mkdir(path.join(dir, `arm-${a}`, "records"));
    await writeFile(
      path.join(dir, `arm-${a}`, "tasks.json"),
      serialize(buildTasks(b.cases, a)),
    );
  }
  return dir;
}
const launch = (
  taskId: string,
  agentId: string,
  promptSha256: string,
): Launch => ({
  taskId,
  agentId,
  promptSha256,
  model: CONFIG.model,
  reasoningEffort: CONFIG.reasoningEffort,
  forkContext: false,
  retries: 0,
  fallback: null,
});
describe("exclusive raw and lifecycle integrity", () => {
  it("unique fresh agents, prior disjoint, fixed config, <=4, no retries/fallback", async () => {
    const dir = await scratch();
    try {
      const ts = buildTasks(b.cases, "a");
      await expect(
        register(
          dir,
          "a",
          launch(ts[0].taskId, "PRIOR_AGENT", ts[0].promptSha256),
        ),
      ).rejects.toThrow("reused_agent");
      await expect(
        register(dir, "a", {
          ...launch(ts[0].taskId, "new", ts[0].promptSha256),
          model: "wrong" as typeof CONFIG.model,
        }),
      ).rejects.toThrow("invalid_launch_config");
      for (let i = 0; i < 4; i++)
        await register(
          dir,
          "a",
          launch(ts[i].taskId, `NEW${i}`, ts[i].promptSha256),
        );
      await expect(
        register(dir, "a", launch(ts[4].taskId, "NEW4", ts[4].promptSha256)),
      ).rejects.toThrow("concurrency_exceeded");
      await expect(
        register(dir, "a", launch(ts[4].taskId, "NEW0", ts[4].promptSha256)),
      ).rejects.toThrow("reused_agent");
      await expect(
        register(
          dir,
          "a",
          launch(ts[0].taskId, "DIFFERENT", ts[0].promptSha256),
        ),
      ).rejects.toThrow("duplicate_task_launch");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
  it("raw malformed bytes persisted exactly before parsing; overwrites rejected", async () => {
    const dir = await scratch();
    try {
      const t = buildTasks(b.cases, "a")[0],
        r = {
          taskId: t.taskId,
          agentId: "NEW",
          rawOutput: " malformed { unparsed \n",
          executionStatus: "completed" as const,
        };
      await register(dir, "a", launch(t.taskId, "NEW", t.promptSha256));
      await persist(dir, "a", r);
      const saved = JSON.parse(
        await readFile(
          path.join(dir, "arm-a", "records", sha(t.taskId) + ".json"),
          "utf8",
        ),
      );
      expect(saved.rawOutput).toBe(r.rawOutput);
      expect(saved.rawOutputSha256).toBe(sha(r.rawOutput));
      await expect(persist(dir, "a", r)).rejects.toThrow();
      expect(parseTask(t, saved.rawOutput).valid).toBe(false);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
  it.each(ARMS)("arm %s seal detects mutation", async (arm) => {
    const dir = await scratch();
    try {
      const raw = "[]\n",
        tasks = await readFile(path.join(dir, `arm-${arm}`, "tasks.json"));
      await writeFile(path.join(dir, `arm-${arm}`, "raw-results.json"), raw);
      await writeFile(
        path.join(dir, `arm-${arm}`, "raw-seal.json"),
        serialize({
          manifestSha256: sha(await readFile(path.join(dir, "manifest.json"))),
          tasksSha256: sha(tasks),
          rawSha256: sha(raw),
          launchesSha256: sha(serialize([])),
          recordsSha256: sha(serialize([])),
        }),
      );
      await writeFile(
        path.join(dir, `arm-${arm}`, "raw-results.json"),
        "[{}]\n",
      );
      await expect(verifySeal(dir, arm)).rejects.toThrow("seal_changed");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
