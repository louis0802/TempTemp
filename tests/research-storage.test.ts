import { afterEach, expect, it } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  atomicWriteJson,
  readJsonValidated,
  sha256File,
  verifySeal,
  withProcessLock,
  writeNewJson,
} from "../scripts/research/source-monitor/storage";

const temporaryRoots: string[] = [];
async function root() {
  const directory = await mkdtemp(path.join(tmpdir(), "research-storage-"));
  temporaryRoots.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const state = (
  value: unknown,
): value is { revision: number; ids: number[] } => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.revision === "number" &&
    Array.isArray(record.ids) &&
    record.ids.every((id) => typeof id === "number")
  );
};

it("atomically replaces validated JSON and ignores an interrupted temporary file", async () => {
  const directory = await root();
  const filename = path.join(directory, "state.json");
  await atomicWriteJson(
    filename,
    { revision: 1, ids: [9] },
    { root: directory },
  );
  await writeFile(
    path.join(directory, ".state.json.interrupted.tmp"),
    "{broken",
  );
  await atomicWriteJson(
    filename,
    { revision: 2, ids: [9, 10] },
    { root: directory },
  );
  expect(await readJsonValidated(filename, state)).toEqual({
    revision: 2,
    ids: [9, 10],
  });
  await expect(
    readJsonValidated(
      filename,
      (value): value is { revision: 3 } => state(value) && value.revision === 3,
    ),
  ).rejects.toThrow("Invalid research JSON schema");
  expect(
    await readFile(path.join(directory, ".state.json.interrupted.tmp"), "utf8"),
  ).toBe("{broken");
  await writeFile(filename, "{broken");
  await expect(readJsonValidated(filename, state)).rejects.toThrow(
    "Cannot read valid JSON",
  );
});

it("creates immutable artifacts once and rejects every write beneath a seal", async () => {
  const directory = await root();
  const run = path.join(directory, "runs", "2026-09-25");
  const artifact = path.join(run, "raw.json");
  await writeNewJson(artifact, { posts: [1] }, { root: directory });
  await expect(
    writeNewJson(artifact, { posts: [2] }, { root: directory }),
  ).rejects.toMatchObject({ code: "EEXIST" });
  expect(JSON.parse(await readFile(artifact, "utf8"))).toEqual({ posts: [1] });
  const manifest = path.join(run, "manifest.json");
  await writeNewJson(
    manifest,
    { sha256: { "raw.json": await sha256File(artifact) } },
    { root: directory },
  );
  await expect(
    writeNewJson(
      path.join(run, "SEALED"),
      { manifest_sha256: "0".repeat(64) },
      { root: directory },
    ),
  ).rejects.toThrow("current manifest hash");
  await writeNewJson(
    path.join(run, "SEALED"),
    { manifest_sha256: await sha256File(manifest) },
    { root: directory },
  );
  await expect(
    atomicWriteJson(artifact, { posts: [] }, { root: directory }),
  ).rejects.toThrow("sealed");
  await expect(
    writeNewJson(path.join(run, "more.json"), {}, { root: directory }),
  ).rejects.toThrow("sealed");
  expect(JSON.parse(await readFile(artifact, "utf8"))).toEqual({ posts: [1] });
});

it("verifies seal and all declared artifacts, then detects tampering", async () => {
  const directory = await root();
  const run = path.join(directory, "runs", "2026-09-25");
  const artifact = path.join(run, "raw.json");
  await writeNewJson(artifact, { posts: [1] }, { root: directory });
  const manifest = path.join(run, "manifest.json");
  await writeNewJson(
    manifest,
    { sha256: { "raw.json": await sha256File(artifact) } },
    { root: directory },
  );
  await writeNewJson(
    path.join(run, "SEALED"),
    { manifest_sha256: await sha256File(manifest) },
    { root: directory },
  );
  await expect(verifySeal(run)).resolves.toMatchObject({
    sha256: { "raw.json": await sha256File(artifact) },
  });
  await writeFile(artifact, "tampered");
  await expect(verifySeal(run)).rejects.toThrow("sealed file changed");
});

it("recovers a dead PID lock, excludes a concurrent owner, and releases after failure", async () => {
  const directory = await root();
  const lock = path.join(directory, "service.lock");
  await writeFile(
    lock,
    JSON.stringify({
      pid: 999999,
      token: "stale",
      started_at: "2026-09-24T00:00:00Z",
    }),
  );
  let release!: () => void;
  let signalEntry!: () => void;
  const entered = new Promise<void>((resolve) => {
    signalEntry = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const owner = withProcessLock(directory, async () => {
    signalEntry();
    await expect(
      withProcessLock(directory, async () => undefined),
    ).rejects.toThrow("already locked");
    await held;
  });
  await entered;
  release();
  await owner;
  await expect(
    withProcessLock(directory, async () => {
      throw new Error("action failed");
    }),
  ).rejects.toThrow("action failed");
  await expect(
    withProcessLock(directory, async () => "restarted"),
  ).resolves.toBe("restarted");
});

it("rejects paths outside the configured research data root", async () => {
  const directory = await root();
  await expect(
    atomicWriteJson(
      path.join(directory, "..", "outside.json"),
      {},
      { root: directory },
    ),
  ).rejects.toThrow("escapes data root");
  const sibling = path.join(directory, "sibling");
  const dataRoot = path.join(directory, "data");
  await mkdir(sibling);
  await mkdir(dataRoot);
  await symlink(sibling, path.join(dataRoot, "escape"));
  await expect(
    atomicWriteJson(
      path.join(dataRoot, "escape", "outside.json"),
      {},
      { root: dataRoot },
    ),
  ).rejects.toThrow("escapes data root through symlink");
});
