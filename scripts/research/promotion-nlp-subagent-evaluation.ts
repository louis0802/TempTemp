import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  benchmarkEvidence,
  benchmarkSchema,
  highRiskFields,
  metricNames,
  scoreBenchmarkCase,
  summarizeBenchmark,
} from "../../src/ingestion/promotion-nlp/benchmark";
import {
  PROMOTION_NLP_PROMPT,
  PROMPT_VERSION,
} from "../../src/ingestion/promotion-nlp/prompt";
import {
  extractionFields,
  extractionJsonSchema,
  normalizeSourceText,
  rawPromotionExtractionSchema,
  SCHEMA_VERSION,
} from "../../src/ingestion/promotion-nlp/schema";
import {
  hasFact,
  validatePromotionExtraction,
} from "../../src/ingestion/promotion-nlp/validator";

export const BENCHMARK_FILE = "tests/fixtures/promotion-nlp/benchmark.json";
export const SUBAGENT_MODEL = "gpt-6-luna";
export const REASONING_EFFORT = "medium";
export const CONCURRENCY = 4;
export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const readJson = async (file: string) =>
  JSON.parse(await readFile(file, "utf8"));
const exclusiveJson = (file: string, value: unknown) =>
  writeFile(file, json(value), { flag: "wx", mode: 0o600 });

const blindInputSchema = z.strictObject({
  id: z.string().min(1),
  merchantHint: z.string().nullable(),
  titleHint: z.string().nullable(),
  SOURCE_TEXT: z.string().min(1),
});
export type BlindInput = z.infer<typeof blindInputSchema>;

/** Allocate a new object. Never spread a benchmark case or forward metadata. */
export function buildBlindSubagentInput(c: {
  id: string;
  merchant: string;
  sourceText: string;
}): BlindInput {
  return blindInputSchema.parse({
    id: c.id,
    merchantHint: c.merchant,
    titleHint: null,
    SOURCE_TEXT: normalizeSourceText(c.sourceText),
  });
}
export function buildBlindSubagentPrompt(input: BlindInput) {
  const clean = blindInputSchema.parse(input);
  return [
    "Perform one source-only semantic extraction task. Use no tools, files, repository reads, browsing, or other agents. Do not obtain benchmark answers. Do not edit anything. Return exactly one JSON object and nothing else: no markdown fences, commentary, or reasoning.",
    PROMOTION_NLP_PROMPT,
    "Strict JSON output schema:",
    JSON.stringify(extractionJsonSchema()),
    "Case input (case ID and hints are neutral context, never evidence):",
    JSON.stringify(clean),
  ].join("\n\n");
}
export async function loadBlindInputs(root = process.cwd()) {
  const text = await readFile(path.join(root, BENCHMARK_FILE), "utf8");
  // Do not inspect/validate gold here. Explicit projection is the sole export boundary.
  const source = JSON.parse(text) as {
    cases: { id: string; merchant: string; sourceText: string }[];
  };
  const inputs = source.cases.map(buildBlindSubagentInput);
  if (inputs.length !== 49) throw new Error("reviewed_case_count_not_49");
  if (new Set(inputs.map((i) => i.id)).size !== inputs.length)
    throw new Error("duplicate_case_id");
  return { inputs, benchmarkSha256: sha256(text) };
}

