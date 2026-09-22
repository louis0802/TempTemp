import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { it, expect } from "vitest";

it.each([
  ["transport", 'throw new Error("test_network_unavailable")'],
  ["HTTP", 'return new Response("unavailable", { status: 503 })'],
])(
  "retains the prior artifact on a live Google %s failure",
  async (_label, failure) => {
    const directory = await mkdtemp(join(tmpdir(), "mvp-build-failure-"));
    try {
      await mkdir(join(directory, "data"));
      await mkdir(join(directory, "exports/review-inbox-2026-09-16"), {
        recursive: true,
      });
      const artifact = join(directory, "data/mvp-promotions.json");
      await writeFile(
        artifact,
        '{"previousArtifact":"must remain untouched"}\n',
      );
      await writeFile(
        join(directory, "exports/review-inbox-2026-09-16/review-inbox.json"),
        JSON.stringify({
          items: [
            {
              source: {
                url: "https://t.me/tastesoulsg/123",
                channel: "tastesoulsg",
                label: "Test",
                publishedAt: "2026-09-01T00:00:00Z",
                originalText:
                  "Example Tea\n➡️ 50% off tea\n📅 Now - 30 Sep\n📍 Suntec City",
              },
            },
          ],
        }),
      );
      const mock = join(directory, "mock-fetch.mjs");
      await writeFile(mock, `globalThis.fetch = async () => { ${failure}; };`);
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          "--import",
          pathToFileURL(mock).href,
          resolve("scripts/build-mvp-data.ts"),
          "--google",
        ],
        {
          cwd: directory,
          env: {
            ...process.env,
            GOOGLE_PLACES_API_KEY: "test-no-network",
            TSX_TSCONFIG_PATH: resolve("tsconfig.json"),
          },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "Google build failed; previous artifact retained",
      );
      expect(await readFile(artifact, "utf8")).toBe(
        '{"previousArtifact":"must remain untouched"}\n',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
