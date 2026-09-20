import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { demoPromotions } from "@/domain/demo";
import {
  validity,
  promotionSchema,
  publicationIssues,
} from "@/domain/promotion";
import {
  cleanCandidate,
  normalise,
  relativeDate,
  positiveDays,
} from "@/ingestion/cleanup";
const offer = () => ({
  ...demoPromotions()[0],
  startDate: "2026-12-30",
  endDate: "2027-01-02",
  hours: { start: "10:00", end: "21:00" },
});
describe("Singapore validity and publication", () => {
  it("includes end date until Singapore midnight", () => {
    expect(
      validity(offer(), DateTime.fromISO("2027-01-02T15:59:59Z")).ongoing,
    ).toBe(true);
    expect(
      validity(offer(), DateTime.fromISO("2027-01-02T16:00:00Z")).ongoing,
    ).toBe(false);
  });
  it("keeps future, withdrawn and unknown expiry off the map", () => {
    const p = offer();
    expect(validity(p, DateTime.fromISO("2026-12-29")).ongoing).toBe(false);
    expect(
      validity({ ...p, status: "withdrawn" }, DateTime.fromISO("2026-12-31"))
        .ongoing,
    ).toBe(false);
    expect(
      validity({ ...p, endDate: null }, DateTime.fromISO("2026-12-31")).ongoing,
    ).toBe(false);
  });
  it("respects weekdays, hours and public holidays separately", () => {
    const p = { ...offer(), weekdays: [6] };
    expect(
      validity(p, DateTime.fromISO("2027-01-01T12:00:00+08:00")).redeemableNow,
    ).toBe(false);
    expect(
      validity(p, DateTime.fromISO("2027-01-02T12:00:00+08:00")).redeemableNow,
    ).toBe(true);
    expect(
      validity(p, DateTime.fromISO("2027-01-02T21:00:00+08:00")).redeemableNow,
    ).toBe(false);
    expect(
      validity(
        {
          ...p,
          excludePublicHolidays: true,
          holidayDates: ["2027-01-02"],
          holidayCalendarThrough: "2027-12-31",
        },
        DateTime.fromISO("2027-01-02T12:00:00+08:00"),
      ).redeemableNow,
    ).toBe(false);
  });
  it("does not present unknown hours as available now", () => {
    expect(
      validity({ ...offer(), hours: null }, DateTime.fromISO("2027-01-01"))
        .redeemableNow,
    ).toBe(false);
  });
  it("requires complete holiday coverage and valid ranges", () => {
    expect(
      publicationIssues({ ...offer(), excludePublicHolidays: true }),
    ).toContain("incomplete_holiday_calendar");
    expect(publicationIssues({ ...offer(), endDate: "2026-01-01" })).toContain(
      "invalid_date_range",
    );
  });
  it("rejects impossible dates, unsafe sources and unverified branches", () => {
    expect(
      promotionSchema.safeParse({ ...offer(), startDate: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      promotionSchema.safeParse({
        ...offer(),
        sources: [{ label: "bad", url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
    expect(
      promotionSchema.safeParse({
        ...offer(),
        outlets: [{ ...offer().outlets[0], evidence: "" }],
      }).success,
    ).toBe(false);
  });
});
describe("Conservative cleanup", () => {
  it("preserves commercial qualifiers and resolves today from source date", () => {
    expect(normalise("Up to 50%\r\n $12++  selected outlets")).toBe(
      "Up to 50%\n $12++ selected outlets",
    );
    expect(relativeDate("today", "2026-01-01T17:00:00Z")).toBe("2026-01-02");
    expect(relativeDate("next weekend", "2026-01-01T00:00:00Z")).toBe(null);
  });
  it("routes missing validity to review with a due date", () => {
    const result = cleanCandidate(
      { ...offer(), endDate: null },
      DateTime.fromISO("2026-01-01T00:00:00Z"),
    );
    expect(result.promotion?.status).toBe("needs_review");
    expect(result.promotion?.reviewDueAt).toBe("2026-01-08T00:00:00.000Z");
  });
  it("keeps image/selected-outlet ambiguity unpublished", () => {
    expect(
      cleanCandidate({ title: "Up to 50%, selected outlets, terms in image" })
        .promotion,
    ).toBe(null);
  });
  it("validates configurable policy values", () => {
    expect(positiveDays("90", 30)).toBe(90);
    expect(() => positiveDays("0", 30)).toThrow();
    expect(() => positiveDays("banana", 7)).toThrow();
  });
});

describe("Overnight redemption windows", () => {
  const night = () => ({
    ...offer(),
    weekdays: [5],
    hours: { start: "22:00", end: "02:00" },
  });
  it("uses the starting weekday after midnight", () => {
    expect(
      validity(night(), DateTime.fromISO("2027-01-01T23:00:00+08:00"))
        .redeemableNow,
    ).toBe(true);
    expect(
      validity(night(), DateTime.fromISO("2027-01-02T01:59:00+08:00"))
        .redeemableNow,
    ).toBe(true);
    expect(
      validity(night(), DateTime.fromISO("2027-01-02T02:00:00+08:00"))
        .redeemableNow,
    ).toBe(false);
  });
  it("does not leak before the first date or after the final date", () => {
    expect(
      validity(
        { ...night(), startDate: "2027-01-02" },
        DateTime.fromISO("2027-01-02T01:00:00+08:00"),
      ).redeemableNow,
    ).toBe(false);
    expect(
      validity(
        { ...night(), endDate: "2027-01-01" },
        DateTime.fromISO("2027-01-02T01:00:00+08:00"),
      ).ongoing,
    ).toBe(false);
  });
  it("applies holiday exclusion to the actual redemption date", () => {
    expect(
      validity(
        {
          ...night(),
          excludePublicHolidays: true,
          holidayDates: ["2027-01-02"],
          holidayCalendarThrough: "2027-12-31",
        },
        DateTime.fromISO("2027-01-02T01:00:00+08:00"),
      ).redeemableNow,
    ).toBe(false);
  });
  it("rejects an ambiguous equal start and end", () => {
    expect(
      promotionSchema.safeParse({
        ...night(),
        hours: { start: "00:00", end: "00:00" },
      }).success,
    ).toBe(false);
  });
});

it("cutoff never invents a start and limits an otherwise known interval", () => {
  const p = {
    ...offer(),
    startDate: "2027-01-01",
    endDate: "2027-01-01",
    weekdays: null,
    excludePublicHolidays: false,
    redemptionCutoff: "11:00",
  };
  expect(
    validity(
      { ...p, hours: null },
      DateTime.fromISO("2027-01-01T10:00:00+08:00"),
    ).redeemableNow,
  ).toBe(false);
  expect(
    validity(
      { ...p, hours: { start: "09:00", end: "14:00" } },
      DateTime.fromISO("2027-01-01T10:00:00+08:00"),
    ).redeemableNow,
  ).toBe(true);
  expect(
    validity(
      { ...p, hours: { start: "09:00", end: "14:00" } },
      DateTime.fromISO("2027-01-01T11:00:00+08:00"),
    ).redeemableNow,
  ).toBe(false);
});
it("cutoffs are schema checked and change the publication fingerprint", async () => {
  const { fingerprint } = await import("@/server/db/publication");
  expect(
    promotionSchema.safeParse({ ...offer(), redemptionCutoff: "25:00" })
      .success,
  ).toBe(false);
  expect(fingerprint({ ...offer(), redemptionCutoff: "11:00" })).not.toBe(
    fingerprint(offer()),
  );
  expect(fingerprint({ ...offer(), redemptionCutoff: null })).toBe(
    fingerprint(offer()),
  );
});
