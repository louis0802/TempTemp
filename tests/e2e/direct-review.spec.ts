import { test, expect } from "@playwright/test";
import { demoPromotions } from "../../src/domain/demo";
import type { Promotion } from "../../src/domain/promotion";

test("curator sees both origins and dispatches direct approval and exclusion", async ({
  page,
}, info) => {
  const p: Promotion = {
    ...demoPromotions()[0],
    merchant: "Pepper Lunch",
    category: "Meals",
    sources: [
      {
        kind: "direct",
        sourceId: "pepper_lunch_sg",
        label: "Pepper Lunch Singapore",
        url: "https://www.pepperlunch.com.sg/promo/uper-value-deal/",
      },
    ],
  };
  const directId = "99999999-9999-4999-8999-999999999990",
    excludeId = "99999999-9999-4999-8999-999999999991";
  const saved: { action: string; promotion?: Promotion }[] = [];
  await page.route("**/api/admin/sources", (route) =>
    route.fulfill({ json: { sources: [] } }),
  );
  await page.route("**/api/admin/review?*", (route) =>
    route.fulfill({
      json: {
        offers: [],
        candidates: [
          ...(!saved.some((s) => s.action === "approve")
            ? [
                {
                  id: directId,
                  originKind: "direct",
                  sourceId: "pepper_lunch_sg",
                  label: "Pepper Lunch Singapore",
                  permalink: p.sources[0].url,
                  data: p,
                  issues: ["missing_start_date"],
                  existing: p,
                },
              ]
            : []),
          ...(!saved.some((s) => s.action === "exclude")
            ? [
                {
                  id: excludeId,
                  originKind: "direct",
                  sourceId: "pepper_lunch_sg",
                  label: "Pepper Lunch Singapore",
                  permalink: p.sources[0].url,
                  data: {
                    ...p,
                    title: "Synthetic excluded fixture",
                    benefit: "Excluded fixture",
                  },
                  issues: ["missing_end_date"],
                  existing: null,
                },
              ]
            : []),
          {
            id: "99999999-9999-4999-8999-999999999999",
            originKind: "telegram",
            sourceId: "sgfooddeals",
            label: "Historical fixture",
            permalink: "https://t.me/sgfooddeals/1",
            data: {
              ...p,
              merchant: "Legacy fixture",
              sources: [{ label: "Legacy", url: "https://t.me/sgfooddeals/1" }],
            },
            issues: ["legacy_issue"],
            existing: null,
          },
        ],
        nextOfferCursor: null,
        nextCandidateCursor: null,
      },
    }),
  );
  await page.route("**/api/admin/direct-candidates/*/review", async (route) => {
    const body = route.request().postDataJSON();
    saved.push(body);
    await route.fulfill({
      json:
        body.action === "exclude"
          ? { status: "excluded" }
          : { promotion: body.promotion },
    });
  });
  // No admin write may fall through to a shared database.
  await page.route("**/api/admin/candidates/*/review", (route) =>
    route.abort(),
  );
  await page.route("**/api/admin/promotions/*/review", (route) =>
    route.abort(),
  );
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Curator workspace" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("admin@local.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalReview2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("summary")).toHaveCount(3);
  const direct = page
    .locator("details")
    .filter({
      has: page.locator("summary").filter({ hasText: "Pepper Lunch" }),
    })
    .first();
  await direct.locator("summary").click();
  await expect(
    direct.getByText("Direct source", { exact: true }),
  ).toBeVisible();
  await expect(
    direct.getByRole("link", { name: "Open official source ↗" }),
  ).toHaveAttribute("href", p.sources[0].url);
  const legacy = page.locator("details").filter({ hasText: "Legacy fixture" });
  await legacy.locator("summary").click();
  await expect(
    legacy.getByText("Telegram signal", { exact: true }),
  ).toBeVisible();
  await expect(
    legacy.getByRole("link", { name: "Open original post ↗" }),
  ).toBeVisible();
  await page.locator(".admin-page").screenshot({
    path: `test-results/${info.project.name}-direct-review-inbox.png`,
  });
  await direct.getByRole("button", { name: "Resolve candidate" }).click();
  await expect(page.getByLabel("Official source 1")).toHaveAttribute(
    "readonly",
    "",
  );
  await page
    .getByLabel("Review reason and evidence")
    .fill("Verified synthetic fixture facts and physical outlet");
  await page
    .getByLabel(
      "I verified the conditions, dates, and every participating outlet.",
    )
    .check();
  await page.getByRole("button", { name: "Save and approve" }).click();
  await expect(page.getByRole("status")).toContainText("Offer approved");
  const excluded = page
    .locator("details")
    .filter({ hasText: "Excluded fixture" });
  await excluded.locator("summary").click();
  await excluded.getByRole("button", { name: "Dismiss", exact: true }).click();
  await page
    .getByLabel("Reason", { exact: true })
    .fill("Synthetic excluded fixture has incomplete terms");
  await page.getByRole("button", { name: "Confirm dismissal" }).click();
  await expect(page.getByRole("status")).toContainText("Candidate dismissed");
  expect(saved.map((s) => s.action)).toEqual(["approve", "exclude"]);
});
