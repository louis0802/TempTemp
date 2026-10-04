/** Content recovery never creates or repairs a scheduled acquisition pass. */
import { createHash } from "node:crypto";
import path from "node:path";
import { readdir } from "node:fs/promises";
import {
  runDiscovery,
  projectCandidatesForSources,
  mergeCandidateObservations,
  type DiscoveryResult,
  type FetchPage,
  type CandidateProposal,
  type SourceSnapshot,
  type RecoveryTraversalTarget,
} from "./discovery";
import { CORE_SOURCE_IDS, type SourceRegistry } from "./protocol";
import {
  optionalJson,
  readDiscoveryPasses,
  summarizeDiscoveryPasses,
  cadenceHours,
} from "./passes";
import { singaporeCalendarDate, singaporeDayBounds } from "./scheduler";
import { atomicWriteJson, writeNewJson } from "./storage";
import { z } from "zod";
import {
  classifySnapshotCompleteness,
  datedListingOrderingVerified,
} from "./completeness";

export type RecoveryStatus = "complete" | "partial" | "unsupported" | "failed";
export type CatchUpCapability = "complete" | "partial" | "unsupported";
export type RecoveryCheckpoint = {
  schema_version: 1;
  source_id: string;
  last_successful_observed_at: string;
  newest_published_at: string | null;
  oldest_published_at: string | null;
  overlap_identities: {
    url: string;
    content_hash: string;
    published_at: string | null;
  }[];
  pages_observed: number;
  terminal_page_reached: boolean;
  cap_truncated: boolean;
  enumeration_boundary?: "terminal_archive" | "checkpoint_overlap";
  ordering_verified?: boolean;
  pagination_complete?: boolean;
};
export type RecoveryProof = {
  strategy: "dated_archive_checkpoint_overlap" | "unsupported";
  checkpoint_kind: "durable_live_listing" | null;
  checkpoint_value: string | null;
  traversal_started_at: string;
  traversal_ended_at: string;
  oldest_observed_published_at: string | null;
  crossed_checkpoint: boolean;
  overlap_verified: boolean;
  terminal_page_reached: boolean;
  cap_truncated: boolean;
  ordering_verified: boolean;
  pagination_complete: boolean;
  reasons: string[];
};
export type SourceRecovery = {
  source_id: string;
  checkpoint_at: string | null;
  window_start: string;
  window_end: string;
  recovered_at: string;
  status: RecoveryStatus;
  reason: string;
  proof: RecoveryProof;
};
export type RecoveryResult = {
  recovery_id: string;
  logical_day: string;
  origin: "missed_acquisition_cadence";
  sources: SourceRecovery[];
  result: DiscoveryResult;
  unassigned_candidate_ids: string[];
};

const COMPLETE_CAPABLE = new Set([
  "confirmgood_deals",
  "eatbook_deals",
  "everydayonsales_food",
]);

export function runtimeCatchUpCapability(source: {
  source_id: string;
  enumerable: boolean;
  catch_up_capability?: unknown;
}): CatchUpCapability {
  if (!source.enumerable || source.catch_up_capability === "unsupported")
    return "unsupported";
  return COMPLETE_CAPABLE.has(source.source_id) ? "complete" : "partial";
}

const checkpointFile = (root: string, sourceId: string) =>
  path.join(root, "recovery-checkpoints", `${sourceId}.json`);

const timestamp = z.string().refine((s) => Number.isFinite(Date.parse(s)));
const checkpointSchema = z.object({
  schema_version: z.literal(1),
  source_id: z.string(),
  last_successful_observed_at: timestamp,
  newest_published_at: timestamp,
  oldest_published_at: timestamp,
  overlap_identities: z
    .array(
      z.object({
        url: z.url(),
        content_hash: z.string().min(1),
        published_at: timestamp,
      }),
    )
    .min(1),
  pages_observed: z.number().int().positive(),
  terminal_page_reached: z.boolean(),
  cap_truncated: z.boolean(),
  enumeration_boundary: z
    .enum(["terminal_archive", "checkpoint_overlap"])
    .optional(),
  ordering_verified: z.boolean().optional(),
  pagination_complete: z.boolean().optional(),
});

