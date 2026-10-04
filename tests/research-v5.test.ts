import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { passDir } from "../scripts/research/source-monitor/passes";
import { loadPinnedResearchAssets } from "../scripts/research/source-monitor/protocol";
import {
  collectResearchPreview,
  createTelegramResearchState,
  pollTelegram,
  telegramIntervalCoverage,
  telegramContentCoverage,
  type PreviewCollector,
} from "../scripts/research/source-monitor/telegram";
import {
  evaluateInterval,
  cumulativeMetrics,
  type Reviews,
} from "../scripts/research/source-monitor/evaluation";
import {
  persistLiveRecoveryCheckpoints,
  recoverDiscovery,
  readRecoveries,
  runtimeCatchUpCapability,
  summarizeRev5Acquisition,
} from "../scripts/research/source-monitor/recovery";
import { runDiscovery } from "../scripts/research/source-monitor/discovery";
import { ResearchSourceMonitorService } from "../scripts/research/source-monitor/service";
import {
  intervalDir,
  readInterval,
  verifyObservationSeal,
} from "../scripts/research/source-monitor/intervals";
import {
  researchTracker,
  formatResearchTracker,
} from "../scripts/research/source-monitor/tracker";
const roots: string[] = [];
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "research-v5-"));
  roots.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
});
const save = async () => {};

function datedCard(
  sourceId: string,
  title: string,
  date: string,
  href: string,
) {
  if (sourceId === "eatbook_deals")
    return `<article class="grid-item"><a href="${href}">${title}</a> <span class="date">${date}</span></article>`;
  const className = sourceId === "confirmgood_deals" ? "item hentry" : "";
  return `<article class="${className}"><a href="${href}">${title}</a><time class="entry-date published" datetime="${date}"></time></article>`;
}

function nextArchiveLink(sourceId: string, page: number) {
  if (sourceId === "confirmgood_deals")
    return `<a rel="next" href="https://confirmgood.com/post/category/deals/page/${page}/">Older Posts</a>`;
  if (sourceId === "eatbook_deals")
    return `<a rel="next" href="https://eatbook.sg/category/news/deals/page/${page}/">Older Posts</a>`;
  return `<a rel="next" href="https://sg.everydayonsales.com/sales-category/food-restaurant-pub/page/${page}/">Older Posts</a>`;
}

