import { afterEach, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { classifySnapshotCompleteness } from "../scripts/research/source-monitor/completeness";
import {
  runDiscovery,
  type FetchPage,
  type Source,
  type SourceSnapshot,
  type DiscoveryResult,
} from "../scripts/research/source-monitor/discovery";
import {
  CORE_SOURCE_IDS,
  loadPinnedResearchAssets,
} from "../scripts/research/source-monitor/protocol";
import {
  liveRecoveryTraversalTargets,
  persistLiveRecoveryCheckpoints,
  readRecoveryCheckpoint,
  recoveryCheckpointStatus,
  recoverDiscovery,
  summarizeRev5Acquisition,
  summarizeRev6Acquisition,
} from "../scripts/research/source-monitor/recovery";
import {
  intervalDir,
  openInterval,
} from "../scripts/research/source-monitor/intervals";
import { passDir } from "../scripts/research/source-monitor/passes";
import {
  evaluateInterval,
  type Reviews,
} from "../scripts/research/source-monitor/evaluation";
import {
  researchTracker,
  formatResearchTracker,
} from "../scripts/research/source-monitor/tracker";
import { ResearchSourceMonitorService } from "../scripts/research/source-monitor/service";
import { researchAnalysisEvaluations } from "../scripts/research/source-monitor/analysis";

const roots: string[] = [];
async function root() {
  const r = await mkdtemp(path.join(os.tmpdir(), "rev6-runtime-"));
  roots.push(r);
  return r;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
});
const day = "2026-10-01",
  start = Date.parse("2026-09-30T16:00:00Z"),
  end = start + 86400000;
const iso = (ms: number) => new Date(ms).toISOString();
const json = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};
function card(s: Source, title: string, n: number, href: string) {
  const stamp =
    s.source_id === "eatbook_deals"
      ? `${n}th September 2026`
      : `2026-09-${n}T08:00:00+08:00`;
  return `<article class="${s.source_id === "eatbook_deals" ? "grid-item" : s.source_id === "confirmgood_deals" ? "item hentry" : ""}"><a href="${href}">${title}</a>${s.source_id === "eatbook_deals" ? `<span class="date">${stamp}</span>` : `<time class="entry-date published" datetime="${stamp}"></time>`}</article>`;
}
function next(s: Source, n: number) {
  return `<a rel="next" href="${s.origin_url}page/${n}/">Older Posts</a>`;
}
function ambiguousListing(s: Source) {
  return (
    card(s, "Cafe Scope 1-for-1 Latte", 29, "/scope") +
    card(s, "1-for-1 Latte", 29, "/merchant") +
    card(s, "Cafe Dates 1-for-1 Latte", 29, "/temporal") +
    card(s, "Cafe Detail 1-for-1 Latte", 29, "/detail-failure")
  );
}
const ambiguousFetch =
  (sources: Source[]): FetchPage =>
  async (url) => {
    const s = sources.find(
      (s) => new URL(s.origin_url).hostname === new URL(url).hostname,
    )!;
    return {
      status: url.endsWith("/detail-failure") ? 503 : 200,
      contentType: "text/html",
      body:
        url === s.origin_url
          ? ambiguousListing(s)
          : url.endsWith("/temporal")
            ? "<main>1-for-1 Latte</main>"
            : "<main>Valid until 31 October 2026</main>",
    };
  };
