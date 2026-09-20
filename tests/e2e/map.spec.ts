import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("real map renderer has a full-height viewport and visible attribution", async ({
  page,
}, info) => {
  // Synthetic image fixture: no requests reach the public tile service.
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".live-map")).toBeVisible();
  await expect(page.locator(".maplibregl-marker")).toHaveCount(6);
  expect(
    (await page.locator(".live-map").boundingBox())!.height,
  ).toBeGreaterThan(300);
  await expect(
    page.getByRole("link", { name: "OpenStreetMap", exact: true }),
  ).toBeVisible();
});
