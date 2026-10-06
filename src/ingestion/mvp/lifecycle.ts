import { DateTime } from "luxon";
import type { MvpLifecycleInput, MvpLifecycleState } from "@/domain/mvp-policy";

const ZONE = "Asia/Singapore";

export function evaluateMvpLifecycle(
  input: MvpLifecycleInput,
  now: DateTime,
): MvpLifecycleState {
  const today = now.setZone(ZONE).startOf("day");
  if (input.validityType === "dated") {
    if (!input.startDate || !input.endDate) return "unknown";
    const start = DateTime.fromISO(input.startDate, { zone: ZONE }).startOf(
      "day",
    );
    const end = DateTime.fromISO(input.endDate, { zone: ZONE }).startOf("day");
    if (!start.isValid || !end.isValid || end < start) return "unknown";
    if (today < start) return "upcoming";
    return today > end ? "expired" : "active";
  }
  if (input.validityType !== "open_ended") return "unknown";

  const observation = input.sourceObservation;
  if (!input.startDate) return "unknown";
  const start = DateTime.fromISO(input.startDate, { zone: ZONE }).startOf(
    "day",
  );
  if (!start.isValid) return "unknown";
  if (today < start) return "upcoming";
  if (!observation || observation.capability !== "current_offer_listing")
    return "unknown";
  if (observation.presence === "absent") return "withdrawn";
  if (
    observation.presence !== "present" ||
    !observation.lastSeenOnSource ||
    !observation.firstSeenAt
  )
    return "unknown";
  const lastSeen = DateTime.fromISO(observation.lastSeenOnSource, {
    setZone: true,
  }).setZone(ZONE);
  const firstSeen = DateTime.fromISO(observation.firstSeenAt, {
    setZone: true,
  });
  if (
    !lastSeen.isValid ||
    !firstSeen.isValid ||
    lastSeen > now ||
    firstSeen > now
  )
    return "unknown";
  const ttl = observation.ttlDays;
  const seenDate = lastSeen.startOf("day");
  if (today > seenDate.plus({ days: ttl })) return "stale";
  return "active";
}

export type { MvpLifecycleInput, MvpLifecycleState } from "@/domain/mvp-policy";
