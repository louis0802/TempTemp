import { test, expect } from "@playwright/test";
// Never use public tile infrastructure for automated tests.
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.route("https://api.maptiler.com/**", (route) => route.abort());
});
test("discovery, filters, details, search and responsive layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  await expect(page.locator(".offer-card")).toHaveCount(6);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-discovery.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Meals", exact: true }).click();
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await expect(page.locator(".schematic-pin")).toHaveCount(2);
  await page.locator(".offer-card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Before you go" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "All deals", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search neighbourhood" })
    .fill("Bugis");
  await page
    .locator(".search-results")
    .getByRole("button", { name: "Bugis" })
    .click();
  await expect(page.locator(".results-heading h2")).toHaveText("Bugis");
  await page.context().clearPermissions();
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Location was not shared" }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Map", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/mobile-map.png",
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
test("local administrator can sign in and inspect source health", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@local.test");
  await page.getByLabel("Password", { exact: true }).fill("LocalReview2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Source health" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Administrator sign-in" }),
  ).toBeVisible();
});

test("refreshes public results on the minute and on focus", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".offer-card")).toHaveCount(6);
  const refreshed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/promotions",
  );
  await page.clock.fastForward(60001);
  expect((await refreshed).status()).toBe(200);
  const focused = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/promotions",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect((await focused).status()).toBe(200);
});
