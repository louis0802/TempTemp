import { readFileSync } from "node:fs";
import { mvpPromotionSchema, type MvpPromotion } from "@/domain/mvp";
import { MVP_POLICY_VERSION } from "@/domain/mvp-policy";
import { stableId } from "@/ingestion/mvp/pipeline";

const original = mvpPromotionSchema.parse(
  JSON.parse(readFileSync("data/mvp-promotions.json", "utf8")).records.find(
    (r: MvpPromotion) => r.status === "ready" && r.mapStatus === "ready",
  ),
);
/** Test-only offer text; coordinates reuse a captured accepted location. Never operational data. */
export function policyRecord(key = "test-only-offer"): MvpPromotion {
  return {
    ...original,
    id: stableId(key),
    merchant: "Test-only merchant",
    title: key,
    benefit: "Test-only 50% off tea",
    description:
      "Test-only offer. Every Tuesday 2pm - 5pm. <script>unsafe()</script>",
    sourceUrl: "https://www.pepperlunch.com.sg/promo/test-only/",
    startDate: "2026-10-01",
    endDate: null,
    status: "ready",
    lifecycle: "active",
    contentStatus: "resolved",
    validityStatus: "resolved",
    mapStatus: "ready",
    hours: null,
    offerPolicy: {
      version: MVP_POLICY_VERSION,
      validityType: "open_ended",
      firstSeenAt: "2026-10-01T00:00:00Z",
      publishedAt: null,
      dateAudit: {
        ruleVersion: MVP_POLICY_VERSION,
        anchorDate: "2026-10-01",
        anchorBasis: "first_seen",
        fragments: [],
        steps: ["test-only"],
        blockers: [],
      },
      scheduleRules: [
        {
          evidence: { quote: "Every Tuesday 2pm - 5pm", start: 17, end: 39 },
          weekdays: [2],
          timeKind: "range",
          start: "14:00",
          end: "17:00",
          exclusions: [],
          outletNames: [],
          conditions: [],
          issues: [],
        },
      ],
      scheduleIssues: [],
      participationBasis: "default_all",
      directoryBasis: "google",
      directoryComplete: false,
      exclusions: [],
      selectedLocations: [],
      sourceTextPolicy: "official_public",
      sourceObservation: {
        sourceId: "test-only-current-list",
        sourceKind: "official",
        capability: "current_offer_listing",
        itemKey: key,
        firstSeenAt: "2026-10-01T00:00:00Z",
        lastSeenOnSource: "2026-10-01T00:00:00Z",
        lastSuccessfulCompleteCheckAt: "2026-10-01T00:00:00Z",
        lastAttemptAt: "2026-10-01T00:00:00Z",
        lastAttemptStatus: "complete",
        presence: "present",
        snapshotId: "test-only-snapshot",
        snapshotHash: "a".repeat(64),
        ttlDays: 14,
        events: [],
      },
    },
  };
}
