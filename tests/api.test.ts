import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/promotions/route";
import { GET as details } from "@/app/api/promotions/[id]/route";
import { GET as review } from "@/app/api/admin/review/route";
import { POST } from "@/app/api/admin/promotions/[id]/review/route";
afterEach(() => vi.unstubAllEnvs());
describe("Public and admin boundaries", () => {
  it("applies matching outlet bounds and category filters", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const r = await GET(
      new Request(
        "http://localhost/api/promotions?bbox=103.84,1.27,103.85,1.28&category=Caf%C3%A9s",
      ),
    );
    const data = await r.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].merchant).toBe("Kopi Social");
    expect(data.demo).toBe(true);
    expect(
      data.sources.every((s: { lastSuccess: null }) => s.lastSuccess === null),
    ).toBe(true);
  });
  it("rejects invalid bounds and cursors", async () => {
    for (const q of [
      "bbox=104,1.3,103,1.2",
      "cursor=invalid",
      "category=anything",
    ])
      expect(
        (await GET(new Request(`http://localhost/api/promotions?${q}`))).status,
      ).toBe(400);
  });
  it("returns an explicit unavailable response without database configuration", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DATABASE_URL", "");
    expect(
      (await GET(new Request("http://localhost/api/promotions"))).status,
    ).toBe(503);
  });
  it("does not expose absent detail records", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(
      (
        await details(new Request("http://localhost"), {
          params: Promise.resolve({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          }),
        })
      ).status,
    ).toBe(404);
  });
  it("rejects anonymous administrative reads and mutations", async () => {
    expect(
      (await review(new Request("http://localhost/api/admin/review"))).status,
    ).toBe(401);
    expect(
      (
        await POST(new Request("http://localhost", { method: "POST" }), {
          params: Promise.resolve({ id: "x" }),
        })
      ).status,
    ).toBe(401);
  });
});

import { readJson } from "@/server/http";
import { POST as importPosts } from "@/app/api/admin/import/route";
it("protects approved import uploads and enforces streaming body limits", async () => {
  expect(
    (
      await importPosts(
        new Request("http://localhost/api/admin/import", {
          method: "POST",
          body: "[]",
        }),
      )
    ).status,
  ).toBe(401);
  await expect(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        body: '{"long":"1234567890"}',
      }),
      5,
    ),
  ).rejects.toMatchObject({ status: 413 });
});