async function seedDatedCheckpoint(
  dir: string,
  source: Awaited<
    ReturnType<typeof loadPinnedResearchAssets>
  >["registry"]["sources"][number],
) {
  const date =
    source.source_id === "eatbook_deals"
      ? "10th September 2026"
      : "2026-09-10T08:00:00+08:00";
  const result = await runDiscovery({
    runDir: path.join(dir, "seed", source.source_id),
    registry: { sources: [source] },
    now: () => "2026-09-10T02:00:00Z",
    fetchPage: async () => ({
      status: 200,
      contentType: "text/html",
      body: datedCard(
        source.source_id,
        "Archive overlap",
        date,
        "/archive-overlap",
      ),
    }),
    provenance: { observation_mode: "live" },
  });
  await persistLiveRecoveryCheckpoints({
    root: dir,
    observedAt: result.observed_at,
    snapshots: result.source_snapshots,
  });
}
const collect: PreviewCollector = async (channel, cutoff, options) => ({
  data: {
    source: channel,
    complete: true,
    coverageStart: cutoff.toUTC().toISO()!,
    completeThrough: options!.now!.toUTC().toISO()!,
    posts:
      options!.now!.toMillis() >= Date.parse("2026-09-27T18:30:00Z")
        ? [
            {
              messageId: 7,
              publishedAt: "2026-09-27T18:30:00Z",
              text: "Cafe 1-for-1",
              candidates: [],
            },
          ]
        : [],
  },
  pages: 1,
  unavailableActivePosts: [],
  coverage: "fixture",
});
const input = (mode: "live" | "catch_up") => {
  const at = mode === "live" ? "2026-09-27T19:00:00Z" : "2026-09-28T01:05:00Z";
  const reviews: Reviews = {
    validity: {
      complete: true,
      assessments: [
        {
          candidate_id: "c",
          verdict: "valid_current_promotion",
          evidence_reason: "fixture",
        },
      ],
    },
    benchmark: {
      complete: true,
      posts_reviewed: ["sgfooddeals:7"],
      offers: [
        {
          benchmark_id: "b",
          post_ids: ["sgfooddeals:7"],
          first_seen_at: at,
          merchant: "Cafe",
          offer: "1-for-1",
          start_date: null,
          end_date: null,
          location: null,
          eligibility: null,
          redemption_method: null,
          evidence_summary: "fixture",
          eligible: true,
        },
      ],
    },
    matches: {
      complete: true,
      assessments: [
        {
          benchmark_id: "b",
          candidate_id: "c",
          classification: "exact_offer",
          reason: "same benefit and scope",
        },
      ],
    },
  };
  return {
    date: "2026-09-28",
    protocolRevision: 5 as const,
    candidates: [
      {
        candidate_id: "c",
        merchant: "Cafe",
        first_seen_at: at,
        inspectable: true,
        observation_mode: mode,
      },
    ],
    posts: [
      {
        channel: "sgfooddeals" as const,
        message_id: 7,
        first_seen_at: at,
        published_at: "2026-09-27T18:30:00Z",
        text: "Cafe 1-for-1",
        permalink: "https://t.me/sgfooddeals/7",
        observation_mode: mode,
      },
    ],
    telegramCoverageComplete: mode === "live",
    acquisitionComplete: mode === "live",
    telegramContentComplete: true,
    acquisitionContentComplete: true,
    acquisitionFrozen: true,
    rawBenchmarkFrozen: true,
    reviews,
  };
};
it("A: continuous live day qualifies for both evidence dimensions", () => {
  const e = evaluateInterval(input("live"));
  expect(e.metrics).toMatchObject({
    scoring_eligible: true,
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: true,
  });
  expect(e.temporal_metrics?.live_matched_offers).toBe(1);
});
it("B/D: proven content recovery qualifies for replacement but cannot fabricate timing", () => {
  const e = evaluateInterval(input("catch_up"));
  expect(e.metrics).toMatchObject({
    scoring_eligible: false,
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: false,
  });
  expect(e.replacement_metrics).toMatchObject({
    benchmark_recall: 1,
    same_offer_recovered: 1,
    catch_up_recovered_offers: 1,
    merchant_coverage: 1,
  });
  expect(e.scoring_records).toBeNull();
  expect(e.replacement_records?.timing).toEqual([]);
  expect(e.temporal_metrics?.lead_lag_minutes).toEqual([]);
  const metrics = cumulativeMetrics([e]);
  expect(metrics.synchronized_intervals).toBe(0);
  expect(metrics.replacement.replacement_intervals).toBe(1);
  expect(metrics.temporal.temporal_complete_intervals).toBe(0);
});
it("C/F: post recovered after downtime retains publication, actual receipt, gaps and idempotence", async () => {
  let state = (
    await pollTelegram(createTelegramResearchState(), {
      revision: 5,
      save,
      collect,
      now: () => new Date("2026-09-27T15:59:00Z"),
    })
  ).state;
  state = (
    await pollTelegram(state, {
      revision: 5,
      save,
      collect,
      now: () => new Date("2026-09-27T16:00:00Z"),
    })
  ).state;
  const options = {
    revision: 5 as const,
    save,
    collect,
    now: () => new Date("2026-09-28T01:05:00Z"),
  };
  state = (await pollTelegram(state, options)).state;
  expect(state.channels.sgfooddeals.observations[0]).toMatchObject({
    published_at: "2026-09-27T18:30:00Z",
    first_seen_at: "2026-09-28T01:05:00.000Z",
    recovered_at: "2026-09-28T01:05:00.000Z",
    observation_mode: "catch_up",
  });
  const coverage = telegramIntervalCoverage(
    state,
    "2026-09-27T16:00:00Z",
    "2026-09-28T01:00:00Z",
    5,
  );
  expect(coverage.coverage_complete).toBe(false);
  for (const hour of [22, 23])
    expect(
      coverage.channel_status.sgfooddeals.slots?.find(
        (s) => s.scheduled_slot === `2026-09-27T${hour}:00:00.000Z`,
      )?.outcome,
    ).toBe("missing_slot");
  expect(
    telegramContentCoverage(
      state,
      "2026-09-27T16:00:00Z",
      "2026-09-28T01:00:00Z",
    ),
  ).toBe(true);
  expect((await pollTelegram(state, options)).state).toEqual(state);
});
it("E: content blockers and incomplete manual review prevent replacement scoring", () => {
  expect(
    evaluateInterval({
      ...input("catch_up"),
      acquisitionContentComplete: false,
    }).metrics.replacement_scoring_eligible,
  ).toBe(false);
  expect(
    evaluateInterval({ ...input("catch_up"), reviews: {} }).metrics
      .replacement_scoring_eligible,
  ).toBe(false);
});
it("E/F: successful current listing is partial, durable retries do not refetch or repair passes", async () => {
  const dir = await root();
  const assets = await loadPinnedResearchAssets(5);
  const fetchPage = vi.fn(async () => ({
    status: 200,
    contentType: "text/html",
    body: "<main>Fixture</main>",
  }));
  const args = {
    root: dir,
    dir,
    date: "2026-09-28",
    registry: assets.registry,
    now: () => "2026-09-28T01:05:00Z",
    fetchPage,
  };
  const first = await recoverDiscovery(args);
  const count = fetchPage.mock.calls.length;
  expect(first?.sources.every((s) => s.status !== "complete")).toBe(true);
  expect(await recoverDiscovery(args)).toEqual(first);
  expect(fetchPage).toHaveBeenCalledTimes(count);
  const summary = await summarizeRev5Acquisition(
    dir,
    args.date,
    args.registry,
    new Date(args.now()),
  );
  expect(summary.content_complete).toBe(false);
  expect(summary.cadence_gaps.length).toBeGreaterThan(0);
  expect(summary.cadence_gaps.every((g) => g.outcome === "missing_slot")).toBe(
    true,
  );
});
it("revision-5 dated archives prove complete catch-up by crossing a durable live overlap", async () => {
  const assets = await loadPinnedResearchAssets(5);
  for (const sourceId of [
    "confirmgood_deals",
    "eatbook_deals",
    "everydayonsales_food",
  ]) {
    const dir = await root();
    const source = assets.registry.sources.find(
      (s) => s.source_id === sourceId,
    )!;
    await seedDatedCheckpoint(dir, source);
    const recoveryDate =
      sourceId === "eatbook_deals"
        ? "12th September 2026"
        : "2026-09-12T08:00:00+08:00";
    const overlapDate =
      sourceId === "eatbook_deals"
        ? "10th September 2026"
        : "2026-09-10T08:00:00+08:00";
    const olderDate =
      sourceId === "eatbook_deals"
        ? "9th September 2026"
        : "2026-09-09T08:00:00+08:00";
    const page2 =
      sourceId === "confirmgood_deals"
        ? "https://confirmgood.com/post/category/deals/page/2/"
        : sourceId === "eatbook_deals"
          ? "https://eatbook.sg/category/news/deals/page/2/"
          : "https://sg.everydayonsales.com/sales-category/food-restaurant-pub/page/2/";
    const fetchPage = vi.fn(async (url: string) => ({
      status: 200,
      contentType: "text/html",
      body:
        url === source.origin_url
          ? `${datedCard(sourceId, "Fresh article", recoveryDate, "/fresh-article")}${datedCard(sourceId, "Archive overlap", overlapDate, "/archive-overlap")}${nextArchiveLink(sourceId, 2)}`
          : url === page2
            ? datedCard(sourceId, "Older article", olderDate, "/older-article")
            : "<main>fixture</main>",
    }));
    const recovered = await recoverDiscovery({
      root: dir,
      dir,
      date: "2026-09-12",
      registry: { ...assets.registry, sources: [source] },
      now: () => "2026-09-13T01:05:00Z",
      fetchPage,
    });
    expect(recovered?.sources[0]).toMatchObject({
      source_id: sourceId,
      status: "complete",
      proof: {
        strategy: "dated_archive_checkpoint_overlap",
        crossed_checkpoint: true,
        overlap_verified: true,
        ordering_verified: true,
        pagination_complete: true,
        cap_truncated: false,
      },
    });
    expect(fetchPage).toHaveBeenCalledWith(page2);
  }
});

