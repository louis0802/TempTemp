import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { promotionSchema, validity } from "@/domain/promotion";
import { PostOfferParser } from "@/ingestion/resolution/parser";
import { OutletScopeResolver } from "@/ingestion/resolution/patterns";
import type { OutletAudit } from "@/ingestion/resolution/types";
import {
  source,
  controlledPipeline,
  conservativePipeline,
  fixtureBranch,
  goldenNow,
  syntheticGenki,
} from "../helpers/resolution-fixtures";

describe("original-text golden offers (controlled evidence, never live)", () => {
  it("McDonald's can approve with a complete authoritative directory", async () => {
    const input = source("https://t.me/tastesoulsg/4485");
    const [r] = await controlledPipeline().process(input, goldenNow);
    expect(r.action).toBe("approve");
    expect(r.suggestion).toMatchObject({
      merchant: "McDonald's",
      title: "$6 McSpicy Meal (U.P. $8.30)",
      benefit: "$6 McSpicy Meal (U.P. $8.30)",
      startDate: "2026-09-14",
      endDate: "2026-09-16",
    });
    expect(r.audit.outletResolution).toMatchObject({
      scope: "all_outlets",
      complete: true,
      discoveredOutletCount: 1,
    });
    expect(r.audit.issues).toContainEqual({
      code: "media_export_marker_present",
      severity: "informational",
    });
    expect(r.suggestion.verifiedAt).toBeTruthy();
    const [unsupported] = await conservativePipeline().process(
      input,
      goldenNow,
    );
    expect(unsupported.action).toBe("unresolved");
    expect(
      (unsupported.audit.outletResolution as OutletAudit).issues,
    ).toContain("authoritative_merchant_directory_unavailable");
    expect(unsupported.reasons).not.toContain(
      "linked_or_media_terms_require_verification",
    );
  });
  it("Subway preserves five exclusions, plural matches and a cutoff without an invented start", async () => {
    const input = source("https://t.me/tastesoulsg/4468");
    const exclusions = [
      "Changi Airport outlets",
      "Tanah Merah Ferry Terminal",
      "Courts Megastore",
      "Anchorpoint",
      "Navy Region Centre Singapore",
    ];
    expect(new OutletScopeResolver().resolve(input.text).exclusions).toEqual(
      exclusions,
    );
    const names = [
      "City branch",
      "Changi Airport Terminal 1",
      "Changi Airport Terminal 2",
      ...exclusions.slice(1),
    ];
    const [r] = await controlledPipeline(
      names.map((name) => fixtureBranch(name)),
    ).process(input, DateTime.fromISO(input.publishedAt));
    expect(r.action).toBe("approve");
    expect(r.suggestion).toMatchObject({
      startDate: "2026-09-07",
      endDate: "2026-09-07",
      hours: null,
      redemptionCutoff: "11:00",
    });
    expect(r.suggestion.scheduleLabel).toContain("Till 11:00");
    const audit = r.audit.outletResolution as OutletAudit;
    expect(audit.scope).toBe("all_outlets_with_exclusions");
    expect(audit.excluded).toHaveLength(6);
    for (const selector of exclusions)
      expect(
        audit.excluded.some(
          (e) => e.reason.includes(selector) && e.evidence.length,
        ),
      ).toBe(true);
    expect(audit.included.map((o) => o.name)).toEqual(["City branch"]);
    expect(
      validity(r.promotion!, DateTime.fromISO("2026-09-07T02:00:00Z"))
        .redeemableNow,
    ).toBe(false);
    expect(
      validity(r.promotion!, DateTime.fromISO("2026-09-07T04:00:00Z"))
        .redeemableNow,
    ).toBe(false);
  });
  it("Papi's resolves both exact addresses using non-authoritative named evidence but needs expiry", async () => {
    const input = source("https://t.me/tastesoulsg/4478");
    const names = ["33 Tanjong Pagar Road", "149 Tyrwhitt Road"];
    expect(new OutletScopeResolver().resolve(input.text).names).toEqual(names);
    const [r] = await controlledPipeline(
      names.map((address, i) =>
        fixtureBranch(`Branch ${i}`, `${address}, Singapore 123456`),
      ),
      false,
    ).process(input, goldenNow);
    expect(r.action).toBe("unresolved");
    expect(r.suggestion).toMatchObject({
      merchant: "Papi’s Tacos",
      benefit: "$10 OFF",
      weekdays: [5],
      endDate: null,
    });
    expect(r.reasons).toContain("unknown_expiry_or_start");
    const audit = r.audit.outletResolution as OutletAudit;
    expect(audit.scope).toBe("named_outlets");
    expect(audit.complete).toBe(true);
    expect(audit.included.map((o) => o.address)).toEqual(
      names.map((name) => `${name}, Singapore 123456`),
    );
  });
  it("Sushiro explicitly requires splitting rather than collapsing the two waves", async () => {
    const input = source("https://t.me/tastesoulsg/4477");
    const results = await controlledPipeline().process(input, goldenNow);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("unresolved");
    expect(results[0].reasons).toContain("requires_split");
    expect(results[0].audit.requiresSplit).toMatchObject({
      sourceText: input.text,
    });
    expect(results[0].suggestion.startDate).toBeNull();
    expect(results[0].suggestion.endDate).toBeNull();
    expect(results).toEqual(
      await controlledPipeline().process(input, goldenNow),
    );
  });
  it("Smooy selected outlets never fall back to the chain", async () => {
    const [r] = await controlledPipeline().process(
      source("https://t.me/sgfooddeals/4931"),
      goldenNow,
    );
    expect(r.action).toBe("unresolved");
    expect(r.audit.outletResolution).toMatchObject({
      scope: "selected_outlets",
      included: [],
      complete: false,
    });
    expect(r.reasons).toContain(
      "Promotion states selected outlets but the participating-outlet list could not be verified.",
    );
  });
  it("Koi Thé automatically excludes online-only content", async () => {
    const [r] = await conservativePipeline().process(
      source("https://t.me/tastesoulsg/4486"),
      goldenNow,
    );
    expect(r.action).toBe("exclude");
    expect(r.reasons).toEqual(["online_only_not_for_map"]);
  });
  it("buffet roundup has five independent merchants/titles/benefits and no footer or header leakage", async () => {
    const input = source("https://t.me/sgfooddeals/4928");
    const offers = await new PostOfferParser().parse(input.text, input.channel);
    expect(offers.map((o) => [o.merchant, o.title, o.benefit])).toEqual([
      ["21 on Rajah", "2-for-2 Vietnamese Buffet", "2-for-2"],
      ["Fame by Dads Corner", "$10 Buffet", "$10 Buffet"],
      ["Happy Lamb", "Hotpot Buffet from $9.99", "Hotpot Buffet from $9.99"],
      ["JEN Shangri-La", "1-for-1 Buffet", "1-for-1"],
      ["Seoul Garden", "2-for-2 Grill & Hotpot Buffet", "2-for-2"],
    ]);
    const results = await controlledPipeline().process(input, goldenNow);
    expect(results).toHaveLength(5);
    for (const [i, r] of results.entries()) {
      expect(r.action).toBe("unresolved");
      expect(r.suggestion).toMatchObject({
        startDate: null,
        endDate: null,
        outlets: [],
      });
      expect(r.suggestion.terms).toEqual([offers[i].text]);
      expect(r.suggestion.description).not.toMatch(
        /5 Best|Enjoy the best|Media attached|@sgfooddeals/,
      );
      for (const other of offers.filter((_, j) => j !== i))
        expect(r.suggestion.description).not.toContain(other.merchant);
    }
  });
  it("synthetic Genki is a schema-valid approval control", async () => {
    const [r] = await controlledPipeline().process(syntheticGenki, goldenNow);
    expect(r.action).toBe("approve");
    expect(promotionSchema.safeParse(r.promotion).success).toBe(true);
  });
  it("obvious non-promotion article automatically excludes", async () => {
    const [r] = await conservativePipeline().process(
      {
        ...syntheticGenki,
        text: "Restaurant guide: ordinary menu prices\n#article",
      },
      goldenNow,
    );
    expect(r.action).toBe("exclude");
    expect(r.reasons).toEqual(["no_promotional_benefit"]);
  });
});
