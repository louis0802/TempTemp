import { it, expect } from "vitest";
import { DateTime } from "luxon";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
import { digest } from "@/ingestion/resolution/cache";
import type { OutletAudit } from "@/ingestion/resolution/types";
import {
  inbox,
  source,
  conservativePipeline,
} from "../helpers/resolution-fixtures";

it("audits all 136 original sources deterministically without cross-offer leakage", async () => {
  const urls = [...new Set(inbox.items.map((item) => item.source.url))];
  expect(urls).toHaveLength(136);
  const metrics = {
    Sources: urls.length,
    Offers: 0,
    Approved: 0,
    Excluded: 0,
    Unresolved: 0,
    "Requires split": 0,
    Failed: 0,
  };
  const failures: string[] = [];
  const now = DateTime.fromISO("2026-09-17T00:00:00Z");
  for (const url of urls) {
    try {
      const input = source(url);
      const results = await conservativePipeline().process(input, now);
      // A fresh pipeline/cache must reproduce the entire result, not only its action.
      expect(results, url).toEqual(
        await conservativePipeline().process(input, now),
      );
      expect(results.length, url).toBeGreaterThan(0);
      metrics.Offers += results.length;
      // Independent original-line ownership oracle: these corpus roundups have no explicit shared blocks.
      const lines = input.text.split("\n");
      const starts = lines.flatMap((line, i) =>
        /^\s*(?:\d+[.)]|[1-9]️⃣|🔟)\s*/u.test(line) ? [i] : [],
      );
      if (starts.length > 1) {
        expect(results.length, url).toBe(starts.length);
        for (const [i, result] of results.entries()) {
          const section = lines
            .slice(starts[i], starts[i + 1] ?? lines.length)
            .join("\n")
            .replace(/^\s*(?:\d+[.)]|[1-9]️⃣|🔟)\s*/u, "")
            .split(/\n\s*@[a-zA-Z0-9_]+\s*\(/)[0]
            .trim();
          expect(
            result.suggestion.description,
            `${url} offer ${i} owns only its original section`,
          ).toBe(section);
          expect(result.suggestion.terms).toEqual([section]);
        }
      }
      for (const r of results) {
        metrics[
          r.action === "approve"
            ? "Approved"
            : r.action === "exclude"
              ? "Excluded"
              : "Unresolved"
        ]++;
        if (r.audit.requiresSplit) metrics["Requires split"]++;
        expect(r.audit.sourceHash).toBe(digest(input.text));
        expect(r.audit.classification).toBe(r.action);
        expect(r.audit.reasons).toEqual(r.reasons);
        expect(r.audit.dateResolution).toBeDefined();
        expect(r.audit.issues).toBeInstanceOf(Array);
        expect(r.reasons.length).toBeGreaterThan(0);
        if (r.audit.requiresSplit) expect(r.action).not.toBe("approve");
        if (r.action === "approve") {
          const promotion = promotionSchema.parse(r.promotion);
          expect(publicationIssues(promotion)).toEqual([]);
          expect(promotion.id).toBe(r.suggestion.id);
          const audit = r.audit.outletResolution as OutletAudit;
          expect(audit.complete).toBe(true);
          expect(audit.issues).toEqual([]);
          expect(audit.scopeEvidence.length).toBeGreaterThan(0);
          expect(audit.included).toHaveLength(promotion.outlets.length);
          for (const branch of audit.included) {
            expect(branch.existenceEvidence.length).toBeGreaterThan(0);
            expect(branch.participationEvidence.length).toBeGreaterThan(0);
            expect(branch.coordinateEvidence.length).toBeGreaterThan(0);
          }
          if (audit.scope.startsWith("all_outlets")) {
            expect(audit.directoryAudit.authoritative).toBe(true);
            expect(audit.directoryAudit.fullyTraversed).toBe(true);
            expect(audit.discoveredOutletCount).toBe(
              audit.included.length + audit.excluded.length,
            );
            if (audit.directoryAudit.officialCount !== null)
              expect(audit.directoryAudit.officialCount).toBe(
                audit.discoveredOutletCount,
              );
          }
        }
      }
    } catch (error) {
      metrics.Failed++;
      failures.push(
        `${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  process.stdout.write("Corpus metrics: " + JSON.stringify(metrics) + "\n");
  expect(failures).toEqual([]);
});
