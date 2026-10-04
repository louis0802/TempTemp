import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ANNOTATION_FILE_V4,
  CONCURRENCY_V4,
  MODEL_V4,
  REASONING_V4,
  buildStage1InputV4,
  generateTasksV4,
  hashV4,
  prepareRunV4,
  projectInputV4,
  promptForTaskV4,
  tasksV4,
  registerLaunchV4,
  persistRawV4,
  sealStageV4,
  verifyStageSealV4,
  scoreSealedRunV4,
  verifyRunV4,
  type TaskV4,
} from "../scripts/research/promotion-nlp-subagent-v4-evaluation";
import { emptyNormalizationV4 } from "../src/ingestion/promotion-nlp/schema-v4";

const scratch = await mkdtemp(path.join(os.tmpdir(), "promotion-nlp-v4-test-"));
const runBase = path.join(scratch, "runs");
let runDir: string;
let malformedRunDir: string;
let sourceTask: TaskV4;

const forbidden = "SENTINEL_GOLD_PRIOR_OUTPUT_REVIEW_PARSER_778813";
const source = buildStage1InputV4({
  id: "sample",
  sourceText: "Save $4. Takeaway only. Flash this page.",
  merchantHint: "Example",
  titleHint: "Lunch deal",
});
const e1 = { id: "e1", quote: "Save $4", kind: "economic_claim" as const };
const e2 = { id: "e2", quote: "Takeaway only", kind: "channel" as const };
const e3 = {
  id: "e3",
  quote: "Flash this page",
  kind: "redemption_instruction" as const,
};
const p1 = {
  id: "p1",
  anchorEvidenceIds: ["e1"],
  propositionTypeHint: "offer" as const,
};
const p2 = {
  id: "p2",
  anchorEvidenceIds: ["e2"],
  propositionTypeHint: "other" as const,
};
const graphEdges = [
  { evidenceId: "e1", propositionIds: ["p1"], relation: "benefit" as const },
  { evidenceId: "e2", propositionIds: ["p2"], relation: "context" as const },
  { evidenceId: "e3", propositionIds: ["p1"], relation: "redemption" as const },
];

function withForbidden<T extends object>(value: T) {
  return {
    ...value,
    gold: forbidden,
    parser: forbidden,
    v1Output: forbidden,
    v2Output: forbidden,
    v3Output: forbidden,
    review: forbidden,
  };
}

