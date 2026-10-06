import { MVP_POLICY_VERSION, type DatePolicyResult } from "@/domain/mvp-policy";
import { DateTime } from "luxon";

type Input = {
  text: string;
  publishedAt?: string | null;
  firstSeenAt?: string | null;
};
type Part = {
  year?: number;
  month?: number;
  day?: number;
  raw: string;
  start: number;
  end: number;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};
const MONTH_RE = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");
const DATE_RE = new RegExp(
  `\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})|(${MONTH_RE})\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?:[, ]+((?:19|20)\\d{2}))?\\b|\\b((?:19|20)\\d{2})-(\\d{2})-(\\d{2})\\b|\\b(${MONTH_RE})\\b|\\b(\\d{1,2})(?:st|nd|rd|th)\\b`,
  "gi",
);

function validDay(y: number, m: number, d: number): boolean {
  return (
    Number.isInteger(y) &&
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= new Date(Date.UTC(y, m, 0)).getUTCDate()
  );
}
function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  let y: number, m: number, d: number;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateMatch) {
    y = Number(dateMatch[1]);
    m = Number(dateMatch[2]);
    d = Number(dateMatch[3]);
  } else {
    if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    const dt = DateTime.fromISO(value, { setZone: true });
    if (!dt.isValid) return null;
    const singapore = dt.setZone("Asia/Singapore");
    if (!singapore.isValid) return null;
    y = singapore.year;
    m = singapore.month;
    d = singapore.day;
  }
  return validDay(y, m, d) ? iso(y, m, d) : null;
}
function extract(text: string): Part[] {
  const parts: Part[] = [];
  DATE_RE.lastIndex = 0;
  for (const match of text.matchAll(DATE_RE)) {
    let raw = match[0];
    const start = match.index!;
    let year: number | undefined,
      month: number | undefined,
      day: number | undefined;
    if (match[6]) {
      year = Number(match[6]);
      month = Number(match[7]);
      day = Number(match[8]);
    } else if (match[9]) {
      month = MONTHS[match[9].toLowerCase()];
      const suffix = text
        .slice(start + raw.length)
        .match(/^\s+((?:19|20)\d{2})\b/);
      if (suffix) {
        year = Number(suffix[1]);
        raw += suffix[0];
      }
    } else if (match[10]) day = Number(match[10]);
    else {
      const monthWord = (match[2] ?? match[3] ?? "").toLowerCase();
      month = MONTHS[monthWord];
      day = Number(match[1] ?? match[4]);
      year = match[5] ? Number(match[5]) : undefined;
    }
    parts.push({ year, month, day, raw, start, end: start + raw.length });
  }
  return parts;
}
function monthEnd(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function hasWeeklyPattern(text: string) {
  return text.split("\n").some((line) => {
    if (line.includes("?")) return false;
    return (
      /\b(?:every|each)\s+(?:day|week|weekend|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\b(?:weekly|weekdays?|weekends?)\b/i.test(
        line,
      ) ||
      /^\s*[📅📆🗓]\s*(?:Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:r|rs|rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\b/iu.test(
        line,
      )
    );
  });
}
function construct(
  part: Part,
  anchor: string | null,
  isEnd: boolean,
  startDate?: string,
): { date: string | null; blocker?: string; step?: string } {
  const anchorParts = anchor?.split("-").map(Number);
  if (/\btill\s+end\s+of\s+(?:the\s+)?month\b/i.test(part.raw)) {
    if (!anchorParts) return { date: null, blocker: "anchor_unavailable" };
    return {
      date: iso(
        anchorParts[0],
        anchorParts[1],
        monthEnd(anchorParts[0], anchorParts[1]),
      ),
      step: "explicit_end_of_anchor_month",
    };
  }
  if (!part.month) {
    if (!part.day || !anchorParts)
      return { date: null, blocker: "missing_month_or_anchor" };
    if (!isEnd) {
      const y = part.year ?? anchorParts[0],
        m = anchorParts[1];
      if (!validDay(y, m, part.day))
        return { date: null, blocker: "invalid_calendar_date" };
      return {
        date: iso(y, m, part.day),
        step: "missing_month_inferred_from_anchor",
      };
    }
    const bound =
      startDate && (!anchor || startDate > anchor) ? startDate : anchor;
    if (!bound) return { date: null, blocker: "anchor_unavailable" };
    let y = part.year ?? anchorParts[0],
      m = anchorParts[1];
    if (!validDay(y, m, part.day))
      return { date: null, blocker: "invalid_calendar_date" };
    while (iso(y, m, part.day) < bound) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      if (part.year && y !== part.year)
        return { date: null, blocker: "stated_year_cannot_roll_forward" };
      if (!validDay(y, m, part.day))
        return { date: null, blocker: "invalid_date_during_roll_forward" };
    }
    return {
      date: iso(y, m, part.day),
      step: "missing_month_inferred_from_anchor_and_start_then_rolled_forward",
    };
  }
  let year = part.year ?? anchorParts?.[0];
  const month = part.month;
  const day = part.day ?? (isEnd ? monthEnd(year ?? 0, month) : 1);
  if (!year) return { date: null, blocker: "anchor_unavailable" };
  if (!part.year && !isEnd && !part.day && anchorParts) year = anchorParts[0];
  if (!part.year && !isEnd && part.day && anchorParts) {
    /* explicit start parts remain in anchor year */
  }
  if (!validDay(year, month, day))
    return { date: null, blocker: "invalid_calendar_date" };
  let result = iso(year, month, day);
  const lowerBound =
    startDate && startDate > (anchor ?? "") ? startDate : anchor;
  if (isEnd && lowerBound && result < lowerBound && !part.year) {
    while (result < lowerBound) {
      year += 1;
      if (!validDay(year, month, day))
        return { date: null, blocker: "invalid_date_during_roll_forward" };
      result = iso(year, month, day);
    }
    return { date: result, step: "rolled_missing_end_year_forward" };
  }
  return {
    date: result,
    step: `${part.year ? "stated_year" : "anchor_year"};${part.day ? "stated_day" : isEnd ? "end_of_month" : "month_start"}`,
  };
}

export function normalizeMvpDates(input: Input): DatePolicyResult {
  const published = dateOnly(input.publishedAt);
  const seen = dateOnly(input.firstSeenAt);
  const anchorDate = published ?? seen;
  const anchorBasis = published
    ? "posted"
    : seen
      ? "first_seen"
      : "unavailable";
  const audit: DatePolicyResult["audit"] = {
    ruleVersion: MVP_POLICY_VERSION,
    anchorDate,
    anchorBasis,
    fragments: [],
    steps: [],
    blockers: [],
  };
  const text = input.text;
  const all = extract(text);
  const candidates: Array<{
    part: Part;
    role: "start" | "end" | "single" | "month" | "unknown";
    context: string;
    startMatch: boolean;
    endMatch: boolean;
    monthOnly: boolean;
  }> = [];
  for (const part of all) {
    const left = text.slice(Math.max(0, part.start - 70), part.start);
    const right = text.slice(part.end, Math.min(text.length, part.end + 45));
    const line = text.slice(
      text.lastIndexOf("\n", part.start - 1) + 1,
      text.indexOf("\n", part.end) < 0
        ? text.length
        : text.indexOf("\n", part.end),
    );
    const context = `${left} ${part.raw} ${right}`;
    const scoped =
      /\b(valid|validity|offer|promo|promotion|deal|now\s+till|from|till|until|expire|ends? on)\b|[📅📆🗓]/i.test(
        line,
      ) ||
      /\b(valid|validity|now\s+till|from|till|until)\b/i.test(left.slice(-45));
    if (!scoped) continue;
    if (
      /\b(contest|giveaway|booking|reservation|published|posting|draw|winner)\b/i.test(
        left.slice(-45),
      )
    )
      continue;
    const startMatch =
      /\bfrom\s*$/i.test(left) || /\bstarts?\s*(?:on)?\s*$/i.test(left);
    const endMatch =
      /\b(?:till|until|ends?\s*(?:on)?|to)\s*$/i.test(left) ||
      /\bnow\s*[-–—]\s*$/i.test(left);
    const singleMatch = /\bvalid\s+on\s*$/i.test(left);
    const monthMatch =
      /\bvalid\s+in\s*(?:next\s+)?$/i.test(left) ||
      /\b(?:for\s+the\s+month\s+of|throughout)\s*$/i.test(left);
    const calendarLine =
      Boolean(part.day) &&
      /^[\s]*[📅📆🗓]/u.test(line) &&
      all.filter(
        (entry) =>
          entry.start >= text.lastIndexOf("\n", part.start - 1) + 1 &&
          entry.start <=
            (text.indexOf("\n", part.end) < 0
              ? text.length
              : text.indexOf("\n", part.end)),
      ).length === 1;
    const role =
      singleMatch || (calendarLine && !startMatch && !endMatch)
        ? "single"
        : monthMatch && !part.day
          ? "month"
          : startMatch
            ? "start"
            : endMatch
              ? "end"
              : "unknown";
    candidates.push({
      part,
      role,
      context,
      startMatch,
      endMatch,
      monthOnly: monthMatch && !part.day,
    });
  }
  const sharedDayRange = new RegExp(
    `\\b(\\d{1,2})\\s*(?:-|to|through)\\s*\\d{1,2}\\s+(?:${MONTH_RE})\\b`,
    "i",
  ).exec(text);
  if (sharedDayRange) {
    const dayStart =
      sharedDayRange.index + sharedDayRange[0].indexOf(sharedDayRange[1]!);
    const raw = sharedDayRange[1]!;
    if (!candidates.some((candidate) => candidate.part.start === dayStart)) {
      candidates.push({
        part: {
          day: Number(raw),
          raw,
          start: dayStart,
          end: dayStart + raw.length,
        },
        role: "start",
        context: sharedDayRange[0],
        startMatch: true,
        endMatch: false,
        monthOnly: false,
      });
    }
  }
  const eom = /\btill\s+end\s+of\s+(?:the\s+)?month\b/i.exec(text);
  if (eom)
    candidates.push({
      part: {
        month: 0,
        raw: eom[0],
        start: eom.index,
        end: eom.index + eom[0].length,
      },
      role: "end",
      context: eom[0],
      startMatch: false,
      endMatch: true,
      monthOnly: false,
    });
  candidates.sort((a, b) => a.part.start - b.part.start);
  for (let i = 0; i + 1 < candidates.length; i++) {
    const between = text.slice(
      candidates[i]!.part.end,
      candidates[i + 1]!.part.start,
    );
    if (/^\s*(?:to|through|until|[-–—])\s*$/i.test(between)) {
      if (!candidates[i]!.part.month && candidates[i + 1]!.part.month) {
        candidates[i]!.part.month = candidates[i + 1]!.part.month;
        candidates[i]!.part.year = candidates[i + 1]!.part.year;
        audit.steps.push(
          "range_start_inherits_explicit_month_and_year_from_shared_range",
        );
      } else if (
        candidates[i]!.part.month &&
        candidates[i + 1]!.part.year &&
        !candidates[i]!.part.year
      ) {
        candidates[i]!.part.year = candidates[i + 1]!.part.year;
        audit.steps.push(
          "range_start_inherits_explicit_year_from_shared_range",
        );
      }
      candidates[i]!.role = "start";
      candidates[i + 1]!.role = "end";
    }
  }
  if (!candidates.length) {
    if (
      /\b(?:all|whole|entire)\s+(?:this\s+)?month(?:\s+long)?\b/i.test(text)
    ) {
      audit.blockers.push("calendar_month_wording_requires_scope");
      return { startDate: null, endDate: null, validityType: null, audit };
    }
    if (/^\s*[📅📆🗓]\s*Today(?: only)?[.!]?\s*$/imu.test(text)) {
      if (!anchorDate) audit.blockers.push("anchor_unavailable");
      else {
        const literal = /^\s*[📅📆🗓]\s*(Today(?: only)?)[.!]?\s*$/imu.exec(
          text,
        )!;
        const start = literal.index + literal[0].indexOf(literal[1]);
        audit.fragments.push({
          quote: literal[1],
          start,
          end: start + literal[1].length,
          role: "single",
          stated: true,
          missingUnits: ["year", "month", "day"],
        });
        audit.steps.push("source_today_uses_immutable_anchor");
        return {
          startDate: anchorDate,
          endDate: anchorDate,
          validityType: "dated",
          audit,
        };
      }
    }
    if (hasWeeklyPattern(text)) {
      audit.steps.push("weekly_pattern_without_offer_end_date");
      if (!anchorDate) audit.blockers.push("anchor_unavailable");
      return {
        startDate: anchorDate,
        endDate: null,
        validityType: "open_ended",
        audit,
      };
    }
    audit.blockers.push("no_offer_validity_period_found");
    return { startDate: null, endDate: null, validityType: null, audit };
  }
  audit.fragments = candidates.map(({ part, role }) => ({
    quote: part.raw,
    start: part.start,
    end: part.end,
    role,
    stated: true,
    missingUnits: [
      !part.year && "year",
      !part.day && "day",
      !part.month && "month",
    ].filter(Boolean) as Array<"year" | "month" | "day">,
  }));
  if (candidates.some((c) => c.role === "unknown") || candidates.length > 2) {
    audit.blockers.push(
      candidates.some((c) => c.role === "unknown")
        ? "date_role_unclear"
        : "multiple_incompatible_periods",
    );
    return { startDate: null, endDate: null, validityType: null, audit };
  }
  const single = candidates.find((c) => c.role === "single");
  const month = candidates.find((c) => c.role === "month");
  const start = candidates.find((c) => c.role === "start");
  const end = candidates.find((c) => c.role === "end");
  if (candidates.length > 1 && !(start && end)) {
    audit.blockers.push("multiple_incompatible_periods");
    return { startDate: null, endDate: null, validityType: null, audit };
  }
  if (single) {
    const built = construct(single.part, anchorDate, false);
    if (!built.date) audit.blockers.push(built.blocker!);
    else {
      audit.steps.push(`single_day:${built.step}`);
      return {
        startDate: built.date,
        endDate: built.date,
        validityType: "dated",
        audit,
      };
    }
  }
  if (month) {
    const next = /\bnext\s*$/i.test(
      text.slice(Math.max(0, month.part.start - 20), month.part.start),
    );
    const part = { ...month.part };
    if (next && anchorDate && !part.year) {
      const [y, m] = anchorDate.split("-").map(Number);
      part.year = y + (part.month! <= m ? 1 : 0);
      audit.steps.push("explicit_next_month_uses_next_occurrence");
    }
    const built = construct(part, anchorDate, false);
    if (!built.date) audit.blockers.push(built.blocker!);
    else {
      const [y, m] = built.date.split("-").map(Number);
      audit.steps.push(
        "calendar_month_uses_same_anchor_year_without_end_rollover",
      );
      return {
        startDate: iso(y, m, 1),
        endDate: iso(y, m, monthEnd(y, m)),
        validityType: "dated",
        audit,
      };
    }
  }
  if (start && end) {
    const a = construct(start.part, anchorDate, false),
      b = construct(end.part, anchorDate, true, a.date ?? undefined);
    if (!a.date || !b.date || b.date < a.date)
      audit.blockers.push(
        a.blocker ?? b.blocker ?? "explicit_period_is_reversed",
      );
    else {
      audit.steps.push(`start:${a.step}`, `end:${b.step}`);
      return {
        startDate: a.date,
        endDate: b.date,
        validityType: "dated",
        audit,
      };
    }
  } else if (end) {
    const b = construct(end.part, anchorDate, true);
    if (!anchorDate) audit.blockers.push("missing_start_requires_anchor");
    else if (!b.date) audit.blockers.push(b.blocker!);
    else if (b.date < anchorDate)
      audit.blockers.push("explicit_or_invalid_end_before_anchor");
    else {
      audit.steps.push(
        `missing_start_uses_anchor:${anchorBasis}`,
        `end:${b.step}`,
      );
      return {
        startDate: anchorDate,
        endDate: b.date,
        validityType: "dated",
        audit,
      };
    }
  } else if (start) {
    const a = construct(start.part, anchorDate, false);
    if (!a.date) audit.blockers.push(a.blocker!);
    else if (hasWeeklyPattern(text)) {
      audit.steps.push(`start:${a.step}`, "weekly_pattern_without_end_date");
      return {
        startDate: a.date,
        endDate: null,
        validityType: "open_ended",
        audit,
      };
    } else audit.blockers.push("end_date_missing_and_no_clear_weekly_pattern");
  }
  return { startDate: null, endDate: null, validityType: null, audit };
}