export async function protectedSnapshot(root: string) {
  const files: Record<string, string> = {};
  async function visit(relative: string) {
    const full = path.join(root, relative);
    for (const entry of await readdir(full, { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile())
        files[file] = sha256(await readFile(path.join(root, file), "utf8"));
    }
  }
  for (const folder of [
    "src",
    "supabase/migrations",
    "tests/fixtures/promotion-nlp",
  ])
    await visit(folder);
  for (const file of [
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
  ])
    files[file] = sha256(await readFile(path.join(root, file), "utf8"));
  return Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
  );
}
const manifestSchema = z.strictObject({
  runId: z.string(),
  startedAt: z.string(),
  benchmarkSha256: z.string(),
  promptVersion: z.string(),
  promptSha256: z.string(),
  schemaVersion: z.string(),
  schemaSha256: z.string(),
  gitCommit: z.string(),
  workingTreeDirty: z.boolean(),
  gitStatus: z.string(),
  model: z.literal(SUBAGENT_MODEL),
  backendModelIdentity: z.literal("unavailable"),
  reasoningEffort: z.literal(REASONING_EFFORT),
  concurrency: z.literal(CONCURRENCY),
  forkContext: z.literal(false),
  executionMode: z.literal("codex-isolated-subagents"),
  tasks: z.array(
    z.strictObject({
      caseId: z.string(),
      input: blindInputSchema,
      inputSha256: z.string(),
      promptSha256: z.string(),
    }),
  ),
  protectedFiles: z.record(z.string(), z.string()),
});
export async function prepareRun(root = process.cwd()) {
  const { inputs, benchmarkSha256 } = await loadBlindInputs(root);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const dir = path.join(root, ".local/promotion-nlp-subagent", runId);
  await mkdir(path.join(dir, "records"), { recursive: true });
  const gitStatus = execFileSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });
  const manifest = manifestSchema.parse({
    runId,
    startedAt: new Date().toISOString(),
    benchmarkSha256,
    promptVersion: PROMPT_VERSION,
    promptSha256: sha256(PROMOTION_NLP_PROMPT),
    schemaVersion: SCHEMA_VERSION,
    schemaSha256: sha256(JSON.stringify(extractionJsonSchema())),
    gitCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    workingTreeDirty: !!gitStatus,
    gitStatus,
    model: SUBAGENT_MODEL,
    backendModelIdentity: "unavailable",
    reasoningEffort: REASONING_EFFORT,
    concurrency: CONCURRENCY,
    forkContext: false,
    executionMode: "codex-isolated-subagents",
    tasks: inputs.map((input) => ({
      caseId: input.id,
      input,
      inputSha256: sha256(JSON.stringify(input)),
      promptSha256: sha256(buildBlindSubagentPrompt(input)),
    })),
    protectedFiles: await protectedSnapshot(root),
  });
  await exclusiveJson(path.join(dir, "manifest.json"), manifest);
  await exclusiveJson(
    path.join(dir, "blind-tasks.json"),
    manifest.tasks.map((t) => ({
      caseId: t.caseId,
      prompt: buildBlindSubagentPrompt(t.input),
    })),
  );
  return dir;
}
const rawRecordSchema = z.strictObject({
  caseId: z.string(),
  sanitizedInputHash: z.string(),
  rawSubagentOutput: z.string().nullable(),
  rawOutputSha256: z.string().nullable(),
  executionStatus: z.enum(["completed", "execution_error", "missing_result"]),
  agentId: z.string().nullable(),
  model: z.literal(SUBAGENT_MODEL),
  finalizedAt: z.string(),
});
export type RawRecord = z.infer<typeof rawRecordSchema>;
const resultInputSchema = z.strictObject({
  caseId: z.string(),
  rawSubagentOutput: z.string().nullable(),
  executionStatus: z.enum(["completed", "execution_error"]),
  agentId: z.string().min(1),
  model: z.literal(SUBAGENT_MODEL),
});
export async function persistRawResult(
  dir: string,
  result: z.infer<typeof resultInputSchema>,
) {
  const clean = resultInputSchema.parse(result);
  const manifest = manifestSchema.parse(
    await readJson(path.join(dir, "manifest.json")),
  );
  const task = manifest.tasks.find((t) => t.caseId === clean.caseId);
  if (!task) throw new Error("unknown_case_result");
  if (
    (clean.executionStatus === "completed") !==
    (clean.rawSubagentOutput !== null)
  )
    throw new Error("invalid_execution_output");
  // A seal makes all later writes invalid. No upsert or response replacement is offered.
  try {
    await readFile(path.join(dir, "raw-seal.json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const record: RawRecord = {
      ...clean,
      sanitizedInputHash: task.inputSha256,
      rawOutputSha256:
        clean.rawSubagentOutput === null
          ? null
          : sha256(clean.rawSubagentOutput),
      finalizedAt: new Date().toISOString(),
    };
    await exclusiveJson(
      path.join(dir, "records", `${sha256(clean.caseId)}.json`),
      record,
    );
    return;
  }
  throw new Error("run_already_sealed");
}
export function orderRawResults(inputs: BlindInput[], records: RawRecord[]) {
  const byId = new Map<string, RawRecord>();
  const ids = new Set(inputs.map((i) => i.id));
  for (const record of records) {
    rawRecordSchema.parse(record);
    if (!ids.has(record.caseId)) throw new Error("unknown_case_result");
    if (byId.has(record.caseId)) throw new Error("duplicate_case_result");
    if (
      record.sanitizedInputHash !==
      sha256(JSON.stringify(inputs.find((i) => i.id === record.caseId)))
    )
      throw new Error("sanitized_input_hash_mismatch");
    if (
      record.rawOutputSha256 !==
      (record.rawSubagentOutput === null
        ? null
        : sha256(record.rawSubagentOutput))
    )
      throw new Error("raw_output_hash_mismatch");
    byId.set(record.caseId, record);
  }
  return inputs.map(
    (input): RawRecord =>
      byId.get(input.id) ?? {
        caseId: input.id,
        sanitizedInputHash: sha256(JSON.stringify(input)),
        rawSubagentOutput: null,
        rawOutputSha256: null,
        executionStatus: "missing_result",
        agentId: null,
        model: SUBAGENT_MODEL,
        finalizedAt: new Date().toISOString(),
      },
  );
}
export async function sealRun(dir: string) {
  const manifest = manifestSchema.parse(
    await readJson(path.join(dir, "manifest.json")),
  );
  const records = await Promise.all(
    (await readdir(path.join(dir, "records"))).map((f) =>
      readJson(path.join(dir, "records", f)),
    ),
  );
  const ordered = orderRawResults(
    manifest.tasks.map((t) => t.input),
    records,
  );
  const agentIds = ordered.flatMap((r) =>
    r.agentId === null ? [] : [r.agentId],
  );
  if (new Set(agentIds).size !== agentIds.length)
    throw new Error("reused_subagent_context");
  await exclusiveJson(path.join(dir, "raw-results.json"), ordered);
  await exclusiveJson(path.join(dir, "raw-seal.json"), {
    sha256: sha256(json(ordered)),
    sealedAt: new Date().toISOString(),
  });
  return {
    records: ordered.length,
    missing: ordered
      .filter((r) => r.executionStatus === "missing_result")
      .map((r) => r.caseId),
  };
}
export function parseRawResponse(raw: string | null): {
  parsed: unknown;
  malformed: boolean;
} {
  if (raw === null) return { parsed: null, malformed: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    return {
      parsed,
      malformed: !rawPromotionExtractionSchema.safeParse(parsed).success,
    };
  } catch {
    return { parsed: null, malformed: true };
  }
}
export async function scoreSealedRun(dir: string, root = process.cwd()) {
  const manifest = manifestSchema.parse(
    await readJson(path.join(dir, "manifest.json")),
  );
  const sealed = await readJson(path.join(dir, "raw-seal.json"));
  const rawText = await readFile(path.join(dir, "raw-results.json"), "utf8");
  if (sha256(rawText) !== sealed.sha256) throw new Error("raw_seal_mismatch");
  const records = orderRawResults(
    manifest.tasks.map((t) => t.input),
    z.array(rawRecordSchema).parse(JSON.parse(rawText)),
  );
  const currentProtected = await protectedSnapshot(root);
  const changedProtected = [
    ...new Set([
      ...Object.keys(currentProtected),
      ...Object.keys(manifest.protectedFiles),
    ]),
  ].filter((f) => currentProtected[f] !== manifest.protectedFiles[f]);
  if (changedProtected.length) throw new Error("protected_files_changed");
  // Gold enters here, after persisted output integrity has been checked.
  const benchmarkText = await readFile(path.join(root, BENCHMARK_FILE), "utf8");
  if (sha256(benchmarkText) !== manifest.benchmarkSha256)
    throw new Error("benchmark_changed");
  const benchmark = benchmarkSchema.parse(JSON.parse(benchmarkText));
  const results = records.map((record) => {
    const c = benchmark.cases.find((c) => c.id === record.caseId)!;
    const { parsed, malformed } = parseRawResponse(record.rawSubagentOutput);
    const validated = validatePromotionExtraction(benchmarkEvidence(c), parsed);
    const score = scoreBenchmarkCase(c, parsed, validated);
    return {
      caseId: c.id,
      sourceId: c.sourceId,
      merchant: c.merchant,
      layout: c.layout,
      executionStatus: record.executionStatus,
      malformed,
      validated,
      score,
    };
  });
  const summary = summarizeBenchmark(results.map((r) => r.score));
  const factsCount = (r: (typeof results)[number]) =>
    Object.values(r.validated.accepted).filter((f) => hasFact(f?.value)).length;
  const promotionCases = results.filter(
    (r) => r.score.expectedClassification === "promotion",
  );
  const uncertainCases = results
    .filter((r) => r.validated.classification.value === "uncertain")
    .map((r) => r.caseId);
  const criticalSurvivors = results.flatMap((r) =>
    highRiskFields
      .filter((f) => r.score.fields[f].survived)
      .map((field) => ({
        caseId: r.caseId,
        field,
        value: r.score.fields[field].validatedValue,
        quote: r.validated.accepted[field]?.quote,
        goldValue: r.score.fields[field].goldValue,
      })),
  );
  const metadata = {
    ...manifest,
    tasks: manifest.tasks.map(({ caseId, inputSha256, promptSha256 }) => ({
      caseId,
      inputSha256,
      promptSha256,
    })),
    completedAt: new Date().toISOString(),
    rawResultsSha256: sealed.sha256,
    totalSubagentTasks: records.filter((r) => r.agentId !== null).length,
    completedOutputs: records.filter((r) => r.executionStatus === "completed")
      .length,
    malformedOutputs: results.filter((r) => r.malformed).length,
    executionErrors: records.filter(
      (r) => r.executionStatus === "execution_error",
    ).length,
    missingResults: records
      .filter((r) => r.executionStatus === "missing_result")
      .map((r) => r.caseId),
    averageAcceptedFactsPerPromotionCase:
      promotionCases.reduce((n, r) => n + factsCount(r), 0) /
      promotionCases.length,
    zeroExtractedFactCases: results
      .filter((r) => !factsCount(r))
      .map((r) => r.caseId),
    uncertainCases,
    validatorChangedCases: results
      .filter((r) => r.validated.issues.length > 0)
      .map((r) => r.caseId),
    criticalSurvivors,
    protectedFilesUnchanged: true,
    operationBoundary: {
      hostedModelApiCalls: 0,
      freshAcquisition: 0,
      productionDbOperations: 0,
      sourceActivationChanges: 0,
      directSourceV2Changes: 0,
      telegramRecollection: 0,
      ocrMediaAnalysis: 0,
      commits: 0,
      pushes: 0,
    },
    readiness: "A_pending_source_review",
    summary,
  };
  const failures = results.filter(
    (r) =>
      r.executionStatus !== "completed" ||
      r.malformed ||
      !r.score.classificationCorrect ||
      r.validated.issues.length ||
      Object.values(r.score.fields).some(
        (f) => f.rawUnsupported || f.missed_supported_fact,
      ),
  );
  const lines = [
    "# Codex gpt-6-luna blind semantic evaluation",
    "",
    "This evaluates fresh Codex subagent semantic capability, not production OpenAI API model reliability.",
    "",
    `Cases: ${summary.cases}; fresh tasks: ${metadata.totalSubagentTasks}; completed outputs: ${metadata.completedOutputs}; malformed: ${metadata.malformedOutputs}; execution errors: ${metadata.executionErrors}; missing: ${metadata.missingResults.length}.`,
    "",
    `Classification: ${JSON.stringify(summary.classification)}`,
    "",
    `Gold-relative raw unsupported: ${summary.raw_model_hallucinations}; caught: ${summary.hallucinations_caught_by_validator}; surviving: ${summary.unsupported_fact_survived_validation}; critical surviving: ${summary.unsupported_critical_fact_survived_validation}. Exact-match discrepancies require separate source review before being called semantic hallucinations.`,
    "",
    "| Field | Exact supported | Missed | Incorrect | Invented unknown | Quote mismatch | Rejected |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const f of extractionFields)
    lines.push(
      `| ${f} | ${metricNames.map((m) => summary.fields[f][m]).join(" | ")} |`,
    );
  lines.push(
    "",
    `Average accepted facts per gold promotion case: ${metadata.averageAcceptedFactsPerPromotionCase}.`,
    "",
    `Zero-fact cases: ${metadata.zeroExtractedFactCases.join(", ")}.`,
    "",
    `Uncertain cases: ${uncertainCases.join(", ") || "none"}.`,
    "",
    `Validator changed: ${metadata.validatorChangedCases.join(", ") || "none"}.`,
    "",
    `Parser classification comparison: ${JSON.stringify(summary.parser_classification)}.`,
    "",
    `Parser field comparison: ${JSON.stringify(summary.comparison)}.`,
    "",
    "Every critical survivor (unmodified scorer):",
    "",
    "```json",
    JSON.stringify(criticalSurvivors, null, 2),
    "```",
    "",
    `Benchmark SHA: ${manifest.benchmarkSha256}; prompt SHA: ${manifest.promptSha256}; schema SHA: ${manifest.schemaSha256}.`,
    "",
    `Raw seal SHA: ${sealed.sha256}.`,
    "",
    "All agents requested gpt-6-luna, medium reasoning, fork_context=false; concurrency four. Backend revision identity unavailable. Agent tool access was prohibited in prompts, not mechanically disabled by the spawn tool. No model-provider API, acquisition, DB, activation, commit, or push action is implemented by this research runner.",
    "",
    "Readiness: A pending source review; never infer B/C/D authorization.",
    "",
  );
  for (const [file, content] of Object.entries({
    "validated-results.json": json(
      results.map((r) => ({
        caseId: r.caseId,
        sourceId: r.sourceId,
        merchant: r.merchant,
        layout: r.layout,
        executionStatus: r.executionStatus,
        malformed: r.malformed,
        validated: r.validated,
      })),
    ),
    "scores.json": json({ summary, cases: results.map((r) => r.score) }),
    "failures.json": json(failures),
    "run-metadata.json": json(metadata),
    "report.md": lines.join("\n"),
  }))
    await writeFile(path.join(dir, file), content, { flag: "wx", mode: 0o600 });
  return metadata;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, dir, payload] = process.argv.slice(2);
  try {
    if (mode === "prepare" && !dir) console.log(await prepareRun());
    else if (mode === "record" && dir && payload) {
      await persistRawResult(dir, JSON.parse(payload));
      console.log("raw_record_persisted");
    } else if (mode === "seal" && dir && !payload)
      console.log(json(await sealRun(dir)));
    else if (mode === "score" && dir && !payload) {
      const m = await scoreSealedRun(dir);
      console.log(
        json({
          cases: m.summary.cases,
          tasks: m.totalSubagentTasks,
          completed: m.completedOutputs,
          malformed: m.malformedOutputs,
          errors: m.executionErrors,
          classification: m.summary.classification,
          safety: {
            raw: m.summary.raw_model_hallucinations,
            caught: m.summary.hallucinations_caught_by_validator,
            survived: m.summary.unsupported_fact_survived_validation,
            critical: m.summary.unsupported_critical_fact_survived_validation,
          },
        }),
      );
    } else throw new Error("invalid_research_argument");
  } catch (e) {
    console.error(
      e instanceof Error && /^[a-z_0-9]+$/.test(e.message)
        ? e.message
        : "subagent_evaluation_failed",
    );
    process.exitCode = 1;
  }
}
