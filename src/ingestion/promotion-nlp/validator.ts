import {
  extractionFields,
  normalizeSourceText,
  promotionTextEvidenceSchema,
  rawPromotionExtractionSchema,
} from "./schema";
import type {
  ExtractionField,
  PromotionTextEvidence,
  ValidatedPromotionExtraction,
} from "./types";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function supportedHours(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d\s*(?:–|-|to)\s*([01]\d|2[0-3]):[0-5]\d$/.test(
    value,
  );
}
export function hasFact(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !!value.trim();
  if (Array.isArray(value))
    return value.some((v) => typeof v !== "string" || !!v.trim());
  return true;
}
export function validatePromotionExtraction(
  evidence: PromotionTextEvidence,
  raw: unknown,
): ValidatedPromotionExtraction {
  const result: ValidatedPromotionExtraction = {
    classification: { value: "uncertain", quote: null },
    accepted: {},
    rejected: {},
    issues: [],
    structurallyValid: false,
  };
  const input = promotionTextEvidenceSchema.safeParse(evidence);
  if (!input.success) {
    result.issues.push({ field: "input", code: "invalid_source_evidence" });
    return result;
  }
  const parsed = rawPromotionExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    result.issues.push({
      field: "output",
      code: "malformed_structured_output",
    });
    return result;
  }
  result.structurallyValid = true;
  const text = normalizeSourceText(input.data.text),
    data = parsed.data;
  const reject = (name: ExtractionField | "classification", code: string) => {
    const f = data[name];
    const previous = result.rejected[name];
    result.rejected[name] = {
      value: f.value,
      quote: f.quote,
      reasons: [...(previous?.reasons ?? []), code],
    };
    if (name !== "classification") delete result.accepted[name];
    result.issues.push({ field: name, code });
  };
  const exactQuote = (name: ExtractionField | "classification") => {
    const q = data[name].quote;
    if (!q || !q.trim()) {
      reject(name, "rejected_missing_evidence");
      return false;
    }
    if (!text.includes(q)) {
      reject(name, "rejected_quote_mismatch");
      return false;
    }
    return true;
  };
  if (
    data.classification.value === "uncertain" &&
    data.classification.quote === null
  )
    result.classification = data.classification;
  else if (exactQuote("classification"))
    result.classification = data.classification;
  for (const name of extractionFields) {
    const f = data[name];
    // Only empty strings/list items are normalized; unsupported values are never repaired.
    if (typeof f.value === "string" && !f.value.trim())
      Object.assign(f, { value: null });
    if (Array.isArray(f.value))
      Object.assign(f, {
        value: f.value.filter((v) => typeof v !== "string" || !!v.trim()),
      });
    if (!hasFact(f.value)) continue;
    if (data.classification.value === "non_promotion") {
      reject(name, "rejected_non_promotion_fact");
      continue;
    }
    if (!exactQuote(name)) continue;
    // Field assignment is safe after the strict envelope parse.
    Object.assign(result.accepted, { [name]: f });
    if (
      (name === "startDate" || name === "endDate") &&
      typeof f.value === "string"
    ) {
      if (!isCalendarDate(f.value))
        reject(name, "rejected_invalid_calendar_date");
      else if (!new RegExp(`\\b${f.value.slice(0, 4)}\\b`).test(f.quote!))
        reject(name, "rejected_unstated_year");
    }
    if (name === "weekdays") {
      const days = data.weekdays.value!;
      if (
        days.some((d) => d < 1 || d > 7) ||
        new Set(days).size !== days.length
      )
        reject(name, "rejected_invalid_weekdays");
    }
    if (name === "hours" && !supportedHours(data.hours.value!))
      reject(name, "rejected_unsupported_hours");
    if (name === "locationNames") {
      const names = data.locationNames.value!;
      if (
        names.some((n) => !f.quote!.includes(n)) ||
        new Set(names).size !== names.length
      )
        reject(name, "rejected_value_not_in_source");
    }
    // Verbatim string-list contract; no semantic rewriting hidden behind a valid quote.
    if (
      (name === "eligibility" || name === "redemption" || name === "terms") &&
      data[name].value!.some((v) => !f.quote!.includes(v))
    )
      reject(name, "rejected_value_not_in_source");
    if (
      name === "locationScope" &&
      f.value === "all_outlets" &&
      (!explicitAllOutletWording(
        f.quote!,
        input.data.merchantHint,
        result.accepted.merchant?.value ?? null,
      ) ||
        /\b(?:selected|participating|except|excluding|excludes)\b/i.test(
          f.quote!,
        ))
    )
      reject(name, "rejected_all_outlets_without_explicit_wording");
  }
  if (
    result.accepted.startDate?.value &&
    result.accepted.endDate?.value &&
    result.accepted.startDate.value > result.accepted.endDate.value
  ) {
    reject("startDate", "rejected_reversed_date_range");
    reject("endDate", "rejected_reversed_date_range");
  }
  if (
    result.accepted.locationScope?.value === "named_outlets" &&
    !result.accepted.locationNames?.value?.length
  )
    reject("locationScope", "rejected_named_outlets_without_names");
  if (
    result.accepted.locationNames?.value?.length &&
    !["selected_outlets", "named_outlets"].includes(
      result.accepted.locationScope?.value ?? "",
    )
  )
    reject("locationNames", "rejected_location_scope_incoherent");
  return result;
}

/** Literal scope wording only; 'all items at outlets' must not prove all-outlet scope. */
function explicitAllOutletWording(
  quote: string,
  ...merchantNames: (string | null)[]
) {
  const names = merchantNames
    .filter((n): n is string => !!n)
    .map((n) => normalizeSourceText(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const merchant = names.length ? `(?:(?:${names.join("|")})\\s+)?` : "";
  return new RegExp(
    `\\ball\\s+(?:(?:of\\s+)?our\\s+)?${merchant}(?:Singapore\\s+)?(?:Restaurant\\s+)?(?:outlets|restaurants|stores|locations)\\b`,
    "i",
  ).test(quote);
}
