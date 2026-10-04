import {
  emptyExtractionV3,
  FACT_FIELDS_V3,
  rawExtractionSchemaV3,
  type ExtractionV3,
  type TimeConstraintV3,
} from "./schema-v3";
import { propositionEvidenceV3, type PropositionV3 } from "./segmentation-v3";
import { isCalendarDate } from "./validator";

export interface ValidationV3 {
  structurallyValid: boolean;
  accepted: ExtractionV3;
  issues: { field: string; code: string }[];
}
/** Small generic clock recognizer, not an opening-hour lookup or semantic oracle. */
export function quotedClocksV3(quote: string) {
  const values = new Set<string>();
  for (const m of quote.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi)) {
    const hour = Number(m[1]),
      minute = Number(m[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) continue;
    values.add(
      `${String((hour % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  }
  for (const m of quote.matchAll(
    /\b([01]?\d|2[0-3]):([0-5]\d)(?!\s*(?:am|pm)\b)/gi,
  ))
    values.add(`${m[1].padStart(2, "0")}:${m[2]}`);
  // Shared meridiem, e.g. 2–5PM and 11:30am–12pm.
  for (const m of quote.matchAll(
    /\b(\d{1,2})(?::(\d{2}))?\s*[–-]\s*\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi,
  )) {
    const hour = Number(m[1]),
      minute = Number(m[2] ?? 0);
    if (hour >= 1 && hour <= 12 && minute < 60)
      values.add(
        `${String((hour % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
  }
  return values;
}
export function supportedTimeV3(t: TimeConstraintV3) {
  const clocks = quotedClocksV3(t.quote);
  if (t.kind === "range")
    return (
      t.start < t.end &&
      clocks.has(t.start) &&
      clocks.has(t.end) &&
      !/\bopening\b/i.test(t.quote)
    );
  if (t.kind === "opening_to")
    return (
      clocks.has(t.end) && /\bopening\s+(?:to|till|until)\b/i.test(t.quote)
    );
  return clocks.has(t.time) && new RegExp(`\\b${t.kind}\\b`, "i").test(t.quote);
}
export function isPhysicalLabelV3(name: string) {
  return !/^(?:(?:all|selected|participating)\s+(?:[\p{L}\d’' -]+\s+)?(?:outlets?|restaurants?|stores?|shacks?)|(?:eve of )?(?:public holidays?|ph)|dine[ -]?in(?: only)?|in[ -]?stores?|take[ -]?away(?: only)?|delivery(?: only)?)$/iu.test(
    name.trim(),
  );
}
/** Input is one unit; this validator has no access to full source or siblings. */
export function validateExtractionV3(
  unit: Pick<PropositionV3, "propositionQuote" | "supportingQuotes">,
  raw: unknown,
): ValidationV3 {
  const result: ValidationV3 = {
    structurallyValid: false,
    accepted: emptyExtractionV3(),
    issues: [],
  };
  const issue = (field: string, code: string) =>
    result.issues.push({ field, code });
  const parsed = rawExtractionSchemaV3.safeParse(raw);
  if (!parsed.success) {
    issue("output", "invalid_schema");
    return result;
  }
  result.structurallyValid = true;
  const d = parsed.data,
    spans = propositionEvidenceV3(unit);
  const exact = (field: string, q: string | null) => {
    if (!q?.trim()) {
      issue(field, "missing_evidence");
      return false;
    }
    if (!spans.some((s) => s.includes(q))) {
      issue(field, "quote_mismatch");
      return false;
    }
    return true;
  };
  if (
    (d.classification.value === "uncertain" &&
      d.classification.quote === null) ||
    exact("classification", d.classification.quote)
  )
    result.accepted.classification = d.classification;
  if (d.classification.value !== "promotion") {
    if (
      FACT_FIELDS_V3.some((f) => d[f].value !== null) ||
      d.timeConstraints.length ||
      d.locationRules.length ||
      d.constraints.length
    )
      issue("output", "classification_fact_incoherence");
    return result;
  }
  if (result.accepted.classification.value !== "promotion") return result;
  for (const f of FACT_FIELDS_V3) {
    const v = d[f];
    if (v.value === null) {
      if (v.quote !== null) issue(f, "null_value_with_evidence");
      continue;
    }
    if (!exact(f, v.quote)) continue;
    if (
      (f === "merchant" || f === "benefit") &&
      !v.quote!.includes(v.value as string)
    ) {
      issue(f, "value_not_in_quote");
      continue;
    }
    if (f === "startDate" || f === "endDate") {
      if (!isCalendarDate(d[f].value!)) {
        issue(f, "invalid_calendar_date");
        continue;
      }
      if (!new RegExp(`\\b${d[f].value!.slice(0, 4)}\\b`).test(v.quote!)) {
        issue(f, "unstated_year");
        continue;
      }
    }
    if (
      f === "weekdays" &&
      (d.weekdays.value!.some((n) => n < 1 || n > 7) ||
        new Set(d.weekdays.value).size !== d.weekdays.value!.length)
    ) {
      issue(f, "invalid_weekdays");
      continue;
    }
    Object.assign(result.accepted, { [f]: v });
  }
  if (
    result.accepted.startDate.value &&
    result.accepted.endDate.value &&
    result.accepted.startDate.value > result.accepted.endDate.value
  )
    for (const f of ["startDate", "endDate"] as const) {
      issue(f, "reversed_date_range");
      result.accepted[f] = { value: null, quote: null };
    }
  d.timeConstraints.forEach((t, i) => {
    if (exact(`timeConstraints.${i}`, t.quote)) {
      if (supportedTimeV3(t)) result.accepted.timeConstraints.push(t);
      else issue(`timeConstraints.${i}`, "unsupported_time_semantics");
    }
  });
  d.locationRules.forEach((r, i) => {
    const f = `locationRules.${i}`;
    if (!exact(f, r.quote)) return;
    if (
      new Set(r.names).size !== r.names.length ||
      r.names.some((n) => !r.quote.includes(n))
    )
      issue(f, "value_not_in_quote");
    else if (r.names.some((n) => !isPhysicalLabelV3(n)))
      issue(f, "nonphysical_location_label");
    else result.accepted.locationRules.push(r);
  });
  const pos = new Set(
    result.accepted.locationRules
      .filter((r) => r.role === "participating")
      .flatMap((r) => r.names),
  );
  const conflicts = new Set(
    result.accepted.locationRules
      .filter((r) => r.role === "excluded")
      .flatMap((r) => r.names)
      .filter((n) => pos.has(n)),
  );
  if (conflicts.size) {
    issue("locationRules", "conflicting_participation_roles");
    result.accepted.locationRules = result.accepted.locationRules.filter(
      (r) => !r.names.some((n) => conflicts.has(n)),
    );
  }
  if (
    result.accepted.locationScope.value === "named_outlets" &&
    !result.accepted.locationRules.some((r) => r.role === "participating")
  ) {
    issue("locationScope", "named_scope_without_participating_rule");
    result.accepted.locationScope = { value: null, quote: null };
  }
  d.constraints.forEach((c, i) => {
    const f = `constraints.${i}`;
    if (!exact(f, c.quote)) return;
    if (!c.quote.includes(c.text)) issue(f, "constraint_text_not_in_quote");
    else if (new Set(c.attributes).size !== c.attributes.length)
      issue(f, "duplicate_constraint_attribute");
    else result.accepted.constraints.push(c);
  });
  return result;
}
