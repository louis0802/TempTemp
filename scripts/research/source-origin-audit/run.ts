import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { DateTime } from "luxon";
import {
  SourceRedirectCache,
  atomicJson,
} from "../../../src/ingestion/source-evidence/cache";
import { SourceLinkResolver } from "../../../src/ingestion/source-evidence/resolver";
import { registrySchema } from "../../../src/ingestion/source-evidence/registry";
import { collectPreview } from "../../../src/ingestion/sources/telegram-preview";
import { auditSignals } from "./audit";
import { authorityReviewSchema } from "./classification";
import { frozenPosts, parseRaw, sampleSignals, sha256 } from "./input";
import { csvReport, markdownReport } from "./report";
import type { AuditPost } from "./types";

export interface AuditOptions {
  repoRoot: string;
  sample: number;
  offline?: boolean;
  refresh?: boolean;
  input?: string;
  cache?: string;
  review?: string;
  output?: string;
  now?: Date;
  collect?: typeof collectPreview;
}
// Fail before mutation if any existing ancestor aliases protected inputs or a different tree.
export async function assertResearchOutput(repoRoot: string, path: string) {
  const root = join(await realpath(repoRoot), ".local/source-origin-audit");
  const target = resolve(path);
  const within = relative(root, target);
  if (within.startsWith("..") || within === "" || within.startsWith("/"))
    throw new Error("Output must be a child of .local/source-origin-audit");
  let ancestor = target;
  while (true) {
    try {
      await stat(ancestor);
      if ((await realpath(ancestor)) !== ancestor)
        throw new Error("Research output cannot use symlinked ancestors");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      ancestor = dirname(ancestor);
    }
  }
}
export async function runAudit(options: AuditOptions) {
  const root = await realpath(options.repoRoot);
  if (options.refresh && (options.offline || options.input))
    throw new Error(
      "Refresh cannot be combined with offline or frozen --input",
    );
  if (
    !Number.isInteger(options.sample) ||
    options.sample < 1 ||
    options.sample > 100
  )
    throw new Error("sample must be 1–100");
  const now = options.now ?? new Date();
  const auditRoot = join(root, ".local/source-origin-audit");
  const output = resolve(
    options.output ?? join(auditRoot, now.toISOString().replace(/[:.]/g, "-")),
  );
  await assertResearchOutput(root, output);
  try {
    await stat(output);
    throw new Error("Output run already exists");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // Also guard shared cache, review default and all artifact paths before writing.
  const sharedCache = join(auditRoot, "redirect-cache.json");
  await assertResearchOutput(root, sharedCache);
  for (const name of [
    "signals.json",
    "resolved-links.json",
    "audit.json",
    "report.md",
    "report.csv",
    "telegram-raw.json",
    "redirect-cache.json",
    "run.json",
  ])
    await assertResearchOutput(root, join(output, name));
  const registryRaw = await readFile(
    join(root, "data/merchant-source-registry.json"),
    "utf8",
  );
  const registry = registrySchema.parse(JSON.parse(registryRaw));
  let reviewRaw: string | null = null;
  try {
    reviewRaw = await readFile(
      options.review ?? join(auditRoot, "authority-review.json"),
      "utf8",
    );
  } catch (error) {
    if (options.review || (error as NodeJS.ErrnoException).code !== "ENOENT")
      throw error;
  }
  const review = authorityReviewSchema.parse(
    reviewRaw ? JSON.parse(reviewRaw) : { version: 1, entries: [] },
  );
  const cache = await SourceRedirectCache.read(options.cache ?? sharedCache);
  let posts: AuditPost[];
  let refreshRaw: string | null = null;
  if (options.refresh) {
    const collected = [];
    for (const channel of ["sgfooddeals", "tastesoulsg"] as const) {
      const result = await (options.collect ?? collectPreview)(
        channel,
        DateTime.fromJSDate(now).toUTC().minus({ days: 30 }),
        { now: DateTime.fromJSDate(now).toUTC(), maxPages: 30 },
      );
      collected.push(result);
    }
    refreshRaw =
      JSON.stringify(
        {
          posts: collected.flatMap((c) =>
            c.data.posts.map((p) => ({
              channel: c.data.source,
              message_id: p.messageId,
              published_at: p.publishedAt,
              text: p.text,
            })),
          ),
          collection: collected.map((c) => ({
            source: c.data.source,
            pages: c.pages,
            coverage: c.coverage,
            coverage_start: c.data.coverageStart,
            complete_through: c.data.completeThrough,
          })),
        },
        null,
        2,
      ) + "\n";
    posts = parseRaw(
      refreshRaw,
      "one_off_refresh:telegram-raw.json",
      "one_off_refresh",
    );
  } else {
    posts = options.input
      ? parseRaw(
          await readFile(options.input, "utf8"),
          resolve(options.input),
          "frozen_local",
        )
      : await frozenPosts(join(root, ".local/source-discovery-service/runs"));
  }
  const sampled = await sampleSignals(posts, options.sample);
  const allowed = new Set(
    sampled.selected
      .filter((s) => s.signal_class === "promotion_signal")
      .flatMap((s) => s.signal.outboundLinks.map((l) => l.normalizedUrl)),
  );
  const result = await auditSignals({
    ...sampled,
    sample: options.sample,
    registry,
    registryHash: sha256(registryRaw),
    review,
    reviewHash: reviewRaw ? sha256(reviewRaw) : null,
    cache,
    inputMode: options.refresh ? "one_off_refresh" : "frozen_local",
    resolver: options.offline ? undefined : new SourceLinkResolver(allowed),
  });
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output); // Refuse to overwrite or mix a previous run.
  if (refreshRaw)
    await writeFile(join(output, "telegram-raw.json"), refreshRaw);
  await atomicJson(join(output, "signals.json"), sampled.selected);
  await atomicJson(join(output, "resolved-links.json"), result.resolvedLinks);
  await atomicJson(join(output, "audit.json"), result.audit);
  await writeFile(join(output, "report.md"), markdownReport(result.audit));
  await writeFile(join(output, "report.csv"), csvReport(result.audit));
  await atomicJson(join(output, "run.json"), {
    generated_at: now.toISOString(),
    offline: options.offline ?? false,
    refresh: options.refresh ?? false,
  });
  await cache.write(join(output, "redirect-cache.json"));
  if (!options.cache) await cache.write(sharedCache);
  return { ...result, output };
}
