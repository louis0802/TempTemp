/** Operational analysis exclusion; neither protocol nor sealed evaluations are rewritten. */
import type { Evaluation } from "./evaluation";

export const REV6_ANALYSIS_EXCLUSIONS = [
  {
    date: "2026-09-30",
    reason: "implementation_transition",
    note: "Retained evidence intentionally excluded from formal analysis; earliest candidate repaired Singapore day is 2026-10-01, conditional on actual runtime activation and completeness.",
  },
];

export function researchAnalysisEvaluations(evaluations: Evaluation[]) {
  return evaluations.filter(
    (e) =>
      e.protocol_revision !== 6 ||
      !REV6_ANALYSIS_EXCLUSIONS.some((x) => x.date === e.date),
  );
}
