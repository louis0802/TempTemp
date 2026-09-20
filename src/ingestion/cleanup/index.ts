import { DateTime } from "luxon";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
export const parserVersion = "deterministic-resolution-v7";
export function positiveDays(value: string | undefined, fallback: number) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 3650)
    throw new Error("Day policy must be an integer between 1 and 3650");
  return n;
}
export function normalise(text: string) {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .trim();
}
export function relativeDate(text: string, postedAt: string) {
  const d = DateTime.fromISO(postedAt).setZone("Asia/Singapore");
  return /^today$/i.test(text.trim()) ? d.toISODate() : null;
}
export function cleanCandidate(value: unknown, now: DateTime = DateTime.utc()) {
  const parsed = promotionSchema.safeParse(value);
  if (!parsed.success)
    return {
      promotion: null,
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    };
  const p = parsed.data,
    issues = publicationIssues(p);
  if (!p.endDate)
    p.reviewDueAt = now
      .toUTC()
      .plus({ days: positiveDays(process.env.UNKNOWN_EXPIRY_REVIEW_DAYS, 7) })
      .toISO();
  p.status = issues.length ? "needs_review" : "published";
  return { promotion: p, issues };
}
