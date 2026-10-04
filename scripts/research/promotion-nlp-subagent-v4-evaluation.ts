import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { normalizeSourceText } from "../../src/ingestion/promotion-nlp/schema";
import {
  evidenceSchemaV4,
  propositionSchemaV4,
  edgeSchemaV4,
  STAGES_V4,
  jsonSchemaV4,
  type StageV4,
  type EvidenceV4,
  type PropositionV4,
  type EdgeV4,
  type EligibilityOutputV4,
  type NormalizationV4,
} from "../../src/ingestion/promotion-nlp/schema-v4";
import {
  PROMPTS_V4,
  stagePromptV4,
} from "../../src/ingestion/promotion-nlp/prompt-v4";
import {
  parseJsonV4,
  validateStageV4,
  type ValidationContextV4,
} from "../../src/ingestion/promotion-nlp/validator-v4";

export const MODEL_V4 = "gpt-6-luna",
  REASONING_V4 = "medium",
  CONCURRENCY_V4 = 4;
export const DOC_ROOT_V4 =
  "docs/changes/promotion-nlp-atomic-evidence-graph-v4";
export const ANNOTATION_FILE_V4 =
  "tests/fixtures/promotion-nlp/benchmark-v4.json";
export const FROZEN_FILES_V4 = [
  ...["schema-v4", "prompt-v4", "validator-v4", "benchmark-v4"].map(
    (f) => `src/ingestion/promotion-nlp/${f}.ts`,
  ),
  "scripts/research/promotion-nlp-subagent-v4-evaluation.ts",
  ANNOTATION_FILE_V4,
  "tests/promotion-nlp-v4.test.ts",
  "tests/promotion-nlp-benchmark-v4.test.ts",
  "tests/promotion-nlp-subagent-v4.test.ts",
  ...[
    "spec",
    "evidence-contract",
    "proposition-contract",
    "edge-contract",
    "publication-taxonomy",
    "normalization-contract",
    "benchmark-review",
  ].map((f) => `${DOC_ROOT_V4}/${f}.md`),
];
export const PRIOR_SEALS_V4 = [
  [
    ".local/promotion-nlp-subagent",
    "raw-results.json",
    "786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a",
  ],
  [
    ".local/promotion-nlp-subagent-v2",
    "raw-results.json",
    "f5a7a70afd38085ba1c615833ee913432d452e376726c7bc35e39e0e730b248a",
  ],
  [
    ".local/promotion-nlp-subagent-v3",
    "segmentation-raw-results.json",
    "ae4320c80a46b4c2135934abdb8e976ab3f30c685dda4f02fa7eb29470e73b37",
  ],
  [
    ".local/promotion-nlp-subagent-v3",
    "extraction-raw-results.json",
    "a24a8f92bbf7971832d87b1a13dbb3bd9b331076143396724de6f4af7443d153",
  ],
] as const;
export const hashV4 = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const readJson = async (f: string) => JSON.parse(await readFile(f, "utf8"));
const exclusive = (f: string, v: unknown) =>
  writeFile(f, json(v), { flag: "wx", mode: 0o600 });
