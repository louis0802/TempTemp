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
    version: records.some((p) => p.offerPolicy) ? (3 as const) : (2 as const),
    evaluatedAt: now.toISO()!,
    records,
    failures,
    statusCounts: {
      ready: count("ready"),
      needs_validity: count("needs_validity"),
      needs_location: count("needs_location"),
      needs_content_resolution: count("needs_content_resolution"),
    },
    metrics: {
      Sources: sources.length,
      "Parsed offers": records.length,
      "Total records": records.length,
      "Content resolved": records.filter((p) => p.contentStatus === "resolved")
        .length,
      "Validity resolved": records.filter(
        (p) => p.validityStatus === "resolved",
      ).length,
      "Online only": records.filter((p) => p.mapStatus === "online_only")
        .length,
      "Malformed/unsupported": records.filter((p) =>
        p.reasons.includes("unsupported_source_text"),
      ).length,
      "MVP ready": count("ready"),
      "Needs validity": records.filter(
        (p) => p.validityStatus === "needs_validity",
      ).length,
      "Needs content resolution": count("needs_content_resolution"),
      "Needs location": records.filter((p) => p.mapStatus === "needs_location")
        .length,
      "Map-ready": records.filter((p) => p.mapStatus === "ready").length,
      Active: records.filter(
        (p) => p.lifecycle === "active" && p.validityStatus === "resolved",
      ).length,
      Expired: records.filter(
        (p) => p.lifecycle === "expired" && p.validityStatus === "resolved",
      ).length,
      Upcoming: records.filter(
        (p) => p.lifecycle === "upcoming" && p.validityStatus === "resolved",
      ).length,
      Failed: failures.length,
    },
  };
}
