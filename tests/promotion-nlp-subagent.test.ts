import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import {
  BENCHMARK_FILE,
  buildBlindSubagentInput,
  buildBlindSubagentPrompt,
  loadBlindInputs,
  orderRawResults,
  parseRawResponse,
  persistRawResult,
  prepareRun,
  protectedSnapshot,
  scoreSealedRun,
  sealRun,
  sha256,
  SUBAGENT_MODEL,
  type BlindInput,
  type RawRecord,
} from "../scripts/research/promotion-nlp-subagent-evaluation";
import {
  emptyExtraction,
  extractionFields,
} from "../src/ingestion/promotion-nlp/schema";
import { validatePromotionExtraction } from "../src/ingestion/promotion-nlp/validator";
import { benchmarkEvidence } from "../src/ingestion/promotion-nlp/benchmark";

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
const syntheticCase = (id: string) => ({
  id,
  sourceId: "synthetic",
  merchant: "Acme",
  sourceText: "Acme: Save $5.",
  canonicalUrl: "https://example.test/promo",
  nativeId: id,
  evidenceId: id,
  selector: "caption",
  layout: "synthetic",
  sourceReference: {
    file: "synthetic.txt",
    sha256: "0".repeat(64),
    url: "https://example.test/promo",
    relation: "detail" as const,
    fetchedAt: "2026-10-02T00:00:00.000Z",
    selectors: ["caption"],
    mode: "instagram-caption" as const,
    exclude: [],
  },
  expectedClassification: { value: "promotion" as const, quote: "Save $5." },
  expectedSupportedFacts: {
    merchant: { value: "Acme", quote: "Acme" },
    benefit: { value: "Save $5.", quote: "Save $5." },
  },
  expectedUnknownFacts: extractionFields.filter(
    (f) => !["merchant", "benefit"].includes(f),
  ),
  acceptableValues: {},
  notes: "Synthetic infrastructure test, never model evaluation.",
  tags: [],
  currentParser: {
    available: true,
    classification: "promotion" as const,
    facts: { merchant: "Acme" },
    reference: "synthetic",
  },
});
const validOutput = () => ({
  ...emptyExtraction("promotion", "Save $5."),
  merchant: { value: "Acme", quote: "Acme" },
  benefit: { value: "Save $5.", quote: "Save $5." },
});
const record = (
  input: BlindInput,
  raw = JSON.stringify(validOutput()),
): RawRecord => ({
  caseId: input.id,
  sanitizedInputHash: sha256(JSON.stringify(input)),
  rawSubagentOutput: raw,
  rawOutputSha256: sha256(raw),
  executionStatus: "completed",
  agentId: `agent-${input.id}`,
  model: SUBAGENT_MODEL,
  finalizedAt: "2026-10-02T00:00:00.000Z",
});
async function fixtureRun() {
  const root = await mkdtemp(path.join(os.tmpdir(), "blind-nlp-test-"));
  directories.push(root);
  for (const folder of [
    "src",
    "supabase/migrations",
    path.dirname(BENCHMARK_FILE),
  ])
    await mkdir(path.join(root, folder), { recursive: true });
  for (const file of [
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
    "src/direct-source-v2.ts",
    "supabase/migrations/production.sql",
  ])
    await writeFile(path.join(root, file), "protected-boundary\n");
  await writeFile(
    path.join(root, BENCHMARK_FILE),
    JSON.stringify({
      version: 1,
      reviewedAt: "2026-10-02",
      reviewBasis: "synthetic test only",
      cases: Array.from({ length: 49 }, (_, i) => syntheticCase(`case-${i}`)),
    }),
  );
  // Read-only Git metadata through a temporary gitdir pointer; no commit/ref writes.
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
  }).trim();
  await writeFile(path.join(root, ".git"), `gitdir: ${gitDir}\n`);
  const dir = await prepareRun(root);
  return { root, dir, inputs: (await loadBlindInputs(root)).inputs };
}
async function save(
  dir: string,
  input: BlindInput,
  raw = JSON.stringify(validOutput()),
  agentId = `agent-${input.id}`,
) {
  await persistRawResult(dir, {
    caseId: input.id,
    rawSubagentOutput: raw,
    executionStatus: "completed",
    agentId,
    model: SUBAGENT_MODEL,
  });
}

