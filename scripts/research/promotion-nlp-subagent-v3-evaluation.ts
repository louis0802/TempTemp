import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { normalizeSourceText } from "../../src/ingestion/promotion-nlp/schema";
import {
  segmentationJsonSchemaV3,
  validateSegmentationV3,
  propositionSchemaV3,
} from "../../src/ingestion/promotion-nlp/segmentation-v3";
import {
  extractionJsonSchemaV3,
  rawExtractionSchemaV3,
} from "../../src/ingestion/promotion-nlp/schema-v3";
import { PROMPT_SEGMENT_V3 } from "../../src/ingestion/promotion-nlp/prompt-segment-v3";
import { PROMPT_EXTRACT_V3 } from "../../src/ingestion/promotion-nlp/prompt-extract-v3";
import { validateExtractionV3 } from "../../src/ingestion/promotion-nlp/validator-v3";
import {
  benchmarkSchemaV3,
  classificationSummaryV3,
  scoreSegmentationV3,
  scoreExtractionV3,
  SAFETY_METRICS_V3,
} from "../../src/ingestion/promotion-nlp/benchmark-v3";

export const MODEL_V3 = "gpt-6-luna",
  REASONING_V3 = "medium",
  CONCURRENCY_V3 = 4;
export const V1_SEAL_V3 =
  "786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a";
export const V2_SEAL_V3 =
  "f5a7a70afd38085ba1c615833ee913432d452e376726c7bc35e39e0e730b248a";
export const DOC_ROOT_V3 =
  "docs/changes/promotion-nlp-proposition-segmentation-v3";
export const ANNOTATION_FILE_V3 =
  "tests/fixtures/promotion-nlp/benchmark-v3.json";
export const FROZEN_FILES_V3 = [
  ...[
    "segmentation-v3",
    "schema-v3",
    "prompt-segment-v3",
    "prompt-extract-v3",
    "validator-v3",
    "benchmark-v3",
  ].map((f) => `src/ingestion/promotion-nlp/${f}.ts`),
  "scripts/research/promotion-nlp-subagent-v3-evaluation.ts",
  ANNOTATION_FILE_V3,
  ...[
    "segmentation-contract",
    "extraction-contract",
    "temporal-contract",
    "constraint-contract",
    "benchmark-review",
  ].map((f) => `${DOC_ROOT_V3}/${f}.md`),
];
export const hashV3 = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const readJson = async (f: string) => JSON.parse(await readFile(f, "utf8"));
const exclusive = (f: string, v: unknown) =>
  writeFile(f, json(v), { flag: "wx", mode: 0o600 });
