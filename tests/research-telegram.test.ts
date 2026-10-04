import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  createTelegramResearchState,
  pollTelegram,
  recordRestartCoverageGaps,
  telegramIntervalCoverage,
  type PreviewCollector,
  type TelegramResearchState,
} from "../scripts/research/source-monitor/telegram";

function collector(
  ids: Record<"sgfooddeals" | "tastesoulsg", number[]>,
): PreviewCollector {
  return async (channel, cutoff, options = {}) => ({
    data: {
      source: channel,
      complete: true,
      coverageStart: cutoff.toUTC().toISO()!,
      completeThrough: (options.now ?? DateTime.utc()).toUTC().toISO()!,
      posts: ids[channel].map((messageId) => ({
        messageId,
        publishedAt:
          messageId % 2 === 0
            ? "2026-09-24T01:00:00.000Z"
            : "2026-09-24T02:30:00.000Z",
        text: `${channel} message ${messageId}`,
        candidates: [],
      })),
    },
    pages: 1,
    unavailableActivePosts: [],
    coverage: "Mock public preview",
  });
}

function savedStates() {
  const snapshots: TelegramResearchState[] = [];
  return {
    snapshots,
    save: async (state: TelegramResearchState) => {
      snapshots.push(structuredClone(state));
    },
  };
}

