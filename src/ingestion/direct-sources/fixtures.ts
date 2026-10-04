import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { canonicalUrl, DEFAULT_LIMITS, type DirectTransport } from "./fetch";
const manifestSchema = z.object({
  observedAt: z.iso.datetime(),
  pages: z.record(
    z.string(),
    z.object({
      path: z.string(),
      status: z.number().int().default(200),
      contentType: z.string(),
      location: z.string().optional(),
    }),
  ),
});
export async function fixtureTransport(
  manifestPath: string,
): Promise<{ observedAt: string; transport: DirectTransport }> {
  const root = await realpath(path.dirname(manifestPath));
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  const entries = new Map(
    Object.entries(manifest.pages).map(([url, entry]) => [
      canonicalUrl(url),
      entry,
    ]),
  );
  const transport: DirectTransport = async (url, _signal, maxBytes) => {
    const entry = entries.get(canonicalUrl(url.href));
    if (!entry) throw new Error("fixture_url_missing");
    const file = await realpath(path.resolve(root, entry.path));
    if (!file.startsWith(root + path.sep))
      throw new Error("fixture_path_escape");
    const { size } = await import("node:fs/promises").then((fs) =>
      fs.stat(file),
    );
    if (size > Math.min(maxBytes, DEFAULT_LIMITS.maxBytes))
      throw new Error("response_too_large");
    return {
      status: entry.status,
      headers: { "content-type": entry.contentType, location: entry.location },
      body: await readFile(file),
    };
  };
  return { observedAt: manifest.observedAt, transport };
}