export async function recoveryCheckpointStatus(root: string, sourceId: string) {
  let raw: unknown;
  try {
    raw = await optionalJson(checkpointFile(root, sourceId));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return {
      validity: "invalid" as const,
      checkpoint: null,
      reasons: ["checkpoint_schema_invalid"],
    };
  }
  if (!raw)
    return {
      validity: "unavailable" as const,
      checkpoint: null,
      reasons: ["durable_live_checkpoint_unavailable"],
    };
  return validateRecoveryCheckpoint(raw, sourceId);
}

function validateRecoveryCheckpoint(raw: unknown, sourceId: string) {
  const parsed = checkpointSchema.safeParse(raw);
  if (!parsed.success)
    return {
      validity: "invalid" as const,
      checkpoint: null,
      reasons: ["checkpoint_schema_invalid"],
    };
  const c = parsed.data;
  const reasons: string[] = [];
  if (c.source_id !== sourceId) reasons.push("checkpoint_source_mismatch");
  if (c.cap_truncated) reasons.push("checkpoint_cap_truncated");
  if (c.ordering_verified === false || c.pagination_complete === false)
    reasons.push("checkpoint_boundary_unproven");
  if (
    !c.terminal_page_reached &&
    !(
      c.enumeration_boundary === "checkpoint_overlap" &&
      c.ordering_verified === true &&
      c.pagination_complete === true
    )
  )
    reasons.push("checkpoint_boundary_unproven");
  const dates = c.overlap_identities.map((o) => Date.parse(o.published_at));
  if (
    dates.some((n, i) => i > 0 && n > dates[i - 1]) ||
    Math.max(...dates) !== Date.parse(c.newest_published_at) ||
    Math.min(...dates) !== Date.parse(c.oldest_published_at)
  )
    reasons.push("checkpoint_publication_order_invalid");
  return {
    validity: reasons.length ? ("invalid" as const) : ("valid" as const),
    checkpoint: reasons.length ? null : (c as RecoveryCheckpoint),
    reasons,
  };
}

export async function readRecoveryCheckpoint(root: string, sourceId: string) {
  return (await recoveryCheckpointStatus(root, sourceId)).checkpoint;
}

export async function liveRecoveryTraversalTargets(
  root: string,
  registry: { sources: SourceRegistry["sources"] },
) {
  const targets: Record<string, RecoveryTraversalTarget> = {};
  for (const source of registry.sources) {
    if (runtimeCatchUpCapability(source) !== "complete") continue;
    const checkpoint = await readRecoveryCheckpoint(root, source.source_id);
    if (checkpoint)
      targets[source.source_id] = {
        checkpoint_at: checkpoint.last_successful_observed_at,
        oldest_published_at: checkpoint.oldest_published_at,
        overlap_identities: checkpoint.overlap_identities,
      };
  }
  return targets;
}

function checkpointFromSnapshot(
  sourceId: string,
  observedAt: string,
  snapshot: SourceSnapshot,
): RecoveryCheckpoint | null {
  const dated = snapshot.listing_evidence.filter((card) => card.published_at);
  // Legacy rev5 category warnings refer to scope, not the captured dated archive boundary.
  const reasons = classifySnapshotCompleteness(
    snapshot,
  ).enumeration_reasons.filter(
    (r) => r !== "registered_category_or_tab_routes_not_traversed",
  );
  if (reasons.length || !datedListingOrderingVerified(snapshot)) return null;
  const publication = dated.map((card) => card.published_at!).sort();
  const checkpoint: RecoveryCheckpoint = {
    schema_version: 1,
    source_id: sourceId,
    last_successful_observed_at: observedAt,
    newest_published_at: publication.at(-1) ?? null,
    oldest_published_at: publication[0] ?? null,
    overlap_identities: dated.map((card) => ({
      url: card.url,
      content_hash: card.content_hash,
      published_at: card.published_at ?? null,
    })),
    pages_observed: snapshot.pages.length,
    terminal_page_reached:
      snapshot.recovery_traversal?.terminal_page_reached ??
      snapshot.archive_enumeration?.terminal_page_reached ??
      !snapshot.pagination_remaining,
    cap_truncated: snapshot.cap_truncated,
    enumeration_boundary: snapshot.recovery_traversal
      ? "checkpoint_overlap"
      : "terminal_archive",
    ordering_verified: true,
    pagination_complete: true,
  };
  return validateRecoveryCheckpoint(checkpoint, sourceId).checkpoint;
}

