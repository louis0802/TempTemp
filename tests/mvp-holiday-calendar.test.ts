import { describe, expect, it } from "vitest";
import {
  MOM_HOLIDAY_CALENDAR,
  MOM_HOLIDAY_SOURCES,
  holidayKindsOn,
} from "../src/ingestion/mvp/holiday-calendar.js";

describe("MOM Singapore holiday calendar", () => {
  it("records provenance, retrieval date, 2026/2027 tables and provisional Islamic dates", () => {
    expect(MOM_HOLIDAY_CALENDAR.retrievedAt).toBe("2026-10-06");
    expect(MOM_HOLIDAY_CALENDAR.sourceUrls).toEqual([...MOM_HOLIDAY_SOURCES]);
    expect(
      holidayKindsOn("2026-03-21", MOM_HOLIDAY_CALENDAR)?.provisional,
    ).toBe(true);
    expect(
      holidayKindsOn("2027-03-10", MOM_HOLIDAY_CALENDAR)?.provisional,
    ).toBe(false);
    expect(holidayKindsOn("2026-02-16", MOM_HOLIDAY_CALENDAR)?.kinds).toEqual([
      "public_holiday_eve",
      "lunar_new_year_eve",
    ]);
    expect(holidayKindsOn("2026-02-17", MOM_HOLIDAY_CALENDAR)?.kinds).toEqual([
      "public_holiday",
      "public_holiday_eve",
    ]);
    expect(
      MOM_HOLIDAY_CALENDAR.entries.find((entry) => entry.date === "2026-08-10")
        ?.observed,
    ).toBe(true);
    expect(holidayKindsOn("2027-02-05", MOM_HOLIDAY_CALENDAR)?.kinds).toEqual([
      "public_holiday_eve",
      "lunar_new_year_eve",
    ]);
    expect(holidayKindsOn("2026-08-10", MOM_HOLIDAY_CALENDAR)?.kinds).toContain(
      "public_holiday",
    );
  });
});
