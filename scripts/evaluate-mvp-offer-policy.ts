import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";
import type {
  DatePolicyResult,
  ScheduleParseResult,
  ScheduleRule,
} from "../src/domain/mvp-policy";
import type { MvpPromotion } from "../src/domain/mvp";
import { normalizeMvpDates } from "../src/ingestion/mvp/date-policy";
import { parseMvpSchedule } from "../src/ingestion/mvp/schedule";

const evaluationDirectory = "docs/changes/mvp-offer-lifecycle/evaluation";
const sourcePath = "exports/review-inbox-2026-09-16/review-inbox.json";
const legacyPath = "data/mvp-promotions.json";
export const defaultPreviewPath =
  ".local/mvp-policy-preview/mvp-promotions.json";
const mandatoryPath =
  "tests/fixtures/mvp-offer-lifecycle/mandatory-safety-cases.json";
const holdoutCasePath =
  "tests/fixtures/mvp-offer-lifecycle/holdout-safe-expectations.json";

type Original = {
  postId: string;
  url: string;
  channel: string;
  publishedAt: string;
  originalText: string;
  contentHash: string;
};
type Inbox = { items: Array<{ candidateId: string; source: Original }> };
type HoldoutSource = {
  sourcePostId: string;
  url: string;
  cohort: string;
  candidateIds: string[];
  rawText: string;
  rawTextSha256: string;
  publishedAt: string;
};
type FrozenCase = {
  caseId: string;
  source: { url: string; sourcePostId: string; rawTextSha256: string };
  evidence: { quote: string; startUtf16: number; endUtf16: number };
  expectation: { label: string; expected: string };
};
export type Finding = { code: string; detail: string };
type Artifact = { evaluatedAt: string; records: MvpPromotion[] };
const sha256 = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const singaporeDay = (instant: string) =>
  DateTime.fromISO(instant, { setZone: true })
    .setZone("Asia/Singapore")
    .toISODate();

/** Checks source grouping against the export, rather than trusting manifest counts. */
export function groupingFindings(
  inbox: Inbox,
  manifest: { sources: HoldoutSource[] },
): Finding[] {
  const findings: Finding[] = [];
  const byId = new Map<string, Original>();
  for (const { source } of inbox.items) {
    const previous = byId.get(source.postId);
    if (previous && !same(previous, source))
      findings.push({
        code: "conflicting_source_children",
        detail: source.postId,
      });
    byId.set(source.postId, source);
  }
  if (
    byId.size !== manifest.sources.length ||
    new Set(manifest.sources.map((s) => s.sourcePostId)).size !== byId.size
  )
    findings.push({
      code: "source_group_count_mismatch",
      detail: `${byId.size} originals / ${manifest.sources.length} groups`,
    });
  const allChildren: string[] = [];
  for (const group of manifest.sources) {
    const original = byId.get(group.sourcePostId);
    const children = inbox.items
      .filter((i) => i.source.postId === group.sourcePostId)
      .map((i) => i.candidateId)
      .sort();
    allChildren.push(...group.candidateIds);
    if (!same(children, [...group.candidateIds].sort()))
      findings.push({
        code: "child_group_mismatch",
        detail: group.sourcePostId,
      });
    if (
      !original ||
      original.originalText !== group.rawText ||
      sha256(group.rawText) !== group.rawTextSha256 ||
      original.url !== group.url ||
      original.publishedAt !== group.publishedAt
    )
      findings.push({
        code: "original_provenance_mismatch",
        detail: group.sourcePostId,
      });
  }
  if (
    allChildren.length !== inbox.items.length ||
    new Set(allChildren).size !== inbox.items.length
  )
    findings.push({
      code: "duplicated_or_missing_child",
      detail: `${allChildren.length} assigned children / ${inbox.items.length} export records`,
    });
  return findings;
}

function clock(hour: number, minute: number, meridiem?: string): string | null {
  if (meridiem && (hour < 1 || hour > 12)) return null;
  if (meridiem) hour = (hour % 12) + (meridiem.toLowerCase() === "pm" ? 12 : 0);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : null;
}

/** Evidence whitelist: explicit clocks and a range's stated shared meridiem only. */
function supportedClocks(quote: string): Set<string> {
  const result = new Set<string>();
  for (const m of quote.matchAll(/\b(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\b/gi)) {
    const c = clock(Number(m[1]), Number(m[2] ?? 0), m[3]);
    if (c) result.add(c);
  }
  for (const m of quote.matchAll(
    /\b(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\b/gi,
  )) {
    if (!m[3] && !m[6] && !m[2] && !m[5]) continue;
    const a = clock(Number(m[1]), Number(m[2] ?? 0), m[3] ?? m[6]);
    const b = clock(Number(m[4]), Number(m[5] ?? 0), m[6] ?? m[3]);
    if (a) result.add(a);
    if (b) result.add(b);
  }
  return result;
}

/** Mechanical evidence gates are narrower than semantic correctness adjudication. */
export function auditScheduleEvidence(
  text: string,
  rules: ScheduleRule[],
): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    const e = rule.evidence;
    if (text.slice(e.start, e.end) !== e.quote)
      findings.push({
        code: "schedule_evidence_offset_mismatch",
        detail: e.quote,
      });
    const supported = supportedClocks(e.quote);
    for (const value of [rule.start, rule.end])
      if (value !== null && !supported.has(value))
        findings.push({
          code: "unsupported_clock_endpoint",
          detail: `${value} is not supported by ${JSON.stringify(e.quote)}`,
        });
    if (
      rule.timeKind === "range" &&
      rule.start !== null &&
      rule.start === rule.end &&
      !/\d\s*(?:am|pm)?\s*[-–—]\s*\d/i.test(e.quote)
    )
      findings.push({ code: "point_to_range_synthesis", detail: e.quote });
    if (rule.timeKind === "opening_to" && rule.start !== null)
      findings.push({ code: "invented_opening_start", detail: e.quote });
    if (["after", "point"].includes(rule.timeKind) && rule.end !== null)
      findings.push({ code: "unsupported_upper_clock_bound", detail: e.quote });
  }
  return findings;
}

