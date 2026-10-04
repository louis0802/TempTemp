import { DateTime } from "luxon";
import {
  collectPreview,
  parsePreview,
  fetchPreviewPage,
} from "../../../src/ingestion/sources/telegram-preview";
import { HOUR_MS, hourlySlot, isHourlyDue, type Clock } from "./scheduler";

export const TELEGRAM_CHANNELS = ["sgfooddeals", "tastesoulsg"] as const;
export type TelegramChannel = (typeof TELEGRAM_CHANNELS)[number];
type StrictPreviewCollector = typeof collectPreview;
export type PreviewCollector = (
  ...args: Parameters<StrictPreviewCollector>
) => Promise<ResearchPreviewResult>;

type ResearchPreviewResult = Omit<
  Awaited<ReturnType<StrictPreviewCollector>>,
  "data"
> & {
  data: Omit<
    Awaited<ReturnType<StrictPreviewCollector>>["data"],
    "complete"
  > & {
    complete: boolean;
  };
  recovery_error?: string;
};
/** Reuse the public-preview paginator; retain fetched content if its strict cutoff cannot be reached. */
export async function collectResearchPreview(
  name: Parameters<StrictPreviewCollector>[0],
  cutoff: Parameters<StrictPreviewCollector>[1],
  options: NonNullable<Parameters<StrictPreviewCollector>[2]> = {},
): Promise<ResearchPreviewResult> {
  const captured = new Map<
    number,
    ReturnType<typeof parsePreview>["posts"][number]
  >();
  const fetchPage = options.fetchPage ?? fetchPreviewPage;
  const at = options.now ?? DateTime.utc();
  let pages = 0;
  try {
    return await collectPreview(name, cutoff, {
      ...options,
      fetchPage: async (url) => {
        const html = await fetchPage(url);
        const parsed = parsePreview(html, name);
        for (const post of parsed.posts)
          if (Date.parse(post.publishedAt) <= at.toMillis())
            captured.set(post.messageId, post);
        pages++;
        return html;
      },
    });
  } catch (error) {
    if (!captured.size) throw error;
    const posts = [...captured.values()].sort(
      (a, b) => a.messageId - b.messageId,
    );
    return {
      data: {
        source: name,
        complete: false,
        coverageStart: new Date(
          Math.min(...posts.map((p) => Date.parse(p.publishedAt))),
        ).toISOString(),
        completeThrough: at.toUTC().toISO()!,
        posts,
      },
      pages,
      unavailableActivePosts: [],
      coverage: "Partial exposed preview history; checkpoint not reached.",
      recovery_error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface TelegramObservation {
  observation_mode?: "live" | "catch_up";
  recovered_at?: string | null;
  scheduled_slot?: string;
  source_id?: string;
  recovery_reason?: string | null;

  channel: TelegramChannel;
  message_id: number;
  first_seen_at: string;
  published_at: string;
  text: string;
  permalink: string;
}

export interface TelegramHistoricalAnomaly extends TelegramObservation {
  reason: "published_before_baseline";
  baseline_completed_at: string;
}

export interface TelegramPoll {
  observation_mode?: "live" | "catch_up";
  recovery_status?: "complete" | "partial" | "failed";

  slot: string;
  scheduled_slot?: string;
  lateness_ms?: number;
  attempted_at: string;
  completed_at: string | null;
  outcome: "started" | "success" | "failed" | "interrupted";
  baseline: boolean;
  coverage_start: string | null;
  complete_through: string | null;
  pages: number | null;
  observed_post_count: number;
  new_post_ids: number[];
  error: string | null;
}

export interface TelegramPollError {
  attempted_at: string;
  failed_at: string;
  error: string;
}

export type TelegramGapReason =
  | "successful_late"
  | "missing_slot"
  | "failed"
  | "restart"
  | "missed_hourly_poll"
  | "poll_failed"
  | "interrupted_poll"
  | "late_historical_post";

export interface TelegramCoverageGap {
  start_at: string;
  end_at: string;
  reason: TelegramGapReason;
  missed_poll_count: number;
}

export interface TelegramChannelState {
  baseline_completed_at: string | null;
  last_attempt_at: string | null;
  last_successful_poll_at: string | null;
  /** The preview snapshot's claimed boundary, which can precede poll completion. */
  last_complete_through_at: string | null;
  seen_ids: number[];
  observations: TelegramObservation[];
  late_historical_posts: TelegramHistoricalAnomaly[];
  polls: TelegramPoll[];
  errors: TelegramPollError[];
  coverage_gaps: TelegramCoverageGap[];
  consecutive_failures: number;
  missed_poll_count: number;
}

export interface TelegramResearchState {
  channels: Record<TelegramChannel, TelegramChannelState>;
}

export type SaveTelegramState = (state: TelegramResearchState) => Promise<void>;

export interface PollTelegramOptions {
  revision?: 3 | 4 | 5 | 6;
  scheduledSlot?: string;
  save: SaveTelegramState;
  collect?: PreviewCollector;
  now?: Clock;
  initialLookbackDays?: number;
  overlapMinutes?: number;
  maxPages?: number;
}

export interface TelegramChannelResult {
  channel: TelegramChannel;
  outcome: "skipped" | "baseline" | "success" | "failed";
  observed: number;
  error?: string;
}

export interface TelegramIntervalGap {
  channel: TelegramChannel;
  start_at: string;
  end_at: string;
  reason: TelegramGapReason | "missing_hourly_observation";
}

export interface TelegramIntervalChannelStatus {
  coverage_complete: boolean;
  baseline_precedes_start: boolean;
  successful_poll_count: number;
  late_pre_baseline_post_ids: number[];
  reasons: string[];
  slots?: TelegramSlotObservation[];
}

export interface TelegramIntervalCoverage {
  coverage_complete: boolean;
  coverage_gaps: TelegramIntervalGap[];
  channel_status: Record<TelegramChannel, TelegramIntervalChannelStatus>;
}

function emptyChannel(): TelegramChannelState {
  return {
    baseline_completed_at: null,
    last_attempt_at: null,
    last_successful_poll_at: null,
    last_complete_through_at: null,
    seen_ids: [],
    observations: [],
    late_historical_posts: [],
    polls: [],
    errors: [],
    coverage_gaps: [],
    consecutive_failures: 0,
    missed_poll_count: 0,
  };
}

export function createTelegramResearchState(): TelegramResearchState {
  return {
    channels: {
      sgfooddeals: emptyChannel(),
      tastesoulsg: emptyChannel(),
    },
  };
}

function checkedNow(now: Clock): Date {
  const value = now();
  if (!Number.isFinite(value.getTime()))
    throw new Error("Invalid observer clock");
  return value;
}

function updateMissedGap(
  channel: TelegramChannelState,
  startAt: string,
  endAt: string,
  reason: "restart" | "missed_hourly_poll",
): boolean {
  const duration = Date.parse(endAt) - Date.parse(startAt);
  if (duration <= HOUR_MS) return false;
  const missed = Math.floor(duration / HOUR_MS);
  const existing = channel.coverage_gaps.find(
    (gap) =>
      gap.start_at === startAt &&
      (gap.reason === "restart" || gap.reason === "missed_hourly_poll"),
  );
  if (existing) {
    if (Date.parse(existing.end_at) >= Date.parse(endAt)) return false;
    channel.missed_poll_count += Math.max(
      0,
      missed - existing.missed_poll_count,
    );
    existing.end_at = endAt;
    existing.missed_poll_count = missed;
    return true;
  }
  channel.coverage_gaps.push({
    start_at: startAt,
    end_at: endAt,
    reason,
    missed_poll_count: missed,
  });
  channel.missed_poll_count += missed;
  return true;
}

/** Persist a service outage before any new network observation is attempted. */
export async function recordRestartCoverageGaps(
  state: TelegramResearchState,
  restartedAt: Date,
  save: SaveTelegramState,
  revision: 3 | 4 | 5 | 6 = 3,
): Promise<TelegramResearchState> {
  if (!Number.isFinite(restartedAt.getTime()))
    throw new Error("Invalid restart time");
  const next = structuredClone(state);
  for (const name of TELEGRAM_CHANNELS) {
    const channel = next.channels[name];
    const interruptedPolls = channel.polls.filter(
      (poll) => poll.outcome === "started",
    );
    for (const interrupted of interruptedPolls) {
      interrupted.outcome = "interrupted";
      interrupted.completed_at = restartedAt.toISOString();
      interrupted.error = "Service stopped before this poll completed";
      channel.coverage_gaps.push({
        start_at: interrupted.attempted_at,
        end_at: restartedAt.toISOString(),
        reason: "interrupted_poll",
        missed_poll_count: 0,
      });
    }
    const priorThrough =
      channel.last_complete_through_at ??
      channel.polls.findLast(
        (poll) => poll.outcome === "success" && poll.complete_through,
      )?.complete_through ??
      channel.last_successful_poll_at;
    const changed =
      revision >= 4
        ? recordMissingSlots(channel, restartedAt)
        : priorThrough
          ? updateMissedGap(
              channel,
              priorThrough,
              restartedAt.toISOString(),
              "restart",
            )
          : false;
    if (interruptedPolls.length || changed) await save(next);
  }
  return next;
}

/**
 * Observe the two allowlisted previews without touching production ingestion.
 * Each channel attempt and result is saved before the next channel begins.
 */
export async function pollTelegram(
  state: TelegramResearchState,
  options: PollTelegramOptions,
): Promise<{ state: TelegramResearchState; results: TelegramChannelResult[] }> {
  const collect =
    options.collect ??
    ((options.revision ?? 3) >= 5 ? collectResearchPreview : collectPreview);
  const now = options.now ?? (() => new Date());
  const lookback = options.initialLookbackDays ?? 30;
  const overlap = options.overlapMinutes ?? 5;
  if (!Number.isInteger(lookback) || lookback < 1 || lookback > 365)
    throw new Error("initialLookbackDays must be 1–365");
  if (!Number.isInteger(overlap) || overlap < 0 || overlap > 60)
    throw new Error("overlapMinutes must be 0–60");
  const next = structuredClone(state);
  const results: TelegramChannelResult[] = [];
  for (const name of TELEGRAM_CHANNELS) {
    const attemptedAt = checkedNow(now);
    const current = next.channels[name];
    if (!isHourlyDue(current.last_attempt_at, attemptedAt)) {
      results.push({ channel: name, outcome: "skipped", observed: 0 });
      continue;
    }
    const attemptedIso = attemptedAt.toISOString();
    const priorSuccess = current.last_successful_poll_at;
    const priorThrough =
      current.last_complete_through_at ??
      current.polls.findLast(
        (poll) => poll.outcome === "success" && poll.complete_through,
      )?.complete_through ??
      priorSuccess;
    const baseline = current.baseline_completed_at === null;
    let catchUp =
      (options.revision ?? 3) >= 5 &&
      (!priorThrough ||
        attemptedAt.getTime() - Date.parse(priorThrough) >
          HOUR_MS + TELEGRAM_LATE_TOLERANCE_MS ||
        attemptedAt.getTime() - Date.parse(hourlySlot(attemptedAt)) >
          TELEGRAM_LATE_TOLERANCE_MS);
    const slot = options.scheduledSlot ?? hourlySlot(attemptedAt);
    if ((options.revision ?? 3) >= 4) recordMissingSlots(current, attemptedAt);
    current.last_attempt_at = attemptedIso;
    current.polls.push({
      ...((options.revision ?? 3) >= 5
        ? {
            observation_mode: catchUp
              ? ("catch_up" as const)
              : ("live" as const),
          }
        : {}),
      slot,
      ...((options.revision ?? 3) >= 4
        ? {
            scheduled_slot: slot,
            lateness_ms: attemptedAt.getTime() - Date.parse(slot),
          }
        : {}),
      attempted_at: attemptedIso,
      completed_at: null,
      outcome: "started",
      baseline,
      coverage_start: null,
      complete_through: null,
      pages: null,
      observed_post_count: 0,
      new_post_ids: [],
      error: null,
    });
    await options.save(next);
    const cutoff = priorThrough
      ? DateTime.fromISO(priorThrough).minus({ minutes: overlap })
      : DateTime.fromJSDate(attemptedAt).minus({ days: lookback });
    let preview: ResearchPreviewResult;
    let completedAt: string;
    try {
      preview = await collect(name, cutoff, {
        now: DateTime.fromJSDate(attemptedAt),
        maxPages: options.maxPages,
      });
      if (
        preview.data.source !== name ||
        ((options.revision ?? 3) < 5 && !preview.data.complete)
      )
        throw new Error("Preview result source or coverage is invalid");
      const completeThroughMs = Date.parse(preview.data.completeThrough);
      if (
        !Number.isFinite(completeThroughMs) ||
        completeThroughMs > attemptedAt.getTime() ||
        completeThroughMs < cutoff.toMillis() ||
        !Number.isFinite(Date.parse(preview.data.coverageStart)) ||
        (preview.data.complete &&
          Date.parse(preview.data.coverageStart) > cutoff.toMillis()) ||
        (priorThrough && completeThroughMs < Date.parse(priorThrough))
      )
        throw new Error("Preview completion boundary is invalid");
      completedAt = checkedNow(now).toISOString();
      if (Date.parse(completedAt) < attemptedAt.getTime())
        throw new Error("Observer clock moved backwards during poll");
    } catch (error) {
      const failedAt = checkedNow(now).toISOString();
      const message =
        error instanceof Error ? error.message : "Unknown preview failure";
      current.consecutive_failures++;
      current.errors.push({
        attempted_at: attemptedIso,
        failed_at: failedAt,
        error: message,
      });
      current.coverage_gaps.push({
        start_at: priorThrough ?? attemptedIso,
        end_at: failedAt,
        reason: "poll_failed",
        missed_poll_count: 0,
      });
      if ((options.revision ?? 3) < 4)
        updateMissedGap(
          current,
          priorThrough ?? failedAt,
          failedAt,
          "missed_hourly_poll",
        );
      const poll = current.polls.at(-1)!;
      poll.completed_at = failedAt;
      poll.outcome = "failed";
      poll.error = message;
      if ((options.revision ?? 3) >= 5) poll.recovery_status = "failed";
      await options.save(next);
      results.push({
        channel: name,
        outcome: "failed",
        observed: 0,
        error: message,
      });
      continue;
    }
    if (!preview.data.complete) {
      catchUp = true;
      current.polls.at(-1)!.observation_mode = "catch_up";
    }
    const seen = new Set(current.seen_ids);
    const added: number[] = [];
    const newIds: number[] = [];
    const historicalIds: number[] = [];
    for (const post of preview.data.posts) {
      if (seen.has(post.messageId)) continue;
      seen.add(post.messageId);
      newIds.push(post.messageId);
      if (!baseline || (options.revision ?? 3) >= 5) {
        const observation: TelegramObservation = {
          ...((options.revision ?? 3) >= 5
            ? {
                observation_mode: catchUp
                  ? ("catch_up" as const)
                  : ("live" as const),
                recovered_at: catchUp ? completedAt : null,
                scheduled_slot: slot,
                source_id: name,
                recovery_reason: !preview.data.complete
                  ? "history_traversal_incomplete"
                  : catchUp
                    ? "checkpoint_gap_or_late_receipt"
                    : null,
              }
            : {}),
          channel: name,
          message_id: post.messageId,
          first_seen_at: completedAt,
          published_at: post.publishedAt,
          text: post.text,
          permalink: `https://t.me/${name}/${post.messageId}`,
        };
        if (
          (options.revision ?? 3) < 5 &&
          Date.parse(post.publishedAt) <
            Date.parse(current.baseline_completed_at!)
        ) {
          current.late_historical_posts.push({
            ...observation,
            reason: "published_before_baseline",
            baseline_completed_at: current.baseline_completed_at!,
          });
          historicalIds.push(post.messageId);
        } else {
          current.observations.push(observation);
          added.push(post.messageId);
        }
      }
    }
    if (historicalIds.length) {
      current.coverage_gaps.push({
        start_at: attemptedIso,
        end_at: completedAt,
        reason: "late_historical_post",
        missed_poll_count: 0,
      });
    }
    current.seen_ids = [...seen].sort((a, b) => a - b);
    if (preview.data.complete) {
      if (baseline) current.baseline_completed_at = completedAt;
      current.last_successful_poll_at = completedAt;
      current.last_complete_through_at = preview.data.completeThrough;
      current.consecutive_failures = 0;
    } else {
      current.consecutive_failures++;
      current.errors.push({
        attempted_at: attemptedIso,
        failed_at: completedAt,
        error: preview.recovery_error ?? "Partial preview traversal",
      });
      current.coverage_gaps.push({
        start_at: priorThrough ?? attemptedIso,
        end_at: completedAt,
        reason: "poll_failed",
        missed_poll_count: 0,
      });
    }
    if ((options.revision ?? 3) < 4)
      updateMissedGap(
        current,
        priorThrough ?? preview.data.completeThrough,
        preview.data.completeThrough,
        "missed_hourly_poll",
      );
    const poll = current.polls.at(-1)!;
    poll.completed_at = completedAt;
    poll.outcome = preview.data.complete ? "success" : "failed";
    poll.error = preview.recovery_error ?? null;
    poll.coverage_start = preview.data.coverageStart;
    poll.complete_through = preview.data.completeThrough;
    poll.pages = preview.pages;
    if ((options.revision ?? 3) >= 5)
      poll.recovery_status = preview.data.complete ? "complete" : "partial";
    poll.observed_post_count = preview.data.posts.length;
    poll.new_post_ids = newIds;
    await options.save(next);
    results.push({
      channel: name,
      outcome: !preview.data.complete
        ? "failed"
        : baseline
          ? "baseline"
          : "success",
      observed: added.length,
    });
  }
  return { state: next, results };
}

/** Evaluate a completed Singapore interval from persisted observation evidence. */
export function telegramIntervalCoverage(
  state: TelegramResearchState,
  startAt: Date | string,
  endAt: Date | string,
  revision: 3 | 4 | 5 | 6 = 3,
): TelegramIntervalCoverage {
  if (revision >= 4) return scheduledTelegramCoverage(state, startAt, endAt);
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  )
    throw new Error("Invalid Telegram coverage interval");
  const startMs = start.getTime();
  const endMs = end.getTime();
  const coverageGaps: TelegramIntervalGap[] = [];
  const statuses = {} as Record<TelegramChannel, TelegramIntervalChannelStatus>;
  for (const name of TELEGRAM_CHANNELS) {
    const channel = state.channels[name];
    const baseline = channel.baseline_completed_at;
    const baselinePrecedesStart =
      baseline !== null && Date.parse(baseline) <= startMs;
    const reasons: string[] = [];
    if (!baselinePrecedesStart)
      reasons.push("baseline_not_complete_before_interval");
    const successful = channel.polls
      .filter(
        (poll) => poll.outcome === "success" && poll.completed_at !== null,
      )
      .map((poll) => ({
        completed: Date.parse(poll.completed_at!),
        through: Date.parse(poll.complete_through ?? poll.attempted_at),
      }))
      .filter(
        (poll) =>
          Number.isFinite(poll.completed) &&
          Number.isFinite(poll.through) &&
          poll.completed <= endMs,
      )
      .sort((a, b) => a.through - b.through);
    const beforeStart = successful
      .filter((poll) => poll.completed <= startMs)
      .at(-1);
    const afterStart = successful.filter((poll) => poll.completed > startMs);
    if (beforeStart === undefined) {
      reasons.push("no_successful_poll_at_interval_start");
      coverageGaps.push({
        channel: name,
        start_at: start.toISOString(),
        end_at: new Date(
          Math.min(endMs, Math.max(startMs, afterStart[0]?.through ?? endMs)),
        ).toISOString(),
        reason: "missing_hourly_observation",
      });
    }
    let last = (beforeStart ?? afterStart.shift())?.through;
    if (last !== undefined) {
      for (const { through: time } of afterStart) {
        if (time - last > HOUR_MS) {
          reasons.push("hourly_poll_gap");
          coverageGaps.push({
            channel: name,
            start_at: new Date(Math.max(last, startMs)).toISOString(),
            end_at: new Date(time).toISOString(),
            reason: "missing_hourly_observation",
          });
        }
        last = time;
      }
      if (endMs - last > HOUR_MS) {
        reasons.push("hourly_poll_gap");
        coverageGaps.push({
          channel: name,
          start_at: new Date(Math.max(last, startMs)).toISOString(),
          end_at: end.toISOString(),
          reason: "missing_hourly_observation",
        });
      }
    }
    for (const gap of channel.coverage_gaps) {
      const gapStart = Date.parse(gap.start_at);
      const gapEnd = Date.parse(gap.end_at);
      if (gapStart < endMs && gapEnd > startMs) {
        reasons.push(gap.reason);
        coverageGaps.push({ channel: name, ...gap });
      }
    }
    const failedPoll = channel.polls.some(
      (poll) =>
        (poll.outcome === "failed" || poll.outcome === "interrupted") &&
        Date.parse(poll.attempted_at) >= startMs &&
        Date.parse(poll.attempted_at) < endMs,
    );
    if (failedPoll) reasons.push("failed_required_poll");
    const late = channel.late_historical_posts
      .filter(
        (post) =>
          baseline !== null &&
          Date.parse(post.published_at) < Date.parse(baseline) &&
          Date.parse(post.first_seen_at) > Date.parse(baseline) &&
          Date.parse(post.first_seen_at) >= startMs &&
          Date.parse(post.first_seen_at) < endMs,
      )
      .map((post) => post.message_id);
    if (late.length) reasons.push("pre_baseline_post_first_seen_later");
    const uniqueReasons = [...new Set(reasons)];
    statuses[name] = {
      coverage_complete: uniqueReasons.length === 0,
      baseline_precedes_start: baselinePrecedesStart,
      successful_poll_count: successful.filter(
        (poll) => poll.completed >= startMs,
      ).length,
      late_pre_baseline_post_ids: late,
      reasons: uniqueReasons,
    };
  }
  return {
    coverage_complete: TELEGRAM_CHANNELS.every(
      (name) => statuses[name].coverage_complete,
    ),
    coverage_gaps: coverageGaps,
    channel_status: statuses,
  };
}

export const TELEGRAM_LATE_TOLERANCE_MS = 5 * 60_000;
export type TelegramSlotObservation = {
  scheduled_slot: string;
  attempted_at: string | null;
  completed_at: string | null;
  outcome: "successful_on_time" | "successful_late" | "failed" | "missing_slot";
  lateness_ms: number | null;
};

/** Only elapsed scheduled slots, never elapsed time between successive successes. */
function recordMissingSlots(channel: TelegramChannelState, at: Date): boolean {
  if (!channel.last_attempt_at) return false;
  let changed = false;
  for (
    let ms = Date.parse(hourlySlot(channel.last_attempt_at)) + HOUR_MS;
    ms < Date.parse(hourlySlot(at));
    ms += HOUR_MS
  ) {
    const slot = new Date(ms).toISOString();
    if (
      channel.polls.some(
        (p) => Date.parse(p.scheduled_slot ?? p.slot) === ms,
      ) ||
      channel.coverage_gaps.some(
        (g) => g.reason === "missing_slot" && g.start_at === slot,
      )
    )
      continue;
    channel.coverage_gaps.push({
      start_at: slot,
      end_at: new Date(ms + HOUR_MS).toISOString(),
      reason: "missing_slot",
      missed_poll_count: 1,
    });
    channel.missed_poll_count++;
    changed = true;
  }
  return changed;
}

/** Revision 4: raw outcomes and exact timestamps remain distinct from timing coverage. */
export function scheduledTelegramCoverage(
  state: TelegramResearchState,
  startAt: Date | string,
  endAt: Date | string,
): TelegramIntervalCoverage {
  const start = new Date(startAt).getTime(),
    end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid Telegram coverage interval");
  const statuses = {} as TelegramIntervalCoverage["channel_status"];
  const gaps: TelegramIntervalGap[] = [];
  for (const name of TELEGRAM_CHANNELS) {
    const channel = state.channels[name];
    const slots: TelegramSlotObservation[] = [];
    const reasons: string[] = [];
    const baseline =
      channel.baseline_completed_at !== null &&
      Date.parse(channel.baseline_completed_at) <= start;
    if (!baseline) reasons.push("baseline_not_complete_before_interval");
    for (
      let ms = Math.ceil(start / HOUR_MS) * HOUR_MS;
      ms < end;
      ms += HOUR_MS
    ) {
      const polls = channel.polls.filter(
        (p) => Date.parse(p.scheduled_slot ?? p.slot) === ms,
      );
      // A failure cannot be erased by a duplicate/retried success in the same slot.
      const poll = polls.find((p) => p.outcome !== "success") ?? polls[0];
      const attempt = poll ? Date.parse(poll.attempted_at) : NaN;
      const completion = poll?.completed_at
        ? Date.parse(poll.completed_at)
        : NaN;
      const through = poll?.complete_through
        ? Date.parse(poll.complete_through)
        : NaN;
      const onTime =
        attempt >= ms &&
        attempt <= ms + TELEGRAM_LATE_TOLERANCE_MS &&
        completion >= attempt &&
        completion <= ms + TELEGRAM_LATE_TOLERANCE_MS &&
        through >= ms &&
        through <= attempt &&
        !!poll?.coverage_start &&
        Date.parse(poll.coverage_start) <= ms;
      const outcome = !poll
        ? "missing_slot"
        : poll.outcome !== "success"
          ? "failed"
          : onTime
            ? "successful_on_time"
            : "successful_late";
      const slot = new Date(ms).toISOString();
      slots.push({
        scheduled_slot: slot,
        attempted_at: poll?.attempted_at ?? null,
        completed_at: poll?.completed_at ?? null,
        outcome,
        lateness_ms: poll ? attempt - ms : null,
      });
      if (outcome !== "successful_on_time") {
        reasons.push(outcome);
        gaps.push({
          channel: name,
          start_at: slot,
          end_at: new Date(Math.min(ms + HOUR_MS, end)).toISOString(),
          reason: outcome,
        });
      }
    }
    const late = channel.late_historical_posts
      .filter(
        (p) =>
          Date.parse(p.first_seen_at) >= start &&
          Date.parse(p.first_seen_at) < end,
      )
      .map((p) => p.message_id);
    if (late.length) reasons.push("pre_baseline_post_first_seen_later");
    statuses[name] = {
      coverage_complete: reasons.length === 0,
      baseline_precedes_start: baseline,
      successful_poll_count: slots.filter((s) =>
        s.outcome.startsWith("successful_"),
      ).length,
      late_pre_baseline_post_ids: late,
      reasons: [...new Set(reasons)],
      slots,
    };
  }
  return {
    coverage_complete: TELEGRAM_CHANNELS.every(
      (ch) => statuses[ch].coverage_complete,
    ),
    coverage_gaps: gaps,
    channel_status: statuses,
  };
}

/** Content traversal is independent of observation cadence; only exposed preview history is claimed. */
export function telegramContentCoverage(
  state: TelegramResearchState,
  start: string,
  end: string,
) {
  return TELEGRAM_CHANNELS.every((name) => {
    let through = Date.parse(start);
    for (const poll of state.channels[name].polls
      .filter(
        (p) =>
          p.outcome === "success" && p.coverage_start && p.complete_through,
      )
      .sort(
        (a, b) => Date.parse(a.coverage_start!) - Date.parse(b.coverage_start!),
      )) {
      if (Date.parse(poll.coverage_start!) <= through)
        through = Math.max(through, Date.parse(poll.complete_through!));
    }
    return through >= Date.parse(end);
  });
}