async function capture(
  r: string,
  sources: Source[],
  fetchPage: FetchPage,
  at = start,
  previous?: DiscoveryResult,
) {
  return runDiscovery({
    runDir: path.join(r, `capture-${at}`),
    registry: { sources },
    now: () => iso(at),
    fetchPage,
    previous,
    provenance: { observation_mode: "live" },
    recoveryTargets: await liveRecoveryTraversalTargets(r, { sources }),
  });
}
async function savePass(r: string, result: DiscoveryResult, at: number) {
  const slot = iso(at),
    folder = passDir(intervalDir(r, day), slot);
  await json(path.join(folder, "result.json"), result);
  await json(path.join(folder, "pass.json"), {
    scheduled_slot: slot,
    attempted_at: slot,
    completed_at: slot,
    observation_mode: "live",
    source_ids: result.source_snapshots.map((s) => s.source_id),
    outcome: "success",
  });
}
async function cleanDay(miss = false, single = false) {
  const r = await root(),
    assets = await loadPinnedResearchAssets(6);
  const sources = assets.registry.sources.filter(
    (s) => s.cadence_class === "fresh_publisher",
  );
  for (let h = 0; h < (single ? 3 : 24); h += 3) {
    if (miss && h === 3) continue;
    const at = start + h * 3600000;
    // Repeated live captures intentionally use the same terminal listing, with actual extraction ambiguity.
    const result = await runDiscovery({
      runDir: path.join(r, `pass-${h}`),
      registry: { sources },
      now: () => iso(at),
      fetchPage: ambiguousFetch(sources),
      provenance: { observation_mode: "live" },
    });
    await savePass(r, result, at);
    if (h === 0)
      await persistLiveRecoveryCheckpoints({
        root: r,
        observedAt: iso(at),
        snapshots: result.source_snapshots,
      });
  }
  const registry = { ...assets.registry, sources };
  return {
    r,
    registry,
    dir: intervalDir(r, day),
    through: single ? new Date(start + 3 * 3600000) : undefined,
    summary: await summarizeRev6Acquisition(
      intervalDir(r, day),
      day,
      registry,
      single ? new Date(start + 3 * 3600000) : undefined,
    ),
  };
}
function evaluation(
  summary: Awaited<ReturnType<typeof summarizeRev6Acquisition>>,
  temporal = true,
) {
  const core = summary.core_candidates;
  const scores = Object.fromEntries(
    [
      "merchant",
      "promotion_name",
      "offer",
      "discount_value",
      "start_date",
      "end_date",
      "location",
      "eligibility",
      "redemption_method",
      "important_terms",
    ].map((k) => [k, 0]),
  );
  const reviews: Reviews = {
    validity: {
      complete: true,
      assessments: core.map((c, i) => ({
        candidate_id: c.candidate_id,
        verdict: i === 0 ? "valid_current_promotion" : "insufficient_evidence",
        evidence_reason:
          "Research adjudication of incomplete scope/detail evidence",
      })),
    },
    benchmark: {
      complete: true,
      posts_reviewed: ["sgfooddeals:1"],
      offers: ["match", "miss"].map((id) => ({
        benchmark_id: id,
        post_ids: ["sgfooddeals:1"],
        first_seen_at: iso(start + 60000),
        merchant: "Cafe",
        offer: "1-for-1",
        start_date: null,
        end_date: null,
        location: null,
        eligibility: null,
        redemption_method: null,
        evidence_summary: "fixture listing/benchmark",
        eligible: true,
      })),
    },
    matches: {
      complete: true,
      assessments: [
        {
          benchmark_id: "match",
          candidate_id: core[0].candidate_id,
          classification: "probable_same_offer",
          reason: "Manual listing comparison",
          fact_scores: scores,
        },
        {
          benchmark_id: "miss",
          candidate_id: null,
          classification: "no_match",
          reason: "Ambiguous extraction omitted offer",
          miss_diagnosis: {
            classification: "candidate_extraction_failure",
            reason:
              "Observable listing was acquired but parsing was insufficient",
          },
        },
      ],
    },
  };
  return evaluateInterval({
    protocolRevision: 6,
    date: day,
    candidates: summary.candidates,
    posts: [
      {
        channel: "sgfooddeals",
        message_id: 1,
        published_at: iso(start),
        first_seen_at: iso(start + 60000),
        text: "fixture",
        permalink: "https://t.me/sgfooddeals/1",
        observation_mode: "live",
      },
    ],
    telegramContentComplete: true,
    telegramCoverageComplete: temporal,
    coreContentComplete: summary.core_content_complete,
    coreCadenceComplete: summary.core_cadence_complete,
    allRegistryContentComplete: summary.all_registry_content_complete,
    allRegistryCadenceComplete: summary.all_registry_cadence_complete,
    acquisitionFrozen: true,
    rawBenchmarkFrozen: true,
    reviews,
  });
}

