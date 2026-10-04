import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import {
  ARMS,
  CONFIG,
  THRESHOLDS,
  sha,
  serialize,
  benchmarkSchemaV4,
  projectOracle,
  buildTasks,
  oracleControl,
  spanCoverage,
  reviewedV4Ceilings,
  parseTask,
  identity,
  edgeScore,
  normalizationScore,
  ratio,
  type Arm,
  type Task,
} from "../../src/ingestion/promotion-nlp/oracle-ablation";
import { deterministicSpans } from "../../src/ingestion/promotion-nlp/deterministic-spans";
import {
  TAXONOMY_V4,
  type StageV4,
  type EvidenceV4,
  type EligibilityOutputV4,
  type NormalizationV4,
} from "../../src/ingestion/promotion-nlp/schema-v4";
import { type PipelineCaseV4 } from "../../src/ingestion/promotion-nlp/benchmark-v4";
import {
  verifyStageSealV4,
  tasksV4,
  parseRecordV4,
} from "./promotion-nlp-subagent-v4-evaluation";
export const DOC = "docs/changes/promotion-nlp-oracle-ablation";
export const BENCHMARK = "tests/fixtures/promotion-nlp/benchmark-v4.json";
export const FROZEN = [
  "src/ingestion/promotion-nlp/oracle-ablation.ts",
  "src/ingestion/promotion-nlp/deterministic-spans.ts",
  "scripts/research/promotion-nlp-oracle-ablation.ts",
  "src/ingestion/promotion-nlp/schema-v4.ts",
  "src/ingestion/promotion-nlp/prompt-v4.ts",
  "src/ingestion/promotion-nlp/validator-v4.ts",
  BENCHMARK,
  "tests/promotion-nlp-oracle-ablation.test.ts",
  "tests/promotion-nlp-deterministic-spans.test.ts",
  ...[
    "spec",
    "design",
    "methodology",
    "oracle-contract",
    "deterministic-span-contract",
    "scorer-contract",
  ].map((n) => `${DOC}/${n}.md`),
];
const readJSON = async (f: string) => JSON.parse(await readFile(f, "utf8"));
const exclusive = async (f: string, v: unknown) =>
  writeFile(f, serialize(v), { flag: "wx", mode: 0o600 });
const ap = (dir: string, arm: Arm, name: string) =>
  path.join(dir, `arm-${arm}`, name);
