import type { AuditResult } from "./types";
const cell = (value: unknown) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]/g, " ");
function table(values: Record<string, number>) {
  return [
    "| Pattern | Count |",
    "| --- | ---: |",
    ...Object.entries(values).map(
      ([key, count]) => `| ${cell(key)} | ${count} |`,
    ),
  ].join("\n");
}
export function markdownReport(audit: AuditResult) {
  const s = audit.summary;
  const scalar = Object.fromEntries(
    Object.entries(s).filter(([, v]) => typeof v === "number"),
  ) as Record<string, number>;
  return `# Telegram signal → source-origin audit

Input mode: **${audit.provenance.input_mode}**. Research only; Telegram / publishers / social = signals. Direct merchant / issuer sources = production evidence candidates.

More info URL ≠ necessarily original source. Resolution success ≠ authority verification.

## Sample and resolution

${table(scalar)}

A promotion signal is a parsed offer with promotional benefit or explicit promotional intent; it is not a verified promotion. Multi-offer posts can produce multiple signals. Non-offers are retained below and excluded from promotion-origin counts. Shortlink counts are unique original URLs. Candidate/publisher/failure counts are distinct signals and can overlap when a signal has several links. Destination, adapter, domain and candidate/failure counts use offer-associated links only; neighboring source-post links remain context in the records. Concentration counts distinct signals within each family. Domains count successful offer-associated link records; unique URL counts also appear below.

## adapter_family_concentration

${table(s.adapter_family_concentration)}

These are unweighted observations for subsequent adapter engineering. Candidate families still require ownership, offer relevance and source-specific extraction review. Publisher frequency determines whether a later bounded publisher-outbound extraction phase is useful. No article bodies were inspected or merchant origin hops invented.

## Adapter family counts

${table(s.adapter_family_counts)}

## Destination class counts

${table(s.destination_class_counts)}

## Meaningful candidate domains (resolved_domain_counts)

${table(s.resolved_domain_counts)}

## Transport final domains (diagnostics only)

${table(s.transport_final_domain_counts)}

The exact resolver final URL remains in resolved_url and transport_final_url. canonical_candidate_url identifies the meaningful observed source. Only supported adjacent social content → Facebook unsupportedbrowser transitions recover a prior URL; fallback without a recognized prior has no candidate. All redirect hops remain unchanged. Transport fallback is not a Facebook source identity.

Unique resolved domains: ${s.unique_resolved_domains.length}.

## Domains by unique original URLs

${table(s.unique_url_domain_counts)}

## Repeated domains

${table(s.repeated_domain_counts)}

## Signal and origin records

| Channel / message | Signal class | Merchant / title hint | Association | Destination | Adapter family | Authority / origin status | Origin chain | Review reasons |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${audit.records.map((r) => `| ${cell(`${r.channel}/${r.telegram_message_id}`)} | ${r.signal_class} | ${cell(`${r.merchant_hint} / ${r.title_hint}`)} | ${r.association ?? "none"} | ${r.destination_class} | ${r.adapter_family} | ${r.authority} / ${r.source_origin_status} | ${cell(r.origin_chain.map((n) => n.url).join(" → "))} | ${cell(r.manual_review_reasons.join(", "))} |`).join("\n")}

## Limits and boundaries

Sample shortfall: ${s.sample_shortfall}. Ordinary unregistered HTTP destinations are provisional merchant web candidates, not confirmed merchant identity. Social and app topology cannot establish official ownership. A publisher or hub is intermediate even after successful redirects; publisher_requires_deeper_resolution remains explicit. Failed redirects retain the full attempted chain and reason. App schemes blocked by the existing HTTP resolver stay unresolved.

Enumeration and extraction feasibility were not assessed: redirect resolution reads no response body. Research authority reviews are scoped to merchant/host/account/path and never copied to production. Link association and parser issues remain visible. Frozen inputs and review/cache provenance permit replay. No production ingestion, database operation, monitor or worker start, commit or push is part of this command.
`;
}
export function csvReport(audit: AuditResult) {
  const keys = Object.keys(audit.records[0] ?? { signal_id: "" });
  const quote = (value: unknown) => {
    let text =
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? "");
    if (/^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return (
    [
      keys.map(quote).join(","),
      ...audit.records.map((r) =>
        keys.map((key) => quote(r[key as keyof typeof r])).join(","),
      ),
    ].join("\n") + "\n"
  );
}
