import type { DirectAudit } from "./model";
const cell = (v: unknown) =>
  String(v ?? "")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]/g, " ");
const list = (
  rows: DirectAudit["records"],
  describe: (r: DirectAudit["records"][number]) => string,
) =>
  rows.length
    ? rows
        .map(
          (r) =>
            `- [${r.candidate_domain}](${r.candidate_url}) (${r.channel}/${r.telegram_message_id}; ${r.signal_id}): ${describe(r)}`,
        )
        .join("\n")
    : "None observed.";
export function markdownReport(a: DirectAudit) {
  const r = a.records;
  return `# Direct-source candidate audit

## 1. Scope and provenance

Research-only observations of resolved offer-associated merchant, issuer/platform and app candidates. Social, publisher, Telegram/hub and unresolved records are excluded. One record per exact signal ID + candidate URL. Hints remain uncorrected; independent source facts are recorded separately. Source-origin evidence is immutable; no resolution, collection, OCR, private API, production adapter, DB write or monitor occurs here.

Input: ${a.provenance.input_file} (SHA-256 ${a.provenance.input_sha256}). Evidence: ${a.provenance.evidence_file} (SHA-256 ${a.provenance.evidence_sha256}). Capture times and retrieval methods are in audit.json. Live observations may differ from the original Telegram offer. A failed client request does not establish a login requirement or permanent source outage. Complete original records and indexes are retained in candidates.json and audit.json.

\`\`\`json
${JSON.stringify(a.summary, null, 2)}
\`\`\`

## 2. Candidate inventory

| Channel / message | Signal | Hint | Candidate | Ownership | Enumerable | Extraction | Pattern |
| --- | --- | --- | --- | --- | --- | --- | --- |
${r.map((x) => `| ${x.channel}/${x.telegram_message_id} | ${x.signal_id} | ${cell(x.offer_hint)} | [${x.candidate_domain}](${x.candidate_url}) | ${x.ownership_status} | ${x.enumerable} | ${x.extraction_feasibility} | ${x.adapter_pattern_key} |`).join("\n")}

## 3. Authority verification

${list(r, (x) => `${x.source_role}; ownership ${x.ownership_status} (${x.ownership_confidence}); direct_source_verified=${x.direct_source_verified}. ${x.ownership_evidence.map((e) => `${e.evidence_id}: ${e.observation}`).join("; ") || "No explicit ownership evidence."}`)}

Ownership is research evidence, never copied to the production merchant registry. A self-branded hostname alone is insufficient for verified ownership.

## 4. Enumerability findings

${list(r, (x) => `${x.enumerable}; ${x.enumeration_method}. Boundary: ${x.enumeration_boundary}. Pagination: ${x.pagination_type}. Exact offer discoverable without signal: ${x.offer_discoverable_without_signal}. ${x.enumeration_evidence.map((e) => `${e.evidence_id}: ${e.observation}`).join("; ")}`)}

Yes/partial reflect observed acquisition surfaces within the recorded boundary, not completeness of every promotion or participating outlet. Extraction and enumeration are independent.

## 5. Extraction feasibility

${list(
  r,
  (x) =>
    `${x.extraction_feasibility}; formats ${x.formats.join(", ")}; ${[
      "merchant",
      "benefit",
      "start_date",
      "end_date",
      "location",
      "eligibility",
      "redemption",
      "terms",
    ]
      .map((k) => {
        const f = x[(k + "_field") as "merchant_field"];
        return `${k}: ${f.availability} (${f.observation})`;
      })
      .join(
        "; ",
      )}. JS/login/app: ${x.requires_js}/${x.requires_login}/${x.requires_app}; blocked: ${x.blocked_or_inaccessible}.`,
)}

Field availability records observed deterministic text/structure, not parsed production facts. Unknown/absent/image-only dates never become invented validity. No OCR was used.

## 6. App/deep-link findings

${list(
  r.filter((x) => x.app_findings),
  (x) => JSON.stringify(x.app_findings),
)}

## 7. Issuer/platform findings

${list(
  r.filter((x) => x.destination_class === "issuer_or_platform_candidate"),
  (x) =>
    `${x.source_surface_type}; ${x.enumeration_method}; ${x.enumeration_boundary}. ${x.review_reasons.join("; ")}`,
)}

## 8. Reusable adapter patterns

| Adapter pattern | Candidate count | Distinct domains | Enumerable candidates (yes + partial) | Extraction feasibility | Representative sources |
| --- | ---: | --- | ---: | --- | --- |
${a.patterns.map((p) => `| ${p.adapter_pattern} | ${p.candidate_count} | ${p.distinct_domains.join(", ")} | ${p.enumerable_candidates} | ${cell(JSON.stringify(p.extraction_feasibility))} | ${p.representative_sources.map((u) => `[${new URL(u).hostname}](${u})`).join(", ")} |`).join("\n")}

Counts are observations, with unique domain-pattern counts separate from repeated offers. No scoring or ranking is applied. A reusable mechanism on one domain is not proof of cross-domain compatibility.

${a.recommendations.map((x) => `- **${x.pattern}**: ${x.rationale} Conditions/limits: ${x.limitations}`).join("\n") || "No family recommendation supported yet."}

## 9. Sources that are evidence-only but not enumerable

${list(
  r.filter((x) => x.enumerable === "no"),
  (x) => `${x.source_surface_type}; ${x.enumeration_boundary}`,
)}

Evidence-only sampled objects on sources with a separate acquisition surface:

${list(
  r.filter(
    (x) =>
      x.offer_discoverable_without_signal === "no" &&
      ["yes", "partial"].includes(x.enumerable),
  ),
  (x) =>
    `${x.source_surface_type}; sampled URL is absent from the inspected current index. ${x.enumeration_boundary}`,
)}

Unassessed acquisition (kept separate from evidence-only conclusions):

${list(
  r.filter((x) => x.enumerable === "unknown"),
  (x) => x.review_reasons.join("; "),
)}

## 10. Sources that appear suitable for direct monitoring

${list(
  r.filter((x) => ["yes", "partial"].includes(x.enumerable)),
  (x) =>
    `${x.adapter_pattern_key}; ${x.enumeration_boundary}; ownership ${x.ownership_status}; ${x.review_reasons.join("; ")}`,
)}

Related public app/platform discovery surfaces (separate from the candidate counts and sampled offer identity):

${list(
  r.filter(
    (x) =>
      x.app_findings &&
      x.app_findings.public_listing_endpoint.startsWith("https://"),
  ),
  (x) => x.app_findings!.public_listing_endpoint,
)}

Suitability is a research conclusion with the stated authority/extraction limitations; no monitor or adapter has been started or built.

## 11. Open questions / manual follow-up

${list(
  r.filter((x) => x.review_reasons.length),
  (x) => x.review_reasons.join("; "),
)}
`;
}
export function csvReport(a: DirectAudit) {
  const keys = Object.keys(a.records[0] ?? { signal_id: "" });
  const quote = (v: unknown) => {
    let s =
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
    if (/^[=+@-]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return (
    [
      keys.map(quote).join(","),
      ...a.records.map((r) =>
        keys.map((k) => quote(r[k as keyof typeof r])).join(","),
      ),
    ].join("\n") + "\n"
  );
}