describe("blind subagent evaluation isolation and integrity", () => {
  it("explicit projection and prompt exclude gold, parser values, notes and prior answers", () => {
    const sentinel = "GOLD_AND_PARSER_SECRET_90ae";
    const c = {
      ...syntheticCase("safe"),
      expectedClassification: sentinel,
      expectedSupportedFacts: { secret: sentinel },
      expectedUnknownFacts: [sentinel],
      currentParser: { secret: sentinel },
      notes: sentinel,
      previousOutput: sentinel,
    };
    const input = buildBlindSubagentInput(c);
    expect(Object.keys(input)).toEqual([
      "id",
      "merchantHint",
      "titleHint",
      "SOURCE_TEXT",
    ]);
    expect(JSON.stringify(input)).not.toContain(sentinel);
    expect(buildBlindSubagentPrompt(input)).not.toContain(sentinel);
    expect(input).not.toBe(c);
  });
  it("prompt serialization rejects appended parser/gold fields", () => {
    expect(() =>
      buildBlindSubagentPrompt({
        ...buildBlindSubagentInput(syntheticCase("safe")),
        currentParser: "SECRET",
      } as BlindInput),
    ).toThrow();
  });
  it("selects all 49 reviewed cases by default without forwarding gold", async () => {
    const { inputs } = await loadBlindInputs();
    expect(inputs).toHaveLength(49);
    expect(new Set(inputs.map((i) => i.id)).size).toBe(49);
    expect(JSON.stringify(inputs)).not.toMatch(
      /expectedClassification|expectedSupportedFacts|expectedUnknownFacts|currentParser/,
    );
  });
  it("one task maps to exactly one case and the schema accepts plain raw JSON", () => {
    const a = buildBlindSubagentInput(syntheticCase("one"));
    expect(buildBlindSubagentPrompt(a)).toContain('"id":"one"');
    expect(parseRawResponse(JSON.stringify(validOutput()))).toEqual({
      parsed: validOutput(),
      malformed: false,
    });
  });
  it("does not repair fences, trailing prose, missing quotes or wrong date values", () => {
    for (const raw of [
      "```json\n{}\n```",
      JSON.stringify(validOutput()) + " explanation",
      "{",
      "{}",
    ])
      expect(parseRawResponse(raw).malformed).toBe(true);
    const wrong = {
      ...validOutput(),
      endDate: { value: "2099-02-30", quote: "Acme" },
    };
    expect(parseRawResponse(JSON.stringify(wrong)).parsed).toEqual(wrong);
  });
  it("stable identity under parallel completion order; duplicate and unknown IDs fail closed", () => {
    const inputs = ["a", "b"].map((id) =>
      buildBlindSubagentInput(syntheticCase(id)),
    );
    expect(
      orderRawResults(inputs, inputs.map((i) => record(i)).reverse()).map(
        (r) => r.caseId,
      ),
    ).toEqual(["a", "b"]);
    expect(() =>
      orderRawResults(inputs, [record(inputs[0]), record(inputs[0])]),
    ).toThrow("duplicate_case_result");
    expect(() =>
      orderRawResults(inputs, [
        record(buildBlindSubagentInput(syntheticCase("unknown"))),
      ]),
    ).toThrow("unknown_case_result");
  });
  it("reports a missing case and catches modified raw content/input hashes", () => {
    const input = buildBlindSubagentInput(syntheticCase("a"));
    expect(orderRawResults([input], [])[0].executionStatus).toBe(
      "missing_result",
    );
    expect(() =>
      orderRawResults(
        [input],
        [{ ...record(input), rawSubagentOutput: "changed" }],
      ),
    ).toThrow("raw_output_hash_mismatch");
    expect(() =>
      orderRawResults(
        [input],
        [{ ...record(input), sanitizedInputHash: "changed" }],
      ),
    ).toThrow("sanitized_input_hash_mismatch");
  });
  it("preserves malformed raw output before scoring and includes failures in all denominators", async () => {
    const { dir, root, inputs } = await fixtureRun();
    const raw = "```json\n{broken}\n```";
    await save(dir, inputs[0], raw);
    await sealRun(dir);
    const before = await readFile(path.join(dir, "raw-results.json"), "utf8");
    const m = await scoreSealedRun(dir, root);
    expect(m.completedOutputs).toBe(1);
    expect(m.malformedOutputs).toBe(1);
    expect(m.missingResults).toHaveLength(48);
    expect(m.summary.cases).toBe(49);
    expect(m.summary.classification.promotion_recall).toBe(0);
    expect(await readFile(path.join(dir, "raw-results.json"), "utf8")).toBe(
      before,
    );
    expect(JSON.parse(before)[0].rawSubagentOutput).toBe(raw);
  });
  it("exclusive persistence rejects duplicate response or replacement after sealing", async () => {
    const { dir, inputs } = await fixtureRun();
    await save(dir, inputs[0]);
    await expect(save(dir, inputs[0], "replacement")).rejects.toThrow();
    await sealRun(dir);
    await expect(save(dir, inputs[1])).rejects.toThrow("run_already_sealed");
  });
  it("refuses reused subagent contexts and model fallback", async () => {
    const { dir, inputs } = await fixtureRun();
    await save(dir, inputs[0], JSON.stringify(validOutput()), "same-agent");
    await save(dir, inputs[1], JSON.stringify(validOutput()), "same-agent");
    await expect(sealRun(dir)).rejects.toThrow("reused_subagent_context");
    await expect(
      persistRawResult(dir, {
        caseId: inputs[2].id,
        rawSubagentOutput: null,
        executionStatus: "execution_error",
        agentId: "third",
        model: "another-model" as typeof SUBAGENT_MODEL,
      }),
    ).rejects.toThrow();
  });
  it("execution errors are explicit and never replaced by fixtures", async () => {
    const { dir, root, inputs } = await fixtureRun();
    await persistRawResult(dir, {
      caseId: inputs[0].id,
      rawSubagentOutput: null,
      executionStatus: "execution_error",
      agentId: "failed-agent",
      model: SUBAGENT_MODEL,
    });
    await sealRun(dir);
    const m = await scoreSealedRun(dir, root);
    expect(m.executionErrors).toBe(1);
    expect(m.completedOutputs).toBe(0);
    expect(m.totalSubagentTasks).toBe(1);
  });
  it("gold scoring cannot start before persisted sealing; a changed seal fails closed", async () => {
    const { dir, root, inputs } = await fixtureRun();
    await expect(scoreSealedRun(dir, root)).rejects.toThrow();
    await save(dir, inputs[0]);
    await sealRun(dir);
    await writeFile(path.join(dir, "raw-results.json"), "[]");
    await expect(scoreSealedRun(dir, root)).rejects.toThrow(
      "raw_seal_mismatch",
    );
  });
  it("reuses the existing validator without date or merchant patches", async () => {
    const { dir, root, inputs } = await fixtureRun();
    const raw = JSON.stringify(validOutput());
    await save(dir, inputs[0], raw);
    await sealRun(dir);
    await scoreSealedRun(dir, root);
    const results = JSON.parse(
      await readFile(path.join(dir, "validated-results.json"), "utf8"),
    );
    expect(results[0].validated).toEqual(
      validatePromotionExtraction(
        benchmarkEvidence(syntheticCase("case-0")),
        JSON.parse(raw),
      ),
    );
  });
  it("raw artifacts exclude gold/parser and metadata excludes credentials", async () => {
    vi.stubEnv("OPENAI_API_KEY", "CREDENTIAL_SENTINEL_never_serialize");
    vi.stubEnv(
      "PROMOTION_NLP_OPENAI_API_KEY",
      "CREDENTIAL_SENTINEL_never_serialize",
    );
    const { dir, root, inputs } = await fixtureRun();
    await save(dir, inputs[0]);
    await sealRun(dir);
    await scoreSealedRun(dir, root);
    const raw = await readFile(path.join(dir, "raw-results.json"), "utf8");
    expect(raw).not.toMatch(
      /expectedClassification|expectedSupportedFacts|expectedUnknownFacts|currentParser|goldValue/,
    );
    for (const file of [
      "raw-results.json",
      "validated-results.json",
      "scores.json",
      "failures.json",
      "run-metadata.json",
      "report.md",
    ])
      expect(await readFile(path.join(dir, file), "utf8")).not.toContain(
        "CREDENTIAL_SENTINEL",
      );
  });
  it("has no provider/acquisition imports, never fetches, and leaves production boundaries unchanged", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network_forbidden");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { dir, root, inputs } = await fixtureRun();
    const before = await protectedSnapshot(root);
    await save(dir, inputs[0]);
    await sealRun(dir);
    const m = await scoreSealedRun(dir, root);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await protectedSnapshot(root)).toEqual(before);
    expect(Object.values(m.operationBoundary).every((v) => v === 0)).toBe(true);
    const code = await readFile(
      "scripts/research/promotion-nlp-subagent-evaluation.ts",
      "utf8",
    );
    expect(code).not.toMatch(
      /from .*openai-provider|from .*extractor|from .*direct-sources|from .*persistence|process\.env|fetch\(/,
    );
  });
  it("rejects changed gold or production/direct-source-v2 before scoring", async () => {
    const { dir, root, inputs } = await fixtureRun();
    await save(dir, inputs[0]);
    await sealRun(dir);
    await writeFile(path.join(root, "src/direct-source-v2.ts"), "changed");
    await expect(scoreSealedRun(dir, root)).rejects.toThrow(
      "protected_files_changed",
    );
  });
  it("rejects benchmark gold edits after extraction", async () => {
    const { dir, root, inputs } = await fixtureRun();
    await save(dir, inputs[0]);
    await sealRun(dir);
    const file = path.join(root, BENCHMARK_FILE);
    const benchmark = JSON.parse(await readFile(file, "utf8"));
    benchmark.cases[0].expectedSupportedFacts.benefit.value = "gold edit";
    await writeFile(file, JSON.stringify(benchmark));
    await expect(scoreSealedRun(dir, root)).rejects.toThrow(
      "protected_files_changed",
    );
  });
  it("validator rejection cannot silently repair or overwrite saved dates", async () => {
    const { dir, root, inputs } = await fixtureRun();
    const raw = JSON.stringify({
      ...validOutput(),
      endDate: { value: "2099-01-01", quote: "Acme" },
    });
    await save(dir, inputs[0], raw);
    await sealRun(dir);
    await scoreSealedRun(dir, root);
    const stored = JSON.parse(
      await readFile(path.join(dir, "raw-results.json"), "utf8"),
    );
    expect(stored[0].rawSubagentOutput).toBe(raw);
    const validated = JSON.parse(
      await readFile(path.join(dir, "validated-results.json"), "utf8"),
    );
    expect(validated[0].validated.accepted.endDate).toBeUndefined();
    expect(validated[0].validated.rejected.endDate.value).toBe("2099-01-01");
  });
});
