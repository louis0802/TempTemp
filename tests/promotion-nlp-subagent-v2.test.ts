import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  ANNOTATION_FILE_V2,
  blindPromptV2,
  buildBlindSubagentInput,
  FROZEN_FILES_V2,
  hashV2,
  MODEL_V2,
  orderRawV2,
  parseResponseV2,
  persistRawV2,
  prepareRunV2,
  registerLaunchV2,
  scoreSealedRunV2,
  sealRunV2,
  verifySealV2,
} from "../scripts/research/promotion-nlp-subagent-v2-evaluation";
import { emptyExtractionV2 } from "../src/ingestion/promotion-nlp/schema-v2";
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const valid = () => JSON.stringify(emptyExtractionV2());
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "promotion-v2-integrity-"));
  roots.push(root);
  const a = JSON.parse(await readFile(ANNOTATION_FILE_V2, "utf8"));
  const files = new Set<string>([
    ...FROZEN_FILES_V2,
    "tests/fixtures/promotion-nlp/benchmark.json",
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "next-env.d.ts",
    ...a.cases.map(
      (c: { sourceReference: { file: string } }) => c.sourceReference.file,
    ),
  ]);
  for (const f of files) {
    await mkdir(path.dirname(path.join(root, f)), { recursive: true });
    await copyFile(f, path.join(root, f));
  }
  await mkdir(path.join(root, "supabase/migrations"), { recursive: true });
  await writeFile(
    path.join(root, "src/production-boundary.ts"),
    "production-unchanged",
  );
  const dir = await prepareRunV2(root),
    m = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
  return { root, dir, m };
}
async function launch(
  f: Awaited<ReturnType<typeof fixture>>,
  index = 0,
  agent = `fresh-agent-${index}`,
) {
  const t = f.m.tasks[index];
  await registerLaunchV2(f.dir, {
    caseId: t.caseId,
    agentId: agent,
    model: MODEL_V2,
    reasoningEffort: "medium",
    forkContext: false,
    promptSha256: t.promptSha256,
  });
  return t;
}
async function save(
  f: Awaited<ReturnType<typeof fixture>>,
  index = 0,
  raw = valid(),
) {
  const t = await launch(f, index);
  await persistRawV2(f.dir, {
    caseId: t.caseId,
    agentId: `fresh-agent-${index}`,
    rawSubagentOutput: raw,
    executionStatus: "completed",
  });
}
describe("v2 blind run integrity", () => {
  it("excludes gold, parser output, v1 answers, semantic review and appended metadata", () => {
    const secret = "BLIND_SECRET_428";
    const c = {
      id: "one",
      merchant: "Acme",
      sourceText: "Save $3",
      expectedSupportedFacts: secret,
      currentParser: secret,
      v1Output: secret,
      semanticReview: secret,
    };
    const input = buildBlindSubagentInput(c);
    expect(Object.keys(input)).toEqual([
      "id",
      "merchantHint",
      "titleHint",
      "SOURCE_TEXT",
    ]);
    expect(blindPromptV2(input)).not.toContain(secret);
    expect(() =>
      blindPromptV2({ ...input, semanticReview: secret } as typeof input),
    ).toThrow();
    expect(blindPromptV2(input)).toContain('"id":"one"');
  });
  it("does not repair extra braces/fences; separates syntax from schema failure", () => {
    for (const raw of [valid() + "}", "```json\n" + valid() + "\n```", "{"])
      expect(parseResponseV2(raw).syntaxMalformed).toBe(true);
    expect(parseResponseV2("{}")).toEqual({
      parsed: null,
      syntaxMalformed: false,
      schemaMalformed: true,
    });
    expect(parseResponseV2(valid()).parsed).toEqual(emptyExtractionV2());
  });
  it("prepares exactly 49 sanitized fixed-model tasks and freezes sources/annotations/roles", async () => {
    const f = await fixture();
    expect(f.m.tasks).toHaveLength(49);
    expect(f.m.model).toBe("gpt-6-luna");
    expect(f.m.reasoningEffort).toBe("medium");
    expect(f.m.forkContext).toBe(false);
    expect(f.m.concurrency).toBe(4);
    expect(f.m.toolIsolation).toMatch(/prompt-enforced/);
    expect(f.m.annotationSha256).toBe(
      hashV2(await readFile(path.join(f.root, ANNOTATION_FILE_V2))),
    );
    const tasks = await readFile(path.join(f.dir, "blind-tasks.json"), "utf8");
    expect(tasks).not.toMatch(
      /expectedClassification|currentParser|secondaryEvidence|derivation|v1Output/,
    );
  });
  it("exclusive first output persists byte content before scoring; every missing/malformed stays in denominators", async () => {
    const f = await fixture(),
      raw = valid() + "}";
    await save(f, 0, raw);
    await expect(scoreSealedRunV2(f.dir, f.root)).rejects.toThrow();
    await expect(
      persistRawV2(f.dir, {
        caseId: f.m.tasks[0].caseId,
        agentId: "fresh-agent-0",
        rawSubagentOutput: valid(),
        executionStatus: "completed",
      }),
    ).rejects.toThrow();
    await sealRunV2(f.dir, f.root);
    const before = await readFile(path.join(f.dir, "raw-results.json"), "utf8"),
      report = await scoreSealedRunV2(f.dir, f.root);
    expect(report.cases).toBe(49);
    expect(report.completedOutputs).toBe(1);
    expect(report.syntaxMalformed).toBe(1);
    expect(report.missingResults).toHaveLength(48);
    expect(report.allCaseClassification.promotion_recall).toBe(0);
    expect(report.parseableOutputClassification.cases).toBe(0);
    expect(
      report.survivingSemanticReviewFlags.invented_validity_facts.events,
    ).toBe(0);
    expect(report.semanticCoverage.unassessable).toBe(49);
    expect(await readFile(path.join(f.dir, "raw-results.json"), "utf8")).toBe(
      before,
    );
    expect(JSON.parse(before)[0].rawSubagentOutput).toBe(raw);
    await expect(launch(f, 1)).rejects.toThrow("run_already_sealed");
  });
  it("rejects context reuse, model fallback, reasoning/history changes and wrong prompt", async () => {
    const f = await fixture();
    await launch(f, 0, "same-agent");
    await expect(launch(f, 1, "same-agent")).rejects.toThrow(
      "reused_subagent_context",
    );
    const base = {
      caseId: f.m.tasks[1].caseId,
      agentId: "another",
      model: MODEL_V2,
      reasoningEffort: "medium",
      forkContext: false,
      promptSha256: f.m.tasks[1].promptSha256,
    };
    for (const patch of [
      { model: "gpt-6-sol" },
      { reasoningEffort: "high" },
      { forkContext: true },
      { promptSha256: "wrong" },
    ])
      await expect(
        registerLaunchV2(f.dir, { ...base, ...patch } as Parameters<
          typeof registerLaunchV2
        >[1]),
      ).rejects.toThrow();
  });
  it("rejects more than four unfinished tasks and duplicate case launch", async () => {
    const f = await fixture();
    for (let i = 0; i < 4; i++) await launch(f, i);
    await expect(launch(f, 4)).rejects.toThrow("concurrency_exceeded");
    await expect(launch(f, 0, "extra")).rejects.toThrow();
  });
  it("binds response to launched agent; execution errors remain explicit", async () => {
    const f = await fixture(),
      t = await launch(f);
    await expect(
      persistRawV2(f.dir, {
        caseId: t.caseId,
        agentId: "wrong",
        rawSubagentOutput: valid(),
        executionStatus: "completed",
      }),
    ).rejects.toThrow("agent_identity_mismatch");
    await persistRawV2(f.dir, {
      caseId: t.caseId,
      agentId: "fresh-agent-0",
      rawSubagentOutput: null,
      executionStatus: "execution_error",
    });
    await sealRunV2(f.dir, f.root);
    const r = await scoreSealedRunV2(f.dir, f.root);
    expect(r.executionErrors).toBe(1);
    expect(r.completedOutputs).toBe(0);
    expect(r.malformedOutputRate).toBe(0);
  });
  it("rejects duplicate/unknown result IDs, raw hash edits and reused identity", async () => {
    const f = await fixture();
    await save(f);
    await sealRunV2(f.dir, f.root);
    const rows = JSON.parse(
        await readFile(path.join(f.dir, "raw-results.json"), "utf8"),
      ),
      r = rows[0];
    expect(() => orderRawV2(f.m.tasks, [r, r])).toThrow(
      "duplicate_case_result",
    );
    expect(() => orderRawV2(f.m.tasks, [{ ...r, caseId: "unknown" }])).toThrow(
      "unknown_case_result",
    );
    expect(() =>
      orderRawV2(f.m.tasks, [{ ...r, rawSubagentOutput: "tampered" }]),
    ).toThrow("raw_output_hash_mismatch");
    expect(() =>
      orderRawV2(f.m.tasks, [
        r,
        {
          ...r,
          caseId: rows[1].caseId,
          sanitizedInputHash: rows[1].sanitizedInputHash,
        },
      ]),
    ).toThrow("reused_subagent_context");
  });
  it.each(["raw-results.json", "manifest.json"])(
    "detects sealed %s tampering",
    async (file) => {
      const f = await fixture();
      await save(f);
      await sealRunV2(f.dir, f.root);
      await writeFile(path.join(f.dir, file), "{}");
      await expect(verifySealV2(f.dir, f.root)).rejects.toThrow(
        /seal_mismatch/,
      );
    },
  );
  it.each([
    "src/ingestion/promotion-nlp/prompt-v2.ts",
    ANNOTATION_FILE_V2,
    "docs/changes/promotion-nlp-semantic-contract-v2/semantic-contract.md",
    "src/ingestion/promotion-nlp/validator-v2.ts",
  ])("detects frozen edits to %s before sealing", async (file) => {
    const f = await fixture();
    await writeFile(path.join(f.root, file), "edited");
    await expect(sealRunV2(f.dir, f.root)).rejects.toThrow(
      "frozen_file_changed",
    );
  });
  it("protects production and captured source bytes", async () => {
    const f = await fixture();
    await writeFile(path.join(f.root, "src/production-boundary.ts"), "changed");
    await expect(sealRunV2(f.dir, f.root)).rejects.toThrow(
      "protected_files_changed",
    );
    await writeFile(
      path.join(f.root, "src/production-boundary.ts"),
      "production-unchanged",
    );
    const capture = Object.keys(f.m.sourceCaptures)[0];
    await writeFile(path.join(f.root, capture), "changed");
    await expect(sealRunV2(f.dir, f.root)).rejects.toThrow(
      "source_capture_changed",
    );
  });
  it("never invokes acquisition/provider/network/production DB and never serializes credentials", async () => {
    const fetch = vi.fn(() => {
      throw new Error("network_forbidden");
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("OPENAI_API_KEY", "SECRET_CREDENTIAL_9");
    const f = await fixture();
    await save(f);
    await sealRunV2(f.dir, f.root);
    await scoreSealedRunV2(f.dir, f.root);
    expect(fetch).not.toHaveBeenCalled();
    for (const file of [
      "manifest.json",
      "raw-results.json",
      "scores.json",
      "validated-results.json",
    ])
      expect(await readFile(path.join(f.dir, file), "utf8")).not.toContain(
        "SECRET_CREDENTIAL_9",
      );
    const code = await readFile(
      "scripts/research/promotion-nlp-subagent-v2-evaluation.ts",
      "utf8",
    );
    expect(code).not.toMatch(
      /from .*openai-provider|from .*extractor|from .*persistence|from .*direct-sources|process\.env|fetch\(/,
    );
  });
});