it("dated recovery stays partial when the safety cap arrives before the checkpoint", async () => {
  const dir = await root();
  const assets = await loadPinnedResearchAssets(5);
  const base = assets.registry.sources.find(
    (s) => s.source_id === "eatbook_deals",
  )!;
  const source = {
    ...base,
    reasonable_per_run_cap: { ...base.reasonable_per_run_cap, max_pages: 1 },
  };
  await seedDatedCheckpoint(dir, source);
  const recovered = await recoverDiscovery({
    root: dir,
    dir,
    date: "2026-09-12",
    registry: { ...assets.registry, sources: [source] },
    now: () => "2026-09-13T01:05:00Z",
    fetchPage: async () => ({
      status: 200,
      contentType: "text/html",
      body: `${datedCard(source.source_id, "Fresh article", "12th September 2026", "/fresh")}${nextArchiveLink(source.source_id, 2)}`,
    }),
  });
  expect(recovered?.sources[0]).toMatchObject({
    status: "partial",
    proof: { crossed_checkpoint: false, cap_truncated: true },
  });
});

it("repeated archive pages and publication-order reversals cannot prove complete history", async () => {
  const assets = await loadPinnedResearchAssets(5);
  for (const mode of ["repeat", "order"] as const) {
    const dir = await root();
    const source = assets.registry.sources.find(
      (s) => s.source_id === "eatbook_deals",
    )!;
    await seedDatedCheckpoint(dir, source);
    const page =
      mode === "repeat"
        ? `${datedCard(source.source_id, "Archive overlap", "10th September 2026", "/archive-overlap")}${nextArchiveLink(source.source_id, 2)}`
        : `${datedCard(source.source_id, "Archive overlap", "10th September 2026", "/archive-overlap")}${datedCard(source.source_id, "Newer after older", "12th September 2026", "/newer")}${nextArchiveLink(source.source_id, 2)}`;
    const recovered = await recoverDiscovery({
      root: dir,
      dir,
      date: "2026-09-12",
      registry: { ...assets.registry, sources: [source] },
      now: () => "2026-09-13T01:05:00Z",
      fetchPage: async (url) => ({
        status: 200,
        contentType: "text/html",
        body:
          mode === "repeat" || url === source.origin_url
            ? page
            : datedCard(
                source.source_id,
                "Older",
                "9th September 2026",
                "/older",
              ),
      }),
    });
    expect(recovered?.sources[0].status).not.toBe("complete");
    if (mode === "repeat")
      expect(recovered?.sources[0].proof.reasons).toContain(
        "repeated_listing_page_body",
      );
    else expect(recovered?.sources[0].proof.ordering_verified).toBe(false);
  }
});

