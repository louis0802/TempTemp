import { load } from "cheerio";
import { DateTime } from "luxon";
import { z } from "zod";
import { postSchema, SourceExport } from "./approved-json";
const sourceName = z.enum(["sgfooddeals", "tastesoulsg"]);
type Post = z.infer<typeof postSchema>;
export function parsePreview(html: string, name: string) {
  sourceName.parse(name);
  const $ = load(html),
    posts: Post[] = [];
  $(".tgme_widget_message[data-post]").each((_, element) => {
    const el = $(element),
      identity = el.attr("data-post") ?? "";
    const match = identity.match(new RegExp(`^${name}/(\\d+)$`));
    if (!match) throw new Error("Unexpected source identity in preview");
    const date = DateTime.fromISO(
      el.find(".tgme_widget_message_date time").attr("datetime") ?? "",
    );
    if (!date.isValid) throw new Error("Missing publication timestamp");
    const content = el.find(".tgme_widget_message_text").clone();
    content.find("br").replaceWith("\n");
    content.find("a").each((_, a) => {
      const link = $(a),
        href = link.attr("href");
      if (href && /^https?:\/\//.test(href) && href !== link.text())
        link.append(` (${href})`);
    });
    let text = content.text().trim();
    if (
      el.find(
        ".tgme_widget_message_photo_wrap,.tgme_widget_message_video_wrap,.tgme_widget_message_document_wrap",
      ).length
    )
      text += "\n[Media attached: verify image/video conditions.]";
    if (!text) text = "[Unsupported or empty post: manual review required.]";
    posts.push(
      postSchema.parse({
        messageId: Number(match[1]),
        publishedAt: date.toUTC().toISO(),
        text,
        candidates: [],
      }),
    );
  });
  if (!posts.length)
    throw new Error("Preview unavailable or unsupported; no messages parsed");
  const cursors = $("a.tme_messages_more[data-before]")
    .toArray()
    .map((el) => Number($(el).attr("data-before")))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
  return {
    posts: posts.sort((a, b) => a.messageId - b.messageId),
    before: cursors.length ? Math.min(...cursors) : null,
  };
}
export async function fetchPreviewPage(url: string) {
  const parsed = new URL(url);
  if (
    parsed.origin !== "https://t.me" ||
    !/^\/s\/(sgfooddeals|tastesoulsg)$/.test(parsed.pathname)
  )
    throw new Error("Source URL is not allowlisted");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      redirect: "error",
      headers: {
        "User-Agent": "PromotionAroundYou/0.1 public-preview collector",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 2) throw new Error(`Source HTTP ${response.status}`);
      const wait = Math.min(
        15000,
        Math.max(
          1000,
          Number(response.headers.get("retry-after") ?? 0) * 1000 ||
            1000 * (attempt + 1),
        ),
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty preview response");
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 2_000_000) throw new Error("Preview exceeds size limit");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new Error("Preview request failed");
}
export async function collectPreview(
  name: "sgfooddeals" | "tastesoulsg",
  cutoff: DateTime,
  options: {
    now?: DateTime;
    maxPages?: number;
    activeIds?: number[];
    fetchPage?: (url: string) => Promise<string>;
    paceMs?: number;
  } = {},
) {
  const now = options.now ?? DateTime.utc(),
    fetchPage = options.fetchPage ?? fetchPreviewPage,
    maxPages = options.maxPages ?? 60;
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100)
    throw new Error("PREVIEW_MAX_PAGES must be 1–100");
  const posts = new Map<number, Post>(),
    seen = new Set<number>();
  let before: number | null = null,
    reached = false,
    pages = 0;
  const page = async (cursor: number | null) => {
    if (pages++ >= maxPages)
      throw new Error(
        "Preview page limit reached before coverage was complete",
      );
    if (pages > 1)
      await new Promise((r) => setTimeout(r, options.paceMs ?? 1000));
    return parsePreview(
      await fetchPage(
        `https://t.me/s/${name}${cursor ? `?before=${cursor}` : ""}`,
      ),
      name,
    );
  };
  while (!reached) {
    const result = await page(before);
    if (before !== null && result.posts[0].messageId >= before)
      throw new Error("Preview pagination did not progress");
    for (const p of result.posts)
      if (DateTime.fromISO(p.publishedAt) <= now) posts.set(p.messageId, p);
    reached = result.posts.some(
      (p) => DateTime.fromISO(p.publishedAt) <= cutoff,
    );
    if (!reached) {
      if (!result.before || seen.has(result.before))
        throw new Error("Preview history ended before the requested cutoff");
      seen.add(result.before);
      before = result.before;
    }
  }
  const unavailable: number[] = [];
  for (const id of [...new Set(options.activeIds ?? [])])
    if (!posts.has(id)) {
      const result = await page(id + 1);
      const target = result.posts.find((p) => p.messageId === id);
      if (target) posts.set(id, target);
      else unavailable.push(id);
    }
  const data: SourceExport = {
    source: name,
    complete: true,
    coverageStart: cutoff.toUTC().toISO()!,
    completeThrough: now.toUTC().toISO()!,
    posts: [...posts.values()].sort((a, b) => a.messageId - b.messageId),
  };
  return {
    data,
    pages,
    unavailableActivePosts: unavailable,
    coverage:
      "Public preview messages only; deletion and media edits are not detected.",
  };
}
