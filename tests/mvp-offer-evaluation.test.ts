import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DatePolicyResult, ScheduleRule } from "../src/domain/mvp-policy";
import {
  auditDateEvidence,
  auditScheduleEvidence,
  evaluateMvpOfferPolicy,
  groupingFindings,
} from "../scripts/evaluate-mvp-offer-policy";

const result = evaluateMvpOfferPolicy();
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const frozenHashes = {
  "docs/changes/mvp-offer-lifecycle/evaluation/source-holdout.json":
    "2bf370ac1f6f924b3a2dc48c5e4bbbbe51104ae5948a2cc294da4135fb258419",
  "tests/fixtures/mvp-offer-lifecycle/mandatory-safety-cases.json":
    "3007e1243cb5498efe0e4d5380fd88548fc5e59347887bd8b938a10eb1460260",
  "docs/changes/mvp-offer-lifecycle/evaluation/family-holdout.json":
    "3e20524afbce722079d3a6dff0627cf3cdac54bfe46a08967a641e9c6ab43976",
  "tests/fixtures/mvp-offer-lifecycle/holdout-safe-expectations.json":
    "eae27e39f11660e263ed2e0127b3ba28618abd440490e2d76e477c33d0e09022",
};

describe("evaluation integrity, grouping and denominators", () => {
  it("preserves frozen bytes and reports protected hashes requiring parent scoped review", () => {
    for (const [path, expected] of Object.entries(frozenHashes))
      expect(sha256(readFileSync(path)), path).toBe(expected);
    expect(
      result.report.integrity.freezeChecks.filter((c) => !c.passed),
    ).toEqual([]);
    // Parent-owned shared Listing changes and generated Next references have
    // scoped review contracts. Keep their exact byte differences in the report.
    expect(
      result.report.integrity.protectedHashFailures.filter(
        (c) => !["src/domain/promotion.ts", "next-env.d.ts"].includes(c.path),
      ),
    ).toEqual([]);
    for (const c of result.report.integrity.protectedHashFailures) {
      expect(c.actual).toBe(sha256(readFileSync(c.path)));
      expect(c.passed).toBe(false);
    }
    expect(result.report.integrity.groupingFindings).toEqual([]);
  });

  it("keeps 136 originals, 180 export candidates, 200 artifact children and 34 historical units separate", () => {
    expect(result.report.denominators).toMatchObject({
      uniqueOriginalSources: 136,
      exportCandidateRecords: 180,
      legacyArtifactChildRecords: 200,
      previewOriginalCorpusChildren: 200,
      historicalUnitsDiagnosticOnly: 34,
      frozenCases: 12,
      frozenCaseUniqueSources: 11,
    });
    expect(result.report.denominators.previewArtifactChildRecords).toBe(
      200 + result.report.denominators.previewAdditionalOfficialChildren,
    );
    expect(result.report.sourceLevel.holdout.sourceDenominator).toBe(28);
    expect(result.report.sourceLevel.development.sourceDenominator).toBe(108);
    expect(
      result.report.sources.reduce(
        (sum, source) => sum + source.exportCandidateCount,
        0,
      ),
    ).toBe(180);
    expect(
      result.report.sources.reduce(
        (sum, source) => sum + source.artifactChildCount,
        0,
      ),
    ).toBe(200);
    expect(new Set(result.report.sources.map((s) => s.sourcePostId)).size).toBe(
      136,
    );
  });

  it("detects children moved between source groups rather than just checking total count", () => {
    const inbox = JSON.parse(
      readFileSync("exports/review-inbox-2026-09-16/review-inbox.json", "utf8"),
    );
    const manifest = JSON.parse(
      readFileSync(
        "docs/changes/mvp-offer-lifecycle/evaluation/source-holdout.json",
        "utf8",
      ),
    );
    const first = manifest.sources[0].candidateIds[0];
    manifest.sources[0].candidateIds[0] = manifest.sources[1].candidateIds[0];
    manifest.sources[1].candidateIds[0] = first;
    expect(
      groupingFindings(inbox, manifest).some(
        (f) => f.code === "child_group_mismatch",
      ),
    ).toBe(true);
  });

  it("verifies complete originals, trustworthy publication anchors and frozen quote offsets", () => {
    for (const source of result.report.sources) {
      expect(source.dates.audit.anchorBasis).toBe("posted");
      expect(source.dates.audit.anchorDate).toBe(source.trustedPublicationDay);
    }
    for (const c of result.report.cases) {
      expect(c.provenancePassed, c.caseId).toBe(true);
      expect(
        c.originalText.slice(c.evidence.startUtf16, c.evidence.endUtf16),
        c.caseId,
      ).toBe(c.evidence.quote);
    }
  });

  it("labels all 79 overlapping family folds as shared-parser diagnostics", () => {
    expect(result.report.familyFolds).toHaveLength(79);
    for (const fold of result.report.familyFolds) {
      expect(fold.diagnosticOnly).toBe(true);
      expect(fold.sharedParserDevelopmentFamilyOverlap).toBe(true);
      expect(fold.perSource).toHaveLength(fold.sourceCount);
      expect(new Set(fold.perSource.map((s) => s.sourcePostId)).size).toBe(
        fold.sourceCount,
      );
    }
  });

  it("builds a complete source-backed ledger without claiming human approval", () => {
    expect(result.review.records).toHaveLength(
      result.report.denominators.previewArtifactChildRecords,
    );
    for (const row of result.review.records) {
      expect(row.originalText).toBeTypeOf("string");
      if (row.sourceCohort === "frozen_original_corpus")
        expect(row.trustedPublishedAt).toBeTruthy();
      else {
        expect(row.immutableFirstSeenAt).toBeTruthy();
        expect(row.sourceBacking.kind).toBe("captured_adapter_text");
        expect(
          "capture" in row.sourceBacking && row.sourceBacking.capture?.passed,
        ).toBe(true);
      }
      expect(row.semanticApproval).toBe(false);
      expect(row.reviewer).toContain("not human reviewed");
      expect(row.evidence.every((e) => e.childOffsetsPassed)).toBe(true);
      for (const match of row.evidence.flatMap((e) =>
        e.originalOccurrences.map((occurrence) => ({
          occurrence,
          quote: e.childEvidence.quote,
        })),
      ))
        expect(
          row.originalText?.slice(match.occurrence.start, match.occurrence.end),
        ).toBe(match.quote);
    }
  });

  it("produces deterministic reports from identical offline inputs", () => {
    expect(evaluateMvpOfferPolicy()).toEqual(result);
  });
});

