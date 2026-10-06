import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DateTime } from "luxon";
import { mvpListingAt, presentMvpListing } from "../../src/server/mvp";
import { policyRecord } from "../helpers/mvp-policy";
import type { Listing } from "../../src/domain/promotion";

async function feed(page: import("@playwright/test").Page, items: Listing[]) {
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  await page.route("**/api/mvp/promotions**", (r) => {
    const id = new URL(r.request().url()).pathname.split("/promotions/")[1];
    return r.fulfill({
      json: id
        ? items.find((p) => p.id === id)
        : { items, nextCursor: null, sources: [], demo: false },
    });
  });
  await page.goto("/corpus");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
}
const now = DateTime.fromISO("2026-10-06T15:00:00+08:00");
test("official policy details preserve plaintext, listed-hours meaning and mobile layout", async ({
  page,
}, info) => {
  const record = policyRecord("Official test-only weekly offer"),
    listing = presentMvpListing(mvpListingAt(record, now), false);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await feed(page, [listing]);
  await expect(page.locator(".offer-card")).toContainText(
    "Within listed offer hours",
  );
  await expect(page.locator(".offer-card")).toContainText("No listed end date");
  await page
    .getByRole("checkbox", { name: "Within listed offer hours", exact: true })
    .check();
  await expect(page.locator(".offer-card")).toHaveCount(1);
  await page.locator(".offer-card").click();
  const details = page.getByRole("region", { name: "Offer details" });
  await expect(details).toContainText(
    "Summary only. Check the source before you go.",
  );
  await expect(details).toContainText("Last seen on source: 1 Oct 2026");
  await expect(details).toContainText("<script>unsafe()</script>");
  await expect(details.locator("script")).toHaveCount(0);
  await expect(
    details.getByRole("link", { name: "View source", exact: true }),
  ).toHaveAttribute("href", record.sourceUrl);
  await expect(details).not.toContainText("Available now");
  await expect(page.locator(".maplibregl-marker").first()).toBeAttached();
  await page.screenshot({
    path: `test-results/mvp-policy-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Telegram remains private and opening-to does not imply an opening time", async ({
  page,
}) => {
  const record = policyRecord("Private test-only opening offer");
  record.offerPolicy!.sourceTextPolicy = "telegram_private";
  record.description = "Private Telegram source text must not display";
  record.offerPolicy!.scheduleRules[0] = {
    ...record.offerPolicy!.scheduleRules[0],
    timeKind: "opening_to",
    start: null,
    evidence: { quote: "Opening until 5pm", start: 0, end: 17 },
  };
  await feed(page, [presentMvpListing(mvpListingAt(record, now), false)]);
  await page
    .getByRole("checkbox", { name: "Within listed offer hours", exact: true })
    .check();
  await expect(page.locator(".offer-card")).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Within listed offer hours", exact: true })
    .uncheck();
  await page.locator(".offer-card").click();
  await expect(
    page.getByRole("region", { name: "Offer details" }),
  ).toContainText("Check source");
  await expect(page.locator(".detail-dialog")).not.toContainText(
    record.description,
  );
  await expect(page.locator(".detail-dialog")).not.toContainText("00:00");
});
test("development corpus shows stale and withdrawn history with source guidance", async ({
  page,
}) => {
  const stale = policyRecord("Stale test-only offer"),
    absent = policyRecord("Withdrawn test-only offer");
  stale.lifecycle = "stale";
  absent.lifecycle = "withdrawn";
  const items = [stale, absent].map((r) =>
    presentMvpListing(mvpListingAt(r, now), false),
  );
  await feed(page, items);
  await page.locator(".offer-card").filter({ hasText: stale.title }).click();
  await expect(page.locator(".detail-dialog")).toContainText(
    "May have ended, check source",
  );
  await page.getByRole("button", { name: "Close offer details" }).click();
  await page.locator(".offer-card").filter({ hasText: absent.title }).click();
  await expect(page.locator(".detail-dialog")).toContainText(
    "No longer listed by the source",
  );
});
