import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  copyFile,
  rm,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  prepareRunV3,
  registerLaunchV3,
  persistRawV3,
  sealStageV3,
  verifyStageSealV3,
  generateStage2TasksV3,
  scoreSealedRunV3,
  FROZEN_FILES_V3,
  ANNOTATION_FILE_V3,
  parseJsonV3,
  hashV3,
  tasksV3,
  orderRecordsV3,
} from "../scripts/research/promotion-nlp-subagent-v3-evaluation";
import { emptyExtractionV3 } from "../src/ingestion/promotion-nlp/schema-v3";
let root: string;
beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "promotion-v3-integrity-"));
  const b = JSON.parse(
    await readFile("tests/fixtures/promotion-nlp/benchmark.json", "utf8"),
  );
  const files = new Set([
    ...FROZEN_FILES_V3,
    "tests/fixtures/promotion-nlp/benchmark.json",
    "tests/fixtures/promotion-nlp/benchmark-v2.json",
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
    ...b.cases.map(
      (c: { sourceReference: { file: string } }) => c.sourceReference.file,
    ),
  ] as string[]);
  for (const base of [
    ".local/promotion-nlp-subagent",
    ".local/promotion-nlp-subagent-v2",
  ])
    for (const d of await readdir(base, { withFileTypes: true }))
      if (d.isDirectory()) {
        try {
          await readFile(path.join(base, d.name, "raw-results.json"));
          files.add(path.join(base, d.name, "raw-results.json"));
        } catch {}
      }
  for (const f of files) {
    await mkdir(path.dirname(path.join(root, f)), { recursive: true });
    await copyFile(f, path.join(root, f));
  }
  await mkdir(path.join(root, "supabase/migrations"), { recursive: true });
  await writeFile(
    path.join(root, "src/production-sentinel.ts"),
    "PRODUCTION_UNCHANGED",
  );
});
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const dir = await prepareRunV3(root);
  return { dir, tasks: await tasksV3(dir, "segmentation") };
}
async function launch(
  f: Awaited<ReturnType<typeof fixture>>,
  i = 0,
  agent = `segmentation-${i}`,
  stage: "segmentation" | "extraction" = "segmentation",
  tasks = f.tasks,
) {
  const t = tasks[i];
  await registerLaunchV3(
    f.dir,
    stage,
    {
      taskId: t.taskId,
      agentId: agent,
      model: "gpt-6-luna",
      reasoningEffort: "medium",
      forkContext: false,
      promptSha256: t.promptSha256,
    },
    root,
  );
  return t;
}
async function save(
  f: Awaited<ReturnType<typeof fixture>>,
  i = 0,
  raw = '{"propositions":[],"unassignedQuotes":[]}',
) {
  const t = await launch(f, i);
  await persistRawV3(f.dir, "segmentation", {
    taskId: t.taskId,
    agentId: `segmentation-${i}`,
    rawOutput: raw,
    executionStatus: "completed",
  });
}
async function twoStage() {
  const f = await fixture();
  const source = f.tasks[0].input as { SOURCE_TEXT: string };
  await save(
    f,
    0,
    JSON.stringify({
      propositions: [
        {
          id: "p1",
          propositionQuote: source.SOURCE_TEXT.slice(0, 12),
          supportingQuotes: [],
        },
        {
          id: "p2",
          propositionQuote: source.SOURCE_TEXT.slice(12, 30),
          supportingQuotes: [],
        },
      ],
      unassignedQuotes: [],
    }),
  );
  await sealStageV3(f.dir, "segmentation", root);
  await generateStage2TasksV3(f.dir, root);
  return { ...f, stage2: await tasksV3(f.dir, "extraction") };
}
describe("v3 two-seal execution integrity", () => {
  it("prepares exactly 49 blind sources, fixed config and all contract/benchmark/capture hashes", async () => {
    const f = await fixture(),
      m = JSON.parse(await readFile(path.join(f.dir, "manifest.json"), "utf8"));
    expect(m.tasks).toHaveLength(49);
    expect(m.concurrency).toBe(4);
    expect(m.model).toBe("gpt-6-luna");
    expect(m.forkContext).toBe(false);
    expect(m.reasoningEffort).toBe("medium");
    expect(m.toolIsolation).toMatch(/prompt-enforced/);
    expect(m.frozenFiles[ANNOTATION_FILE_V3]).toBe(
      hashV3(await readFile(path.join(root, ANNOTATION_FILE_V3))),
    );
    expect(
      await readFile(path.join(f.dir, "segmentation-tasks.json"), "utf8"),
    ).not.toMatch(
      /expectedClassification|acceptableAnchors|currentParser|v1Output|v2Output/,
    );
  });
  it("persists first raw response before parsing, never repairs malformed braces/fences", async () => {
    const f = await fixture(),
      raw = '{"propositions":[],"unassignedQuotes":[]}}';
    await save(f, 0, raw);
    const file = path.join(
      f.dir,
      "segmentation-records",
      `${hashV3(f.tasks[0].taskId)}.json`,
    );
    expect(JSON.parse(await readFile(file, "utf8")).rawOutput).toBe(raw);
    await expect(
      persistRawV3(f.dir, "segmentation", {
        taskId: f.tasks[0].taskId,
        agentId: "segmentation-0",
        rawOutput: "{}",
        executionStatus: "completed",
      }),
    ).rejects.toThrow();
    for (const raw of ["{", "{} }", "```json\n{}\n```"])
      expect(parseJsonV3(raw).syntaxMalformed).toBe(true);
    await sealStageV3(f.dir, "segmentation", root);
    const g = await generateStage2TasksV3(f.dir, root);
    expect(g.units).toBe(0);
    expect(g.cases[0].syntaxMalformed).toBe(true);
  });
  it("requires segmentation seal before generation and both seals before gold/scoring", async () => {
    const f = await fixture();
    await expect(generateStage2TasksV3(f.dir, root)).rejects.toThrow();
    await expect(scoreSealedRunV3(f.dir, root)).rejects.toThrow();
    await save(f);
    await sealStageV3(f.dir, "segmentation", root);
    await generateStage2TasksV3(f.dir, root);
    await expect(scoreSealedRunV3(f.dir, root)).rejects.toThrow();
    await sealStageV3(f.dir, "extraction", root);
    const report = await scoreSealedRunV3(f.dir, root);
    expect(report.sourceCases).toBe(49);
    expect(report.stage1.missingResults).toBe(48);
    expect(report.sourceRecovery.recovered).toBe(0);
    expect(report.semanticCoverage.segmentationUnassessable).toHaveLength(48);
  });
  it("generates every sealed usable unit automatically with deterministic IDs/order and local spans only", async () => {
    const f = await twoStage();
    expect(f.stage2.map((t) => t.taskId)).toEqual([
      `${f.tasks[0].taskId}::p1`,
      `${f.tasks[0].taskId}::p2`,
    ]);
    expect(f.stage2[0].input).not.toHaveProperty("SOURCE_TEXT");
    expect(f.stage2[0].input).not.toHaveProperty("unassignedQuotes");
    await launch(f, 0, "extract-1", "extraction", f.stage2);
    await persistRawV3(f.dir, "extraction", {
      taskId: f.stage2[0].taskId,
      agentId: "extract-1",
      rawOutput: JSON.stringify(emptyExtractionV3()) + "}",
      executionStatus: "completed",
    });
    await launch(f, 1, "extract-2", "extraction", f.stage2);
    await persistRawV3(f.dir, "extraction", {
      taskId: f.stage2[1].taskId,
      agentId: "extract-2",
      rawOutput: null,
      executionStatus: "execution_error",
    });
    await sealStageV3(f.dir, "extraction", root);
    const r = await scoreSealedRunV3(f.dir, root);
    expect(r.stage2.freshAgents).toBe(2);
    expect(r.stage2.syntaxMalformed).toBe(1);
    expect(r.stage2.executionErrors).toBe(1);
    expect(r.semanticCoverage.extractionUnassessable).toHaveLength(2);
  });
  it("rejects invalid exact spans/duplicate IDs/over-limit without generating repaired tasks", async () => {
    for (const raw of [
      {
        propositions: [
          { id: "p1", propositionQuote: "not source", supportingQuotes: [] },
        ],
        unassignedQuotes: [],
      },
      {
        propositions: Array.from({ length: 9 }, (_, i) => ({
          id: `p${i}`,
          propositionQuote: "Student",
          supportingQuotes: [],
        })),
        unassignedQuotes: [],
      },
    ]) {
      const f = await fixture();
      await save(f, 0, JSON.stringify(raw));
      await sealStageV3(f.dir, "segmentation", root);
      expect((await generateStage2TasksV3(f.dir, root)).units).toBe(0);
    }
  });
  it("rejects repeated agent identities within and across stages, duplicate launch, wrong configuration", async () => {
    const f = await fixture();
    await launch(f, 0, "same");
    await expect(launch(f, 1, "same")).rejects.toThrow("reused_agent_identity");
    await expect(launch(f, 0, "other")).rejects.toThrow(
      "duplicate_task_launch",
    );
    const base = {
      taskId: f.tasks[1].taskId,
      agentId: "next",
      model: "gpt-6-luna",
      reasoningEffort: "medium",
      forkContext: false,
      promptSha256: f.tasks[1].promptSha256,
    };
    for (const patch of [
      { model: "gpt-6-sol" },
      { reasoningEffort: "high" },
      { forkContext: true },
      { promptSha256: "wrong" },
    ])
      await expect(
        registerLaunchV3(
          f.dir,
          "segmentation",
          { ...base, ...patch } as Parameters<typeof registerLaunchV3>[2],
          root,
        ),
      ).rejects.toThrow();
    const g = await twoStage();
    await expect(
      launch(g, 0, "segmentation-0", "extraction", g.stage2),
    ).rejects.toThrow("reused_agent_identity");
  });
  it("rejects more than four unfinished launches", async () => {
    const f = await fixture();
    for (let i = 0; i < 4; i++) await launch(f, i);
    await expect(launch(f, 4)).rejects.toThrow("concurrency_exceeded");
  });
  it("binds raw response to launched agent and input hash", async () => {
    const f = await fixture();
    await launch(f);
    await expect(
      persistRawV3(f.dir, "segmentation", {
        taskId: f.tasks[0].taskId,
        agentId: "wrong",
        rawOutput: "{}",
        executionStatus: "completed",
      }),
    ).rejects.toThrow("agent_identity_mismatch");
    await expect(
      persistRawV3(f.dir, "segmentation", {
        taskId: f.tasks[0].taskId,
        agentId: "segmentation-0",
        rawOutput: null,
        executionStatus: "completed",
      }),
    ).rejects.toThrow("invalid_execution_output");
  });
  it("rejects duplicate/unknown/raw-hash-corrupted records", async () => {
    const f = await fixture();
    await save(f);
    await sealStageV3(f.dir, "segmentation", root);
    const rows = JSON.parse(
        await readFile(
          path.join(f.dir, "segmentation-raw-results.json"),
          "utf8",
        ),
      ),
      r = rows[0];
    expect(() => orderRecordsV3(f.tasks, [r, r])).toThrow(
      "duplicate_task_result",
    );
    expect(() =>
      orderRecordsV3(f.tasks, [{ ...r, taskId: "unknown" }]),
    ).toThrow("unknown_task_result");
    expect(() =>
      orderRecordsV3(f.tasks, [{ ...r, rawOutput: "tampered" }]),
    ).toThrow("raw_hash_mismatch");
  });
  it.each(["segmentation-raw-results.json", "manifest.json"])(
    "detects tampered %s and rejects later writes",
    async (file) => {
      const f = await fixture();
      await save(f);
      await sealStageV3(f.dir, "segmentation", root);
      await expect(save(f, 1)).rejects.toThrow("stage_already_sealed");
      await writeFile(path.join(f.dir, file), "{}");
      await expect(
        verifyStageSealV3(f.dir, "segmentation", root),
      ).rejects.toThrow(/seal_mismatch/);
    },
  );
  it("detects task mutation before extraction dispatch and binds both seal boundaries", async () => {
    const f = await twoStage(),
      file = path.join(f.dir, "extraction-tasks.json"),
      original = await readFile(file, "utf8"),
      m = JSON.parse(original);
    m.tasks[0].input.supportingQuotes.push("SIBLING_SECRET");
    await writeFile(file, JSON.stringify(m));
    await expect(launch(f, 0, "fresh", "extraction", f.stage2)).rejects.toThrow(
      "stage2_projection_mismatch",
    );
    await writeFile(file, original);
    await sealStageV3(f.dir, "extraction", root);
    await writeFile(file, JSON.stringify(m));
    await expect(verifyStageSealV3(f.dir, "extraction", root)).rejects.toThrow(
      /seal_mismatch/,
    );
  });
  it.each([
    "src/ingestion/promotion-nlp/prompt-segment-v3.ts",
    ANNOTATION_FILE_V3,
    "docs/changes/promotion-nlp-proposition-segmentation-v3/constraint-contract.md",
    "src/production-sentinel.ts",
  ])("detects frozen/protected byte mutation of %s", async (file) => {
    const f = await fixture(),
      p = path.join(root, file),
      old = await readFile(p);
    try {
      await writeFile(p, "changed");
      await expect(sealStageV3(f.dir, "segmentation", root)).rejects.toThrow(
        /(?:frozen|protected)_file_changed/,
      );
    } finally {
      await writeFile(p, old);
    }
  });
  it("never invokes acquisition/provider/network/database or serializes credentials", async () => {
    const fetch = vi.fn(() => {
      throw Error("forbidden");
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("OPENAI_API_KEY", "SECRET_CREDENTIAL_5522");
    try {
      const f = await fixture();
      await save(f);
      await sealStageV3(f.dir, "segmentation", root);
      await generateStage2TasksV3(f.dir, root);
      await sealStageV3(f.dir, "extraction", root);
      await scoreSealedRunV3(f.dir, root);
      expect(fetch).not.toHaveBeenCalled();
      for (const file of [
        "manifest.json",
        "segmentation-raw-results.json",
        "scores.json",
      ])
        expect(await readFile(path.join(f.dir, file), "utf8")).not.toContain(
          "SECRET_CREDENTIAL_5522",
        );
      const code = await readFile(
        "scripts/research/promotion-nlp-subagent-v3-evaluation.ts",
        "utf8",
      );
      expect(code).not.toMatch(
        /from .*openai-provider|from .*extractor|from .*persistence|from .*direct-sources|process\.env|fetch\(/,
      );
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
