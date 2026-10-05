import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { benchmarkSchemaV4 } from "../../src/ingestion/promotion-nlp/benchmark-v4";
import {
  evidenceSchemaV4,
  propositionSchemaV4,
} from "../../src/ingestion/promotion-nlp/schema-v4";
import {
  DATE_ONLY_PROFILE_VERSION,
  DATE_ONLY_PROMPT,
  dateOnlyJsonSchema,
  dateOnlyPromptInput,
  projectV4ToDateOnly,
  validateDateOnlyExtraction,
} from "../../src/ingestion/promotion-nlp/date-only-profile";
import { assessDateOnlyCore } from "../../src/ingestion/promotion-nlp/date-only-evaluation";
import { promotionTextEvidenceSchema } from "../../src/ingestion/promotion-nlp/schema";
import {
  verifyFrozenV4,
  verifyStageSealV4,
} from "./promotion-nlp-subagent-v4-evaluation";

export const DATE_ONLY_V4_RUN =
  ".local/promotion-nlp-subagent-v4/2026-10-03T12-27-12-562Z-9462a1b1-79e5-4fd4-8667-3d2de72e16d1";
export const DATE_ONLY_REPORT_DIR =
  "docs/changes/promotion-nlp-date-only-profile";
const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const recordSchema = z.object({
  taskId: z.string(),
  inputSha256: z.string(),
  rawOutput: z.string(),
  rawOutputSha256: z.string(),
});
const taskSchema = z.object({
  taskId: z.string(),
  caseId: z.string(),
  propositionId: z.string(),
  inputSha256: z.string(),
  input: z.object({
    evidence: z.array(evidenceSchemaV4),
    proposition: propositionSchemaV4,
  }),
});
const reviewSchema = z.object({
  cases: z.array(
    z.object({
      caseId: z.string(),
      reviewedIdentityMap: z.record(z.string(), z.array(z.string())),
      normalizationAndEveryConstraint: z.array(
        z.object({ taskId: z.string(), accepted: z.boolean() }),
      ),
    }),
  ),
});
const sourceReferenceSchema = z.object({
  file: z.string(),
  sha256: z.string(),
  url: z.string(),
  selectors: z.array(z.string()),
});

