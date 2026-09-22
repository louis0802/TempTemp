import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import type { ResolvedSourceLink } from "./types";
import type { SourceLinkResolver } from "./resolver";
const entry = z
  .object({
    originalUrl: z.string(),
    finalUrl: z.string().nullable(),
    redirectChain: z.array(z.string()),
    checkedAt: z.string().nullable(),
    status: z.enum(["resolved", "unresolved", "blocked", "failed"]),
    reason: z.string().nullable(),
    httpStatus: z.number().nullable(),
  })
  .strict();
const schema = z
  .object({ version: z.literal(1), entries: z.record(z.string(), entry) })
  .strict();
export class SourceRedirectCache {
  constructor(private entries: Record<string, ResolvedSourceLink> = {}) {}
  static async read(path: string) {
    try {
      const parsed = schema.parse(JSON.parse(await readFile(path, "utf8")));
      for (const [key, value] of Object.entries(parsed.entries)) {
        if (
          key !== value.originalUrl ||
          (value.status === "resolved" && !value.finalUrl)
        )
          throw new Error("invalid_cache_entry");
      }
      return new SourceRedirectCache(parsed.entries);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return new SourceRedirectCache();
      throw error;
    }
  }
  async resolve(
    url: string,
    resolver?: SourceLinkResolver,
  ): Promise<ResolvedSourceLink> {
    if (Object.hasOwn(this.entries, url))
      return structuredClone(this.entries[url]);
    if (!resolver)
      return {
        originalUrl: url,
        finalUrl: null,
        redirectChain: [],
        checkedAt: null,
        status: "unresolved",
        reason: "offline_cache_miss",
        httpStatus: null,
      };
    const result = await resolver.resolve(url);
    this.entries[url] = result;
    return structuredClone(result);
  }
  async write(path: string) {
    await atomicJson(path, {
      version: 1,
      entries: Object.fromEntries(
        Object.entries(this.entries).sort(([a], [b]) => a.localeCompare(b)),
      ),
    });
  }
}
export async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2) + "\n");
  await rename(`${path}.tmp`, path);
}
