import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  DATE_ONLY_PROMPT,
  dateOnlyJsonSchema,
  dateOnlyPromptInput,
} from "../../src/ingestion/promotion-nlp/date-only-profile";
import { promotionTextEvidenceSchema } from "../../src/ingestion/promotion-nlp/schema";

export const FRESH_DIR =
  "docs/changes/promotion-nlp-date-only-fresh-evaluation";
export const CONFIG = {
  model: "gpt-6-luna",
  reasoning_effort: "medium",
  fork_context: false,
  maximumOpenAgents: 4,
} as const;
export const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
export const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const readJson = async (f: string) => JSON.parse(await readFile(f, "utf8"));
export const exclusive = (f: string, v: unknown) =>
  writeFile(f, json(v), { flag: "wx", mode: 0o600 });
export const sampleSchema = z.strictObject({
  id: z.string().min(1),
  cohort: z.enum(["regression", "holdout"]),
  merchantGroup: z.string(),
  evidence: promotionTextEvidenceSchema,
  origin: z.record(z.string(), z.string()),
  sourceSha256: z.string(),
});
export type Sample = z.infer<typeof sampleSchema>;
export interface Task {
  id: string;
  input: ReturnType<typeof dateOnlyPromptInput>;
  inputSha256: string;
  message: string;
  messageSha256: string;
  sourceSha256: string;
}
export interface Attempt {
  taskId: string;
  reservedAt: string;
  requested: typeof CONFIG;
}
export interface Launch {
  taskId: string;
  agentId: string;
  boundAt: string;
  requested: typeof CONFIG;
  inputSha256: string;
  messageSha256: string;
  toolConfirmed: {
    agentId: string;
    backendModel: "unavailable";
    reasoningEffort: "unavailable";
    contextIsolation: "request-parameter-only";
  };
}
export interface ResponseRecord {
  taskId: string;
  agentId: string;
  status: "completed" | "transport_error";
  rawOutput: string | null;
  rawOutputSha256: string | null;
  savedAt: string;
  transportError: string | null;
  inputSha256: string;
  sourceSha256: string;
  requested: typeof CONFIG;
  usage: "unavailable";
}
const prompt = `You are an isolated extraction worker. Do not use tools, read files, browse, write files or delegate. Produce exactly one final JSON answer, without markdown fences or commentary.\n\n${DATE_ONLY_PROMPT}`;
export function makeTask(sample: Sample): Task {
  // Explicit projection: sample metadata, annotations and all unknown fields are excluded.
  const input = dateOnlyPromptInput(sample.evidence);
  const message = `${prompt}\n\nJSON_SCHEMA\n${JSON.stringify(dateOnlyJsonSchema())}\n\nINPUT\n${JSON.stringify(input)}`;
  return {
    id: sample.id,
    input,
    inputSha256: sha(JSON.stringify(input)),
    message,
    messageSha256: sha(message),
    sourceSha256: sha(input.SOURCE_TEXT),
  };
}
const item = (dir: string, kind: string, id: string) =>
  path.join(dir, kind, `${sha(id)}.json`);
const rawPath = (dir: string, id: string) =>
  path.join(dir, "raw", `${sha(id)}.txt`);
