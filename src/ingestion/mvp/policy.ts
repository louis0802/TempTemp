import {
  MVP_POLICY_VERSION,
  type OfferPolicy,
  type SourceObservation,
} from "@/domain/mvp-policy";
import type { ScopeResolution } from "../resolution/types";
import { normalizeMvpDates } from "./date-policy";
import { parseMvpSchedule } from "./schedule";

export interface PolicySourceMetadata {
  publishedAt: string | null;
  firstSeenAt: string | null;
  observation: SourceObservation | null;
  sourceTextPolicy: OfferPolicy["sourceTextPolicy"];
}
export function buildOfferPolicy(
  text: string,
  metadata: PolicySourceMetadata,
  scope: ScopeResolution,
) {
  const dates = normalizeMvpDates({
    text,
    publishedAt: metadata.publishedAt,
    firstSeenAt: metadata.firstSeenAt,
  });
  const schedule = parseMvpSchedule(text);
  const policy: OfferPolicy = {
    version: MVP_POLICY_VERSION,
    validityType: dates.validityType,
    publishedAt: metadata.publishedAt,
    firstSeenAt: metadata.firstSeenAt,
    dateAudit: dates.audit,
    scheduleRules: schedule.rules,
    scheduleIssues: schedule.issues,
    sourceObservation: metadata.observation
      ? {
          ...metadata.observation,
          ttlDays:
            /\blimited[ -]time\b/i.test(text) && schedule.weeklyPattern
              ? 7
              : 14,
        }
      : null,
    participationBasis: scope.scope === "unclear" ? "default_all" : "stated",
    directoryBasis: "unresolved",
    directoryComplete: false,
    exclusions: scope.exclusions,
    selectedLocations: scope.names,
    sourceTextPolicy: metadata.sourceTextPolicy,
  };
  return { dates, policy };
}
