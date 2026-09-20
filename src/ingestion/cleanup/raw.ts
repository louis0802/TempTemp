import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { normalise, positiveDays } from "./index";
export type RawSuggestion = { data: Record<string, unknown>; issues: string[] };
const plain = (v: string) =>
  v.replace(/[\p{Extended_Pictographic}\uFE0F\u20E3]/gu, "").trim();
const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
function dateSuggestions(text: string, postedAt: string) {
  const posted = DateTime.fromISO(postedAt).setZone("Asia/Singapore");
  const range = text.match(
    /\b(\d{4}-\d{2}-\d{2})\s*(?:to|–|—)\s*(\d{4}-\d{2}-\d{2})\b/i,
  );
  if (range) return { start: range[1], end: range[2], inferred: false };
  if (/\btoday only\b/i.test(text) || /^\s*[📅📆]*\s*today\s*$/imu.test(text))
    return {
      start: posted.toISODate(),
      end: posted.toISODate(),
      inferred: false,
    };
  const line = text.split("\n").find((l) => /^[📅📆]/u.test(l.trim())) ?? "";
  const match = line.match(
    /(?:now\s*(?:till|until|[-–])\s*|(?:(\d{1,2})\s*[-–]\s*))(\d{1,2})\s+([a-z]{3})[a-z]*(?:\s+(20\d{2}))?/i,
  );
  if (match) {
    const month = months.indexOf(match[3].toLowerCase()) + 1,
      year = match[4] ? Number(match[4]) : posted.year;
    // Missing-year rollover is deliberately left unresolved.
    if (!month || (!match[4] && month < posted.month))
      return { start: null, end: null, inferred: false };
    const end = DateTime.fromObject({ year, month, day: Number(match[2]) });
    const start = match[1]
      ? DateTime.fromObject({ year, month, day: Number(match[1]) }).toISODate()
      : posted.toISODate();
    return {
      start,
      end: end.isValid ? end.toISODate() : null,
      inferred: !match[4] || !match[1],
    };
  }
  return { start: null, end: null, inferred: false };
}
// Suggestions never bypass verification, even when every extracted field looks complete.
export function suggestRaw(
  text: string,
  postedAt: string,
  source?: string,
): RawSuggestion {
  const original = normalise(text),
    issues = ["raw_extraction_requires_verification"];
  const benefit =
    original.match(
      /(?:up to\s+)?\d{1,3}%\s*off|1[ -]for[ -]1|(?:from\s+)?\$\d+(?:\.\d{1,2})?\+*(?:\s*off)?|free\s+[^\n.!]{1,35}/i,
    )?.[0] ?? "";
  if (!benefit) issues.push("no_explicit_promotional_benefit");
  if (/#article\b/i.test(original))
    issues.push("article_requires_offer_evidence");
  if (/\b(image|photo|pictured|poster|media)\b/i.test(original))
    issues.push("image_dependent_terms");
  if (/\b(selected|all) outlets\b/i.test(original))
    issues.push("participation_needs_verified_branch_list");
  if (
    /\b(delivery only|online only|online-only)\b/i.test(original) ||
    /📍\s*Online\s*$/mu.test(original)
  )
    issues.push("online_only_not_for_map");
  const dates = dateSuggestions(original, postedAt);
  if (!dates.end) issues.push("missing_or_ambiguous_expiry");
  if (dates.inferred)
    issues.push("date_year_or_start_inferred_from_post_verify");
  if (
    dates.start &&
    dates.end &&
    (!DateTime.fromISO(dates.start).isValid ||
      !DateTime.fromISO(dates.end).isValid ||
      dates.start > dates.end)
  )
    issues.push("invalid_date_range");
  if (/(?:^|\n)\s*(?:\d+[.)]|\d\uFE0F?\u20E3|[•●])\s*/mu.test(original))
    issues.push("possible_roundup_do_not_share_terms");
  const first = plain(original.split("\n")[0]);
  const sg =
    source === "sgfooddeals" ? first.match(/^([^:]{1,100}):\s*(.+)$/) : null;
  const merchant =
    original.match(/(?:^|\n)Merchant:\s*([^\n]+)/i)?.[1]?.trim() ??
    sg?.[1] ??
    (source === "tastesoulsg" && first.length < 65 && !/[?!]/.test(first)
      ? first
      : "");
  const title =
    original.match(/(?:^|\n)(?:Offer|Deal):\s*([^\n]+)/i)?.[1]?.trim() ??
    sg?.[2] ??
    (source === "tastesoulsg"
      ? plain(original.split("\n").find((l) => l.startsWith("➡")) ?? "")
      : "");
  const location = original
    .split("\n")
    .filter((l) => l.startsWith("📍"))
    .map(plain)
    .join("; ");
  return {
    data: {
      merchant,
      title,
      benefit,
      description: original,
      terms: [original],
      startDate: dates.start,
      endDate: dates.end,
      locationSuggestion: location,
      excludePublicHolidays:
        /\b(?:excl\.?|excluding)\s*(?:PH|public holidays)/i.test(original),
      reviewDueAt: !dates.end
        ? DateTime.utc()
            .plus({
              days: positiveDays(process.env.UNKNOWN_EXPIRY_REVIEW_DAYS, 7),
            })
            .toISO()
        : null,
    },
    issues,
  };
}
export function suggestRawCandidates(
  text: string,
  postedAt: string,
  source: string,
) {
  const sections = text
    .split(/(?=^\s*\d\uFE0F?\u20E3)/mu)
    .filter((s) => /^\s*\d\uFE0F?\u20E3/u.test(s));
  if (sections.length < 2)
    return [{ key: "unstructured", ...suggestRaw(text, postedAt, source) }];
  return sections.map((section, index) => {
    const suggestion = suggestRaw(section, postedAt);
    return {
      key: `section-${createHash("sha256").update(section.split("\n")[0]).digest("hex").slice(0, 12)}-${index}`,
      data: suggestion.data,
      issues: [...suggestion.issues, "roundup_section_verify_source_context"],
    };
  });
}
