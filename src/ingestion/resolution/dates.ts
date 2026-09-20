import { DateTime } from "luxon";
import { PatternClassifier, plain } from "./patterns";
import type { DatePattern } from "./types";
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
export interface DateResolution {
  pattern: DatePattern;
  startDate: string | null;
  endDate: string | null;
  weekdays: number[] | null;
  hours: { start: string; end: string } | null;
  lastOrder: string | null;
  redemptionCutoff: string | null;
  reason: string;
  issues: string[];
}
function clock(value: string) {
  const m = value.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)$/i);
  if (!m || +m[1] < 1 || +m[1] > 12 || +(m[2] ?? 0) > 59) return null;
  return `${String((+m[1] % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${m[2] ?? "00"}`;
}
export class DateResolver {
  resolve(text: string, publishedAt: string): DateResolution {
    const posted = DateTime.fromISO(publishedAt, { setZone: true }).setZone(
      "Asia/Singapore",
    );
    const lines = text.split("\n").filter((l) => /^\s*[📅📆]/u.test(l));
    const s = plain(lines.length ? lines.join(" | ") : text);
    const pattern = new PatternClassifier().date(s);
    const r: DateResolution = {
      pattern,
      startDate: null,
      endDate: null,
      weekdays: null,
      hours: null,
      lastOrder: null,
      redemptionCutoff: null,
      reason: "No unambiguous validity range.",
      issues: [],
    };
    if (!posted.isValid) {
      r.issues.push("invalid_source_timestamp");
      return r;
    }
    if (/weekdays|mon(?:day)?\s*[-–]\s*fri/i.test(text))
      r.weekdays = [1, 2, 3, 4, 5];
    else if (/weekends/i.test(text)) r.weekdays = [6, 7];
    else {
      const day = text.match(
        /every\s+(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i,
      )?.[1];
      if (day)
        r.weekdays = [
          [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].findIndex(
            (name) => name.slice(0, 3) === day.toLowerCase().slice(0, 3),
          ) + 1,
        ];
      else if (
        /\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?s?\b/i.test(
          text,
        )
      )
        r.issues.push("unresolved_weekday_restriction");
    }
    if (
      (/weekdays|mon(?:day)?\s*[-–]\s*fri/i.test(text) &&
        /weekends|every\s+(?:sat|sun)|(?:sat|sun)(?:day)?s? only/i.test(
          text,
        )) ||
      (
        text.match(
          /every\s+(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi,
        ) ?? []
      ).length > 1
    )
      r.issues.push("conflicting_weekday_restrictions");
    const cutoffLines = text
      .split("\n")
      .filter((line) =>
        /^(?:till|until)\s+\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)[.!]?$/i.test(
          plain(line),
        ),
      );
    if (cutoffLines.length === 1) {
      r.redemptionCutoff = clock(
        plain(cutoffLines[0])
          .replace(/^(?:till|until)\s+/i, "")
          .replace(/[.!]$/, ""),
      );
      if (!r.redemptionCutoff) r.issues.push("unresolved_redemption_hours");
    } else if (cutoffLines.length > 1) r.issues.push("requires_split");
    const remainingText = text
      .split("\n")
      .filter((line) => !cutoffLines.includes(line))
      .join("\n");
    const hourLines = remainingText
      .split("\n")
      .filter(
        (l) =>
          /⏰|redemption hours|valid.*\d.*(?:am|pm)/i.test(l) &&
          !/opening|operating/i.test(l),
      );
    if (hourLines.length > 1) r.issues.push("requires_split");
    const hoursLine = remainingText
      .split("\n")
      .find(
        (l) =>
          /⏰|redemption hours|valid.*\d.*(?:am|pm)/i.test(l) &&
          !/opening|operating/i.test(l),
      );
    if (hoursLine) {
      const times =
        hoursLine.match(/\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)/gi) ?? [];
      const start = clock(times[0] ?? ""),
        end = clock(times[1] ?? "");
      if (times.length > 2) r.issues.push("requires_split");
      if (start && end && start !== end) r.hours = { start, end };
      else r.issues.push("unresolved_redemption_hours");
    }
    if (
      !hoursLine &&
      /(?:🕣|🕐|🕒|🕘|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)/iu.test(
        remainingText,
      ) &&
      !/opening hours|operating hours/i.test(text)
    )
      r.issues.push("unresolved_redemption_hours");
    r.lastOrder = clock(
      text.match(
        /last\s*order\s*:?\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm))/i,
      )?.[1] ?? "",
    );
    if (r.lastOrder) r.issues.push("last_order_requires_schedule_review");
    if (lines.length > 1 || pattern === "multiple_ranges" || /\|/.test(s)) {
      r.pattern = "multiple_ranges";
      r.issues.push("requires_split");
      return r;
    }
    const outsideDateLines = remainingText
      .split("\n")
      .filter((l) => !/^\s*[📅📆]/u.test(l))
      .join("\n");
    if (
      lines.length &&
      /\b(?:until|till|ends? on|valid through)\s+\d|\b\d{1,2}\s+[A-Za-z]{3,9}\s*[-–]\s*\d/i.test(
        outsideDateLines,
      )
    )
      r.issues.push("additional_date_claim_requires_verification");
    if (pattern === "today") {
      r.startDate = r.endDate = posted.toISODate();
      r.reason = '"Today" anchored to source Singapore calendar date.';
      return r;
    }
    const iso = s.match(
      /^(\d{4}-\d{2}-\d{2})\s*(?:to|[–—])\s*(\d{4}-\d{2}-\d{2})$/,
    );
    if (iso) {
      r.startDate = iso[1];
      r.endDate = iso[2];
    } else {
      const m = s.match(
        /^(?:(now)\s*(?:till|until|to|[-–—])\s*|(\d{1,2})\s*(?:([a-z]{3,9})(?:\s+(20\d{2}))?\s*)?[-–—]\s*)(\d{1,2})\s+([a-z]{3,9})(?:\s+(20\d{2}))?(.*)$/i,
      );
      if (m) {
        const endMonth = months.indexOf(m[6].slice(0, 3).toLowerCase()) + 1;
        const startMonth = m[3]
          ? months.indexOf(m[3].slice(0, 3).toLowerCase()) + 1
          : endMonth;
        let endYear = +(m[7] || m[4] || posted.year),
          startYear = +(m[4] || m[7] || posted.year);
        if (!m[7] && !m[4] && posted.month === 12 && endMonth === 1) endYear++;
        if (m[2] && startMonth > endMonth) startYear = endYear - 1;
        const end = DateTime.fromObject({
          year: endYear,
          month: endMonth || 13,
          day: +m[5],
        });
        const start = m[1]
          ? posted
          : DateTime.fromObject({
              year: startYear,
              month: startMonth || 13,
              day: +m[2],
            });
        r.startDate = start.toISODate();
        r.endDate = end.toISODate();
        if (!m[7] && !m[4] && Math.abs(start.diff(posted, "days").days) > 62)
          r.issues.push("ambiguous_year");
        if (!m[7] && !m[4] && m[1] && end < posted.startOf("day"))
          r.issues.push("conflicting_dates");
        r.reason = m[1]
          ? '"Now" anchored to source Singapore date; missing year uses nearby chronological context.'
          : "Explicit range; missing year anchored to nearby post context.";
        if (
          m[8].trim() &&
          !/^\s*\((?:weekdays only|excluding.*|excl\..*)\)\s*$/i.test(m[8])
        )
          r.issues.push("unparsed_date_qualifier");
      }
    }
    if (!r.startDate && /^from now$/i.test(s)) r.startDate = posted.toISODate();
    if (!r.startDate && /^from\s+/i.test(s)) {
      const start = s.match(
        /^from\s+(\d{1,2})\s+([a-z]{3,9})(?:\s+(20\d{2}))?$/i,
      );
      if (start)
        r.startDate = DateTime.fromObject({
          year: +(start[3] || posted.year),
          month: months.indexOf(start[2].slice(0, 3).toLowerCase()) + 1,
          day: +start[1],
        }).toISODate();
    }
    if (!r.startDate || !r.endDate) r.issues.push("unknown_expiry_or_start");
    else if (
      !DateTime.fromISO(r.startDate).isValid ||
      !DateTime.fromISO(r.endDate).isValid ||
      r.startDate > r.endDate
    )
      r.issues.push("invalid_date_range");
    return r;
  }
}