describe("v4 runner allowlisted stage projections", () => {
  it("keeps stage 1 limited to normalized source and neutral hints", () => {
    const projected = projectInputV4(1, withForbidden(source) as typeof source);
    expect(Object.keys(projected).sort()).toEqual([
      "SOURCE_TEXT",
      "caseId",
      "merchantHint",
      "titleHint",
    ]);
    expect(JSON.stringify(projected)).not.toContain(forbidden);
    expect("SOURCE_TEXT" in projected && projected.SOURCE_TEXT).toBe(
      source.SOURCE_TEXT,
    );
  });

  it("keeps stage 2 IDs and evidence only, rejecting appended sentinel fields", () => {
    const input = projectInputV4(2, source, [e1, e2]);
    expect(Object.keys(input).sort()).toEqual([
      "caseId",
      "evidence",
      "merchantHint",
      "titleHint",
    ]);
    expect(JSON.stringify(input)).not.toContain(source.SOURCE_TEXT);
    expect(JSON.stringify(input)).not.toContain(forbidden);
    expect(() => promptForTaskV4(2, withForbidden(input))).toThrow();
  });

  it("keeps stage 3 graph-wide evidence and anchors without source or review metadata", () => {
    const input = projectInputV4(3, source, [e1, e2], [p1, p2]);
    expect(Object.keys(input).sort()).toEqual([
      "caseId",
      "evidence",
      "merchantHint",
      "propositions",
      "titleHint",
    ]);
    expect(JSON.stringify(input)).not.toContain(source.SOURCE_TEXT);
    expect(JSON.stringify(input)).not.toContain(forbidden);
    expect(() => promptForTaskV4(3, withForbidden(input))).toThrow();
  });

  it("isolates stages 4 and 5 to one proposition's anchors and linked evidence", () => {
    const input4 = projectInputV4(
      4,
      source,
      [e1, e2, e3],
      [p1, p2],
      graphEdges,
      p1,
    );
    const input5 = projectInputV4(
      5,
      source,
      [e1, e2, e3],
      [p1, p2],
      graphEdges,
      p1,
      "economic_offer",
    );
    for (const input of [input4, input5]) {
      expect(
        "evidence" in input ? input.evidence.map((e) => e.id).sort() : [],
      ).toEqual(["e1", "e3"]);
      expect(
        "edges" in input ? input.edges.map((e) => e.evidenceId).sort() : [],
      ).toEqual(["e1", "e3"]);
      expect(JSON.stringify(input)).not.toContain("Takeaway only");
      expect(JSON.stringify(input)).not.toContain(source.SOURCE_TEXT);
      expect(JSON.stringify(input)).not.toContain(forbidden);
    }
    expect("taxonomy" in input5 && input5.taxonomy).toBe("economic_offer");
    expect(() =>
      projectInputV4(5, source, [e1], [p1], [], p1, "contest_or_chance"),
    ).toThrow();
    expect(() => promptForTaskV4(5, withForbidden(input5))).toThrow();
  });

  it("does not carry year or full-source fields past Stage 1 and requires strict prompt inputs", () => {
    const yearSource = buildStage1InputV4({
      id: "year",
      sourceText: "Save $4 from 11 to 17 August",
    });
    const evidenceOnly = [
      { id: "e1", quote: "Save $4", kind: "economic_claim" as const },
    ];
    const nodes = projectInputV4(2, yearSource, evidenceOnly);
    expect(JSON.stringify(nodes)).not.toContain("SOURCE_TEXT");
    expect(JSON.stringify(nodes)).not.toContain("August");
    expect(() => promptForTaskV4(1, withForbidden(yearSource))).toThrow();
  });

  it("keeps stage task prompts blind to forbidden metadata by strict projection", () => {
    const stageInputs = [
      projectInputV4(1, source),
      projectInputV4(2, source, [e1]),
      projectInputV4(3, source, [e1], [p1]),
      projectInputV4(4, source, [e1], [p1], [graphEdges[0]], p1),
      projectInputV4(
        5,
        source,
        [e1],
        [p1],
        [graphEdges[0]],
        p1,
        "economic_offer",
      ),
    ] as const;
    stageInputs.forEach((input, index) => {
      expect(() =>
        promptForTaskV4((index + 1) as 1 | 2 | 3 | 4 | 5, withForbidden(input)),
      ).toThrow();
    });
  });
});

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe("v4 sealed runner integrity against local frozen inputs", () => {
  it("prepares, records, seals and projects a synthetic five-stage chain without network access", async () => {
    const fetchStub = vi.fn(() => {
      throw new Error("network_forbidden_in_test");
    });
    vi.stubGlobal("fetch", fetchStub);
    vi.stubEnv("OPENAI_API_KEY", "V4_FAKE_SECRET_NEVER_SERIALIZE");
    vi.stubEnv("DATABASE_URL", "V4_FAKE_DB_SECRET_NEVER_SERIALIZE");
    try {
      runDir = await prepareRunV4(process.cwd(), runBase);
      sourceTask = (await tasksV4(runDir, 1))[0];
      const tasks = await tasksV4(runDir, 1);
      const manifest = JSON.parse(
        await readFile(path.join(runDir, "manifest.json"), "utf8"),
      );
      expect(tasks).toHaveLength(49);
      expect(new Set(tasks.map((t) => t.caseId)).size).toBe(49);
      expect(Object.keys(manifest.sourceCaptures).length).toBeGreaterThan(0);
      expect(Object.keys(manifest.protectedFiles)).toContain(
        "src/ingestion/promotion-nlp/schema.ts",
      );
      expect(manifest.model).toBe(MODEL_V4);
      expect(manifest.reasoningEffort).toBe(REASONING_V4);
      expect(manifest.concurrency).toBe(CONCURRENCY_V4);
      expect(manifest.forkContext).toBe(false);
      expect(manifest).not.toHaveProperty("apiKey");
      expect(JSON.stringify(manifest)).not.toContain(
        process.env.OPENAI_API_KEY ?? "__unset_api_key_sentinel__",
      );
      expect(JSON.stringify(manifest)).not.toContain(
        "V4_FAKE_DB_SECRET_NEVER_SERIALIZE",
      );
      for (const override of [
        { model: "gpt-6-sol" },
        { reasoningEffort: "high" },
        { forkContext: true },
        { fallback: "gpt-6-sol" },
        { retries: 1 },
      ])
        await expect(
          registerLaunchV4(runDir, 1, {
            ...launchFor(tasks[0], "bad-config"),
            ...override,
          } as unknown as Parameters<typeof registerLaunchV4>[2]),
        ).rejects.toThrow();

      const manifestPath = path.join(runDir, "manifest.json");
      const original = await readFile(manifestPath, "utf8");
      const alteredManifest = JSON.parse(original);
      alteredManifest.concurrency = 5;
      await writeFile(manifestPath, JSON.stringify(alteredManifest));
      await expect(register(tasks[0], "agent-bad-config")).rejects.toThrow(
        "invalid_run_config",
      );
      await writeFile(manifestPath, original);

      const sourceText =
        "SOURCE_TEXT" in sourceTask.input ? sourceTask.input.SOURCE_TEXT : "";
      const quote = sourceText.slice(0, 1);
      await register(sourceTask, "agent-source-valid");
      await persistRawV4(runDir, 1, {
        taskId: sourceTask.taskId,
        agentId: "agent-source-valid",
        rawOutput: JSON.stringify({
          evidence: [{ id: "e1", quote, kind: "other" }],
        }),
        executionStatus: "completed",
      });
      for (let i = 1; i <= 4; i++)
        await register(tasks[i], `agent-concurrency-${i}`);
      await expect(register(tasks[5], "agent-concurrency-5")).rejects.toThrow(
        "concurrency_exceeded",
      );
      await expect(register(tasks[1], "agent-duplicate-task")).rejects.toThrow(
        "duplicate_task_launch",
      );
      await expect(register(tasks[5], "agent-concurrency-1")).rejects.toThrow(
        "reused_agent_identity",
      );
      const malformedRaw = "{ definitely not json";
      await persistRawV4(runDir, 1, {
        taskId: tasks[1].taskId,
        agentId: "agent-concurrency-1",
        rawOutput: malformedRaw,
        executionStatus: "completed",
      });
      const malformedRecord = path.join(
        runDir,
        "stage1-records",
        `${hashV4(tasks[1].taskId)}.json`,
      );
      expect(
        JSON.parse(await readFile(malformedRecord, "utf8")).rawOutput,
      ).toBe(malformedRaw);
      await expect(
        persistRawV4(runDir, 1, {
          taskId: tasks[1].taskId,
          agentId: "agent-concurrency-1",
          rawOutput: malformedRaw,
          executionStatus: "completed",
        }),
      ).rejects.toThrow();
      for (let i = 2; i <= 4; i++)
        await persistRawV4(runDir, 1, {
          taskId: tasks[i].taskId,
          agentId: `agent-concurrency-${i}`,
          rawOutput: null,
          executionStatus: "execution_error",
        });
      await expect(generateTasksV4(runDir, 2)).rejects.toThrow();
      await sealStageV4(runDir, 1);
      await expect(register(sourceTask, "after-seal")).rejects.toThrow(
        "stage_already_sealed",
      );
      await expect(
        persistRawV4(runDir, 1, {
          taskId: sourceTask.taskId,
          agentId: "agent-source-valid",
          rawOutput: "{}",
          executionStatus: "completed",
        }),
      ).rejects.toThrow("stage_already_sealed");
      const generated = await generateTasksV4(runDir, 2);
      expect(generated.tasks).toBe(1);
      expect(generated.blocked).toHaveLength(48);

      const stage2 = (await tasksV4(runDir, 2))[0];
      await complete(
        2,
        stage2,
        {
          propositions: [
            {
              id: "p1",
              anchorEvidenceIds: ["e1"],
              propositionTypeHint: "offer",
            },
          ],
        },
        "agent-stage-2",
      );
      await sealStageV4(runDir, 2);
      expect((await generateTasksV4(runDir, 3)).tasks).toBe(1);
      const stage3 = (await tasksV4(runDir, 3))[0];
      await complete(
        3,
        stage3,
        {
          edges: [
            { evidenceId: "e1", propositionIds: ["p1"], relation: "benefit" },
          ],
        },
        "agent-stage-3",
      );
      await sealStageV4(runDir, 3);
      expect((await generateTasksV4(runDir, 4)).tasks).toBe(1);
      const stage4 = (await tasksV4(runDir, 4))[0];
      await complete(
        4,
        stage4,
        { taxonomy: "economic_offer", evidenceIds: ["e1"] },
        "agent-stage-4",
      );
      await sealStageV4(runDir, 4);
      expect((await generateTasksV4(runDir, 5)).tasks).toBe(1);
      const stage5 = (await tasksV4(runDir, 5))[0];
      expect(JSON.stringify(stage5.input)).not.toContain("SOURCE_TEXT");
      expect(JSON.stringify(stage5.input)).not.toContain("Takeaway only");
      await complete(5, stage5, emptyNormalizationV4(), "agent-stage-5");
      await expect(scoreSealedRunV4(runDir)).rejects.toThrow();
      await sealStageV4(runDir, 5);
      await expect(verifyRunV4(runDir)).resolves.toMatchObject({
        agents: 9,
        captures: expect.any(Number),
      });
      expect(fetchStub).not.toHaveBeenCalled();

      const rawPath = path.join(runDir, "stage1-raw-results.json");
      const raw = await readFile(rawPath, "utf8");
      await writeFile(rawPath, `${raw} `);
      await expect(verifyStageSealV4(runDir, 1)).rejects.toThrow(
        "raw_seal_mismatch",
      );
      await writeFile(rawPath, raw);

      const tasksPath = path.join(runDir, "stage1-tasks.json");
      const taskBytes = await readFile(tasksPath, "utf8");
      await writeFile(tasksPath, `${taskBytes} `);
      await expect(verifyStageSealV4(runDir, 1)).rejects.toThrow(
        "tasks_or_launches_seal_mismatch",
      );
      await writeFile(tasksPath, taskBytes);

      const recordPath = path.join(
        runDir,
        "stage1-records",
        `${hashV4(sourceTask.taskId)}.json`,
      );
      const record = await readFile(recordPath, "utf8");
      const changedRecord = JSON.parse(record);
      changedRecord.finalizedAt = "2000-01-01T00:00:00.000Z";
      await writeFile(recordPath, JSON.stringify(changedRecord));
      await expect(verifyStageSealV4(runDir, 1)).rejects.toThrow(
        "individual_record_changed",
      );
      await writeFile(recordPath, record);

      const sealedManifestPath = path.join(runDir, "manifest.json");
      const sealedManifest = await readFile(sealedManifestPath, "utf8");
      const changed = JSON.parse(sealedManifest);
      changed.concurrency = 5;
      await writeFile(sealedManifestPath, JSON.stringify(changed));
      await expect(verifyStageSealV4(runDir, 1)).rejects.toThrow(
        "manifest_seal_mismatch",
      );
      await writeFile(sealedManifestPath, sealedManifest);
      vi.unstubAllGlobals();

      malformedRunDir = await prepareRunV4(
        process.cwd(),
        path.join(runBase, "malformed"),
      );
      const badTask = (await tasksV4(malformedRunDir, 1))[0];
      await expect(generateTasksV4(malformedRunDir, 2)).rejects.toThrow();
      await registerLaunchV4(
        malformedRunDir,
        1,
        launchFor(badTask, "agent-malformed-only"),
      );
      await persistRawV4(malformedRunDir, 1, {
        taskId: badTask.taskId,
        agentId: "agent-malformed-only",
        rawOutput: "{",
        executionStatus: "completed",
      });
      await sealStageV4(malformedRunDir, 1);
      const blocked = await generateTasksV4(malformedRunDir, 2);
      expect(blocked.tasks).toBe(0);
      expect(blocked.blocked).toHaveLength(49);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});

function launchFor(task: TaskV4, agentId: string) {
  return {
    taskId: task.taskId,
    agentId,
    model: MODEL_V4,
    reasoningEffort: REASONING_V4,
    forkContext: false,
    promptSha256: task.promptSha256,
  } as const;
}
async function register(task: TaskV4, agentId: string) {
  return registerLaunchV4(runDir, 1, launchFor(task, agentId));
}
async function complete(
  stage: 2 | 3 | 4 | 5,
  task: TaskV4,
  output: unknown,
  agentId: string,
) {
  await registerLaunchV4(runDir, stage, launchFor(task, agentId));
  await persistRawV4(runDir, stage, {
    taskId: task.taskId,
    agentId,
    rawOutput: JSON.stringify(output),
    executionStatus: "completed",
  });
}
describe("v4 runner source isolation guard", () => {
  it("has no direct-source, database, acquisition, or hosted-provider imports or calls", async () => {
    const runner = await readFile(
      "scripts/research/promotion-nlp-subagent-v4-evaluation.ts",
      "utf8",
    );
    expect(runner).not.toMatch(
      /from\s+["'][^"']*(?:direct-sources|supabase|pg|openai-provider|acquisition)[^"']*["']/i,
    );
    expect(runner).not.toMatch(
      /(?:fetch\s*\(|\b(?:Pool|createClient)\s*\(|\.\/(?:direct|provider|database))/i,
    );
    expect(runner).not.toContain("process.env.OPENAI_API_KEY");
    expect(ANNOTATION_FILE_V4).toBe(
      "tests/fixtures/promotion-nlp/benchmark-v4.json",
    );
  });
});
