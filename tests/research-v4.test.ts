import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadPinnedResearchAssets } from "../scripts/research/source-monitor/protocol";
import {
  createTelegramResearchState,
  pollTelegram,
  recordRestartCoverageGaps,
  telegramIntervalCoverage,
  TELEGRAM_CHANNELS,
  type PreviewCollector,
} from "../scripts/research/source-monitor/telegram";
import {
  mergeCandidateObservations,
  runDiscovery,
} from "../scripts/research/source-monitor/discovery";
import {
  passDir,
  readDiscoveryPasses,
  summarizeDiscoveryPasses,
  sourceSlot,
} from "../scripts/research/source-monitor/passes";
import {
  ResearchSourceMonitorService,
  previousDiscoveryEvidence,
} from "../scripts/research/source-monitor/service";
import {
  intervalDir,
  readInterval,
  verifyObservationSeal,
} from "../scripts/research/source-monitor/intervals";

const roots: string[] = [];
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "research-v4-"));
  roots.push(dir);
  return dir;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const collect: PreviewCollector = async (channel, cutoff, options) => ({
  data: {
    source: channel,
    complete: true,
    coverageStart: cutoff.toUTC().toISO()!,
    completeThrough: options!.now!.toUTC().toISO()!,
    posts: [],
  },
  pages: 1,
  unavailableActivePosts: [],
  coverage: "fixture",
});
const save = async () => {};
async function baseline() {
  return (
    await pollTelegram(createTelegramResearchState(), {
      revision: 4,
      save,
      collect,
      now: () => new Date("2026-09-25T15:59:00Z"),
    })
  ).state;
}

describe("revision 4 Telegram scheduled slots", () => {
  it.each([4, 2000, 4 * 60_000])(
    "accepts %i ms jitter without elapsed-gap false positives",
    async (jitter) => {
      let state = await baseline();
      for (let hour = 16; hour < 19; hour++)
        state = (
          await pollTelegram(state, {
            revision: 4,
            collect,
            save,
            now: () =>
              new Date(
                Date.parse(`2026-09-25T${hour}:00:00Z`) +
                  (jitter * (hour - 15)) / 3,
              ),
          })
        ).state;
      const coverage = telegramIntervalCoverage(
        state,
        "2026-09-25T16:00:00Z",
        "2026-09-25T19:00:00Z",
        4,
      );
      expect(coverage.coverage_complete).toBe(true);
      expect(coverage.coverage_gaps).toEqual([]);
      expect(state.channels.sgfooddeals.coverage_gaps).toEqual([]);
      expect(state.channels.sgfooddeals.polls.at(-1)).toMatchObject({
        scheduled_slot: "2026-09-25T18:00:00.000Z",
        lateness_ms: jitter,
      });
    },
  );
  it("distinguishes six-minute success, missing hour and network failure", async () => {
    let state = await baseline();
    state = (
      await pollTelegram(state, {
        revision: 4,
        collect,
        save,
        now: () => new Date("2026-09-25T16:06:00Z"),
      })
    ).state;
    state = (
      await pollTelegram(state, {
        revision: 4,
        collect: async () => {
          throw new Error("network unavailable");
        },
        save,
        now: () => new Date("2026-09-25T18:00:02Z"),
      })
    ).state;
    const coverage = telegramIntervalCoverage(
      state,
      "2026-09-25T16:00:00Z",
      "2026-09-25T19:00:00Z",
      4,
    );
    expect(
      coverage.channel_status.sgfooddeals.slots?.map((s) => s.outcome),
    ).toEqual(["successful_late", "missing_slot", "failed"]);
    expect(state.channels.sgfooddeals.polls[1].outcome).toBe("success");
    expect(state.channels.sgfooddeals.errors[0].error).toBe(
      "network unavailable",
    );
    expect(coverage.coverage_complete).toBe(false);
  });
  it("requires completion within tolerance and retains exact attempt/completion", async () => {
    const times = [
      "2026-09-25T16:00:00.004Z",
      "2026-09-25T16:06:00Z",
      "2026-09-25T16:06:00Z",
      "2026-09-25T16:06:01Z",
    ];
    const state = (
      await pollTelegram(await baseline(), {
        revision: 4,
        collect,
        save,
        scheduledSlot: "2026-09-25T16:00:00.000Z",
        now: () => new Date(times.shift()!),
      })
    ).state;
    const coverage = telegramIntervalCoverage(
      state,
      "2026-09-25T16:00:00Z",
      "2026-09-25T17:00:00Z",
      4,
    );
    expect(coverage.channel_status.sgfooddeals.slots?.[0]).toEqual({
      scheduled_slot: "2026-09-25T16:00:00.000Z",
      attempted_at: "2026-09-25T16:00:00.004Z",
      completed_at: "2026-09-25T16:06:00.000Z",
      outcome: "successful_late",
      lateness_ms: 4,
    });
  });
  it("keeps offline slots missing after restart and never repeats a persisted attempt", async () => {
    let state = (
      await pollTelegram(await baseline(), {
        revision: 4,
        collect,
        save,
        now: () => new Date("2026-09-25T16:00:00.004Z"),
      })
    ).state;
    state = await recordRestartCoverageGaps(
      JSON.parse(JSON.stringify(state)),
      new Date("2026-09-25T20:00:02Z"),
      save,
      4,
    );
    expect(state.channels.sgfooddeals.missed_poll_count).toBe(3);
    state = (
      await pollTelegram(state, {
        revision: 4,
        collect,
        save,
        now: () => new Date("2026-09-25T20:00:02Z"),
      })
    ).state;
    const repeated = await pollTelegram(state, {
      revision: 4,
      collect,
      save,
      now: () => new Date("2026-09-25T20:03:00Z"),
    });
    expect(repeated.results.map((r) => r.outcome)).toEqual([
      "skipped",
      "skipped",
    ]);
    const coverage = telegramIntervalCoverage(
      repeated.state,
      "2026-09-25T16:00:00Z",
      "2026-09-25T21:00:00Z",
      4,
    );
    expect(
      coverage.channel_status.sgfooddeals.slots?.map((s) => s.outcome),
    ).toEqual([
      "successful_on_time",
      "missing_slot",
      "missing_slot",
      "missing_slot",
      "successful_on_time",
    ]);
  });
  it("does not make a normal restart a gap; interrupted attempts remain failed", async () => {
    let state = (
      await pollTelegram(await baseline(), {
        revision: 4,
        collect,
        save,
        now: () => new Date("2026-09-25T16:00:00Z"),
      })
    ).state;
    state = await recordRestartCoverageGaps(
      state,
      new Date("2026-09-25T16:02:00Z"),
      save,
      4,
    );
    expect(state.channels.sgfooddeals.coverage_gaps).toEqual([]);
    state.channels.sgfooddeals.polls.at(-1)!.outcome = "started";
    state = await recordRestartCoverageGaps(
      state,
      new Date("2026-09-25T16:03:00Z"),
      save,
      4,
    );
    expect(
      telegramIntervalCoverage(
        state,
        "2026-09-25T16:00:00Z",
        "2026-09-25T17:00:00Z",
        4,
      ).channel_status.sgfooddeals.slots?.[0].outcome,
    ).toBe("failed");
  });
});