describe("research-only Telegram observer", () => {
  it("excludes baseline posts and preserves first-seen times through restart and duplicates", async () => {
    const persisted = savedStates();
    let times = [
      "2026-09-24T02:00:00Z",
      "2026-09-24T02:02:00Z",
      "2026-09-24T02:03:00Z",
      "2026-09-24T02:05:00Z",
    ];
    const now = () => new Date(times.shift()!);
    const baseline = await pollTelegram(createTelegramResearchState(), {
      collect: collector({ sgfooddeals: [10], tastesoulsg: [20] }),
      now,
      save: persisted.save,
    });
    expect(baseline.results.map((result) => result.outcome)).toEqual([
      "baseline",
      "baseline",
    ]);
    expect(baseline.state.channels.sgfooddeals.observations).toEqual([]);
    expect(baseline.state.channels.tastesoulsg.observations).toEqual([]);
    expect(baseline.state.channels.sgfooddeals.seen_ids).toEqual([10]);
    expect(baseline.state.channels.tastesoulsg.seen_ids).toEqual([20]);
    expect(persisted.snapshots).toHaveLength(4);

    const restarted = JSON.parse(
      JSON.stringify(persisted.snapshots.at(-1)),
    ) as TelegramResearchState;
    times = [
      "2026-09-24T03:00:00Z",
      "2026-09-24T03:04:00Z",
      "2026-09-24T03:05:00Z",
      "2026-09-24T03:06:00Z",
    ];
    const second = await pollTelegram(restarted, {
      collect: collector({ sgfooddeals: [10, 11], tastesoulsg: [20, 21] }),
      now,
      save: persisted.save,
    });
    expect(second.results.map((result) => result.observed)).toEqual([1, 1]);
    expect(second.state.channels.sgfooddeals.observations).toEqual([
      {
        channel: "sgfooddeals",
        message_id: 11,
        first_seen_at: "2026-09-24T03:04:00.000Z",
        published_at: "2026-09-24T02:30:00.000Z",
        text: "sgfooddeals message 11",
        permalink: "https://t.me/sgfooddeals/11",
      },
    ]);
    expect(
      second.state.channels.tastesoulsg.observations[0].first_seen_at,
    ).toBe("2026-09-24T03:06:00.000Z");

    times = [
      "2026-09-24T04:00:00Z",
      "2026-09-24T04:01:00Z",
      "2026-09-24T04:02:00Z",
      "2026-09-24T04:03:00Z",
    ];
    const third = await pollTelegram(second.state, {
      collect: collector({ sgfooddeals: [10, 11], tastesoulsg: [20, 21] }),
      now,
      save: persisted.save,
    });
    expect(third.results.map((result) => result.observed)).toEqual([0, 0]);
    expect(third.state.channels.sgfooddeals.observations[0].first_seen_at).toBe(
      "2026-09-24T03:04:00.000Z",
    );
    expect(third.state.channels.tastesoulsg.observations).toHaveLength(1);
  });

  it("uses preview complete-through and isolates a post published during a slow baseline poll", async () => {
    const persisted = savedStates();
    const times = [
      "2026-09-24T02:00:00Z",
      "2026-09-24T02:20:00Z",
      "2026-09-24T02:21:00Z",
      "2026-09-24T02:22:00Z",
      "2026-09-24T03:00:00Z",
      "2026-09-24T03:05:00Z",
      "2026-09-24T03:06:00Z",
      "2026-09-24T03:07:00Z",
    ];
    const cutoffs: string[] = [];
    let firstChannelCalls = 0;
    const collect: PreviewCollector = async (channel, cutoff, options) => {
      const attemptAt = options?.now?.toUTC().toISO();
      if (!attemptAt) throw new Error("Mock requires a fixed preview time");
      if (channel === "sgfooddeals") {
        cutoffs.push(cutoff.toUTC().toISO()!);
        firstChannelCalls++;
      }
      const posts = [
        {
          messageId: channel === "sgfooddeals" ? 10 : 20,
          publishedAt: "2026-09-24T01:00:00.000Z",
          text: "baseline post",
          candidates: [],
        },
      ];
      if (
        channel === "sgfooddeals" &&
        firstChannelCalls === 2 &&
        cutoff <= DateTime.fromISO("2026-09-24T02:03:00Z")
      )
        posts.push({
          messageId: 11,
          publishedAt: "2026-09-24T02:03:00.000Z",
          text: "published while the prior poll ran",
          candidates: [],
        });
      return {
        data: {
          source: channel,
          complete: true,
          coverageStart: cutoff.toUTC().toISO()!,
          completeThrough: attemptAt,
          posts,
        },
        pages: 1,
        unavailableActivePosts: [],
        coverage: "Mock public preview",
      };
    };
    const now = () => new Date(times.shift()!);
    const baseline = await pollTelegram(createTelegramResearchState(), {
      collect,
      now,
      save: persisted.save,
    });
    expect(baseline.state.channels.sgfooddeals.last_successful_poll_at).toBe(
      "2026-09-24T02:20:00.000Z",
    );
    expect(baseline.state.channels.sgfooddeals.last_complete_through_at).toBe(
      "2026-09-24T02:00:00.000Z",
    );
    const next = await pollTelegram(baseline.state, {
      collect,
      now,
      save: persisted.save,
    });
    expect(cutoffs[1]).toBe("2026-09-24T01:55:00.000Z");
    expect(next.state.channels.sgfooddeals.observations).toEqual([]);
    expect(next.state.channels.sgfooddeals.late_historical_posts).toMatchObject(
      [
        {
          message_id: 11,
          published_at: "2026-09-24T02:03:00.000Z",
          first_seen_at: "2026-09-24T03:05:00.000Z",
          reason: "published_before_baseline",
          baseline_completed_at: "2026-09-24T02:20:00.000Z",
        },
      ],
    );
    expect(next.state.channels.sgfooddeals.coverage_gaps.at(-1)?.reason).toBe(
      "late_historical_post",
    );
    const coverage = telegramIntervalCoverage(
      next.state,
      "2026-09-24T03:00:00Z",
      "2026-09-24T04:00:00Z",
    );
    expect(coverage.coverage_complete).toBe(false);
    expect(
      coverage.channel_status.sgfooddeals.late_pre_baseline_post_ids,
    ).toEqual([11]);
    expect(
      JSON.parse(JSON.stringify(persisted.snapshots.at(-1))).channels
        .sgfooddeals.late_historical_posts,
    ).toHaveLength(1);
    expect(next.state.channels.sgfooddeals.last_complete_through_at).toBe(
      "2026-09-24T03:00:00.000Z",
    );
  });

  it("records a failure in one channel while checkpointing the other", async () => {
    const persisted = savedStates();
    const times = [
      "2026-09-24T02:00:00Z",
      "2026-09-24T02:01:00Z",
      "2026-09-24T02:02:00Z",
      "2026-09-24T02:03:00Z",
    ];
    const result = await pollTelegram(createTelegramResearchState(), {
      now: () => new Date(times.shift()!),
      save: persisted.save,
      collect: async (channel, cutoff, options) => {
        if (channel === "sgfooddeals") throw new Error("preview unavailable");
        return collector({ sgfooddeals: [], tastesoulsg: [20] })(
          channel,
          cutoff,
          options,
        );
      },
    });
    expect(result.results.map((item) => item.outcome)).toEqual([
      "failed",
      "baseline",
    ]);
    expect(result.state.channels.sgfooddeals.last_successful_poll_at).toBe(
      null,
    );
    expect(result.state.channels.sgfooddeals.errors[0].error).toBe(
      "preview unavailable",
    );
    expect(result.state.channels.sgfooddeals.coverage_gaps[0].reason).toBe(
      "poll_failed",
    );
    expect(result.state.channels.tastesoulsg.baseline_completed_at).toBe(
      "2026-09-24T02:03:00.000Z",
    );
    expect(persisted.snapshots.at(-1)?.channels.tastesoulsg.seen_ids).toEqual([
      20,
    ]);
  });

  it("records downtime without inventing missed successful polls", async () => {
    const persisted = savedStates();
    const initial = await pollTelegram(createTelegramResearchState(), {
      now: () => new Date("2026-09-24T02:00:00Z"),
      save: persisted.save,
      collect: collector({ sgfooddeals: [10], tastesoulsg: [20] }),
    });
    const restarted = await recordRestartCoverageGaps(
      JSON.parse(JSON.stringify(initial.state)) as TelegramResearchState,
      new Date("2026-09-24T05:30:00Z"),
      persisted.save,
    );
    for (const channel of ["sgfooddeals", "tastesoulsg"] as const) {
      expect(restarted.channels[channel].coverage_gaps).toContainEqual({
        start_at: "2026-09-24T02:00:00.000Z",
        end_at: "2026-09-24T05:30:00.000Z",
        reason: "restart",
        missed_poll_count: 3,
      });
      expect(restarted.channels[channel].polls).toHaveLength(1);
      expect(restarted.channels[channel].missed_poll_count).toBe(3);
    }
    const resumed = await pollTelegram(restarted, {
      now: () => new Date("2026-09-24T05:31:00Z"),
      save: persisted.save,
      collect: collector({ sgfooddeals: [10, 11], tastesoulsg: [20, 21] }),
    });
    expect(resumed.state.channels.sgfooddeals.coverage_gaps[0].end_at).toBe(
      "2026-09-24T05:31:00.000Z",
    );
    expect(
      resumed.state.channels.sgfooddeals.observations[0].first_seen_at,
    ).toBe("2026-09-24T05:31:00.000Z");
    expect(resumed.state.channels.sgfooddeals.polls).toHaveLength(2);
  });

  it("marks an interrupted persisted attempt and never treats it as coverage", async () => {
    const state = createTelegramResearchState();
    state.channels.sgfooddeals.last_attempt_at = "2026-09-24T04:00:00Z";
    state.channels.sgfooddeals.polls.push({
      slot: "2026-09-24T04:00:00Z",
      attempted_at: "2026-09-24T04:00:00Z",
      completed_at: null,
      outcome: "started",
      baseline: true,
      coverage_start: null,
      complete_through: null,
      pages: null,
      observed_post_count: 0,
      new_post_ids: [],
      error: null,
    });
    const persisted = savedStates();
    const recovered = await recordRestartCoverageGaps(
      state,
      new Date("2026-09-24T04:30:00Z"),
      persisted.save,
    );
    expect(recovered.channels.sgfooddeals.polls[0].outcome).toBe("interrupted");
    expect(recovered.channels.sgfooddeals.coverage_gaps[0].reason).toBe(
      "interrupted_poll",
    );
    expect(recovered.channels.sgfooddeals.last_successful_poll_at).toBe(null);
    expect(persisted.snapshots).toHaveLength(1);
  });

  it("requires both pre-start baselines, timely polls, and no recorded failures", () => {
    const state = createTelegramResearchState();
    for (const name of ["sgfooddeals", "tastesoulsg"] as const) {
      const channel = state.channels[name];
      channel.baseline_completed_at = "2026-09-24T15:30:00Z";
      channel.polls = [
        {
          slot: "2026-09-24T15:00:00Z",
          attempted_at: "2026-09-24T15:30:00Z",
          completed_at: "2026-09-24T15:30:00Z",
          outcome: "success",
          baseline: true,
          coverage_start: null,
          complete_through: null,
          pages: 1,
          observed_post_count: 1,
          new_post_ids: [],
          error: null,
        },
        {
          slot: "2026-09-24T16:00:00Z",
          attempted_at: "2026-09-24T16:20:00Z",
          completed_at: "2026-09-24T16:20:00Z",
          outcome: "success",
          baseline: false,
          coverage_start: null,
          complete_through: null,
          pages: 1,
          observed_post_count: 1,
          new_post_ids: [],
          error: null,
        },
        {
          slot: "2026-09-24T17:00:00Z",
          attempted_at: "2026-09-24T17:10:00Z",
          completed_at: "2026-09-24T17:10:00Z",
          outcome: "success",
          baseline: false,
          coverage_start: null,
          complete_through: null,
          pages: 1,
          observed_post_count: 1,
          new_post_ids: [],
          error: null,
        },
      ];
    }
    const good = telegramIntervalCoverage(
      state,
      "2026-09-24T16:00:00Z",
      "2026-09-24T18:00:00Z",
    );
    expect(good.coverage_complete).toBe(true);
    state.channels.tastesoulsg.coverage_gaps.push({
      start_at: "2026-09-24T16:30:00Z",
      end_at: "2026-09-24T16:31:00Z",
      reason: "poll_failed",
      missed_poll_count: 0,
    });
    state.channels.sgfooddeals.late_historical_posts.push({
      channel: "sgfooddeals",
      message_id: 99,
      first_seen_at: "2026-09-24T17:10:00Z",
      published_at: "2026-09-24T14:00:00Z",
      text: "late",
      permalink: "https://t.me/sgfooddeals/99",
      reason: "published_before_baseline",
      baseline_completed_at: "2026-09-24T15:30:00Z",
    });
    const bad = telegramIntervalCoverage(
      state,
      "2026-09-24T16:00:00Z",
      "2026-09-24T18:00:00Z",
    );
    expect(bad.coverage_complete).toBe(false);
    expect(bad.channel_status.tastesoulsg.reasons).toContain("poll_failed");
    expect(bad.channel_status.sgfooddeals.late_pre_baseline_post_ids).toEqual([
      99,
    ]);
    state.channels.sgfooddeals.baseline_completed_at = "2026-09-24T16:20:00Z";
    expect(
      telegramIntervalCoverage(
        state,
        "2026-09-24T16:00:00Z",
        "2026-09-24T18:00:00Z",
      ).channel_status.sgfooddeals.reasons,
    ).toContain("baseline_not_complete_before_interval");
  });

  it("finds an uncovered hourly span even when later polls recover", () => {
    const state = createTelegramResearchState();
    for (const name of ["sgfooddeals", "tastesoulsg"] as const) {
      state.channels[name].baseline_completed_at = "2026-09-24T15:30:00Z";
      state.channels[name].polls = [
        {
          slot: "2026-09-24T15:00:00Z",
          attempted_at: "2026-09-24T15:30:00Z",
          completed_at: "2026-09-24T15:30:00Z",
          outcome: "success",
          baseline: true,
          coverage_start: null,
          complete_through: null,
          pages: 1,
          observed_post_count: 0,
          new_post_ids: [],
          error: null,
        },
        {
          slot: "2026-09-24T17:00:00Z",
          attempted_at: "2026-09-24T17:30:00Z",
          completed_at: "2026-09-24T17:30:00Z",
          outcome: "success",
          baseline: false,
          coverage_start: null,
          complete_through: null,
          pages: 1,
          observed_post_count: 0,
          new_post_ids: [],
          error: null,
        },
      ];
    }
    const coverage = telegramIntervalCoverage(
      state,
      "2026-09-24T16:00:00Z",
      "2026-09-24T18:00:00Z",
    );
    expect(coverage.coverage_complete).toBe(false);
    expect(coverage.coverage_gaps).toContainEqual({
      channel: "sgfooddeals",
      start_at: "2026-09-24T16:00:00.000Z",
      end_at: "2026-09-24T17:30:00.000Z",
      reason: "missing_hourly_observation",
    });
  });

  it("scores coverage through snapshot time rather than slow-poll finish time", () => {
    const state = createTelegramResearchState();
    for (const name of ["sgfooddeals", "tastesoulsg"] as const) {
      state.channels[name].baseline_completed_at = "2026-09-24T15:59:00Z";
      state.channels[name].polls = [
        {
          slot: "2026-09-24T15:00:00Z",
          attempted_at: "2026-09-24T15:59:00Z",
          completed_at: "2026-09-24T15:59:00Z",
          complete_through: "2026-09-24T15:59:00Z",
          outcome: "success",
          baseline: true,
          coverage_start: null,
          pages: 1,
          observed_post_count: 0,
          new_post_ids: [],
          error: null,
        },
        {
          slot: "2026-09-24T16:00:00Z",
          attempted_at: "2026-09-24T16:10:00Z",
          completed_at: "2026-09-24T16:50:00Z",
          complete_through: "2026-09-24T16:10:00Z",
          outcome: "success",
          baseline: false,
          coverage_start: null,
          pages: 1,
          observed_post_count: 0,
          new_post_ids: [],
          error: null,
        },
      ];
    }
    const coverage = telegramIntervalCoverage(
      state,
      "2026-09-24T16:00:00Z",
      "2026-09-24T17:50:00Z",
    );
    expect(coverage.coverage_complete).toBe(false);
    expect(coverage.coverage_gaps).toContainEqual({
      channel: "sgfooddeals",
      start_at: "2026-09-24T16:10:00.000Z",
      end_at: "2026-09-24T17:50:00.000Z",
      reason: "missing_hourly_observation",
    });
  });
});
