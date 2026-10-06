import { z } from "zod";

export const MVP_POLICY_VERSION = "mvp-offer-policy-v1" as const;
const instant = z.iso.datetime({ offset: true });
const day = z.iso.date();
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const literalEvidenceSchema = z.object({
  quote: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export const dateAuditSchema = z.object({
  ruleVersion: z.literal(MVP_POLICY_VERSION),
  anchorDate: day.nullable(),
  anchorBasis: z.enum(["posted", "first_seen", "unavailable"]),
  fragments: z.array(
    literalEvidenceSchema.extend({
      role: z.enum(["start", "end", "single", "month", "unknown"]),
      stated: z.boolean(),
      missingUnits: z.array(z.enum(["year", "month", "day"])),
    }),
  ),
  steps: z.array(z.string()),
  blockers: z.array(z.string()),
});
export type DateAudit = z.infer<typeof dateAuditSchema>;
export type DatePolicyResult = {
  startDate: string | null;
  endDate: string | null;
  validityType: "dated" | "open_ended" | null;
  audit: DateAudit;
};
export const scheduleRuleSchema = z.object({
  evidence: literalEvidenceSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).nullable(),
  timeKind: z.enum([
    "range",
    "opening_to",
    "before",
    "after",
    "point",
    "last_order",
    "operating_hours",
    "unknown",
  ]),
  start: clock.nullable(),
  end: clock.nullable(),
  exclusions: z.array(
    z.enum(["public_holiday", "public_holiday_eve", "lunar_new_year_eve"]),
  ),
  outletNames: z.array(z.string()),
  conditions: z.array(z.string()),
  issues: z.array(z.string()),
});
export type ScheduleRule = z.infer<typeof scheduleRuleSchema>;
export type ScheduleParseResult = {
  rules: ScheduleRule[];
  issues: string[];
  weeklyPattern: boolean;
};
export type ListedScheduleState =
  "Within listed offer hours" | "Outside listed offer hours" | "Check source";
export const sourceObservationSchema = z.object({
  sourceId: z.string(),
  sourceKind: z.enum(["official", "telegram", "unknown"]),
  capability: z.enum([
    "current_offer_listing",
    "historical_archive",
    "permalink",
  ]),
  itemKey: z.string(),
  firstSeenAt: instant.nullable(),
  lastSeenOnSource: instant.nullable(),
  lastSuccessfulCompleteCheckAt: instant.nullable(),
  lastAttemptAt: instant.nullable(),
  lastAttemptStatus: z.enum([
    "complete",
    "partial",
    "failed",
    "cache",
    "unknown",
  ]),
  presence: z.enum(["present", "absent", "unknown"]),
  snapshotId: z.string().nullable(),
  snapshotHash: z.string().nullable(),
  ttlDays: z.union([z.literal(7), z.literal(14)]),
  events: z.array(
    z.object({
      at: instant,
      type: z.enum(["present", "absent", "partial", "failed"]),
      snapshotId: z.string(),
    }),
  ),
});
export type SourceObservation = z.infer<typeof sourceObservationSchema>;
export type MvpLifecycleInput = {
  startDate: string | null;
  endDate: string | null;
  validityType: "dated" | "open_ended" | null;
  sourceObservation: SourceObservation | null;
};
export type MvpLifecycleState =
  "active" | "expired" | "upcoming" | "unknown" | "stale" | "withdrawn";
export const offerPolicySchema = z.object({
  version: z.literal(MVP_POLICY_VERSION),
  validityType: z.enum(["dated", "open_ended"]).nullable(),
  firstSeenAt: instant.nullable(),
  publishedAt: instant.nullable(),
  dateAudit: dateAuditSchema,
  scheduleRules: z.array(scheduleRuleSchema),
  scheduleIssues: z.array(z.string()),
  sourceObservation: sourceObservationSchema.nullable(),
  participationBasis: z.enum(["stated", "default_all"]),
  directoryBasis: z.enum(["official", "google", "unresolved"]),
  directoryComplete: z.boolean(),
  exclusions: z.array(z.string()),
  selectedLocations: z.array(z.string()),
  sourceTextPolicy: z.enum([
    "official_public",
    "telegram_private",
    "unknown_private",
  ]),
});
export type OfferPolicy = z.infer<typeof offerPolicySchema>;