const sourceInputSchema = z.strictObject({
  id: z.string(),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  SOURCE_TEXT: z.string(),
});
export type SourceInputV3 = z.infer<typeof sourceInputSchema>;
export const unitInputSchemaV3 = z.strictObject({
  caseId: z.string(),
  propositionId: z.string(),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  propositionQuote: z.string(),
  supportingQuotes: z.array(z.string()),
});
export type UnitInputV3 = z.infer<typeof unitInputSchemaV3>;
export function buildStage1InputV3(c: {
  id: string;
  merchantHint?: string | null;
  merchant?: string;
  titleHint?: string | null;
  sourceText: string;
}) {
  return sourceInputSchema.parse({
    id: c.id,
    merchantHint: c.merchantHint ?? c.merchant ?? null,
    titleHint: c.titleHint ?? null,
    SOURCE_TEXT: normalizeSourceText(c.sourceText),
  });
}
export function buildStage2InputV3(
  source: SourceInputV3,
  unit: z.infer<typeof propositionSchemaV3>,
): UnitInputV3 {
  return unitInputSchemaV3.parse({
    caseId: source.id,
    propositionId: unit.id,
    merchantHint: source.merchantHint,
    titleHint: source.titleHint,
    propositionQuote: unit.propositionQuote,
    supportingQuotes: [...unit.supportingQuotes],
  });
}
export function stage1PromptV3(input: SourceInputV3) {
  return [
    PROMPT_SEGMENT_V3,
    "Strict output schema:",
    JSON.stringify(segmentationJsonSchemaV3()),
    "Isolated input:",
    JSON.stringify(sourceInputSchema.parse(input)),
  ].join("\n\n");
}
export function stage2PromptV3(input: UnitInputV3) {
  return [
    PROMPT_EXTRACT_V3,
    "Strict output schema:",
    JSON.stringify(extractionJsonSchemaV3()),
    "Sealed proposition input:",
    JSON.stringify(unitInputSchemaV3.parse(input)),
  ].join("\n\n");
}
const taskSchema = z.strictObject({
  taskId: z.string(),
  input: z.union([sourceInputSchema, unitInputSchemaV3]),
  inputSha256: z.string(),
  promptSha256: z.string(),
});
export type TaskV3 = z.infer<typeof taskSchema>;
const launchSchema = z.strictObject({
  taskId: z.string(),
  agentId: z.string().min(1),
  model: z.literal(MODEL_V3),
  reasoningEffort: z.literal(REASONING_V3),
  forkContext: z.literal(false),
  promptSha256: z.string(),
});
const recordSchema = z.strictObject({
  taskId: z.string(),
  agentId: z.string().nullable(),
  model: z.literal(MODEL_V3),
  reasoningEffort: z.literal(REASONING_V3),
  forkContext: z.literal(false),
  inputSha256: z.string(),
  rawOutput: z.string().nullable(),
  rawOutputSha256: z.string().nullable(),
  executionStatus: z.enum(["completed", "execution_error", "missing_result"]),
  finalizedAt: z.string(),
});
export type RecordV3 = z.infer<typeof recordSchema>;
const manifestSchema = z.strictObject({
  runId: z.string(),
  startedAt: z.string(),
  model: z.literal(MODEL_V3),
  reasoningEffort: z.literal(REASONING_V3),
  forkContext: z.literal(false),
  concurrency: z.literal(CONCURRENCY_V3),
  toolIsolation: z.literal("prompt-enforced; no mechanical denial parameter"),
  backendModelIdentity: z.literal("unavailable"),
  hashes: z.record(z.string(), z.string()),
  frozenFiles: z.record(z.string(), z.string()),
  protectedFiles: z.record(z.string(), z.string()),
  sourceCaptures: z.record(z.string(), z.string()),
  priorRuns: z
    .array(z.strictObject({ file: z.string(), sha256: z.string() }))
    .length(2),
  tasks: z.array(taskSchema).length(49),
});
const getManifest = async (dir: string) =>
  manifestSchema.parse(await readJson(path.join(dir, "manifest.json")));