it("A/B/K: real candidate ambiguity preserves core denominator, extraction misses, poor precision/facts and diagnostics; rev5 semantics stay strict", async () => {
  const f = await cleanDay();
  for (const s of f.summary.source_snapshots.filter((s) =>
    CORE_SOURCE_IDS.includes(s.source_id),
  )) {
    expect(s.incomplete_reasons).toEqual(
      expect.arrayContaining([
        "candidate_scope_ambiguous",
        "candidate_merchant_ambiguous",
        "candidate_temporal_ambiguous",
        "detail_fetch_failed",
      ]),
    );
    expect(classifySnapshotCompleteness(s)).toMatchObject({
      enumeration_complete: true,
      extraction_complete: false,
    });
  }
  expect(f.summary).toMatchObject({
    core_enumeration_complete: true,
    core_extraction_complete: false,
    core_content_complete: true,
    core_cadence_complete: true,
  });
  const e = evaluation(f.summary);
  expect(e.metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: true,
    extraction_misses: 1,
    candidate_validity_precision: 1 / f.summary.core_candidates.length,
    matched_fact_completeness: 0,
  });
  expect(e.revision6).toMatchObject({
    core_same_offer_recall: 0.5,
    core_benchmark_offer_count: 2,
  });
  const old = await summarizeRev5Acquisition(f.dir, day, f.registry);
  expect(old.content_complete).toBe(false);
  expect(old.content_partial_reasons).toContain(
    "content_enumeration_incomplete:eatbook_deals",
  );
  const assets = await loadPinnedResearchAssets(6);
  await openInterval(
    f.r,
    day,
    iso(start),
    assets.protocolSha256,
    assets.registrySha256,
    6,
  );
  const before = await hashes(f.r),
    t = await researchTracker(f.r, new Date(end));
  const a = t.adapters.find((s) => s.source_id === "eatbook_deals")!;
  expect(a).toMatchObject({
    enumeration_status: "complete",
    extraction_quality: "partial",
    durable_checkpoint_validity: "valid",
    catch_up_capability: "complete",
  });
  expect(t.blockers).not.toContain("incomplete_core_content");
  expect(a.extraction_reasons).toContain("candidate_merchant_ambiguous");
  expect(formatResearchTracker(t)).toContain("extraction=partial");
  expect(t.revision6.analysis_exclusions[0]).toMatchObject({
    date: "2026-09-30",
    reason: "implementation_transition",
  });
  expect(await hashes(f.r)).toEqual(before);
});