const hints = {
  caseId: z.string(),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
};
export const sourceInputSchemaV4 = z.strictObject({
  ...hints,
  SOURCE_TEXT: z.string(),
});
const nodesInputSchema = z.strictObject({
  ...hints,
  evidence: z.array(evidenceSchemaV4),
});
const graphInputSchema = z.strictObject({
  ...hints,
  evidence: z.array(evidenceSchemaV4),
  propositions: z.array(propositionSchemaV4),
});
const localInputSchema = z.strictObject({
  ...hints,
  proposition: propositionSchemaV4,
  evidence: z.array(evidenceSchemaV4),
  edges: z.array(edgeSchemaV4),
});
const normalInputSchema = localInputSchema.extend({
  taxonomy: z.literal("economic_offer"),
});
export const inputSchemasV4 = {
  1: sourceInputSchemaV4,
  2: nodesInputSchema,
  3: graphInputSchema,
  4: localInputSchema,
  5: normalInputSchema,
};
export type InputV4 = z.infer<(typeof inputSchemasV4)[StageV4]>;
export function buildStage1InputV4(c: {
  id: string;
  sourceText: string;
  merchantHint?: string | null;
  merchant?: string;
  titleHint?: string | null;
}) {
  return sourceInputSchemaV4.parse({
    caseId: c.id,
    merchantHint: c.merchantHint ?? c.merchant ?? null,
    titleHint: c.titleHint ?? null,
    SOURCE_TEXT: normalizeSourceText(c.sourceText),
  });
}
function neutral(i: InputV4) {
  return {
    caseId: i.caseId,
    merchantHint: i.merchantHint,
    titleHint: i.titleHint,
  };
}
export function projectInputV4(
  stage: StageV4,
  source: InputV4,
  evidence: EvidenceV4[] = [],
  propositions: PropositionV4[] = [],
  edges: EdgeV4[] = [],
  proposition?: PropositionV4,
  taxonomy?: string,
): InputV4 {
  const nodes = evidence.map((e) =>
    evidenceSchemaV4.parse({ id: e.id, quote: e.quote, kind: e.kind }),
  );
  const anchors = propositions.map((p) =>
    propositionSchemaV4.parse({
      id: p.id,
      anchorEvidenceIds: [...p.anchorEvidenceIds],
      propositionTypeHint: p.propositionTypeHint,
    }),
  );
  if (stage === 1)
    return sourceInputSchemaV4.parse({
      ...neutral(source),
      SOURCE_TEXT: "SOURCE_TEXT" in source ? source.SOURCE_TEXT : undefined,
    });
  if (stage === 2)
    return nodesInputSchema.parse({ ...neutral(source), evidence: nodes });
  if (stage === 3)
    return graphInputSchema.parse({
      ...neutral(source),
      evidence: nodes,
      propositions: anchors,
    });
  if (!proposition) throw new Error("missing_local_proposition");
  const localEdges = edges
    .filter((e) => e.propositionIds.includes(proposition.id))
    .map((e) => ({
      evidenceId: e.evidenceId,
      propositionIds: [proposition.id],
      relation: e.relation,
    }));
  const localIds = new Set([
    ...proposition.anchorEvidenceIds,
    ...localEdges.map((e) => e.evidenceId),
  ]);
  const local = {
    ...neutral(source),
    proposition: propositionSchemaV4.parse(proposition),
    evidence: nodes.filter((e) => localIds.has(e.id)),
    edges: localEdges,
  };
  if (stage === 4) return localInputSchema.parse(local);
  return normalInputSchema.parse({ ...local, taxonomy });
}
export function promptForTaskV4(stage: StageV4, input: unknown) {
  return stagePromptV4(stage, inputSchemasV4[stage].parse(input));
}
const taskSchema = z.strictObject({
  taskId: z.string(),
  caseId: z.string(),
  propositionId: z.string().nullable(),
  input: z.unknown(),
  inputSha256: z.string(),
  promptSha256: z.string(),
});
export type TaskV4 = z.infer<typeof taskSchema> & { input: InputV4 };
const launchSchema = z.strictObject({
  taskId: z.string(),
  agentId: z.string().min(1),
  model: z.literal(MODEL_V4),
  reasoningEffort: z.literal(REASONING_V4),
  forkContext: z.literal(false),
  promptSha256: z.string(),
});
const recordSchema = z.strictObject({
  taskId: z.string(),
  agentId: z.string().nullable(),
  model: z.literal(MODEL_V4),
  reasoningEffort: z.literal(REASONING_V4),
  forkContext: z.literal(false),
  inputSha256: z.string(),
  rawOutput: z.string().nullable(),
  rawOutputSha256: z.string().nullable(),
  executionStatus: z.enum(["completed", "execution_error", "missing_result"]),
  finalizedAt: z.string(),
});
export type RecordV4 = z.infer<typeof recordSchema>;
const paths = (dir: string, s: StageV4) => ({
  tasks: path.join(dir, `stage${s}-tasks.json`),
  launches: path.join(dir, `stage${s}-launches`),
  records: path.join(dir, `stage${s}-records`),
  raw: path.join(dir, `stage${s}-raw-results.json`),
  seal: path.join(dir, `stage${s}-raw-seal.json`),
});
async function unsealed(dir: string, stage: StageV4) {
  try {
    await readFile(paths(dir, stage).seal);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  throw new Error("stage_already_sealed");
}
async function collectFiles(root: string, dirs: string[]) {
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
  for (const d of dirs) await visit(d);
  return out.sort();
}
const hashes = async (root: string, files: string[]) =>
  Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [f, hashV4(await readFile(path.join(root, f)))]),
    ),
  );