export type RecordResult = {
  taskId: string;
  agentId: string | null;
  rawOutput: string | null;
  executionStatus: "completed" | "execution_error" | "missing_result";
  rawOutputSha256: string | null;
  inputSha256: string;
  finalizedAt: string;
};
export type Launch = {
  taskId: string;
  agentId: string;
  model: typeof CONFIG.model;
  reasoningEffort: typeof CONFIG.reasoningEffort;
  forkContext: false;
  promptSha256: string;
  retries: 0;
  fallback: null;
};
async function filesJSON(dir: string) {
  return Promise.all(
    (await readdir(dir)).sort().map((f) => readJSON(path.join(dir, f))),
  );
}
async function noSeal(dir: string, arm: Arm) {
  try {
    await readFile(ap(dir, arm, "raw-seal.json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  throw new Error("arm_already_sealed");
}
export async function loadBenchmark(root = process.cwd()) {
  return benchmarkSchemaV4.parse(await readJSON(path.join(root, BENCHMARK)));
}
export async function loadV4(root = process.cwd()) {
  const entries = (
    await readdir(path.join(root, ".local/promotion-nlp-subagent-v4"), {
      withFileTypes: true,
    })
  ).filter((e) => e.isDirectory());
  if (entries.length !== 1) throw new Error("v4_run_ambiguous");
  const dir = path.join(
      root,
      ".local/promotion-nlp-subagent-v4",
      entries[0].name,
    ),
    m = await readJSON(path.join(dir, "manifest.json"));
  for (const [f, h] of Object.entries(m.frozenFiles))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw new Error(`v4_frozen_changed:${f}`);
  const parsed: Record<
    number,
    {
      task: Awaited<ReturnType<typeof tasksV4>>[number];
      result: ReturnType<typeof parseRecordV4>;
    }[]
  > = {};
  const inputs: Record<string, string> = {};
  const agentIds: string[] = [];
  for (const stage of [1, 2, 3, 4, 5] as StageV4[]) {
    const sealed = await verifyStageSealV4(dir, stage),
      ts = await tasksV4(dir, stage);
    agentIds.push(
      ...sealed.records
        .map((r) => r.agentId)
        .filter((id): id is string => !!id),
    );
    parsed[stage] = ts.map((task) => ({
      task,
      result: parseRecordV4(
        stage,
        task,
        sealed.records.find((r) => r.taskId === task.taskId)!,
      ),
    }));
    for (const n of [
      `stage${stage}-raw-results.json`,
      `stage${stage}-raw-seal.json`,
      `stage${stage}-tasks.json`,
    ])
      inputs[path.relative(root, path.join(dir, n))] = sha(
        await readFile(path.join(dir, n)),
      );
  }
  const b = await loadBenchmark(root);
  const pipelines: PipelineCaseV4[] = b.cases.map((c) => {
    const rows = (s: number) => parsed[s].filter((r) => r.task.caseId === c.id),
      out = (s: number) => rows(s)[0]?.result.data;
    const s1 = out(1),
      s2 = out(2),
      s3 = out(3);
    return {
      evidence: s1 && "evidence" in s1 ? s1.evidence : null,
      propositions: s2 && "propositions" in s2 ? s2.propositions : null,
      edges: s3 && "edges" in s3 ? s3.edges : null,
      eligibility: Object.fromEntries(
        rows(4).map((r) => [
          r.task.propositionId,
          r.result.data as EligibilityOutputV4 | null,
        ]),
      ),
      normalization: Object.fromEntries(
        rows(5).map((r) => [
          r.task.propositionId,
          r.result.data as NormalizationV4 | null,
        ]),
      ),
    };
  });
  inputs[
    "docs/changes/promotion-nlp-atomic-evidence-graph-v4/source-review.json"
  ] = sha(
    await readFile(
      path.join(
        root,
        "docs/changes/promotion-nlp-atomic-evidence-graph-v4/source-review.json",
      ),
    ),
  );
  return {
    dir,
    inputs,
    pipelines,
    priorAgentIds: m.priorAgentIds.concat(agentIds),
  };
}
export async function prepare(
  root = process.cwd(),
  base = path.join(root, ".local/promotion-nlp-oracle-ablation"),
  baselineFile = "/tmp/promotion-oracle-baseline.json",
) {
  const b = await loadBenchmark(root),
    o0 = oracleControl(b.cases);
  if (!o0.perfect) throw new Error(`oracle_control_failed:${serialize(o0)}`);
  const spans = spanCoverage(b.cases),
    v4 = await loadV4(root),
    projection = b.cases.map(projectOracle),
    ceilings = reviewedV4Ceilings(
      b.cases,
      v4.pipelines,
      await readJSON(
        path.join(
          root,
          "docs/changes/promotion-nlp-atomic-evidence-graph-v4/source-review.json",
        ),
      ),
    );
  if (ceilings.economic.length !== 43 || ceilings.constraints.length !== 228)
    throw new Error("ceiling_denominator_mismatch");
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
    dir = path.join(base, runId);
  await mkdir(dir, { recursive: true });
  const frozen = Object.fromEntries(
    await Promise.all(
      FROZEN.map(async (f) => [f, sha(await readFile(path.join(root, f)))]),
    ),
  );
  const artifacts: Record<string, unknown> = {
    "oracle-projection.json": projection,
    "oracle-control.json": o0,
    "deterministic-spans.json": b.cases.map((c) => ({
      caseId: c.id,
      evidence: deterministicSpans(c.sourceText),
    })),
    "deterministic-coverage.json": spans,
    "v4-counterfactual-ceilings.json": ceilings,
  };
  const artifactHashes = Object.fromEntries(
    Object.entries(artifacts).map(([f, v]) => [f, sha(serialize(v))]),
  );
  for (const [f, v] of Object.entries(artifacts))
    await exclusive(path.join(dir, f), v);
  await exclusive(path.join(dir, "oracle-projection-sha.json"), {
    sha256: artifactHashes["oracle-projection.json"],
  });
  const protectedFiles = await readJSON(baselineFile);
  for (const [f, h] of Object.entries(protectedFiles))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw new Error(`baseline_changed:${f}`);
  const m = {
    runId,
    config: CONFIG,
    thresholds: THRESHOLDS,
    frozen,
    artifacts: artifactHashes,
    protectedFiles,
    v4Inputs: v4.inputs,
    priorAgentIds: [...new Set(v4.priorAgentIds)],
    benchmarkSha256: frozen[BENCHMARK],
    oracleProjectionSha256: artifactHashes["oracle-projection.json"],
    scorerSha256: frozen[FROZEN[0]],
    taskBuilderSha256: frozen[FROZEN[0]],
    toolIsolation:
      "prompt-enforced; API has no mechanical tool-denial configuration",
    backendModelIdentity: "unavailable",
    createdAt: new Date().toISOString(),
  };
  await exclusive(path.join(dir, "manifest.json"), m);
  for (const arm of ARMS) {
    await mkdir(ap(dir, arm, "launches"), { recursive: true });
    await mkdir(ap(dir, arm, "records"));
    await exclusive(ap(dir, arm, "tasks.json"), buildTasks(b.cases, arm));
  }
  return { dir, oracleControl: o0.metrics, spans, ceilings: ceilings.ceilings };
}
export async function taskList(dir: string, arm: Arm) {
  return (await readJSON(ap(dir, arm, "tasks.json"))) as Task[];
}
export async function verifyFrozen(dir: string, root = process.cwd()) {
  const m = await readJSON(path.join(dir, "manifest.json"));
  if (
    serialize(m.config) !== serialize(CONFIG) ||
    serialize(m.thresholds) !== serialize(THRESHOLDS)
  )
    throw new Error("config_changed");
  for (const [f, h] of Object.entries(m.frozen))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw new Error(`frozen_changed:${f}`);
  for (const [f, h] of Object.entries(m.artifacts))
    if (sha(await readFile(path.join(dir, f))) !== h)
      throw new Error(`artifact_changed:${f}`);
  for (const [f, h] of Object.entries(m.v4Inputs))
    if (sha(await readFile(path.join(root, f))) !== h)
      throw new Error(`v4_input_changed:${f}`);
  const b = await loadBenchmark(root);
  if (sha(serialize(b.cases.map(projectOracle))) !== m.oracleProjectionSha256)
    throw new Error("projection_changed");
  if (!oracleControl(b.cases).perfect) throw new Error("oracle_control_failed");
  for (const arm of ARMS)
    if (
      serialize(buildTasks(b.cases, arm)) !==
      (await readFile(ap(dir, arm, "tasks.json"), "utf8"))
    )
      throw new Error(`tasks_changed:${arm}`);
  return m;
}
export async function register(dir: string, arm: Arm, l: Launch) {
  const lock = path.join(dir, "registration.lock");
  await writeFile(lock, "exclusive registration", { flag: "wx" });
  try {
    await noSeal(dir, arm);
    if (
      l.model !== CONFIG.model ||
      l.reasoningEffort !== CONFIG.reasoningEffort ||
      l.forkContext !== false ||
      l.retries !== 0 ||
      l.fallback !== null
    )
      throw new Error("invalid_launch_config");
    const m = await readJSON(path.join(dir, "manifest.json")),
      ts = await taskList(dir, arm),
      t = ts.find((t) => t.taskId === l.taskId);
    if (!t || t.promptSha256 !== l.promptSha256)
      throw new Error("invalid_task_binding");
    let active = 0;
    for (const a of ARMS) {
      const launches = await filesJSON(ap(dir, a, "launches")),
        records = await filesJSON(ap(dir, a, "records"));
      if (
        launches.some((x) => x.agentId === l.agentId) ||
        m.priorAgentIds.includes(l.agentId)
      )
        throw new Error("reused_agent");
      if (a === arm && launches.some((x) => x.taskId === l.taskId))
        throw new Error("duplicate_task_launch");
      active += launches.filter(
        (x) => !records.some((r) => r.taskId === x.taskId),
      ).length;
    }
    if (active >= 4) throw new Error("concurrency_exceeded");
    await exclusive(ap(dir, arm, `launches/${sha(l.taskId)}.json`), l);
  } finally {
    await rm(lock);
  }
}
export async function persist(
  dir: string,
  arm: Arm,
  r: {
    taskId: string;
    agentId: string;
    rawOutput: string | null;
    executionStatus: "completed" | "execution_error";
  },
) {
  await noSeal(dir, arm);
  const l = await readJSON(ap(dir, arm, `launches/${sha(r.taskId)}.json`)),
    t = (await taskList(dir, arm)).find((t) => t.taskId === r.taskId);
  if (
    !t ||
    l.agentId !== r.agentId ||
    (r.executionStatus === "completed") !== (r.rawOutput !== null)
  )
    throw new Error("record_binding_mismatch");
  // No JSON parse, schema parse, trim or response repair occurs before this exclusive raw write.
  await exclusive(ap(dir, arm, `records/${sha(r.taskId)}.json`), {
    ...r,
    rawOutputSha256: r.rawOutput === null ? null : sha(r.rawOutput),
    inputSha256: t.inputSha256,
    finalizedAt: new Date().toISOString(),
  });
}
export async function seal(dir: string, arm: Arm) {
  await noSeal(dir, arm);
  await verifyFrozen(dir);
  const tasks = await taskList(dir, arm),
    records = await filesJSON(ap(dir, arm, "records"));
  const ordered = tasks.map(
    (t) =>
      records.find((r) => r.taskId === t.taskId) ?? {
        taskId: t.taskId,
        agentId: null,
        rawOutput: null,
        executionStatus: "missing_result",
        rawOutputSha256: null,
        inputSha256: t.inputSha256,
        finalizedAt: new Date().toISOString(),
      },
  );
  await exclusive(ap(dir, arm, "raw-results.json"), ordered);
  const s = {
    arm,
    manifestSha256: sha(await readFile(path.join(dir, "manifest.json"))),
    tasksSha256: sha(await readFile(ap(dir, arm, "tasks.json"))),
    launchesSha256: sha(serialize(await filesJSON(ap(dir, arm, "launches")))),
    recordsSha256: sha(serialize(records)),
    rawSha256: sha(await readFile(ap(dir, arm, "raw-results.json"))),
    sealedAt: new Date().toISOString(),
  };
  await exclusive(ap(dir, arm, "raw-seal.json"), s);
  return s;
}
export async function verifySeal(dir: string, arm: Arm) {
  const s = await readJSON(ap(dir, arm, "raw-seal.json"));
  for (const [key, f] of [
    ["manifestSha256", path.join(dir, "manifest.json")],
    ["tasksSha256", ap(dir, arm, "tasks.json")],
    ["rawSha256", ap(dir, arm, "raw-results.json")],
  ])
    if (sha(await readFile(f)) !== s[key])
      throw new Error(`seal_changed:${arm}:${key}`);
  const launches: Launch[] = await filesJSON(ap(dir, arm, "launches")),
    records: RecordResult[] = await filesJSON(ap(dir, arm, "records")),
    raw: RecordResult[] = await readJSON(ap(dir, arm, "raw-results.json")),
    tasks = await taskList(dir, arm);
  if (
    sha(serialize(launches)) !== s.launchesSha256 ||
    sha(serialize(records)) !== s.recordsSha256
  )
    throw new Error("individual_seal_changed");
  if (
    raw.length !== tasks.length ||
    new Set(raw.map((r) => r.taskId)).size !== raw.length
  )
    throw new Error("record_count_mismatch");
  for (const [i, r] of raw.entries()) {
    const t = tasks[i],
      l = launches.find((l) => l.taskId === r.taskId);
    if (
      r.taskId !== t.taskId ||
      r.inputSha256 !== t.inputSha256 ||
      r.rawOutputSha256 !== (r.rawOutput === null ? null : sha(r.rawOutput))
    )
      throw new Error("raw_binding_changed");
    if (
      r.agentId &&
      (!l ||
        l.agentId !== r.agentId ||
        serialize(records.find((x) => x.taskId === r.taskId)) !== serialize(r))
    )
      throw new Error("launch_record_changed");
    if (
      l &&
      (l.model !== CONFIG.model ||
        l.reasoningEffort !== CONFIG.reasoningEffort ||
        l.forkContext !== false ||
        l.retries !== 0 ||
        l.fallback !== null ||
        l.promptSha256 !== t.promptSha256)
    )
      throw new Error("launch_config_changed");
  }
  return { seal: s, raw, launches, tasks };
}
const sumRatio = (rows: { numerator: number; denominator: number }[]) =>
  ratio(
    rows.reduce((n, r) => n + r.numerator, 0),
    rows.reduce((n, r) => n + r.denominator, 0),
  );
export async function scoreArm(dir: string, arm: Arm) {
  const b = await loadBenchmark(),
    v = await verifySeal(dir, arm);
  const rows = v.tasks.map((t, i) => {
    const raw = v.raw[i],
      parsed = parseTask(t, raw.rawOutput),
      c = b.cases[t.caseIndex],
      p = projectOracle(c, t.caseIndex);
    const base = {
      taskId: t.taskId,
      caseId: c.id,
      propositionId: t.propositionId
        ? p.privateMapping.propositions[t.propositionId]
        : null,
      completed: raw.executionStatus === "completed",
      valid: parsed.valid,
      schemaValid: parsed.schemaValid,
      issues: parsed.issues,
    };
    if (arm === "a" || arm === "e")
      return {
        ...base,
        identity: identity(
          c,
          t.input.evidence as EvidenceV4[],
          parsed.valid && parsed.data && "propositions" in parsed.data
            ? parsed.data.propositions
            : [],
        ),
      };
    if (arm === "b")
      return {
        ...base,
        edges: edgeScore(
          c,
          p.evidence,
          p.propositions,
          parsed.valid && parsed.data && "edges" in parsed.data
            ? parsed.data.edges
            : [],
          p.privateMapping.propositions,
        ),
      };
    if (arm === "c")
      return {
        ...base,
        expected: p.taxonomy[t.propositionId!],
        predicted:
          parsed.valid && parsed.data && "taxonomy" in parsed.data
            ? parsed.data.taxonomy
            : "missing",
      };
    // Structural rejection counts against contract rate; schema-readable outputs are still semantically audited.
    const n =
      parsed.schemaValid && "schemaData" in parsed
        ? (parsed.schemaData as NormalizationV4)
        : null;
    return {
      ...base,
      normalization: normalizationScore(
        c,
        p.privateMapping.propositions[t.propositionId!],
        n,
        t.input.evidence as EvidenceV4[],
      ),
      rawNormalization: n,
    };
  });
  const summary: Record<string, unknown> = {
    arm,
    conditionalQuality:
      arm === "e"
        ? "Stage 2 GIVEN deterministic literal span inventory"
        : "conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle)",
    agents: v.launches.length,
    tasks: rows.length,
    completed: rows.filter((r) => r.completed).length,
    malformed: rows.filter((r) => !r.schemaValid).length,
    contractInvalid: rows.filter((r) => !r.valid).length,
  };
  if (arm === "a" || arm === "e") {
    const id = rows.map(
      (r) => (r as { identity: ReturnType<typeof identity> }).identity,
    );
    Object.assign(summary, {
      propositionRecall: sumRatio(id.map((i) => i.recall)),
      propositionPrecision: sumRatio(id.map((i) => i.precision)),
      economicRecall: sumRatio(id.map((i) => i.economicRecall)),
      nonEconomicRecall: sumRatio(id.map((i) => i.nonEconomicRecall)),
      harmfulMerges: id.reduce((n, i) => n + i.harmfulMerges, 0),
      harmfulEconomicMerges: id.reduce(
        (n, i) => n + i.harmfulEconomicMerges,
        0,
      ),
      harmfulSplits: id.reduce((n, i) => n + i.harmfulSplits, 0),
      unmatchedPropositions: id.reduce((n, i) => n + i.unmatched.length, 0),
    });
  } else if (arm === "b") {
    const e = rows.map(
      (r) => (r as { edges: ReturnType<typeof edgeScore> }).edges,
    );
    Object.assign(summary, {
      materialEdgeRecall: sumRatio(e.map((r) => r.materialRecall)),
      criticalPrecision: sumRatio(e.map((r) => r.criticalPrecision)),
      wrongTargetEdges: e.reduce((n, r) => n + r.wrongTargets, 0),
      publicationCriticalWrongTargetEdges: e.reduce(
        (n, r) => n + r.criticalWrongTargets,
        0,
      ),
      wrongRelationEdges: e.reduce((n, r) => n + r.wrongRelations, 0),
      missingMaterialEdges: e.reduce((n, r) => n + r.missingMaterial, 0),
      sharedEvidenceRecall: sumRatio(e.map((r) => r.sharedRecall)),
    });
  } else if (arm === "c") {
    const rs = rows as ((typeof rows)[number] & {
        expected: string;
        predicted: string;
      })[],
      confusion = Object.fromEntries(
        TAXONOMY_V4.map((g) => [
          g,
          Object.fromEntries(
            [...TAXONOMY_V4, "missing"].map((p) => [
              p,
              rs.filter((r) => r.expected === g && r.predicted === p).length,
            ]),
          ),
        ]),
      );
    const correct = rs.filter(
      (r) =>
        r.expected === "economic_offer" && r.predicted === "economic_offer",
    ).length;
    Object.assign(summary, {
      confusion,
      economicPrecision: ratio(
        correct,
        rs.filter((r) => r.predicted === "economic_offer").length,
      ),
      economicRecall: ratio(correct, 43),
      falseEconomic: rs.filter(
        (r) =>
          r.expected !== "economic_offer" && r.predicted === "economic_offer",
      ).length,
    });
  } else {
    const n = rows.map(
      (r) =>
        (r as { normalization: ReturnType<typeof normalizationScore> })
          .normalization,
    );
    Object.assign(summary, {
      contractValid: ratio(rows.filter((r) => r.valid).length, 43),
      materialConstraintRecall: sumRatio(n.map((r) => r.materialRecall)),
      annotatedFactAccuracy: sumRatio(n.map((r) => r.factAccuracy)),
      unsupportedCriticalFacts: n.reduce(
        (v, r) => v + r.unsupportedCritical,
        0,
      ),
      dateInventions: n.reduce((v, r) => v + r.dateInventions, 0),
      timeInventions: n.reduce((v, r) => v + r.timeInventions, 0),
      polarityErrors: n.reduce((v, r) => v + r.polarityErrors, 0),
      unannotatedConstraintRecords: n.reduce(
        (v, r) => v + r.unannotated.length,
        0,
      ),
    });
  }
  const scores = { summary, rows };
  await writeFile(ap(dir, arm, "scores.json"), serialize(scores));
  return scores;
}
export async function verify(dir: string) {
  const m = await verifyFrozen(dir),
    agents = new Set<string>(),
    seals: Record<string, string> = {};
  for (const arm of ARMS) {
    const v = await verifySeal(dir, arm);
    seals[arm] = v.seal.rawSha256;
    for (const l of v.launches) {
      if (agents.has(l.agentId) || m.priorAgentIds.includes(l.agentId))
        throw new Error("reused_agent");
      agents.add(l.agentId);
    }
  }
  for (const [f, h] of Object.entries(m.protectedFiles))
    if (sha(await readFile(f)) !== h) throw new Error(`protected_changed:${f}`);
  const results = {
    agents: agents.size,
    protectedFiles: Object.keys(m.protectedFiles).length,
    seals,
    benchmarkSha256: m.benchmarkSha256,
    oracleProjectionSha256: m.oracleProjectionSha256,
    scorerSha256: m.scorerSha256,
    config: m.config,
    oraclePerfect: true,
  };
  await writeFile(path.join(dir, "verification.json"), serialize(results));
  return results;
}
async function main() {
  const [cmd, dir, arm, payload] = process.argv.slice(2);
  let result: unknown;
  if (cmd === "prepare") result = await prepare();
  else if (cmd === "tasks") result = await taskList(dir, arm as Arm);
  else if (cmd === "register")
    result = await register(dir, arm as Arm, JSON.parse(payload));
  else if (cmd === "persist")
    result = await persist(dir, arm as Arm, JSON.parse(payload));
  else if (cmd === "seal") result = await seal(dir, arm as Arm);
  else if (cmd === "score") result = (await scoreArm(dir, arm as Arm)).summary;
  else if (cmd === "verify") result = await verify(dir);
  else
    throw new Error(
      "usage: prepare | tasks/register/persist/seal/score/verify <run> <arm> [payload]",
    );
  process.stdout.write(serialize(result ?? { ok: true }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