async function hashes(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) Object.assign(out, await hashes(p));
    else
      out[p] = createHash("sha256")
        .update(await readFile(p))
        .digest("hex");
  }
  return out;
}
it.each([
  "listing",
  "zero_pages",
  "pagination",
  "cap",
  "interrupted",
  "loop",
  "repeat",
  "ordering",
  "boundary",
])(
  "C/D/E/F: %s blocks enumeration/scoring and cannot create/advance checkpoint",
  async (mode) => {
    const f = await cleanDay(false, true),
      s = f.summary.source_snapshots.find(
        (s) => s.source_id === "eatbook_deals",
      )!;
    expect(f.summary.core_content_complete).toBe(true);
    const bad: SourceSnapshot = structuredClone(s);
    if (mode === "listing") bad.listing_failure = true;
    if (mode === "zero_pages") bad.pages = [];
    if (mode === "pagination") bad.pagination_remaining = true;
    if (mode === "cap") bad.cap_truncated = true;
    if (mode === "interrupted")
      bad.incomplete_reasons.push("acquisition_interrupted_during_source");
    if (mode === "loop")
      bad.incomplete_reasons.push("listing_pagination_url_loop");
    if (mode === "repeat")
      bad.errors.push("Repeated listing page body: fixture");
    if (mode === "ordering")
      bad.listing_evidence[1].published_at = "2026-10-01T01:00:00Z";
    if (mode === "boundary")
      bad.archive_enumeration!.terminal_page_reached = false;
    expect(classifySnapshotCompleteness(bad).enumeration_complete).toBe(false);
    const cp = path.join(f.r, "recovery-checkpoints/eatbook_deals.json"),
      bytes = await readFile(cp);
    await persistLiveRecoveryCheckpoints({
      root: f.r,
      observedAt: iso(end),
      snapshots: [bad],
    });
    expect(await readFile(cp)).toEqual(bytes);
    const empty = await root();
    await persistLiveRecoveryCheckpoints({
      root: empty,
      observedAt: iso(end),
      snapshots: [bad],
    });
    expect(await readRecoveryCheckpoint(empty, "eatbook_deals")).toBeNull();
    const folder = passDir(f.dir, iso(start));
    const result = JSON.parse(
      await readFile(path.join(folder, "result.json"), "utf8"),
    ) as DiscoveryResult;
    result.source_snapshots = result.source_snapshots.map((s) =>
      s.source_id === "eatbook_deals" ? bad : s,
    );
    await json(path.join(folder, "result.json"), result);
    const summary = await summarizeRev6Acquisition(
      f.dir,
      day,
      f.registry,
      f.through,
    );
    expect(summary.core_content_complete).toBe(false);
    expect(evaluation(summary).metrics.replacement_scoring_eligible).toBe(
      false,
    );
  },
);

it("G: invalid legacy Eatbook checkpoint is ignored without modification or fabricated recovery crossing", async () => {
  const f = await cleanDay(true),
    file = path.join(f.r, "recovery-checkpoints/eatbook_deals.json");
  const legacy = JSON.parse(await readFile(file, "utf8"));
  legacy.cap_truncated = true;
  await json(file, legacy);
  const bytes = await readFile(file);
  expect(await recoveryCheckpointStatus(f.r, "eatbook_deals")).toMatchObject({
    validity: "invalid",
    checkpoint: null,
    reasons: ["checkpoint_cap_truncated"],
  });
  expect(
    (await liveRecoveryTraversalTargets(f.r, f.registry)).eatbook_deals,
  ).toBeUndefined();
  // Remove bootstrap's terminal proof in this fixture: all legacy listings were actually cap-truncated.
  for (let h = 0; h < 24; h += 3) {
    if (h === 3) continue;
    const p = path.join(
      passDir(f.dir, iso(start + h * 3600000)),
      "result.json",
    );
    const result = JSON.parse(await readFile(p, "utf8")) as DiscoveryResult;
    result.source_snapshots.find(
      (s) => s.source_id === "eatbook_deals",
    )!.cap_truncated = true;
    await json(p, result);
  }
  const recovered = await recoverDiscovery({
    root: f.r,
    dir: f.dir,
    date: day,
    registry: f.registry,
    now: () => iso(end),
    fetchPage: ambiguousFetch(f.registry.sources),
  });
  expect(
    recovered!.sources.find((s) => s.source_id === "eatbook_deals"),
  ).toMatchObject({
    status: "partial",
    checkpoint_at: null,
    proof: { crossed_checkpoint: false, overlap_verified: false },
  });
  expect(await readFile(file)).toEqual(bytes);
  expect(
    (await summarizeRev6Acquisition(f.dir, day, f.registry))
      .core_content_complete,
  ).toBe(false);
});

