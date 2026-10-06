import { describe, expect, it } from "vitest";
import { normalizeMvpDates } from "@/ingestion/mvp/date-policy";

it("does not skip an invalid intermediate month or rewrite an explicit month year", () => {
  expect(
    normalizeMvpDates({
      text: "From 1 May 2026 till 31st",
      firstSeenAt: "2026-01-01",
    }).validityType,
  ).toBeNull();
  expect(
    normalizeMvpDates({
      text: "Valid in December 2027",
      firstSeenAt: "2026-10-01",
    }),
  ).toMatchObject({ startDate: "2027-12-01", endDate: "2027-12-31" });
  expect(
    normalizeMvpDates({
      text: "Valid in next January",
      firstSeenAt: "2026-12-01",
    }),
  ).toMatchObject({ startDate: "2027-01-01", endDate: "2027-01-31" });
});
it("assigns Now-range end roles and abstains from multiple single dates", () => {
  expect(
    normalizeMvpDates({
      text: "📅 Now - 30 Sep",
      publishedAt: "2026-09-01T17:00:00Z",
    }),
  ).toMatchObject({ startDate: "2026-09-02", endDate: "2026-09-30" });
  expect(
    normalizeMvpDates({
      text: "📅 Today",
      publishedAt: "2026-09-01T17:00:00Z",
    }),
  ).toMatchObject({ startDate: "2026-09-02", endDate: "2026-09-02" });
  expect(
    normalizeMvpDates({
      text: "Valid on 1 Nov and valid on 8 Nov",
      publishedAt: "2026-10-01",
    }).validityType,
  ).toBeNull();
});
it("does not convert bounded-month or rhetorical copy into open-ended validity", () => {
  for (const text of [
    "Celebrate National Day all month long; weekday specials Tues to Thurs",
    "Did someone say cocktails on Wednesdays?",
  ])
    expect(
      normalizeMvpDates({ text, publishedAt: "2026-08-10T00:00:00Z" })
        .validityType,
    ).toBeNull();
});

describe("MVP offer date policy", () => {
  const cases = [
    ["Till 5th", "2026-10-28", "2026-10-28", "2026-11-05", "dated"],
    ["Till 15 Jan", "2026-12-20", "2026-12-20", "2027-01-15", "dated"],
    [
      "From 25 Dec; till 5th",
      "2026-10-28",
      "2026-12-25",
      "2027-01-05",
      "dated",
    ],
    ["From 25th; every Fri", "2026-10-28", "2026-10-25", null, "open_ended"],
    ["Valid on 15 Nov", "2026-10-28", "2026-11-15", "2026-11-15", "dated"],
    ["Valid in December", "2026-10-28", "2026-12-01", "2026-12-31", "dated"],
    ["Till end of month", "2026-10-28", "2026-10-28", "2026-10-31", "dated"],
    ["Valid from 30 Nov 2026 to 1 Nov 2026", "2026-10-28", null, null, null],
  ] as const;

  it.each(cases)(
    "handles the spec case %s",
    (text, anchor, startDate, endDate, validityType) => {
      const result = normalizeMvpDates({
        text: `📅 ${text}`,
        firstSeenAt: anchor,
      });
      expect(result).toMatchObject({ startDate, endDate, validityType });
      if (validityType === null)
        expect(result.audit.blockers.length).toBeGreaterThan(0);
      else expect(result.audit.blockers).toEqual([]);
    },
  );

  it("prefers trusted publication date and records exact raw quote offsets", () => {
    const text = "📅 Now till 31 Oct";
    const result = normalizeMvpDates({
      text,
      publishedAt: "2026-10-20T10:00:00+08:00",
      firstSeenAt: "2026-12-01T00:00:00+08:00",
    });
    expect(result).toMatchObject({
      startDate: "2026-10-20",
      endDate: "2026-10-31",
      validityType: "dated",
    });
    expect(result.audit.anchorBasis).toBe("posted");
    const fragment = result.audit.fragments[0]!;
    expect(text.slice(fragment.start, fragment.end)).toBe(fragment.quote);
    expect(fragment.quote).toBe("31 Oct");
  });

  it("uses Singapore calendar date for offset instants and the trusted anchor for weekly starts", () => {
    expect(
      normalizeMvpDates({
        text: "Every Fri",
        publishedAt: "2026-10-28T17:30:00Z",
      }),
    ).toMatchObject({
      startDate: "2026-10-29",
      endDate: null,
      validityType: "open_ended",
      audit: { anchorDate: "2026-10-29", anchorBasis: "posted" },
    });
  });

  it("supports an inherited month and year in a partial day range", () => {
    const result = normalizeMvpDates({
      text: "📅 1 - 30 Sep 2026",
      firstSeenAt: "2026-08-20",
    });
    expect(result).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      validityType: "dated",
    });
    expect(result.audit.steps).toContain(
      "range_start_inherits_explicit_month_and_year_from_shared_range",
    );
  });

  it("preserves fully explicit periods without any anchor", () => {
    expect(
      normalizeMvpDates({ text: "Valid from 1 Nov 2026 to 30 Nov 2026" }),
    ).toMatchObject({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      validityType: "dated",
      audit: { anchorBasis: "unavailable", blockers: [] },
    });
  });

  it("recognizes ISO dates in a valid-on single-day statement", () => {
    expect(normalizeMvpDates({ text: "📅 Valid on 2026-11-15" })).toMatchObject(
      {
        startDate: "2026-11-15",
        endDate: "2026-11-15",
        validityType: "dated",
      },
    );
  });

  it.each([
    "Valid on 29 Feb 2025",
    "Valid on 31 Apr 2026",
    "Till 31st; every Fri",
  ])("abstains for invalid calendar input: %s", (text) => {
    const result = normalizeMvpDates({
      text: `📅 ${text}`,
      firstSeenAt: "2026-04-01",
    });
    expect(result.validityType).toBeNull();
    expect(result.audit.blockers.length).toBeGreaterThan(0);
  });

  it("ignores contest, booking, and unrelated publication dates", () => {
    const result = normalizeMvpDates({
      text: "📅 Valid in December. Contest ends 5 Nov; book by 10 Nov; published 1 Oct",
      firstSeenAt: "2026-10-28",
    });
    expect(result).toMatchObject({
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      validityType: "dated",
    });
  });

  it("does not infer an expiry for limited-time wording; weekly cadence permits open-ended validity", () => {
    expect(
      normalizeMvpDates({ text: "Limited time only" }).validityType,
    ).toBeNull();
    expect(normalizeMvpDates({ text: "Every Fri" })).toMatchObject({
      validityType: "open_ended",
      endDate: null,
    });
  });
});
