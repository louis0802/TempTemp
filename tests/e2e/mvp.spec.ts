import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mvpListing } from "../../src/server/mvp";
import { groupMapLocations } from "../../src/domain/map-locations";
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
    page.getByText("Pins show merchant or source-stated locations", {
      exact: false,
    }),
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
  await expect(page.locator(".detail-dialog")).not.toContainText(
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

test("source-location detail preserves source unit and separates the Google anchor", async ({
  page,
}, info) => {
  const p = mvpPromotionSchema.parse(
    artifact.records.find(
      (p: { id: string }) => p.id === "70bd9af3-9126-559d-a88c-b67294164c03",
    ),
  );
  const detail = mvpListing(p);
  expect(p.outlets[0].coordinateBasis).toBe("google_source_location");
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  await page.route("**/api/mvp/promotions**", (r) =>
    r.fulfill({
      json: r.request().url().includes(`/promotions/${p.id}`)
        ? detail
        : { items: [detail], nextCursor: null, sources: [], demo: false },
    }),
  );
  await page.goto("/corpus");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  await page.locator(".offer-card").click();
  const dialog = page.locator(".detail-dialog");
  await expect(dialog).toContainText("Paragon Shopping Centre, B1-15");
  await expect(dialog).toContainText("Pin marks the source-stated location.");
  await expect(dialog).toContainText(
    "merchant operation, unit and promotion participation are not verified",
  );
  await expect(
    dialog.getByRole("link", { name: p.outlets[0].googleFormattedAddress! }),
  ).toHaveAttribute(
    "href",
    new RegExp(`query_place_id=${p.outlets[0].googlePlaceId}`),
  );
  await dialog.locator(".outlet-detail").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/mvp-source-location-${info.project.name}.png`,
    fullPage: true,
  });
});

for (const url of [
  "/mvp",
  "/mvp?includeExpired=true",
  "/mvp?showSourceText=true",
  "/mvp?includeExpired=true&showSourceText=true",
  "/corpus",
  "/corpus?showSourceText=true",
]) {
  test(`preview visibility and grouped selection: ${url}`, async ({
    page,
  }, info) => {
    await page.route("https://tile.openstreetmap.org/**", (r) =>
      r.fulfill({
        contentType: "image/png",
        body: readFileSync("tests/fixtures/tile.png"),
      }),
    );
    const responses: { items: ReturnType<typeof mvpListing>[] }[] = [];
    page.on("response", async (r) => {
      if (new URL(r.url()).pathname === "/api/mvp/promotions" && r.ok())
        responses.push(await r.json());
    });
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "A good deal is just around." }),
    ).toBeVisible();
    await expect(page.locator(".offer-card").first()).toBeVisible();
    const hasExpired = url.includes("includeExpired") || url.includes("corpus");
    const reveal = url.includes("showSourceText");
    const morgan = page
      .locator(".offer-card")
      .filter({ hasText: "Morganfield" });
    await expect(morgan).toHaveCount(hasExpired ? 2 : 0);
    const target = hasExpired
      ? morgan.first()
      : page.locator(".offer-card").first();
    await target.click();
    const dialog = page.locator(".detail-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".source-text")).toHaveCount(reveal ? 1 : 0);
    await expect(
      dialog.getByRole("link", { name: /View source/ }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Before you go" }),
    ).toHaveCount(0);
    if (reveal) {
      await expect(dialog.locator(".source-text")).toContainText(
        "Raw Telegram source",
      );
      const body = await dialog.locator(".source-text p").innerText();
      expect(body.length).toBeGreaterThan(30);
    }
    // Selection highlights every returned location group containing the promotion.
    const selectedTitle = await dialog.locator("h3").innerText();
    const selectedMerchant = await dialog
      .locator(".detail-merchant")
      .innerText();
    const data = responses.at(-1)!.items;
    const selected = data.find(
      (p) => p.title === selectedTitle && p.merchant === selectedMerchant,
    )!;
    const expected = groupMapLocations(data).filter((g) =>
      g.promotions.some((p) => p.promotion.id === selected.id),
    );
    await expect(page.locator(".map-pin.selected")).toHaveCount(
      expected.length,
    );
    await page.getByRole("button", { name: "Close offer details" }).click();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(page.locator(".map-pin").first()).toBeAttached();
    const pinTexts = await page.locator(".map-pin").allTextContents();
    expect(pinTexts.every((text) => /^●( \d+)?$/.test(text))).toBe(true);
    if (hasExpired) {
      const pin = page.getByRole("button", {
        name: "Suntec City, 2 promotions",
        exact: true,
      });
      await expect(pin).toHaveCount(1);
      await pin.press("Enter");
      await expect(
        dialog.getByRole("heading", { name: "Suntec City", exact: true }),
      ).toBeVisible();
      await expect(dialog.locator(".location-promotion")).toHaveCount(2);
      await expect(dialog).toContainText("Suntec City, 01-645");
      await page.screenshot({
        path: `test-results/location-${info.project.name}-${reveal ? "debug" : "default"}-${url.startsWith("/corpus") ? "corpus" : "mvp"}.png`,
      });
      for (let i = 0; i < 2; i++) {
        if (i) await pin.press("Enter");
        const row = dialog.locator(".location-promotion").nth(i);
        const title = await row.locator("span").first().innerText();
        await row.click();
        await expect(dialog.locator("h3")).toHaveText(title);
        await expect(dialog.locator(".detail-merchant")).toContainText(
          "Morganfield",
        );
        await expect(dialog.locator(".source-text")).toHaveCount(
          reveal ? 1 : 0,
        );
        await expect(
          dialog.getByRole("link", { name: /View source/ }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Close offer details" }).click();
      }
    }
    await page.removeAllListeners("response", { behavior: "wait" });
  });
}

test("schematic fallback uses identical shared-location selection", async ({
  page,
}, info) => {
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/mvp?includeExpired=true");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".schematic")).toBeVisible();
  await page
    .getByRole("button", { name: "Suntec City, 2 promotions", exact: true })
    .press("Enter");
  await expect(page.locator(".location-promotion")).toHaveCount(2);
  await page.locator(".location-promotion").first().click();
  await expect(page.locator(".detail-merchant")).toContainText("Morganfield");
  await expect(page.locator(".schematic-pin.selected")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".detail-dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Suntec City, 2 promotions",
      exact: true,
    }),
  ).toBeFocused();
});

test("clicking a shared anchor lists both promotions and opens each exact detail", async ({
  page,
}, info) => {
  const records = artifact.records
    .filter((p: { merchant: string }) => p.merchant.includes("Morganfield"))
    .map((p: unknown) => mvpListing(mvpPromotionSchema.parse(p)));
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: readFileSync("tests/fixtures/tile.png"),
    }),
  );
  await page.route("**/api/mvp/promotions**", (r) => {
    const id = new URL(r.request().url()).pathname.split("/").at(-1);
    return r.fulfill({
      json: records.find((p: ReturnType<typeof mvpListing>) => p.id === id) ?? {
        items: records,
        nextCursor: null,
        sources: [],
        demo: false,
      },
    });
  });
  await page.goto("/mvp?includeExpired=true");
  await expect(
    page.getByRole("heading", { name: "A good deal is just around." }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".map-pin")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Suntec City, 2 promotions", exact: true })
    .click();
  await expect(page.locator(".location-promotion")).toHaveCount(2);
  for (const record of records)
    await expect(page.locator(".location-promotions")).toContainText(
      record.title,
    );
  const title = await page
    .locator(".location-promotion span")
    .first()
    .innerText();
  await page.locator(".location-promotion").first().click();
  await expect(page.locator(".detail-dialog h3")).toHaveText(title);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Suntec City, 2 promotions",
      exact: true,
    }),
  ).toBeFocused();
});