export async function persistLiveRecoveryCheckpoints(args: {
  root: string;
  observedAt: string;
  snapshots: SourceSnapshot[];
}) {
  for (const snapshot of args.snapshots) {
    if (!COMPLETE_CAPABLE.has(snapshot.source_id)) continue;
    const checkpoint = checkpointFromSnapshot(
      snapshot.source_id,
      args.observedAt,
      snapshot,
    );
    if (!checkpoint) continue;
    const prior = await readRecoveryCheckpoint(args.root, snapshot.source_id);
    if (
      prior &&
      Date.parse(prior.last_successful_observed_at) >=
        Date.parse(checkpoint.last_successful_observed_at)
    )
      continue;
    await atomicWriteJson(
      checkpointFile(args.root, snapshot.source_id),
      checkpoint,
      {
        root: args.root,
      },
    );
  }
}
export async function readRecoveries(dir: string): Promise<RecoveryResult[]> {
  const folder = path.join(dir, "discovery", "recovery");
  let names: string[];
  try {
    names = await readdir(folder);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const results: RecoveryResult[] = [];
  for (const name of names.sort()) {
    const result = await optionalJson<RecoveryResult>(
      path.join(folder, name, "recovery.json"),
    );
    if (result) results.push(result);
  }
  return results;
}

/** Reliable publication timestamp wins; an undated recovered entry cannot be assigned backwards. */
export function belongsToDay(candidate: CandidateProposal, date: string) {
  return (
    singaporeCalendarDate(candidate.published_at ?? candidate.seen_at) === date
  );
}

export async function recoverDiscovery(args: {
  root: string;
  dir: string;
  date: string;
  registry: SourceRegistry;
  now: () => string;
  fetchPage?: FetchPage;
  previous?: DiscoveryResult;
}) {
  const interval = await optionalJson<{
    protocol_revision: number;
    phase: string;
  }>(path.join(args.dir, "interval.json"));
  if (
    interval &&
    (![5, 6].includes(interval.protocol_revision) ||
      interval.phase !== "observing")
  )
    throw new Error("Recovery requires an observing revision-5/6 interval");
  if (
    (await optionalJson(path.join(args.dir, "OBSERVATIONS_SEALED"))) ||
    (await optionalJson(path.join(args.dir, "SEALED")))
  )
    throw new Error("Cannot recover into sealed research evidence");
  const at = args.now();
  const summary = await summarizeDiscoveryPasses(
    args.dir,
    args.date,
    args.registry,
    new Date(at),
  );
  const passes = await readDiscoveryPasses(args.dir);
  const failedEnumeration =
    args.registry.protocol_revision === 6
      ? enumerationFailures(passes)
          .filter(
            (f) =>
              COMPLETE_CAPABLE.has(f.source_id) &&
              Date.parse(f.scheduled_slot) + 3 * 3600000 <= Date.parse(at) &&
              !summary.cadence_gaps.some(
                (g) =>
                  g.source_id === f.source_id &&
                  g.scheduled_slot === f.scheduled_slot,
              ),
          )
          .map((f) => ({
            source_id: f.source_id,
            scheduled_slot: f.scheduled_slot,
            outcome: "enumeration_incomplete",
          }))
      : [];
  const missing = [...summary.cadence_gaps, ...failedEnumeration];
  if (!missing.length) return null;
  // Identity comes from persistent missed slots, not restart time. Crashes reuse source checkpoints.
  const recoveryId = createHash("sha256")
    .update(JSON.stringify(missing))
    .digest("hex")
    .slice(0, 24);
  const folder = path.join(args.dir, "discovery", "recovery", recoveryId);
  const output = path.join(folder, "recovery.json");
  const existing = await optionalJson<RecoveryResult>(output);
  if (existing) return existing;
  const sourceIds = new Set(missing.map((g) => g.source_id));
  const sources = args.registry.sources.filter((s) =>
    sourceIds.has(s.source_id),
  );
  const recoveryTargets: Record<string, RecoveryTraversalTarget> = {};
  for (const source of sources) {
    if (runtimeCatchUpCapability(source) !== "complete") continue;
    let checkpoint = await readRecoveryCheckpoint(args.root, source.source_id);
    if (!checkpoint) {
      const seed = passes
        .filter(
          ({ pass }) =>
            pass.observation_mode === "live" &&
            pass.outcome === "success" &&
            !!pass.completed_at,
        )
        .flatMap(({ pass, snapshots: passSnapshots }) =>
          passSnapshots
            .filter((snapshot) => snapshot.source_id === source.source_id)
            .map((snapshot) => ({ pass, snapshot })),
        )
        .sort((a, b) =>
          a.pass.completed_at!.localeCompare(b.pass.completed_at!),
        )
        .at(-1);
      if (seed) {
        await persistLiveRecoveryCheckpoints({
          root: args.root,
          observedAt: seed.pass.completed_at!,
          snapshots: [seed.snapshot],
        });
        checkpoint = await readRecoveryCheckpoint(args.root, source.source_id);
      }
    }
    if (checkpoint)
      recoveryTargets[source.source_id] = {
        checkpoint_at: checkpoint.last_successful_observed_at,
        oldest_published_at: checkpoint.oldest_published_at,
        overlap_identities: checkpoint.overlap_identities,
      };
  }
  const previousRecoveries = await readRecoveries(args.dir);
  const snapshots = [
    ...(args.previous?.source_snapshots ?? []),
    ...passes.flatMap((p) => p.snapshots),
    ...previousRecoveries.flatMap((r) => r.result.source_snapshots),
  ];
  const candidates = mergeCandidateObservations([
    ...(args.previous?.candidates ?? []),
    ...passes.flatMap((p) => p.candidates),
    ...previousRecoveries.flatMap((r) => r.result.candidates),
  ]);
  const latestSnapshots = new Map(
    [...snapshots]
      .filter((s) => !s.listing_failure && s.pages.length > 0)
      .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at))
      .map((s) => [s.source_id, s]),
  );
  const previous = {
    ...summary,
    candidates,
    source_snapshots: [...latestSnapshots.values()],
  };
  const result = await runDiscovery({
    runDir: folder,
    registry: { sources },
    now: args.now,
    fetchPage: args.fetchPage,
    previous,
    recoveryWindowStart: singaporeDayBounds(args.date).start.toISOString(),
    recoveryTargets,
    provenance: {
      observation_mode: "catch_up",
      acquisition_pass: recoveryId,
      recovery_reason: "missed_acquisition_cadence",
    },
  });
  const recovery: RecoveryResult = {
    recovery_id: recoveryId,
    logical_day: args.date,
    origin: "missed_acquisition_cadence",
    result,
    sources: sources.map((source) => {
      const snapshot = result.source_snapshots.find(
        (s) => s.source_id === source.source_id,
      )!;
      const durable = recoveryTargets[source.source_id];
      const fallbackCheckpoint =
        snapshots
          .filter(
            (s) =>
              s.source_id === source.source_id &&
              !s.listing_failure &&
              s.pages.length > 0,
          )
          .map((s) => s.observed_at)
          .sort()
          .at(-1) ?? null;
      const checkpoint =
        durable?.checkpoint_at ??
        (args.registry.protocol_revision === 6 &&
        COMPLETE_CAPABLE.has(source.source_id)
          ? null
          : fallbackCheckpoint);
      const traversal = snapshot.recovery_traversal;
      const capability = runtimeCatchUpCapability(source);
      const proof: RecoveryProof = traversal
        ? {
            strategy: traversal.strategy,
            checkpoint_kind: "durable_live_listing",
            checkpoint_value: traversal.checkpoint_boundary,
            traversal_started_at: traversal.traversal_started_at,
            traversal_ended_at: traversal.traversal_ended_at,
            oldest_observed_published_at:
              traversal.oldest_observed_published_at,
            crossed_checkpoint: traversal.crossed_checkpoint,
            overlap_verified: traversal.overlap_verified,
            terminal_page_reached: traversal.terminal_page_reached,
            cap_truncated: traversal.cap_truncated,
            ordering_verified: traversal.ordering_verified,
            pagination_complete: traversal.pagination_complete,
            reasons: traversal.reasons,
          }
        : {
            strategy: "unsupported",
            checkpoint_kind: null,
            checkpoint_value: null,
            traversal_started_at: snapshot.observed_at,
            traversal_ended_at: snapshot.observed_at,
            oldest_observed_published_at: null,
            crossed_checkpoint: false,
            overlap_verified: false,
            terminal_page_reached: !snapshot.pagination_remaining,
            cap_truncated: snapshot.cap_truncated,
            ordering_verified: false,
            pagination_complete: false,
            reasons: [
              capability === "complete"
                ? "durable_live_checkpoint_unavailable"
                : "runtime_complete_catch_up_not_supported",
            ],
          };
      const complete =
        capability === "complete" &&
        !snapshot.listing_failure &&
        proof.crossed_checkpoint &&
        proof.overlap_verified &&
        proof.ordering_verified &&
        proof.pagination_complete &&
        !proof.cap_truncated &&
        proof.reasons.length === 0;
      return {
        source_id: source.source_id,
        checkpoint_at: checkpoint,
        window_start:
          checkpoint ?? singaporeDayBounds(args.date).start.toISOString(),
        window_end: at,
        recovered_at: result.observed_at,
        status:
          capability === "unsupported"
            ? "unsupported"
            : snapshot.listing_failure
              ? "failed"
              : complete
                ? "complete"
                : "partial",
        reason:
          capability === "unsupported"
            ? "source_does_not_expose_enumerable_history"
            : snapshot.listing_failure
              ? "recovery_listing_failed"
              : complete
                ? "dated_archive_crossed_durable_checkpoint_with_overlap"
                : (proof.reasons[0] ??
                  "current_listing_does_not_prove_history_to_checkpoint"),
        proof,
      };
    }),
    unassigned_candidate_ids: result.candidates
      .filter((c) => !c.published_at && !belongsToDay(c, args.date))
      .map((c) => c.candidate_id),
  };
  await writeNewJson(output, recovery, { root: args.root });
  return recovery;
}

