import { describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  readMapInputs,
  frozenMapInputs,
  writeMerchantMap,
} from "../scripts/research/build-merchant-source-map";
import {
  buildMerchantMap,
  reports,
  type HistoricalOffer,
} from "../scripts/research/merchant-source-map/build";
import { directSources } from "@/ingestion/direct-sources/registry";
import type { DirectAudit } from "../scripts/research/direct-source-audit/model";
const historical = (
  merchant: string,
  offerId: string,
  sourceUrl = offerId,
): HistoricalOffer => ({
  merchant,
  offerId,
  sourceUrl,
  offer: true,
  evidenceRef: "frozen fixture",
});
async function inputs() {
  return {
    audit: JSON.parse(
      await readFile(frozenMapInputs.audit, "utf8"),
    ) as DirectAudit,
    review: JSON.parse(await readFile(frozenMapInputs.review, "utf8")),
    registry: directSources,
    provenance: "frozen test inputs",
  };
}
describe("offline merchant onboarding map", () => {
  it("reads only pinned local reviewed/captured inputs and makes no network calls", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network forbidden"));
    try {
      const m = await readMapInputs();
      expect(m.summary.historical_merchant_count).toBeGreaterThan(100);
      expect(fetch).not.toHaveBeenCalled();
      expect(frozenMapInputs.corpus).toBe(
        "tests/corpus/mvp-conformance-reviewed.json",
      );
      expect(JSON.stringify(m.provenance)).toContain(
        "Previously captured one_off_refresh",
      );
    } finally {
      fetch.mockRestore();
    }
  });
  it("normalizes punctuation/case deterministically without alias or operator guessing", async () => {
    const i = await inputs(),
      m = buildMerchantMap({
        ...i,
        registry: [],
        historical: [
          historical("McDonald's", "a"),
          historical("McDonald’s", "b"),
          historical("MCDONALDS", "c"),
        ],
      });
    const row = m.merchants.find((r) => r.normalized_merchant === "mcdonalds")!;
    expect(row.historical_signal_count).toBe(3);
    expect(row.merchant_labels).toHaveLength(3);
    expect(row.ownership_status).toBe("unknown");
  });
  it("retains Paradise Hotpot, Dynasty and Group as separate brand/operator concepts", async () => {
    const i = await inputs(),
      m = buildMerchantMap({
        ...i,
        historical: [
          historical("Paradise Hotpot", "a"),
          historical("Paradise Dynasty", "b"),
        ],
      });
    expect(
      m.merchants
        .filter((r) => r.merchant.startsWith("Paradise"))
        .map((r) => r.normalized_merchant),
    ).toEqual(["paradisedynasty", "paradisegroup", "paradisehotpot"]);
    const brand = m.merchants.find((r) => r.merchant === "Paradise Hotpot")!;
    expect(brand.operator).toContain("Paradise Group");
    expect(brand.adapter_status).toBe("shadow");
    expect(
      m.merchants.find((r) => r.merchant === "Paradise Dynasty")!
        .adapter_status,
    ).toBe("none");
  });
  it("Pepper is enabled and Paradise remains shadow/disabled with all known blockers", async () => {
    const m = await readMapInputs();
    const p = m.merchants.find((r) => r.merchant === "Pepper Lunch")!,
      g = m.merchants.find((r) => r.merchant === "Paradise Group")!;
    expect(p.adapter_status).toBe("enabled");
    expect(p.autonomous_ingestion_status).toBe("enabled");
    expect(g.publication_enabled).toBe(false);
    expect(g.adapter_status).toBe("shadow");
    expect(g.known_blockers).toEqual(
      expect.arrayContaining([
        "partial_enumeration",
        "unresolved_load_more",
        "oversized_evidence",
      ]),
    );
  });
  it("Shake Shack retains pre-existing probable audit/yes enumeration while current status is verified/enabled/complete", async () => {
    const m = await readMapInputs(),
      s = m.merchants.find((r) => r.merchant === "Shake Shack")!;
    expect(s.ownership_status).toBe("verified");
    expect(s.adapter_status).toBe("enabled");
    expect(s.enumerability_status).toBe("yes");
    expect(s.source_family).toContain("wordpress_dated_promotions");
    expect(
      s.source_observations.find((r) => r.domain === "shakeshack.com.sg")
        ?.ownership_status,
    ).toBe("probable");
    expect(
      s.source_observations.find((r) => r.domain === "shakeshack.com.sg")
        ?.enumerable,
    ).toBe("yes");
    expect(s.publication_enabled).toBe(true);
    expect(s.known_blockers).toEqual([]);
    expect(m.summary.distinct_adapter_counts).toEqual({
      enabled: 2,
      shadow: 9,
    });
  });
  it("Gourmet Carousel is a separate disabled shadow with verified operator and partial service coverage", async () => {
    const m = await readMapInputs(),
      g = m.merchants.find((r) => r.merchant === "Gourmet Carousel")!;
    expect(m.summary.merchant_count).toBe(138);
    expect(g.operator).toBe("Royal Plaza on Scotts");
    expect(g.direct_source_id).toBe("gourmet_carousel_sg");
    expect(g.ownership_status).toBe("verified");
    expect(g.adapter_status).toBe("shadow");
    expect(g.enumerability_status).toBe("partial");
    expect(g.publication_enabled).toBe(false);
    expect(g.known_blockers).toEqual([
      "gourmet_service_boundary_unproven",
      "partial_enumeration",
      "service_page_campaign_outside_listing",
    ]);
    expect(g.historical_enumerability_status).toBe("partial");
  });
  it("Kris+ sampled deep link stays distinct from its new shadow public directory adapter", async () => {
    const m = await readMapInputs(),
      k = m.merchants.find((r) => r.merchant === "Kris+")!;
    expect(k.adapter_status).toBe("shadow");
    expect(k.direct_source_id).toBe("kris_plus_sg");
    expect(k.publication_enabled).toBe(false);
    expect(k.known_blockers).toContain("unresolved_load_more");
    expect(k.source_observations[0].enumerable).toBe("no");
    expect(
      k.source_observations[0].app_findings?.public_listing_endpoint,
    ).toContain("kris");
    expect(k.source_family).toContain("app_deeplink_with_public_directory");
  });
  it("unknown merchants remain evidence unknown despite frequent historical signals", async () => {
    const i = await inputs(),
      m = buildMerchantMap({
        ...i,
        historical: [
          historical("Unresearched Brand", "a"),
          historical("Unresearched Brand", "b"),
        ],
      });
    const r = m.merchants.find((r) => r.merchant === "Unresearched Brand")!;
    expect(r.ownership_status).toBe("unknown");
    expect(r.enumerability_status).toBe("unknown");
    expect(r.adapter_status).toBe("none");
    expect(r.observed_direct_domains).toEqual([]);
    expect(r.publication_enabled).toBe(false);
  });
  it("distinct post/offer counts are not URL-row counts; unresolved labels stay separate", async () => {
    const i = await inputs(),
      a = historical("Test Brand", "a", "post"),
      m = buildMerchantMap({
        ...i,
        historical: [
          a,
          a,
          historical("Test Brand", "b", "post"),
          historical("Bad Label (https", "c"),
        ],
      });
    const r = m.merchants.find((r) => r.merchant === "Test Brand")!;
    expect(r.historical_signal_count).toBe(1);
    expect(r.historical_offer_count).toBe(2);
    expect(m.unresolved_records[0].merchant).toBe("Bad Label (https");
  });
  it("same frozen inputs and reordered historical input replay byte-identically", async () => {
    const a = await readMapInputs(),
      b = await readMapInputs();
    expect(reports(a)).toEqual(reports(b));
    const i = await inputs(),
      h = [historical("Beta", "a"), historical("Alpha", "b")];
    expect(reports(buildMerchantMap({ ...i, historical: h }))).toEqual(
      reports(buildMerchantMap({ ...i, historical: [...h].reverse() })),
    );
  });
  it("writes only new local child directories; refuses overwrite and symlink escapes", async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), "merchant-map-"));
    for (const file of Object.values(frozenMapInputs)) {
      await mkdir(path.dirname(path.join(temp, file)), { recursive: true });
      await writeFile(path.join(temp, file), await readFile(file));
    }
    for (const [file, value] of Object.entries({
      "docs/research/merchant-identity-review.json": {
        version: 1,
        aliases: [],
      },
      "docs/changes/coverage-batch-2/source-decisions.json": {
        version: 1,
        captures: [],
        merchants: [],
      },
    })) {
      await mkdir(path.dirname(path.join(temp, file)), { recursive: true });
      await writeFile(path.join(temp, file), JSON.stringify(value));
    }
    const out = ".local/merchant-source-map/run";
    await writeMerchantMap(out, temp);
    for (const file of ["merchants.json", "report.md", "report.csv"])
      expect(
        (await readFile(path.join(temp, out, file), "utf8")).length,
      ).toBeGreaterThan(20);
    await expect(writeMerchantMap(out, temp)).rejects.toThrow();
    await expect(writeMerchantMap("../production", temp)).rejects.toThrow(
      "output_must_be_merchant_map_child",
    );
    await symlink(
      os.tmpdir(),
      path.join(temp, ".local/merchant-source-map/escape"),
    );
    await expect(
      writeMerchantMap(".local/merchant-source-map/escape/run", temp),
    ).rejects.toThrow("output_symlink_forbidden");
  });
  it("research imports neither collector nor Telegram parser and direct runtime never imports map", async () => {
    for (const file of [
      "scripts/research/build-merchant-source-map.ts",
      "scripts/research/merchant-source-map/build.ts",
    ])
      expect(await readFile(file, "utf8")).not.toMatch(
        /PostOfferParser|PromotionSignal|TelegramCollector|source-monitor\/telegram|source-origin-audit\/input|fetch\(/,
      );
    const runtime = await readFile(
      "src/ingestion/direct-sources/registry.ts",
      "utf8",
    );
    expect(runtime).not.toContain("merchant-source-map");
  });
});
