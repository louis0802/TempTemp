import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { DateTime } from "luxon";
import { readMvpData } from "@/server/mvp";
import { visibleMvp } from "@/domain/mvp";
import { GET as list } from "@/app/api/mvp/promotions/route";
import { GET as detail } from "@/app/api/mvp/promotions/[id]/route";
import { GET as search } from "@/app/api/mvp/search/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("serves the saved opt-in artifact while keeping withheld dated records out of all public entry points", async () => {
  vi.stubEnv("MVP_OFFER_POLICY", "source_observed");
  vi.stubEnv("NODE_ENV", "production");
  const artifact = JSON.parse(
    await readFile("data/mvp-promotions-source-observed.json", "utf8"),
  );
  const records = await readMvpData();
  expect(records).toHaveLength(207);
  const withheld = new Set<string>(artifact.review.withheldIds);
  expect(withheld.size).toBe(70);
  const sample = records.find(
    (r) =>
      withheld.has(r.id) && r.startDate && r.endDate && r.mapStatus === "ready",
  )!;
  expect(sample).toBeDefined();
  const now = DateTime.fromISO(`${sample.startDate}T12:00:00+08:00`);
  vi.useFakeTimers();
  vi.setSystemTime(now.toJSDate());
  expect(visibleMvp(records, "corpus", now)).toHaveLength(207);
  expect(
    visibleMvp(records, "corpus", now).find((r) => r.id === sample.id)!
      .lifecycle,
  ).toBe("active");
  const live = await (
    await list(new Request("http://local/api/mvp/promotions?view=corpus"))
  ).json();
  expect(live.items.every((r: { id: string }) => !withheld.has(r.id))).toBe(
    true,
  );
  expect(
    (
      await detail(
        new Request("http://local/api/mvp/promotions/x?view=corpus"),
        { params: Promise.resolve({ id: sample.id }) },
      )
    ).status,
  ).toBe(404);
  const results = await (
    await search(
      new Request(
        `http://local/api/mvp/search?q=${encodeURIComponent(sample.merchant)}`,
      ),
    )
  ).json();
  expect(
    results.items.every((r: { promotionIds: string[] }) =>
      r.promotionIds.every((id) => !withheld.has(id)),
    ),
  ).toBe(true);
});