describe("revision 4 target-blind discovery and freeze", () => {
  it("preserves revision 3 hashes and assigns only explicit fresh publisher classes", async () => {
    const old = await loadPinnedResearchAssets(3),
      next = await loadPinnedResearchAssets(4);
    expect(old.protocolSha256).toBe(
      "0ba848c3a55123d3a12e6d4d4425c1f46f7084a12d894f7552ba868c832a32db",
    );
    expect(old.registrySha256).toBe(
      "0f8de1c9e590d10f4c4709ec526f2587d478f4623230fa227a3d7de1edc6f4c9",
    );
    expect(
      next.registry.sources
        .filter((s) => s.cadence_class === "fresh_publisher")
        .map((s) => s.source_id),
    ).toEqual([
      "singpromos_ongoing",
      "confirmgood_deals",
      "eatbook_deals",
      "mustsharenews_deals",
      "everydayonsales_food",
    ]);
    expect(next.registry.sources.every((s) => !!s.cadence_class)).toBe(true);
    const renamed = {
      ...next.registry.sources[0],
      source_id: "arbitrary-new-name",
    };
    expect(
      sourceSlot(renamed, "2026-09-26", new Date("2026-09-25T20:00:00Z")),
    ).toBe("2026-09-25T19:00:00.000Z");
  });
  it("retains first seen and all unique occurrences across passes, sources and absent days", async () => {
    const dir = await root(),
      assets = await loadPinnedResearchAssets(4);
    const src = {
      ...assets.registry.sources[0],
      reasonable_per_run_cap: { max_pages: 1, max_entries: 10 },
    };
    const fetchPage = async (url: string) => ({
      status: 200,
      contentType: "text/html",
      body:
        url === src.origin_url
          ? '<article class="mh-loop-item"><a href="/offer/a">Cafe A 1-for-1 Latte</a></article>'
          : "<main>Promotion valid 23 Sep to 30 Sep 2026 at participating Singapore stores. Terms apply.</main>",
    });
    const first = await runDiscovery({
      runDir: path.join(dir, "first"),
      registry: { sources: [src] },
      now: () => "2026-09-26T00:00:00Z",
      fetchPage,
    });
    const second = await runDiscovery({
      runDir: path.join(dir, "second"),
      registry: { sources: [src] },
      now: () => "2026-09-26T03:00:00Z",
      fetchPage,
      previous: first,
    });
    expect(first.candidates).toHaveLength(1);
    expect(second.candidates[0].first_seen_at).toBe(
      first.candidates[0].first_seen_at,
    );
    expect(second.candidates[0].occurrences).toHaveLength(2);
    expect(second.candidates[0].occurrences[1]).toMatchObject({
      source_id: src.source_id,
      candidate_url: first.candidates[0].candidate_url,
      seen_at: "2026-09-26T03:00:00Z",
    });
    const cross = structuredClone(second.candidates[0]);
    cross.occurrences = [
      { ...cross.occurrences[1], source_id: "other-source" },
    ];
    const merged = mergeCandidateObservations([
      ...first.candidates,
      ...second.candidates,
      cross,
      ...second.candidates,
    ]);
    expect(merged[0].occurrences).toHaveLength(3);
    expect(merged[0].seen_at).toBe("2026-09-26T03:00:00Z");
    for (const [date, result] of [
      ["2026-09-26", first],
      ["2026-09-27", { ...first, candidates: [] }],
      ["2026-09-28", second],
    ] as const) {
      await mkdir(intervalDir(dir, date), { recursive: true });
      await writeFile(
        path.join(intervalDir(dir, date), "discovery-result.json"),
        JSON.stringify(result),
      );
    }
    expect(
      (await previousDiscoveryEvidence(dir, "2026-09-29"))?.candidates[0]
        .occurrences,
    ).toHaveLength(2);
  });
  it("runs daily sources once, publishers eight times, survives restart and freezes one complete day", async () => {
    const dir = await root();
    let at = new Date("2026-09-25T15:59:00Z");
    let requests = 0;
    const options = {
      protocolRevision: 4 as const,
      root: dir,
      now: () => at,
      collect,
      fetchPage: async (url: string) => {
        requests++;
        return {
          status: 200,
          contentType: "text/html",
          body:
            url === "https://singpromos.com/bydate/ontoday/"
              ? '<article class="mh-loop-item"><a href="/offer/a">Cafe A 1-for-1 Latte</a></article>'
              : url === "https://singpromos.com/offer/a"
                ? "<main>Promotion valid 23 Sep to 30 Sep 2026 at participating Singapore stores. Terms apply.</main>"
                : "<main>No cards in this fixture</main>",
        };
      },
    };
    let service = new ResearchSourceMonitorService(options);
    await service.initialize();
    await service.tick();
    await service.waitForCurrentWork();
    const date = "2026-09-26";
    for (let hour = 0; hour < 24; hour++) {
      at = new Date(
        Date.parse("2026-09-25T16:00:00Z") + hour * 3_600_000 + 2000,
      );
      await service.tick();
      await service.waitForCurrentWork();
      if (hour === 5) {
        const before = requests;
        service = new ResearchSourceMonitorService(options);
        await service.initialize();
        await service.tick();
        await service.waitForCurrentWork();
        expect(requests).toBe(before);
      }
    }
    const passes = await readDiscoveryPasses(intervalDir(dir, date));
    expect(passes).toHaveLength(8);
    expect(passes.map((p) => p.pass.source_ids.length)).toEqual([
      19, 5, 5, 5, 5, 5, 5, 5,
    ]);
    expect((await readInterval(dir, date)).partial_reasons).toEqual([]);
    const summary = await summarizeDiscoveryPasses(
      intervalDir(dir, date),
      date,
      (await loadPinnedResearchAssets(4)).registry,
    );
    expect(summary.cadence_gaps).toEqual([]);
    expect(summary.source_snapshots).toHaveLength(54);
    at = new Date("2026-09-26T16:00:02Z");
    await service.tick();
    await service.waitForCurrentWork();
    expect(await verifyObservationSeal(dir, date)).toBe(true);
    const raw = JSON.parse(
      await readFile(
        path.join(intervalDir(dir, date), "telegram-raw.json"),
        "utf8",
      ),
    );
    expect(raw.coverage_complete).toBe(true);
    for (const ch of TELEGRAM_CHANNELS)
      expect(raw.channel_status[ch].slots).toHaveLength(24);
    const frozen = await readFile(
      path.join(intervalDir(dir, date), "acquisition.json"),
      "utf8",
    );
    expect(JSON.parse(frozen).source_snapshots).toHaveLength(54);
    expect(JSON.parse(frozen).candidates).toHaveLength(1);
    expect(JSON.parse(frozen).candidates[0].occurrences).toHaveLength(9);
    expect(JSON.parse(frozen).candidates[0].first_seen_at).toBe(
      "2026-09-25T15:59:00.000Z",
    );
    await service.tick();
    await service.waitForCurrentWork();
    expect(
      await readFile(
        path.join(intervalDir(dir, date), "acquisition.json"),
        "utf8",
      ),
    ).toBe(frozen);
  }, 15000);
  it("resumes an interrupted midnight source set after the next publisher slot without erasing late coverage", async () => {
    const dir = await root();
    let at = new Date("2026-09-25T16:00:00Z");
    const options = {
      protocolRevision: 4 as const,
      root: dir,
      now: () => at,
      collect,
      fetchPage: async () => ({
        status: 200,
        contentType: "text/html",
        body: "<main>Fixture</main>",
      }),
    };
    const initial = new ResearchSourceMonitorService(options);
    await initial.initialize();
    // Simulate a persisted started pass with no finished source checkpoint when the process died.
    const assets = await loadPinnedResearchAssets(4);
    const folder = passDir(
      intervalDir(dir, "2026-09-26"),
      "2026-09-25T16:00:00.000Z",
    );
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, "pass.json"),
      JSON.stringify({
        scheduled_slot: "2026-09-25T16:00:00.000Z",
        attempted_at: at.toISOString(),
        completed_at: null,
        source_ids: assets.registry.sources.map((s) => s.source_id),
        outcome: "started",
      }),
    );
    at = new Date("2026-09-25T19:02:00Z");
    const resumed = new ResearchSourceMonitorService(options);
    await resumed.initialize();
    await resumed.tick();
    await resumed.waitForCurrentWork();
    await resumed.tick();
    await resumed.waitForCurrentWork();
    const passes = await readDiscoveryPasses(intervalDir(dir, "2026-09-26"));
    expect(passes.map((p) => p.pass.source_ids.length)).toEqual([19, 5]);
    const summary = await summarizeDiscoveryPasses(
      intervalDir(dir, "2026-09-26"),
      "2026-09-26",
      assets.registry,
      new Date("2026-09-25T22:00:00Z"),
    );
    expect(summary.cadence_gaps).toHaveLength(5);
    expect(
      summary.cadence_gaps.every((g) => g.outcome === "late_or_incomplete"),
    ).toBe(true);
  });

  it("resumes revision 3 without changing its hashes and selects revision 4 only for the next interval", async () => {
    const dir = await root();
    let at = new Date("2026-09-25T15:58:00Z");
    const options = {
      protocolRevision: 4 as const,
      root: dir,
      now: () => at,
      collect,
      fetchPage: async () => ({
        status: 200,
        contentType: "text/html",
        body: "<main>Fixture</main>",
      }),
    };
    const legacy = new ResearchSourceMonitorService({
      ...options,
      protocolRevision: 3,
    });
    await legacy.initialize();
    await legacy.tick();
    await legacy.waitForCurrentWork();
    const before = await readFile(
      path.join(intervalDir(dir, "2026-09-25"), "interval.json"),
      "utf8",
    );
    const upgraded = new ResearchSourceMonitorService(options);
    await upgraded.initialize();
    expect(
      await readFile(
        path.join(intervalDir(dir, "2026-09-25"), "interval.json"),
        "utf8",
      ),
    ).toBe(before);
    at = new Date("2026-09-25T16:00:02Z");
    await upgraded.tick();
    await upgraded.waitForCurrentWork();
    expect((await readInterval(dir, "2026-09-26")).protocol_revision).toBe(4);
    expect((await readInterval(dir, "2026-09-25")).protocol_revision).toBe(3);
    expect((await readInterval(dir, "2026-09-25")).partial_reasons).toContain(
      "service_started_after_interval_start",
    );
  });

  it("records missed publisher slots even when the latest capture succeeds", async () => {
    const dir = await root(),
      assets = await loadPinnedResearchAssets(4);
    const summary = await summarizeDiscoveryPasses(
      dir,
      "2026-09-26",
      assets.registry,
    );
    expect(summary.cadence_gaps).toHaveLength(54);
    expect(summary.partial_reasons).toContain("incomplete_discovery_cadence");
  });
});
