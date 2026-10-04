import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { createSignals } from "../../../src/ingestion/source-evidence/pipeline";
import { PostOfferParser } from "../../../src/ingestion/resolution/parser";
import type { AuditPost, AuditSignal, InputMode } from "./types";

export const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const rawSchema = z.object({
  posts: z.array(
    z.object({
      channel: z.enum(["sgfooddeals", "tastesoulsg"]),
      message_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      published_at: z.iso.datetime({ offset: true }),
      text: z.string().max(50000),
    }),
  ),
});
export function parseRaw(
  raw: string,
  input_file: string,
  input_mode: InputMode,
): AuditPost[] {
  return rawSchema.parse(JSON.parse(raw)).posts.map((p) => ({
    ...p,
    input_mode,
    input_file,
    input_sha256: sha256(raw),
  }));
}
export async function frozenPosts(root: string) {
  let dirs: string[];
  try {
    dirs = (await readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const posts: AuditPost[] = [];
  for (const dir of dirs) {
    const path = join(root, dir, "telegram-raw.json");
    try {
      posts.push(
        ...parseRaw(await readFile(path, "utf8"), path, "frozen_local"),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return posts;
}
export function mergePosts(posts: AuditPost[]) {
  if (new Set(posts.map((p) => p.input_mode)).size > 1)
    throw new Error("Mixed frozen and refreshed inputs are forbidden");
  const unique = new Map<string, AuditPost>();
  // Deterministic latest snapshot wins, even when caller traversal order varies.
  for (const post of [...posts].sort(
    (a, b) =>
      a.input_file.localeCompare(b.input_file) ||
      a.input_sha256.localeCompare(b.input_sha256),
  ))
    unique.set(`${post.channel}/${post.message_id}`, post);
  return [...unique.values()].sort(
    (a, b) =>
      Date.parse(b.published_at) - Date.parse(a.published_at) ||
      a.channel.localeCompare(b.channel) ||
      b.message_id - a.message_id,
  );
}
export async function sampleSignals(posts: AuditPost[], sample: number) {
  if (!Number.isInteger(sample) || sample < 1 || sample > 100)
    throw new Error("sample must be 1–100");
  const merged = mergePosts(posts),
    selected: AuditSignal[] = [];
  let promotions = 0;
  for (const post of merged) {
    if (promotions >= sample) break;
    const parsed = await new PostOfferParser().parse(post.text, post.channel);
    const signals = await createSignals([
      {
        text: post.text,
        publishedAt: post.published_at,
        channel: post.channel,
        label: `${post.channel}/${post.message_id}`,
        url: `https://t.me/${post.channel}/${post.message_id}`,
      },
    ]);
    const editorial =
      /^\s*\d+\s+(?:Good|Best|Great|Must[- ]Try)\s+.+(?:Spots|Places|Restaurants|Cafes)\b/i.test(
        post.text,
      );
    const explicitIntent =
      /#deals\b|\b(?:promo(?:tion)?|discount|cashback|flash sale|special offer|\d[ -]for[ -]\d)\b/i.test(
        post.text,
      );
    // Unclear posts without an offer remain visible, never counted as origin successes.
    const promotionPost =
      !editorial && (parsed.some((p) => p.genuine) || explicitIntent);
    if (!promotionPost) {
      selected.push({
        post,
        signal: signals[0],
        signal_class: "non_offer_signal",
        sampling_basis: "no_explicit_promotional_benefit_or_intent",
      });
      continue;
    }
    let retainedOffer = false;
    for (const signal of signals) {
      const offer = parsed.find((p) => p.key === signal.offerKey)!;
      if (offer.nonPromotion && !offer.genuine) continue;
      if (promotions >= sample) break;
      selected.push({
        post,
        signal,
        signal_class: "promotion_signal",
        sampling_basis: offer.genuine
          ? "parser_promotional_benefit"
          : "explicit_post_promotional_intent_requires_review",
      });
      promotions++;
      retainedOffer = true;
    }
    if (!retainedOffer)
      selected.push({
        post,
        signal: signals[0],
        signal_class: "non_offer_signal",
        sampling_basis: "parser_excluded_all_post_offers",
      });
  }
  return { selected, availablePosts: merged.length };
}
