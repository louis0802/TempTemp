import { DateTime } from "luxon";
import type {
  ListedScheduleState,
  ScheduleParseResult,
  ScheduleRule,
} from "../../domain/mvp-policy";
import {
  holidayKindsOn,
  MOM_HOLIDAY_CALENDAR,
  type HolidayCalendar,
  type HolidayKind,
} from "./holiday-calendar";

const weekdayNames: Record<string, number> = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
};
type Span = { start: number; end: number; quote: string };
function spans(text: string, re: RegExp): Span[] {
  return [...text.matchAll(re)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
    quote: m[0],
  }));
}
function weekdaySet(text: string): number[] | null {
  const s = text.toLowerCase();
  if (/\b(?:daily|every day)\b/.test(s)) return [1, 2, 3, 4, 5, 6, 7];
  if (/\bweekdays?\b/.test(s)) return [1, 2, 3, 4, 5];
  if (/\bweekends?\b/.test(s)) return [6, 7];
  const found = [
    ...s.matchAll(
      /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi,
    ),
  ];
  const nums = new Set(found.map((m) => weekdayNames[m[1].toLowerCase()]));
  for (const m of s.matchAll(
    /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:[-–—]|to)\s*(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi,
  )) {
    let n = weekdayNames[m[1]];
    const end = weekdayNames[m[2]];
    for (;;) {
      nums.add(n);
      if (n === end) break;
      n = (n % 7) + 1;
    }
  }
  return nums.size ? [...nums].sort((a, b) => a - b) : null;
}
function clockValue(raw: string): string | null {
  const m = raw
    .toLowerCase()
    .replace(/\s/g, "")
    .match(/^(\d{1,2})(?:[.:](\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3] === "pm" ? 12 : 0);
  }
  if (h > 23 || minute > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function timeRule(
  quote: string,
): Pick<ScheduleRule, "timeKind" | "start" | "end"> | null {
  const clean = quote.replace(/\s+/g, " ");
  const suffix = "(?:\\s*(am|pm))?";
  const range = clean.match(
    new RegExp(
      `(\\d{1,2}(?:[.:]\\d{2})?)${suffix}\\s*(?:-|–|—|to)\\s*(\\d{1,2}(?:[.:]\\d{2})?)${suffix}`,
      "i",
    ),
  );
  if (range) {
    const mer = range[2] ?? range[4];
    const a = clockValue(range[1] + (range[2] ?? mer ?? "")),
      b = clockValue(range[3] + (range[4] ?? mer ?? ""));
    return a && b
      ? {
          timeKind: /operating\s+hours/i.test(clean)
            ? "operating_hours"
            : "range",
          start: a,
          end: b,
        }
      : null;
  }
  const opening = clean.match(
    /\bopening\s+(?:till|until|to)\s+(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?)\b/i,
  );
  if (opening) {
    const end = clockValue(opening[1]);
    return end ? { timeKind: "opening_to", start: null, end } : null;
  }
  const last = clean.match(
    /\blast\s+order\s+(?:at\s+)?(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?)\b/i,
  );
  if (last) {
    const end = clockValue(last[1]);
    return end ? { timeKind: "last_order", start: null, end } : null;
  }
  const before = clean.match(
    /\bbefore\s+(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?)\b/i,
  );
  if (before) {
    const end = clockValue(before[1]);
    return end ? { timeKind: "before", start: null, end } : null;
  }
  const after = clean.match(
    /\b(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?)\s+onwards\b/i,
  );
  if (after) {
    const start = clockValue(after[1]);
    return start ? { timeKind: "after", start, end: null } : null;
  }
  const point = clean.match(/\b(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm))\b/i);
  if (point) {
    const t = clockValue(point[1]);
    return t ? { timeKind: "point", start: t, end: null } : null;
  }
  return null;
}

export function parseMvpSchedule(text: string): ScheduleParseResult {
  const rules: ScheduleRule[] = [],
    issues: string[] = [];
  const weekdaySpans = spans(
    text,
    /\b(?:daily|every day|weekdays?|weekends?|(?:Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:r|rs|rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(?:\s*(?:&|and|,|to|[-–—])\s*(?:Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:r|rs|rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?))*)\b/gi,
  ).filter((span) => {
    const lineStart = text.lastIndexOf("\n", span.start - 1) + 1;
    const lineEnd = text.indexOf("\n", span.end);
    const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
    return (
      !line.includes("?") &&
      !(
        /\bdaily\b/i.test(span.quote) &&
        /\bfirst\s+[\d,]+\s+(?:customers|cups|orders|redemptions)\b|\bquota\b/i.test(
          line,
        )
      )
    );
  });
  const timeSpans = spans(
    text,
    /\b(?:opening\s+(?:till|until|to)\s+\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?|last\s+order\s+(?:at\s+)?\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?|before\s+\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?|\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)\s+onwards|\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)?|\d{1,2}(?:[.:]\d{2})\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/gi,
  ).filter((s) => {
    const marked = /(?:am|pm)/i.test(s.quote) || /:\d{2}/.test(s.quote);
    const context = text.slice(Math.max(0, s.start - 12), s.start);
    if (/[$£€]\s*$/.test(context)) return false;
    return (
      marked ||
      /(?:🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛|🕐|🕜|🕝|🕞|🕟|🕠|🕡|🕢|🕣|🕤|🕥|🕦|🕧)\s*$/.test(
        context,
      ) ||
      /\bat\s*$/i.test(context)
    );
  });
  const scopes = spans(
    text,
    /\b(?:\$\s?\d+(?:\.\d{2})?|(?:selected|all) outlets?|outlets?\s*:[^\n,;]+)/gi,
  );
  const holidaySpans = spans(
    text,
    /\b(?:excl(?:uding)?\.?|no)\s+[^.!?\n;]{1,60}\b/gi,
  ).filter((s) =>
    /\b(?:PH|public holidays?|holidays?|eve|LNY|Lunar New Year)\b/i.test(
      s.quote,
    ),
  );
  const all = [...weekdaySpans, ...timeSpans, ...scopes, ...holidaySpans].sort(
    (a, b) => a.start - b.start,
  );
  const groups: Span[][] = [];
  for (const span of all) {
    let group = groups.at(-1);
    const gap = group ? text.slice(group.at(-1)!.end, span.start) : "";
    const isWeekday = weekdaySpans.some((y) => y.start === span.start);
    const previousHasWeekday = group?.some((x) =>
      weekdaySpans.some((y) => y.start === x.start),
    );
    if (
      !group ||
      gap.length > 65 ||
      /[|.!?\n]{2,}/.test(gap) ||
      /\|/.test(gap) ||
      (gap.includes("\n") && isWeekday && previousHasWeekday)
    )
      groups.push((group = []));
    group.push(span);
  }
  for (const group of groups) {
    const lo = group[0].start,
      hi = group.at(-1)!.end,
      quote = text.slice(lo, hi);
    const ws = group.filter((x) =>
      weekdaySpans.some((y) => y.start === x.start),
    );
    const ts = group.filter((x) => timeSpans.some((y) => y.start === x.start));
    const ds = group.filter((x) => scopes.some((y) => y.start === x.start));
    const hs = group.filter((x) =>
      holidaySpans.some((y) => y.start === x.start),
    );
    const weekdays = weekdaySet(ws.map((x) => x.quote).join(" "));
    let tr = ts.map((x) => timeRule(x.quote)).find(Boolean);
    if (
      tr?.timeKind === "range" &&
      ts[0] &&
      /operating\s+hours/i.test(
        text.slice(Math.max(0, ts[0].start - 30), ts[0].end),
      )
    )
      tr = { ...tr, timeKind: "operating_hours" };
    const exclusions: HolidayKind[] = [];
    for (const h of hs) {
      const v = h.quote.toLowerCase();
      const lunarEve = /\b(?:lny|lunar new year(?:'s)?)\s+eve\b/.test(v);
      const publicHolidayEve =
        /\b(?:ph|public holidays?)\s+eve\b/.test(v) ||
        /\beve\s+of\s+(?:a\s+)?(?:ph|public holidays?)\b/.test(v);
      const remaining = v
        .replace(/\b(?:ph|public holidays?)\s+eve\b/g, " ")
        .replace(/\beve\s+of\s+(?:a\s+)?(?:ph|public holidays?)\b/g, " ");
      if (lunarEve) exclusions.push("lunar_new_year_eve");
      if (publicHolidayEve) exclusions.push("public_holiday_eve");
      if (/\b(?:ph|public holidays?)\b/.test(remaining))
        exclusions.push("public_holiday");
    }
    const outlets = ds
      .filter(
        (x) =>
          /outlet/i.test(x.quote) &&
          !/^(?:all|selected) outlets?$/i.test(x.quote.trim()),
      )
      .map((x) => x.quote.trim().replace(/^outlets?\s*:\s*/i, ""));
    const conditions = [
      ...ds.filter((x) => !/outlet/i.test(x.quote)),
      ...ds.filter((x) => /^(?:all|selected) outlets?$/i.test(x.quote.trim())),
    ].map((x) => x.quote.trim());
    const unknown =
      (!weekdays && !tr && !exclusions.length) ||
      (ts.length > 0 && (!tr || ts.length > 1)) ||
      (ws.length > 0 && !weekdays) ||
      (ws.length > 0 && !tr);
    if (unknown)
      issues.push(`Unparsed or ambiguously associated schedule text: ${quote}`);
    const rule: ScheduleRule = {
      evidence: { quote, start: lo, end: hi },
      weekdays,
      timeKind: tr?.timeKind ?? "unknown",
      start: tr?.start ?? null,
      end: tr?.end ?? null,
      exclusions: [...new Set(exclusions)],
      outletNames: outlets,
      conditions,
      issues: unknown ? ["schedule_unparsed_or_ambiguous"] : [],
    };
    rules.push(rule);
  }
  if (issues.length) {
    for (const rule of rules)
      if (!rule.issues.includes("schedule_parse_incomplete"))
        rule.issues.push("schedule_parse_incomplete");
  }
  const weeklyPattern = rules.some((r) => r.weekdays !== null);
  return { rules, issues, weeklyPattern };
}

function clockMinutes(clock: string | null): number | null {
  return clock ? Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3)) : null;
}
function kindsForDate(
  date: string,
  calendar: HolidayCalendar,
): { kinds: HolidayKind[]; provisional: boolean } | null {
  return holidayKindsOn(date, calendar);
}

export function evaluateMvpSchedule(
  rules: ScheduleRule[],
  now: DateTime,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    ttlDays?: number;
    calendar?: HolidayCalendar | null;
    outletName?: string | null;
  } = {},
): ListedScheduleState {
  const zoneNow = now.setZone("Asia/Singapore");
  if (
    !zoneNow.isValid ||
    !rules.length ||
    rules.some((r) => r.issues.length || r.timeKind === "unknown")
  )
    return "Check source";
  const calendar =
    options.calendar === undefined ? MOM_HOLIDAY_CALENDAR : options.calendar;
  const horizon = Math.max(0, options.ttlDays ?? 14),
    cap = zoneNow.plus({ days: horizon }).startOf("day");
  const end = options.endDate
    ? DateTime.fromISO(options.endDate, { zone: "Asia/Singapore" }).endOf("day")
    : cap;
  const through = end < cap ? end : cap;
  if (!calendar)
    return rules.some((r) => r.exclusions.length)
      ? "Check source"
      : evaluateAtInstant(rules, zoneNow, options);
  if (
    calendar.coverageStart > zoneNow.toISODate()! ||
    calendar.coverageEnd < through.toISODate()!
  )
    return "Check source";
  return evaluateAtInstant(rules, zoneNow, options, calendar);
}
function evaluateAtInstant(
  rules: ScheduleRule[],
  now: DateTime,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    outletName?: string | null;
  },
  calendar?: HolidayCalendar,
): ListedScheduleState {
  const local = now.setZone("Asia/Singapore"),
    date = local.toISODate()!,
    minute = local.hour * 60 + local.minute;
  const previous = local.minus({ days: 1 }),
    previousDate = previous.toISODate()!;
  let uncertain = false;
  for (const r of rules) {
    if (
      (options.startDate && date < options.startDate) ||
      (options.endDate && date > options.endDate)
    )
      continue;
    if (r.outletNames.length && !options.outletName) {
      uncertain = true;
      continue;
    }
    if (
      options.outletName &&
      r.outletNames.length &&
      !r.outletNames.some(
        (n) =>
          n.trim().toLowerCase() === options.outletName!.trim().toLowerCase(),
      )
    )
      continue;
    const start = clockMinutes(r.start),
      finish = clockMinutes(r.end);
    const overnight = start !== null && finish !== null && finish < start;
    const onCurrent = !r.weekdays || r.weekdays.includes(local.weekday);
    const onPrevious =
      overnight &&
      (!r.weekdays || r.weekdays.includes(previous.weekday)) &&
      minute < finish!;
    if (!onCurrent && !onPrevious) continue;
    const effectiveDate = onPrevious ? previousDate : date;
    const holiday = calendar ? kindsForDate(effectiveDate, calendar) : null;
    if (r.exclusions.some((x) => holiday?.kinds.includes(x))) {
      if (holiday?.provisional) uncertain = true;
      continue;
    }
    if (
      r.exclusions.length &&
      (!calendar ||
        ((effectiveDate.startsWith("2026") ||
          effectiveDate.startsWith("2027")) &&
          !holiday))
    ) {
      // absence in a published table means ordinary day; provisional adjacent
      // holidays are separately marked on the preceding day.
    }
    if (r.timeKind === "opening_to" || r.timeKind === "before") {
      if (finish !== null && (onCurrent || onPrevious) && minute <= finish)
        uncertain = true;
      continue;
    }
    if (
      r.timeKind === "point" ||
      r.timeKind === "last_order" ||
      r.timeKind === "operating_hours"
    ) {
      uncertain = true;
      continue;
    }
    if (r.timeKind === "range" || r.timeKind === "after") {
      if (
        overnight
          ? onPrevious || (onCurrent && minute >= start!)
          : onCurrent &&
            (start === null || minute >= start) &&
            (finish === null || minute <= finish)
      )
        return "Within listed offer hours";
    }
  }
  if (uncertain) return "Check source";
  return "Outside listed offer hours";
}