export function auditDateEvidence(
  text: string,
  dates: DatePolicyResult,
): Finding[] {
  const findings: Finding[] = [];
  for (const fragment of dates.audit.fragments) {
    if (text.slice(fragment.start, fragment.end) !== fragment.quote)
      findings.push({
        code: "date_evidence_offset_mismatch",
        detail: fragment.quote,
      });
    const lo = text.lastIndexOf("\n", fragment.start - 1) + 1;
    const hi = text.indexOf("\n", fragment.end);
    const line = text.slice(lo, hi < 0 ? text.length : hi);
    // These two unambiguous line forms independently check roles, not parser coverage.
    if (
      /^[\s📆📅🗓]*Now\s*(?:[-–—]|till|until)\s+\d{1,2}\s+[A-Za-z]{3,9}(?:\s+20\d{2})?\s*$/u.test(
        line,
      ) &&
      fragment.role !== "end"
    )
      findings.push({
        code: "now_to_end_role_reversal",
        detail: `${JSON.stringify(line)} assigned ${fragment.role}`,
      });
    if (
      /^[\s📆📅🗓]*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+20\d{2})?\s*$/iu.test(
        line,
      ) &&
      fragment.role !== "single"
    )
      findings.push({
        code: "calendar_single_date_role_reversal",
        detail: `${JSON.stringify(line)} assigned ${fragment.role}`,
      });
  }
  if (
    dates.validityType !== null &&
    dates.audit.fragments.filter((f) => f.role === "single").length > 1
  )
    findings.push({
      code: "multiple_single_date_scope_collapsed",
      detail:
        "Complete source has several single-date groups but scalar date output selects one instead of abstaining.",
    });
  for (const value of [dates.startDate, dates.endDate])
    if (value && !DateTime.fromISO(value).isValid)
      findings.push({ code: "invalid_date_endpoint", detail: value });
  if (
    dates.audit.blockers.length &&
    (dates.startDate !== null || dates.endDate !== null)
  )
    findings.push({
      code: "date_endpoint_despite_blocker",
      detail: dates.audit.blockers.join(", "),
    });
  if (
    !dates.audit.fragments.length &&
    (dates.endDate !== null ||
      (dates.startDate !== null && dates.startDate !== dates.audit.anchorDate))
  )
    findings.push({
      code: "date_endpoint_without_literal_or_anchor",
      detail: `${dates.startDate} / ${dates.endDate}`,
    });
  return findings;
}

