import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  benchmarkEvidence,
  benchmarkSchema,
  metricNames,
  scoreBenchmarkCase,
  summarizeBenchmark,
  type PromotionBenchmarkCase,
} from "../../src/ingestion/promotion-nlp/benchmark";
import {
  extractPromotionFacts,
  FixturePromotionNlpProvider,
} from "../../src/ingestion/promotion-nlp/extractor";
import {
  OpenAiPromotionNlpProvider,
  hostedConfigFromEnvironment,
} from "../../src/ingestion/promotion-nlp/openai-provider";
import {
  PROMOTION_NLP_PROMPT,
  PROMPT_VERSION,
} from "../../src/ingestion/promotion-nlp/prompt";
import {
  extractionFields,
  extractionJsonSchema,
  rawPromotionExtractionSchema,
  SCHEMA_VERSION,
} from "../../src/ingestion/promotion-nlp/schema";
import { validatePromotionExtraction } from "../../src/ingestion/promotion-nlp/validator";
import { mapPromotionNlpCandidate } from "../../src/ingestion/promotion-nlp/candidate-mapper";
import type { PromotionNlpProvider } from "../../src/ingestion/promotion-nlp/types";
import { directSources } from "../../src/ingestion/direct-sources/registry";
import { BoundedDirectFetch } from "../../src/ingestion/direct-sources/fetch";
import { makeEvidence } from "../../src/ingestion/direct-sources/evidence";
import { readCapturedText, hashCapture } from "./promotion-nlp-captures";

