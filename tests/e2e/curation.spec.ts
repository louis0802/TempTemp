import { test, expect } from "@playwright/test";
import { demoPromotions } from "../../src/domain/demo";
import type { Promotion } from "../../src/domain/promotion";
test("curator edits labelled fields and approves without JSON editing", async ({
  page,
}, info) => {
  const p = demoPromotions()[0],
    id = "99999999-9999-4999-8999-999999999999";
  let saved: { promotion: Promotion; action: string } | undefined;
  await page.route("**/api/admin/review?*", (r) =>
    r.fulfill({
      json: {
        offers: [],
        candidates: saved
          ? []
          : [
              {
                id,
                data: p,
                issues: ["raw_extraction_requires_verification"],
                permalink: p.sources[0].url,
                label: "Fixture source",
                existing: null,
              },
            ],
        nextOfferCursor: null,
        nextCandidateCursor: null,
      },
    }),
  );
  await page.route(`**/api/admin/candidates/${id}/review`, async (r) => {
    saved = r.request().postDataJSON();
    await r.fulfill({ json: { promotion: saved!.promotion } });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Curator workspace" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("admin@local.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalReview2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Kopi Social" }).click();
  await page.getByRole("button", { name: "Resolve candidate" }).click();
  await page
    .getByLabel("Merchant", { exact: true })
    .fill("Verified fixture cafe");
  await page.getByLabel("Redemption starts").fill("22:00");
  await page.getByLabel("Redemption ends").fill("02:00");
  await page
    .getByLabel("Schedule shown to visitors")
    .fill("Daily 10pm–2am, within validity dates");
  await page
    .getByLabel("Review reason and evidence")
    .fill("Verified synthetic test conditions and branch");
  await page
    .getByLabel(
      "I verified the conditions, dates, and every participating outlet.",
    )
    .check();
  await page
    .locator(".review-editor")
    .screenshot({ path: `test-results/${info.project.name}-curator-form.png` });
  await page.getByRole("button", { name: "Save and approve" }).click();
  await expect(page.getByRole("status")).toContainText("Offer approved");
  expect(saved!.action).toBe("approve");
  expect(saved!.promotion.merchant).toBe("Verified fixture cafe");
  expect(saved!.promotion.hours).toEqual({ start: "22:00", end: "02:00" });
});
test("curator pages candidates and imports an approved export with per-source feedback", async ({
  page,
}) => {
  const p = demoPromotions()[0];
  let imported = false;
  await page.route("**/api/admin/review?*", (r) => {
    const second = new URL(r.request().url()).searchParams.has(
      "candidateCursor",
    );
    return r.fulfill({
      json: {
        offers: [],
        candidates: [
          {
            id: second
              ? "99999999-9999-4999-8999-999999999998"
              : "99999999-9999-4999-8999-999999999999",
            data: {
              ...p,
              merchant: second ? "Second fixture" : "First fixture",
            },
            issues: [],
            permalink: p.sources[0].url,
            label: "Fixture",
            existing: null,
          },
        ],
        nextOfferCursor: null,
        nextCandidateCursor: second
          ? null
          : "99999999-9999-4999-8999-999999999999",
      },
    });
  });
  await page.route("**/api/admin/import", (r) => {
    imported = true;
    return r.fulfill({
      status: 207,
      json: {
        results: [
          { source: "sgfooddeals", ok: true, count: 2 },
          { source: "tastesoulsg", ok: false, count: 0 },
        ],
      },
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Curator workspace" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("admin@local.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalReview2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Load more candidates" }).click();
  await expect(page.locator("summary")).toHaveCount(2);
  await page.getByLabel("Approved JSON export").setInputFiles({
    name: "approved.json",
    mimeType: "application/json",
    buffer: Buffer.from("[]"),
  });
  await expect(page.getByRole("status")).toContainText("checkpoint retained");
  expect(imported).toBe(true);
});
