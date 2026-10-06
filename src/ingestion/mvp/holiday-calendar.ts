import { DateTime } from "luxon";

export type HolidayKind =
  "public_holiday" | "public_holiday_eve" | "lunar_new_year_eve";
export type HolidayEntry = {
  date: string;
  kinds: HolidayKind[];
  provisional?: boolean;
  observed?: boolean;
  name?: string;
};
export type HolidayCalendar = {
  version: string;
  retrievedAt: string;
  sourceUrls: string[];
  coverageStart: string;
  coverageEnd: string;
  entries: HolidayEntry[];
};

// Dates follow MOM's published tables retrieved 2026-10-06. Hari Raya dates
// remain provisional where MOM marks them subject to confirmation.
export const MOM_HOLIDAY_SOURCES = [
  "https://www.mom.gov.sg/newsroom/press-releases/2025/0616-public-holidays-for-2026",
  "https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027",
] as const;

function calendarEntries(year: number): HolidayEntry[] {
  const dates: Array<[string, string, boolean?]> =
    year === 2026
      ? [
          ["2026-01-01", "New Year's Day"],
          ["2026-02-17", "Chinese New Year"],
          ["2026-02-18", "Chinese New Year"],
          ["2026-03-21", "Hari Raya Puasa", true],
          ["2026-04-03", "Good Friday"],
          ["2026-05-01", "Labour Day"],
          ["2026-05-27", "Hari Raya Haji", true],
          ["2026-05-31", "Vesak Day"],
          ["2026-06-01", "Vesak Day (observed)"],
          ["2026-08-09", "National Day"],
          ["2026-08-10", "National Day (observed)"],
          ["2026-11-08", "Deepavali"],
          ["2026-11-09", "Deepavali (observed)"],
          ["2026-12-25", "Christmas Day"],
        ]
      : [
          ["2027-01-01", "New Year's Day"],
          ["2027-02-06", "Chinese New Year"],
          ["2027-02-07", "Chinese New Year"],
          ["2027-02-08", "Chinese New Year (observed)"],
          ["2027-03-10", "Hari Raya Puasa"],
          ["2027-03-26", "Good Friday"],
          ["2027-05-01", "Labour Day"],
          ["2027-05-17", "Hari Raya Haji"],
          ["2027-05-20", "Vesak Day"],
          ["2027-08-09", "National Day"],
          ["2027-10-28", "Deepavali"],
          ["2027-12-25", "Christmas Day"],
        ];
  const lunar = dates
    .filter(([, name]) => name === "Chinese New Year")
    .slice(0, 1);
  const entries = dates.map(([date, name, provisional]) => ({
    date,
    name,
    kinds: ["public_holiday"] as HolidayKind[],
    ...(provisional ? { provisional: true } : {}),
    ...(name.includes("(observed)") ? { observed: true } : {}),
  }));
  for (const [date] of lunar) {
    const eve = DateTime.fromISO(date).minus({ days: 1 }).toISODate()!;
    entries.push({
      date: eve,
      name: "Lunar New Year's Eve",
      kinds: ["public_holiday_eve", "lunar_new_year_eve"],
    });
  }
  for (const entry of [...entries]) {
    if (entry.kinds.includes("public_holiday")) {
      const eve = DateTime.fromISO(entry.date).minus({ days: 1 }).toISODate()!;
      if (
        !entries.some(
          (item) =>
            item.date === eve && item.kinds.includes("public_holiday_eve"),
        )
      )
        entries.push({
          date: eve,
          name: `${entry.name} eve`,
          kinds: ["public_holiday_eve"],
          ...(entry.provisional ? { provisional: true } : {}),
        });
    }
  }
  return entries;
}

export const MOM_HOLIDAY_CALENDAR: HolidayCalendar = {
  version: "mom-sg-public-holidays-2026-2027-v1",
  retrievedAt: "2026-10-06",
  sourceUrls: [...MOM_HOLIDAY_SOURCES],
  coverageStart: "2026-01-01",
  coverageEnd: "2027-12-31",
  entries: [...calendarEntries(2026), ...calendarEntries(2027)],
};

export function holidayKindsOn(
  date: string,
  calendar: HolidayCalendar,
): { kinds: HolidayKind[]; provisional: boolean } | null {
  const entries = calendar.entries.filter((item) => item.date === date);
  if (!entries.length) return null;
  return {
    kinds: [...new Set(entries.flatMap((entry) => entry.kinds))],
    provisional: entries.some((entry) => entry.provisional ?? false),
  };
}