async function files(dir: string, kind: string) {
  return (await readdir(path.join(dir, kind)))
    .sort()
    .map((f) => `${kind}/${f}`);
}
async function values<T>(dir: string, kind: string): Promise<T[]> {
  return Promise.all(
    (await files(dir, kind)).map((f) => readJson(path.join(dir, f))),
  );
}
async function exists(f: string) {
  try {
    await readFile(f);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}
async function unsealed(dir: string) {
  if (await exists(path.join(dir, "raw-seal.json")))
    throw Error("run_already_sealed");
}
const FROZEN_CODE = [
  "scripts/research/promotion-nlp-date-only-fresh-evaluation.ts",
  "scripts/research/promotion-nlp-date-only-fresh-scoring.ts",
  "tests/promotion-nlp-date-only-fresh.test.ts",
  ...[
    "date-only-profile",
    "date-only-evaluation",
    "schema",
    "schema-v4",
    "validator",
    "validator-v3",
    "schema-v3",
    "schema-v2",
    "schema-v4",
    "types",
    "segmentation-v3",
  ].map((s) => `src/ingestion/promotion-nlp/${s}.ts`),
  "docs/changes/promotion-nlp-date-only-fresh-evaluation/spec.md",
];
export async function prepareFresh(
  dir = path.resolve(FRESH_DIR),
  root = process.cwd(),
) {
  const samples = z
    .array(sampleSchema)
    .parse(await readJson(path.join(dir, "samples.json")));
  const notes = await readJson(path.join(dir, "evaluation-notes.json"));
  if (
    !samples.length ||
    samples.length > 69 ||
    new Set(samples.map((s) => s.id)).size !== samples.length ||
    new Set(samples.map((s) => s.sourceSha256)).size !== samples.length
  )
    throw Error("invalid_sample_inventory");
  if (
    notes.length !== samples.length ||
    new Set(notes.map((n: { id: string }) => n.id)).size !== samples.length ||
    notes.some((n: { id: string }) => !samples.some((s) => s.id === n.id))
  )
    throw Error("invalid_note_inventory");
  for (const s of samples)
    if (s.sourceSha256 !== sha(s.evidence.text))
      throw Error("source_hash_mismatch");
  const tasks = samples.map(makeTask);
  const frozenFiles: Record<string, string> = {};
  for (const f of [...new Set(FROZEN_CODE)])
    frozenFiles[f] = sha(await readFile(path.join(root, f)));
  const inputs = [
    "samples.json",
    "evaluation-notes.json",
    "protected-baseline.json",
  ];
  const frozenInputs: Record<string, string> = {};
  for (const f of inputs)
    frozenInputs[f] = sha(await readFile(path.join(dir, f)));
  const captures: Record<string, string> = {};
  for (const s of samples) {
    const f = s.origin.captureFile ?? s.origin.file;
    const h = sha(await readFile(path.join(root, f)));
    if (s.origin.captureSha256 && s.origin.captureSha256 !== h)
      throw Error("capture_hash_mismatch");
    captures[f] = h;
  }
  const baseline = await readJson(path.join(dir, "protected-baseline.json"));
  const priorAgentIds = new Set<string>();
  for (const f of Object.keys(baseline.files).filter(
    (f) => f.startsWith(".local/promotion-nlp") && f.endsWith(".json"),
  )) {
    const collect = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.agentId === "string") priorAgentIds.add(o.agentId);
        Object.values(o).forEach(collect);
      }
    };
    collect(await readJson(path.join(root, f)));
  }
  await exclusive(path.join(dir, "tasks.json"), tasks);
  for (const kind of ["attempts", "launches", "raw", "responses", "closures"])
    await mkdir(path.join(dir, kind), { recursive: true });
  const manifest = {
    version: 1,
    kind: "fresh-full-source-date-only-subagent-experiment",
    frozenAt: new Date().toISOString(),
    requested: CONFIG,
    transport: "Codex multi_agent_v1; one new agent per source",
    backendModelIdentity: "unavailable",
    usage: "unavailable",
    toolIsolation: "prompt-enforced; no mechanical tool-denial parameter",
    priorAgentIds: [...priorAgentIds].sort(),
    frozenFiles,
    frozenInputs,
    captures,
    tasksSha256: sha(await readFile(path.join(dir, "tasks.json"))),
    promptSha256: sha(prompt),
    schemaSha256: sha(JSON.stringify(dateOnlyJsonSchema())),
    cohorts: {
      regression: samples.filter((s) => s.cohort === "regression").length,
      holdout: samples.filter((s) => s.cohort === "holdout").length,
    },
    noteAuthority: "parent-agent-authored source review, not human gold",
    stability: "unmeasured: one answer per source",
    decisionRule: "spec.md; no post-result threshold changes",
  };
  await exclusive(path.join(dir, "run-manifest.json"), manifest);
  await exclusive(path.join(dir, "freeze-seal.json"), {
    manifestSha256: sha(json(manifest)),
    tasksSha256: manifest.tasksSha256,
  });
  await verifyFrozenFresh(dir, root);
  return manifest;
}
export async function verifyProtectedFresh(dir: string, root = process.cwd()) {
  const b = await readJson(path.join(dir, "protected-baseline.json"));
  for (const [f, h] of Object.entries(b.files))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw Error(`protected_file_changed:${f}`);
  return { unchanged: Object.keys(b.files).length };
}
export async function verifyFrozenFresh(dir: string, root = process.cwd()) {
  const m = await readJson(path.join(dir, "run-manifest.json"));
  const seal = await readJson(path.join(dir, "freeze-seal.json"));
  if (
    sha(json(m)) !== seal.manifestSha256 ||
    json(m.requested) !== json(CONFIG)
  )
    throw Error("manifest_freeze_mismatch");
  for (const [f, h] of Object.entries({ ...m.frozenFiles, ...m.captures }))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw Error(`frozen_file_changed:${f}`);
  for (const [f, h] of Object.entries(m.frozenInputs))
    if (sha(await readFile(path.join(dir, f))) !== h)
      throw Error(`frozen_input_changed:${f}`);
  if (
    sha(await readFile(path.join(dir, "tasks.json"))) !== m.tasksSha256 ||
    m.tasksSha256 !== seal.tasksSha256
  )
    throw Error("tasks_freeze_mismatch");
  const samples = z
    .array(sampleSchema)
    .parse(await readJson(path.join(dir, "samples.json")));
  if (
    json(samples.map(makeTask)) !==
    (await readFile(path.join(dir, "tasks.json"), "utf8"))
  )
    throw Error("input_projection_changed");
  return m;
}
export const tasksFresh = async (dir: string): Promise<Task[]> =>
  readJson(path.join(dir, "tasks.json"));
