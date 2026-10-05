import type { DateOnlyOutput } from "./date-only-profile";

export interface ReviewedDateOnlyFacts {
  startDate: string | null;
  endDate: string | null;
  locationScope: "all_outlets" | "selected_outlets" | "named_outlets" | null;
  participating: { identity: string; labels: string[] }[];
  excluded: { identity: string; labels: string[] }[];
}

/** Gold evaluates predictions only; it never constructs or repairs a candidate. */
export function assessDateOnlyCore(
  facts: DateOnlyOutput,
  expected: readonly ReviewedDateOnlyFacts[],
) {
  if (!expected.length)
    return {
      dateAnnotationMatch: null,
      participationAnnotationMatch: null,
      findings: ["unmatched_or_unannotated_economic_identity"],
    };
  const findings: string[] = [];
  const windows = new Set(
    expected.map((e) => JSON.stringify([e.startDate, e.endDate])),
  );
  const dateAnnotationMatch =
    windows.size === 1 &&
    facts.startDate.value === expected[0].startDate &&
    facts.endDate.value === expected[0].endDate;
  if (!dateAnnotationMatch)
    findings.push(
      windows.size > 1
        ? "incompatible_campaign_windows"
        : "campaign_date_annotation_mismatch",
    );
  const scopes = new Set(expected.map((e) => e.locationScope));
  const scopeMatches =
    scopes.size === 1 &&
    (facts.locationScope.value === expected[0].locationScope ||
      (["named_outlets", "selected_outlets"].includes(
        facts.locationScope.value ?? "",
      ) &&
        ["named_outlets", "selected_outlets"].includes(
          expected[0].locationScope ?? "",
        )));
  const rolesMatch = (role: "participating" | "excluded") => {
    const gold = new Map(
      expected.flatMap((e) => e[role]).map((e) => [e.identity, e]),
    );
    const actual = new Set(
      facts.locationRules
        .filter((rule) => rule.role === role)
        .flatMap((rule) => rule.names),
    );
    const targets = [...gold.values()];
    return (
      targets.every((target) =>
        [...actual].some((name) => target.labels.includes(name)),
      ) &&
      [...actual].every((name) =>
        targets.some((target) => target.labels.includes(name)),
      )
    );
  };
  const participationAnnotationMatch =
    scopeMatches && rolesMatch("participating") && rolesMatch("excluded");
  if (!participationAnnotationMatch)
    findings.push("physical_participation_annotation_mismatch");
  return { dateAnnotationMatch, participationAnnotationMatch, findings };
}