export async function summarizeRev5Acquisition(
  dir: string,
  date: string,
  registry: SourceRegistry,
  through?: Date,
) {
  const live = await summarizeDiscoveryPasses(dir, date, registry, through);
  const recoveries = await readRecoveries(dir);
  const recovered = recoveries
    .flatMap((r) => r.result.candidates)
    .filter((c) => belongsToDay(c, date));
  const candidates = mergeCandidateObservations([
    ...live.candidates,
    ...recovered,
  ]);
  const recoverySources = recoveries.flatMap((r) => r.sources);
  const reasons = new Set<string>();
  for (const source of registry.sources) {
    const gaps = live.cadence_gaps.filter(
      (g) => g.source_id === source.source_id,
    );
    const snapshots = live.source_snapshots.filter(
      (s) => s.source_id === source.source_id,
    );
    if (gaps.length) {
      const proof = recoverySources.find(
        (r) =>
          r.source_id === source.source_id &&
          r.status === "complete" &&
          Date.parse(r.window_start) <= Date.parse(gaps[0].scheduled_slot) &&
          Date.parse(r.window_end) >=
            (through?.getTime() ?? singaporeDayBounds(date).end.getTime()),
      );
      if (!proof)
        reasons.add(`content_recovery_incomplete:${source.source_id}`);
    } else if (
      !snapshots.length ||
      snapshots.some(
        (s) =>
          s.status !== "captured" || s.extraction_incomplete || s.cap_truncated,
      )
    ) {
      reasons.add(`content_enumeration_incomplete:${source.source_id}`);
    }
  }
  if (recoveries.some((r) => r.unassigned_candidate_ids.length))
    reasons.add("recovered_content_day_unknown");
  return {
    ...live,
    candidates,
    source_snapshots: [
      ...live.source_snapshots,
      ...recoveries.flatMap((r) => r.result.source_snapshots),
    ],
    totals: { ...live.totals, distinct_candidates: candidates.length },
    content_complete: reasons.size === 0,
    content_partial_reasons: [...reasons],
    recovery: recoveries.map((r) => ({
      recovery_id: r.recovery_id,
      logical_day: r.logical_day,
      origin: r.origin,
      sources: r.sources,
      unassigned_candidate_ids: r.unassigned_candidate_ids,
    })),
    partial_reasons: [...new Set([...live.partial_reasons, ...reasons])],
  };
}

