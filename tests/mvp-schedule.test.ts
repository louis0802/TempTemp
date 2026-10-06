import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  evaluateMvpSchedule,
  parseMvpSchedule,
} from "../src/ingestion/mvp/schedule.js";

describe("MVP schedule parsing", () => {
  it("keeps quota-daily separate from offer weekdays and ignores rhetorical weekday copy", () => {
    const parsed = parseMvpSchedule(
      "Limited to first 1,000 customers daily\n⏰ 2PM - 8PM",
    );
    expect(parsed.rules[0]).toMatchObject({
      weekdays: null,
      timeKind: "range",
      start: "14:00",
      end: "20:00",
    });
    expect(
      parseMvpSchedule("Did someone say cocktails on Wednesdays?")
        .weeklyPattern,
    ).toBe(false);
  });
  it("includes intervening weekdays in abbreviated and full-name to ranges", () => {
    expect(
      parseMvpSchedule("Tues to Thurs 2pm - 5pm").rules[0].weekdays,
    ).toEqual([2, 3, 4]);
    expect(
      parseMvpSchedule("Friday to Sunday 2pm - 5pm").rules[0].weekdays,
    ).toEqual([5, 6, 7]);
  });
  it("retains weekday, clock, and public holiday exclusion as one rule", () => {
    const text = "Weekdays\n🕣 2 - 5pm\n📍 All outlets\n❗️ Excl. PH.";
    const parsed = parseMvpSchedule(text);
    expect(parsed.weeklyPattern).toBe(true);
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0]).toMatchObject({
      weekdays: [1, 2, 3, 4, 5],
      timeKind: "range",
      start: "14:00",
      end: "17:00",
      exclusions: ["public_holiday"],
      outletNames: [],
      conditions: ["All outlets"],
    });
    const e = parsed.rules[0].evidence;
    expect(text.slice(e.start, e.end)).toBe(e.quote);
  });
  it("records both PH and PH-eve exclusions when the source states both", () => {
    const parsed = parseMvpSchedule("Weekdays 2-5pm; Excluding PH eve & PH");
    expect(parsed.rules[0].exclusions).toEqual([
      "public_holiday_eve",
      "public_holiday",
    ]);
    expect(
      parseMvpSchedule("Weekdays 2-5pm; Excl. PH eve").rules[0].exclusions,
    ).toEqual(["public_holiday_eve"]);
    expect(
      parseMvpSchedule("Weekdays 2-5pm; Excl. LNY eve").rules[0].exclusions,
    ).toEqual(["lunar_new_year_eve"]);
  });
  it("keeps opening-to, onward, point, and last-order meanings distinct", () => {
    expect(parseMvpSchedule("Opening till 10.30am").rules[0]).toMatchObject({
      timeKind: "opening_to",
      start: null,
      end: "10:30",
    });
    expect(parseMvpSchedule("12pm onwards").rules[0]).toMatchObject({
      timeKind: "after",
      start: "12:00",
      end: null,
    });
    expect(parseMvpSchedule("12.30pm").rules[0]).toMatchObject({
      timeKind: "point",
      start: "12:30",
      end: null,
    });
    expect(parseMvpSchedule("Last order at 9pm").rules[0]).toMatchObject({
      timeKind: "last_order",
      start: null,
      end: "21:00",
    });
  });
  it("keeps weekdays and time rules separate when the source separates their groups", () => {
    const parsed = parseMvpSchedule("Every Fri 12 - 3pm\nEvery Sat 1 - 4pm");
    expect(parsed.rules.map((r) => r.weekdays)).toEqual([[5], [6]]);
    expect(parsed.rules.map((r) => r.start)).toEqual(["12:00", "13:00"]);
  });
  it("does not invent association or unsupported time endpoints", () => {
    const parsed = parseMvpSchedule("Every Fri");
    expect(parsed.rules.some((r) => r.timeKind === "unknown")).toBe(true);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });
  it("abstains on multiple time spans and does not turn redemption-adjacent evidence into a range", () => {
    const grouped = parseMvpSchedule("Mon 2-5pm | Sun 3-6pm");
    expect(grouped.rules).toHaveLength(2);
    const ambiguous = parseMvpSchedule("Mon 2-5pm and 7-9pm");
    expect(ambiguous.rules[0].issues.length).toBeGreaterThan(0);
    expect(parseMvpSchedule("1-for-1").rules).toHaveLength(0);
    expect(parseMvpSchedule("From 1 - 3 Nov").rules).toHaveLength(0);
    expect(parseMvpSchedule("$3.50").rules).toHaveLength(0);
  });
});

describe("MVP schedule evaluation", () => {
  it("uses Singapore weekday and clock, preserving overnight origin weekday", () => {
    const rules = parseMvpSchedule("Every Fri 10pm - 2am").rules;
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-09T23:00:00+08:00")),
    ).toBe("Within listed offer hours");
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-10T01:00:00+08:00")),
    ).toBe("Within listed offer hours");
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-10T02:01:00+08:00")),
    ).toBe("Outside listed offer hours");
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-10T23:00:00+08:00")),
    ).toBe("Outside listed offer hours");
  });
  it("returns Check source without a required holiday calendar and respects bounded dates", () => {
    const rules = parseMvpSchedule("Weekdays 2-5pm Excl. PH").rules;
    expect(
      evaluateMvpSchedule(
        rules,
        DateTime.fromISO("2026-10-06T15:00:00+08:00"),
        { calendar: null },
      ),
    ).toBe("Check source");
    expect(
      evaluateMvpSchedule(
        rules,
        DateTime.fromISO("2026-10-06T15:00:00+08:00"),
        { startDate: "2026-10-07" },
      ),
    ).toBe("Outside listed offer hours");
  });
  it("never treats a missing opening time as midnight", () => {
    const rules = parseMvpSchedule("Opening till 10.30am").rules;
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-06T09:00:00+08:00")),
    ).toBe("Check source");
    expect(
      evaluateMvpSchedule(rules, DateTime.fromISO("2026-10-06T11:00:00+08:00")),
    ).toBe("Outside listed offer hours");
  });
  it("does not claim Within from opening-to, point, last-order, or operating-hours facts", () => {
    const at = DateTime.fromISO("2026-10-06T09:00:00+08:00");
    for (const text of [
      "Opening till 10.30am",
      "12.30pm",
      "Last order at 9pm",
      "Operating hours 10am-10pm",
    ]) {
      expect(evaluateMvpSchedule(parseMvpSchedule(text).rules, at)).toBe(
        "Check source",
      );
    }
    expect(
      evaluateMvpSchedule(
        parseMvpSchedule("Opening till 10.30am").rules,
        DateTime.fromISO("2026-10-06T11:00:00+08:00"),
      ),
    ).toBe("Outside listed offer hours");
  });
  it("requires an exact outlet selection for outlet-scoped schedules", () => {
    const rules = parseMvpSchedule(
      "Weekdays 2-5pm; Outlets: Jurong Point",
    ).rules;
    const now = DateTime.fromISO("2026-10-06T15:00:00+08:00");
    expect(evaluateMvpSchedule(rules, now)).toBe("Check source");
    expect(
      evaluateMvpSchedule(rules, now, { outletName: "Jurong Point" }),
    ).toBe("Within listed offer hours");
    expect(evaluateMvpSchedule(rules, now, { outletName: "Jurong" })).toBe(
      "Outside listed offer hours",
    );
  });
});