type CaseCheck = { fact: string; passed: boolean; actual: unknown };
function caseChecks(
  id: string,
  dates: DatePolicyResult,
  schedule: ScheduleParseResult,
  replay: DatePolicyResult,
  children: MvpPromotion[],
): CaseCheck[] {
  const checks: CaseCheck[] = [];
  const check = (fact: string, passed: boolean, actual: unknown) =>
    checks.push({ fact, passed, actual });
  const days = (expected: number[]) =>
    schedule.rules.some((r) => same(r.weekdays, expected));
  const range = (start: string, end: string, expectedDays?: number[]) =>
    schedule.rules.some(
      (r) =>
        r.timeKind === "range" &&
        r.start === start &&
        r.end === end &&
        (!expectedDays || same(r.weekdays, expectedDays)),
    );
  switch (id) {
    case "missing-year-roll-forward":
      check(
        "Oct 31 is an end with year derived from trusted publication anchor",
        dates.endDate === "2026-10-31" &&
          dates.startDate === dates.audit.anchorDate &&
          dates.audit.fragments.some(
            (f) => f.role === "end" && f.missingUnits.includes("year"),
          ),
        dates,
      );
      check(
        "Rebuild first-seen cannot override a trusted publishedAt",
        same(dates, replay),
        replay,
      );
      break;
    case "weekday-open-ended":
      check(
        "Friday recurrence; no invented end date",
        days([5]) &&
          dates.validityType === "open_ended" &&
          dates.endDate === null,
        { dates, rules: schedule.rules },
      );
      break;
    case "month-crossing-dated-window":
      check(
        "Oct 31 end and Saturday association retained",
        dates.endDate === "2026-10-31" && days([6]),
        { dates, rules: schedule.rules },
      );
      break;
    case "weekday-and-clock-plus-holiday-exclusion":
      check(
        "Weekday 14:00–17:00 and PH exclusion belong to the same group",
        schedule.rules.some(
          (r) =>
            same(r.weekdays, [1, 2, 3, 4, 5]) &&
            r.start === "14:00" &&
            r.end === "17:00" &&
            r.exclusions.includes("public_holiday"),
        ),
        schedule.rules,
      );
      break;
    case "opening-to-null-start":
      check(
        "Opening-to 10:30 with unknown opening start",
        schedule.rules.some(
          (r) =>
            r.timeKind === "opening_to" &&
            r.start === null &&
            r.end === "10:30",
        ),
        schedule.rules,
      );
      break;
    case "distinct-day-outlet-groups":
      check(
        "Scalar raw-source normalizer abstains on multiple dated outlet groups",
        dates.validityType === null &&
          dates.startDate === null &&
          dates.endDate === null,
        dates,
      );
      check(
        "Child artifact retains separate Sep 2/Sep 3 outlet selections",
        children.length === 2 &&
          children.some(
            (c) =>
              c.startDate === "2026-09-02" &&
              c.offerPolicy?.selectedLocations.some((n) =>
                /Jurong Point/.test(n),
              ) &&
              !c.offerPolicy?.selectedLocations.some((n) =>
                /Bugis|Changi/.test(n),
              ),
          ) &&
          children.some(
            (c) =>
              c.startDate === "2026-09-03" &&
              c.offerPolicy?.selectedLocations.some((n) => /Bugis/.test(n)) &&
              !c.offerPolicy?.selectedLocations.some((n) =>
                /Jurong|Parkway/.test(n),
              ),
          ),
        children.map((c) => ({
          id: c.id,
          startDate: c.startDate,
          selectedLocations: c.offerPolicy?.selectedLocations,
        })),
      );
      break;
    case "single-point-onwards":
      check(
        "12pm onwards is a lower bound without an upper endpoint",
        schedule.rules.some(
          (r) =>
            r.timeKind === "after" && r.start === "12:00" && r.end === null,
        ),
        schedule.rules,
      );
      break;
    case "limited-time-wording-is-not-a-date":
      check(
        "Dining duration does not create validity endpoints",
        dates.endDate === null &&
          !dates.audit.fragments.some((f) => /90|mins/.test(f.quote)),
        dates,
      );
      break;
    case "captain-kim-holiday-exclusion":
      check(
        "Both PH eve and PH remain exclusions",
        schedule.rules.some(
          (r) =>
            r.exclusions.includes("public_holiday_eve") &&
            r.exclusions.includes("public_holiday"),
        ),
        schedule.rules,
      );
      break;
    case "starbucks-explicit-clock-window":
      check(
        "Literal 14:00–20:00 retained without invented weekday or holiday claims",
        range("14:00", "20:00") &&
          schedule.rules.every(
            (r) => r.weekdays === null && r.exclusions.length === 0,
          ),
        schedule.rules,
      );
      break;
    case "mos-burger-recurring-weekdays":
      check(
        "Monday/Tuesday recurrence and unknown end retained",
        days([1, 2]) && dates.endDate === null,
        { dates, rules: schedule.rules },
      );
      break;
    case "coffeehouse-distinct-sunday-schedule":
      check(
        "Mon–Sat 10:00–18:00 and Sunday 10:00–16:00 remain separate",
        range("10:00", "18:00", [1, 2, 3, 4, 5, 6]) &&
          range("10:00", "16:00", [7]),
        schedule.rules,
      );
      break;
    default:
      throw new Error(`No scorer for frozen case ${id}`);
  }
  return checks;
}

function scheduleDisposition(schedule: ScheduleParseResult) {
  if (!schedule.rules.length) return "no_rules_found_not_correctness_credit";
  if (
    schedule.issues.length ||
    schedule.rules.some((r) => r.issues.length || r.timeKind === "unknown")
  )
    return "partial_fields_or_abstention";
  return "rules_without_reported_ambiguity_not_gold_verified";
}

function summarizeSources(
  sources: Array<{
    dates: DatePolicyResult;
    schedule: ScheduleParseResult;
    safetyFindings: Finding[];
  }>,
) {
  const n = sources.length;
  return {
    sourceDenominator: n,
    dateCoverage: {
      dated: sources.filter((s) => s.dates.validityType === "dated").length,
      openEnded: sources.filter((s) => s.dates.validityType === "open_ended")
        .length,
      abstainedOrUnknown: sources.filter((s) => s.dates.validityType === null)
        .length,
    },
    scheduleCoverage: Object.fromEntries(
      [
        "no_rules_found_not_correctness_credit",
        "partial_fields_or_abstention",
        "rules_without_reported_ambiguity_not_gold_verified",
      ].map((d) => [
        d,
        sources.filter((s) => scheduleDisposition(s.schedule) === d).length,
      ]),
    ),
    sourcesWithMechanicalSafetyFindings: sources.filter(
      (s) => s.safetyFindings.length,
    ).length,
    interpretation:
      "Counts describe parser output on complete original texts. No complete gold labels exist for all sources; no-rule absence earns no correctness credit.",
  };
}

function occurrences(text: string, quote: string) {
  const result: Array<{ start: number; end: number }> = [];
  if (!quote) return result;
  for (
    let start = text.indexOf(quote);
    start >= 0;
    start = text.indexOf(quote, start + 1)
  )
    result.push({ start, end: start + quote.length });
  return result;
}