it("runtime catch-up capability upgrades only the three proven dated archives and keeps rev5 hashes pinned", async () => {
  const assets = await loadPinnedResearchAssets(5);
  expect(assets.protocolSha256).toBe(
    "0720d14d4213f592fde4b8da7eae273f2fcf75c26a33a482581d0cca9b19114c",
  );
  expect(assets.registrySha256).toBe(
    "3cc285b4e3192eb52f5d54405876270e87bf1e4b3e03ced5a5268f22c2fa57aa",
  );
  const capability = Object.fromEntries(
    assets.registry.sources.map((source) => [
      source.source_id,
      runtimeCatchUpCapability(source),
    ]),
  );
  expect(capability).toMatchObject({
    confirmgood_deals: "complete",
    eatbook_deals: "complete",
    everydayonsales_food: "complete",
    singpromos_ongoing: "partial",
    mustsharenews_deals: "partial",
  });
});
it("G: overdue rev5 days freeze recovered posts on publication day and open today", async () => {
  const dir = await root();
  let at = new Date("2026-09-27T15:59:00Z");
  const options = {
    protocolRevision: 5 as const,
    root: dir,
    now: () => at,
    collect,
    fetchPage: async () => ({
      status: 200,
      contentType: "text/html",
      body: "<main>Fixture</main>",
    }),
  };
  const service = new ResearchSourceMonitorService(options);
  await service.initialize();
  at = new Date("2026-09-29T01:05:00Z");
  const restart = new ResearchSourceMonitorService(options);
  await restart.initialize();
  expect(restart.currentState.active_interval).toBe("2026-09-29");
  for (const date of ["2026-09-27", "2026-09-28"]) {
    expect((await readInterval(dir, date)).phase).toBe("benchmark_frozen");
    await verifyObservationSeal(dir, date);
  }
  const raw = JSON.parse(
    await readFile(
      path.join(intervalDir(dir, "2026-09-28"), "telegram-raw.json"),
      "utf8",
    ),
  );
  expect(raw.posts).toHaveLength(2);
  expect(raw.posts[0].observation_mode).toBe("catch_up");
  expect(raw.content_complete).toBe(true);
  expect(raw.coverage_complete).toBe(false);
  const recovery = await readRecoveries(intervalDir(dir, "2026-09-28"));
  expect(recovery).toHaveLength(1);
  const bytes = await readFile(
    path.join(intervalDir(dir, "2026-09-28"), "telegram-raw.json"),
  );
  await new ResearchSourceMonitorService(options).initialize();
  expect(
    await readFile(
      path.join(intervalDir(dir, "2026-09-28"), "telegram-raw.json"),
    ),
  ).toEqual(bytes);
  const tracker = await researchTracker(dir, at);
  expect(formatResearchTracker(tracker)).toContain(
    "content recovered ≠ live coverage restored",
  );
}, 30000);
it("H: historical hashes remain pinned and active rev4 survives deployment; next day defaults rev5", async () => {
  const old = await loadPinnedResearchAssets(4);
  expect(old.protocolSha256).toBe(
    "7843360048f335be579bef859396d0c9390a133097e3f6e1a02d9c19c4164791",
  );
  expect(old.registrySha256).toBe(
    "ffa84b3be3d5db779ac6ca7ceb56370f7338aacd6538ae6bf01bde0834f6b6b1",
  );
  expect((await loadPinnedResearchAssets(5)).protocol.revision).toBe(5);
  const dir = await root();
  let at = new Date("2026-09-27T15:59:00Z");
  const options = {
    protocolRevision: 5 as const,
    root: dir,
    now: () => at,
    collect,
    fetchPage: async () => ({
      status: 200,
      contentType: "text/html",
      body: "<main>Fixture</main>",
    }),
  };
  await new ResearchSourceMonitorService({
    ...options,
    protocolRevision: 4,
  }).initialize();
  const bytes = await readFile(
    path.join(intervalDir(dir, "2026-09-27"), "interval.json"),
  );
  const deployed = new ResearchSourceMonitorService(options);
  await deployed.initialize();
  expect(
    await readFile(path.join(intervalDir(dir, "2026-09-27"), "interval.json")),
  ).toEqual(bytes);
  at = new Date("2026-09-27T16:00:00Z");
  await deployed.tick();
  await deployed.waitForCurrentWork();
  expect((await readInterval(dir, "2026-09-28")).protocol_revision).toBe(5);
});
it("D/F: dated independent offers are assigned to publication day with actual recovery timestamps and unique occurrences", async () => {
  const dir = await root();
  const assets = await loadPinnedResearchAssets(5);
  const source = assets.registry.sources.find(
    (s) => s.source_id === "singpromos_ongoing",
  )!;
  const fetchPage = vi.fn(async (url: string) => ({
    status: 200,
    contentType: "text/html",
    body:
      url === source.origin_url
        ? '<article class="mh-loop-item"><a href="/offer/a">Cafe A 1-for-1 Latte</a></article>'
        : '<meta property="article:published_time" content="2026-09-27T18:30:00Z"><main>Promotion valid 27 Sep to 28 Sep 2026 at participating Singapore stores. Terms apply.</main>',
  }));
  const args = {
    root: dir,
    dir,
    date: "2026-09-28",
    registry: { ...assets.registry, sources: [source] },
    now: () => "2026-09-29T01:05:00Z",
    fetchPage,
  };
  const recovered = await recoverDiscovery(args);
  expect(recovered?.result.candidates).toHaveLength(1);
  expect(recovered?.result.candidates[0]).toMatchObject({
    published_at: "2026-09-27T18:30:00.000Z",
    first_seen_at: args.now(),
    observation_mode: "catch_up",
    recovered_at: args.now(),
  });
  const frozen = await summarizeRev5Acquisition(dir, args.date, args.registry);
  expect(frozen.candidates).toHaveLength(1);
  expect(frozen.candidates[0].occurrences).toHaveLength(1);
  const calls = fetchPage.mock.calls.length;
  await recoverDiscovery(args);
  expect(fetchPage).toHaveBeenCalledTimes(calls);
  expect(
    (await summarizeRev5Acquisition(dir, args.date, args.registry)).candidates,
  ).toEqual(frozen.candidates);
});
it("live cadence does not permit catch-up or unknown provenance in timing", () => {
  const e = evaluateInterval({
    ...input("catch_up"),
    telegramCoverageComplete: true,
    acquisitionComplete: true,
  });
  expect(e.metrics.temporal_scoring_eligible).toBe(true);
  expect(e.scoring_records?.timing).toEqual([]);
  const unknown = input("live");
  const result = evaluateInterval({
    ...unknown,
    candidates: unknown.candidates.map((candidate) => ({
      ...candidate,
      observation_mode: undefined,
    })),
  });
  expect(result.scoring_records?.timing).toEqual([]);
});
it("A: all 24 live Telegram slots and every tiered source pass retain complete coverage", async () => {
  const dir = await root();
  const registry = (await loadPinnedResearchAssets(5)).registry;
  const start = Date.parse("2026-09-27T16:00:00Z");
  let state = (
    await pollTelegram(createTelegramResearchState(), {
      revision: 5,
      save,
      collect,
      now: () => new Date(start - 60_000),
    })
  ).state;
  for (let hour = 0; hour <= 24; hour++) {
    const at = new Date(start + hour * 3_600_000);
    state = (
      await pollTelegram(state, { revision: 5, save, collect, now: () => at })
    ).state;
    if (hour === 24 || hour % 3) continue;
    const sources = registry.sources.filter(
      (s) => hour === 0 || s.cadence_class === "fresh_publisher",
    );
    const folder = passDir(dir, at.toISOString());
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, "pass.json"),
      JSON.stringify({
        scheduled_slot: at.toISOString(),
        attempted_at: at.toISOString(),
        completed_at: at.toISOString(),
        source_ids: sources.map((s) => s.source_id),
        outcome: "success",
        observation_mode: "live",
      }),
    );
    // Simulated complete adapters isolate cadence/content eligibility from real adapter limitations.
    const snapshots = sources.map((s) => ({
      source_id: s.source_id,
      observed_at: at.toISOString(),
      status: "captured",
      entries_seen_count: 0,
      cards_evaluated: 0,
      cards_skipped_stale: 0,
      cards_outside_horizon: 0,
      cards_temporal_ambiguous: 0,
      candidate_proposals: 0,
      detail_attempts: 0,
      detail_failures: 0,
      listing_failure: false,
      cap_truncated: false,
      extraction_incomplete: false,
    }));
    await writeFile(
      path.join(folder, "result.json"),
      JSON.stringify({
        schema_version: 1,
        observed_at: at.toISOString(),
        source_snapshots: snapshots,
        candidates: [],
      }),
    );
  }
  const summary = await summarizeRev5Acquisition(dir, "2026-09-28", registry);
  expect(summary.cadence_gaps).toEqual([]);
  expect(summary.content_complete).toBe(true);
  expect(summary.source_snapshots).toHaveLength(54);
  const coverage = telegramIntervalCoverage(
    state,
    new Date(start),
    new Date(start + 24 * 3_600_000),
    5,
  );
  expect(coverage.coverage_complete).toBe(true);
  expect(coverage.channel_status.sgfooddeals.slots).toHaveLength(24);
  const evaluation = evaluateInterval({
    ...input("live"),
    telegramCoverageComplete: coverage.coverage_complete,
    acquisitionComplete: summary.cadence_gaps.length === 0,
    acquisitionContentComplete: summary.content_complete,
    telegramContentComplete: telegramContentCoverage(
      state,
      new Date(start).toISOString(),
      new Date(start + 24 * 3_600_000).toISOString(),
    ),
  });
  expect(evaluation.metrics.replacement_scoring_eligible).toBe(true);
  expect(evaluation.metrics.temporal_scoring_eligible).toBe(true);
});
it("failed Telegram catch-up cannot claim content completion or repair scheduled gaps", async () => {
  let state = (
    await pollTelegram(createTelegramResearchState(), {
      revision: 5,
      save,
      collect,
      now: () => new Date("2026-09-27T15:59:00Z"),
    })
  ).state;
  state = (
    await pollTelegram(state, {
      revision: 5,
      save,
      now: () => new Date("2026-09-28T01:05:00Z"),
      collect: async () => {
        throw new Error("history checkpoint cannot be reached");
      },
    })
  ).state;
  expect(state.channels.sgfooddeals.polls.at(-1)?.recovery_status).toBe(
    "failed",
  );
  expect(
    telegramContentCoverage(
      state,
      "2026-09-27T16:00:00Z",
      "2026-09-28T01:00:00Z",
    ),
  ).toBe(false);
  expect(
    telegramIntervalCoverage(
      state,
      "2026-09-27T16:00:00Z",
      "2026-09-28T01:00:00Z",
      5,
    ).coverage_complete,
  ).toBe(false);
});
it("H: recovery refuses older revisions and observation-sealed evidence before any fetch", async () => {
  const dir = await root();
  const registry = (await loadPinnedResearchAssets(5)).registry;
  const fetchPage = vi.fn(async () => ({
    status: 200,
    contentType: "text/html",
    body: "<main>fixture</main>",
  }));
  const args = {
    root: dir,
    dir,
    date: "2026-09-28",
    registry,
    now: () => "2026-09-29T01:05:00Z",
    fetchPage,
  };
  await writeFile(
    path.join(dir, "interval.json"),
    JSON.stringify({ protocol_revision: 4, phase: "observing" }),
  );
  await expect(recoverDiscovery(args)).rejects.toThrow("revision-5");
  await writeFile(
    path.join(dir, "interval.json"),
    JSON.stringify({ protocol_revision: 5, phase: "observing" }),
  );
  await writeFile(
    path.join(dir, "OBSERVATIONS_SEALED"),
    JSON.stringify({ sha256: {} }),
  );
  await expect(recoverDiscovery(args)).rejects.toThrow("sealed");
  expect(fetchPage).not.toHaveBeenCalled();
});
it("E: bounded Telegram history retains exposed posts as partial without advancing the checkpoint", async () => {
  let state = (
    await pollTelegram(createTelegramResearchState(), {
      revision: 5,
      save,
      collect,
      now: () => new Date("2026-09-27T15:59:00Z"),
    })
  ).state;
  const prior = state.channels.sgfooddeals.last_complete_through_at;
  const partialCollector: PreviewCollector = (channel, cutoff, options) =>
    collectResearchPreview(channel, cutoff, {
      ...options,
      maxPages: 1,
      paceMs: 0,
      fetchPage: async () =>
        `<div class="tgme_widget_message" data-post="${channel}/7"><a class="tgme_widget_message_date"><time datetime="2026-09-27T18:30:00Z"></time></a><div class="tgme_widget_message_text">Cafe 1-for-1</div></div><a class="tme_messages_more" data-before="7"></a>`,
    });
  state = (
    await pollTelegram(state, {
      revision: 5,
      save,
      collect: partialCollector,
      now: () => new Date("2026-09-28T01:05:00Z"),
    })
  ).state;
  expect(state.channels.sgfooddeals.observations).toHaveLength(1);
  expect(state.channels.sgfooddeals.observations[0]).toMatchObject({
    observation_mode: "catch_up",
    first_seen_at: "2026-09-28T01:05:00.000Z",
    published_at: "2026-09-27T18:30:00.000Z",
  });
  expect(state.channels.sgfooddeals.polls.at(-1)).toMatchObject({
    outcome: "failed",
    recovery_status: "partial",
  });
  expect(state.channels.sgfooddeals.last_complete_through_at).toBe(prior);
  expect(
    telegramContentCoverage(
      state,
      "2026-09-27T16:00:00Z",
      "2026-09-28T01:00:00Z",
    ),
  ).toBe(false);
  const resumed = (
    await pollTelegram(state, {
      revision: 5,
      save,
      collect: partialCollector,
      now: () => new Date("2026-09-28T02:05:00Z"),
    })
  ).state;
  expect(resumed.channels.sgfooddeals.observations).toEqual(
    state.channels.sgfooddeals.observations,
  );
});