export const benchmarkPath = "tests/fixtures/promotion-nlp/benchmark.json";
export const outputsPath = "tests/fixtures/promotion-nlp/provider-outputs.json";
export async function loadReviewedBenchmark(root = process.cwd()) {
  const raw = await readFile(path.join(root, benchmarkPath), "utf8");
  const benchmark = benchmarkSchema.parse(JSON.parse(raw));
  for (const c of benchmark.cases) {
    const capture = await readCapturedText(c.sourceReference, root);
    if (capture.text !== c.sourceText)
      throw new Error(`nlp_gold_capture_mismatch:${c.id}`);
    const gold = {
      ...Object.fromEntries(
        extractionFields.map((f) => [f, { value: null, quote: null }]),
      ),
      ...c.expectedSupportedFacts,
      classification: c.expectedClassification,
    };
    const validation = validatePromotionExtraction(benchmarkEvidence(c), gold);
    if (validation.issues.length) throw new Error(`nlp_gold_invalid:${c.id}`);
  }
  return { benchmark, sha256: hashCapture(raw) };
}
export function parseBenchmarkArgs(args: string[]) {
  let live = false,
    limit: number | undefined;
  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--live") {
      if (live) throw new Error("duplicate_live_argument");
      live = true;
    } else if (
      args[i] === "--case" &&
      args[i + 1] &&
      !args[i + 1].startsWith("--")
    )
      ids.push(args[++i]);
    else if (
      args[i] === "--limit" &&
      args[i + 1] &&
      /^[1-9]\d*$/.test(args[i + 1])
    ) {
      limit = Number(args[++i]);
      if (limit > 60) throw new Error("benchmark_limit_exceeds_60");
    } else throw new Error("invalid_benchmark_argument");
  }
  return { live, limit, ids };
}
export async function capturedCandidate(
  c: PromotionBenchmarkCase,
  validated: ReturnType<typeof validatePromotionExtraction>,
  root = process.cwd(),
) {
  const source = directSources.find((s) => s.id === c.sourceId);
  // Captured captions from unregistered merchants stay extraction-only research records.
  if (!source) return null;
  const { body } = await readCapturedText(c.sourceReference, root);
  const page = {
    evidence: makeEvidence(
      source.id,
      c.sourceReference.url,
      c.sourceReference.url,
      c.sourceReference.relation,
      body,
      "text/html",
      200,
      c.sourceReference.fetchedAt,
    ),
    body,
  };
  if (page.evidence.id !== c.evidenceId)
    throw new Error("nlp_benchmark_evidence_id_mismatch");
  class CapturedOnlyContext extends BoundedDirectFetch {
    override get capturedPages() {
      return [page];
    }
  }
  const http = new CapturedOnlyContext(source, async () => {
    throw new Error("nlp_benchmark_acquisition_forbidden");
  });
  return mapPromotionNlpCandidate(benchmarkEvidence(c), validated, {
    source,
    http,
    observedAt: c.sourceReference.fetchedAt,
  });
}
export function renderBenchmarkReport(
  summary: ReturnType<typeof summarizeBenchmark>,
  mode: "live" | "offline",
  errors: number,
) {
  const lines = [
    "# Promotion NLP benchmark",
    "",
    `Mode: ${mode}. ${mode === "offline" ? "Checked fixture contract replay; these are NOT hosted model accuracy results." : "One provider call per selected case; no retries."}`,
    "",
    `Cases: ${summary.cases}; provider failures: ${errors}. Failures remain in all denominators.`,
    "",
    `Classification: ${JSON.stringify(summary.classification)}`,
    "",
    `Raw gold-relative unsupported fields: ${summary.raw_model_hallucinations}; caught: ${summary.hallucinations_caught_by_validator}; survived: ${summary.unsupported_fact_survived_validation}; critical survivors: ${summary.unsupported_critical_fact_survived_validation}.`,
    "",
    `Evidence quote mismatches: ${summary.evidence_quote_mismatch}.`,
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
    `Current parser comparison (field counts): ${JSON.stringify(summary.comparison)}`,
    "",
    `Current parser classification: ${JSON.stringify(summary.parser_classification)}`,
    "",
    "Raw unsupported/surviving means a nonempty value disagrees with reviewed gold and its explicitly accepted variants; report it conservatively. Exact textual/list equality can penalize valid paraphrases, omissions or alternate grouping. Source review is required before using those discrepancies to claim hallucination rates.",
    "",
    "Structural/evidence checks cannot prove semantic entailment, primary campaign/date association, exact normalized hour meaning, or participation roles. A copied unrelated quote can survive. No shadow recommendation is made automatically; inspect failures across merchants/layouts. Offline replay never justifies shadow mode.",
  );
  return lines.join("\n") + "\n";
}
export async function runPromotionNlpBenchmark(options: {
  live: boolean;
  limit?: number;
  ids?: string[];
  root?: string;
  provider?: PromotionNlpProvider;
  onCase?: (id: string) => void;
}) {
  const root = options.root ?? process.cwd();
  const { benchmark, sha256 } = await loadReviewedBenchmark(root);
  const ids = options.ids ?? [];
  if (ids.some((id) => !benchmark.cases.some((c) => c.id === id)))
    throw new Error("unknown_benchmark_case");
  let cases = benchmark.cases.filter((c) => !ids.length || ids.includes(c.id));
  if (options.limit !== undefined) cases = cases.slice(0, options.limit);
  if (!cases.length) throw new Error("empty_benchmark_selection");
  let provider = options.provider;
  if (!options.live && provider instanceof OpenAiPromotionNlpProvider)
    throw new Error("promotion_nlp_live_flag_required");
  if (!provider && options.live)
    provider = new OpenAiPromotionNlpProvider(hostedConfigFromEnvironment());
  if (!provider) {
    const fixture = z
      .strictObject({
        version: z.literal(1),
        kind: z.literal("checked-contract-replay-not-model-evaluation"),
        outputs: z.record(z.string(), rawPromotionExtractionSchema),
      })
      .parse(JSON.parse(await readFile(path.join(root, outputsPath), "utf8")));
    provider = new FixturePromotionNlpProvider(fixture.outputs);
  }
  const mode = options.live ? "live" : "offline";
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const runDirectory = path.join(root, ".local", "promotion-nlp", runId);
  await mkdir(path.dirname(runDirectory), { recursive: true });
  await mkdir(runDirectory);
  const startedAt = new Date().toISOString();
  const results = [];
  for (const c of cases) {
    options.onCase?.(c.id);
    let raw: unknown = null,
      error: string | null = null,
      requestedAt = new Date().toISOString();
    let validated: ReturnType<typeof validatePromotionExtraction>;
    try {
      const result = await extractPromotionFacts(
        provider,
        benchmarkEvidence(c),
      );
      raw = result.raw;
      validated = result.validated;
      requestedAt = result.metadata.requestedAt;
    } catch (e) {
      error =
        e instanceof Error && /^promotion_nlp_[a-z_0-9]+$/.test(e.message)
          ? e.message
          : "promotion_nlp_provider_failure";
      validated = validatePromotionExtraction(benchmarkEvidence(c), null);
    }
    const score = scoreBenchmarkCase(c, raw, validated);
    const candidate = await capturedCandidate(c, validated, root);
    results.push({
      id: c.id,
      sourceId: c.sourceId,
      merchant: c.merchant,
      layout: c.layout,
      requestedAt,
      error,
      raw,
      validated,
      candidate,
      gold: {
        classification: c.expectedClassification,
        facts: c.expectedSupportedFacts,
        unknown: c.expectedUnknownFacts,
      },
      currentParser: c.currentParser,
      score,
    });
    // Persist completed calls immediately so an interrupted run is never mistaken for an absent run.
    await writeFile(
      path.join(runDirectory, "results.json"),
      JSON.stringify(results, null, 2) + "\n",
    );
  }
  const summary = summarizeBenchmark(results.map((r) => r.score));
  const failures = results.filter(
    (r) =>
      r.error ||
      !r.score.classificationCorrect ||
      r.validated.issues.length ||
      Object.values(r.score.fields).some(
        (f) =>
          f.missed_supported_fact ||
          f.incorrect_value ||
          f.unsupported_invented_fact ||
          f.rawUnsupported,
      ),
  );
  const metadata = {
    runId,
    mode,
    startedAt,
    completedAt: new Date().toISOString(),
    provider: provider.metadata,
    settings:
      provider instanceof OpenAiPromotionNlpProvider
        ? provider.settings
        : { network: false },
    benchmarkSha256: sha256,
    promptVersion: PROMPT_VERSION,
    promptSha256: hashCapture(PROMOTION_NLP_PROMPT),
    schemaVersion: SCHEMA_VERSION,
    schemaSha256: hashCapture(JSON.stringify(extractionJsonSchema())),
    selectedCaseIds: cases.map((c) => c.id),
    calls: cases.length,
    errors: results.filter((r) => r.error).length,
    summary,
    readiness: "benchmark_only_requires_live_review",
    reviewBasis: benchmark.reviewBasis,
  };
  for (const [file, contents] of Object.entries({
    "failures.json": JSON.stringify(failures, null, 2) + "\n",
    "run-metadata.json": JSON.stringify(metadata, null, 2) + "\n",
    "report.md": renderBenchmarkReport(summary, mode, metadata.errors),
  }))
    await writeFile(path.join(runDirectory, file), contents, { flag: "wx" });
  return { runDirectory, metadata };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const args = parseBenchmarkArgs(process.argv.slice(2));
    const result = await runPromotionNlpBenchmark({
      ...args,
      onCase: args.live
        ? (id) => process.stdout.write(`Evaluating ${id}\n`)
        : undefined,
    });
    console.log(
      JSON.stringify(
        {
          runDirectory: result.runDirectory,
          mode: result.metadata.mode,
          cases: result.metadata.summary.cases,
          errors: result.metadata.errors,
          provider: result.metadata.provider,
          classification: result.metadata.summary.classification,
          unsupported_fact_survived_validation:
            result.metadata.summary.unsupported_fact_survived_validation,
        },
        null,
        2,
      ),
    );
    if (result.metadata.errors) process.exitCode = 1;
  } catch (e) {
    console.error(
      e instanceof Error && /^[a-z_0-9:.-]+$/.test(e.message)
        ? e.message
        : "promotion_nlp_benchmark_failed",
    );
    process.exitCode = 1;
  }
}
