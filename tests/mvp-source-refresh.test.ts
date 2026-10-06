import { expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import {
  mergeDirectSourceState,
  persistMvpSourceRun,
} from "@/ingestion/mvp/source-refresh";
const run = await runDirectSource(sourceDefinition("pepper_lunch_sg"), {
  ...(await fixtureTransport(
    "tests/fixtures/direct-sources/pepper-captured-seven/manifest.json",
  )),
  mode: "fixture",
});
it("captured run preserves immutable receipt and cannot qualify archive freshness", () => {
  const state = mergeDirectSourceState(null, run);
  expect(Object.keys(state.candidates)).toHaveLength(7);
  expect(mergeDirectSourceState(state, run)).toEqual(state);
  for (const item of Object.values(state.observations)) {
    expect(item.capability).toBe("historical_archive");
    expect(item.lastSeenOnSource).toBeNull();
    expect(item.firstSeenAt).toBe(run.observedAt);
  }
  const later = mergeDirectSourceState(state, {
    ...run,
    observedAt: "2026-10-06T00:00:00Z",
    candidates: run.candidates.map((c) => ({
      ...c,
      observedAt: "2026-10-06T00:00:00Z",
    })),
  });
  expect(Object.values(later.candidates).map((c) => c.firstReceivedAt)).toEqual(
    Object.values(state.candidates).map((c) => c.firstReceivedAt),
  );
});
it("atomic state refuses invalid replacements and competing writers, retaining all prior bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mvp-state-"));
  try {
    await persistMvpSourceRun(dir, run);
    const target = join(dir, "pepper_lunch_sg.state.json"),
      before = await readFile(target, "utf8");
    await expect(
      persistMvpSourceRun(dir, { ...run, observedAt: "invalid" }),
    ).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe(before);
    await writeFile(`${target}.lock`, "another writer");
    await expect(persistMvpSourceRun(dir, run)).rejects.toMatchObject({
      code: "EEXIST",
    });
    expect(await readFile(target, "utf8")).toBe(before);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