const task = (
  stage: StageV4,
  input: InputV4,
  propositionId: string | null = null,
): TaskV4 => ({
  taskId: propositionId ? `${input.caseId}::${propositionId}` : input.caseId,
  caseId: input.caseId,
  propositionId,
  input,
  inputSha256: hashV4(JSON.stringify(input)),
  promptSha256: hashV4(promptForTaskV4(stage, input)),
});
async function findPrior(root: string) {
  const prior: { file: string; sha256: string }[] = [];
  for (const [folder, name, sha256] of PRIOR_SEALS_V4) {
    const found: string[] = [];
    for (const e of await readdir(path.join(root, folder), {
      withFileTypes: true,
    }))
      if (e.isDirectory()) {
        const file = path.join(folder, e.name, name);
        try {
          if (hashV4(await readFile(path.join(root, file))) === sha256)
            found.push(file);
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      }
    if (found.length !== 1) throw new Error("prior_seal_missing_or_ambiguous");
    prior.push({ file: found[0], sha256 });
  }
  return prior;
}
export async function prepareRunV4(
  root = process.cwd(),
  runBase = path.join(root, ".local/promotion-nlp-subagent-v4"),
) {
  const prior = await findPrior(root);
  // Source-only, sealed V3 task projection; no benchmark annotations or prior model answers read.
  const v3ManifestFile = path.join(
    path.dirname(prior[2].file),
    "manifest.json",
  );
  const v3Seal = await readJson(
    path.join(root, path.dirname(prior[2].file), "segmentation-raw-seal.json"),
  );
  if (
    hashV4(await readFile(path.join(root, v3ManifestFile))) !==
    v3Seal.manifestSha256
  )
    throw new Error("sealed_source_manifest_changed");
  const v3 = await readJson(path.join(root, v3ManifestFile));
  const sourceInputs = v3.tasks.map(
    (t: {
      input: {
        id: string;
        merchantHint: string | null;
        titleHint: string | null;
        SOURCE_TEXT: string;
      };
    }) =>
      buildStage1InputV4({
        id: t.input.id,
        sourceText: t.input.SOURCE_TEXT,
        merchantHint: t.input.merchantHint,
        titleHint: t.input.titleHint,
      }),
  );
  if (
    sourceInputs.length !== 49 ||
    new Set(sourceInputs.map((i: InputV4) => i.caseId)).size !== 49
  )
    throw new Error("invalid_source_corpus");
  const sourceCaptures: Record<string, string> = v3.sourceCaptures;
  for (const [f, h] of Object.entries(sourceCaptures))
    if (hashV4(await readFile(path.join(root, f))) !== h)
      throw new Error(`capture_changed:${f}`);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
    dir = path.join(runBase, runId);
  await mkdir(dir, { recursive: true });
  for (const s of STAGES_V4) {
    await mkdir(paths(dir, s).records);
    await mkdir(paths(dir, s).launches);
  }
  const frozenFiles = await hashes(root, FROZEN_FILES_V4);
  const protectedFiles = await hashes(root, [
    ...(
      await collectFiles(root, [
        "src",
        "scripts",
        "tests",
        "docs",
        "supabase/migrations",
        ...new Set(prior.map((p) => path.dirname(p.file))),
      ])
    ).filter(
      (f) =>
        !f.startsWith(`${DOC_ROOT_V4}/`) &&
        !FROZEN_FILES_V4.includes(f) &&
        !/^tests\/promotion-nlp.*v4\.test\.ts$/.test(f),
    ),
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
  ]);
  const priorAgentIds = [
    ...new Set(
      (
        await Promise.all(
          prior.map(async (p) =>
            (await readJson(path.join(root, p.file))).map(
              (r: { agentId: string | null }) => r.agentId,
            ),
          ),
        )
      )
        .flat()
        .filter((a): a is string => typeof a === "string"),
    ),
  ];
  const m = {
    runId,
    startedAt: new Date().toISOString(),
    model: MODEL_V4,
    reasoningEffort: REASONING_V4,
    forkContext: false,
    concurrency: CONCURRENCY_V4,
    toolIsolation: "prompt-enforced; no mechanical denial parameter",
    backendModelIdentity: "unavailable",
    frozenFiles,
    protectedFiles,
    sourceCaptures,
    prior,
    priorAgentIds,
    sourceInputs,
    sourceProjection: {
      file: v3ManifestFile,
      sha256: hashV4(await readFile(path.join(root, v3ManifestFile))),
    },
    hashes: {
      ...Object.fromEntries(
        STAGES_V4.flatMap((s) => [
          [`stage${s}Schema`, hashV4(JSON.stringify(jsonSchemaV4(s)))],
          [`stage${s}Prompt`, hashV4(PROMPTS_V4[s])],
        ]),
      ),
      validator: frozenFiles["src/ingestion/promotion-nlp/validator-v4.ts"],
      scorer: frozenFiles["src/ingestion/promotion-nlp/benchmark-v4.ts"],
      benchmark: frozenFiles[ANNOTATION_FILE_V4],
      runner:
        frozenFiles["scripts/research/promotion-nlp-subagent-v4-evaluation.ts"],
    },
  };
  await exclusive(path.join(dir, "manifest.json"), m);
  await exclusive(paths(dir, 1).tasks, {
    stage: 1,
    upstreamSeals: {},
    tasks: sourceInputs.map((i: InputV4) => task(1, i)),
    blocked: [],
  });
  return dir;
}
export async function tasksV4(dir: string, stage: StageV4): Promise<TaskV4[]> {
  const data = await readJson(paths(dir, stage).tasks);
  if (data.stage !== stage) throw new Error("task_stage_mismatch");
  return z
    .array(taskSchema)
    .parse(data.tasks)
    .map((t) => {
      const input = inputSchemasV4[stage].parse(t.input);
      if (
        t.inputSha256 !== hashV4(JSON.stringify(input)) ||
        t.promptSha256 !== hashV4(promptForTaskV4(stage, input))
      )
        throw new Error("task_hash_mismatch");
      return { ...t, input };
    });
}
async function launches(dir: string, stage: StageV4) {
  return Promise.all(
    (await readdir(paths(dir, stage).launches))
      .sort()
      .map((f) =>
        readJson(path.join(paths(dir, stage).launches, f)).then((v) =>
          launchSchema.parse(v),
        ),
      ),
  );
}
async function registerUnlockedV4(
  dir: string,
  stage: StageV4,
  raw: z.infer<typeof launchSchema>,
) {
  await unsealed(dir, stage);
  const m = await readJson(path.join(dir, "manifest.json"));
  if (
    m.concurrency !== 4 ||
    m.model !== MODEL_V4 ||
    m.reasoningEffort !== REASONING_V4 ||
    m.forkContext !== false
  )
    throw new Error("invalid_run_config");
  const l = launchSchema.parse(raw),
    ts = await tasksV4(dir, stage),
    t = ts.find((t) => t.taskId === l.taskId);
  if (!t || t.promptSha256 !== l.promptSha256)
    throw new Error("invalid_launch_task");
  if (
    stage > 1 &&
    json(await projection(dir, stage)) !==
      (await readFile(paths(dir, stage).tasks, "utf8"))
  )
    throw new Error("task_projection_mismatch");
  const all = (
    await Promise.all(STAGES_V4.map((s) => launches(dir, s)))
  ).flat();
  if (
    all.some((a) => a.agentId === l.agentId) ||
    m.priorAgentIds.includes(l.agentId)
  )
    throw new Error("reused_agent_identity");
  const current = await launches(dir, stage),
    records = new Set(await readdir(paths(dir, stage).records));
  if (current.some((a) => a.taskId === l.taskId))
    throw new Error("duplicate_task_launch");
  if (
    current.filter((a) => !records.has(`${hashV4(a.taskId)}.json`)).length >=
    CONCURRENCY_V4
  )
    throw new Error("concurrency_exceeded");
  let active = 0;
  for (const s of STAGES_V4) {
    const saved = new Set(await readdir(paths(dir, s).records));
    active += (await launches(dir, s)).filter(
      (a) => !saved.has(`${hashV4(a.taskId)}.json`),
    ).length;
  }
  if (active >= CONCURRENCY_V4) throw new Error("concurrency_exceeded");
  await exclusive(
    path.join(paths(dir, stage).launches, `${hashV4(l.taskId)}.json`),
    l,
  );
}
export async function registerLaunchV4(
  dir: string,
  stage: StageV4,
  raw: z.infer<typeof launchSchema>,
) {
  const lock = path.join(dir, "launch-registration.lock");
  await writeFile(lock, "exclusive launch registration\n", {
    flag: "wx",
    mode: 0o600,
  });
  try {
    await registerUnlockedV4(dir, stage, raw);
  } finally {
    await rm(lock);
  }
}
export async function persistRawV4(
  dir: string,
  stage: StageV4,
  r: {
    taskId: string;
    agentId: string;
    rawOutput: string | null;
    executionStatus: "completed" | "execution_error";
  },
) {
  await unsealed(dir, stage);
  const l = launchSchema.parse(
    await readJson(
      path.join(paths(dir, stage).launches, `${hashV4(r.taskId)}.json`),
    ),
  );
  if (r.agentId !== l.agentId) throw new Error("agent_identity_mismatch");
  const t = (await tasksV4(dir, stage)).find((t) => t.taskId === r.taskId)!;
  if ((r.executionStatus === "completed") !== (r.rawOutput !== null))
    throw new Error("invalid_execution_output");
  // Persist first raw bytes exclusively, BEFORE ANY response JSON.parse or structural validation.
  await exclusive(
    path.join(paths(dir, stage).records, `${hashV4(r.taskId)}.json`),
    recordSchema.parse({
      ...r,
      model: l.model,
      reasoningEffort: l.reasoningEffort,
      forkContext: l.forkContext,
      inputSha256: t.inputSha256,
      rawOutputSha256: r.rawOutput === null ? null : hashV4(r.rawOutput),
      finalizedAt: new Date().toISOString(),
    }),
  );
}
function orderedRecords(ts: TaskV4[], values: unknown[]): RecordV4[] {
  const records = values.map((v) => recordSchema.parse(v));
  if (new Set(records.map((r) => r.taskId)).size !== records.length)
    throw new Error("duplicate_record");
  for (const r of records) {
    const t = ts.find((t) => t.taskId === r.taskId);
    if (
      !t ||
      r.inputSha256 !== t.inputSha256 ||
      r.rawOutputSha256 !== (r.rawOutput === null ? null : hashV4(r.rawOutput))
    )
      throw new Error("record_binding_mismatch");
    if ((r.executionStatus === "completed") !== (r.rawOutput !== null))
      throw new Error("record_status_mismatch");
  }
  return ts.map(
    (t) =>
      records.find((r) => r.taskId === t.taskId) ??
      recordSchema.parse({
        taskId: t.taskId,
        agentId: null,
        model: MODEL_V4,
        reasoningEffort: REASONING_V4,
        forkContext: false,
        inputSha256: t.inputSha256,
        rawOutput: null,
        rawOutputSha256: null,
        executionStatus: "missing_result",
        finalizedAt: new Date().toISOString(),
      }),
  );
}
export async function verifyFrozenV4(dir: string, root = process.cwd()) {
  const m = await readJson(path.join(dir, "manifest.json"));
  if (
    m.model !== MODEL_V4 ||
    m.reasoningEffort !== REASONING_V4 ||
    m.forkContext !== false ||
    m.concurrency !== CONCURRENCY_V4
  )
    throw new Error("invalid_run_config");
  if (
    hashV4(await readFile(path.join(root, m.sourceProjection.file))) !==
    m.sourceProjection.sha256
  )
    throw new Error("source_manifest_changed");
  const sourceManifest = await readJson(
    path.join(root, m.sourceProjection.file),
  );
  const sourceProjection = sourceManifest.tasks.map(
    (t: {
      input: {
        id: string;
        merchantHint: string | null;
        titleHint: string | null;
        SOURCE_TEXT: string;
      };
    }) =>
      buildStage1InputV4({
        id: t.input.id,
        sourceText: t.input.SOURCE_TEXT,
        merchantHint: t.input.merchantHint,
        titleHint: t.input.titleHint,
      }),
  );
  if (
    json(sourceProjection) !== json(m.sourceInputs) ||
    json(sourceManifest.sourceCaptures) !== json(m.sourceCaptures)
  )
    throw new Error("source_projection_changed");
  for (const [f, h] of Object.entries({
    ...m.frozenFiles,
    ...m.sourceCaptures,
  }))
    if (hashV4(await readFile(path.join(root, f))) !== h)
      throw new Error(`frozen_or_capture_changed:${f}`);
  for (const p of m.prior)
    if (hashV4(await readFile(path.join(root, p.file))) !== p.sha256)
      throw new Error("prior_seal_changed");
  return m;
}
const launchDigest = async (dir: string, s: StageV4) =>
  hashV4(
    json(
      (await launches(dir, s)).sort((a, b) => a.taskId.localeCompare(b.taskId)),
    ),
  );
export async function sealStageV4(
  dir: string,
  stage: StageV4,
  root = process.cwd(),
) {
  await unsealed(dir, stage);
  await verifyFrozenV4(dir, root);
  if (stage > 1) await verifyStageSealV4(dir, (stage - 1) as StageV4);
  const ts = await tasksV4(dir, stage),
    ls = await launches(dir, stage);
  const rows = orderedRecords(
    ts,
    await Promise.all(
      (await readdir(paths(dir, stage).records)).map((f) =>
        readJson(path.join(paths(dir, stage).records, f)),
      ),
    ),
  );
  for (const r of rows.filter((r) => r.agentId))
    if (!ls.some((l) => l.taskId === r.taskId && l.agentId === r.agentId))
      throw new Error("unregistered_result");
  await exclusive(paths(dir, stage).raw, rows);
  const seal = {
    stage,
    sha256: hashV4(json(rows)),
    manifestSha256: hashV4(await readFile(path.join(dir, "manifest.json"))),
    tasksFileSha256: hashV4(await readFile(paths(dir, stage).tasks)),
    launchesSha256: await launchDigest(dir, stage),
    previousSealSha256:
      stage === 1
        ? null
        : hashV4(await readFile(paths(dir, (stage - 1) as StageV4).seal)),
    sealedAt: new Date().toISOString(),
  };
  await exclusive(paths(dir, stage).seal, seal);
  return { tasks: ts.length, agents: ls.length, sha256: seal.sha256 };
}
export async function verifyStageSealV4(dir: string, stage: StageV4) {
  const seal = await readJson(paths(dir, stage).seal);
  if (
    seal.stage !== stage ||
    hashV4(await readFile(paths(dir, stage).raw)) !== seal.sha256
  )
    throw new Error("raw_seal_mismatch");
  if (
    hashV4(await readFile(path.join(dir, "manifest.json"))) !==
    seal.manifestSha256
  )
    throw new Error("manifest_seal_mismatch");
  if (
    hashV4(await readFile(paths(dir, stage).tasks)) !== seal.tasksFileSha256 ||
    (await launchDigest(dir, stage)) !== seal.launchesSha256
  )
    throw new Error("tasks_or_launches_seal_mismatch");
  const ts = await tasksV4(dir, stage),
    rows = orderedRecords(ts, await readJson(paths(dir, stage).raw));
  const sealedLaunches = await launches(dir, stage);
  for (const r of rows.filter((r) => r.agentId)) {
    if (
      json(
        await readJson(
          path.join(paths(dir, stage).records, `${hashV4(r.taskId)}.json`),
        ),
      ) !== json(r)
    )
      throw new Error("individual_record_changed");
    const l = sealedLaunches.find((l) => l.taskId === r.taskId);
    if (
      !l ||
      l.agentId !== r.agentId ||
      l.promptSha256 !== ts.find((t) => t.taskId === r.taskId)!.promptSha256
    )
      throw new Error("launch_binding_mismatch");
  }
  if (stage > 1) {
    await verifyStageSealV4(dir, (stage - 1) as StageV4);
    if (
      hashV4(await readFile(paths(dir, (stage - 1) as StageV4).seal)) !==
      seal.previousSealSha256
    )
      throw new Error("upstream_seal_mismatch");
  }
  return { seal, tasks: ts, records: rows };
}
export function parseRecordV4(
  stage: StageV4,
  t: TaskV4,
  r: RecordV4 | undefined,
) {
  if (!r || r.rawOutput === null)
    return {
      valid: false,
      data: null,
      syntaxMalformed: false,
      schemaMalformed: false,
      issues: ["missing_or_failed_result"],
    };
  const parsed = parseJsonV4(r.rawOutput);
  if (parsed.syntaxMalformed)
    return {
      valid: false,
      data: null,
      syntaxMalformed: true,
      schemaMalformed: false,
      issues: ["syntax_malformed"],
    };
  const i = t.input;
  const ctx: ValidationContextV4 = {
    ...("SOURCE_TEXT" in i ? { SOURCE_TEXT: i.SOURCE_TEXT } : {}),
    ...("evidence" in i ? { evidence: i.evidence } : {}),
    ...("propositions" in i ? { propositions: i.propositions } : {}),
    ...("edges" in i ? { edges: i.edges } : {}),
    ...("taxonomy" in i ? { taxonomy: i.taxonomy } : {}),
  };
  const validated = validateStageV4(stage, parsed.value, ctx);
  return {
    ...validated,
    syntaxMalformed: false,
    schemaMalformed: !validated.valid,
  };
}
async function sealedParsed(dir: string, stage: StageV4) {
  const v = await verifyStageSealV4(dir, stage);
  return v.tasks.map((t) => ({
    task: t,
    record: v.records.find((r) => r.taskId === t.taskId)!,
    result: parseRecordV4(
      stage,
      t,
      v.records.find((r) => r.taskId === t.taskId),
    ),
  }));
}
async function projection(dir: string, stage: StageV4) {
  if (stage === 1) throw new Error("cannot_generate_stage1");
  const m = await readJson(path.join(dir, "manifest.json"));
  const prior: Partial<
    Record<StageV4, Awaited<ReturnType<typeof sealedParsed>>>
  > = {};
  const upstreamSeals: Record<string, string> = {};
  for (const s of STAGES_V4.filter((s) => s < stage)) {
    prior[s] = await sealedParsed(dir, s);
    upstreamSeals[String(s)] = hashV4(await readFile(paths(dir, s).seal));
  }
  const ts: TaskV4[] = [],
    blocked: {
      caseId: string;
      propositionId?: string;
      stage: number;
      reason: string[];
    }[] = [];
  for (const source of m.sourceInputs as InputV4[]) {
    const s1 = prior[1]!.find((r) => r.task.caseId === source.caseId)!;
    if (
      !s1.result.valid ||
      !s1.result.data ||
      !("evidence" in s1.result.data)
    ) {
      blocked.push({
        caseId: source.caseId,
        stage: 1,
        reason: s1.result.issues,
      });
      continue;
    }
    const evidence = [...s1.result.data.evidence].sort((a, b) =>
      "SOURCE_TEXT" in source
        ? source.SOURCE_TEXT.indexOf(a.quote) -
          source.SOURCE_TEXT.indexOf(b.quote)
        : 0,
    );
    if (stage === 2) {
      ts.push(task(stage, projectInputV4(stage, source, evidence)));
      continue;
    }
    const s2 = prior[2]!.find((r) => r.task.caseId === source.caseId);
    if (
      !s2?.result.valid ||
      !s2.result.data ||
      !("propositions" in s2.result.data)
    ) {
      blocked.push({
        caseId: source.caseId,
        stage: 2,
        reason: s2?.result.issues ?? ["missing_task"],
      });
      continue;
    }
    const props = s2.result.data.propositions;
    if (stage === 3) {
      ts.push(task(stage, projectInputV4(stage, source, evidence, props)));
      continue;
    }
    const s3 = prior[3]!.find((r) => r.task.caseId === source.caseId);
    if (!s3?.result.valid || !s3.result.data || !("edges" in s3.result.data)) {
      blocked.push({
        caseId: source.caseId,
        stage: 3,
        reason: s3?.result.issues ?? ["missing_task"],
      });
      continue;
    }
    const edges = s3.result.data.edges;
    for (const p of props) {
      if (stage === 4) {
        ts.push(
          task(
            stage,
            projectInputV4(stage, source, evidence, props, edges, p),
            p.id,
          ),
        );
        continue;
      }
      const s4 = prior[4]!.find(
        (r) => r.task.caseId === source.caseId && r.task.propositionId === p.id,
      );
      if (
        !s4?.result.valid ||
        !s4.result.data ||
        !("taxonomy" in s4.result.data)
      ) {
        blocked.push({
          caseId: source.caseId,
          propositionId: p.id,
          stage: 4,
          reason: s4?.result.issues ?? ["missing_task"],
        });
        continue;
      }
      if (s4.result.data.taxonomy === "economic_offer")
        ts.push(
          task(
            stage,
            projectInputV4(
              stage,
              source,
              evidence,
              props,
              edges,
              p,
              "economic_offer",
            ),
            p.id,
          ),
        );
    }
  }
  return { stage, upstreamSeals, tasks: ts, blocked };
}
export async function generateTasksV4(
  dir: string,
  stage: StageV4,
  root = process.cwd(),
) {
  await verifyFrozenV4(dir, root);
  const p = await projection(dir, stage);
  await exclusive(paths(dir, stage).tasks, p);
  return { tasks: p.tasks.length, blocked: p.blocked };
}
export async function verifyRunV4(dir: string, root = process.cwd()) {
  const m = await verifyFrozenV4(dir, root),
    agents = new Set<string>();
  for (const s of STAGES_V4) {
    const v = await verifyStageSealV4(dir, s);
    if (
      s > 1 &&
      json(await projection(dir, s)) !==
        (await readFile(paths(dir, s).tasks, "utf8"))
    )
      throw new Error(`projection_changed:${s}`);
    for (const r of v.records.filter((r) => r.agentId)) {
      if (agents.has(r.agentId!) || m.priorAgentIds.includes(r.agentId))
        throw new Error("reused_agent_identity");
      agents.add(r.agentId!);
    }
  }
  for (const [f, h] of Object.entries(m.protectedFiles))
    if (hashV4(await readFile(path.join(root, f))) !== h)
      throw new Error(`protected_file_changed:${f}`);
  const originalTasks = (m.sourceInputs as InputV4[]).map((i) => task(1, i));
  if (json(originalTasks) !== json(await tasksV4(dir, 1)))
    throw new Error("source_projection_changed");
  return {
    agents: agents.size,
    protectedFiles: Object.keys(m.protectedFiles).length,
    captures: Object.keys(m.sourceCaptures).length,
    frozenFiles: Object.keys(m.frozenFiles).length,
    seals: Object.fromEntries(
      await Promise.all(
        STAGES_V4.map(async (s) => [
          s,
          (await readJson(paths(dir, s).seal)).sha256,
        ]),
      ),
    ),
  };
}
export async function scoreSealedRunV4(dir: string, root = process.cwd()) {
  await verifyRunV4(dir, root);
  // Answers are loaded only AFTER all five raw boundaries have been verified.
  const { benchmarkSchemaV4, scoreCaseV4, aggregateScoresV4 } =
    await import("../../src/ingestion/promotion-nlp/benchmark-v4");
  const b = benchmarkSchemaV4.parse(
    await readJson(path.join(root, ANNOTATION_FILE_V4)),
  );
  const parsed = Object.fromEntries(
    await Promise.all(
      STAGES_V4.map(async (s) => [s, await sealedParsed(dir, s)]),
    ),
  ) as Record<StageV4, Awaited<ReturnType<typeof sealedParsed>>>;
  const cases = b.cases.map((c) => {
    const sourceRows = Object.fromEntries(
      STAGES_V4.map((s) => [
        s,
        parsed[s].filter((r) => r.task.caseId === c.id),
      ]),
    ) as typeof parsed;
    const output = (s: 1 | 2 | 3) => sourceRows[s][0]?.result.data;
    const s1 = output(1),
      s2 = output(2),
      s3 = output(3);
    const pipeline = {
      evidence: s1 && "evidence" in s1 ? s1.evidence : null,
      propositions: s2 && "propositions" in s2 ? s2.propositions : null,
      edges: s3 && "edges" in s3 ? s3.edges : null,
      eligibility: Object.fromEntries(
        sourceRows[4].map((r) => [
          r.task.propositionId!,
          r.result.data && "taxonomy" in r.result.data
            ? (r.result.data as EligibilityOutputV4)
            : null,
        ]),
      ),
      normalization: Object.fromEntries(
        sourceRows[5].map((r) => [
          r.task.propositionId!,
          r.result.data as NormalizationV4 | null,
        ]),
      ),
      malformedStages: STAGES_V4.filter((s) =>
        sourceRows[s].some(
          (r) => r.result.syntaxMalformed || r.result.schemaMalformed,
        ),
      ),
    };
    return {
      ...scoreCaseV4(c, pipeline),
      execution: Object.fromEntries(
        STAGES_V4.map((s) => [
          s,
          sourceRows[s].map((r) => ({
            taskId: r.task.taskId,
            agentId: r.record.agentId,
            executionStatus: r.record.executionStatus,
            syntaxMalformed: r.result.syntaxMalformed,
            schemaMalformed: r.result.schemaMalformed,
            issues: r.result.issues,
            rawOutputSha256: r.record.rawOutputSha256,
          })),
        ]),
      ),
    };
  });
  const report = {
    runId: path.basename(dir),
    sourceCases: b.cases.length,
    stageExecution: Object.fromEntries(
      STAGES_V4.map((s) => [
        s,
        {
          tasks: parsed[s].length,
          launched: parsed[s].filter((r) => r.record.agentId).length,
          completed: parsed[s].filter(
            (r) => r.record.executionStatus === "completed",
          ).length,
          syntaxMalformed: parsed[s].filter((r) => r.result.syntaxMalformed)
            .length,
          structuralMalformed: parsed[s].filter((r) => r.result.schemaMalformed)
            .length,
          usable: parsed[s].filter((r) => r.result.valid).length,
          validationIssues: Object.fromEntries(
            [
              ...new Set(
                parsed[s].flatMap((r) =>
                  r.result.issues.map((i) => i.split(":")[0]),
                ),
              ),
            ].map((code) => [
              code,
              parsed[s].filter((r) =>
                r.result.issues.some((i) => i.split(":")[0] === code),
              ).length,
            ]),
          ),
          outputItems:
            s > 3
              ? null
              : parsed[s].reduce((n, r) => {
                  if (r.record.rawOutput === null) return n;
                  const raw = parseJsonV4(r.record.rawOutput).value;
                  if (!raw || typeof raw !== "object") return n;
                  const items = (raw as Record<string, unknown>)[
                    s === 1 ? "evidence" : s === 2 ? "propositions" : "edges"
                  ];
                  return n + (Array.isArray(items) ? items.length : 0);
                }, 0),
        },
      ]),
    ),
    metrics: aggregateScoresV4(cases),
    cases,
  };
  await exclusive(path.join(dir, "scores.json"), report);
  return report;
}
async function main() {
  const [cmd, dir, number, file] = process.argv.slice(2),
    s = Number(number) as StageV4;
  if (cmd === "prepare") return console.log(await prepareRunV4());
  if (!dir) throw new Error("run_directory_required");
  if (cmd === "tasks") return console.log(json(await tasksV4(dir, s)));
  if (cmd === "prompt") {
    const t = (await tasksV4(dir, s)).find((t) => t.taskId === file);
    if (!t) throw new Error("unknown_task");
    return console.log(promptForTaskV4(s, t.input));
  }
  if (cmd === "launch") {
    await registerLaunchV4(dir, s, await readJson(file));
    return;
  }
  if (cmd === "record") {
    await persistRawV4(dir, s, await readJson(file));
    return;
  }
  if (cmd === "seal") return console.log(json(await sealStageV4(dir, s)));
  if (cmd === "generate")
    return console.log(json(await generateTasksV4(dir, s)));
  if (cmd === "verify") return console.log(json(await verifyRunV4(dir)));
  if (cmd === "score") {
    const r = await scoreSealedRunV4(dir);
    return console.log(
      json({ stageExecution: r.stageExecution, metrics: r.metrics }),
    );
  }
  throw new Error("unknown_command");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
