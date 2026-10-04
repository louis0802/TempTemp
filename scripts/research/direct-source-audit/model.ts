import { z } from "zod";
import type { AuditRecord, AuditResult } from "../source-origin-audit/types";

export const directClasses = new Set([
  "merchant_web_candidate",
  "issuer_or_platform_candidate",
  "app_or_deep_link",
]);
export interface Candidate {
  signal_id: string;
  merchant_hint: string;
  offer_hint: string;
  channel: string;
  telegram_message_id: number;
  telegram_url: string;
  candidate_url: string;
  candidate_domain: string;
  destination_class: AuditRecord["destination_class"];
  adapter_family: AuditRecord["adapter_family"];
  source_origin_records: { index: number; record: AuditRecord }[];
}
export function selectCandidates(input: AuditResult): Candidate[] {
  const selected = new Map<string, Candidate>();
  input.records.forEach((record, index) => {
    if (
      record.signal_class !== "promotion_signal" ||
      record.association !== "offer" ||
      record.resolution_status !== "resolved" ||
      !directClasses.has(record.destination_class)
    )
      return;
    // Require corrected input: never independently resolve or infer a destination.
    const url = record.canonical_candidate_url;
    if (!url) return;
    const key = JSON.stringify([record.signal_id, url]);
    const previous = selected.get(key);
    if (previous) {
      previous.source_origin_records.push({ index, record });
      return;
    }
    selected.set(key, {
      signal_id: record.signal_id,
      merchant_hint: record.merchant_hint,
      offer_hint: [record.title_hint, record.benefit_hint]
        .filter(Boolean)
        .join(" — "),
      channel: record.channel,
      telegram_message_id: record.telegram_message_id,
      telegram_url: record.telegram_url,
      candidate_url: url,
      candidate_domain: record.candidate_domain!,
      destination_class: record.destination_class,
      adapter_family: record.adapter_family,
      source_origin_records: [{ index, record }],
    });
  });
  return [...selected.values()].sort(
    (a, b) =>
      a.signal_id.localeCompare(b.signal_id) ||
      a.candidate_url.localeCompare(b.candidate_url),
  );
}
const observation = z.enum(["yes", "no", "unknown"]);
const field = z
  .object({
    availability: z.enum([
      "present",
      "partial",
      "absent",
      "image_only",
      "unknown",
    ]),
    observation: z.string().min(1),
  })
  .strict();
const reference = z
  .object({ evidence_id: z.string().min(1), observation: z.string().min(1) })
  .strict();