export function evaluateMvpOfferPolicy(
  root = process.cwd(),
  previewPath = defaultPreviewPath,
) {
  const bytes = (path: string) => readFileSync(resolve(root, path));
  const read = <T>(path: string): T =>
    JSON.parse(bytes(path).toString("utf8")) as T;
  const inbox = read<Inbox>(sourcePath);
  const holdout = read<{
    baseline: { sha256: string };
    sources: HoldoutSource[];
  }>(`${evaluationDirectory}/source-holdout.json`);
  const family = read<{
    folds: Array<{ foldId: string; heldOutSources: string[] }>;
    sources: Array<{
      sourcePostId: string;
      merchantFamily: string;
      scheduleFamilies: string[];
    }>;
  }>(`${evaluationDirectory}/family-holdout.json`);
  const freeze = read<{ frozenArtifacts: Record<string, string> }>(
    `${evaluationDirectory}/freeze-receipt.json`,
  );
  const protectedBaseline = read<{ hashes: Record<string, string> }>(
    "docs/changes/mvp-offer-lifecycle/protected-baseline.json",
  );
  const protectedHashes = Object.entries(protectedBaseline.hashes).map(
    ([path, expected]) => {
      let actual: string | null = null;
      try {
        actual = sha256(bytes(path));
      } catch {
        /* Missing is a failed check, not a skipped file. */
      }
      return { path, expected, actual, passed: expected === actual };
    },
  );
  // This file's executable strict surface is protected; the plan explicitly
  // allows adding optional fields to the shared Listing type.
  const reviewed = read<{
    reviewedDiffs: {
      path: string;
      before: string;
      after: string;
      kind: string;
      strictSurfaceHash: string;
    }[];
  }>("docs/changes/mvp-offer-lifecycle/scoped-diff-review.json");
  const reviewedHashes = protectedHashes.filter((check) => {
    if (check.passed || check.path !== "src/domain/promotion.ts") return false;
    const review = reviewed.reviewedDiffs.find(
      (r) => r.path === check.path && r.kind === "mvp_optional_listing_type",
    );
    if (
      !review ||
      review.before !== check.expected ||
      review.after !== check.actual
    )
      return false;
    const text = readFileSync(check.path, "utf8").replace(
      /import type \{[^\n]+\} from "\.\/mvp-policy";\n/,
      "",
    );
    const lo = text.indexOf("export type Listing ="),
      hi = text.indexOf("export type SourceHealth =");
    return (
      lo > 0 &&
      hi > lo &&
      sha256(text.slice(0, lo) + text.slice(hi)) === review.strictSurfaceHash
    );
  });
  const freezeChecks = Object.entries({
    ...freeze.frozenArtifacts,
    [sourcePath]: holdout.baseline.sha256,
    [legacyPath]: protectedBaseline.hashes[legacyPath],
  }).map(([path, expected]) => ({
    path,
    expected,
    actual: sha256(bytes(path)),
    passed: expected === sha256(bytes(path)),
  }));
  const grouping = groupingFindings(inbox, holdout);
  const originalByUrl = new Map(
    inbox.items.map((i) => [i.source.url, i.source]),
  );
  const originalById = new Map(
    inbox.items.map((i) => [i.source.postId, i.source]),
  );
  const legacy = read<Artifact>(legacyPath);
  const preview = read<Artifact>(previewPath);
  // Additional captured official inputs are outside the frozen 136-source corpus.
  // Read stored candidates and hash their referenced captures; never invoke adapters.
  type OfficialEntry = {
    firstReceivedAt: string;
    candidate: {
      canonicalUrl: string;
      description: string | null;
      terms: string[];
      locationWording: string | null;
      publishedAt: string | null;
      facts: Record<string, { quote: string; selector?: string } | undefined>;
    };
  };
  const officialByKey = new Map<
    string,
    {
      entry: OfficialEntry;
      statePath: string;
      stateSha256: string;
      originalText: string;
      capture: {
        path: string;
        url: string;
        fetchedAt: string;
        expectedSha256: string;
        actualSha256: string;
        passed: boolean;
      } | null;
    }
  >();
  if (
    preview.records.some(
      (r) => r.offerPolicy?.sourceObservation?.sourceId === "pepper_lunch_sg",
    )
  ) {
    const statePath =
      ".local/mvp-source-observations/pepper_lunch_sg.state.json";
    try {
      const state = read<{ candidates: Record<string, OfficialEntry> }>(
        statePath,
      );
      const captured = read<{
        captures: Array<{
          url: string;
          contentHash: string;
          fetchedAt: string;
        }>;
      }>(
        "tests/fixtures/direct-sources/pepper-captured-seven/capture-provenance.json",
      );
      const pages = read<{ pages: Record<string, { path: string }> }>(
        "tests/fixtures/direct-sources/pepper-captured-seven/manifest.json",
      );
      for (const [key, entry] of Object.entries(state.candidates)) {
        const provenance = captured.captures.find(
          (c) => c.url === entry.candidate.canonicalUrl,
        );
        const page = pages.pages[entry.candidate.canonicalUrl];
        const capturePath = page
          ? `tests/fixtures/direct-sources/pepper-captured-seven/${page.path}`
          : null;
        const capture =
          provenance && capturePath
            ? {
                path: capturePath,
                url: provenance.url,
                fetchedAt: provenance.fetchedAt,
                expectedSha256: provenance.contentHash,
                actualSha256: sha256(bytes(capturePath)),
                passed: sha256(bytes(capturePath)) === provenance.contentHash,
              }
            : null;
        const originalText = [
          ...new Set(
            [
              entry.candidate.description,
              ...(entry.candidate.terms ?? []),
              entry.candidate.locationWording,
            ].filter((text): text is string => !!text),
          ),
        ].join("\n");
        officialByKey.set(key, {
          entry,
          statePath,
          stateSha256: sha256(bytes(statePath)),
          originalText,
          capture,
        });
      }
    } catch {
      /* Unknown/missing captured provenance remains an explicit ledger blocker. */
    }
  }
  const modulePaths = [
    "src/domain/mvp-policy.ts",
    "src/ingestion/mvp/date-policy.ts",
    "src/ingestion/mvp/schedule.ts",
  ];
  const parserHashes = Object.fromEntries(
    modulePaths.map((p) => [p, sha256(bytes(p))]),
  );
  const sources = holdout.sources.map((group) => {
    const original = originalById.get(group.sourcePostId)!;
    const dates = normalizeMvpDates({
      text: original.originalText,
      publishedAt: original.publishedAt,
      firstSeenAt: null,
    });
    const schedule = parseMvpSchedule(original.originalText);
    const trustedDay = singaporeDay(original.publishedAt);
    const safetyFindings = [
      ...auditDateEvidence(original.originalText, dates),
      ...auditScheduleEvidence(original.originalText, schedule.rules),
    ];
    if (
      !trustedDay ||
      dates.audit.anchorBasis !== "posted" ||
      dates.audit.anchorDate !== trustedDay
    )
      safetyFindings.push({
        code: "trusted_published_anchor_mismatch",
        detail: original.publishedAt,
      });
    return {
      sourcePostId: original.postId,
      sourceUrl: original.url,
      cohort: group.cohort,
      publishedAt: original.publishedAt,
      trustedPublicationDay: trustedDay,
      rawTextSha256: sha256(original.originalText),
      exportCandidateCount: group.candidateIds.length,
      artifactChildCount: preview.records.filter(
        (r) => r.sourceUrl === original.url,
      ).length,
      dates,
      schedule,
      scheduleDisposition: scheduleDisposition(schedule),
      safetyFindings,
    };
  });
  const frozenCases = [
    ...read<{ cases: FrozenCase[] }>(mandatoryPath).cases.map((c) => ({
      ...c,
      cohort: "mandatory",
    })),
    ...read<{ cases: FrozenCase[] }>(holdoutCasePath).cases.map((c) => ({
      ...c,
      cohort: "frozen_source_holdout",
    })),
  ];
  const cases = frozenCases.map((c) => {
    const original = originalByUrl.get(c.source.url)!;
    const parsed = sources.find((s) => s.sourcePostId === original.postId)!;
    const provenancePassed =
      original.postId === c.source.sourcePostId &&
      sha256(original.originalText) === c.source.rawTextSha256 &&
      original.originalText.slice(
        c.evidence.startUtf16,
        c.evidence.endUtf16,
      ) === c.evidence.quote;
    const replay = normalizeMvpDates({
      text: original.originalText,
      publishedAt: original.publishedAt,
      firstSeenAt: "2036-10-06T00:00:00Z",
    });
    const checks = caseChecks(
      c.caseId,
      parsed.dates,
      parsed.schedule,
      replay,
      preview.records.filter((r) => r.sourceUrl === original.url),
    );
    const findings = parsed.safetyFindings;
    const factGatePassed = checks.every((check) => check.passed);
    return {
      ...c,
      originalText: original.originalText,
      publishedAt: original.publishedAt,
      provenancePassed,
      expectedFacts: checks,
      actual: { dates: parsed.dates, schedule: parsed.schedule },
      safetyFindings: findings,
      factGatePassed,
      safetyGatePassed: findings.length === 0,
      passed: provenancePassed && factGatePassed && findings.length === 0,
      disposition: !provenancePassed
        ? "provenance_failure"
        : findings.length
          ? "semantic_safety_failure"
          : !factGatePassed
            ? "required_fact_gap"
            : parsed.schedule.issues.length
              ? "required_facts_retained_with_other_abstention"
              : "required_facts_retained",
      authorship:
        "Codex automated evaluation of frozen agent-authored expectations; not human gold.",
    };
  });

  const legacyById = new Map(legacy.records.map((r) => [r.id, r]));
  const scalarKeys = [
    "startDate",
    "endDate",
    "weekdays",
    "hours",
    "redemptionCutoff",
  ] as const;
  const ledger = preview.records.map((record) => {
    const original = originalByUrl.get(record.sourceUrl);
    const official = original ? undefined : officialByKey.get(record.offerKey);
    const originalText =
      original?.originalText ?? official?.originalText ?? null;
    const trustedPublishedAt =
      original?.publishedAt ??
      (official?.entry.candidate.facts.publishedAt
        ? official.entry.candidate.publishedAt
        : null);
    const firstSeenAt = original
      ? null
      : (official?.entry.firstReceivedAt ?? null);
    const prior = legacyById.get(record.id);
    const audit = record.offerPolicy?.dateAudit;
    const scheduleRules = record.offerPolicy?.scheduleRules ?? [];
    const newDates: DatePolicyResult | null = audit
      ? {
          startDate: record.startDate,
          endDate: record.endDate,
          validityType: record.offerPolicy!.validityType,
          audit,
        }
      : null;
    const currentDates = normalizeMvpDates({
      text: record.description,
      publishedAt: trustedPublishedAt,
      firstSeenAt,
    });
    const currentSchedule = parseMvpSchedule(record.description);
    const replayMatchesCurrentParsers =
      same(currentDates, newDates) &&
      same(currentSchedule.rules, scheduleRules) &&
      same(currentSchedule.issues, record.offerPolicy?.scheduleIssues);
    const safety = [
      ...(newDates ? auditDateEvidence(record.description, newDates) : []),
      ...auditScheduleEvidence(record.description, scheduleRules),
    ];
    const blockers = [
      ...safety,
      ...(audit?.blockers ?? []).map((detail) => ({
        code: "date_parser_blocker",
        detail,
      })),
      ...(record.offerPolicy?.scheduleIssues ?? []).map((detail) => ({
        code: "schedule_parser_abstention",
        detail,
      })),
    ];
    if (!replayMatchesCurrentParsers)
      blockers.push({
        code: "preview_parser_replay_mismatch",
        detail:
          "Stored preview dates/schedule differ from current modules. Regenerate preview before interpreting final outcomes.",
      });
    if (!original && !official)
      blockers.push({
        code: "original_source_missing",
        detail: record.sourceUrl,
      });
    if (!prior && !official)
      blockers.push({
        code: "legacy_child_identity_missing",
        detail: record.id,
      });
    if (
      official &&
      (!official.capture?.passed ||
        official.entry.firstReceivedAt !== record.offerPolicy?.firstSeenAt)
    )
      blockers.push({
        code: "official_capture_or_receipt_unverified",
        detail: record.offerKey,
      });
    if (!audit)
      blockers.push({ code: "new_date_audit_missing", detail: record.id });
    const evidence = [
      ...(audit?.fragments ?? []),
      ...scheduleRules.map((r) => r.evidence),
    ].map((e) => {
      const matches = originalText ? occurrences(originalText, e.quote) : [];
      if (!matches.length)
        blockers.push({
          code: "child_quote_not_contiguous_in_original",
          detail: e.quote,
        });
      return {
        childEvidence: e,
        childOffsetsPassed:
          record.description.slice(e.start, e.end) === e.quote,
        originalOccurrences: matches,
        mapping:
          matches.length === 1
            ? "unique_literal_match"
            : matches.length
              ? "multiple_literal_matches_ownership_unverified"
              : "unresolved_source_mapping",
      };
    });
    if (
      original &&
      audit &&
      (audit.anchorBasis !== "posted" ||
        audit.anchorDate !== singaporeDay(original.publishedAt) ||
        record.offerPolicy?.publishedAt !== original.publishedAt)
    )
      blockers.push({
        code: "preview_anchor_mismatch",
        detail: original.publishedAt,
      });
    const fields = Object.fromEntries(
      scalarKeys
        .filter((key) => !same(prior?.[key], record[key]))
        .map((key) => [
          key,
          { legacy: prior?.[key] ?? null, preview: record[key] },
        ]),
    );
    const changed = Object.keys(fields).length > 0 || scheduleRules.length > 0;
    return {
      recordId: record.id,
      offerKey: record.offerKey,
      parentKey: record.parentKey,
      sourceUrl: record.sourceUrl,
      sourcePostId: original?.postId ?? (official ? record.offerKey : null),
      originalText,
      rawTextSha256: originalText ? sha256(originalText) : null,
      trustedPublishedAt,
      immutableFirstSeenAt: record.offerPolicy?.firstSeenAt ?? null,
      parserInputText: record.description,
      sourceCohort: original
        ? "frozen_original_corpus"
        : "additional_official_capture_diagnostic",
      sourceBacking: original
        ? { kind: "original_export_text", path: sourcePath }
        : official
          ? {
              kind: "captured_adapter_text",
              statePath: official.statePath,
              stateSha256: official.stateSha256,
              capture: official.capture,
              facts: official.entry.candidate.facts,
              textDerivation:
                "Saved adapter description/terms/location wording, not a fresh parse of raw HTML. Captured HTML remains the authoritative raw receipt.",
            }
          : { kind: "unresolved" },
      parserInputSha256: sha256(record.description),
      replayMatchesCurrentParsers,
      currentParserReplay: { dates: currentDates, schedule: currentSchedule },
      anchor: audit
        ? { date: audit.anchorDate, basis: audit.anchorBasis }
        : null,
      dateAudit: audit ?? null,
      legacyValues: prior
        ? Object.fromEntries(scalarKeys.map((key) => [key, prior[key]]))
        : null,
      previewValues: Object.fromEntries(
        scalarKeys.map((key) => [key, record[key]]),
      ),
      diff: fields,
      scheduleStructureAddition: {
        legacyRepresentation: {
          weekdays: prior?.weekdays ?? null,
          hours: prior?.hours ?? null,
          redemptionCutoff: prior?.redemptionCutoff ?? null,
        },
        newRules: scheduleRules,
        legacyDidNotHaveScheduleRuleArray: true,
      },
      evidence,
      changed,
      safetyFindings: safety,
      unresolvedBlockers: blockers,
      disposition: blockers.length
        ? "blocked_or_partial_requires_review"
        : changed
          ? "source_backed_difference_requires_semantic_review"
          : "no_scalar_date_schedule_change",
      reviewer: "Codex automated review; not human reviewed or approved",
      semanticApproval: false,
    };
  });
  const removedLegacy = legacy.records
    .filter((r) => !preview.records.some((p) => p.id === r.id))
    .map((r) => ({
      recordId: r.id,
      sourceUrl: r.sourceUrl,
      offerKey: r.offerKey,
      disposition: "legacy_child_missing_from_preview_requires_review",
    }));
  const childSafety = ledger.filter((r) => r.safetyFindings.length);
  const corpusLedger = ledger.filter(
    (r) => r.sourceCohort === "frozen_original_corpus",
  );
  const additionalLedger = ledger.filter(
    (r) => r.sourceCohort !== "frozen_original_corpus",
  );
  const historical = read<{ count: number; units: unknown[] }>(
    `${evaluationDirectory}/historical-34-units.json`,
  );
  const familyFolds = family.folds.map((f) => ({
    foldId: f.foldId,
    sourceCount: f.heldOutSources.length,
    diagnosticOnly: true,
    sharedParserDevelopmentFamilyOverlap: true,
    interpretation:
      "Same shared parser applied to each correlated family subset. Not independent training/test splits; do not pool folds.",
    perSource: f.heldOutSources.map((id) => {
      const s = sources.find((s) => s.sourcePostId === id)!;
      return {
        sourcePostId: id,
        dateDisposition: s.dates.validityType ?? "abstained_or_unknown",
        scheduleDisposition: s.scheduleDisposition,
        safetyFindingCodes: s.safetyFindings.map((f) => f.code),
      };
    }),
  }));
  const report = {
    format: "mvp-offer-policy-parser-evaluation-v1",
    reviewer:
      "Codex automated review; not human reviewed; all-source correctness gold unavailable",
    execution: {
      mode: "offline pure parser calls; no provider, database, model, or network calls",
      previewEvaluatedAt: preview.evaluatedAt,
      parserHashes,
      inputHashes: {
        [sourcePath]: sha256(bytes(sourcePath)),
        [legacyPath]: sha256(bytes(legacyPath)),
        [previewPath]: sha256(bytes(previewPath)),
      },
    },
    integrity: {
      freezeChecks,
      groupingFindings: grouping,
      protectedFilesChecked: protectedHashes.length,
      protectedHashFailures: protectedHashes.filter((c) => !c.passed),
      protectedDiffInterpretation:
        "Byte differences remain reported, including authorised shared MVP type integration and Next generated files. Parent must examine scoped diffs; this evaluator cannot establish semantic preservation from a changed hash.",
    },
    denominators: {
      uniqueOriginalSources: sources.length,
      exportCandidateRecords: inbox.items.length,
      legacyArtifactChildRecords: legacy.records.length,
      previewArtifactChildRecords: preview.records.length,
      previewOriginalCorpusChildren: corpusLedger.length,
      previewAdditionalOfficialChildren: additionalLedger.length,
      previewUniqueSourceUrls: new Set(preview.records.map((r) => r.sourceUrl))
        .size,
      historicalUnitsDiagnosticOnly: historical.units.length,
      frozenCases: cases.length,
      frozenCaseUniqueSources: new Set(cases.map((c) => c.source.sourcePostId))
        .size,
    },
    sourceLevel: {
      all: summarizeSources(sources),
      holdout: summarizeSources(sources.filter((s) => s.cohort === "holdout")),
      development: summarizeSources(
        sources.filter((s) => s.cohort !== "holdout"),
      ),
    },
    childArtifact: {
      dateTypes: Object.fromEntries(
        ["dated", "open_ended", "unknown"].map((t) => [
          t,
          preview.records.filter(
            (r) => (r.offerPolicy?.validityType ?? "unknown") === t,
          ).length,
        ]),
      ),
      scalarDifferences: ledger.filter((r) => Object.keys(r.diff).length)
        .length,
      recordsWithScheduleStructureAdded: ledger.filter(
        (r) => r.scheduleStructureAddition.newRules.length,
      ).length,
      recordsWithDifferencesOrScheduleAdditions: ledger.filter((r) => r.changed)
        .length,
      recordsWithSafetyFindings: childSafety.length,
      removedLegacyChildren: removedLegacy.length,
      interpretation:
        "Original-corpus child records are dependent descendants of 136 sources; additional captured official inputs are counted separately. Artifact differences and parser coverage are not accuracy estimates.",
    },
    frozenCaseSummary: {
      mandatory: {
        denominator: 8,
        passed: cases.filter((c) => c.cohort === "mandatory" && c.passed)
          .length,
      },
      holdout: {
        denominator: 4,
        passed: cases.filter((c) => c.cohort !== "mandatory" && c.passed)
          .length,
      },
      factGaps: cases.filter((c) => !c.factGatePassed).map((c) => c.caseId),
      semanticFailures: cases
        .filter((c) => !c.safetyGatePassed)
        .map((c) => c.caseId),
      provenanceFailures: cases
        .filter((c) => !c.provenancePassed)
        .map((c) => c.caseId),
    },
    gates: {
      frozenInputsPassed:
        freezeChecks.every((c) => c.passed) && grouping.length === 0,
      integrityPassed:
        freezeChecks.every((c) => c.passed) &&
        grouping.length === 0 &&
        protectedHashes.every((c) => c.passed || reviewedHashes.includes(c)),
      previewMatchesCurrentParsers: ledger.every(
        (r) => r.replayMatchesCurrentParsers,
      ),
      frozenCasesPassed: cases.every((c) => c.passed),
      allSourceMechanicalSafetyPassed: sources.every(
        (s) => !s.safetyFindings.length,
      ),
      artifactMechanicalSafetyPassed: childSafety.length === 0,
    },
    limits: [
      "Agent-labelled expectations are not human gold. Literal provenance checks do not prove correct scope, role, eligibility, or semantic completeness.",
      "No-rule absence is unknown, not correct parsing. Source listing absence/presence lifecycle transitions are not evaluated by this text sidecar.",
      "79 family folds are correlated diagnostics of a shared parser, with shared development-family overlap. Original 28-source holdout was stratified within channel, not merchant/grammar independent.",
      "34 historical V4 normalization units remain diagnostic only and are not pooled with the original-source or child-record denominators.",
      "Mechanical endpoint and role gates detect specified unsafe patterns; unflagged outputs still require semantic review.",
    ],
    cases,
    sources,
    familyFolds,
  };
  const review = {
    format: "mvp-offer-policy-source-review-v1",
    reviewer: report.reviewer,
    legacyArtifactSha256: sha256(bytes(legacyPath)),
    previewArtifactSha256: sha256(bytes(previewPath)),
    sourceDenominator: sources.length,
    childDenominator: preview.records.length,
    records: ledger,
    removedLegacyChildren: removedLegacy,
    semanticApproval: false,
  };
  return { report, review };
}