async function withLock<T>(dir: string, action: () => Promise<T>) {
  const f = path.join(dir, "dispatch.lock");
  await writeFile(f, "exclusive dispatch\n", { flag: "wx", mode: 0o600 });
  try {
    return await action();
  } finally {
    await rm(f);
  }
}
export async function reserveFresh(dir: string, taskId: string) {
  return withLock(dir, async () => {
    await unsealed(dir);
    const ts = await tasksFresh(dir);
    if (!ts.some((t) => t.id === taskId)) throw Error("unknown_task");
    const attempts = await values<Attempt>(dir, "attempts"),
      closed = new Set(
        (await values<{ taskId: string }>(dir, "closures")).map(
          (c) => c.taskId,
        ),
      );
    if (attempts.some((a) => a.taskId === taskId))
      throw Error("duplicate_task_attempt");
    if (attempts.filter((a) => !closed.has(a.taskId)).length >= 4)
      throw Error("concurrency_exceeded");
    await exclusive(item(dir, "attempts", taskId), {
      taskId,
      reservedAt: new Date().toISOString(),
      requested: CONFIG,
    });
    return ts.find((t) => t.id === taskId)!;
  });
}
export async function bindFresh(dir: string, taskId: string, agentId: string) {
  return withLock(dir, async () => {
    await unsealed(dir);
    await readFile(item(dir, "attempts", taskId));
    const m = await readJson(path.join(dir, "run-manifest.json"));
    if (
      !agentId ||
      m.priorAgentIds.includes(agentId) ||
      (await values<Launch>(dir, "launches")).some((l) => l.agentId === agentId)
    )
      throw Error("reused_agent_identity");
    const t = (await tasksFresh(dir)).find((t) => t.id === taskId)!;
    const launch: Launch = {
      taskId,
      agentId,
      boundAt: new Date().toISOString(),
      requested: CONFIG,
      inputSha256: t.inputSha256,
      messageSha256: t.messageSha256,
      toolConfirmed: {
        agentId,
        backendModel: "unavailable",
        reasoningEffort: "unavailable",
        contextIsolation: "request-parameter-only",
      },
    };
    await exclusive(item(dir, "launches", taskId), launch);
    return launch;
  });
}
export async function recordFresh(
  dir: string,
  request: {
    taskId: string;
    agentId: string;
    status: "completed" | "transport_error";
    rawOutput: string | null;
    transportError?: string | null;
  },
) {
  await unsealed(dir);
  const l: Launch = await readJson(item(dir, "launches", request.taskId));
  if (l.agentId !== request.agentId) throw Error("agent_identity_mismatch");
  if ((request.status === "completed") !== (request.rawOutput !== null))
    throw Error("execution_output_mismatch");
  const t = (await tasksFresh(dir)).find((t) => t.id === request.taskId)!;
  // Save exact first final text before parsing ANY model response content.
  await writeFile(rawPath(dir, request.taskId), request.rawOutput ?? "", {
    flag: "wx",
    mode: 0o600,
  });
  const record: ResponseRecord = {
    ...request,
    transportError: request.transportError ?? null,
    rawOutputSha256: request.rawOutput === null ? null : sha(request.rawOutput),
    savedAt: new Date().toISOString(),
    inputSha256: t.inputSha256,
    sourceSha256: t.sourceSha256,
    requested: CONFIG,
    usage: "unavailable",
  };
  await exclusive(item(dir, "responses", request.taskId), record);
  return record;
}
export async function closeFresh(
  dir: string,
  taskId: string,
  agentId: string,
  toolResult: unknown,
) {
  await unsealed(dir);
  const l: Launch = await readJson(item(dir, "launches", taskId));
  if (l.agentId !== agentId) throw Error("agent_identity_mismatch");
  await readFile(item(dir, "responses", taskId));
  const result = z.object({ previous_status: z.unknown() }).parse(toolResult);
  await exclusive(item(dir, "closures", taskId), {
    taskId,
    agentId,
    closedAt: new Date().toISOString(),
    toolResult: result,
    confirmation: "close_agent returned; shutdown requested",
  });
}
export async function recordDispatchFailureFresh(
  dir: string,
  taskId: string,
  error: string,
) {
  await unsealed(dir);
  await readFile(item(dir, "attempts", taskId));
  if (await exists(item(dir, "launches", taskId)))
    throw Error("bound_agent_requires_response_and_close");
  await exclusive(item(dir, "responses", taskId), {
    taskId,
    agentId: null,
    status: "dispatch_error",
    rawOutput: null,
    rawOutputSha256: null,
    transportError: error,
    savedAt: new Date().toISOString(),
  });
  await exclusive(item(dir, "closures", taskId), {
    taskId,
    agentId: null,
    closedAt: new Date().toISOString(),
    toolResult: null,
    confirmation: "spawn failed; no agent to close",
  });
}
export function auditConcurrency(
  attempts: Attempt[],
  closures: { taskId: string; closedAt: string }[],
) {
  const events = attempts
    .flatMap((a) => {
      const c = closures.find((c) => c.taskId === a.taskId);
      if (!c || c.closedAt < a.reservedAt)
        throw Error("missing_or_invalid_closure");
      return [
        { at: a.reservedAt, delta: 1 },
        { at: c.closedAt, delta: -1 },
      ];
    })
    .sort((a, b) => a.at.localeCompare(b.at) || a.delta - b.delta);
  let open = 0,
    maximum = 0;
  for (const e of events) {
    open += e.delta;
    maximum = Math.max(maximum, open);
  }
  if (maximum > 4 || open !== 0) throw Error("concurrency_exceeded");
  return { maximumOpenAgents: maximum, closed: closures.length };
}
async function archiveFiles(dir: string) {
  return [
    "run-manifest.json",
    "freeze-seal.json",
    "tasks.json",
    ...(
      await Promise.all(
        ["attempts", "launches", "raw", "responses", "closures"].map((k) =>
          files(dir, k),
        ),
      )
    ).flat(),
  ].sort();
}
export async function sealFresh(dir: string, root = process.cwd()) {
  await unsealed(dir);
  await verifyFrozenFresh(dir, root);
  await verifyProtectedFresh(dir, root);
  const ts = await tasksFresh(dir),
    attempts = await values<Attempt>(dir, "attempts"),
    launches = await values<Launch>(dir, "launches"),
    responses = await values<ResponseRecord>(dir, "responses"),
    closures = await values<{ taskId: string; closedAt: string }>(
      dir,
      "closures",
    );
  if (attempts.length > ts.length || closures.length !== attempts.length)
    throw Error("incomplete_archive");
  for (const t of ts) {
    if (!responses.some((r) => r.taskId === t.id)) {
      if (attempts.some((a) => a.taskId === t.id))
        throw Error("attempt_without_response");
      const missing = {
        taskId: t.id,
        agentId: null,
        status: "missing_result",
        rawOutput: null,
        rawOutputSha256: null,
        transportError: "not dispatched",
        savedAt: new Date().toISOString(),
      };
      await exclusive(item(dir, "responses", t.id), missing);
      responses.push(missing as unknown as ResponseRecord);
    }
  }
  if (new Set(launches.map((l) => l.agentId)).size !== launches.length)
    throw Error("reused_agent_identity");
  const concurrency = auditConcurrency(attempts, closures);
  for (const rows of [attempts, launches, responses, closures]) {
    if (new Set(rows.map((r) => r.taskId)).size !== rows.length)
      throw Error("duplicate_archive_task");
    if (rows.some((r) => !ts.some((t) => t.id === r.taskId)))
      throw Error("unknown_archive_task");
  }
  for (const t of ts) {
    const r = responses.find((r) => r.taskId === t.id);
    const l = launches.find((l) => l.taskId === t.id);
    if (!r) throw Error("missing_response");
    if (r.agentId) {
      if (
        !l ||
        r.agentId !== l.agentId ||
        r.inputSha256 !== t.inputSha256 ||
        r.sourceSha256 !== t.sourceSha256 ||
        r.rawOutputSha256 !== (r.rawOutput === null ? null : sha(r.rawOutput))
      )
        throw Error("response_binding_mismatch");
      if ((await readFile(rawPath(dir, t.id), "utf8")) !== (r.rawOutput ?? ""))
        throw Error("raw_response_changed");
    }
  }
  const hashes: Record<string, string> = {};
  for (const f of await archiveFiles(dir))
    hashes[f] = sha(await readFile(path.join(dir, f)));
  await exclusive(path.join(dir, "raw-seal.json"), {
    sealedAt: new Date().toISOString(),
    hashes,
    concurrency,
    tasks: ts.length,
    agents: launches.length,
  });
  return verifySealFresh(dir, root);
}
export async function verifySealFresh(dir: string, root = process.cwd()) {
  await verifyFrozenFresh(dir, root);
  const s = await readJson(path.join(dir, "raw-seal.json"));
  if (json(Object.keys(s.hashes).sort()) !== json(await archiveFiles(dir)))
    throw Error("archive_inventory_changed");
  for (const [f, h] of Object.entries(s.hashes))
    if (sha(await readFile(path.join(dir, f))) !== h)
      throw Error(`raw_seal_mismatch:${f}`);
  await verifyProtectedFresh(dir, root);
  return s;
}
async function main() {
  const [mode, dir = path.resolve(FRESH_DIR), id, file] = process.argv.slice(2);
  if (mode === "freeze") return console.log(json(await prepareFresh(dir)));
  if (mode === "verify") return console.log(json(await verifySealFresh(dir)));
  if (mode === "tasks") return console.log(json(await tasksFresh(dir)));
  if (mode === "reserve") return console.log(json(await reserveFresh(dir, id)));
  if (mode === "bind") return console.log(json(await bindFresh(dir, id, file)));
  if (mode === "record")
    return console.log(json(await recordFresh(dir, await readJson(id))));
  if (mode === "close") {
    const r = await readJson(id);
    return closeFresh(dir, r.taskId, r.agentId, r.toolResult);
  }
  if (mode === "dispatch-error")
    return recordDispatchFailureFresh(dir, id, file);
  if (mode === "seal") return console.log(json(await sealFresh(dir)));
  if (mode === "score") {
    const { scoreFresh, renderFresh } =
      await import("./promotion-nlp-date-only-fresh-scoring");
    const r = await scoreFresh(dir);
    await exclusive(path.join(dir, "results.json"), r);
    await exclusive(
      path.join(dir, "failures.json"),
      r.records.filter((x) => x.findings.length),
    );
    await writeFile(path.join(dir, "report.md"), renderFresh(r), {
      flag: "wx",
    });
    return console.log(json(r.cohorts));
  }
  throw Error("unknown_command");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
