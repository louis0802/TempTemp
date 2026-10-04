import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { DateTime } from "luxon";
import {
  intervalDir,
  readInterval,
  verifyObservationSeal,
} from "../scripts/research/source-monitor/intervals";
import {
  preflightResearchService,
  previousDiscoveryEvidence,
  ResearchSourceMonitorService,
  statusResearchService,
} from "../scripts/research/source-monitor/service";
import type { PreviewCollector } from "../scripts/research/source-monitor/telegram";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const root = async () => {
  const value = await mkdtemp(path.join(os.tmpdir(), "research-service-"));
  roots.push(value);
  return path.join(value, "data");
};
const mockCollector: PreviewCollector = async (
  channel,
  cutoff,
  options = {},
) => {
  const at = options.now ?? DateTime.fromISO("2026-09-24T15:50:00Z");
  const posts = [
    {
      messageId: 1,
      publishedAt: "2026-09-24T12:00:00Z",
      text: "Old baseline post",
      candidates: [],
    },
  ];
  if (
    channel === "sgfooddeals" &&
    at.toMillis() >= Date.parse("2026-09-24T16:05:00Z")
  )
    posts.push({
      messageId: 2,
      publishedAt: "2026-09-24T16:02:00Z",
      text: "Observed offer",
      candidates: [],
    });
  return {
    data: {
      source: channel,
      complete: true,
      coverageStart: cutoff.toUTC().toISO()!,
      completeThrough: at.toUTC().toISO()!,
      posts,
    },
    pages: 1,
    unavailableActivePosts: [],
    coverage: "Fixture public preview",
  };
};
const emptyDiscovery = {
  schema_version: 1,
  observed_at: "2026-09-24T15:55:00Z",
  source_snapshots: [],
  candidates: [],
  totals: {
    sources: 0,
    cards_seen: 0,
    cards_evaluated: 0,
    candidate_proposals: 0,
    distinct_candidates: 0,
    detail_attempts: 0,
    detail_failures: 0,
    source_failures: 0,
    truncated_sources: 0,
    incomplete_sources: 0,
  },
};
const suppressDiscovery = async (dataRoot: string, date: string) =>
  writeFile(
    path.join(intervalDir(dataRoot, date), "discovery-result.json"),
    JSON.stringify(emptyDiscovery),
  );

