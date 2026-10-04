/** Target-blind scheduled acquisition. Reads and writes only research pass evidence. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  mergeCandidateObservations,
  type DiscoveryResult,
  type CandidateProposal,
  type SourceSnapshot,
} from "./discovery";
import type { SourceRegistry, SourceRegistryEntry } from "./protocol";
import { HOUR_MS, singaporeDayBounds } from "./scheduler";

export const cadenceHours = (source: SourceRegistryEntry) => {
  if (!source.cadence_class)
    throw new Error(`Missing cadence class: ${source.source_id}`);
  return source.cadence_class === "fresh_publisher" ? 3 : 24;
};
export function sourceSlot(
  source: SourceRegistryEntry,
  date: string,
  at: Date,
) {
  const start = singaporeDayBounds(date).start.getTime();
  const cadence = cadenceHours(source) * HOUR_MS;
  return new Date(
    start + Math.floor((at.getTime() - start) / cadence) * cadence,
  ).toISOString();
}
export const passDir = (dir: string, slot: string) =>
  path.join(dir, "discovery", "passes", slot.replaceAll(":", "-"));
export type DiscoveryPass = {
  observation_mode?: "live" | "catch_up";
  scheduled_slot: string;
  attempted_at: string;
  completed_at: string | null;
  source_ids: string[];
  outcome: "started" | "success" | "failed";
  error?: string;
};
export async function optionalJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function readDiscoveryPasses(dir: string) {
  const base = path.join(dir, "discovery", "passes");
  let names: string[];
  try {
    names = await readdir(base);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    names.sort().map(async (name) => {
      const folder = path.join(base, name);
      const pass = await optionalJson<DiscoveryPass>(
        path.join(folder, "pass.json"),
      );
      if (!pass) throw new Error(`Missing pass metadata: ${name}`);
      const result = await optionalJson<DiscoveryResult>(
        path.join(folder, "result.json"),
      );
      // Interrupted passes still retain their actual source checkpoints at daily freeze.
      const snapshots: SourceSnapshot[] = [],
        candidates: CandidateProposal[] = [];
      if (!result)
        for (const id of pass.source_ids) {
          const checkpoint = await optionalJson<{
            snapshot: SourceSnapshot;
            candidates: CandidateProposal[];
          }>(path.join(folder, "discovery", "sources", `${id}.json`));
          if (checkpoint) {
            snapshots.push(checkpoint.snapshot);
            candidates.push(...checkpoint.candidates);
          }
        }
      return {
        pass,
        result,
        snapshots: result?.source_snapshots ?? snapshots,
        candidates: result?.candidates ?? candidates,
      };
    }),
  );
}
export async function summarizeDiscoveryPasses(
  dir: string,
  date: string,
  registry: SourceRegistry,
  through?: Date,
) {
  const passes = await readDiscoveryPasses(dir);
  const { start, end } = singaporeDayBounds(date);
  const until = Math.min(through?.getTime() ?? end.getTime(), end.getTime());
  const gaps: { source_id: string; scheduled_slot: string; outcome: string }[] =
    [];
  for (const source of registry.sources) {
    const step = cadenceHours(source) * HOUR_MS;
    for (let ms = start.getTime(); ms < until; ms += step) {
      const match = passes.find(
        (p) =>
          Date.parse(p.pass.scheduled_slot) === ms &&
          p.pass.source_ids.includes(source.source_id),
      );
      const complete = match?.pass.completed_at
        ? Date.parse(match.pass.completed_at)
        : Infinity;
      const deadline = Math.min(ms + step, end.getTime());
      let outcome =
        match?.pass.outcome === "success" &&
        complete < deadline &&
        match.snapshots.some((s) => s.source_id === source.source_id)
          ? "complete"
          : match?.pass.outcome === "failed"
            ? "failed"
            : match?.pass.outcome === "success"
              ? "late_or_incomplete"
              : match
                ? "in_progress"
                : "missing_slot";
      if (outcome === "in_progress" && deadline <= until)
        outcome = "interrupted";
      if (
        outcome !== "complete" &&
        (deadline <= until ||
          outcome === "failed" ||
          outcome === "late_or_incomplete")
      )
        gaps.push({
          source_id: source.source_id,
          scheduled_slot: new Date(ms).toISOString(),
          outcome,
        });
    }
  }
  const snapshots = passes.flatMap((p) => p.snapshots);
  const candidates = mergeCandidateObservations(
    passes
      .flatMap((p) => p.candidates)
      .filter((c) => Date.parse(c.seen_at) < end.getTime()),
  );
  const latest = new Map<string, SourceSnapshot>();
  for (const snapshot of snapshots) latest.set(snapshot.source_id, snapshot);
  const totals = {
    sources: latest.size,
    cards_seen: snapshots.reduce((n, s) => n + s.entries_seen_count, 0),
    cards_evaluated: snapshots.reduce((n, s) => n + s.cards_evaluated, 0),
    cards_skipped_stale: snapshots.reduce(
      (n, s) => n + s.cards_skipped_stale,
      0,
    ),
    cards_outside_horizon: snapshots.reduce(
      (n, s) => n + s.cards_outside_horizon,
      0,
    ),
    cards_temporal_ambiguous: snapshots.reduce(
      (n, s) => n + s.cards_temporal_ambiguous,
      0,
    ),
    candidate_proposals: snapshots.reduce(
      (n, s) => n + s.candidate_proposals,
      0,
    ),
    distinct_candidates: candidates.length,
    detail_attempts: snapshots.reduce((n, s) => n + s.detail_attempts, 0),
    detail_failures: snapshots.reduce((n, s) => n + s.detail_failures, 0),
    source_failures: [...latest.values()].filter((s) => s.listing_failure)
      .length,
    truncated_sources: [...latest.values()].filter((s) => s.cap_truncated)
      .length,
    incomplete_sources: [...latest.values()].filter(
      (s) =>
        s.status !== "captured" || s.extraction_incomplete || s.cap_truncated,
    ).length,
  };
  return {
    schema_version: 1 as const,
    observed_at: passes.at(-1)?.pass.completed_at ?? start.toISOString(),
    source_snapshots: snapshots,
    candidates,
    totals,
    cadence_gaps: gaps,
    partial_reasons: [
      ...(gaps.length ? ["incomplete_discovery_cadence"] : []),
      ...(!passes.length ? ["discovery_not_completed"] : []),
      ...[
        ...new Set(
          snapshots
            .filter(
              (s) =>
                s.status !== "captured" ||
                s.extraction_incomplete ||
                s.cap_truncated,
            )
            .map((s) => `source_incomplete:${s.source_id}`),
        ),
      ],
    ],
  };
}

export async function nextDiscoveryAt(
  dir: string,
  date: string,
  registry: SourceRegistry,
  now: Date,
) {
  if (now >= singaporeDayBounds(date).end) return now.toISOString();
  const passes = await readDiscoveryPasses(dir);
  return new Date(
    Math.min(
      ...registry.sources.map((source) => {
        const slot = sourceSlot(source, date, now);
        const pass = passes.find(
          (p) =>
            p.pass.scheduled_slot === slot &&
            p.pass.source_ids.includes(source.source_id),
        );
        return !pass || pass.pass.outcome === "started"
          ? now.getTime()
          : Date.parse(slot) + cadenceHours(source) * HOUR_MS;
      }),
    ),
  ).toISOString();
}
