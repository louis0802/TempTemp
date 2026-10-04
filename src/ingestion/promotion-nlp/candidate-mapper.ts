import type { DirectSourceContext } from "../direct-sources/adapter";
import {
  cite,
  finalizeCandidate,
  newCandidate,
} from "../direct-sources/candidate";
import type { FactField } from "../direct-sources/types";
import {
  emptyExtraction,
  normalizeSourceText,
  promotionTextEvidenceSchema,
} from "./schema";
import type {
  PromotionTextEvidence,
  ValidatedPromotionExtraction,
} from "./types";
import { validatePromotionExtraction } from "./validator";

/** Existing grouped provenance supports one quote: take a literal covering source span. */
export function coveringQuote(text: string, quotes: string[]): string {
  const source = normalizeSourceText(text),
    unique = [...new Set(quotes)];
  if (!unique.length || unique.some((q) => !q || !source.includes(q)))
    throw new Error("invalid_provenance_quote");
  const starts = unique.map((q) => source.indexOf(q));
  return source.slice(
    Math.min(...starts),
    Math.max(...unique.map((q, i) => starts[i] + q.length)),
  );
}
export function mapPromotionNlpCandidate(
  evidence: PromotionTextEvidence,
  validated: ValidatedPromotionExtraction,
  ctx: DirectSourceContext,
) {
  const input = promotionTextEvidenceSchema.parse(evidence);
  if (ctx.source.id !== input.sourceId)
    throw new Error("nlp_candidate_source_mismatch");
  const page = ctx.http.capturedPages.find(
    (p) =>
      p.evidence.id === input.evidenceId &&
      p.evidence.sourceId === input.sourceId,
  );
  if (!page) throw new Error("nlp_candidate_evidence_missing");
  const reconstructed = {
    ...emptyExtraction(),
    ...validated.accepted,
    classification: validated.classification,
  };
  const checked = validatePromotionExtraction(input, reconstructed);
  if (checked.classification.value === "non_promotion") return null;
  const c = newCandidate(
    {
      canonicalUrl: input.canonicalUrl,
      listingUrl: page.evidence.url,
      nativeId: input.nativeId,
      title: null,
      evidenceId: input.evidenceId,
      relation: "detail",
      metadata: { merchant: null, description: null, selector: input.selector },
    },
    ctx,
    [page],
  );
  c.issues.push(
    "promotion_nlp_research_only",
    ...validated.issues.map((i) => `nlp_${i.field}:${i.code}`),
    ...checked.issues.map((i) => `nlp_${i.field}:${i.code}`),
  );
  if (!validated.structurallyValid) c.issues.push("nlp_malformed_output");
  if (checked.classification.value === "uncertain")
    c.issues.push("nlp_classification_uncertain");
  const fields = checked.accepted;
  const put = (name: FactField, quote: string) =>
    cite(c, name, input.evidenceId, input.selector, quote);
  c.description = normalizeSourceText(input.text);
  put("description", c.description);
  // Registry context is explicit, separate from model evidence. Never let it derive validity.
  c.merchant = ctx.source.publicationPolicy.merchant;
  cite(
    c,
    "merchant",
    input.evidenceId,
    "registry.publicationPolicy.merchant (trusted configuration context)",
    c.merchant,
  );
  if (fields.merchant?.value) {
    if (
      normalizeSourceText(fields.merchant.value).toLowerCase() !==
      normalizeSourceText(c.merchant).toLowerCase()
    )
      c.issues.push(`nlp_merchant_conflict:${fields.merchant.value}`);
    else put("merchant", fields.merchant.quote!);
  }
  for (const name of [
    "title",
    "benefit",
    "weekdays",
    "hours",
    "eligibility",
    "redemption",
    "terms",
  ] as const) {
    const f = fields[name];
    if (f?.value !== null && f?.value !== undefined) {
      Object.assign(c, { [name]: f.value });
      put(name, f.quote!);
    }
  }
  c.startDate = fields.startDate?.value ?? null;
  c.endDate = fields.endDate?.value ?? null;
  const dates = [fields.startDate, fields.endDate]
    .filter((f) => f?.value && f.quote)
    .map((f) => f!.quote!);
  if (dates.length) put("validity", coveringQuote(input.text, dates));
  c.locationScope = fields.locationScope?.value ?? "source_unspecified";
  c.locationNames = fields.locationNames?.value ?? [];
  const locations = [
    fields.locationScope,
    fields.locationNames,
    fields.locationWording,
  ]
    .filter((f) => f?.quote)
    .map((f) => f!.quote!);
  if (locations.length) {
    const quote = coveringQuote(input.text, locations);
    c.locationWording = fields.locationWording?.value ?? quote;
    put("locations", quote);
  }
  if (c.locationScope === "selected_outlets" && !c.locationNames.length)
    c.issues.push("selected_outlets_unresolved");
  return finalizeCandidate(c);
}