describe("mechanical unsupported endpoint guardrails", () => {
  const rule = (
    quote: string,
    start: string | null,
    end: string | null,
    timeKind: ScheduleRule["timeKind"] = "range",
  ): ScheduleRule => ({
    evidence: { quote, start: 0, end: quote.length },
    weekdays: null,
    timeKind,
    start,
    end,
    exclusions: [],
    outletNames: [],
    conditions: [],
    issues: [],
  });

  it("rejects invented midnight, wrong clocks and point-to-range synthesis", () => {
    expect(
      auditScheduleEvidence("Opening till 10.30am", [
        rule("Opening till 10.30am", "00:00", "10:30", "opening_to"),
      ]).map((f) => f.code),
    ).toContain("invented_opening_start");
    expect(
      auditScheduleEvidence("2PM - 8PM", [
        rule("2PM - 8PM", "14:00", "21:00"),
      ]).map((f) => f.code),
    ).toContain("unsupported_clock_endpoint");
    expect(
      auditScheduleEvidence("5:30pm timeslot", [
        rule("5:30pm timeslot", "17:30", "17:30"),
      ]).map((f) => f.code),
    ).toContain("point_to_range_synthesis");
    expect(
      auditScheduleEvidence("2 - 5pm", [rule("2 - 5pm", "14:00", "17:00")]),
    ).toEqual([]);
  });

  it("rejects missing literal offsets and date endpoints without literal or permitted anchor support", () => {
    const dates: DatePolicyResult = {
      startDate: "2027-01-01",
      endDate: null,
      validityType: "open_ended",
      audit: {
        ruleVersion: "mvp-offer-policy-v1",
        anchorDate: "2026-10-06",
        anchorBasis: "posted",
        fragments: [],
        steps: [],
        blockers: [],
      },
    };
    expect(auditDateEvidence("Every Fri", dates).map((f) => f.code)).toContain(
      "date_endpoint_without_literal_or_anchor",
    );
    expect(
      auditScheduleEvidence("unrelated", [
        rule("2PM - 8PM", "14:00", "20:00"),
      ]).map((f) => f.code),
    ).toContain("schedule_evidence_offset_mismatch");
  });
});

describe("frozen safety and preview gates", () => {
  it.each(result.report.cases)(
    "retains the frozen facts and source safety for $caseId",
    (c) => {
      expect(
        c.expectedFacts.filter((f) => !f.passed),
        c.caseId,
      ).toEqual([]);
      expect(c.safetyFindings, c.caseId).toEqual([]);
      expect(c.passed).toBe(true);
    },
  );

  it("rejects stale previews when stored policy differs from current parser modules", () => {
    expect(
      result.review.records
        .filter((r) => !r.replayMatchesCurrentParsers)
        .map((r) => ({ source: r.sourceUrl, key: r.offerKey })),
    ).toEqual([]);
  });

  it("has no mechanically unsupported endpoints or detected role/scope reversals in preview children", () => {
    expect(
      result.review.records
        .filter((r) => r.safetyFindings.length)
        .map((r) => ({
          source: r.sourceUrl,
          key: r.offerKey,
          findings: r.safetyFindings,
        })),
    ).toEqual([]);
  });

  it("reports no detected source-level unsafe assignments", () => {
    expect(
      result.report.sources
        .filter((s) => s.safetyFindings.length)
        .map((s) => ({ source: s.sourceUrl, findings: s.safetyFindings })),
    ).toEqual([]);
  });
});