it.each(CORE_SOURCE_IDS)(
  "H: %s live traversal stops after checkpoint and deterministic overlap despite deeper archive",
  async (id) => {
    const r = await root(),
      assets = await loadPinnedResearchAssets(6),
      source = assets.registry.sources.find((s) => s.source_id === id)!;
    const seed = await capture(r, [source], async () => ({
      status: 200,
      contentType: "text/html",
      body: card(source, "Archive overlap", 27, "/overlap"),
    }));
    await persistLiveRecoveryCheckpoints({
      root: r,
      observedAt: seed.observed_at,
      snapshots: seed.source_snapshots,
    });
    const fetchPage = vi.fn<FetchPage>(async (url) => ({
      status: 200,
      contentType: "text/html",
      body:
        url === source.origin_url
          ? card(source, "New article", 29, "/new") + next(source, 2)
          : url === source.origin_url + "page/2/"
            ? card(source, "Archive overlap", 27, "/overlap") + next(source, 3)
            : card(source, "Older article", 26, "/older") + next(source, 4),
    }));
    const live = await capture(r, [source], fetchPage, start + 3 * 3600000),
      snapshot = live.source_snapshots[0];
    expect(snapshot.pages).toHaveLength(3);
    expect(fetchPage).not.toHaveBeenCalledWith(source.origin_url + "page/4/");
    expect(snapshot).toMatchObject({
      cap_truncated: false,
      pagination_remaining: false,
      recovery_traversal: {
        crossed_checkpoint: true,
        overlap_verified: true,
        ordering_verified: true,
        pagination_complete: true,
        terminal_page_reached: false,
        reasons: [],
      },
    });
    expect(classifySnapshotCompleteness(snapshot).enumeration_complete).toBe(
      true,
    );
    await persistLiveRecoveryCheckpoints({
      root: r,
      observedAt: live.observed_at,
      snapshots: [snapshot],
    });
    expect(await readRecoveryCheckpoint(r, id)).toMatchObject({
      last_successful_observed_at: live.observed_at,
      enumeration_boundary: "checkpoint_overlap",
      terminal_page_reached: false,
    });
  },
);

it.each([
  "not_reached",
  "changed_hash",
  "repeat",
  "loop",
  "order",
  "overlap_cap",
  "overlap_unresolved",
])(
  "I/J: %s cannot prove incremental boundary or advance checkpoint",
  async (mode) => {
    const r = await root(),
      assets = await loadPinnedResearchAssets(6),
      base = assets.registry.sources.find(
        (s) => s.source_id === "eatbook_deals",
      )!;
    const source = {
      ...base,
      reasonable_per_run_cap: {
        ...base.reasonable_per_run_cap,
        max_pages: mode === "overlap_cap" ? 1 : 2,
      },
    };
    const seed = await capture(r, [source], async () => ({
      status: 200,
      contentType: "text/html",
      body: card(source, "Archive overlap", 27, "/overlap"),
    }));
    await persistLiveRecoveryCheckpoints({
      root: r,
      observedAt: seed.observed_at,
      snapshots: seed.source_snapshots,
    });
    const file = path.join(r, "recovery-checkpoints/eatbook_deals.json"),
      bytes = await readFile(file);
    const live = await capture(
      r,
      [source],
      async (url) => ({
        status: 200,
        contentType: "text/html",
        body:
          mode === "not_reached"
            ? card(
                source,
                url === source.origin_url
                  ? "New first page"
                  : "New second page",
                29,
                url === source.origin_url ? "/new1" : "/new2",
              ) + next(source, url === source.origin_url ? 2 : 3)
            : mode === "changed_hash"
              ? card(source, "Changed overlap text", 27, "/overlap")
              : mode === "loop"
                ? card(source, "Archive overlap", 27, "/overlap") +
                  `<a rel="next" href="${source.origin_url}">Older Posts</a>`
                : mode === "order"
                  ? card(source, "Archive overlap", 27, "/overlap") +
                    card(source, "Newer after older", 29, "/new")
                  : mode === "overlap_unresolved"
                    ? card(source, "Archive overlap", 27, "/overlap") +
                      "<button>Load More</button>"
                    : url === source.origin_url || mode === "repeat"
                      ? card(source, "Archive overlap", 27, "/overlap") +
                        next(source, 2)
                      : card(source, "Older article", 26, "/older"),
      }),
      start + 3 * 3600000,
    );
    expect(
      classifySnapshotCompleteness(live.source_snapshots[0])
        .enumeration_complete,
    ).toBe(false);
    if (mode === "not_reached")
      expect(live.source_snapshots[0]).toMatchObject({
        cap_truncated: true,
        recovery_traversal: {
          crossed_checkpoint: false,
          overlap_verified: false,
        },
      });
    if (mode === "changed_hash")
      expect(
        live.source_snapshots[0].recovery_traversal!.overlap_verified,
      ).toBe(false);
    await persistLiveRecoveryCheckpoints({
      root: r,
      observedAt: live.observed_at,
      snapshots: live.source_snapshots,
    });
    expect(await readFile(file)).toEqual(bytes);
  },
);