export const findingSchema = z
  .object({
    candidate_url: z.url(),
    ownership_status: z
      .enum(["verified", "probable", "unverified", "contradicted"])
      .default("unverified"),
    ownership_evidence: z.array(reference).default([]),
    ownership_confidence: z
      .enum(["established", "tentative", "unknown"])
      .default("unknown"),
    source_role: z
      .enum([
        "merchant_official",
        "issuer_official",
        "platform_official",
        "merchant_affiliated",
        "unknown",
      ])
      .default("unknown"),
    source_surface_type: z.string().default("unassessed"),
    direct_source_verified: z.boolean().default(false),
    enumerable: z.enum(["yes", "partial", "no", "unknown"]).default("unknown"),
    enumeration_method: z.string().default("not established"),
    enumeration_boundary: z.string().default("not established"),
    enumeration_evidence: z.array(reference).default([]),
    pagination_type: z.string().default("unknown"),
    offer_discoverable_without_signal: observation.default("unknown"),
    extraction_feasibility: z
      .enum([
        "structured",
        "semi_structured",
        "free_text",
        "image_only",
        "app_only",
        "inaccessible",
        "unassessed",
      ])
      .default("unassessed"),
    formats: z
      .array(
        z.enum([
          "HTML",
          "JSON-LD",
          "embedded JSON",
          "API",
          "PDF",
          "image",
          "app deep link",
        ]),
      )
      .default([]),
    merchant_field: field,
    benefit_field: field,
    start_date_field: field,
    end_date_field: field,
    location_field: field,
    eligibility_field: field,
    redemption_field: field,
    terms_field: field,
    requires_js: observation.default("unknown"),
    requires_login: observation.default("unknown"),
    requires_app: observation.default("unknown"),
    blocked_or_inaccessible: observation.default("unknown"),
    reusable_pattern: observation.default("unknown"),
    adapter_pattern_key: z.string().default("unassessed"),
    pattern_evidence: z.array(reference).default([]),
    app_findings: z
      .object({
        corresponding_web_campaign: observation,
        metadata_before_launch: z.string(),
        stable_campaign_identifier: z.string().nullable(),
        public_listing_endpoint: z.string(),
        authentication: z.string(),
        acquisition_role: z.enum(["evidence_only", "enumerable", "unknown"]),
      })
      .strict()
      .nullable()
      .default(null),
    review_status: z
      .enum(["reviewed", "needs_follow_up"])
      .default("needs_follow_up"),
    review_reasons: z.array(z.string()).default([]),
    evidence_ids: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((f, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      f.ownership_status === "verified" &&
      (!f.ownership_evidence.length || f.ownership_confidence !== "established")
    )
      issue(
        "Verified ownership requires explicit evidence and established confidence",
      );
    if (f.direct_source_verified && f.ownership_status !== "verified")
      issue("Verified direct source requires verified ownership");
    if (
      ["merchant_official", "issuer_official", "platform_official"].includes(
        f.source_role,
      ) &&
      f.ownership_status !== "verified"
    )
      issue("Official role requires verified ownership");
    if (
      ["yes", "partial"].includes(f.enumerable) &&
      !f.enumeration_evidence.length
    )
      issue("Enumeration requires observed listing evidence");
    if (
      f.extraction_feasibility === "app_only" &&
      f.enumerable === "yes" &&
      f.app_findings?.acquisition_role !== "enumerable"
    )
      issue("App-only cannot imply enumerable web");
    if (f.reusable_pattern === "yes" && !f.pattern_evidence.length)
      issue("Reusable pattern requires evidence");
  });
export const evidenceBundleSchema = z
  .object({
    version: z.literal(1),
    captures: z.array(
      z
        .object({
          id: z.string().min(1),
          url: z.url(),
          retrieved_at: z.string(),
          method: z.string(),
          status: z.number().int().nullable(),
          content_sha256: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
          artifact: z.string().nullable(),
          observation: z.string().min(1),
        })
        .strict(),
    ),
    findings: z.array(findingSchema),
    recommendations: z
      .array(
        z
          .object({
            pattern: z.string(),
            rationale: z.string(),
            limitations: z.string(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .superRefine((bundle, ctx) => {
    const ids = new Set(bundle.captures.map((c) => c.id));
    if (ids.size !== bundle.captures.length)
      ctx.addIssue({ code: "custom", message: "Duplicate evidence ID" });
    if (
      new Set(bundle.findings.map((f) => f.candidate_url)).size !==
      bundle.findings.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate finding URL" });
    for (const f of bundle.findings) {
      if (f.ownership_status === "verified") {
        for (const reference of f.ownership_evidence) {
          const capture = bundle.captures.find(
            (c) => c.id === reference.evidence_id,
          );
          if (
            capture &&
            (capture.status === null ||
              capture.status < 200 ||
              capture.status >= 300)
          )
            ctx.addIssue({
              code: "custom",
              message:
                "Verified ownership cannot rely on inaccessible evidence",
            });
        }
      }
      const refs = [
        ...f.evidence_ids,
        ...[
          ...f.ownership_evidence,
          ...f.enumeration_evidence,
          ...f.pattern_evidence,
        ].map((e) => e.evidence_id),
      ];
      for (const id of refs)
        if (!ids.has(id))
          ctx.addIssue({ code: "custom", message: `Missing evidence ${id}` });
    }
  });
export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
export type Finding = z.infer<typeof findingSchema>;
export function defaultFinding(url: string): Finding {
  const unknown = {
    availability: "unknown",
    observation: "No captured field assessment",
  };
  return findingSchema.parse({
    candidate_url: url,
    merchant_field: unknown,
    benefit_field: unknown,
    start_date_field: unknown,
    end_date_field: unknown,
    location_field: unknown,
    eligibility_field: unknown,
    redemption_field: unknown,
    terms_field: unknown,
    review_reasons: ["no_captured_assessment"],
  });
}
export function tally(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((k) => [k, values.filter((v) => v === k).length]),
  );
}
export function buildAudit(
  candidates: Candidate[],
  evidence: EvidenceBundle,
  provenance: {
    input_file: string;
    input_sha256: string;
    evidence_file: string;
    evidence_sha256: string;
  },
) {
  const findings = new Map(evidence.findings.map((f) => [f.candidate_url, f]));
  const records = candidates.map((c) => {
    const finding =
      findings.get(c.candidate_url) ?? defaultFinding(c.candidate_url);
    const extractable_fields = Object.entries(finding)
      .filter(
        ([k, v]) =>
          k.endsWith("_field") &&
          typeof v === "object" &&
          v &&
          "availability" in v &&
          ["present", "partial"].includes(v.availability),
      )
      .map(([k]) => k.replace(/_field$/, ""));
    return { ...c, ...finding, extractable_fields };
  });
  const patterns = [...new Set(records.map((r) => r.adapter_pattern_key))]
    .sort()
    .map((key) => {
      const rows = records.filter((r) => r.adapter_pattern_key === key);
      return {
        adapter_pattern: key,
        candidate_count: rows.length,
        distinct_domains: [
          ...new Set(rows.map((r) => r.candidate_domain)),
        ].sort(),
        enumerable_candidates: rows.filter(
          (r) => r.enumerable === "yes" || r.enumerable === "partial",
        ).length,
        extraction_feasibility: tally(
          rows.map((r) => r.extraction_feasibility),
        ),
        representative_sources: [
          ...new Set(rows.map((r) => r.candidate_url)),
        ].sort(),
      };
    });
  const statusCounts = tally(records.map((r) => r.enumerable));
  return {
    version: 1 as const,
    provenance,
    summary: {
      candidate_count: records.length,
      distinct_signal_count: new Set(records.map((r) => r.signal_id)).size,
      distinct_domain_count: new Set(records.map((r) => r.candidate_domain))
        .size,
      verified_authority_count: records.filter(
        (r) => r.ownership_status === "verified",
      ).length,
      ownership_status_counts: tally(records.map((r) => r.ownership_status)),
      enumerable_yes_count: statusCounts.yes ?? 0,
      enumerable_partial_count: statusCounts.partial ?? 0,
      enumerable_no_count: statusCounts.no ?? 0,
      enumerable_unknown_count: statusCounts.unknown ?? 0,
      extraction_feasibility_counts: tally(
        records.map((r) => r.extraction_feasibility),
      ),
      extraction_structured_count: records.filter(
        (r) => r.extraction_feasibility === "structured",
      ).length,
      extraction_semi_structured_count: records.filter(
        (r) => r.extraction_feasibility === "semi_structured",
      ).length,
      extraction_free_text_count: records.filter(
        (r) => r.extraction_feasibility === "free_text",
      ).length,
      inaccessible_count: records.filter(
        (r) => r.extraction_feasibility === "inaccessible",
      ).length,
      adapter_pattern_counts: tally(records.map((r) => r.adapter_pattern_key)),
      reusable_pattern_counts: tally(records.map((r) => r.reusable_pattern)),
      domain_pattern_counts: tally([
        ...new Map(
          records.map((r) => [
            JSON.stringify([r.candidate_domain, r.adapter_pattern_key]),
            r.adapter_pattern_key,
          ]),
        ).values(),
      ]),
      reusable_domain_pattern_counts: tally([
        ...new Map(
          records
            .filter((r) => r.reusable_pattern === "yes")
            .map((r) => [
              JSON.stringify([r.candidate_domain, r.adapter_pattern_key]),
              r.adapter_pattern_key,
            ]),
        ).values(),
      ]),
    },
    patterns,
    records,
    evidence: evidence.captures,
    recommendations: evidence.recommendations,
  };
}
export type DirectAudit = ReturnType<typeof buildAudit>;
