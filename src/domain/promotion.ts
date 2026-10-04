import { z } from "zod";
import { DateTime } from "luxon";
export const zone = "Asia/Singapore";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => DateTime.fromISO(v).isValid, "Invalid calendar date");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const legacySourceSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.url().refine((v) => {
    const u = new URL(v);
    return (
      u.protocol === "https:" &&
      u.hostname === "t.me" &&
      /^\/(sgfooddeals|tastesoulsg)\/\d+$/.test(u.pathname)
    );
  }, "Expected selected Telegram channel post"),
});
export const directSourceSchema = z.object({
  kind: z.literal("direct"),
  sourceKind: z
    .enum(["merchant_web", "merchant_social", "issuer_platform"])
    .optional(),
  platform: z.enum(["instagram", "facebook", "tiktok"]).optional(),
  sourceId: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Expected HTTPS official source"),
});
export const sourceSchema = z.union([directSourceSchema, legacySourceSchema]);
export const outletSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  lat: z.number().min(1.15).max(1.5),
  lng: z.number().min(103.6).max(104.1),
  evidence: z.string().min(1).max(2000),
  verifiedAt: z.iso.datetime(),
});
export const promotionSchema = z.object({
  id: z.string().uuid(),
  merchant: z.string().min(1).max(150),
  title: z.string().min(1).max(250),
  category: z.enum(["Meals", "Cafés", "Drinks", "Desserts"]),
  benefit: z.string().min(1).max(60),
  description: z.string().min(1).max(5000),
  terms: z.array(z.string().min(1).max(2000)).min(1).max(30),
  startDate: date.nullable(),
  endDate: date.nullable(),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).nullable(),
  hours: z
    .object({ start: time, end: time })
    .refine((v) => v.start !== v.end, "Equal start and end times are ambiguous")
    .nullable(),
  redemptionCutoff: time.nullable().optional(),
  scheduleLabel: z.string().min(1).max(200),
  excludePublicHolidays: z.boolean(),
  holidayDates: z.array(date).max(100),
  holidayCalendarThrough: date.nullable(),
  outlets: z.array(outletSchema).min(1).max(500),
  sources: z.array(sourceSchema).min(1).max(30),
  verifiedAt: z.iso.datetime().nullable(),
  reviewDueAt: z.iso.datetime().nullable(),
  status: z.enum(["published", "needs_review", "withdrawn"]),
  revision: z.number().int().positive(),
});
export type Promotion = z.infer<typeof promotionSchema>;
export function publicationIssues(p: Promotion) {
  const issues: string[] = [];
  if (!p.startDate || !p.endDate) issues.push("missing_validity");
  if (p.startDate && p.endDate && p.startDate > p.endDate)
    issues.push("invalid_date_range");
  if (!p.verifiedAt) issues.push("not_verified");
  if (
    p.excludePublicHolidays &&
    (!p.holidayCalendarThrough ||
      !p.endDate ||
      p.holidayCalendarThrough < p.endDate)
  )
    issues.push("incomplete_holiday_calendar");
  return issues;
}
export function validity(p: Promotion, now: DateTime = DateTime.now()) {
  const local = now.setZone(zone),
    today = local.toISODate()!;
  const ongoing =
    p.status === "published" &&
    publicationIssues(p).length === 0 &&
    p.startDate! <= today &&
    p.endDate! >= today;
  const hhmm = local.toFormat("HH:mm");
  const overnight = !!p.hours && p.hours.start > p.hours.end;
  const windowDay =
    overnight && hhmm < p.hours!.end ? local.minus({ days: 1 }) : local;
  const dayAllowed =
    (!p.weekdays || p.weekdays.includes(windowDay.weekday)) &&
    (!p.startDate || windowDay.toISODate()! >= p.startDate);
  const holidayAllowed =
    !p.excludePublicHolidays || !p.holidayDates.includes(today);
  const beforeCutoff = !p.redemptionCutoff || hhmm < p.redemptionCutoff;
  const inHours =
    !!p.hours &&
    (overnight
      ? hhmm >= p.hours.start || hhmm < p.hours.end
      : hhmm >= p.hours.start && hhmm < p.hours.end);
  return {
    ongoing,
    redeemableNow:
      ongoing && dayAllowed && holidayAllowed && inHours && beforeCutoff,
    scheduleState:
      !dayAllowed || !holidayAllowed || !beforeCutoff
        ? "Outside offer schedule"
        : !p.hours
          ? "Check redemption hours"
          : inHours
            ? "Available now"
            : "Outside offer hours",
  };
}
export const boundsSchema = z
  .tuple([
    z.number().min(103.5).max(104.2),
    z.number().min(1.1).max(1.6),
    z.number().min(103.5).max(104.2),
    z.number().min(1.1).max(1.6),
  ])
  .refine(([w, s, e, n]) => w < e && s < n, "Invalid map bounds");
export const singaporeBounds: [number, number, number, number] = [
  103.6, 1.15, 104.1, 1.5,
];
export type Listing = Omit<Promotion, "category" | "outlets"> & {
  outlets: (Promotion["outlets"][number] & {
    googlePlaceId?: string;
    coordinateBasis?: "google_merchant_place" | "google_source_location";
    sourceLocation?: string | null;
    googleFormattedAddress?: string;
  })[];
  category: Promotion["category"] | null;
  mvpState?: {
    content: "resolved" | "needs_content_resolution";
    validity: "resolved" | "needs_validity";
    map: "ready" | "needs_location" | "online_only";
    lifecycle: "active" | "expired" | "upcoming" | "unknown";
    reasons: string[];
  };
  mapCoverageBasis?: "source_named_outlets" | "google_merchant_locations";
} & ReturnType<typeof validity>;
export type SourceHealth = {
  id: string;
  label: string;
  lastSuccess: string | null;
  lastAttempt: string | null;
  status: string;
};
export type PromotionResponse = {
  items: Listing[];
  nextCursor: string | null;
  sources: SourceHealth[];
  demo: boolean;
};
