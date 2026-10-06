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
import { evaluateMvpSchedule } from "@/ingestion/mvp/schedule";
import { offerPolicySchema } from "@/domain/mvp-policy";
const artifactSchema = z.object({
  version: z.literal(2),
  records: z.array(mvpPromotionSchema),
});
const policyArtifactSchema = z.object({
  version: z.literal(3),
  policyVersion: z.literal("mvp-offer-policy-v1"),
  records: z.array(
    mvpPromotionSchema.and(z.object({ offerPolicy: offerPolicySchema })),
  ),
});
export function mvpOfferPolicyMode() {
  return process.env.MVP_OFFER_POLICY === "source_observed"
    ? "source_observed"
    : "legacy";
}
export function parseMvpArtifact(value: unknown, mode = mvpOfferPolicyMode()) {
  if (
    mode === "source_observed" &&
    (value as { version?: number })?.version === 3
  )
    return policyArtifactSchema.parse(value).records;
  return artifactSchema.parse(value).records;
}
export async function readMvpData() {
  const policy = mvpOfferPolicyMode();
  return parseMvpArtifact(
    JSON.parse(
      await readFile(
        policy === "source_observed"
          ? (process.env.MVP_POLICY_DATA_PATH ??
              "data/mvp-promotions-source-observed.json")
          : (process.env.MVP_DATA_PATH ?? "data/mvp-promotions.json"),
        "utf8",
      ),
    ),
    policy,
  );
}
export function mvpListing(p: MvpPromotion): Listing {
  return mvpListingAt(p, DateTime.now());
}
export function mvpListingAt(p: MvpPromotion, now: DateTime): Listing {
  const listedState = p.offerPolicy
    ? evaluateMvpSchedule(p.offerPolicy.scheduleRules, now, {
        startDate: p.startDate,
        endDate: p.endDate,
        ttlDays: p.offerPolicy.sourceObservation?.ttlDays ?? 14,
      })
    : null;
  return {
    ...p,
    hours: p.hours?.start ? { start: p.hours.start, end: p.hours.end } : null,
    ...(p.offerPolicy
      ? {
          mvpOfferPolicy: {
            ...p.offerPolicy,
            scheduleState: listedState!,
            summary: p.benefit.slice(0, 240),
          },
        }
      : {}),
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
    sources: [
      {
        label:
          p.offerPolicy?.sourceTextPolicy === "official_public"
            ? "Official promotion source"
            : "Original promotion post",
        url: p.sourceUrl,
      },
    ],
    verifiedAt: null,
    reviewDueAt: null,
    status: "needs_review",
    revision: 1,
    excludePublicHolidays: false,
    holidayDates: [],
    holidayCalendarThrough: null,
    scheduleLabel: p.offerPolicy
      ? p.offerPolicy.scheduleRules.map((r) => r.evidence.quote).join(" · ") ||
        "Check source"
      : p.hours
        ? `${p.hours.start}–${p.hours.end}; check source restrictions`
        : "Check source restrictions and redemption hours",
    ongoing: p.lifecycle === "active",
    redeemableNow: false,
    scheduleState:
      listedState ??
      (p.lifecycle === "expired"
        ? "Expired historical promotion"
        : "Check promotion terms; location participation is not verified"),
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
  const items = eligible.slice(0, 200).map((p) => mvpListingAt(p, now));
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
  const reveal =
    p.mvpOfferPolicy?.sourceTextPolicy === "official_public" ||
    (process.env.NODE_ENV !== "production" && showSourceText);
  // Keep source text out of the duplicate internal field copied by the MVP mapper.
  const clean = { ...p } as Listing & { offerPolicy?: unknown };
  delete clean.offerPolicy;
  return {
    ...clean,
    description: reveal ? p.description : "",
    terms: p.terms.filter((term) => term !== p.description),
  };
}
