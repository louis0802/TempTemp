import { readFile } from "node:fs/promises";
import { z } from "zod";
import { DateTime } from "luxon";
import {
  mvpPromotionSchema,
  visibleMvp,
  type MvpPromotion,
  type MvpViewMode,
} from "@/domain/mvp";
import type { Listing, PromotionResponse } from "@/domain/promotion";
import { stableId } from "@/ingestion/mvp/pipeline";
const artifactSchema = z.object({
  version: z.literal(2),
  records: z.array(mvpPromotionSchema),
});
export async function readMvpData() {
  return artifactSchema.parse(
    JSON.parse(
      await readFile(
        process.env.MVP_DATA_PATH ?? "data/mvp-promotions.json",
        "utf8",
      ),
    ),
  ).records;
}
export function mvpListing(p: MvpPromotion): Listing {
  return {
    ...p,
    category: null,
    mvpState: {
      content: p.contentStatus,
      validity: p.validityStatus,
      map: p.mapStatus,
      lifecycle: p.lifecycle,
      reasons: p.reasons,
    },
    terms: [p.description],
    outlets: p.outlets.map((o) => ({
      id: stableId(`${o.googlePlaceId}:${o.sourceLocation ?? ""}`),
      name: o.name,
      address: o.address,
      lat: o.latitude,
      lng: o.longitude,
      evidence: `Google Place ${o.googlePlaceId}; ${o.coordinateBasis}`,
      verifiedAt: "",
      googlePlaceId: o.googlePlaceId,
      coordinateBasis: o.coordinateBasis,
      sourceLocation: o.sourceLocation,
      googleFormattedAddress: o.googleFormattedAddress,
    })),
    sources: [{ label: "Original promotion post", url: p.sourceUrl }],
    verifiedAt: null,
    reviewDueAt: null,
    status: "needs_review",
    revision: 1,
    excludePublicHolidays: false,
    holidayDates: [],
    holidayCalendarThrough: null,
    scheduleLabel: p.hours
      ? `${p.hours.start}–${p.hours.end}; check source restrictions`
      : "Check source restrictions and redemption hours",
    ongoing: p.lifecycle === "active",
    redeemableNow: false,
    scheduleState:
      p.lifecycle === "expired"
        ? "Expired historical promotion"
        : "Check promotion terms; location participation is not verified",
  };
}
export async function getMvpPromotions(
  bounds: number[],
  cursor: string | null,
  mode: MvpViewMode = "live",
  now: DateTime = DateTime.now(),
  records?: MvpPromotion[],
): Promise<PromotionResponse> {
  const [w, s, e, n] = bounds;
  const eligible = visibleMvp(records ?? (await readMvpData()), mode, now)
    .filter((p) => !cursor || p.id > cursor)
    .map((p) => ({
      ...p,
      outlets:
        mode === "corpus"
          ? p.outlets
          : p.outlets.filter(
              (o) =>
                o.longitude >= w &&
                o.longitude <= e &&
                o.latitude >= s &&
                o.latitude <= n,
            ),
    }))
    .filter((p) => mode === "corpus" || p.outlets.length)
    .sort((a, b) => a.id.localeCompare(b.id));
  const items = eligible.slice(0, 200).map(mvpListing);
  return {
    items,
    nextCursor: eligible.length > 200 ? items.at(-1)!.id : null,
    sources: [],
    demo: false,
  };
}
export function mvpPreviewOptions(q: { get(name: string): string | null }): {
  mode: MvpViewMode;
  showSourceText: boolean;
} {
  const development = process.env.NODE_ENV !== "production";
  return {
    mode:
      development && q.get("view") === "corpus"
        ? "corpus"
        : development && q.get("includeExpired") === "true"
          ? "live_with_expired"
          : "live",
    showSourceText: development && q.get("showSourceText") === "true",
  };
}
// Response copies only: never change the artifact or structured source links.
export function presentMvpListing(
  p: Listing,
  showSourceText: boolean,
): Listing {
  const reveal = process.env.NODE_ENV !== "production" && showSourceText;
  return {
    ...p,
    description: reveal ? p.description : "",
    terms: p.terms.filter((term) => term !== p.description),
  };
}
