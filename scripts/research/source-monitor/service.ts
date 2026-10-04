/** Continuous local research service. It never writes application ingestion state. */
import {
  persistLiveRecoveryCheckpoints,
  readRecoveries,
  recoverDiscovery,
  summarizeRev5Acquisition,
  summarizeRev6Acquisition,
  liveRecoveryTraversalTargets,
} from "./recovery";
import { randomUUID } from "node:crypto";
import { researchAnalysisEvaluations } from "./analysis";
import { access, appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { DateTime } from "luxon";
import { z } from "zod";
import { collectPreview } from "../../../src/ingestion/sources/telegram-preview";
import {
  runDiscovery,
  mergeCandidateObservations,
  type DiscoveryResult,
  type FetchPage,
} from "./discovery";
import {
  evaluateInterval,
  cumulativeMetrics,
  type Evaluation,
  type Reviews,
} from "./evaluation";
import {
  addPartialReason,
  freezeAcquisition,
  freezeRawBenchmark,
  intervalDir,
  listedIntervalDates,
  openInterval,
  readInterval,
  sealEvaluation,
  verifyObservationSeal,
} from "./intervals";
import { loadPinnedResearchAssets, type SourceRegistry } from "./protocol";
import {
  isHourlyDue,
  hourlySlot,
  isSingaporeDailyDue,
  nextHourlyBoundary,
  nextSingaporeDayBoundary,
  singaporeCalendarDate,
  singaporeDayBounds,
} from "./scheduler";
import {
  atomicWriteJson,
  readJsonValidated,
  verifySeal,
  writeNewJson,
} from "./storage";
import {
  createTelegramResearchState,
  pollTelegram,
  recordRestartCoverageGaps,
  telegramIntervalCoverage,
  telegramContentCoverage,
  TELEGRAM_CHANNELS,
  type TelegramResearchState,
  type PreviewCollector,
} from "./telegram";

import {
  nextDiscoveryAt,
  optionalJson,
  passDir,
  readDiscoveryPasses,
  sourceSlot,
  summarizeDiscoveryPasses,
  type DiscoveryPass,
} from "./passes";

export type ServiceState = {
  schema_version: 1;
  service_started_at: string;
  service_instance_id: string;
  active_interval: string | null;
  last_completed_interval: string | null;
  telegram: TelegramResearchState;
  discovery: {
    last_successful_run_at: string | null;
    last_attempt_at: string | null;
    last_attempt_date: string | null;
    attempts_by_date: Record<string, number>;
    retry_after_at: string | null;
    errors: { date: string; at: string; error: string }[];
  };
  health: { consecutive_failures: number; missed_poll_count: number };
};

type Clock = () => Date;
export type ServiceOptions = {
  root: string;
  now?: Clock;
  collect?: PreviewCollector;
  fetchPage?: FetchPage;
  protocolRevision?: 3 | 4 | 5 | 6;
};

const instantSchema = z
  .string()
  .refine(
    (value) => value.endsWith("Z") && Number.isFinite(Date.parse(value)),
    "UTC instant required",
  );
const nullableInstant = instantSchema.nullable();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const channelSchema = z.object({
  baseline_completed_at: nullableInstant,
  last_attempt_at: nullableInstant,
  last_successful_poll_at: nullableInstant,
  last_complete_through_at: nullableInstant,
  seen_ids: z
    .array(z.number().int().positive())
    .refine((ids) => new Set(ids).size === ids.length),
  observations: z.array(
    z.object({
      channel: z.enum(TELEGRAM_CHANNELS),
      message_id: z.number().int().positive(),
      observation_mode: z.enum(["live", "catch_up"]).optional(),
      recovered_at: nullableInstant.optional(),
      scheduled_slot: instantSchema.optional(),
      source_id: z.string().optional(),
      recovery_reason: z.string().nullable().optional(),
      first_seen_at: instantSchema,
      published_at: instantSchema,
      text: z.string(),
      permalink: z.string().url(),
    }),
  ),
  late_historical_posts: z.array(
    z.object({
      channel: z.enum(TELEGRAM_CHANNELS),
      message_id: z.number().int().positive(),
      observation_mode: z.enum(["live", "catch_up"]).optional(),
      recovered_at: nullableInstant.optional(),
      scheduled_slot: instantSchema.optional(),
      source_id: z.string().optional(),
      recovery_reason: z.string().nullable().optional(),
      first_seen_at: instantSchema,
      published_at: instantSchema,
      text: z.string(),
      permalink: z.string().url(),
      reason: z.literal("published_before_baseline"),
      baseline_completed_at: instantSchema,
    }),
  ),
  polls: z.array(
    z.object({
      observation_mode: z.enum(["live", "catch_up"]).optional(),
      recovery_status: z.enum(["complete", "partial", "failed"]).optional(),
      slot: instantSchema,
      scheduled_slot: instantSchema.optional(),
      lateness_ms: z.number().optional(),
      attempted_at: instantSchema,
      completed_at: nullableInstant,
      outcome: z.enum(["started", "success", "failed", "interrupted"]),
      baseline: z.boolean(),
      coverage_start: nullableInstant,
      complete_through: nullableInstant,
      pages: z.number().int().nullable(),
      observed_post_count: z.number().int().nonnegative(),
      new_post_ids: z.array(z.number().int().positive()),
      error: z.string().nullable(),
    }),
  ),
  errors: z.array(
    z.object({
      attempted_at: instantSchema,
      failed_at: instantSchema,
      error: z.string(),
    }),
  ),
  coverage_gaps: z.array(
    z.object({
      start_at: instantSchema,
      end_at: instantSchema,
      reason: z.enum([
        "successful_late",
        "missing_slot",
        "failed",
        "restart",
        "missed_hourly_poll",
        "poll_failed",
        "interrupted_poll",
        "late_historical_post",
      ]),
      missed_poll_count: z.number().int().nonnegative(),
    }),
  ),
  consecutive_failures: z.number().int().nonnegative(),
  missed_poll_count: z.number().int().nonnegative(),
});
const stateSchema = z.object({
  schema_version: z.literal(1),
  service_started_at: instantSchema,
  service_instance_id: z.string().min(1),
  active_interval: dateSchema.nullable(),
  last_completed_interval: dateSchema.nullable(),
  telegram: z.object({
    channels: z.object({
      sgfooddeals: channelSchema,
      tastesoulsg: channelSchema,
    }),
  }),
  discovery: z.object({
    last_successful_run_at: nullableInstant,
    last_attempt_at: nullableInstant,
    last_attempt_date: dateSchema.nullable(),
    attempts_by_date: z.record(dateSchema, z.number().int().nonnegative()),
    retry_after_at: nullableInstant,
    errors: z.array(
      z.object({ date: dateSchema, at: instantSchema, error: z.string() }),
    ),
  }),
  health: z.object({
    consecutive_failures: z.number().int().nonnegative(),
    missed_poll_count: z.number().int().nonnegative(),
  }),
});
function validState(value: unknown): value is ServiceState {
  return stateSchema.safeParse(value).success;
}
const exists = async (file: string) => {
  try {
    await readFile(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
};
const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, "utf8")) as T;
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function defaultDataRoot() {
  return path.resolve(
    process.env.SOURCE_MONITOR_DATA_DIR ?? ".local/source-discovery-service",
  );
}

export async function preflightResearchService(options: ServiceOptions) {
  const root = path.resolve(options.root);
  const assets = await loadPinnedResearchAssets(options.protocolRevision);
  let parent = root;
  while (true) {
    try {
      await access(parent, constants.F_OK);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const next = path.dirname(parent);
    if (next === parent)
      throw new Error("No existing parent for research data directory");
    parent = next;
  }
  await access(parent, constants.W_OK | constants.X_OK);
  const stateFile = path.join(root, "state.json");
  if (await exists(stateFile)) {
    const state = await readJsonValidated(stateFile, validState);
    if (state.active_interval) {
      const active = await readInterval(root, state.active_interval);
      const activeAssets = await loadPinnedResearchAssets(
        active.protocol_revision,
      );
      if (
        active.protocol_sha256 !== activeAssets.protocolSha256 ||
        active.registry_sha256 !== activeAssets.registrySha256
      )
        throw new Error(
          "Active research interval protocol or registry hash mismatch",
        );
    }
  }
  const collect = options.collect ?? collectPreview;
  const now = options.now?.() ?? new Date();
  const channelResults: Record<
    string,
    { reachable: boolean; posts: number; error: string | null }
  > = {};
  for (const channel of TELEGRAM_CHANNELS) {
    try {
      const result = await collect(
        channel,
        DateTime.fromJSDate(now).minus({ days: 1 }),
        { now: DateTime.fromJSDate(now), maxPages: 60 },
      );
      channelResults[channel] = {
        reachable: result.data.source === channel && result.data.complete,
        posts: result.data.posts.length,
        error: null,
      };
    } catch (error) {
      channelResults[channel] = {
        reachable: false,
        posts: 0,
        error: errorText(error),
      };
    }
  }
  return {
    ok: TELEGRAM_CHANNELS.every((channel) => channelResults[channel].reachable),
    data_dir: root,
    data_dir_writable: true,
    state_schema_valid: true,
    protocol_revision: assets.protocol.revision,
    protocol_sha256: assets.protocolSha256,
    registry_sha256: assets.registrySha256,
    registered_sources: assets.registry.sources.length,
    telegram: channelResults,
    observation_state_modified: false,
  };
}

async function readOptionalReview<T>(file: string): Promise<T | undefined> {
  try {
    return await readJson<T>(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Earliest known candidate times survive days when an offer disappears from listings. */
export async function previousDiscoveryEvidence(
  root: string,
  beforeDate: string,
): Promise<DiscoveryResult | undefined> {
  let previous: DiscoveryResult | undefined;
  const earliestCandidates = new Map<
    string,
    DiscoveryResult["candidates"][number]
  >();
  for (const priorDate of (await listedIntervalDates(root)).filter(
    (item) => item < beforeDate,
  )) {
    const priorFile = path.join(
      intervalDir(root, priorDate),
      "discovery-result.json",
    );
    if (!(await exists(priorFile))) continue;
    const result = await readJson<DiscoveryResult>(priorFile);
    previous = result;
    const recovered = (
      await readRecoveries(intervalDir(root, priorDate))
    ).flatMap((r) => r.result.candidates);
    for (const candidate of mergeCandidateObservations(
      [...result.candidates, ...recovered],
      [...earliestCandidates.values()],
    ))
      earliestCandidates.set(candidate.candidate_id, candidate);
  }
  return previous
    ? { ...previous, candidates: [...earliestCandidates.values()] }
    : undefined;
}

export async function statusResearchService(root: string) {
  const directory = path.resolve(root),
    file = path.join(directory, "state.json");
  if (!(await exists(file))) return { initialized: false, data_dir: directory };
  const state = await readJsonValidated(file, validState);
  const active = state.active_interval
    ? await readInterval(directory, state.active_interval)
    : null;
  const now = new Date();
  const lastAttempts = TELEGRAM_CHANNELS.map(
    (ch) => state.telegram.channels[ch].last_attempt_at,
  ).filter((v): v is string => !!v);
  const latestAttempt = lastAttempts.length
    ? lastAttempts.sort().at(-1)!
    : null;
  const lastSuccesses = TELEGRAM_CHANNELS.map(
    (ch) => state.telegram.channels[ch].last_successful_poll_at,
  ).filter((v): v is string => !!v);
  const latestSuccess = lastSuccesses.length
    ? lastSuccesses.sort().at(-1)!
    : null;
  const currentDate = singaporeCalendarDate(now);
  const discoveryDue = isSingaporeDailyDue(
    state.discovery.last_attempt_date,
    now,
  );
  const currentCount = active
    ? TELEGRAM_CHANNELS.reduce(
        (sum, ch) =>
          sum +
          state.telegram.channels[ch].observations.filter(
            (p) =>
              Date.parse(
                active.protocol_revision >= 5
                  ? p.published_at
                  : p.first_seen_at,
              ) >= Date.parse(active.interval_start_at) &&
              Date.parse(
                active.protocol_revision >= 5
                  ? p.published_at
                  : p.first_seen_at,
              ) < Date.parse(active.interval_end_at),
          ).length,
        0,
      )
    : 0;
  const discoveryFile = active
    ? path.join(intervalDir(directory, active.date), "discovery-result.json")
    : null;
  const discovery =
    discoveryFile && (await exists(discoveryFile))
      ? await readJson<DiscoveryResult>(discoveryFile)
      : active && active.protocol_revision >= 4
        ? await (
            active.protocol_revision === 6
              ? summarizeRev6Acquisition
              : active.protocol_revision >= 5
                ? summarizeRev5Acquisition
                : summarizeDiscoveryPasses
          )(
            intervalDir(directory, active.date),
            active.date,
            (await loadPinnedResearchAssets(active.protocol_revision)).registry,
            now,
          )
        : null;
  const checkpointCandidates = new Set<string>();
  let checkpointSources = 0;
  if (active && !discovery) {
    const checkpointDir = path.join(
      intervalDir(directory, active.date),
      "discovery",
      "sources",
    );
    let names: string[] = [];
    try {
      names = await readdir(checkpointDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    for (const name of names.filter((item) => item.endsWith(".json"))) {
      const checkpoint = await readJson<{
        candidates: { candidate_id: string }[];
      }>(path.join(checkpointDir, name));
      checkpointSources++;
      for (const candidate of checkpoint.candidates)
        checkpointCandidates.add(candidate.candidate_id);
    }
  }
  const discoveryFailuresToday = state.discovery.errors.filter(
    (item) => item.date === currentDate,
  ).length;
  const nextDiscovery =
    discovery || discoveryFailuresToday >= 3
      ? singaporeDayBounds(currentDate).end.toISOString()
      : state.discovery.retry_after_at &&
          Date.parse(state.discovery.retry_after_at) > now.getTime()
        ? state.discovery.retry_after_at
        : now.toISOString();
  const gaps = TELEGRAM_CHANNELS.flatMap((ch) =>
    state.telegram.channels[ch].coverage_gaps.map((g) => ({
      channel: ch,
      ...g,
    })),
  );
  return {
    initialized: true,
    data_dir: directory,
    service_started_at: state.service_started_at,
    service_instance_id: state.service_instance_id,
    active_interval: active
      ? {
          date: active.date,
          run_id: active.run_id,
          phase: active.phase,
          partial_reasons: active.partial_reasons,
        }
      : null,
    last_completed_interval: state.last_completed_interval,
    last_telegram_attempt: latestAttempt,
    last_telegram_success: latestSuccess,
    telegram_channels: Object.fromEntries(
      TELEGRAM_CHANNELS.map((ch) => {
        const channel = state.telegram.channels[ch];
        return [
          ch,
          {
            baseline_completed_at: channel.baseline_completed_at,
            last_attempt_at: channel.last_attempt_at,
            last_successful_poll_at: channel.last_successful_poll_at,
            complete_through_at: channel.last_complete_through_at,
            seen_ids: channel.seen_ids.length,
            errors: channel.errors.length,
            late_historical_posts: channel.late_historical_posts.length,
          },
        ];
      }),
    ),
    next_expected_telegram_poll:
      latestAttempt && !isHourlyDue(latestAttempt, now)
        ? nextHourlyBoundary(latestAttempt).toISOString()
        : now.toISOString(),
    last_discovery_success: state.discovery.last_successful_run_at,
    next_discovery_run:
      active && active.protocol_revision >= 4
        ? await nextDiscoveryAt(
            intervalDir(directory, active.date),
            active.date,
            (await loadPinnedResearchAssets(active.protocol_revision)).registry,
            now,
          )
        : discoveryDue || !discovery
          ? nextDiscovery
          : singaporeDayBounds(currentDate).end.toISOString(),
    poll_failures: TELEGRAM_CHANNELS.reduce(
      (sum, ch) => sum + state.telegram.channels[ch].errors.length,
      0,
    ),
    coverage_gaps: gaps,
    current_candidate_count:
      discovery?.candidates.length ?? checkpointCandidates.size,
    current_source_checkpoints:
      discovery?.source_snapshots.length ?? checkpointSources,
    current_discovery_totals: discovery?.totals ?? null,
    current_telegram_post_count: currentCount,
    missed_poll_count: state.health.missed_poll_count,
    consecutive_failures: state.health.consecutive_failures,
  };
}

export class ResearchSourceMonitorService {
  private revision: 3 | 4 | 5 | 6 = 6;
  private readonly requestedRevision: 3 | 4 | 5 | 6;
  private readonly root: string;
  private readonly now: Clock;
  private readonly collect?: PreviewCollector;
  private readonly fetchPage?: FetchPage;
  private state!: ServiceState;
  private registry!: SourceRegistry;
  private protocolSha256!: string;
  private registrySha256!: string;
  private saveQueue = Promise.resolve();
  private discoveryTask: Promise<void> | null = null;
  private discoveryAbort: AbortController | null = null;

  constructor(options: ServiceOptions) {
    this.requestedRevision = options.protocolRevision ?? 6;
    this.root = path.resolve(options.root);
    this.now = options.now ?? (() => new Date());
    this.collect = options.collect;
    this.fetchPage = options.fetchPage;
  }

  get currentState() {
    return structuredClone(this.state);
  }
  async waitForCurrentWork() {
    if (this.discoveryTask) await this.discoveryTask;
    await this.saveQueue;
  }
  private iso() {
    return this.now().toISOString();
  }
  private async saveState() {
    this.state.health.missed_poll_count = TELEGRAM_CHANNELS.reduce(
      (sum, ch) => sum + this.state.telegram.channels[ch].missed_poll_count,
      0,
    );
    const snapshot = structuredClone(this.state);
    this.saveQueue = this.saveQueue.then(async () => {
      await atomicWriteJson(path.join(this.root, "state.json"), snapshot, {
        root: this.root,
      });
      await atomicWriteJson(
        path.join(this.root, "health.json"),
        {
          updated_at: this.iso(),
          service_instance_id: snapshot.service_instance_id,
          active_interval: snapshot.active_interval,
          consecutive_failures: snapshot.health.consecutive_failures,
          missed_poll_count: snapshot.health.missed_poll_count,
          telegram_last_success: Object.fromEntries(
            TELEGRAM_CHANNELS.map((ch) => [
              ch,
              snapshot.telegram.channels[ch].last_successful_poll_at,
            ]),
          ),
          discovery_last_success: snapshot.discovery.last_successful_run_at,
        },
        { root: this.root },
      );
    });
    await this.saveQueue;
  }
  private async log(event: string, fields: Record<string, unknown> = {}) {
    const at = this.iso();
    await mkdir(path.join(this.root, "logs"), { recursive: true });
    await appendFile(
      path.join(this.root, "logs", `${singaporeCalendarDate(at)}.jsonl`),
      JSON.stringify({
        event,
        at,
        service_instance_id: this.state.service_instance_id,
        ...fields,
      }) + "\n",
      "utf8",
    );
  }

  private async selectRevision(revision: 3 | 4 | 5 | 6) {
    const assets = await loadPinnedResearchAssets(revision);
    this.revision = revision;
    this.registry = assets.registry;
    this.protocolSha256 = assets.protocolSha256;
    this.registrySha256 = assets.registrySha256;
  }
  private async openDay(date: string) {
    await this.selectRevision(this.requestedRevision);
    return openInterval(
      this.root,
      date,
      this.iso(),
      this.protocolSha256,
      this.registrySha256,
      this.revision,
      Date.parse(this.state.service_started_at) <
        singaporeDayBounds(date).start.getTime(),
    );
  }

  async initialize() {
    // Validate existing interval assets before any mutation, then keep its original semantics.
    const persisted = await optionalJson<ServiceState>(
      path.join(this.root, "state.json"),
    );
    if (persisted && !validState(persisted))
      throw new Error("Invalid research JSON schema");
    const active = persisted?.active_interval
      ? await readInterval(this.root, persisted.active_interval)
      : null;
    await this.selectRevision(
      active?.protocol_revision ?? this.requestedRevision,
    );
    if (
      active &&
      (active.protocol_sha256 !== this.protocolSha256 ||
        active.registry_sha256 !== this.registrySha256)
    )
      throw new Error(
        "Active research interval protocol or registry hash mismatch",
      );
    await mkdir(this.root, { recursive: true });
    const file = path.join(this.root, "state.json"),
      at = this.iso();
    if (await exists(file)) {
      this.state = await readJsonValidated(file, validState);
      this.state.service_started_at = at;
      this.state.service_instance_id = randomUUID();
      this.state.telegram = await recordRestartCoverageGaps(
        this.state.telegram,
        this.now(),
        async (telegram) => {
          this.state.telegram = telegram;
          await this.saveState();
        },
        this.revision,
      );
    } else {
      this.state = {
        schema_version: 1,
        service_started_at: at,
        service_instance_id: randomUUID(),
        active_interval: null,
        last_completed_interval: null,
        telegram: createTelegramResearchState(),
        discovery: {
          last_successful_run_at: null,
          last_attempt_at: null,
          last_attempt_date: null,
          attempts_by_date: {},
          retry_after_at: null,
          errors: [],
        },
        health: { consecutive_failures: 0, missed_poll_count: 0 },
      };
      await writeNewJson(file, this.state, { root: this.root });
    }
    if (this.state.active_interval) {
      const active = await readInterval(this.root, this.state.active_interval);
      if (
        active.protocol_sha256 !== this.protocolSha256 ||
        active.registry_sha256 !== this.registrySha256
      )
        throw new Error(
          "Active research interval protocol or registry hash mismatch",
        );
    }
    await this.pollRev5BeforeReconciliation();
    await this.reconcileIntervals();
    if (this.revision >= 5 && this.state.active_interval)
      await this.recoverDay(this.state.active_interval);
    await this.saveState();
    await this.log("service_started", {
      active_interval: this.state.active_interval,
    });
  }

  private async discoveryForClose(date: string): Promise<AcquisitionInputLike> {
    const revision = (await readInterval(this.root, date)).protocol_revision;
    if (revision >= 4) {
      const assets = await loadPinnedResearchAssets(revision);
      const result = await (
        revision === 6
          ? summarizeRev6Acquisition
          : revision >= 5
            ? summarizeRev5Acquisition
            : summarizeDiscoveryPasses
      )(intervalDir(this.root, date), date, assets.registry);
      const file = path.join(
        intervalDir(this.root, date),
        "discovery-result.json",
      );
      if (!(await exists(file)))
        await writeNewJson(file, result, { root: this.root });
      return result;
    }
    const dir = intervalDir(this.root, date),
      resultFile = path.join(dir, "discovery-result.json");
    if (await exists(resultFile)) {
      const result = await readJson<DiscoveryResult>(resultFile);
      const observedSources = new Set(
        result.source_snapshots.map((item) => item.source_id),
      );
      const allSourcesPresent =
        result.source_snapshots.length === this.registry.sources.length &&
        observedSources.size === this.registry.sources.length &&
        this.registry.sources.every((item) =>
          observedSources.has(item.source_id),
        );
      return {
        source_snapshots: result.source_snapshots,
        candidates: result.candidates,
        totals: result.totals,
        partial_reasons: [
          ...(!allSourcesPresent ? ["discovery_snapshot_incomplete"] : []),
          ...result.source_snapshots
            .filter(
              (s) =>
                s.status !== "captured" ||
                s.extraction_incomplete ||
                s.cap_truncated,
            )
            .map((s) => `source_incomplete:${s.source_id}`),
        ],
      };
    }
    const snapshots: unknown[] = [],
      candidates: unknown[] = [];
    const intervalEnd = singaporeDayBounds(date).end.getTime();
    let crossedBoundary = false;
    for (const source of this.registry.sources) {
      const checkpoint = path.join(
        dir,
        "discovery",
        "sources",
        `${source.source_id}.json`,
      );
      if (await exists(checkpoint)) {
        const saved = await readJson<{
          snapshot: { observed_at?: string; [key: string]: unknown };
          candidates: { seen_at?: string; [key: string]: unknown }[];
        }>(checkpoint);
        snapshots.push(saved.snapshot);
        for (const candidate of saved.candidates) {
          if (candidate.seen_at && Date.parse(candidate.seen_at) < intervalEnd)
            candidates.push(candidate);
          else crossedBoundary = true;
        }
      } else
        snapshots.push({
          source_id: source.source_id,
          status: "missed",
          entries_seen_count: 0,
          cards_evaluated: 0,
          cards_skipped_stale: 0,
          cards_outside_horizon: 0,
          cards_temporal_ambiguous: 0,
          candidate_proposals: 0,
          cap_truncated: false,
          pagination_remaining: false,
          listing_failure: true,
          detail_failures: 0,
          extraction_incomplete: true,
          incomplete_reasons: ["discovery_not_completed"],
        });
    }
    return {
      source_snapshots: snapshots,
      candidates,
      totals: {
        sources: snapshots.length,
        candidate_proposals: candidates.length,
      },
      partial_reasons: [
        "discovery_not_completed",
        ...(crossedBoundary ? ["discovery_crossed_interval_boundary"] : []),
      ],
    };
  }

  private async closeInterval(date: string) {
    const record = await readInterval(this.root, date);
    if (record.phase === "observing") {
      if (record.protocol_revision >= 5) await this.recoverDay(date);
      const acquisition = await this.discoveryForClose(date);
      await freezeAcquisition(this.root, date, acquisition, this.iso());
      await this.log("acquisition_frozen", {
        date,
        candidate_count: acquisition.candidates.length,
        partial_reasons: acquisition.partial_reasons,
      });
    }
    const afterAcquisition = await readInterval(this.root, date);
    if (afterAcquisition.phase === "acquisition_frozen") {
      const coverage = telegramIntervalCoverage(
        this.state.telegram,
        record.interval_start_at,
        record.interval_end_at,
        record.protocol_revision,
      );
      const from = Date.parse(record.interval_start_at),
        to = Date.parse(record.interval_end_at);
      const posts = TELEGRAM_CHANNELS.flatMap(
        (ch) => this.state.telegram.channels[ch].observations,
      ).filter(
        (p) =>
          Date.parse(
            record.protocol_revision >= 5 ? p.published_at : p.first_seen_at,
          ) >= from &&
          Date.parse(
            record.protocol_revision >= 5 ? p.published_at : p.first_seen_at,
          ) < to,
      );
      const polls = TELEGRAM_CHANNELS.flatMap((ch) =>
        this.state.telegram.channels[ch].polls.map((p) => ({
          channel: ch,
          ...p,
        })),
      ).filter(
        (p) =>
          Date.parse(p.attempted_at) >= from && Date.parse(p.attempted_at) < to,
      );
      await freezeRawBenchmark(
        this.root,
        date,
        {
          posts,
          ...(record.protocol_revision >= 5
            ? {
                content_complete: telegramContentCoverage(
                  this.state.telegram,
                  record.interval_start_at,
                  record.interval_end_at,
                ),
                content_partial_reasons: telegramContentCoverage(
                  this.state.telegram,
                  record.interval_start_at,
                  record.interval_end_at,
                )
                  ? []
                  : ["telegram_history_not_traversed"],
              }
            : {}),
          polls,
          coverage_gaps: coverage.coverage_gaps,
          coverage_complete:
            coverage.coverage_complete &&
            !record.partial_reasons.includes(
              "service_started_after_interval_start",
            ),
          channel_status: coverage.channel_status,
          coverage_note:
            record.protocol_revision >= 4
              ? "Scheduled public previews only; between-poll posts/deletions/media edits may be missed. Independent timing is bounded by 3-hour publisher and daily directory/campaign cadence."
              : "Scheduled public previews only; transient posts, deletions, and media edits between polls may be missed. Comparative timing is bounded by daily acquisition cadence.",
        },
        this.iso(),
      );
      await this.log("benchmark_frozen", {
        date,
        posts: posts.length,
        coverage_complete: coverage.coverage_complete,
      });
    }
    await verifyObservationSeal(this.root, date);
    this.state.last_completed_interval = date;
    if (this.state.active_interval === date) this.state.active_interval = null;
    await this.saveState();
    await this.log("interval_observations_sealed", { date });
    await this.finalizeIfReviewed(date);
  }

  private async pollRev5BeforeReconciliation() {
    if (this.revision < 5) return;
    const result = await pollTelegram(this.state.telegram, {
      revision: this.revision,
      scheduledSlot: hourlySlot(this.now()),
      collect: this.collect,
      now: this.now,
      save: async (telegram) => {
        this.state.telegram = telegram;
        await this.saveState();
      },
    });
    this.state.telegram = result.state;
    await this.saveState();
  }

  private async recoverDay(date: string) {
    const record = await readInterval(this.root, date);
    if (record.protocol_revision < 5 || record.phase !== "observing") return;
    if (this.discoveryTask) return;
    // A crashed pass is immutable cadence failure. Recovery gets its own checkpoint namespace.
    for (const { pass } of await readDiscoveryPasses(
      intervalDir(this.root, date),
    )) {
      if (pass.outcome !== "started") continue;
      await atomicWriteJson(
        path.join(
          passDir(intervalDir(this.root, date), pass.scheduled_slot),
          "pass.json",
        ),
        {
          ...pass,
          outcome: "failed",
          completed_at: this.iso(),
          error: "interrupted_pass_requires_content_recovery",
        },
        { root: this.root },
      );
    }
    const assets = await loadPinnedResearchAssets(record.protocol_revision);
    await recoverDiscovery({
      root: this.root,
      dir: intervalDir(this.root, date),
      date,
      registry: assets.registry,
      now: () => this.iso(),
      fetchPage: this.fetchPage,
      previous: await previousDiscoveryEvidence(this.root, date),
    });
  }

  private async reconcileIntervals() {
    const today = singaporeCalendarDate(this.now());
    let active = this.state.active_interval;
    if (
      !active &&
      this.state.last_completed_interval &&
      this.state.last_completed_interval < today
    ) {
      active = singaporeCalendarDate(
        singaporeDayBounds(this.state.last_completed_interval).end,
      );
      await this.openDay(active);
      this.state.active_interval = active;
      if (active < today)
        await addPartialReason(this.root, active, "service_offline_for_day");
      await this.saveState();
    }
    if (active && active > today)
      throw new Error("Active research interval is in the future");
    while (active && active < today) {
      if (this.discoveryTask) {
        this.discoveryAbort?.abort();
        await this.discoveryTask;
      }
      if ((await readInterval(this.root, active)).protocol_revision >= 5)
        await this.pollRev5BeforeReconciliation();
      await this.closeInterval(active);
      const next = singaporeCalendarDate(singaporeDayBounds(active).end);
      active = next;
      if (active < today) {
        await this.openDay(active);
        this.state.active_interval = active;
        await addPartialReason(this.root, active, "service_offline_for_day");
        await this.saveState();
      }
    }
    if (!this.state.active_interval) {
      const record = await this.openDay(today);
      if (
        record.protocol_sha256 !== this.protocolSha256 ||
        record.registry_sha256 !== this.registrySha256
      )
        throw new Error("Active interval protocol hash mismatch");
      this.state.active_interval = today;
      await this.saveState();
      await this.log("interval_opened", { date: today, run_id: record.run_id });
    }
  }

  private async startDiscovery(date: string) {
    if (this.discoveryTask) return;
    const dir = intervalDir(this.root, date),
      resultFile = path.join(dir, "discovery-result.json");
    if (await exists(resultFile)) {
      if (
        !this.state.discovery.last_successful_run_at ||
        this.state.discovery.last_attempt_date !== date
      ) {
        const priorResult = await readJson<DiscoveryResult>(resultFile);
        this.state.discovery.last_successful_run_at = priorResult.observed_at;
        this.state.discovery.last_attempt_date = date;
        await this.saveState();
      }
      return;
    }
    const attempts = this.state.discovery.attempts_by_date[date] ?? 0;
    const failures = this.state.discovery.errors.filter(
      (item) => item.date === date,
    ).length;
    if (
      failures >= 3 ||
      (this.state.discovery.retry_after_at &&
        Date.parse(this.state.discovery.retry_after_at) > this.now().getTime())
    )
      return;
    this.state.discovery.last_attempt_at = this.iso();
    this.state.discovery.last_attempt_date = date;
    this.state.discovery.attempts_by_date[date] = attempts + 1;
    await this.saveState();
    await this.log("discovery_started", { date, attempt: attempts + 1 });
    const abort = new AbortController();
    this.discoveryAbort = abort;
    const previous = await previousDiscoveryEvidence(this.root, date);
    const task = (async () => {
      try {
        const result = await runDiscovery({
          runDir: dir,
          registry: this.registry,
          now: () => this.iso(),
          fetchPage: this.fetchPage,
          previous,
          signal: abort.signal,
        });
        if (abort.signal.aborted || singaporeCalendarDate(this.now()) !== date)
          throw new Error(
            "Discovery crossed interval boundary; partial checkpoints retained",
          );
        await writeNewJson(resultFile, result, { root: this.root });
        this.state.discovery.last_successful_run_at = this.iso();
        this.state.discovery.retry_after_at = null;
        this.state.health.consecutive_failures = 0;
        await this.saveState();
        await this.log("discovery_complete", {
          date,
          candidates: result.candidates.length,
          sources: result.source_snapshots.length,
        });
      } catch (error) {
        this.state.discovery.errors.push({
          date,
          at: this.iso(),
          error: errorText(error),
        });
        this.state.health.consecutive_failures++;
        this.state.discovery.retry_after_at = new Date(
          this.now().getTime() + Math.min(60, 15 * (failures + 1)) * 60_000,
        ).toISOString();
        await this.saveState();
        await this.log("discovery_failed", { date, error: errorText(error) });
      }
    })();
    this.discoveryTask = task;
    void task.finally(() => {
      if (this.discoveryTask === task) this.discoveryTask = null;
      if (this.discoveryAbort === abort) this.discoveryAbort = null;
    });
  }

  private async startTieredDiscovery(date: string) {
    if (this.discoveryTask) return;
    const dir = intervalDir(this.root, date);
    const passes = await readDiscoveryPasses(dir);
    const at = this.now();
    const due = this.registry.sources.filter((source) => {
      const slot = sourceSlot(source, date, at);
      const existing = passes.find(
        (p) =>
          p.pass.scheduled_slot === slot &&
          p.pass.source_ids.includes(source.source_id),
      );
      // Completed/failed passes are never silently retried into successful coverage.
      return !existing || existing.pass.outcome === "started";
    });
    const interrupted = passes.find((p) => p.pass.outcome === "started");
    if (!due.length && !interrupted) return;
    // Resume the original source set; overdue publisher coverage stays late, never backfilled.
    // Midnight/daily sources and fresh publishers can have different overdue slots after restart.
    const slot =
      interrupted?.pass.scheduled_slot ?? sourceSlot(due[0], date, at);
    const sources = interrupted
      ? this.registry.sources.filter((source) =>
          interrupted.pass.source_ids.includes(source.source_id),
        )
      : due.filter((source) => sourceSlot(source, date, at) === slot);
    const folder = passDir(dir, slot),
      metaFile = path.join(folder, "pass.json");
    let pass = await optionalJson<DiscoveryPass>(metaFile);
    if (
      pass &&
      JSON.stringify(pass.source_ids) !==
        JSON.stringify(sources.map((s) => s.source_id))
    )
      throw new Error("Discovery pass source set changed");
    if (!pass) {
      pass = {
        ...(this.revision >= 5
          ? {
              observation_mode:
                this.now().getTime() - Date.parse(slot) > 5 * 60_000
                  ? ("catch_up" as const)
                  : ("live" as const),
            }
          : {}),
        scheduled_slot: slot,
        attempted_at: this.iso(),
        completed_at: null,
        source_ids: sources.map((s) => s.source_id),
        outcome: "started",
      };
      await mkdir(folder, { recursive: true });
      await writeNewJson(metaFile, pass, { root: this.root });
    }
    const metadata = pass;
    this.state.discovery.last_attempt_at = this.iso();
    this.state.discovery.last_attempt_date = date;
    this.state.discovery.attempts_by_date[date] =
      (this.state.discovery.attempts_by_date[date] ?? 0) + 1;
    await this.saveState();
    const historical = await previousDiscoveryEvidence(this.root, date);
    const today = await (
      this.revision === 6
        ? summarizeRev6Acquisition
        : this.revision >= 5
          ? summarizeRev5Acquisition
          : summarizeDiscoveryPasses
    )(dir, date, this.registry, at);
    const priorCandidates = mergeCandidateObservations([
      ...(historical?.candidates ?? []),
      ...today.candidates,
    ]);
    const latestSnapshots = new Map(
      [...(historical?.source_snapshots ?? []), ...today.source_snapshots].map(
        (s) => [s.source_id, s],
      ),
    );
    const previous: DiscoveryResult = {
      ...today,
      candidates: priorCandidates,
      source_snapshots: [...latestSnapshots.values()],
    };
    const abort = new AbortController();
    this.discoveryAbort = abort;
    const task = (async () => {
      try {
        // Crash after result write: reuse the immutable result, never fetch again.
        const resultFile = path.join(folder, "result.json");
        let result = await optionalJson<DiscoveryResult>(resultFile);
        if (!result) {
          result = await runDiscovery({
            runDir: folder,
            registry: { sources },
            now: () => this.iso(),
            fetchPage: this.fetchPage,
            previous,
            signal: abort.signal,
            ...(this.revision === 6
              ? {
                  recoveryTargets: await liveRecoveryTraversalTargets(
                    this.root,
                    { sources },
                  ),
                }
              : {}),
            ...(this.revision >= 5
              ? {
                  provenance: {
                    observation_mode:
                      Date.parse(metadata.attempted_at) - Date.parse(slot) >
                      5 * 60_000
                        ? ("catch_up" as const)
                        : ("live" as const),
                    scheduled_slot: slot,
                    acquisition_pass: slot,
                    recovery_reason:
                      Date.parse(metadata.attempted_at) - Date.parse(slot) >
                      5 * 60_000
                        ? "late_acquisition"
                        : null,
                  },
                }
              : {}),
          });
          await writeNewJson(resultFile, result, { root: this.root });
        }
        if (abort.signal.aborted || singaporeCalendarDate(this.now()) !== date)
          throw new Error(
            "Discovery crossed interval boundary; partial evidence retained",
          );
        metadata.outcome = "success";
        metadata.completed_at = result.observed_at;
        await atomicWriteJson(metaFile, metadata, { root: this.root });
        if (this.revision >= 5 && metadata.observation_mode === "live")
          await persistLiveRecoveryCheckpoints({
            root: this.root,
            observedAt: result.observed_at,
            snapshots: result.source_snapshots,
          });
        this.state.discovery.last_successful_run_at = result.observed_at;
        this.state.discovery.retry_after_at = null;
        await this.log("discovery_pass_complete", {
          date,
          slot,
          sources: sources.length,
          candidates: result.candidates.length,
        });
      } catch (error) {
        metadata.outcome = "failed";
        metadata.completed_at = this.iso();
        metadata.error = errorText(error);
        await atomicWriteJson(metaFile, metadata, { root: this.root });
        this.state.discovery.errors.push({
          date,
          at: this.iso(),
          error: errorText(error),
        });
        this.state.health.consecutive_failures++;
        await this.log("discovery_pass_failed", {
          date,
          slot,
          error: errorText(error),
        });
      }
      await this.saveState();
    })();
    this.discoveryTask = task;
    void task.finally(() => {
      if (this.discoveryTask === task) this.discoveryTask = null;
      if (this.discoveryAbort === abort) this.discoveryAbort = null;
    });
  }

  async tick() {
    await this.pollRev5BeforeReconciliation();
    await this.reconcileIntervals();
    const date = singaporeCalendarDate(this.now());
    const due = TELEGRAM_CHANNELS.some((ch) =>
      isHourlyDue(this.state.telegram.channels[ch].last_attempt_at, this.now()),
    );
    if (due) {
      await this.log("telegram_poll_started", { date });
      const result = await pollTelegram(this.state.telegram, {
        revision: this.revision,
        scheduledSlot: hourlySlot(this.now()),
        collect: this.collect,
        now: this.now,
        save: async (telegram) => {
          this.state.telegram = telegram;
          await this.saveState();
        },
      });
      this.state.telegram = result.state;
      const failures = result.results.filter((r) => r.outcome === "failed");
      this.state.health.consecutive_failures = failures.length
        ? this.state.health.consecutive_failures + 1
        : 0;
      await this.saveState();
      await this.log(
        failures.length ? "telegram_poll_failed" : "telegram_poll_complete",
        { date, results: result.results },
      );
    }
    const resultFile = path.join(
      intervalDir(this.root, date),
      "discovery-result.json",
    );
    if (this.revision >= 5) await this.recoverDay(date);
    if (this.revision >= 4) await this.startTieredDiscovery(date);
    else if (
      !this.discoveryTask &&
      !(await exists(resultFile)) &&
      (isSingaporeDailyDue(
        this.state.discovery.last_attempt_date,
        this.now(),
      ) ||
        this.state.discovery.errors.filter((item) => item.date === date)
          .length < 3)
    ) {
      await this.startDiscovery(date);
    }
    for (const prior of await listedIntervalDates(this.root)) {
      if (prior >= date) break;
      await this.finalizeIfReviewed(prior);
    }
  }

  async finalizeIfReviewed(date: string) {
    const dir = intervalDir(this.root, date),
      record = await readInterval(this.root, date);
    if (record.phase === "sealed" && (await exists(path.join(dir, "SEALED")))) {
      await verifySeal(dir);
      return false;
    }
    if (
      record.phase !== "benchmark_frozen" &&
      record.phase !== "evaluated" &&
      record.phase !== "sealed"
    )
      return false;
    await verifyObservationSeal(this.root, date);
    const reviews: Reviews = {
      validity: await readOptionalReview(
        path.join(dir, "reviews", "candidate-validity.json"),
      ),
      benchmark: await readOptionalReview(
        path.join(dir, "reviews", "telegram-offers.json"),
      ),
      matches: await readOptionalReview(
        path.join(dir, "reviews", "matches.json"),
      ),
    };
    const acquisition = await readJson<{
      candidates: Parameters<typeof evaluateInterval>[0]["candidates"];
      partial_reasons: string[];
      content_complete?: boolean;
      core_content_complete?: boolean;
      core_cadence_complete?: boolean;
      all_registry_content_complete?: boolean;
      all_registry_cadence_complete?: boolean;
    }>(path.join(dir, "acquisition.json"));
    const raw = await readJson<{
      posts: Parameters<typeof evaluateInterval>[0]["posts"];
      coverage_complete: boolean;
      content_complete?: boolean;
    }>(path.join(dir, "telegram-raw.json"));
    const acquisitionComplete = !acquisition.partial_reasons.some((reason) =>
      [
        "discovery_not_completed",
        "discovery_snapshot_incomplete",
        "discovery_crossed_interval_boundary",
        "incomplete_discovery_cadence",
      ].includes(reason),
    );
    if (
      record.protocol_revision >= 5 &&
      (!reviews.validity?.complete ||
        !reviews.benchmark?.complete ||
        !reviews.matches?.complete)
    )
      return false;
    if (
      !reviews.validity?.complete ||
      (raw.coverage_complete &&
        acquisitionComplete &&
        (!reviews.benchmark?.complete || !reviews.matches?.complete))
    )
      return false;
    const evaluation = evaluateInterval({
      date,
      protocolRevision: record.protocol_revision,
      telegramContentComplete: raw.content_complete,
      acquisitionContentComplete: acquisition.content_complete,
      coreContentComplete: acquisition.core_content_complete,
      coreCadenceComplete: acquisition.core_cadence_complete,
      allRegistryContentComplete: acquisition.all_registry_content_complete,
      allRegistryCadenceComplete: acquisition.all_registry_cadence_complete,
      supplementalReviews:
        record.protocol_revision === 6
          ? await readOptionalReview(
              path.join(dir, "reviews", "supplemental.json"),
            )
          : undefined,
      candidates: acquisition.candidates,
      posts: raw.posts,
      telegramCoverageComplete:
        raw.coverage_complete &&
        date !== "2026-09-25" &&
        (record.protocol_revision === 6 ||
          !record.partial_reasons.some(
            (r) => !r.startsWith("source_incomplete:"),
          )),
      acquisitionComplete,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews,
    });
    await sealEvaluation(this.root, date, evaluation, this.iso());
    await verifySeal(dir);
    await this.log("interval_sealed", {
      date,
      scoring_eligible: evaluation.metrics.scoring_eligible,
    });
    return true;
  }

  async run(signal: AbortSignal) {
    await this.initialize();
    while (!signal.aborted) {
      try {
        await this.tick();
      } catch (error) {
        this.state.health.consecutive_failures++;
        await this.saveState();
        await this.log("service_cycle_failed", { error: errorText(error) });
      }
      if (signal.aborted) break;
      const now = this.now();
      const next = Math.min(
        nextHourlyBoundary(now).getTime(),
        nextSingaporeDayBoundary(now).getTime(),
        now.getTime() + 60_000,
      );
      try {
        await delay(Math.max(1, next - now.getTime()), undefined, { signal });
      } catch (error) {
        if (!signal.aborted) throw error;
      }
    }
    this.discoveryAbort?.abort();
    if (this.discoveryTask) await this.discoveryTask;
    await this.saveState();
    await this.log("service_stopped");
  }
}

type AcquisitionInputLike = Parameters<typeof freezeAcquisition>[2];

export async function sealedResearchEvaluations(root: string) {
  const evaluations: Evaluation[] = [];
  for (const date of await listedIntervalDates(root)) {
    const dir = intervalDir(root, date);
    if (!(await exists(path.join(dir, "SEALED")))) continue;
    await verifySeal(dir);
    await verifyObservationSeal(root, date);
    const record = await readInterval(root, date);
    const evaluation = await readJson<Evaluation>(
      path.join(dir, "evaluation.json"),
    );
    if (
      (record.protocol_revision >= 5 ||
        (evaluation.protocol_revision ?? 3) >= 5) &&
      record.protocol_revision !== evaluation.protocol_revision
    )
      throw new Error(
        `Evaluation revision contradicts pinned interval: ${date}`,
      );
    if (
      record.protocol_revision >= 5 &&
      (evaluation.metrics.replacement_scoring_eligible !==
        !!evaluation.replacement_records ||
        evaluation.metrics.temporal_scoring_eligible !==
          evaluation.metrics.scoring_eligible ||
        (evaluation.metrics.temporal_scoring_eligible &&
          !evaluation.metrics.replacement_scoring_eligible))
    )
      throw new Error(`Inconsistent revision-5 eligibility: ${date}`);
    // Historical rehearsal evidence is never promoted by newer reporting code.
    if (
      evaluation.metrics.scoring_eligible &&
      (date === "2026-09-25" ||
        (record.protocol_revision !== 6 &&
          record.partial_reasons.some(
            (r) => !r.startsWith("source_incomplete:"),
          )))
    )
      throw new Error(
        `Scored evaluation contradicts interval eligibility: ${date}`,
      );
    if (
      evaluation.metrics.scoring_eligible !==
      (evaluation.scoring_records !== null)
    )
      throw new Error(`Inconsistent scoring records: ${date}`);
    evaluations.push(evaluation);
  }
  return evaluations;
}

export async function cumulativeResearchMetrics(root: string) {
  return cumulativeMetrics(
    researchAnalysisEvaluations(await sealedResearchEvaluations(root)),
  );
}
