import { expect, it, vi } from "vitest";
import { capturedMvpDirectoryProviders } from "@/ingestion/mvp/official-directories";
it("reuses captured official directories without network or refreshed capture times and preserves type scope", async () => {
  const live = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("No network in replay"));
  try {
    const factory = await capturedMvpDirectoryProviders();
    const scope = {
      scope: "all_outlets" as const,
      raw: "",
      names: [],
      exclusions: [],
    };
    const all = await factory(scope)
      .find((p) => p.supports("Pepper Lunch"))!
      .getSingaporeBranches("Pepper Lunch");
    const restaurants = await factory({
      ...scope,
      raw: "All Pepper Lunch restaurants",
    })
      .find((p) => p.supports("Pepper Lunch"))!
      .getSingaporeBranches("Pepper Lunch");
    expect(all.authoritative).toBe(true);
    expect(all.fullyTraversed).toBe(true);
    expect(restaurants.branches.length).toBeLessThan(all.branches.length);
    expect(
      all.pages.every((p) => p.checkedAt === "2026-09-30T16:54:06.949Z"),
    ).toBe(true);
    const shake = await factory(scope)
      .find((p) => p.supports("Shake Shack"))!
      .getSingaporeBranches("Shake Shack");
    expect(shake.branches.length).toBeGreaterThan(0);
    expect(
      shake.pages.every((p) => p.checkedAt === "2026-10-01T04:54:50.390Z"),
    ).toBe(true);
    expect(live).not.toHaveBeenCalled();
  } finally {
    live.mockRestore();
  }
});
