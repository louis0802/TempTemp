import { normalizeSourceText, promotionTextEvidenceSchema } from "./schema";
import type { PromotionTextEvidence } from "./types";
import { hasFact, isCalendarDate, supportedHours } from "./validator";
import {
  ASSOCIATED_FIELDS_V2,
  emptyExtractionV2,
  rawPromotionExtractionSchemaV2,
  type RawPromotionExtractionV2,
} from "./schema-v2";

export const VALIDATOR_VERSION_V2 = "promotion-nlp-validator-v2";
export interface ValidationV2 {
  structurallyValid: boolean;
  accepted: RawPromotionExtractionV2;
  issues: { field: string; code: string }[];
}
/** Evidence-bound syntax checking does NOT prove proposition, polarity or scope entailment. */
export function validatePromotionExtractionV2(
  evidence: PromotionTextEvidence,
  raw: unknown,
): ValidationV2 {
  const result: ValidationV2 = {
    structurallyValid: false,
    accepted: emptyExtractionV2(),
    issues: [],
  };
  const issue = (field: string, code: string) =>
    result.issues.push({ field, code });
  const input = promotionTextEvidenceSchema.safeParse(evidence);
  if (!input.success) {
    issue("input", "invalid_source_evidence");
    return result;
  }
  const parsed = rawPromotionExtractionSchemaV2.safeParse(raw);
  if (!parsed.success) {
    issue("output", "invalid_schema");
    return result;
  }
  result.structurallyValid = true;
  const source = normalizeSourceText(input.data.text),
    data = parsed.data;
  const exact = (field: string, q: string | null, association = false) => {
    if (!q?.trim()) {
      issue(
        field,
        association ? "missing_association_evidence" : "missing_evidence",
      );
      return false;
    }
    if (!source.includes(q)) {
      issue(
        field,
        association ? "association_quote_mismatch" : "quote_mismatch",
      );
      return false;
    }
    return true;
  };
  const linked = (
    field: string,
    f: { quote: string | null; associationQuote: string | null },
  ) => {
    const fact = exact(field, f.quote);
    const association = exact(field, f.associationQuote, true);
    return fact && association;
  };
  if (
    data.classification.value === "uncertain" &&
    data.classification.quote === null
  )
    result.accepted.classification = data.classification;
  else if (exact("classification", data.classification.quote))
    result.accepted.classification = data.classification;
  if (data.classification.value === "non_promotion") {
    const present =
      data.primaryProposition.quote !== null ||
      hasFact(data.primaryProposition.title.value) ||
      hasFact(data.primaryProposition.benefit.value) ||
      hasFact(data.merchant.value) ||
      ASSOCIATED_FIELDS_V2.some((f) => hasFact(data[f].value)) ||
      data.locationRules.length > 0 ||
      data.restrictions.length > 0;
    if (present) issue("output", "non_promotion_facts");
    return result;
  }
  const emptyUncertain =
    data.classification.value === "uncertain" &&
    data.primaryProposition.quote === null &&
    !hasFact(data.primaryProposition.title.value) &&
    !hasFact(data.primaryProposition.benefit.value) &&
    !hasFact(data.merchant.value) &&
    !ASSOCIATED_FIELDS_V2.some((f) => hasFact(data[f].value)) &&
    !data.locationRules.length &&
    !data.restrictions.length;
  if (emptyUncertain) return result;
  const primary = exact("primaryProposition", data.primaryProposition.quote);
  if (!primary) {
    if (data.classification.value === "promotion")
      result.accepted.classification = { value: "uncertain", quote: null };
    return result;
  }
  result.accepted.primaryProposition.quote = data.primaryProposition.quote;
  for (const name of ["title", "benefit"] as const) {
    const f = data.primaryProposition[name];
    if (!hasFact(f.value) || !exact(`primaryProposition.${name}`, f.quote))
      continue;
    if (name === "benefit" && f.value !== f.quote) {
      issue(
        `primaryProposition.${name}`,
        "benefit_must_preserve_verbatim_clause",
      );
      continue;
    }
    result.accepted.primaryProposition[name] = f;
  }
  if (hasFact(data.merchant.value) && exact("merchant", data.merchant.quote)) {
    if (!data.merchant.quote!.includes(data.merchant.value!))
      issue("merchant", "value_not_in_quote");
    else result.accepted.merchant = data.merchant;
  }
  for (const name of ASSOCIATED_FIELDS_V2) {
    const f = data[name];
    if (!hasFact(f.value)) {
      if (f.quote !== null || f.associationQuote !== null)
        issue(name, "null_value_with_evidence");
      continue;
    }
    if (!linked(name, f)) continue;
    if (name === "startDate" || name === "endDate") {
      const date = data[name].value!;
      if (!isCalendarDate(date)) {
        issue(name, "invalid_calendar_date");
        continue;
      }
      if (!new RegExp(`\\b${date.slice(0, 4)}\\b`).test(f.quote!)) {
        issue(name, "unstated_year");
        continue;
      }
    }
    if (name === "weekdays") {
      const days = data.weekdays.value!;
      if (
        days.some((d) => d < 1 || d > 7) ||
        new Set(days).size !== days.length
      ) {
        issue(name, "invalid_weekdays");
        continue;
      }
    }
    if (name === "hours" && !supportedHours(data.hours.value!)) {
      issue(name, "unsupported_hours");
      continue;
    }
    Object.assign(result.accepted, { [name]: f });
  }
  if (
    result.accepted.startDate.value &&
    result.accepted.endDate.value &&
    result.accepted.startDate.value > result.accepted.endDate.value
  ) {
    for (const f of ["startDate", "endDate"] as const) {
      issue(f, "reversed_date_range");
      result.accepted[f] = { value: null, quote: null, associationQuote: null };
    }
  }
  data.locationRules.forEach((rule, i) => {
    const field = `locationRules.${i}`;
    if (!linked(field, rule)) return;
    if (
      new Set(rule.names).size !== rule.names.length ||
      rule.names.some((n) => !rule.quote!.includes(n))
    ) {
      issue(field, "value_not_in_quote");
      return;
    }
    result.accepted.locationRules.push(rule);
  });
  const positive = new Set(
    result.accepted.locationRules
      .filter((r) => r.role === "participating")
      .flatMap((r) => r.names),
  );
  const negative = new Set(
    result.accepted.locationRules
      .filter((r) => r.role === "excluded")
      .flatMap((r) => r.names),
  );
  const conflicts = new Set([...positive].filter((n) => negative.has(n)));
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
    result.accepted.locationScope = {
      value: null,
      quote: null,
      associationQuote: null,
    };
  }
  data.restrictions.forEach((r, i) => {
    const field = `restrictions.${i}`;
    if (!linked(field, r)) return;
    if (!r.quote!.includes(r.text)) {
      issue(field, "value_not_in_quote");
      return;
    }
    result.accepted.restrictions.push(r);
  });
  return result;
}