it("L: offline recovery with three valid repaired checkpoints restores core replacement, leaves supplemental content/cadence partial", async () => {
  const f = await cleanDay(true);
  const recovery = await recoverDiscovery({
    root: f.r,
    dir: f.dir,
    date: day,
    registry: f.registry,
    now: () => iso(end),
    fetchPage: ambiguousFetch(f.registry.sources),
  });
  expect(
    recovery!.sources
      .filter((s) => CORE_SOURCE_IDS.includes(s.source_id))
      .map((s) => s.status),
  ).toEqual(["complete", "complete", "complete"]);
  const summary = await summarizeRev6Acquisition(f.dir, day, f.registry);
  expect(summary).toMatchObject({
    core_content_complete: true,
    core_enumeration_complete: true,
    core_extraction_complete: false,
    all_registry_content_complete: false,
    core_cadence_complete: false,
  });
  const e = evaluation(summary, false);
  expect(e.metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: false,
  });
  expect(e.replacement_metrics!.extraction_misses).toBe(1);
});

it.each(["cap", "listing"])(
  "C/D: later strict recovery repairs a %s failure without erasing its diagnostics",
  async (mode) => {
    const f = await cleanDay(),
      file = path.join(passDir(f.dir, iso(start + 3 * 3600000)), "result.json");
    const result = JSON.parse(await readFile(file, "utf8")) as DiscoveryResult;
    const bad = result.source_snapshots.find(
      (s) => s.source_id === "eatbook_deals",
    )!;
    if (mode === "cap") bad.cap_truncated = true;
    else bad.listing_failure = true;
    await json(file, result);
    expect(
      (await summarizeRev6Acquisition(f.dir, day, f.registry))
        .core_content_complete,
    ).toBe(false);
    const recovery = await recoverDiscovery({
      root: f.r,
      dir: f.dir,
      date: day,
      registry: f.registry,
      now: () => iso(end),
      fetchPage: ambiguousFetch(f.registry.sources),
    });
    expect(recovery!.sources).toHaveLength(1);
    expect(recovery!.sources[0].status).toBe("complete");
    const summary = await summarizeRev6Acquisition(f.dir, day, f.registry);
    expect(summary.core_content_complete).toBe(true);
    expect(
      summary.source_completeness.find((s) => s.source_id === "eatbook_deals")!
        .live_enumeration_reasons,
    ).toContain(mode === "cap" ? "cap_truncated" : "listing_failure");
  },
);

it("service wires durable targets into actual rev6 live acquisition", async () => {
  const r = await root(),
    assets = await loadPinnedResearchAssets(6),
    core = assets.registry.sources.filter((s) =>
      CORE_SOURCE_IDS.includes(s.source_id),
    );
  const seed = await capture(
    r,
    core,
    async (url) => {
      const s = core.find((s) => s.origin_url === url)!;
      return {
        status: 200,
        contentType: "text/html",
        body: card(s, "Archive overlap", 27, "/overlap"),
      };
    },
    start - 3 * 3600000,
  );
  await persistLiveRecoveryCheckpoints({
    root: r,
    observedAt: seed.observed_at,
    snapshots: seed.source_snapshots,
  });
  const fetchPage: FetchPage = async (url) => {
    const s = assets.registry.sources.find(
      (s) => new URL(s.origin_url).hostname === new URL(url).hostname,
    )!;
    return {
      status: 200,
      contentType: "text/html",
      body:
        url === s.origin_url
          ? card(s, "Archive overlap", 27, "/overlap") + next(s, 2)
          : card(s, "Older article", 26, "/older") + next(s, 3),
    };
  };
  const at = new Date(start + 60000);
  const service = new ResearchSourceMonitorService({
    root: r,
    now: () => at,
    fetchPage,
    collect: async (channel, cutoff, options) => ({
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
    }),
  });
  await service.initialize();
  await service.tick();
  await service.waitForCurrentWork();
  const result = JSON.parse(
    await readFile(
      path.join(passDir(intervalDir(r, day), iso(start)), "result.json"),
      "utf8",
    ),
  ) as DiscoveryResult;
  for (const s of result.source_snapshots.filter((s) =>
    CORE_SOURCE_IDS.includes(s.source_id),
  ))
    expect(s).toMatchObject({
      pagination_remaining: false,
      cap_truncated: false,
      recovery_traversal: { overlap_verified: true, pagination_complete: true },
    });
});

