import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  buildBlindSubagentInput,
  loadBlindInputs,
  protectedSnapshot,
} from "./promotion-nlp-subagent-evaluation";
import {
  PROMOTION_NLP_PROMPT_V2,
  PROMPT_VERSION_V2,
} from "../../src/ingestion/promotion-nlp/prompt-v2";
import {
  extractionJsonSchemaV2,
  rawPromotionExtractionSchemaV2,
  SCHEMA_VERSION_V2,
} from "../../src/ingestion/promotion-nlp/schema-v2";
import {
  benchmarkSchemaV2,
  classificationSummaryV2,
  scoreCaseV2,
  SEMANTIC_METRICS_V2,
} from "../../src/ingestion/promotion-nlp/benchmark-v2";
import {
  validatePromotionExtractionV2,
  VALIDATOR_VERSION_V2,
} from "../../src/ingestion/promotion-nlp/validator-v2";
import { promotionTextEvidenceSchema } from "../../src/ingestion/promotion-nlp/schema";

export const MODEL_V2 = "gpt-6-luna";
export const REASONING_V2 = "medium";
export const CONCURRENCY_V2 = 4;
export const V1_SEAL =
  "786ba7d8566ed9d0bd2b11d390c95a58bc9056e033ba4e1c8f0c7170f340181a";
export const ANNOTATION_FILE_V2 =
  "tests/fixtures/promotion-nlp/benchmark-v2.json";
export const CONTRACT_FILE_V2 =
  "docs/changes/promotion-nlp-semantic-contract-v2/semantic-contract.md";
export const FROZEN_FILES_V2 = [
  "src/ingestion/promotion-nlp/schema-v2.ts",
  "src/ingestion/promotion-nlp/prompt-v2.ts",
  "src/ingestion/promotion-nlp/validator-v2.ts",
  "src/ingestion/promotion-nlp/benchmark-v2.ts",
  "scripts/research/promotion-nlp-subagent-v2-evaluation.ts",
  ANNOTATION_FILE_V2,
  CONTRACT_FILE_V2,
] as const;
export const hashV2 = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const readJson = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const exclusive = (p: string, v: unknown) =>
  writeFile(p, json(v), { flag: "wx", mode: 0o600 });
const blindSchema = z.strictObject({
  id: z.string(),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  SOURCE_TEXT: z.string(),
});
export function blindPromptV2(value: z.infer<typeof blindSchema>) {
  const input = blindSchema.parse(value);
  return [
    "Perform one blind source-only extraction. Use no tools, files, repository reads, browsing or other agents. Do not obtain benchmark answers. Do not edit anything. Return exactly one JSON object; no fences, commentary or reasoning.",
    PROMOTION_NLP_PROMPT_V2,
    "Strict output schema:",
    JSON.stringify(extractionJsonSchemaV2()),
    "Case ID and CONTEXT_HINTS are neutral context only; SOURCE_TEXT is the only evidence:",
    JSON.stringify(input),
  ].join("\n\n");
}
export { buildBlindSubagentInput };
const manifestSchema = z.strictObject({
  runId: z.string(),
  startedAt: z.string(),
  model: z.literal(MODEL_V2),
  reasoningEffort: z.literal(REASONING_V2),
  concurrency: z.literal(CONCURRENCY_V2),
  forkContext: z.literal(false),
  toolIsolation: z.literal("prompt-enforced; no mechanical denial parameter"),
  backendModelIdentity: z.literal("unavailable"),
  v1Seal: z.literal(V1_SEAL),
  v1BenchmarkSha256: z.string(),
  schemaVersion: z.literal(SCHEMA_VERSION_V2),
  schemaSha256: z.string(),
  promptVersion: z.literal(PROMPT_VERSION_V2),
  promptSha256: z.string(),
  validatorVersion: z.literal(VALIDATOR_VERSION_V2),
  validatorSha256: z.string(),
  annotationSha256: z.string(),
  roleDefinitionsSha256: z.string(),
  frozenFiles: z.record(z.string(), z.string()),
  protectedFiles: z.record(z.string(), z.string()),
  sourceCaptures: z.record(z.string(), z.string()),
  tasks: z
    .array(
      z.strictObject({
        caseId: z.string(),
        input: blindSchema,
        inputSha256: z.string(),
        promptSha256: z.string(),
      }),
    )
    .length(49),
});
const launchSchema = z.strictObject({
  caseId: z.string(),
  agentId: z.string().min(1),
  model: z.literal(MODEL_V2),
  reasoningEffort: z.literal(REASONING_V2),
  forkContext: z.literal(false),
  promptSha256: z.string(),
});
const recordSchema = z.strictObject({
  caseId: z.string(),
  agentId: z.string().nullable(),
  model: z.literal(MODEL_V2),
  reasoningEffort: z.literal(REASONING_V2),
  forkContext: z.literal(false),
  sanitizedInputHash: z.string(),
  rawSubagentOutput: z.string().nullable(),
  rawOutputSha256: z.string().nullable(),
  executionStatus: z.enum(["completed", "execution_error", "missing_result"]),
  finalizedAt: z.string(),
});
export type RawRecordV2 = z.infer<typeof recordSchema>;
const manifest = async (dir: string) =>
  manifestSchema.parse(await readJson(path.join(dir, "manifest.json")));