export function evaluationMarkdown(
  result: ReturnType<typeof evaluateMvpOfferPolicy>,
): string {
  const r = result.report;
  const failedCases = r.cases.filter((c) => !c.passed);
  const counts = new Map<string, number>();
  for (const s of r.sources)
    for (const f of s.safetyFindings)
      counts.set(f.code, (counts.get(f.code) ?? 0) + 1);
  return `# Offline MVP offer-policy evaluation\n\nCodex automated review; not human reviewed. No whole-corpus correctness or accuracy claim.\n\nInputs: ${r.denominators.uniqueOriginalSources} exact original sources; ${r.denominators.exportCandidateRecords} export candidates; ${r.denominators.legacyArtifactChildRecords} legacy children. Preview: ${r.denominators.previewOriginalCorpusChildren} original-corpus children plus ${r.denominators.previewAdditionalOfficialChildren} additional official children (${r.denominators.previewArtifactChildRecords} total). ${r.denominators.historicalUnitsDiagnosticOnly} historical units are diagnostic only.\n\nSource-level output coverage: ${JSON.stringify(r.sourceLevel.all.dateCoverage)}. Schedule output dispositions: ${JSON.stringify(r.sourceLevel.all.scheduleCoverage)}. No-rule absence earns no correctness credit.\n\nFrozen gates: mandatory ${r.frozenCaseSummary.mandatory.passed}/8; holdout ${r.frozenCaseSummary.holdout.passed}/4. ${r.cases.length} cases refer to ${r.denominators.frozenCaseUniqueSources} unique sources.\n\nFrozen inputs: ${r.gates.frozenInputsPassed ? "PASS" : "FAIL"}; ${r.integrity.freezeChecks.length} frozen input checks. Protected baseline: ${r.integrity.protectedFilesChecked} hashes checked; ${r.integrity.protectedHashFailures.length} byte differences require parent scoped review. Preview/current parser parity: ${r.gates.previewMatchesCurrentParsers ? "PASS" : "FAIL (regenerate preview)"}.\n\nMechanical safety: ${r.sourceLevel.all.sourcesWithMechanicalSafetyFindings} original sources / ${r.childArtifact.recordsWithSafetyFindings} preview children have findings. Patterns: ${JSON.stringify(Object.fromEntries(counts))}. These checks are not complete semantic adjudication.\n\nPreview ledger: ${r.childArtifact.scalarDifferences} children have scalar date/schedule differences; ${r.childArtifact.recordsWithScheduleStructureAdded} have added schedule structure. Every preview child is recorded in source-review.json with source text or captured adapter text with raw receipt reference, trusted publication or first-receipt anchor, parser input, new audit, literal mapping, diff and unresolved blockers. All differences remain subject to semantic review.\n\nFamily folds: ${r.familyFolds.length} correlated per-source diagnostics, with shared parser development-family overlap. They are not independent training splits and must not be pooled.\n\nFailed frozen cases:\n\n${
    failedCases
      .map(
        (c) =>
          `- ${c.caseId} (${c.source.url}): ${c.safetyFindings.map((f) => `${f.code}: ${f.detail}`).join("; ") || "required fact gap"}; missing checks: ${
            c.expectedFacts
              .filter((f) => !f.passed)
              .map((f) => f.fact)
              .join("; ") || "none"
          }`,
      )
      .join("\n") || "- None."
  }\n\nRun offline: \`node --import tsx scripts/evaluate-mvp-offer-policy.ts\`. Reports are written even when semantic gates fail; exit status is 1 on a failed integrity, frozen-case, source-safety or artifact-safety gate. Tests: \`npx vitest run tests/mvp-offer-evaluation.test.ts\`.\n`;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === "--preview"))
    throw new Error("Only --preview <offline artifact> is supported");
  const result = evaluateMvpOfferPolicy(
    process.cwd(),
    args[1] ?? defaultPreviewPath,
  );
  mkdirSync(evaluationDirectory, { recursive: true });
  writeFileSync(
    `${evaluationDirectory}/parser-report.json`,
    JSON.stringify(result.report, null, 2) + "\n",
  );
  writeFileSync(
    `${evaluationDirectory}/source-review.json`,
    JSON.stringify(result.review, null, 2) + "\n",
  );
  writeFileSync(
    `${evaluationDirectory}/parser-report.md`,
    evaluationMarkdown(result),
  );
  console.log(
    JSON.stringify(
      {
        denominators: result.report.denominators,
        sourceLevel: result.report.sourceLevel.all,
        childArtifact: result.report.childArtifact,
        frozenCaseSummary: result.report.frozenCaseSummary,
        gates: result.report.gates,
      },
      null,
      2,
    ),
  );
  if (Object.values(result.report.gates).some((pass) => !pass))
    process.exitCode = 1;
}