it("transition exclusion keeps 9/30 evidence/evaluator intact and excludes only rev6 from formal analysis", async () => {
  const f = await cleanDay(false, true),
    e = evaluation(f.summary);
  const transition = { ...e, date: "2026-09-30" };
  const rev5 = { ...transition, protocol_revision: 5 as const };
  const repaired = { ...e, date: "2026-10-01" };
  const bytes = JSON.stringify([transition, rev5, repaired]);
  expect(transition.metrics.replacement_scoring_eligible).toBe(true);
  expect(researchAnalysisEvaluations([transition, rev5, repaired])).toEqual([
    rev5,
    repaired,
  ]);
  expect(JSON.stringify([transition, rev5, repaired])).toBe(bytes);
});

it("strict recovery rejects an unresolved control on the deterministic overlap page", async () => {
  const r = await root(),
    assets = await loadPinnedResearchAssets(6),
    source = assets.registry.sources.find(
      (s) => s.source_id === "eatbook_deals",
    )!;
  const seed = await capture(r, [source], async () => ({
    status: 200,
    contentType: "text/html",
    body: card(source, "Archive overlap", 27, "/overlap"),
  }));
  await persistLiveRecoveryCheckpoints({
    root: r,
    observedAt: seed.observed_at,
    snapshots: seed.source_snapshots,
  });
  const recovery = await recoverDiscovery({
    root: r,
    dir: intervalDir(r, day),
    date: day,
    registry: { ...assets.registry, sources: [source] },
    now: () => iso(end),
    fetchPage: async (url) => ({
      status: 200,
      contentType: "text/html",
      body:
        url === source.origin_url
          ? card(source, "Archive overlap", 27, "/overlap") + next(source, 2)
          : card(source, "Older article", 26, "/older") +
            "<button>Load More</button>",
    }),
  });
  expect(recovery!.sources[0]).toMatchObject({
    status: "partial",
    proof: {
      crossed_checkpoint: true,
      overlap_verified: true,
      pagination_complete: false,
    },
  });
  expect(recovery!.sources[0].proof.reasons).toContain(
    "required_pagination_unresolved",
  );
});

it("complete morning recovery covers the actual missed slot while later live passes complete the day", async () => {
  const f = await cleanDay(true);
  const recovery = await recoverDiscovery({
    root: f.r,
    dir: f.dir,
    date: day,
    registry: f.registry,
    now: () => iso(start + 9 * 3600000),
    fetchPage: ambiguousFetch(f.registry.sources),
  });
  expect(
    recovery!.sources
      .filter((s) => CORE_SOURCE_IDS.includes(s.source_id))
      .every((s) => s.status === "complete"),
  ).toBe(true);
  expect(recovery!.sources[0].window_end).toBe(iso(start + 9 * 3600000));
  const summary = await summarizeRev6Acquisition(f.dir, day, f.registry);
  expect(summary).toMatchObject({
    core_content_complete: true,
    core_cadence_complete: false,
    all_registry_content_complete: false,
  });
  expect(evaluation(summary, false).metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: false,
  });
});
