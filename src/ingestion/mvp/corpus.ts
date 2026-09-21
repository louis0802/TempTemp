import { readFile } from "node:fs/promises";
import { DateTime } from "luxon";
import type { SourcePost } from "../resolution/types";
import type { MvpPipeline } from "./pipeline";
import type { MvpPromotion } from "@/domain/mvp";
export async function readCorpus(
  path = "exports/review-inbox-2026-09-16/review-inbox.json",
) {
  const input = JSON.parse(await readFile(path, "utf8")) as {
    items: { source: Omit<SourcePost, "text"> & { originalText: string } }[];
  };
  return [
    ...new Map(
      input.items.map(({ source: s }) => [
        s.url,
        { ...s, text: s.originalText },
      ]),
    ).values(),
  ].sort((a, b) => a.url.localeCompare(b.url));
}
export async function buildCorpus(
  pipeline: MvpPipeline,
  sources: SourcePost[],
  now: DateTime,
) {
  const records: MvpPromotion[] = [];
  const failures: { sourceUrl: string; reason: string }[] = [];
  for (const source of sources) {
    try {
      const results = await pipeline.process(source, now);
      if (!results.length) throw new Error("source_produced_no_offers");
      records.push(...results);
    } catch (e) {
      failures.push({
        sourceUrl: source.url,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
  const count = (status: MvpPromotion["status"]) =>
    records.filter((p) => p.status === status).length;
  return {
    version: 1 as const,
    evaluatedAt: now.toISO()!,
    records,
    failures,
    metrics: {
      Sources: sources.length,
      "Parsed offers": records.length,
      Excluded: count("exclude"),
      "Excluded non-offers": records.filter((p) =>
        p.reasons.includes("no_promotional_benefit"),
      ).length,
      "Excluded online-only": records.filter((p) =>
        p.reasons.includes("online_only_not_for_map"),
      ).length,
      "MVP ready": count("ready"),
      "Needs validity": count("needs_validity"),
      "Needs content resolution": count("needs_content_resolution"),
      "Needs location": count("needs_location"),
      "Map-ready": count("ready"),
      "Expired but valid": records.filter(
        (p) => p.genuine && p.lifecycle === "expired",
      ).length,
      Active: records.filter(
        (p) => p.status === "ready" && p.lifecycle === "active",
      ).length,
      Failed: failures.length,
    },
  };
}
