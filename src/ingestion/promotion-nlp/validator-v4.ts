import {
  schemasV4,
  type StageV4,
  type EvidenceV4,
  type PropositionV4,
  type EdgeV4,
  type NormalizationV4,
} from "./schema-v4";
import { isCalendarDate } from "./validator";
import { isPhysicalLabelV3, supportedTimeV3 } from "./validator-v3";

export interface ValidationContextV4 {
  SOURCE_TEXT?: string;
  evidence?: EvidenceV4[];
  propositions?: PropositionV4[];
  edges?: EdgeV4[];
  taxonomy?: string;
}
export function parseJsonV4(raw: string) {
  try {
    return { value: JSON.parse(raw) as unknown, syntaxMalformed: false };
  } catch {
    return { value: null, syntaxMalformed: true };
  }
}
export function validateStageV4(
  stage: StageV4,
  value: unknown,
  ctx: ValidationContextV4,
) {
  const parsed = schemasV4[stage].safeParse(value);
  const issues: string[] = [];
  if (!parsed.success)
    return {
      valid: false,
      data: null,
      issues: parsed.error.issues.map(
        (i) => `schema:${i.path.join(".")}:${i.message}`,
      ),
    };
  const d = parsed.data;
  const evidence = new Map((ctx.evidence ?? []).map((e) => [e.id, e]));
  const props = new Set((ctx.propositions ?? []).map((p) => p.id));
  const unique = (values: string[], code: string) => {
    if (new Set(values).size !== values.length) issues.push(code);
  };
  if (stage === 1 && "evidence" in d) {
    unique(
      d.evidence.map((e) => e.id),
      "duplicate_evidence_id",
    );
    unique(
      d.evidence.map((e) => e.quote),
      "duplicate_evidence_quote",
    );
    for (const e of d.evidence)
      if (!ctx.SOURCE_TEXT?.includes(e.quote))
        issues.push(`non_source_evidence:${e.id}`);
  }
  if (stage === 2 && "propositions" in d) {
    unique(
      d.propositions.map((p) => p.id),
      "duplicate_proposition_id",
    );
    for (const p of d.propositions) {
      unique(p.anchorEvidenceIds, `duplicate_anchor:${p.id}`);
      for (const e of p.anchorEvidenceIds)
        if (!evidence.has(e)) issues.push(`invented_anchor:${e}`);
    }
  }
  if (stage === 3 && "edges" in d) {
    // Exactly one target-set assignment per evidence node, including [] for unassigned.
    unique(
      d.edges.map((e) => e.evidenceId),
      "duplicate_edge",
    );
    if (d.edges.length !== evidence.size)
      issues.push("missing_edge_assignment");
    for (const e of d.edges) {
      if (!evidence.has(e.evidenceId))
        issues.push(`invented_evidence_id:${e.evidenceId}`);
      unique(e.propositionIds, `duplicate_edge_target:${e.evidenceId}`);
      for (const p of e.propositionIds)
        if (!props.has(p)) issues.push(`invented_target:${p}`);
    }
  }
  if (stage === 4 && "taxonomy" in d) {
    unique(d.evidenceIds, "duplicate_classification_evidence");
    for (const e of d.evidenceIds)
      if (!evidence.has(e))
        issues.push(`nonlocal_classification_evidence:${e}`);
  }
  if (stage === 5) {
    const n = d as NormalizationV4;
    if (ctx.taxonomy !== "economic_offer")
      issues.push("normalization_ineligible");
    const check = (e: string | null) => {
      if (e === null || !evidence.has(e))
        issues.push(`nonlocal_fact_evidence:${e}`);
    };
    for (const f of [
      "merchant",
      "title",
      "benefit",
      "startDate",
      "endDate",
      "weekdays",
      "locationScope",
    ] as const) {
      const v = n[f];
      if (v.value !== null) check(v.evidenceId);
      else if (v.evidenceId !== null)
        issues.push(`null_fact_with_evidence:${f}`);
    }
    for (const c of n.constraints) {
      check(c.evidenceId);
      unique(c.attributes, "duplicate_constraint_attribute");
      if (!evidence.get(c.evidenceId)?.quote.includes(c.text))
        issues.push("nonverbatim_constraint");
    }
    unique(
      n.constraints.map((c) => c.text),
      "duplicate_constraint",
    );
    if (n.weekdays.value)
      unique(n.weekdays.value.map(String), "duplicate_weekday");
    for (const f of ["startDate", "endDate"] as const)
      if (n[f].value) {
        if (!isCalendarDate(n[f].value!)) issues.push("invalid_calendar_date");
        if (
          !new RegExp(`\\b${n[f].value!.slice(0, 4)}\\b`).test(
            evidence.get(n[f].evidenceId!)?.quote ?? "",
          )
        )
          issues.push("unstated_year");
      }
    if (
      n.startDate.value &&
      n.endDate.value &&
      n.startDate.value > n.endDate.value
    )
      issues.push("reversed_date_range");
    for (const t of n.timeConstraints) {
      check(t.evidenceId);
      const { evidenceId, ...time } = t;
      if (
        !supportedTimeV3({
          ...time,
          quote: evidence.get(evidenceId)?.quote ?? "",
        })
      )
        issues.push("unsupported_time_semantics");
    }
    for (const l of n.locationRules) {
      check(l.evidenceId);
      unique(l.names, "duplicate_location_name");
      for (const name of l.names)
        if (
          !isPhysicalLabelV3(name) ||
          /^(?:app|website|online|Happy Point(?: Singapore)? app|(?:eve of )?(?:Chinese|Lunar) New Year)$/i.test(
            name.trim(),
          )
        )
          issues.push("nonphysical_location_label");
        else if (!evidence.get(l.evidenceId)?.quote.includes(name))
          issues.push("nonverbatim_location");
    }
    const participating = new Set(
      n.locationRules
        .filter((l) => l.role === "participating")
        .flatMap((l) => l.names),
    );
    if (
      n.locationRules.some(
        (l) =>
          l.role === "excluded" &&
          l.names.some((name) => participating.has(name)),
      )
    )
      issues.push("conflicting_location_roles");
    if (n.locationScope.value === "named_outlets" && !participating.size)
      issues.push("named_scope_without_participating_rule");
    if (
      n.locationScope.value &&
      evidence.get(n.locationScope.evidenceId!)?.kind === "channel"
    )
      issues.push("channel_is_not_location_scope");
    for (const f of ["merchant", "benefit"] as const)
      if (
        n[f].value &&
        !evidence.get(n[f].evidenceId!)?.quote.includes(n[f].value!)
      )
        issues.push(`nonverbatim_${f}`);
  }
  // Structural validity never claims semantic edge, taxonomy, calendar, clock or polarity correctness.
  return { valid: issues.length === 0, data: issues.length ? null : d, issues };
}
