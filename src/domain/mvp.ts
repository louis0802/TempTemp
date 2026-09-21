import { z } from "zod";
import { DateTime } from "luxon";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => DateTime.fromISO(v).isValid);
export const mvpOutletSchema = z.object({
  googlePlaceId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().min(1.15).max(1.5),
  longitude: z.number().min(103.6).max(104.1),
  businessStatus: z.literal("OPERATIONAL"),
});
export const mvpPromotionSchema = z
  .object({
    id: z.string().uuid(),
    sourceUrl: z.url(),
    offerKey: z.string(),
    parentKey: z.string(),
    merchant: z.string(),
    title: z.string(),
    benefit: z.string(),
    description: z.string(),
    startDate: date.nullable(),
    endDate: date.nullable(),
    weekdays: z.array(z.number().int().min(1).max(7)).nullable(),
    hours: z.object({ start: z.string(), end: z.string() }).nullable(),
    redemptionCutoff: z.string().nullable(),
    outletScope: z.enum([
      "all_outlets",
      "named_outlets",
      "selected_outlets",
      "all_outlets_with_exclusions",
      "unspecified",
      "online_only",
    ]),
    mapCoverageBasis: z.enum([
      "source_named_outlets",
      "google_merchant_locations",
    ]),
    outlets: z.array(mvpOutletSchema),
    status: z.enum([
      "ready",
      "needs_validity",
      "needs_content_resolution",
      "needs_location",
    ]),
    contentStatus: z.enum(["resolved", "needs_content_resolution"]),
    validityStatus: z.enum(["resolved", "needs_validity"]),
    mapStatus: z.enum(["ready", "needs_location", "online_only"]),
    lifecycle: z.enum(["active", "expired", "upcoming", "unknown"]),
    reasons: z.array(z.string()),
    datePattern: z.string(),
    // Legacy field: curated inclusion, not verified savings or publication approval.
    genuine: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (
      p.mapStatus === "online_only" &&
      (p.outlets.length || p.outletScope !== "online_only")
    )
      ctx.addIssue({
        code: "custom",
        message: "Online-only records cannot have physical outlets",
      });
    if (p.outletScope === "online_only" && p.mapStatus !== "online_only")
      ctx.addIssue({
        code: "custom",
        message: "Online-only scope requires online-only map status",
      });
    if (p.mapStatus === "ready" && !p.outlets.length)
      ctx.addIssue({
        code: "custom",
        message: "Map-ready requires Google outlets",
      });
    if (
      p.status === "ready" &&
      (!p.merchant ||
        !p.title ||
        !p.benefit ||
        !p.genuine ||
        !p.startDate ||
        !p.endDate ||
        p.startDate > p.endDate ||
        (p.mapStatus !== "online_only" && !p.outlets.length) ||
        p.lifecycle === "unknown" ||
        p.contentStatus !== "resolved" ||
        p.validityStatus !== "resolved")
    )
      ctx.addIssue({ code: "custom", message: "Incomplete MVP-ready record" });
  });
export type MvpPromotion = z.infer<typeof mvpPromotionSchema>;
export function lifecycle(
  start: string | null,
  end: string | null,
  now: DateTime = DateTime.now(),
): MvpPromotion["lifecycle"] {
  if (
    !start ||
    !end ||
    !DateTime.fromISO(start).isValid ||
    !DateTime.fromISO(end).isValid ||
    start > end
  )
    return "unknown";
  const today = now.setZone("Asia/Singapore").toISODate()!;
  return start > today ? "upcoming" : end < today ? "expired" : "active";
}
export function visibleMvp(
  records: MvpPromotion[],
  includeExpired = false,
  now: DateTime = DateTime.now(),
) {
  return records
    .map((p) => ({ ...p, lifecycle: lifecycle(p.startDate, p.endDate, now) }))
    .filter(
      (p) =>
        includeExpired ||
        (p.status === "ready" &&
          p.contentStatus === "resolved" &&
          p.validityStatus === "resolved" &&
          p.mapStatus === "ready" &&
          p.outlets.length > 0 &&
          p.lifecycle === "active"),
    );
}
