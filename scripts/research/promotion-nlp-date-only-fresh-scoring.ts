import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  dateOnlyOutputSchema,
  validateDateOnlyExtraction,
  type DateOnlyOutput,
} from "../../src/ingestion/promotion-nlp/date-only-profile";
import { assessDateOnlyCore } from "../../src/ingestion/promotion-nlp/date-only-evaluation";
import {
  sha,
  json,
  verifySealFresh,
  sampleSchema,
  type Sample,
  type ResponseRecord,
  type Attempt,
} from "./promotion-nlp-date-only-fresh-evaluation";
const roleNote = z.object({
  identity: z.string(),
  labels: z.array(z.string()),
  quote: z.string(),
});
export const noteSchema = z.object({
  id: z.string(),
  author: z.string(),
  kind: z.enum(["economic", "non_economic", "ambiguous"]),
  acceptableClassifications: z.array(z.string()),
  economicIdentityIds: z.array(z.string()),
  singleCampaignComparable: z.boolean(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  locationScope: z
    .enum(["all_outlets", "selected_outlets", "named_outlets"])
    .nullable(),
  participating: z.array(roleNote),
  excluded: z.array(roleNote),
  benefitAny: z.array(z.string()),
  merchantAny: z.array(z.string()),
  qualifiers: z.array(
    z.object({ anchor: z.string(), required: z.array(z.string()) }),
  ),
  review: z.string(),
});
export type Note = z.infer<typeof noteSchema>;
export type DateOutcome =
  "correct_known" | "correct_unknown" | "omitted" | "wrong" | "unavailable";
export function dateOutcome(
  actual: string | null | undefined,
  expected: string | null,
): DateOutcome {
  if (actual === undefined) return "unavailable";
  if (expected === null) return actual === null ? "correct_unknown" : "wrong";
  return actual === expected
    ? "correct_known"
    : actual === null
      ? "omitted"
      : "wrong";
}
export function roleScore(
  facts: DateOnlyOutput | null,
  note: Note,
  role: "participating" | "excluded",
) {
  const actual = [
    ...new Set(
      facts?.locationRules
        .filter((r) => r.role === role)
        .flatMap((r) => r.names) ?? [],
    ),
  ];
  const targets = note[role],
    other = note[role === "participating" ? "excluded" : "participating"];
  const correct = targets
    .filter((t) => actual.some((a) => t.labels.includes(a)))
    .map((t) => t.identity);
  const omitted = targets
    .filter((t) => !correct.includes(t.identity))
    .map((t) => t.identity);
  const wrong = actual.filter(
    (a) => !targets.some((t) => t.labels.includes(a)),
  );
  const reversals = wrong.filter((a) =>
    other.some((t) => t.labels.includes(a)),
  );
  return {
    expected: targets.length,
    emitted: actual.length,
    correct,
    omitted,
    wrong,
    reversals,
    unavailable: facts === null,
  };
}
const normalized = (s: string) => s.toLocaleLowerCase().replace(/[’‘]/g, "'");
export function scoreResponse(
  sample: Sample,
  note: Note,
  record: ResponseRecord | undefined,
  attempt?: Attempt,
) {
  let raw: unknown = null,
    parseFailure = false;
  if (record?.rawOutput !== null && record?.rawOutput !== undefined) {
    try {
      raw = JSON.parse(record.rawOutput);
    } catch {
      parseFailure = true;
    }
  }
  const schema = dateOnlyOutputSchema.safeParse(raw),
    facts = schema.success ? schema.data : null;
  const validation = validateDateOnlyExtraction(sample.evidence, raw);
  const refusal =
    parseFailure &&
    /\b(?:cannot comply|can't comply|unable to comply|cannot assist|refuse|refusal)\b/i.test(
      record?.rawOutput ?? "",
    );
  const classification = facts?.classification.value ?? null;
  const correctClassification =
    classification !== null &&
    note.acceptableClassifications.includes(classification);
  const recognized =
    note.kind === "economic" && classification === "economic_offer";
  const safeAbstention =
    classification !== null &&
    classification !== "economic_offer" &&
    validation.contractValid &&
    (note.kind === "non_economic" || note.kind === "ambiguous");
  const dates = {
    startDate: dateOutcome(facts?.startDate.value, note.startDate),
    endDate: dateOutcome(facts?.endDate.value, note.endDate),
  };
  const participating = roleScore(facts, note, "participating"),
    excluded = roleScore(facts, note, "excluded");
  const coreComparison = facts ? assessDateOnlyCore(facts, [note]) : null;
  const scope = facts?.locationScope.value;
  const scopeMatch =
    facts !== null &&
    (scope === note.locationScope ||
      (["named_outlets", "selected_outlets"].includes(scope ?? "") &&
        ["named_outlets", "selected_outlets"].includes(
          note.locationScope ?? "",
        )));
  const benefit = facts?.benefit.value ?? null;
  const merchantMatch =
    !!facts?.merchant.value &&
    note.merchantAny.some((token) =>
      normalized(facts.merchant.value!).includes(normalized(token)),
    );
  const identityMatch =
    recognized &&
    benefit !== null &&
    note.benefitAny.some((token) =>
      normalized(benefit).includes(normalized(token)),
    );
  const qualifierErrors = note.qualifiers.filter(
    (q) =>
      benefit !== null &&
      normalized(benefit).includes(normalized(q.anchor)) &&
      q.required.some(
        (token) => !normalized(benefit).includes(normalized(token)),
      ),
  );
  const blockers = [...validation.issues, ...validation.unresolved];
  const findings: string[] = [];
  if (record?.status !== "completed") findings.push("missing_or_failed_task");
  if (refusal) findings.push("explicit_text_refusal");
  if (parseFailure) findings.push("json_parse_failure");
  else if (!facts) findings.push("schema_failure");
  if (facts && !validation.contractValid) findings.push(...validation.issues);
  if (!correctClassification)
    findings.push(
      note.kind === "ambiguous"
        ? "unsafe_boundary_commitment"
        : "classification_mismatch",
    );
  if (note.kind === "economic" && !recognized)
    findings.push("economic_identity_omitted");
  if (recognized && !identityMatch) findings.push("benefit_identity_mismatch");
  if (recognized && facts?.merchant.value && !merchantMatch)
    findings.push("merchant_identity_mismatch");
  if (qualifierErrors.length) findings.push("benefit_qualifier_omitted");
  for (const [key, outcome] of Object.entries(dates))
    if (outcome === "wrong") findings.push(`wrong_campaign_${key}`);
    else if (outcome === "omitted" || outcome === "unavailable")
      blockers.push(`${outcome}_${key}`);
  for (const [role, result] of Object.entries({ participating, excluded })) {
    if (result.wrong.length) findings.push(`wrong_${role}_outlets`);
    if (result.reversals.length) findings.push("physical_role_reversal");
    if (result.omitted.length) blockers.push(`omitted_${role}_outlets`);
  }
  if (facts && !scopeMatch) {
    if (scope !== null) findings.push("wrong_physical_scope");
    else blockers.push("omitted_physical_scope");
  }
  if (!facts?.merchant.value) blockers.push("missing_merchant");
  if (recognized && facts?.merchant.value && !merchantMatch)
    blockers.push("merchant_identity_incomplete");
  if (!identityMatch && note.kind === "economic")
    blockers.push("economic_identity_incomplete");
  if (!correctClassification) blockers.push("classification_not_correct");
  if (qualifierErrors.length) blockers.push("benefit_qualifier_incomplete");
  if (!scopeMatch || participating.omitted.length || excluded.omitted.length)
    blockers.push("physical_annotation_incomplete");
  const storage = {
    description: sample.evidence.text.length,
    title: facts?.title.value?.length ?? null,
    merchant: facts?.merchant.value?.length ?? null,
    benefit: benefit?.length ?? null,
  };
  const storageBlockers = Object.entries(storage)
    .filter(
      ([key, n]) =>
        n !== null &&
        n >
          ({ description: 5000, title: 250, merchant: 150, benefit: 60 }[key] ??
            Infinity),
    )
    .map(([key]) => `${key}_exceeds_publication_limit`);
  blockers.push(...storageBlockers);
  const highRisk = findings.some((f) =>
    /^wrong_|unsafe_boundary|physical_role_reversal|benefit_qualifier|benefit_identity|merchant_identity|classification_mismatch/.test(
      f,
    ),
  );
  const dateWrongCount = Object.values(dates).filter(
    (s) => s === "wrong",
  ).length;
  const outletWrongCount = participating.wrong.length + excluded.wrong.length;
  const complete =
    note.kind === "economic" &&
    recognized &&
    identityMatch &&
    !!facts?.merchant.value &&
    validation.contractValid &&
    findings.length === 0 &&
    blockers.length === 0;
  const latency =
    record && attempt
      ? Date.parse(record.savedAt) - Date.parse(attempt.reservedAt)
      : null;
  return {
    id: sample.id,
    cohort: sample.cohort,
    classification,
    expectedKind: note.kind,
    completed: record?.status === "completed",
    refusal,
    parseFailure,
    schemaValid: facts !== null,
    validation: {
      contractValid: validation.contractValid,
      issues: validation.issues,
      unresolved: validation.unresolved,
    },
    correctClassification,
    recognized,
    identityMatch,
    merchantMatch,
    safeAbstention,
    dates,
    participating,
    excluded,
    scopeMatch,
    coreComparison,
    qualifierErrors,
    complete,
    storage,
    storageBlockers,
    description: sample.evidence.text,
    descriptionExact: sha(sample.evidence.text) === sample.sourceSha256,
    source: sample.evidence.text,
    rawOutput: record?.rawOutput ?? null,
    rawOutputSha256: record?.rawOutputSha256 ?? null,
    sourceSha256: sample.sourceSha256,
    note,
    findings: [...new Set(findings)],
    blockers: [...new Set(blockers)],
    highRisk,
    wrongDateFactsPassingValidator: validation.contractValid
      ? dateWrongCount
      : 0,
    wrongOutletFactsPassingValidator: validation.contractValid
      ? outletWrongCount
      : 0,
    wrongScopePassingValidator:
      validation.contractValid && scope !== null && !scopeMatch ? 1 : 0,
    elapsedMs: latency,
    latencyBasis:
      "reservation to first-answer persistence; includes transport/orchestration",
    usage: "unavailable",
  };
}
export type Scored = ReturnType<typeof scoreResponse>;
const rate = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  percent: denominator
    ? Number(((100 * numerator) / denominator).toFixed(2))
    : null,
});
export function aggregateFresh(records: Scored[]) {
  const count = (p: (r: Scored) => boolean) => records.filter(p).length,
    n = records.length;
  const economics = count((r) => r.expectedKind === "economic"),
    nonEconomics = count((r) => r.expectedKind === "non_economic"),
    abstainTargets = count((r) => r.expectedKind !== "economic");
  const dateCounts = Object.fromEntries(
    (
      [
        "correct_known",
        "correct_unknown",
        "omitted",
        "wrong",
        "unavailable",
      ] as DateOutcome[]
    ).map((s) => [
      s,
      rate(
        records.flatMap((r) => Object.values(r.dates)).filter((v) => v === s)
          .length,
        n * 2,
      ),
    ]),
  );
  const dateExpectedKnown = records.reduce(
    (a, r) =>
      a + Number(r.note.startDate !== null) + Number(r.note.endDate !== null),
    0,
  );
  const roles = Object.fromEntries(
    (["participating", "excluded"] as const).map((role) => {
      const sum = (f: (r: Scored[typeof role]) => number) =>
        records.reduce((n, r) => n + f(r[role]), 0);
      const expected = sum((r) => r.expected),
        emitted = sum((r) => r.emitted);
      return [
        role,
        {
          correct: rate(
            sum((r) => r.correct.length),
            expected,
          ),
          omitted: rate(
            sum((r) => r.omitted.length),
            expected,
          ),
          wrong: rate(
            sum((r) => r.wrong.length),
            emitted,
          ),
          reversals: sum((r) => r.reversals.length),
          unavailableSources: rate(
            count((r) => r[role].unavailable),
            n,
          ),
        },
      ];
    }),
  );
  const blockerCounts: Record<string, number> = {};
  for (const r of records)
    for (const f of r.blockers) blockerCounts[f] = (blockerCounts[f] ?? 0) + 1;
  const classificationMatrix: Record<string, Record<string, number>> = {};
  for (const r of records) {
    const row = (classificationMatrix[r.expectedKind] ??= {});
    const c = r.classification ?? "missing_or_malformed";
    row[c] = (row[c] ?? 0) + 1;
  }
  const elapsed = records
    .flatMap((r) => (r.elapsedMs === null ? [] : [r.elapsedMs]))
    .sort((a, b) => a - b);
  return {
    sources: n,
    execution: {
      completed: rate(
        count((r) => r.completed),
        n,
      ),
      missingOrFailed: rate(
        count((r) => !r.completed),
        n,
      ),
      explicitTextRefusals: rate(
        count((r) => r.refusal),
        n,
      ),
      parseFailure: rate(
        count((r) => r.parseFailure),
        n,
      ),
      schemaPass: rate(
        count((r) => r.schemaValid),
        n,
      ),
      contractPass: rate(
        count((r) => r.validation.contractValid),
        n,
      ),
      uncertain: rate(
        count((r) => r.classification === "uncertain"),
        n,
      ),
    },
    identity: {
      economicRecognition: rate(
        count((r) => r.recognized),
        economics,
      ),
      economicBenefitMatch: rate(
        count((r) => r.identityMatch),
        economics,
      ),
      falseEconomicOnDefiniteNonoffer: rate(
        count(
          (r) =>
            r.expectedKind === "non_economic" &&
            r.classification === "economic_offer",
        ),
        nonEconomics,
      ),
      safeAbstention: rate(
        count((r) => r.safeAbstention),
        abstainTargets,
      ),
      allSourceClassificationCorrect: rate(
        count((r) => r.correctClassification),
        n,
      ),
      classificationMatrix,
    },
    dates: {
      allEndpointOutcomes: dateCounts,
      knownCorrect: rate(
        records
          .flatMap((r) => Object.values(r.dates))
          .filter((s) => s === "correct_known").length,
        dateExpectedKnown,
      ),
      knownOmitted: rate(
        records
          .flatMap((r) => Object.values(r.dates))
          .filter((s) => s === "omitted").length,
        dateExpectedKnown,
      ),
      unknownCorrect: rate(
        records
          .flatMap((r) => Object.values(r.dates))
          .filter((s) => s === "correct_unknown").length,
        n * 2 - dateExpectedKnown,
      ),
    },
    locations: {
      roles,
      scopeMatch: rate(
        count((r) => r.scopeMatch),
        n,
      ),
    },
    validatorLeakage: {
      wrongDateFacts: records.reduce(
        (n, r) => n + r.wrongDateFactsPassingValidator,
        0,
      ),
      wrongOutletFacts: records.reduce(
        (n, r) => n + r.wrongOutletFactsPassingValidator,
        0,
      ),
      wrongScopeFacts: records.reduce(
        (n, r) => n + r.wrongScopePassingValidator,
        0,
      ),
    },
    coreCompleteAllSources: rate(
      count((r) => r.complete),
      n,
    ),
    coreCompleteEconomicSources: rate(
      count((r) => r.complete),
      economics,
    ),
    blockerCounts,
    descriptionCopiedExactlyByCode: rate(
      count((r) => r.descriptionExact),
      n,
    ),
    storage: {
      limits: { description: 5000, title: 250, merchant: 150, benefit: 60 },
      blockedSources: rate(
        count((r) => r.storageBlockers.length > 0),
        n,
      ),
    },
    latency: {
      available: elapsed.length,
      denominator: n,
      minimumMs: elapsed[0] ?? null,
      medianMs: elapsed.length ? elapsed[Math.floor(elapsed.length / 2)] : null,
      maximumMs: elapsed.at(-1) ?? null,
      basis: "reservation to saved first response; includes orchestration",
    },
    usage: "unavailable",
  };
}
export async function scoreFresh(dir: string, root = process.cwd()) {
  const seal = await verifySealFresh(dir, root);
  // Annotation loading/scoring occurs only after immutable raw boundary verification.
  const samples = z
    .array(sampleSchema)
    .parse(JSON.parse(await readFile(path.join(dir, "samples.json"), "utf8")));
  const notes = z
    .array(noteSchema)
    .parse(
      JSON.parse(
        await readFile(path.join(dir, "evaluation-notes.json"), "utf8"),
      ),
    );
  const records = await Promise.all(
    samples.map(async (sample) => {
      const r = JSON.parse(
        await readFile(
          path.join(dir, "responses", `${sha(sample.id)}.json`),
          "utf8",
        ),
      );
      let a: Attempt | undefined;
      try {
        a = JSON.parse(
          await readFile(
            path.join(dir, "attempts", `${sha(sample.id)}.json`),
            "utf8",
          ),
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      return scoreResponse(
        sample,
        notes.find((n) => n.id === sample.id)!,
        r,
        a,
      );
    }),
  );
  const cohorts = {
    regression: aggregateFresh(
      records.filter((r) => r.cohort === "regression"),
    ),
    holdout: aggregateFresh(records.filter((r) => r.cohort === "holdout")),
  };
  const historical = JSON.parse(
    await readFile(
      path.join(
        root,
        "docs/changes/promotion-nlp-date-only-profile/replay.json",
      ),
      "utf8",
    ),
  );
  const pairs = records.flatMap((r) =>
    !r.note.singleCampaignComparable
      ? []
      : historical.records
          .filter(
            (old: {
              caseId: string;
              candidate: { description: string } | null;
              historicalIdentityIds: string[];
            }) =>
              old.caseId === r.id &&
              old.candidate?.description === r.source &&
              old.historicalIdentityIds.length === 1 &&
              r.note.economicIdentityIds.includes(old.historicalIdentityIds[0]),
          )
          .map(
            (old: {
              taskId: string;
              contractValid: boolean;
              dateAnnotationMatch: boolean | null;
              participationAnnotationMatch: boolean | null;
            }) => ({
              sourceId: r.id,
              historicalTaskId: old.taskId,
              historicalContractValid: old.contractValid,
              newContractValid: r.validation.contractValid,
              historicalDateMatch: old.dateAnnotationMatch,
              newDateMatch: r.coreComparison?.dateAnnotationMatch ?? null,
              historicalParticipationMatch: old.participationAnnotationMatch,
              newParticipationMatch:
                r.coreComparison?.participationAnnotationMatch ?? null,
            }),
          ),
  );
  const holdoutMerchants = new Set(
    samples
      .filter((s) => s.cohort === "holdout")
      .filter((s) => s.merchantGroup !== "Multiple merchants (roundup)")
      .map((s) => s.merchantGroup),
  ).size;
  const h = cohorts.holdout;
  const recommendTrial =
    h.sources === 20 &&
    holdoutMerchants >= 5 &&
    (h.execution.contractPass.percent ?? 0) >= 90 &&
    (h.identity.economicRecognition.percent ?? 0) >= 80 &&
    h.identity.falseEconomicOnDefiniteNonoffer.numerator === 0 &&
    h.validatorLeakage.wrongDateFacts === 0 &&
    h.validatorLeakage.wrongOutletFacts === 0 &&
    h.validatorLeakage.wrongScopeFacts === 0;
  return {
    kind: "fresh-gpt-6-luna-requested-full-source-single-answer-experiment",
    rawSealSha256: sha(await readFile(path.join(dir, "raw-seal.json"))),
    concurrency: seal.concurrency,
    cohorts,
    holdoutMerchants,
    decision: {
      researchOnly: true,
      recommendLimitedHumanReviewedTrial: recommendTrial,
      rule: "predeclared spec.md; all facts need human review; no production authority",
    },
    historical: {
      referenceOnly: true,
      oldUnits: 34,
      oldDateOnlyContractPass: 28,
      pairs,
      limitations:
        "V4 routed/local-evidence outputs versus new whole-source answers. Paired only for exact source and one economic campaign; not causal model comparison. 28/34 cannot be compared with whole-source rates.",
    },
    limitations: [
      "Regression sources participated in prompt design; not unseen.",
      "Holdouts selected by parent agent from retained export, not fresh collection; source family differs from website/social regression. Merchant group count includes roundup label; not a generalization claim.",
      "Evaluation notes are agent-authored before model calls, not human ground truth.",
      "One answer per source; repeated-sample stability unmeasured.",
      "Model/reasoning/context parameters are requested. Tool confirms agent IDs only; backend identity and usage unavailable.",
      "Tool abstention is prompt-enforced, not mechanically denied.",
      "Description preservation is deterministic copying, not LLM accuracy.",
      "Unknown matches are semantically valid but incomplete.",
      "Core completeness supplies no official directory, coordinates, source authority or map-publication proof.",
      "Elapsed time includes orchestration; no isolated provider-inference latency available.",
    ],
    records,
  };
}
export function renderFresh(r: Awaited<ReturnType<typeof scoreFresh>>) {
  const lines = [
    "# Fresh date-first extraction experiment",
    "",
    "Requested model: gpt-6-luna; reasoning: medium; fork_context=false; maximum four open agents. Backend identity and token usage unavailable. One fresh first answer per whole source; no retries or repairs.",
    "",
    "## Separate cohort metrics",
    "",
  ];
  for (const [name, c] of Object.entries(r.cohorts))
    lines.push(`### ${name}`, "", "```json", json(c).trimEnd(), "```", "");
  lines.push(
    "## Decision",
    "",
    r.decision.recommendLimitedHumanReviewedTrial
      ? "The predeclared rule permits recommending a limited candidate-organization trial with human review of every fact. Research-only; no automatic publication."
      : "The predeclared rule fails. Keep research-only; correct contract/evaluation gaps before recommending a candidate-organization trial.",
    "",
    "## Historical comparison",
    "",
    r.historical.limitations,
    `Comparable pairs: ${r.historical.pairs.length}; full pair ledger is in results.json. Old 28/34 is historical reference only.`,
    "",
    "## High-risk per-source evidence",
    "",
  );
  for (const record of r.records.filter((x) => x.highRisk))
    lines.push(
      `### ${record.id}`,
      "",
      `Findings: ${record.findings.join(", ")}.`,
      "",
      `Frozen source-review basis: ${record.note.review}`,
      "",
      "Complete original source:",
      "",
      "```text",
      record.source,
      "```",
      "",
      "First raw model answer:",
      "",
      "```text",
      record.rawOutput ?? "[no response]",
      "```",
      "",
      "Validator result:",
      "",
      "```json",
      json(record.validation).trimEnd(),
      "```",
      "",
      "Independent pre-frozen expected facts:",
      "",
      "```json",
      json(record.note).trimEnd(),
      "```",
      "",
    );
  lines.push("## Limitations", "", ...r.limitations.map((s) => `- ${s}`), "");
  return lines.join("\n");
}