describe("persistent research service", () => {
  it("runs fixture preflight without changing observation state", async () => {
    const dataRoot = await root();
    const result = await preflightResearchService({
      root: dataRoot,
      now: () => new Date("2026-09-24T15:50:00Z"),
      collect: mockCollector,
    });
    expect(result).toMatchObject({
      ok: true,
      registered_sources: 19,
      state_schema_valid: true,
      observation_state_modified: false,
    });
    await expect(
      readFile(path.join(dataRoot, "state.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a truncated persisted state during preflight without resetting it", async () => {
    const dataRoot = await root();
    await mkdir(dataRoot);
    const malformed = JSON.stringify({
      schema_version: 1,
      service_started_at: "2026-09-24T15:50:00Z",
      service_instance_id: "old",
      active_interval: null,
      last_completed_interval: null,
      telegram: { channels: { sgfooddeals: { seen_ids: [] } } },
      discovery: {},
      health: {},
    });
    await writeFile(path.join(dataRoot, "state.json"), malformed);
    await expect(
      preflightResearchService({
        root: dataRoot,
        now: () => new Date("2026-09-24T15:50:00Z"),
        collect: mockCollector,
      }),
    ).rejects.toThrow("Invalid research JSON schema");
    expect(await readFile(path.join(dataRoot, "state.json"), "utf8")).toBe(
      malformed,
    );
  });

  it("preserves first-seen timestamps, resumes the interval and seals a gap after restart", async () => {
    const dataRoot = await root();
    let instant = new Date("2026-09-24T15:50:00Z");
    const options = {
      protocolRevision: 3 as const,
      root: dataRoot,
      now: () => instant,
      collect: mockCollector,
    };
    const first = new ResearchSourceMonitorService(options);
    await first.initialize();
    await suppressDiscovery(dataRoot, "2026-09-24");
    await first.tick();
    expect(
      first.currentState.telegram.channels.sgfooddeals.observations,
    ).toHaveLength(0);
    const firstRunId = (await readInterval(dataRoot, "2026-09-24")).run_id;

    instant = new Date("2026-09-24T16:05:00Z");
    const second = new ResearchSourceMonitorService(options);
    await second.initialize();
    await suppressDiscovery(dataRoot, "2026-09-25");
    await second.tick();
    expect((await readInterval(dataRoot, "2026-09-24")).run_id).toBe(
      firstRunId,
    );
    const observed =
      second.currentState.telegram.channels.sgfooddeals.observations;
    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      message_id: 2,
      first_seen_at: "2026-09-24T16:05:00.000Z",
      published_at: "2026-09-24T16:02:00Z",
    });

    instant = new Date("2026-09-24T19:30:00Z");
    const third = new ResearchSourceMonitorService(options);
    await third.initialize();
    expect(
      third.currentState.telegram.channels.sgfooddeals.observations[0]
        .first_seen_at,
    ).toBe("2026-09-24T16:05:00.000Z");
    expect(
      third.currentState.telegram.channels.sgfooddeals.coverage_gaps,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          start_at: "2026-09-24T16:05:00.000Z",
          end_at: "2026-09-24T19:30:00.000Z",
          reason: "restart",
        }),
      ]),
    );
    await third.tick();
    expect(
      third.currentState.telegram.channels.sgfooddeals.observations,
    ).toHaveLength(1);
    expect(
      (await statusResearchService(dataRoot)).missed_poll_count,
    ).toBeGreaterThan(0);

    instant = new Date("2026-09-25T16:01:00Z");
    const fourth = new ResearchSourceMonitorService(options);
    await fourth.initialize();
    expect(await verifyObservationSeal(dataRoot, "2026-09-25")).toBe(true);
    const raw = JSON.parse(
      await readFile(
        path.join(intervalDir(dataRoot, "2026-09-25"), "telegram-raw.json"),
        "utf8",
      ),
    );
    expect(raw.coverage_complete).toBe(false);
    expect(
      raw.posts.filter((post: { message_id: number }) => post.message_id === 2),
    ).toHaveLength(1);
    expect(raw.coverage_gaps.length).toBeGreaterThan(0);
    expect(fourth.currentState.last_completed_interval).toBe("2026-09-25");
  });

  it("recovers missed days when a crash lands between close and next open", async () => {
    const dataRoot = await root();
    let instant = new Date("2026-09-24T15:50:00Z");
    const options = {
      protocolRevision: 3 as const,
      root: dataRoot,
      now: () => instant,
      collect: mockCollector,
    };
    const first = new ResearchSourceMonitorService(options);
    await first.initialize();
    await suppressDiscovery(dataRoot, "2026-09-24");
    instant = new Date("2026-09-24T16:05:00Z");
    const second = new ResearchSourceMonitorService(options);
    await second.initialize();
    const stateFile = path.join(dataRoot, "state.json");
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    state.active_interval = null;
    await writeFile(stateFile, JSON.stringify(state));
    instant = new Date("2026-09-26T16:01:00Z");
    const resumed = new ResearchSourceMonitorService(options);
    await resumed.initialize();
    expect(resumed.currentState.active_interval).toBe("2026-09-27");
    expect(resumed.currentState.last_completed_interval).toBe("2026-09-26");
    expect(
      (await readInterval(dataRoot, "2026-09-26")).partial_reasons,
    ).toContain("service_offline_for_day");
    expect(await verifyObservationSeal(dataRoot, "2026-09-26")).toBe(true);
  });

  it("keeps the earliest candidate observation across a day absent from listings", async () => {
    const dataRoot = await root();
    const candidate = {
      candidate_id: "offer-reappeared",
      first_seen_at: "2026-09-24T01:00:00Z",
    };
    for (const [date, firstSeen] of [
      ["2026-09-24", candidate.first_seen_at],
      ["2026-09-26", "2026-09-26T01:00:00Z"],
    ]) {
      const dir = intervalDir(dataRoot, date);
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "discovery-result.json"),
        JSON.stringify({
          ...emptyDiscovery,
          candidates: [{ ...candidate, first_seen_at: firstSeen }],
        }),
      );
    }
    const previous = await previousDiscoveryEvidence(dataRoot, "2026-09-27");
    expect(previous?.candidates).toEqual([
      expect.objectContaining({
        candidate_id: candidate.candidate_id,
        first_seen_at: candidate.first_seen_at,
      }),
    ]);
  });

  it("polls once per wall-clock hour in the running service path", async () => {
    const dataRoot = await root();
    let instant = new Date("2026-09-24T10:02:00Z"),
      calls = 0;
    const collect: PreviewCollector = async (...args) => {
      calls++;
      return mockCollector(...args);
    };
    const service = new ResearchSourceMonitorService({
      protocolRevision: 3,
      root: dataRoot,
      now: () => instant,
      collect,
    });
    await service.initialize();
    await suppressDiscovery(dataRoot, "2026-09-24");
    await service.tick();
    await service.tick();
    expect(calls).toBe(2);
    instant = new Date("2026-09-24T11:02:00Z");
    await service.tick();
    expect(calls).toBe(4);
    expect(
      service.currentState.telegram.channels.sgfooddeals.polls,
    ).toHaveLength(2);
  });

  it("persists a clean stop after SIGTERM-style abort", async () => {
    const dataRoot = await root();
    const controller = new AbortController();
    let calls = 0;
    const collect: PreviewCollector = async (...args) => {
      calls++;
      if (calls === 1) controller.abort();
      return mockCollector(...args);
    };
    const service = new ResearchSourceMonitorService({
      protocolRevision: 3,
      root: dataRoot,
      now: () => new Date("2026-09-24T10:02:00Z"),
      collect,
      fetchPage: async () => ({
        status: 503,
        contentType: "text/html",
        body: "",
      }),
    });
    await service.run(controller.signal);
    expect(calls).toBe(2);
    const state = JSON.parse(
      await readFile(path.join(dataRoot, "state.json"), "utf8"),
    );
    expect(state.telegram.channels.sgfooddeals.polls[0].outcome).toBe(
      "success",
    );
    expect(state.telegram.channels.tastesoulsg.polls[0].outcome).toBe(
      "success",
    );
    expect(state.active_interval).toBe("2026-09-24");
  });

  it("runs one independent discovery per Singapore date in the service path", async () => {
    const dataRoot = await root();
    let requests = 0;
    const service = new ResearchSourceMonitorService({
      protocolRevision: 3,
      root: dataRoot,
      now: () => new Date("2026-09-24T10:02:00Z"),
      collect: mockCollector,
      fetchPage: async () => {
        requests++;
        return { status: 503, contentType: "text/html", body: "" };
      },
    });
    await service.initialize();
    await service.tick();
    const output = path.join(
      intervalDir(dataRoot, "2026-09-24"),
      "discovery-result.json",
    );
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        await readFile(output);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        await delay(10);
      }
    }
    const result = JSON.parse(await readFile(output, "utf8"));
    await service.waitForCurrentWork();
    expect(result.source_snapshots).toHaveLength(19);
    const firstRequests = requests;
    await service.tick();
    expect(requests).toBe(firstRequests);
    expect(service.currentState.discovery.attempts_by_date["2026-09-24"]).toBe(
      1,
    );
  });
});