async function requireUnsealed(dir: string) {
  try {
    await readFile(path.join(dir, "raw-seal.json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  throw new Error("run_already_sealed");
}
async function fileHashes(root: string, files: readonly string[]) {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [f, hashV2(await readFile(path.join(root, f)))]),
    ),
  );
}
export async function verifyFrozenV2(dir: string, root = process.cwd()) {
  const m = await manifest(dir);
  for (const [f, h] of Object.entries(m.frozenFiles))
    if (hashV2(await readFile(path.join(root, f))) !== h)
      throw new Error(`frozen_file_changed:${f}`);
  const current = await protectedSnapshot(root);
  if (json(current) !== json(m.protectedFiles))
    throw new Error("protected_files_changed");
  for (const [f, h] of Object.entries(m.sourceCaptures))
    if (hashV2(await readFile(path.join(root, f))) !== h)
      throw new Error(`source_capture_changed:${f}`);
  return m;
}
export async function prepareRunV2(root = process.cwd()) {
  const { inputs, benchmarkSha256 } = await loadBlindInputs(root);
  // Preparation author reviews annotations; blind task projection never spreads their contents.
  const annotationsText = await readFile(
    path.join(root, ANNOTATION_FILE_V2),
    "utf8",
  );
  const annotations = benchmarkSchemaV2.parse(JSON.parse(annotationsText));
  if (annotations.v1BenchmarkSha256 !== benchmarkSha256)
    throw new Error("v1_benchmark_changed");
  const v1 = JSON.parse(
    await readFile(
      path.join(root, "tests/fixtures/promotion-nlp/benchmark.json"),
      "utf8",
    ),
  );
  for (const c of annotations.cases) {
    const prior = v1.cases.find((p: { id: string }) => p.id === c.id);
    for (const k of [
      "sourceText",
      "sourceReference",
      "selector",
      "evidenceId",
      "canonicalUrl",
      "nativeId",
      "sourceId",
      "layout",
    ])
      if (!prior || json(prior[k]) !== json(c[k as keyof typeof c]))
        throw new Error(`source_envelope_changed:${c.id}:${k}`);
    const input = inputs.find((p) => p.id === c.id)!;
    if (
      c.merchantHint !== input.merchantHint ||
      c.titleHint !== input.titleHint ||
      c.sourceText !== input.SOURCE_TEXT
    )
      throw new Error("source_hints_or_text_changed");
  }
  const sourceCaptures = Object.fromEntries(
    annotations.cases.map((c) => [
      c.sourceReference.file,
      c.sourceReference.sha256,
    ]),
  );
  for (const [f, h] of Object.entries(sourceCaptures))
    if (hashV2(await readFile(path.join(root, f))) !== h)
      throw new Error(`source_capture_hash_mismatch:${f}`);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const dir = path.join(root, ".local/promotion-nlp-subagent-v2", runId);
  await mkdir(path.join(dir, "records"), { recursive: true });
  await mkdir(path.join(dir, "launches"));
  const frozenFiles = await fileHashes(root, FROZEN_FILES_V2);
  const m = manifestSchema.parse({
    runId,
    startedAt: new Date().toISOString(),
    model: MODEL_V2,
    reasoningEffort: REASONING_V2,
    concurrency: CONCURRENCY_V2,
    forkContext: false,
    toolIsolation: "prompt-enforced; no mechanical denial parameter",
    backendModelIdentity: "unavailable",
    v1Seal: V1_SEAL,
    v1BenchmarkSha256: benchmarkSha256,
    schemaVersion: SCHEMA_VERSION_V2,
    schemaSha256: hashV2(JSON.stringify(extractionJsonSchemaV2())),
    promptVersion: PROMPT_VERSION_V2,
    promptSha256: hashV2(PROMOTION_NLP_PROMPT_V2),
    validatorVersion: VALIDATOR_VERSION_V2,
    validatorSha256: frozenFiles[FROZEN_FILES_V2[2]],
    annotationSha256: hashV2(annotationsText),
    roleDefinitionsSha256: frozenFiles[CONTRACT_FILE_V2],
    frozenFiles,
    protectedFiles: await protectedSnapshot(root),
    sourceCaptures,
    tasks: inputs.map((input) => ({
      caseId: input.id,
      input,
      inputSha256: hashV2(JSON.stringify(input)),
      promptSha256: hashV2(blindPromptV2(input)),
    })),
  });
  await exclusive(path.join(dir, "manifest.json"), m);
  await exclusive(
    path.join(dir, "blind-tasks.json"),
    m.tasks.map((t) => ({ caseId: t.caseId, prompt: blindPromptV2(t.input) })),
  );
  return dir;
}
export async function registerLaunchV2(
  dir: string,
  launch: z.infer<typeof launchSchema>,
) {
  await requireUnsealed(dir);
  const clean = launchSchema.parse(launch);
  const m = await manifest(dir);
  const task = m.tasks.find((t) => t.caseId === clean.caseId);
  if (!task || task.promptSha256 !== clean.promptSha256)
    throw new Error("invalid_launch_task");
  const launches = await Promise.all(
    (await readdir(path.join(dir, "launches"))).map((f) =>
      readJson(path.join(dir, "launches", f)),
    ),
  );
  if (launches.some((l) => l.agentId === clean.agentId))
    throw new Error("reused_subagent_context");
  const records = new Set(await readdir(path.join(dir, "records")));
  if (
    launches.filter((l) => !records.has(`${hashV2(l.caseId)}.json`)).length >=
    CONCURRENCY_V2
  )
    throw new Error("concurrency_exceeded");
  await exclusive(
    path.join(dir, "launches", `${hashV2(clean.caseId)}.json`),
    clean,
  );
}
export async function persistRawV2(
  dir: string,
  result: {
    caseId: string;
    agentId: string;
    rawSubagentOutput: string | null;
    executionStatus: "completed" | "execution_error";
  },
) {
  await requireUnsealed(dir);
  const m = await manifest(dir);
  const launch = launchSchema.parse(
    await readJson(path.join(dir, "launches", `${hashV2(result.caseId)}.json`)),
  );
  if (launch.agentId !== result.agentId)
    throw new Error("agent_identity_mismatch");
  const task = m.tasks.find((t) => t.caseId === result.caseId);
  if (!task) throw new Error("unknown_case_result");
  if (
    (result.executionStatus === "completed") !==
    (result.rawSubagentOutput !== null)
  )
    throw new Error("invalid_execution_output");
  await exclusive(
    path.join(dir, "records", `${hashV2(result.caseId)}.json`),
    recordSchema.parse({
      ...result,
      model: launch.model,
      reasoningEffort: launch.reasoningEffort,
      forkContext: launch.forkContext,
      sanitizedInputHash: task.inputSha256,
      rawOutputSha256:
        result.rawSubagentOutput === null
          ? null
          : hashV2(result.rawSubagentOutput),
      finalizedAt: new Date().toISOString(),
    }),
  );
}
export function orderRawV2(
  tasks: z.infer<typeof manifestSchema>["tasks"],
  values: unknown[],
) {
  const byId = new Map<string, RawRecordV2>(),
    agents = new Set<string>();
  for (const value of values) {
    const r = recordSchema.parse(value),
      task = tasks.find((t) => t.caseId === r.caseId);
    if (!task) throw new Error("unknown_case_result");
    if (byId.has(r.caseId)) throw new Error("duplicate_case_result");
    if (r.agentId && agents.has(r.agentId))
      throw new Error("reused_subagent_context");
    if (r.agentId) agents.add(r.agentId);
    if (r.sanitizedInputHash !== task.inputSha256)
      throw new Error("input_hash_mismatch");
    if (
      r.rawOutputSha256 !==
      (r.rawSubagentOutput === null ? null : hashV2(r.rawSubagentOutput))
    )
      throw new Error("raw_output_hash_mismatch");
    if ((r.executionStatus === "completed") !== (r.rawSubagentOutput !== null))
      throw new Error("invalid_execution_output");
    byId.set(r.caseId, r);
  }
  return tasks.map(
    (t) =>
      byId.get(t.caseId) ??
      recordSchema.parse({
        caseId: t.caseId,
        agentId: null,
        model: MODEL_V2,
        reasoningEffort: REASONING_V2,
        forkContext: false,
        sanitizedInputHash: t.inputSha256,
        rawSubagentOutput: null,
        rawOutputSha256: null,
        executionStatus: "missing_result",
        finalizedAt: new Date().toISOString(),
      }),
  );
}
export async function sealRunV2(dir: string, root = process.cwd()) {
  await requireUnsealed(dir);
  const m = await verifyFrozenV2(dir, root);
  const rows = orderRawV2(
    m.tasks,
    await Promise.all(
      (await readdir(path.join(dir, "records"))).map((f) =>
        readJson(path.join(dir, "records", f)),
      ),
    ),
  );
  const launches = await Promise.all(
    (await readdir(path.join(dir, "launches"))).map((f) =>
      readJson(path.join(dir, "launches", f)),
    ),
  );
  for (const r of rows.filter((r) => r.agentId))
    if (!launches.some((l) => l.caseId === r.caseId && l.agentId === r.agentId))
      throw new Error("unregistered_result");
  await exclusive(path.join(dir, "raw-results.json"), rows);
  await exclusive(path.join(dir, "raw-seal.json"), {
    sha256: hashV2(json(rows)),
    manifestSha256: hashV2(await readFile(path.join(dir, "manifest.json"))),
    launchesSha256: hashV2(
      json(launches.sort((a, b) => a.caseId.localeCompare(b.caseId))),
    ),
    sealedAt: new Date().toISOString(),
  });
  return {
    records: rows.length,
    agents: rows.filter((r) => r.agentId).length,
    missing: rows
      .filter((r) => r.executionStatus === "missing_result")
      .map((r) => r.caseId),
  };
}
export function parseResponseV2(raw: string | null) {
  if (raw === null)
    return { parsed: null, syntaxMalformed: false, schemaMalformed: false };
  try {
    const value: unknown = JSON.parse(raw),
      parsed = rawPromotionExtractionSchemaV2.safeParse(value);
    return {
      parsed: parsed.success ? parsed.data : null,
      syntaxMalformed: false,
      schemaMalformed: !parsed.success,
    };
  } catch {
    return { parsed: null, syntaxMalformed: true, schemaMalformed: false };
  }
}
export async function verifySealV2(dir: string, root = process.cwd()) {
  const s = await readJson(path.join(dir, "raw-seal.json"));
  if (
    hashV2(await readFile(path.join(dir, "manifest.json"))) !== s.manifestSha256
  )
    throw new Error("manifest_seal_mismatch");
  const m = await verifyFrozenV2(dir, root);
  const raw = await readFile(path.join(dir, "raw-results.json"), "utf8");
  if (hashV2(raw) !== s.sha256) throw new Error("raw_seal_mismatch");
  const launches = await Promise.all(
    (await readdir(path.join(dir, "launches"))).map(async (f) =>
      launchSchema.parse(await readJson(path.join(dir, "launches", f))),
    ),
  );
  if (
    hashV2(json(launches.sort((a, b) => a.caseId.localeCompare(b.caseId)))) !==
    s.launchesSha256
  )
    throw new Error("launch_seal_mismatch");
  const records = orderRawV2(m.tasks, JSON.parse(raw));
  for (const r of records.filter((r) => r.agentId)) {
    const launch = launches.find((l) => l.caseId === r.caseId),
      task = m.tasks.find((t) => t.caseId === r.caseId)!;
    if (
      !launch ||
      launch.agentId !== r.agentId ||
      launch.promptSha256 !== task.promptSha256
    )
      throw new Error("launch_result_mismatch");
    const individual = await readJson(
      path.join(dir, "records", `${hashV2(r.caseId)}.json`),
    );
    if (json(individual) !== json(r))
      throw new Error("individual_record_mismatch");
  }
  return { manifest: m, seal: s, records };
}
export async function scoreSealedRunV2(dir: string, root = process.cwd()) {
  const { manifest: m, seal, records } = await verifySealV2(dir, root);
  // Evaluation gold is loaded only after persisted seal and protected hashes pass.
  const b = benchmarkSchemaV2.parse(
    await readJson(path.join(root, ANNOTATION_FILE_V2)),
  );
  const results = records.map((r) => {
    const c = b.cases.find((c) => c.id === r.caseId)!,
      parsed = parseResponseV2(r.rawSubagentOutput);
    const evidence = promotionTextEvidenceSchema.parse({
      sourceId: c.sourceId,
      canonicalUrl: c.canonicalUrl,
      nativeId: c.nativeId,
      evidenceId: c.evidenceId,
      selector: c.selector,
      merchantHint: c.merchantHint,
      titleHint: c.titleHint,
      text: c.sourceText,
    });
    const validated = validatePromotionExtractionV2(evidence, parsed.parsed);
    return {
      caseId: c.id,
      executionStatus: r.executionStatus,
      ...parsed,
      validated,
      score: scoreCaseV2(c, parsed.parsed, validated),
    };
  });
  const usable = results.filter((r) => r.parsed !== null);
  const classification = (rows: typeof results) =>
    classificationSummaryV2(
      rows.map((r) => ({
        expectedClassification: r.score.expectedClassification,
        predicted: r.parsed ? r.score.acceptedClassification : null,
      })),
    );
  const semantic = (stage: "raw" | "surviving") =>
    Object.fromEntries(
      SEMANTIC_METRICS_V2.map((metric) => [
        metric,
        {
          events: results.reduce(
            (n, r) =>
              n +
              r.score[stage].findings.filter((f) => f.metric === metric).length,
            0,
          ),
          cases: results
            .filter((r) =>
              r.score[stage].findings.some((f) => f.metric === metric),
            )
            .map((r) => r.caseId),
        },
      ]),
    );
  const report = {
    runId: m.runId,
    rawSealSha256: seal.sha256,
    cases: 49,
    freshAgents: new Set(records.flatMap((r) => (r.agentId ? [r.agentId] : [])))
      .size,
    completedOutputs: records.filter((r) => r.executionStatus === "completed")
      .length,
    syntaxMalformed: results.filter((r) => r.syntaxMalformed).length,
    schemaMalformed: results.filter((r) => r.schemaMalformed).length,
    malformedOutputRate:
      results.filter((r) => r.syntaxMalformed || r.schemaMalformed).length / 49,
    executionErrors: records.filter(
      (r) => r.executionStatus === "execution_error",
    ).length,
    missingResults: records
      .filter((r) => r.executionStatus === "missing_result")
      .map((r) => r.caseId),
    allCaseClassification: classification(results),
    parseableOutputClassification: classification(usable),
    rawSemanticReviewFlags: semantic("raw"),
    survivingSemanticReviewFlags: semantic("surviving"),
    semanticCoverage: {
      allCaseDenominator: 49,
      parseableOutputs: usable.length,
      unassessable: 49 - usable.length,
    },
    quoteMismatches: results.reduce((n, r) => n + r.score.quoteMismatches, 0),
    validatorRejections: results.reduce(
      (n, r) => n + r.score.validatorRejections,
      0,
    ),
    sourceReviewRequired: true,
    protectedFilesUnchanged: true,
    toolIsolation: m.toolIsolation,
  };
  await exclusive(path.join(dir, "validated-results.json"), results);
  await exclusive(path.join(dir, "scores.json"), report);
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, dir, payload] = process.argv.slice(2);
  if (mode === "prepare") console.log(await prepareRunV2());
  else if (mode === "launch" && dir && payload)
    await registerLaunchV2(dir, JSON.parse(await readFile(payload, "utf8")));
  else if (mode === "record" && dir && payload)
    await persistRawV2(dir, JSON.parse(await readFile(payload, "utf8")));
  else if (mode === "seal" && dir) console.log(json(await sealRunV2(dir)));
  else if (mode === "score" && dir)
    console.log(json(await scoreSealedRunV2(dir)));
  else if (mode === "verify" && dir)
    console.log((await verifySealV2(dir)).seal.sha256);
  else throw new Error("invalid_research_argument");
}
