import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  inbox,
  source,
  conservativePipeline,
} from "../tests/helpers/resolution-fixtures";
import { PapisOutletProvider } from "../src/ingestion/resolution/papis-directory";
import { ResolutionCache } from "../src/ingestion/resolution/cache";
import { promotionSchema, publicationIssues } from "../src/domain/promotion";
import type {
  OutletAudit,
  ProcessingResult,
} from "../src/ingestion/resolution/types";
const html = readFileSync("tests/fixtures/resolution/papis-home.html", "utf8");
const now = DateTime.fromISO("2026-09-17T00:00:00Z");
const captureTime = Date.parse("2026-09-20T15:33:49Z");
const provider = () =>
  new PapisOutletProvider(
    new ResolutionCache(() => captureTime),
    async () => new Response(html),
  );
const urls = [...new Set(inbox.items.map((item) => item.source.url))];
const totals = () => ({
  Sources: urls.length,
  Offers: 0,
  Approved: 0,
  Excluded: 0,
  Unresolved: 0,
  "Requires split": 0,
  Failed: 0,
});
const before = totals(),
  after = totals();
function tally(
  metrics: ReturnType<typeof totals>,
  results: ProcessingResult[],
) {
  for (const result of results) {
    metrics.Offers++;
    metrics[
      result.action === "approve"
        ? "Approved"
        : result.action === "exclude"
          ? "Excluded"
          : "Unresolved"
    ]++;
    if (result.audit.requiresSplit) metrics["Requires split"]++;
    if (result.action === "approve") {
      assert.deepEqual(
        publicationIssues(promotionSchema.parse(result.promotion)),
        [],
      );
      const audit = result.audit.outletResolution as OutletAudit;
      assert.equal(audit.complete, true);
      assert.deepEqual(audit.issues, []);
      assert.ok(
        audit.included.every(
          (b) =>
            b.existenceEvidence.length &&
            b.participationEvidence.length &&
            b.coordinateEvidence.length,
        ),
      );
    }
  }
}
const changes = [];
for (const url of urls) {
  const input = source(url);
  const baseline = await conservativePipeline().process(input, now);
  const added = await conservativePipeline([provider()]).process(input, now);
  assert.deepEqual(
    added,
    await conservativePipeline([provider()]).process(input, now),
  );
  tally(before, baseline);
  tally(after, added);
  assert.equal(baseline.length, added.length);
  for (let i = 0; i < added.length; i++) {
    assert.equal(baseline[i].suggestion.id, added[i].suggestion.id);
    if (JSON.stringify(baseline[i]) !== JSON.stringify(added[i])) {
      changes.push({
        sourceUrl: url,
        key: added[i].key,
        merchant: added[i].suggestion.merchant,
        before: baseline[i].action,
        after: added[i].action,
        classificationChanged: baseline[i].action !== added[i].action,
        oldReasons: baseline[i].reasons,
        newReasons: added[i].reasons,
        directoryAudit: (added[i].audit.outletResolution as OutletAudit)
          .directoryAudit,
        evidence: (added[i].audit.outletResolution as OutletAudit)
          .directorySource,
      });
    }
  }
}
const report = {
  method:
    "Offline evidence-coverage sensitivity comparison, not a historical production replay: the 20 September captured official Papi directory is applied to corpus evaluation on 17 September. Coordinates deliberately unavailable; no historical availability or real approval inferred.",
  before,
  after,
  classificationChanges: changes.filter((c) => c.classificationChanged),
  evidenceChanges: changes,
};
const path = "docs/changes/production-evidence-coverage/provider-comparison";
writeFileSync(path + ".json", JSON.stringify(report, null, 2) + "\n");
writeFileSync(
  path + ".md",
  `# Captured provider comparison\n\n${report.method}\n\nReproduce: \`npm run compare:evidence\`.\n\nMetrics before/after: \`${JSON.stringify(before)}\` / \`${JSON.stringify(after)}\`.\n\nClassification changes: ${report.classificationChanges.length}. Evidence changes: ${changes.length}.\n\n` +
    changes
      .map(
        (c) =>
          `- ${c.sourceUrl} (${c.merchant}): ${c.before} → ${c.after}. Official directory now establishes ${c.directoryAudit.officialCount} branches. Remaining reasons: ${c.newReasons.join("; ")}.`,
      )
      .join("\n") +
    "\n",
);
console.log(JSON.stringify(report, null, 2));