export type StageV3 = "segmentation" | "extraction";
const paths = (dir: string, stage: StageV3) => ({
  records: path.join(dir, `${stage}-records`),
  launches: path.join(dir, `${stage}-launches`),
  raw: path.join(dir, `${stage}-raw-results.json`),
  seal: path.join(dir, `${stage}-raw-seal.json`),
});
async function unsealed(dir: string, stage: StageV3) {
  try {
    await readFile(paths(dir, stage).seal);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  throw new Error("stage_already_sealed");
}
async function allFiles(root: string, dirs: string[]) {
  const out: string[] = [];
  async function visit(f: string) {
    for (const e of await readdir(path.join(root, f), {
      withFileTypes: true,
    })) {
      const p = path.join(f, e.name);
      if (e.isDirectory()) await visit(p);
      else if (e.isFile()) out.push(p);
    }
  }
  for (const f of dirs) await visit(f);
  return out.sort();
}
async function hashes(root: string, files: string[]) {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [f, hashV3(await readFile(path.join(root, f)))]),
    ),
  );
}
async function priorRuns(root: string) {
  const out: { file: string; sha256: string }[] = [];
  for (const [folder, expected] of [
    [".local/promotion-nlp-subagent", V1_SEAL_V3],
    [".local/promotion-nlp-subagent-v2", V2_SEAL_V3],
  ]) {
    for (const d of await readdir(path.join(root, folder), {
      withFileTypes: true,
    })) {
      if (!d.isDirectory()) continue;
      const f = path.join(folder, d.name, "raw-results.json");
      try {
        if (hashV3(await readFile(path.join(root, f))) === expected)
          out.push({ file: f, sha256: expected });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
    if (!out.some((r) => r.sha256 === expected))
      throw new Error("prior_run_seal_missing");
  }
  return out;
}
export async function prepareRunV3(root = process.cwd()) {
  const prior = await priorRuns(root);
  // Read-only allowlist projection from V1 capture corpus: never load V3 gold during preparation/task generation.
  const b = await readJson(
    path.join(root, "tests/fixtures/promotion-nlp/benchmark.json"),
  );
  const inputs: SourceInputV3[] = b.cases.map(buildStage1InputV3);
  if (inputs.length !== 49 || new Set(inputs.map((i) => i.id)).size !== 49)
    throw new Error("source_case_count_or_ids_invalid");
  const captures: Record<string, string> = Object.fromEntries(
    b.cases.map((c: { sourceReference: { file: string; sha256: string } }) => [
      c.sourceReference.file,
      c.sourceReference.sha256,
    ]),
  );
  for (const [f, h] of Object.entries(captures))
    if (hashV3(await readFile(path.join(root, f))) !== h)
      throw new Error(`source_capture_changed:${f}`);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
    dir = path.join(root, ".local/promotion-nlp-subagent-v3", runId);
  await mkdir(dir, { recursive: true });
  for (const s of ["segmentation", "extraction"] as const) {
    await mkdir(paths(dir, s).records);
    await mkdir(paths(dir, s).launches);
  }
  const frozen = await hashes(root, FROZEN_FILES_V3);
  const protectedFiles = await hashes(root, [
    ...(await allFiles(root, [
      "src",
      "scripts",
      "tests",
      "supabase/migrations",
    ])),
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
    ...prior.map((r) => r.file),
  ]);
  const m = manifestSchema.parse({
    runId,
    startedAt: new Date().toISOString(),
    model: MODEL_V3,
    reasoningEffort: REASONING_V3,
    forkContext: false,
    concurrency: CONCURRENCY_V3,
    toolIsolation: "prompt-enforced; no mechanical denial parameter",
    backendModelIdentity: "unavailable",
    hashes: {
      segmentationSchema: hashV3(JSON.stringify(segmentationJsonSchemaV3())),
      segmentationPrompt: hashV3(PROMPT_SEGMENT_V3),
      extractionSchema: hashV3(JSON.stringify(extractionJsonSchemaV3())),
      extractionPrompt: hashV3(PROMPT_EXTRACT_V3),
      validator: frozen["src/ingestion/promotion-nlp/validator-v3.ts"],
      benchmark: frozen[ANNOTATION_FILE_V3],
    },
    frozenFiles: frozen,
    protectedFiles,
    sourceCaptures: captures,
    priorRuns: prior,
    tasks: inputs.map((input) => ({
      taskId: input.id,
      input,
      inputSha256: hashV3(JSON.stringify(input)),
      promptSha256: hashV3(stage1PromptV3(input)),
    })),
  });
  await exclusive(path.join(dir, "manifest.json"), m);
  await exclusive(
    path.join(dir, "segmentation-tasks.json"),
    m.tasks.map((t) => ({
      ...t,
      prompt: stage1PromptV3(t.input as SourceInputV3),
    })),
  );
  return dir;
}
export async function verifyFrozenV3(dir: string, root = process.cwd()) {
  const m = await getManifest(dir);
  for (const [f, h] of Object.entries(m.frozenFiles))
    if (hashV3(await readFile(path.join(root, f))) !== h)
      throw new Error(`frozen_file_changed:${f}`);
  for (const [f, h] of Object.entries(m.protectedFiles))
    if (hashV3(await readFile(path.join(root, f))) !== h)
      throw new Error(`protected_file_changed:${f}`);
  for (const [f, h] of Object.entries(m.sourceCaptures))
    if (hashV3(await readFile(path.join(root, f))) !== h)
      throw new Error(`source_capture_changed:${f}`);
  return m;
}
export async function tasksV3(dir: string, stage: StageV3): Promise<TaskV3[]> {
  if (stage === "segmentation") return (await getManifest(dir)).tasks;
  const file = await readJson(path.join(dir, "extraction-tasks.json"));
  return z.array(taskSchema).parse(file.tasks);
}
async function launchesV3(dir: string, stage: StageV3) {
  return Promise.all(
    (await readdir(paths(dir, stage).launches)).map(async (f) =>
      launchSchema.parse(
        await readJson(path.join(paths(dir, stage).launches, f)),
      ),
    ),
  );
}
export async function registerLaunchV3(
  dir: string,
  stage: StageV3,
  raw: z.infer<typeof launchSchema>,
  root = process.cwd(),
) {
  await unsealed(dir, stage);
  if (stage === "extraction") {
    const generated = await projectedStage2TasksV3(dir, root);
    if (json(generated.tasks) !== json(await tasksV3(dir, stage)))
      throw new Error("stage2_projection_mismatch");
  }
  const clean = launchSchema.parse(raw),
    tasks = await tasksV3(dir, stage),
    task = tasks.find((t) => t.taskId === clean.taskId);
  if (!task || task.promptSha256 !== clean.promptSha256)
    throw new Error("invalid_launch_task");
  const all = [
    ...(await launchesV3(dir, "segmentation")),
    ...(await launchesV3(dir, "extraction")),
  ];
  if (all.some((l) => l.agentId === clean.agentId))
    throw new Error("reused_agent_identity");
  const current = await launchesV3(dir, stage),
    records = new Set(await readdir(paths(dir, stage).records));
  if (current.some((l) => l.taskId === clean.taskId))
    throw new Error("duplicate_task_launch");
  if (
    current.filter((l) => !records.has(`${hashV3(l.taskId)}.json`)).length >= 4
  )
    throw new Error("concurrency_exceeded");
  await exclusive(
    path.join(paths(dir, stage).launches, `${hashV3(clean.taskId)}.json`),
    clean,
  );
}
export async function persistRawV3(
  dir: string,
  stage: StageV3,
  result: {
    taskId: string;
    agentId: string;
    rawOutput: string | null;
    executionStatus: "completed" | "execution_error";
  },
) {
  await unsealed(dir, stage);
  const launch = launchSchema.parse(
    await readJson(
      path.join(paths(dir, stage).launches, `${hashV3(result.taskId)}.json`),
    ),
  );
  if (launch.agentId !== result.agentId)
    throw new Error("agent_identity_mismatch");
  const task = (await tasksV3(dir, stage)).find(
    (t) => t.taskId === result.taskId,
  )!;
  if ((result.executionStatus === "completed") !== (result.rawOutput !== null))
    throw new Error("invalid_execution_output");
  // Absolutely no JSON.parse or validation of the response before exclusive persistence.
  await exclusive(
    path.join(paths(dir, stage).records, `${hashV3(result.taskId)}.json`),
    recordSchema.parse({
      ...result,
      model: launch.model,
      reasoningEffort: launch.reasoningEffort,
      forkContext: launch.forkContext,
      inputSha256: task.inputSha256,
      rawOutputSha256:
        result.rawOutput === null ? null : hashV3(result.rawOutput),
      finalizedAt: new Date().toISOString(),
    }),
  );
}
export function orderRecordsV3(tasks: TaskV3[], values: unknown[]) {
  const byId = new Map<string, RecordV3>(),
    agents = new Set<string>();
  for (const v of values) {
    const r = recordSchema.parse(v),
      t = tasks.find((t) => t.taskId === r.taskId);
    if (!t) throw new Error("unknown_task_result");
    if (byId.has(r.taskId)) throw new Error("duplicate_task_result");
    if (r.agentId && agents.has(r.agentId))
      throw new Error("reused_agent_identity");
    if (r.agentId) agents.add(r.agentId);
    if (r.inputSha256 !== t.inputSha256) throw new Error("input_hash_mismatch");
    if (
      r.rawOutputSha256 !== (r.rawOutput === null ? null : hashV3(r.rawOutput))
    )
      throw new Error("raw_hash_mismatch");
    if ((r.executionStatus === "completed") !== (r.rawOutput !== null))
      throw new Error("invalid_execution_output");
    byId.set(r.taskId, r);
  }
  return tasks.map(
    (t) =>
      byId.get(t.taskId) ??
      recordSchema.parse({
        taskId: t.taskId,
        agentId: null,
        model: MODEL_V3,
        reasoningEffort: REASONING_V3,
        forkContext: false,
        inputSha256: t.inputSha256,
        rawOutput: null,
        rawOutputSha256: null,
        executionStatus: "missing_result",
        finalizedAt: new Date().toISOString(),
      }),
  );
}
export async function sealStageV3(
  dir: string,
  stage: StageV3,
  root = process.cwd(),
) {
  await unsealed(dir, stage);
  await verifyFrozenV3(dir, root);
  if (stage === "extraction")
    await verifyStageSealV3(dir, "segmentation", root);
  const p = paths(dir, stage),
    tasks = await tasksV3(dir, stage),
    rows = orderRecordsV3(
      tasks,
      await Promise.all(
        (await readdir(p.records)).map((f) =>
          readJson(path.join(p.records, f)),
        ),
      ),
    ),
    launches = await launchesV3(dir, stage);
  for (const r of rows.filter((r) => r.agentId))
    if (!launches.some((l) => l.taskId === r.taskId && l.agentId === r.agentId))
      throw new Error("unregistered_result");
  await exclusive(p.raw, rows);
  await exclusive(p.seal, {
    sha256: hashV3(json(rows)),
    manifestSha256: hashV3(await readFile(path.join(dir, "manifest.json"))),
    launchesSha256: hashV3(
      json(launches.sort((a, b) => a.taskId.localeCompare(b.taskId))),
    ),
    tasksSha256: hashV3(json(tasks)),
    ...(stage === "extraction"
      ? {
          segmentationSealSha256: hashV3(
            await readFile(paths(dir, "segmentation").seal),
          ),
          extractionTaskFileSha256: hashV3(
            await readFile(path.join(dir, "extraction-tasks.json")),
          ),
        }
      : {}),
    sealedAt: new Date().toISOString(),
  });
  return { records: rows.length, agents: launches.length };
}
export async function verifyStageSealV3(
  dir: string,
  stage: StageV3,
  root = process.cwd(),
) {
  const p = paths(dir, stage),
    seal = await readJson(p.seal);
  if (
    hashV3(await readFile(path.join(dir, "manifest.json"))) !==
    seal.manifestSha256
  )
    throw new Error("manifest_seal_mismatch");
  const m = await verifyFrozenV3(dir, root),
    text = await readFile(p.raw, "utf8");
  if (hashV3(text) !== seal.sha256) throw new Error("raw_seal_mismatch");
  const tasks = await tasksV3(dir, stage),
    launches = await launchesV3(dir, stage);
  if (hashV3(json(tasks)) !== seal.tasksSha256)
    throw new Error("task_seal_mismatch");
  if (
    hashV3(json(launches.sort((a, b) => a.taskId.localeCompare(b.taskId)))) !==
    seal.launchesSha256
  )
    throw new Error("launch_seal_mismatch");
  const records = orderRecordsV3(tasks, JSON.parse(text));
  for (const r of records.filter((r) => r.agentId)) {
    const l = launches.find((l) => l.taskId === r.taskId),
      t = tasks.find((t) => t.taskId === r.taskId)!;
    if (!l || l.agentId !== r.agentId || l.promptSha256 !== t.promptSha256)
      throw new Error("launch_result_mismatch");
    if (
      json(await readJson(path.join(p.records, `${hashV3(r.taskId)}.json`))) !==
      json(r)
    )
      throw new Error("individual_record_mismatch");
  }
  if (stage === "extraction") {
    await verifyStageSealV3(dir, "segmentation", root);
    if (
      hashV3(await readFile(paths(dir, "segmentation").seal)) !==
        seal.segmentationSealSha256 ||
      hashV3(await readFile(path.join(dir, "extraction-tasks.json"))) !==
        seal.extractionTaskFileSha256
    )
      throw new Error("stage_boundary_seal_mismatch");
    const generated = await projectedStage2TasksV3(dir, root);
    if (json(generated.tasks) !== json(tasks))
      throw new Error("stage2_projection_mismatch");
    const prior = await launchesV3(dir, "segmentation");
    if (launches.some((l) => prior.some((p) => p.agentId === l.agentId)))
      throw new Error("reused_agent_identity");
  }
  return { manifest: m, seal, records, tasks };
}
export function parseJsonV3(raw: string | null) {
  if (raw === null) return { value: null, syntaxMalformed: false };
  try {
    return { value: JSON.parse(raw) as unknown, syntaxMalformed: false };
  } catch {
    return { value: null, syntaxMalformed: true };
  }
}
async function projectedStage2TasksV3(dir: string, root: string) {
  const sealed = await verifyStageSealV3(dir, "segmentation", root),
    tasks: TaskV3[] = [],
    cases = [];
  for (const r of sealed.records) {
    const input = sealed.tasks.find((t) => t.taskId === r.taskId)!
        .input as SourceInputV3,
      parsed = parseJsonV3(r.rawOutput),
      v = validateSegmentationV3(input.SOURCE_TEXT, parsed.value);
    cases.push({
      caseId: input.id,
      executionStatus: r.executionStatus,
      syntaxMalformed: parsed.syntaxMalformed,
      schemaMalformed:
        r.rawOutput !== null && !parsed.syntaxMalformed && !v.structurallyValid,
      exactSpanFailures: v.issues.filter((i) => i === "exact_span_failure")
        .length,
      usable: v.accepted !== null,
      propositionCount: v.accepted?.propositions.length ?? 0,
    });
    if (v.accepted)
      for (const unit of v.accepted.propositions) {
        const local = buildStage2InputV3(input, unit);
        tasks.push({
          taskId: `${input.id}::${unit.id}`,
          input: local,
          inputSha256: hashV3(JSON.stringify(local)),
          promptSha256: hashV3(stage2PromptV3(local)),
        });
      }
  }
  return { segmentationSealSha256: sealed.seal.sha256, tasks, cases };
}
export async function generateStage2TasksV3(dir: string, root = process.cwd()) {
  await unsealed(dir, "extraction");
  const generated = await projectedStage2TasksV3(dir, root);
  await exclusive(path.join(dir, "extraction-tasks.json"), generated);
  await exclusive(
    path.join(dir, "extraction-blind-tasks.json"),
    generated.tasks.map((t) => ({
      taskId: t.taskId,
      prompt: stage2PromptV3(t.input as UnitInputV3),
    })),
  );
  return { units: generated.tasks.length, cases: generated.cases };
}
export async function scoreSealedRunV3(dir: string, root = process.cwd()) {
  const s1 = await verifyStageSealV3(dir, "segmentation", root),
    s2 = await verifyStageSealV3(dir, "extraction", root);
  // The first interpreted V3 gold load is behind BOTH provenance boundaries.
  const b = benchmarkSchemaV3.parse(
    await readJson(path.join(root, ANNOTATION_FILE_V3)),
  );
  const source = await readJson(
    path.join(root, "tests/fixtures/promotion-nlp/benchmark.json"),
  );
  for (const c of b.cases) {
    const old = source.cases.find((s: { id: string }) => s.id === c.id),
      input = s1.tasks.find((t) => t.taskId === c.id)!.input as SourceInputV3;
    if (
      !old ||
      json(old.sourceReference) !== json(c.sourceReference) ||
      old.sourceText !== c.sourceText ||
      input.merchantHint !== c.merchantHint ||
      input.titleHint !== c.titleHint
    )
      throw new Error("gold_source_envelope_changed");
  }
  const segmentation = s1.records.map((r) => {
    const c = b.cases.find((c) => c.id === r.taskId)!,
      parsed = parseJsonV3(r.rawOutput),
      validated = validateSegmentationV3(c.sourceText, parsed.value);
    return {
      caseId: c.id,
      executionStatus: r.executionStatus,
      syntaxMalformed: parsed.syntaxMalformed,
      schemaMalformed:
        r.rawOutput !== null &&
        !parsed.syntaxMalformed &&
        !validated.structurallyValid,
      validated,
      score: scoreSegmentationV3(c, validated.accepted),
    };
  });
  const extraction = s2.records.map((r) => {
    const input = s2.tasks.find((t) => t.taskId === r.taskId)!
        .input as UnitInputV3,
      c = b.cases.find((c) => c.id === input.caseId)!,
      unit = {
        id: input.propositionId,
        propositionQuote: input.propositionQuote,
        supportingQuotes: input.supportingQuotes,
      },
      p = parseJsonV3(r.rawOutput),
      schema = rawExtractionSchemaV3.safeParse(p.value),
      raw = schema.success ? schema.data : null,
      validated = validateExtractionV3(unit, raw);
    return {
      taskId: r.taskId,
      caseId: input.caseId,
      propositionId: input.propositionId,
      unit,
      executionStatus: r.executionStatus,
      syntaxMalformed: p.syntaxMalformed,
      schemaMalformed:
        r.rawOutput !== null && !p.syntaxMalformed && !schema.success,
      raw,
      validated,
      rawScore: scoreExtractionV3(c, unit, raw),
      acceptedScore: scoreExtractionV3(
        c,
        unit,
        raw ? validated.accepted : null,
      ),
    };
  });
  const stage = (
    records: RecordV3[],
    rows: { syntaxMalformed: boolean; schemaMalformed: boolean }[],
  ) => ({
    tasks: records.length,
    freshAgents: new Set(records.flatMap((r) => (r.agentId ? [r.agentId] : [])))
      .size,
    completed: records.filter((r) => r.executionStatus === "completed").length,
    syntaxMalformed: rows.filter((r) => r.syntaxMalformed).length,
    schemaMalformed: rows.filter((r) => r.schemaMalformed).length,
    executionErrors: records.filter(
      (r) => r.executionStatus === "execution_error",
    ).length,
    missingResults: records.filter(
      (r) => r.executionStatus === "missing_result",
    ).length,
    malformedRate: records.length
      ? rows.filter((r) => r.syntaxMalformed || r.schemaMalformed).length /
        records.length
      : null,
  });
  const semantic = (stage: "rawScore" | "acceptedScore") =>
    Object.fromEntries(
      SAFETY_METRICS_V3.map((metric) => [
        metric,
        {
          events: extraction
            .flatMap((r) => r[stage].findings)
            .filter((f) => f.metric === metric).length,
          cases: [
            ...new Set(
              extraction
                .filter((r) =>
                  r[stage].findings.some((f) => f.metric === metric),
                )
                .map((r) => r.caseId),
            ),
          ],
        },
      ]),
    );
  const recovery = b.cases.map((c) => {
    const expected = c.propositions.filter((g) => g.type === "promotion"),
      outputs = extraction.filter((r) => r.caseId === c.id),
      recovered = expected.filter((g) =>
        outputs.some(
          (r) =>
            r.acceptedScore.goldId === g.id &&
            r.acceptedScore.predicted === "promotion",
        ),
      );
    return {
      caseId: c.id,
      expected: expected.length,
      recovered: recovered.length,
      missed: expected.filter((g) => !recovered.includes(g)).map((g) => g.id),
      falsePromotions: outputs
        .filter(
          (r) =>
            r.acceptedScore.predicted === "promotion" &&
            r.acceptedScore.expectedType !== "promotion",
        )
        .map((r) => r.propositionId),
    };
  });
  const report = {
    runId: s1.manifest.runId,
    hashes: s1.manifest.hashes,
    segmentationSeal: s1.seal.sha256,
    extractionSeal: s2.seal.sha256,
    sourceCases: 49,
    stage1: {
      ...stage(s1.records, segmentation),
      usable: segmentation.filter((r) => r.validated.accepted !== null).length,
      exactSpanFailures: segmentation.reduce(
        (n, r) =>
          n +
          r.validated.issues.filter((i) => i === "exact_span_failure").length,
        0,
      ),
    },
    stage2: stage(s2.records, extraction),
    totalPropositionUnits: s2.tasks.length,
    segmentation: {
      expected: b.cases.reduce((n, c) => n + c.propositions.length, 0),
      recalled: segmentation.reduce((n, r) => n + r.score.recalled, 0),
      unexpected: segmentation.reduce((n, r) => n + r.score.unexpected, 0),
      merged: segmentation.reduce((n, r) => n + r.score.merged, 0),
      harmfulSplits: segmentation.reduce(
        (n, r) => n + r.score.harmfulSplits.length,
        0,
      ),
      ambiguousAttached: segmentation
        .flatMap((r) => r.score.units)
        .reduce((n, u) => n + u.ambiguousAttached.length, 0),
      crossAttachments: segmentation
        .flatMap((r) => r.score.units)
        .reduce((n, u) => n + u.crossAttachments.length, 0),
      requiredSupportingMissed: segmentation
        .flatMap((r) => r.score.units)
        .reduce((n, u) => n + u.missedSupporting.length, 0),
    },
    classification: classificationSummaryV3(
      extraction.map((r) => r.acceptedScore),
    ),
    usableClassification: classificationSummaryV3(
      extraction.filter((r) => r.raw !== null).map((r) => r.acceptedScore),
    ),
    rawSemanticFlags: semantic("rawScore"),
    acceptedSemanticFlags: semantic("acceptedScore"),
    sourceRecovery: {
      expected: recovery.reduce((n, r) => n + r.expected, 0),
      recovered: recovery.reduce((n, r) => n + r.recovered, 0),
      missed: recovery.reduce((n, r) => n + r.missed.length, 0),
      falsePromotions: recovery.reduce(
        (n, r) => n + r.falsePromotions.length,
        0,
      ),
      cases: recovery,
    },
    fieldCorrectness: {
      dates: extraction.filter((r) => r.acceptedScore.datesCorrect === true)
        .length,
      weekdays: extraction.filter(
        (r) => r.acceptedScore.weekdaysCorrect === true,
      ).length,
      timeConstraints: extraction.filter(
        (r) => r.acceptedScore.timeCorrect === true,
      ).length,
    },
    quoteMismatches: extraction
      .flatMap((r) => r.validated.issues)
      .filter((i) => i.code === "quote_mismatch").length,
    validatorRejections: extraction.flatMap((r) => r.validated.issues).length,
    semanticCoverage: {
      sources: 49,
      segmentationUnassessable: segmentation
        .filter((r) => r.validated.accepted === null)
        .map((r) => r.caseId),
      extractionUsable: extraction.filter((r) => r.raw !== null).length,
      extractionUnassessable: extraction
        .filter((r) => r.raw === null)
        .map((r) => r.taskId),
    },
    sourceReviewRequired: true,
  };
  await exclusive(path.join(dir, "segmentation-evaluation.json"), segmentation);
  await exclusive(path.join(dir, "extraction-evaluation.json"), extraction);
  await exclusive(path.join(dir, "scores.json"), report);
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, dir, payload] = process.argv.slice(2);
  if (mode === "prepare") console.log(await prepareRunV3());
  else if (mode === "generate" && dir)
    console.log(json(await generateStage2TasksV3(dir)));
  else if (mode === "score" && dir)
    console.log(json(await scoreSealedRunV3(dir)));
  else if (mode === "verify" && dir) {
    for (const stage of ["segmentation", "extraction"] as const)
      console.log((await verifyStageSealV3(dir, stage)).seal.sha256);
  } else if (["launch", "record", "seal"].includes(mode) && dir && payload) {
    const stage = z.enum(["segmentation", "extraction"]).parse(payload);
    if (mode === "seal") console.log(json(await sealStageV3(dir, stage)));
    else {
      const file = process.argv[5];
      if (!file) throw new Error("missing_payload");
      if (mode === "launch")
        await registerLaunchV3(dir, stage, await readJson(file));
      else await persistRawV3(dir, stage, await readJson(file));
    }
  } else throw new Error("invalid_research_argument");
}
