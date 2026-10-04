import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { readMapInputs } from "../scripts/research/build-merchant-source-map";
import {
  buildMerchantMap,
  reports,
} from "../scripts/research/merchant-source-map/build";
import {
  deriveProgress,
  type SourceTrack,
} from "../scripts/research/merchant-source-map/progress";
import { directSources } from "@/ingestion/direct-sources/registry";
import { normalizeIdentity } from "@/ingestion/resolution/outlets";
import { createHash } from "node:crypto";
const track = (overrides: Partial<SourceTrack> = {}): SourceTrack => ({
  kind: "merchant_web",
  platform: null,
  source_id: null,
  account: null,
  operator: null,
  urls: [],
  ownership: "verified",
  enumeration: "complete",
  extraction: "partial",
  adapter: null,
  adapter_status: "none",
  activation_status: "candidate",
  stage: "ownership_verified",
  publication_enabled: false,
  auto_publish: false,
  autonomous_acquisition_enabled: false,
  review_incomplete_candidates: false,
  blockers: [],
  evidence_refs: [],
  ...overrides,
});
describe("canonical multi-source merchant progress", () => {
  it("preserves every pinned frozen Telegram audit/corpus byte from the before-work snapshot", async () => {
    const frozen = JSON.parse(
      await readFile(
        "docs/changes/merchant-progress-social-sources/frozen-inputs.json",
        "utf8",
      ),
    ) as Record<string, string>;
    expect(Object.keys(frozen).length).toBeGreaterThan(10);
    for (const [file, sha] of Object.entries(frozen))
      expect(
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
        file,
      ).toBe(sha);
  });
  it("preserves exact frozen census and historical fields; registry-only and unresolved records remain separate", async () => {
    const base = await readMapInputs(process.cwd(), { includeSocial: false }),
      current = await readMapInputs();
    expect(
      current.merchants.map((r) => [
        r.normalized_merchant,
        r.historical_signal_count,
        r.historical_offer_count,
      ]),
    ).toEqual(
      base.merchants.map((r) => [
        r.normalized_merchant,
        r.historical_signal_count,
        r.historical_offer_count,
      ]),
    );
    expect(
      new Set(current.merchants.map((r) => r.normalized_merchant)).size,
    ).toBe(current.merchants.length);
    expect(current.summary.historical_merchant_count).toBe(137);
    expect(current.summary.registry_only_merchant_count).toBe(1);
    expect(current.unresolved_records).toEqual(base.unresolved_records);
    expect(current.summary.unresolved_record_count).toBe(67);
    expect(
      Object.values(current.summary.progress_counts).reduce((a, b) => a + b, 0),
    ).toBe(
      current.merchants.filter((r) => r.historical_signal_count > 0).length,
    );
  });
  it("uses acquisition rather than auto-publication as enabled status and never lets another blocked source hide it", () => {
    const result = deriveProgress([
      track({
        autonomous_acquisition_enabled: true,
        adapter_status: "enabled",
        stage: "production_enabled",
        review_incomplete_candidates: true,
      }),
      track({
        kind: "merchant_social",
        platform: "instagram",
        activation_status: "blocked",
        stage: "blocked",
      }),
    ]);
    expect(result.automation_progress).toBe("auto_enabled");
    expect(result.auto_publish_complete_candidates).toBe(false);
    expect(result.review_incomplete_candidates).toBe(true);
    expect(result.next_action).toBe("none_monitor_enabled_source");
  });
  it("shadow plus candidate stays non-auto; a viable verified social candidate survives a blocked web track", () => {
    expect(
      deriveProgress([track({ adapter_status: "shadow" }), track()])
        .automation_progress,
    ).toBe("shadow_only");
    expect(
      deriveProgress([
        track({ activation_status: "blocked" }),
        track({ kind: "merchant_social", platform: "instagram" }),
      ]),
    ).toMatchObject({
      automation_progress: "source_candidate",
      next_action: "resolve_instagram_enumeration",
    });
    expect(deriveProgress([]).automation_progress).toBe("not_assessed");
  });
  it.each([
    ["Pepper Lunch", "auto_enabled"],
    ["Shake Shack", "auto_enabled"],
    ["Paradise Group", "shadow_only"],
    ["Paradise Hotpot", "shadow_only"],
    ["Gourmet Carousel", "shadow_only"],
    ["FairPrice", "shadow_only"],
    ["Kris+", "shadow_only"],
    ["Dian Xiao Er", "shadow_only"],
    ["CS Foods", "blocked"],
  ])(
    "derives current %s from registry and recorded assessments",
    async (merchant, progress) => {
      const m = await readMapInputs(),
        r = m.merchants.find((r) => r.merchant === merchant)!;
      expect(r.automation_progress).toBe(progress);
      if (progress === "auto_enabled")
        expect(r).toMatchObject({
          autonomous_acquisition_enabled: true,
          auto_publish_complete_candidates: true,
          review_incomplete_candidates: true,
        });
      if (merchant === "CS Foods")
        expect(r.source_tracks[0]).toMatchObject({
          adapter: null,
          activation_status: "blocked",
        });
    },
  );
  it("multiple registered source definitions attach without duplicate merchant rows or adapter counts", async () => {
    const base = await readMapInputs(process.cwd(), { includeSocial: false });
    const audit = JSON.parse(
      await readFile(
        ".local/direct-source-audit/2026-09-30T14-13-48-529Z/audit.json",
        "utf8",
      ),
    );
    const review = JSON.parse(
      await readFile("docs/research/merchant-source-map-review.json", "utf8"),
    );
    const extra = {
      ...directSources[2],
      publicationPolicy: {
        ...directSources[2].publicationPolicy,
        merchant: "Pepper Lunch",
      },
      adapter: directSources[0].adapter,
    };
    const m = buildMerchantMap({
      historical: [
        {
          merchant: "Pepper Lunch",
          sourceUrl: "frozen",
          offerId: "a",
          offer: true,
          evidenceRef: "frozen",
        },
      ],
      audit,
      review,
      registry: [directSources[0], extra],
      provenance: null,
    });
    expect(
      m.merchants.filter(
        (r) => r.normalized_merchant === normalizeIdentity("Pepper Lunch"),
      ),
    ).toHaveLength(1);
    expect(
      m.merchants
        .find((r) => r.merchant === "Pepper Lunch")!
        .source_tracks.filter((t) => t.source_id),
    ).toHaveLength(2);
    expect(m.summary.distinct_adapter_counts).toEqual({ enabled: 1 });
    expect(m.summary.source_counts.enabled_source_definitions).toBe(2);
    expect(base.summary.historical_merchant_count).toBeGreaterThan(100);
  });
  it("reports row-derived cohorts and byte-identical JSON/Markdown/CSV; checked control document matches generator", async () => {
    const a = await readMapInputs(),
      b = await readMapInputs();
    expect(reports(a)).toEqual(reports(b));
    for (const [status, count] of Object.entries(a.summary.progress_counts))
      expect(count).toBe(
        a.merchants.filter(
          (r) =>
            r.historical_signal_count > 0 && r.automation_progress === status,
        ).length,
      );
    expect(a.cohorts.already_auto_enabled).toEqual([
      "Pepper Lunch",
      "Shake Shack",
    ]);
    expect(
      await readFile("docs/research/merchant-automation-progress.md", "utf8"),
    ).toBe(reports(a)["report.md"]);
    expect(reports(a)["report.md"]).toContain(
      "| Merchant | TG Signals | TG Offers | Progress | Auto? | Web | Instagram | Other Source | Ownership | Main Blocker | Next Action |",
    );
  });
});