export async function replayDateOnlyV4(root = process.cwd()) {
  const run = path.join(root, DATE_ONLY_V4_RUN);
  await verifyFrozenV4(run, root);
  await verifyStageSealV4(run, 5);
  const benchmarkFile = path.join(
    root,
    "tests/fixtures/promotion-nlp/benchmark-v4.json",
  );
  const reviewFile = path.join(
    root,
    "docs/changes/promotion-nlp-atomic-evidence-graph-v4/source-review.json",
  );
  const benchmarkBytes = await readFile(benchmarkFile);
  const reviewBytes = await readFile(reviewFile);
  const benchmark = benchmarkSchemaV4.parse(
    JSON.parse(benchmarkBytes.toString()),
  );
  const reviews = reviewSchema.parse(JSON.parse(reviewBytes.toString()));
  const tasks = z
    .object({ tasks: z.array(taskSchema) })
    .parse(
      JSON.parse(await readFile(path.join(run, "stage5-tasks.json"), "utf8")),
    ).tasks;
  const rows = z
    .array(recordSchema)
    .parse(
      JSON.parse(
        await readFile(path.join(run, "stage5-raw-results.json"), "utf8"),
      ),
    );
  const preparedInputs = [];
  const inputs = new Map<string, z.infer<typeof promotionTextEvidenceSchema>>();
  for (const c of benchmark.cases) {
    const reference = sourceReferenceSchema.parse(c.sourceReference);
    if (
      digest(await readFile(path.join(root, reference.file))) !==
      reference.sha256
    )
      throw new Error(`source_capture_hash_mismatch:${c.id}`);
    const input = promotionTextEvidenceSchema.parse({
      sourceId: c.id.split("-")[0],
      canonicalUrl: reference.url,
      nativeId: c.id,
      evidenceId: reference.sha256,
      selector: reference.selectors.join("; "),
      merchantHint: c.merchantHint,
      titleHint: c.titleHint,
      text: c.sourceText,
    });
    inputs.set(c.id, input);
    preparedInputs.push({
      caseId: c.id,
      sourceTextSha256: digest(input.text),
      input: dateOnlyPromptInput(input),
    });
  }
  const records = rows.map((r) => {
    if (digest(r.rawOutput) !== r.rawOutputSha256)
      throw new Error(`raw_output_hash_mismatch:${r.taskId}`);
    const task = tasks.find((t) => t.taskId === r.taskId);
    if (!task || task.inputSha256 !== r.inputSha256)
      throw new Error(`task_input_hash_mismatch:${r.taskId}`);
    const c = benchmark.cases.find((c) => c.id === task.caseId)!;
    const review = reviews.cases.find((c) => c.caseId === task.caseId)!;
    const old = review.normalizationAndEveryConstraint.find(
      (unit) => unit.taskId === r.taskId,
    );
    if (!old) throw new Error(`original_review_missing:${r.taskId}`);
    const projected = projectV4ToDateOnly(
      JSON.parse(r.rawOutput),
      task.input.evidence,
      task.input.proposition.anchorEvidenceIds,
    );
    const validation = validateDateOnlyExtraction(
      inputs.get(task.caseId)!,
      projected,
    );
    const goldIds = review.reviewedIdentityMap[task.propositionId] ?? [];
    const semantic = assessDateOnlyCore(
      projected,
      goldIds.map((id) => c.expected[id]),
    );
    return {
      caseId: c.id,
      taskId: r.taskId,
      originalAccepted: old.accepted,
      contractValid: validation.contractValid,
      issues: validation.issues,
      unresolved: validation.unresolved,
      sourceDescriptionExact:
        validation.candidate?.description === c.sourceText,
      historicalIdentityIds: goldIds,
      ...semantic,
      candidate: validation.candidate,
      rawOutputSha256: r.rawOutputSha256,
    };
  });
  const count = (predicate: (r: (typeof records)[number]) => boolean) =>
    records.filter(predicate).length;
  const rate = (numerator: number, denominator = records.length) => ({
    numerator,
    denominator,
    percent: denominator
      ? Number(((100 * numerator) / denominator).toFixed(2))
      : null,
  });
  const blockerCounts: Record<string, number> = {};
  for (const r of records)
    for (const code of [...r.issues, ...r.unresolved, ...r.findings])
      blockerCounts[code] = (blockerCounts[code] ?? 0) + 1;
  const report = {
    kind: "retrospective-v4-product-contract-replay-not-new-model-evaluation",
    profile: DATE_ONLY_PROFILE_VERSION,
    inputs: {
      benchmarkSha256: digest(benchmarkBytes),
      sourceReviewSha256: digest(reviewBytes),
      stage5SealSha256: digest(
        await readFile(path.join(run, "stage5-raw-seal.json")),
      ),
      sourceEnvelopes: benchmark.cases.length,
      historicalEconomicIdentities: benchmark.cases.reduce(
        (n, c) =>
          n +
          c.propositions.filter((p) => p.taxonomy === "economic_offer").length,
        0,
      ),
      rawNormalizationUnits: records.length,
      sourcesWithNormalizationOutputs: new Set(records.map((r) => r.caseId))
        .size,
    },
    metrics: {
      originalContractPass: rate(count((r) => r.originalAccepted)),
      dateOnlyContractPass: rate(count((r) => r.contractValid)),
      newlyContractCompatible: records
        .filter((r) => !r.originalAccepted && r.contractValid)
        .map((r) => r.taskId),
      sourceDescriptionPreserved: rate(count((r) => r.sourceDescriptionExact)),
      dateAnnotationMatches: rate(
        count((r) => r.dateAnnotationMatch === true),
        count((r) => r.dateAnnotationMatch !== null),
      ),
      participationAnnotationMatches: rate(
        count((r) => r.participationAnnotationMatch === true),
        count((r) => r.participationAnnotationMatch !== null),
      ),
      contractAndAnnotatedCoreMatch: count(
        (r) =>
          r.contractValid &&
          r.dateAnnotationMatch === true &&
          r.participationAnnotationMatch === true,
      ),
      retainedCoreCompleteForFurtherReview: count(
        (r) =>
          r.contractValid &&
          !r.unresolved.length &&
          r.dateAnnotationMatch === true &&
          r.participationAnnotationMatch === true,
      ),
      blockerCounts,
      newPromptModelSuccessRate: null,
      endToEndAutomaticMapRate: null,
    },
    limitations: [
      "No fresh model call: archived answers were produced with the old V4 prompt and routing.",
      "Only available downstream answers are revalidated; upstream lost identities are not recovered.",
      "Original full source Description is copied by code; that preservation rate is not an LLM accuracy score.",
      "Null dates can match unknown gold while still blocking campaign validity.",
      "Physical annotation matches do not verify authoritative directories, coordinates or source policy.",
      "No application database, map, source activation or recurring process was changed.",
    ],
    records,
  };
  return {
    report,
    prepared: {
      kind: "unexecuted-full-source-date-only-model-inputs",
      profile: DATE_ONLY_PROFILE_VERSION,
      prompt: DATE_ONLY_PROMPT,
      schema: dateOnlyJsonSchema(),
      cases: preparedInputs,
    },
  };
}

