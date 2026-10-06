import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Listing } from "@/domain/promotion";
import { OfferPolicyDetails } from "@/components/mvp/OfferPolicyDetails";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    merchant: "Example",
    title: "Offer",
    benefit: "Save",
    description: "Offer <script>alert(1)</script>\nSecond line",
    terms: [],
    startDate: null,
    endDate: null,
    weekdays: null,
    hours: null,
    scheduleLabel: "Check source",
    excludePublicHolidays: false,
    holidayDates: [],
    holidayCalendarThrough: null,
    outlets: [],
    category: null,
    sources: [{ label: "Original", url: "https://example.com/offer" }],
    verifiedAt: null,
    reviewDueAt: null,
    status: "needs_review",
    revision: 1,
    ongoing: false,
    redeemableNow: false,
    scheduleState: "Check source",
    mvpState: {
      content: "resolved",
      validity: "resolved",
      map: "ready",
      lifecycle: "active",
      reasons: [],
    },
    mvpOfferPolicy: {
      version: "mvp-offer-policy-v1",
      validityType: "open_ended",
      firstSeenAt: null,
      publishedAt: null,
      dateAudit: {
        ruleVersion: "mvp-offer-policy-v1",
        anchorDate: null,
        anchorBasis: "unavailable",
        fragments: [],
        steps: [],
        blockers: [],
      },
      scheduleRules: [
        {
          evidence: { quote: "Weekdays, 2–5pm", start: 0, end: 19 },
          weekdays: [1, 2, 3, 4, 5],
          timeKind: "range",
          start: "14:00",
          end: "17:00",
          exclusions: [],
          outletNames: ["Outlet A"],
          conditions: ["Dine-in only"],
          issues: [],
        },
      ],
      scheduleIssues: [],
      sourceObservation: {
        sourceId: "source",
        sourceKind: "official",
        capability: "current_offer_listing",
        itemKey: "offer",
        firstSeenAt: null,
        lastSeenOnSource: "2026-10-05T16:30:00Z",
        lastSuccessfulCompleteCheckAt: null,
        lastAttemptAt: null,
        lastAttemptStatus: "unknown",
        presence: "unknown",
        snapshotId: null,
        snapshotHash: null,
        ttlDays: 14,
        events: [],
      },
      participationBasis: "stated",
      directoryBasis: "unresolved",
      directoryComplete: false,
      exclusions: [],
      selectedLocations: [],
      sourceTextPolicy: "official_public",
      summary: "Short offer summary",
      scheduleState: "Within listed offer hours",
    },
    ...overrides,
  } as Listing;
}

const render = (value: Listing, showSourceText = false) =>
  renderToStaticMarkup(
    <OfferPolicyDetails listing={value} showSourceText={showSourceText} />,
  );

describe("OfferPolicyDetails", () => {
  it("shows official source text as escaped, wrapping plain text with the source link and Singapore date", () => {
    const html = render(listing());
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("6 Oct 2026");
    expect(html).toContain('href="https://example.com/offer"');
    expect(html).toContain("View source");
    expect(html).toContain("Summary only. Check the source before you go.");
    expect(html).toContain("Weekdays, 2–5pm");
    expect(html).toContain("Locations: Outlet A · Dine-in only");
    expect(html).not.toContain("End unknown");
  });

  it("only reveals Telegram description in debug mode when it exists in the response", () => {
    const telegram = listing({
      mvpOfferPolicy: {
        ...listing().mvpOfferPolicy!,
        sourceTextPolicy: "telegram_private",
      },
    });
    expect(render(telegram)).not.toContain("Offer &lt;script&gt;");
    expect(render(telegram, true)).toContain("Offer &lt;script&gt;");
    expect(render({ ...telegram, description: "" }, true)).not.toContain(
      "Offer &lt;script&gt;",
    );
  });

  it("shows conservative lifecycle and schedule states", () => {
    const stale = listing({
      mvpState: { ...listing().mvpState!, lifecycle: "stale" },
    });
    expect(render(stale)).toContain("May have ended, check source");
    expect(
      render(
        listing({
          mvpOfferPolicy: {
            ...listing().mvpOfferPolicy!,
            scheduleState: "Outside listed offer hours",
          },
        }),
      ),
    ).toContain("Outside listed offer hours");
    expect(
      render(
        listing({
          mvpOfferPolicy: {
            ...listing().mvpOfferPolicy!,
            scheduleState: "Check source",
          },
          mvpState: { ...listing().mvpState!, lifecycle: "unknown" },
        }),
      ),
    ).toContain("Check source");
  });
});