/** Failed live enumeration windows require proof just like missed cadence windows. */
function enumerationFailures(
  passes: Awaited<ReturnType<typeof readDiscoveryPasses>>,
) {
  return passes.flatMap(({ pass, snapshots }) =>
    snapshots
      .filter(
        (snapshot) =>
          !classifySnapshotCompleteness(snapshot).enumeration_complete,
      )
      .map((snapshot) => ({
        source_id: snapshot.source_id,
        scheduled_slot: pass.scheduled_slot,
      })),
  );
}

function strictRecoveryCovers(
  source: SourceRecovery,
  start: string,
  end: number,
) {
  const p = source.proof;
  return (
    source.status === "complete" &&
    COMPLETE_CAPABLE.has(source.source_id) &&
    p?.strategy === "dated_archive_checkpoint_overlap" &&
    p.checkpoint_kind === "durable_live_listing" &&
    p.crossed_checkpoint &&
    p.overlap_verified &&
    p.ordering_verified &&
    p.pagination_complete &&
    !p.cap_truncated &&
    p.reasons.length === 0 &&
    Date.parse(source.window_start) <= Date.parse(start) &&
    Date.parse(source.window_end) >= end
  );
}

/** Revision 6 separates listing enumeration from semantic extraction; rev5 stays frozen. */
export async function summarizeRev6Acquisition(
  dir: string,
  date: string,
  registry: SourceRegistry,
  through?: Date,
) {
  const live = await summarizeDiscoveryPasses(dir, date, registry, through);
  const coreIds = registry.sources
    .filter((s) => s.research_role === "core_replacement")
    .map((s) => s.source_id);
  if (
    coreIds.length !== 3 ||
    CORE_SOURCE_IDS.some((id) => !coreIds.includes(id))
  )
    throw new Error("Invalid rev6 core cohort");
  const recoveries = await readRecoveries(dir);
  const passes = await readDiscoveryPasses(dir);
  const failures = enumerationFailures(passes);
  const until = Math.min(
    through?.getTime() ?? singaporeDayBounds(date).end.getTime(),
    singaporeDayBounds(date).end.getTime(),
  );
  const candidates = mergeCandidateObservations([
    ...live.candidates,
    ...recoveries
      .flatMap((r) => r.result.candidates)
      .filter((c) => belongsToDay(c, date)),
  ]);
  const snapshots = [
    ...live.source_snapshots,
    ...recoveries.flatMap((r) => r.result.source_snapshots),
  ];
  const recoverySources = recoveries.flatMap((r) => r.sources);
  const sourceCompleteness = registry.sources.map((source) => {
    const liveSnapshots = live.source_snapshots.filter(
      (s) => s.source_id === source.source_id,
    );
    const classifications = snapshots
      .filter((s) => s.source_id === source.source_id)
      .map(classifySnapshotCompleteness);
    const enumerationReasons = new Set<string>();
    const windows = [...live.cadence_gaps, ...failures].filter(
      (g) => g.source_id === source.source_id,
    );
    for (const window of windows) {
      if (
        !recoverySources.some(
          (r) =>
            r.source_id === source.source_id &&
            strictRecoveryCovers(
              r,
              window.scheduled_slot,
              Math.min(
                until,
                Date.parse(window.scheduled_slot) +
                  cadenceHours(source) * 3600000,
              ),
            ),
        )
      )
        enumerationReasons.add(
          failures.some(
            (f) =>
              f.source_id === source.source_id &&
              f.scheduled_slot === window.scheduled_slot,
          )
            ? `content_enumeration_incomplete:${source.source_id}`
            : `content_recovery_incomplete:${source.source_id}`,
        );
    }
    if (!liveSnapshots.length && !windows.length)
      enumerationReasons.add(
        `content_enumeration_incomplete:${source.source_id}`,
      );
    return {
      source_id: source.source_id,
      enumeration_complete: enumerationReasons.size === 0,
      extraction_complete:
        classifications.length > 0 &&
        classifications.every((c) => c.extraction_complete),
      enumeration_reasons: [...enumerationReasons],
      live_enumeration_reasons: [
        ...new Set(
          liveSnapshots.flatMap(
            (s) => classifySnapshotCompleteness(s).enumeration_reasons,
          ),
        ),
      ],
      extraction_reasons: [
        ...new Set(classifications.flatMap((c) => c.extraction_reasons)),
      ],
    };
  });
  const allReasons = sourceCompleteness.flatMap((s) => s.enumeration_reasons);
  const coreReasons = sourceCompleteness
    .filter((s) => coreIds.includes(s.source_id))
    .flatMap((s) => s.enumeration_reasons);
  if (recoveries.some((r) => r.unassigned_candidate_ids.length))
    allReasons.push("recovered_content_day_unknown");
  if (
    recoveries.some((r) =>
      r.result.candidates.some(
        (c) =>
          r.unassigned_candidate_ids.includes(c.candidate_id) &&
          c.occurrences.some((o) => coreIds.includes(o.source_id)),
      ),
    )
  )
    coreReasons.push("core_recovered_content_day_unknown");
  const nonlive = passes
    .filter((p) => p.pass.observation_mode !== "live")
    .flatMap((p) => p.pass.source_ids);
  const coreGaps = live.cadence_gaps.filter((g) =>
    coreIds.includes(g.source_id),
  );
  const supplementalIds = registry.sources
    .filter((s) => s.research_role === "supplemental")
    .map((s) => s.source_id);
  return {
    ...live,
    candidates,
    source_snapshots: snapshots,
    totals: { ...live.totals, distinct_candidates: candidates.length },
    content_complete: allReasons.length === 0,
    content_partial_reasons: allReasons,
    partial_reasons: [...new Set([...live.partial_reasons, ...allReasons])],
    recovery: recoveries.map((r) => ({
      recovery_id: r.recovery_id,
      logical_day: r.logical_day,
      origin: r.origin,
      sources: r.sources,
      unassigned_candidate_ids: r.unassigned_candidate_ids,
    })),
    source_completeness: sourceCompleteness,
    core_enumeration_complete: sourceCompleteness
      .filter((s) => coreIds.includes(s.source_id))
      .every((s) => s.enumeration_complete),
    core_extraction_complete: sourceCompleteness
      .filter((s) => coreIds.includes(s.source_id))
      .every((s) => s.extraction_complete),
    all_registry_enumeration_complete: sourceCompleteness.every(
      (s) => s.enumeration_complete,
    ),
    all_registry_extraction_complete: sourceCompleteness.every(
      (s) => s.extraction_complete,
    ),
    core_content_complete: coreReasons.length === 0,
    core_content_partial_reasons: coreReasons,
    core_cadence_complete:
      coreGaps.length === 0 && !nonlive.some((id) => coreIds.includes(id)),
    all_registry_content_complete: allReasons.length === 0,
    all_registry_cadence_complete:
      live.cadence_gaps.length === 0 && nonlive.length === 0,
    core_candidates: projectCandidatesForSources(candidates, coreIds),
    supplemental_candidates: projectCandidatesForSources(
      candidates,
      supplementalIds,
    ),
    all_registry_missing_passes: live.cadence_gaps,
    supplemental_missing_passes: live.cadence_gaps.filter((g) =>
      supplementalIds.includes(g.source_id),
    ),
    supplemental_failures: snapshots.filter(
      (s) =>
        supplementalIds.includes(s.source_id) &&
        (s.listing_failure || s.status !== "captured"),
    ),
  };
}

export function sourceCapabilityAudit(registry: SourceRegistry) {
  return registry.sources.map((source) => {
    const capability = runtimeCatchUpCapability(source);
    return {
      source_id: source.source_id,
      research_role: source.research_role,
      runtime_catch_up_capability: capability,
      proof_strategy:
        capability === "complete"
          ? "dated_archive_checkpoint_overlap"
          : "unsupported",
      historical_publication_visibility: source.freshness_visibility,
      checkpoint_support:
        capability === "complete"
          ? "durable_live_listing"
          : "none_for_complete_historical_proof",
      pagination_support: source.pagination,
      reason:
        capability === "complete"
          ? "Dated archive traversal must cross durable checkpoint, verify overlap and ordering, finish pagination without caps or failures."
          : capability === "partial"
            ? "Current-state enumeration cannot prove complete publication history across an offline gap."
            : "Listing/history is not reliably enumerable by the current adapter.",
    };
  });
}