export function dateOnlyReplayMarkdown(
  report: Awaited<ReturnType<typeof replayDateOnlyV4>>["report"],
) {
  const m = report.metrics;
  const lines = [
    "# Date-only retrospective replay",
    "",
    "This replays sealed V4 model answers under a new user-requested product contract. It is not a new model experiment or automatic publication rate.",
    "",
    `Inputs: ${report.inputs.sourceEnvelopes} source envelopes, ${report.inputs.historicalEconomicIdentities} historical economic identities, ${report.inputs.rawNormalizationUnits} available normalization replies from ${report.inputs.sourcesWithNormalizationOutputs} sources.`,
    "",
    "| Metric | Result |",
    "| --- | --- |",
    `| Original V4 contract passes | ${m.originalContractPass.numerator}/${m.originalContractPass.denominator} (${m.originalContractPass.percent}%) |`,
    `| Date-only contract passes | ${m.dateOnlyContractPass.numerator}/${m.dateOnlyContractPass.denominator} (${m.dateOnlyContractPass.percent}%) |`,
    `| Complete source Description preserved by code | ${m.sourceDescriptionPreserved.numerator}/${m.sourceDescriptionPreserved.denominator} |`,
    `| Campaign-date annotation matches, including correctly unknown dates | ${m.dateAnnotationMatches.numerator}/${m.dateAnnotationMatches.denominator} |`,
    `| Physical-participation annotation matches, including unknown scope | ${m.participationAnnotationMatches.numerator}/${m.participationAnnotationMatches.denominator} |`,
    `| Contract + both annotated core checks | ${m.contractAndAnnotatedCoreMatch} units |`,
    `| Complete retained core fields for further review | ${m.retainedCoreCompleteForFurtherReview} units; still no directory/coordinate/publication proof |`,
    "| New prompt success / end-to-end automatic map rate | Unmeasured |",
    "",
    "## Newly compatible historical replies",
    "",
    ...m.newlyContractCompatible.map((id) => `- ${id}`),
    "",
    "## Remaining issues and missing fields",
    "",
    ...Object.entries(m.blockerCounts).map(([code, n]) => `- ${code}: ${n}`),
    "",
    "## Named failure examples",
    "",
  ];
  for (const r of report.records.filter((r) =>
    /captain-kim-delivery|promotions-2::p1|weekday_dinner_early_bird|weekend_lunch_dinner_early_bird/.test(
      r.taskId,
    ),
  ))
    lines.push(
      `### ${r.taskId}`,
      "",
      `Original accepted=${r.originalAccepted}; date-only contract=${r.contractValid}; dates match=${r.dateAnnotationMatch}; participation match=${r.participationAnnotationMatch}.`,
      "",
      `Issues: ${r.issues.join(", ") || "none"}. Missing fields: ${r.unresolved.join(", ") || "none"}.`,
      "",
      "Complete Description:",
      "",
      "```text",
      r.candidate?.description ?? "no candidate",
      "```",
      "",
    );
  lines.push("## Limits", "", ...report.limitations.map((s) => `- ${s}`), "");
  return lines.join("\n");
}

export async function runDateOnlyReplay(root = process.cwd()) {
  const { report, prepared } = await replayDateOnlyV4(root);
  const directory = path.join(root, DATE_ONLY_REPORT_DIR);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "replay.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(
    path.join(directory, "replay.md"),
    dateOnlyReplayMarkdown(report),
  );
  await writeFile(
    path.join(directory, "prepared-inputs.json"),
    JSON.stringify(prepared, null, 2) + "\n",
  );
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.length > 2)
    throw new Error("date_only_replay_takes_no_arguments");
  const report = await runDateOnlyReplay();
  console.log(
    JSON.stringify({ inputs: report.inputs, metrics: report.metrics }, null, 2),
  );
}
