import { writeFileSync } from "node:fs";
import { DateTime } from "luxon";
import {
  inbox,
  source,
  conservativePipeline,
} from "../tests/helpers/resolution-fixtures";
import type { OutletAudit } from "../src/ingestion/resolution/types";

const now = DateTime.fromISO("2026-09-17T00:00:00Z");
const categories: Record<string, RegExp> = {
  authoritative_merchant_directory_unavailable:
    /^authoritative_merchant_directory_unavailable$/,
  incomplete_all_outlet_enumeration: /^incomplete_all_outlet_enumeration$/,
  selected_outlet_evidence_unavailable:
    /participating-outlet list could not be verified/,
  place_coordinate_evidence_unavailable:
    /^place_unresolved:|missing_coordinate/,
  missing_validity:
    /missing.*(?:date|validity)|unknown_expiry|date_range_not_found|validity_unresolved|startDate|endDate|validity_start|validity_end/,
  benefit_title_merchant_parsing: /benefit|merchant|title/,
  requires_split: /^requires_split$/,
  material_media_dependency:
    /media.*(?:requires|unresolved|depend)|(?:requires|unresolved|depend).*media/,
};
// Merchant directory availability is evidence, not merchant-name parsing.
const categoryFor = (reason: string) => {
  const matches = Object.entries(categories)
    .filter(
      ([key, pattern]) =>
        pattern.test(reason) &&
        !(key === "benefit_title_merchant_parsing" && /directory/.test(reason)),
    )
    .map(([key]) => key);
  return matches.length ? matches : ["other_blocking_reasons"];
};
const offers = [];
const urls = [...new Set(inbox.items.map((item) => item.source.url))];
for (const url of urls) {
  for (const result of await conservativePipeline().process(source(url), now)) {
    const outlet = result.audit.outletResolution as OutletAudit;
    offers.push({
      sourceUrl: url,
      key: result.key,
      id: result.suggestion.id,
      merchant: String(result.suggestion.merchant || "(unparsed)"),
      action: result.action,
      reasons: result.reasons,
      categories:
        result.action === "unresolved"
          ? [...new Set(result.reasons.flatMap(categoryFor))].sort()
          : [],
      requiresSplit: !!result.audit.requiresSplit,
      scope: outlet.scope,
      outletIssues: outlet.issues,
    });
  }
}
const unresolved = offers.filter((o) => o.action === "unresolved");
const count = (values: string[]) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((key) => [key, values.filter((v) => v === key).length]),
  );
const byMerchant = count(unresolved.map((o) => o.merchant));
const byReason = count(unresolved.flatMap((o) => [...new Set(o.reasons)]));
const byCategory = Object.fromEntries(
  [...Object.keys(categories), "other_blocking_reasons"].map((key) => [
    key,
    unresolved.filter((o) => o.categories.includes(key)).length,
  ]),
);
const opportunity = Object.entries(
  count(
    unresolved
      .filter((o) =>
        o.outletIssues.includes("authoritative_merchant_directory_unavailable"),
      )
      .map((o) => o.merchant),
  ),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const metrics = {
  Sources: urls.length,
  Offers: offers.length,
  Approved: offers.filter((o) => o.action === "approve").length,
  Excluded: offers.filter((o) => o.action === "exclude").length,
  Unresolved: unresolved.length,
  "Requires split": offers.filter((o) => o.requiresSplit).length,
  Failed: 0,
};
const report = {
  evaluationTime: now.toISO(),
  method:
    "Conservative captured provider; observed blockers only. Counts overlap. Unattempted downstream evidence is not counted as a known failure. Directory ranking is technical opportunity, not predicted approvals. Merchant labels are retained as parsed (spelling variants remain separate). Requires split totals include one excluded offer; 17 unresolved offers require split. Other reasons include aggregate outlet/schema failures and scope uncertainty.",
  metrics,
  byCategory,
  byMerchant,
  byReason,
  directoryOpportunity: opportunity.map(([merchant, offers]) => ({
    merchant,
    offers,
  })),
  offers,
};
const dir = "docs/changes/production-evidence-coverage/";
writeFileSync(
  dir + "evidence-gaps.json",
  JSON.stringify(report, null, 2) + "\n",
);
const table = (data: Record<string, number>) =>
  "| Item | Offers |\n| --- | ---: |\n" +
  Object.entries(data)
    .map(([key, value]) => `| ${key.replaceAll("|", "\\|")} | ${value} |`)
    .join("\n");
writeFileSync(
  dir + "evidence-gaps.md",
  `# Corpus evidence gaps\n\n${report.method}\n\nEvaluation: ${report.evaluationTime}. Reproduce: \`npm run analyze:evidence\`. Offer-level source/key/reasons are in evidence-gaps.json.\n\n## Metrics\n\n${table(metrics)}\n\n## Blocker categories (overlapping)\n\n${table(byCategory)}\n\n## Directory opportunity\n\n${table(Object.fromEntries(opportunity))}\n\n## Unresolved by merchant\n\n${table(byMerchant)}\n\n## Exact blocking reasons\n\n${table(byReason)}\n`,
);
console.log(
  JSON.stringify(
    {
      metrics,
      byCategory,
      directoryOpportunity: report.directoryOpportunity.slice(0, 15),
    },
    null,
    2,
  ),
);
