import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mvpListing } from "../../src/server/mvp";
import { mvpPromotionSchema } from "../../src/domain/mvp";
const artifact = JSON.parse(readFileSync("data/mvp-promotions.json", "utf8"));
const record = mvpPromotionSchema.parse(
  artifact.records.find(
    (p: {
      status: string;
      outlets: { latitude: number; longitude: number }[];
    }) =>
      p.status === "ready" &&
      p.outlets.some(
        (o) =>
          o.latitude > 1.27 &&
          o.latitude < 1.31 &&
          o.longitude > 103.82 &&
          o.longitude < 103.87,
      ),
  ),
);
const listing = mvpListing(record);
test("MVP cards, actual map layout and details preserve merchant-location semantics", async ({
  page,
}, info) => {
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  await page.route("**/api/mvp/promotions**", (r) =>
    r.fulfill({
      json: r.request().url().includes(`/promotions/${listing.id}`)
        ? listing
        : { items: [listing], nextCursor: null, sources: [], demo: false },
    }),
  );
  await page.goto("/corpus");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  await expect(
    page.getByText("Pins show merchant locations", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Filter by category")).toHaveCount(0);
  await expect(page.locator(".offer-card")).toHaveCount(1);
  await page.locator(".offer-card").click();
  await expect(
    page.getByRole("heading", { name: "Merchant locations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Participating outlets" }),
  ).toHaveCount(0);
  await expect(page.locator(".detail-dialog")).toContainText(
    record.description,
  );
  await page.getByRole("button", { name: "Close offer details" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".live-map")).toBeVisible();
  await expect(page.locator(".maplibregl-marker").first()).toBeVisible();
  await page.screenshot({
    path: `test-results/mvp-${info.project.name}.png`,
    fullPage: true,
  });
});
test("MVP list and detail APIs filter expiry, with separate historical preview", async ({
  request,
}) => {
  const live = await request.get("/api/mvp/promotions");
  expect(live.ok()).toBe(true);
  const current = await live.json();
  expect(
    current.items.every((p: { lifecycle: string }) => p.lifecycle === "active"),
  ).toBe(true);
  const history = await request.get("/api/mvp/promotions?includeExpired=true");
  const historical = await history.json();
  const expired = historical.items.find(
    (p: { lifecycle: string }) => p.lifecycle === "expired",
  );
  expect(expired).toBeDefined();
  expect(
    (await request.get(`/api/mvp/promotions/${expired.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`/api/mvp/promotions/${expired.id}?includeExpired=true`)
    ).status(),
  ).toBe(200);
});

test("complete corpus renders non-map and incomplete records with safe labels", async ({
  page,
}, info) => {
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/corpus");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  await expect(page.locator(".offer-card")).toHaveCount(
    artifact.records.length,
  );
  const online = page
    .locator(".offer-card")
    .filter({ hasText: "NEW 3L Sharing Tea Pack ($52)" });
  await expect(online).toContainText("Online only");
  await expect(online).toContainText("Needs validity");
  await online.click();
  await expect(page.locator(".detail-dialog")).toContainText(
    "Online-only promotion. No physical map pins.",
  );
  await expect(page.locator(".detail-dialog .outlet-detail")).toHaveCount(0);
  await page.screenshot({
    path: `test-results/corpus-online-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close offer details" }).click();
  await expect(page.locator(".offer-list")).not.toContainText("Invalid Date");
  await expect(page.locator(".offer-list")).toContainText(
    "Needs content resolution",
  );
  await expect(page.locator(".offer-list")).toContainText("Needs location");
  await expect(page.locator(".offer-list")).toContainText("expired");
  await expect(page.locator(".offer-list")).toContainText("upcoming");
  await page
    .getByRole("button", { name: "Default order", exact: true })
    .click();
  await expect(page.locator(".offer-card")).toHaveCount(
    artifact.records.length,
  );
  await page.screenshot({
    path: `test-results/corpus-list-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
