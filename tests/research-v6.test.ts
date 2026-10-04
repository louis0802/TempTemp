import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  CORE_SOURCE_IDS,
  loadPinnedResearchAssets,
} from "../scripts/research/source-monitor/protocol";
import {
  runDiscovery,
  mergeCandidateObservations,
  projectCandidatesForSources,
  type CandidateProposal,
  type FetchPage,
} from "../scripts/research/source-monitor/discovery";
import {
  persistLiveRecoveryCheckpoints,
  recoverDiscovery,
  readRecoveries,
  summarizeRev6Acquisition,
  sourceCapabilityAudit,
} from "../scripts/research/source-monitor/recovery";
import { passDir } from "../scripts/research/source-monitor/passes";
import {
  evaluateInterval,
  cumulativeMetrics,
  type Reviews,
} from "../scripts/research/source-monitor/evaluation";
import {
  createTelegramResearchState,
  pollTelegram,
  telegramContentCoverage,
  telegramIntervalCoverage,
  type PreviewCollector,
} from "../scripts/research/source-monitor/telegram";
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
  const r = await mkdtemp(path.join(os.tmpdir(), "research-v6-"));
  roots.push(r);
  return r;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
});
const day = "2026-09-28",
  start = Date.parse("2026-09-27T16:00:00Z"),
  end = start + 86400000;
const iso = (n: number) => new Date(n).toISOString();
function card(id: string, title: string, date: number, href: string) {
  const stamp =
    id === "eatbook_deals"
      ? `${date}th September 2026`
      : `2026-09-${date}T08:00:00+08:00`;
  return `<article class="${id === "confirmgood_deals" ? "item hentry" : id === "eatbook_deals" ? "grid-item" : id === "singpromos_ongoing" ? "mh-loop-item" : ""}"><a href="${href}">${title}</a>${id === "eatbook_deals" ? `<span class="date">${stamp}</span>` : `<time class="entry-date published" datetime="${stamp}"></time>`}</article>`;
}
async function fixtureFetch(recovery = false, cap = false): Promise<FetchPage> {
  const { registry } = await loadPinnedResearchAssets(6);
  return async (url) => {
    const source = registry.sources.find(
      (s) => new URL(s.origin_url).hostname === new URL(url).hostname,
    )!;
    const id = source?.source_id;
    let body = "<main>fixture</main>";
    if (source && (url === source.origin_url || url.includes("/page/"))) {
      body = url.includes("/page/")
        ? card(id, "Older article", 25, "/older")
        : (recovery ? card(id, "Cafe A 1-for-1 Latte", 28, "/fresh") : "") +
          card(id, "Archive overlap", 26, "/overlap");
      if (recovery && CORE_SOURCE_IDS.includes(id) && !url.includes("/page/")) {
        if (cap && id === "eatbook_deals")
          body = card(id, "Cafe A 1-for-1 Latte", 28, "/fresh");
        body += `<a rel="next" href="${source.origin_url.replace(/\/$/, "")}/page/2/">Older Posts</a>`;
      }
    }
    if (new URL(url).pathname === "/fresh")
      body =
        '<meta property="article:published_time" content="2026-09-28T00:00:00Z"><main>Promotion valid 28 Sep to 28 Sep 2026 at participating Singapore stores. Terms apply.</main>';
    return { status: 200, contentType: "text/html", body };
  };
}
const collect: PreviewCollector = async (channel, cutoff, options) => ({
  data: {
    source: channel,
    complete: true,
    coverageStart: cutoff.toUTC().toISO()!,
    completeThrough: options!.now!.toUTC().toISO()!,
    posts:
      options!.now!.toMillis() >= start + 3 * 3600000
        ? [
            {
              messageId: 7,
              publishedAt: iso(start + 2 * 3600000),
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
async function telegram(missed = false) {
  let state = createTelegramResearchState();
  for (const n of [-1, ...Array.from({ length: 25 }, (_, i) => i * 60)]) {
    if (missed && n >= 180 && n < 360) continue;
    state = (
      await pollTelegram(state, {
        revision: 6,
        save: async () => {},
        collect,
        now: () => new Date(start + n * 60000),
      })
    ).state;
  }
  return {
    state,
    content: telegramContentCoverage(state, iso(start), iso(end)),
    coverage: telegramIntervalCoverage(state, iso(start), iso(end), 6)
      .coverage_complete,
  };
}
async function publisherDay(miss = false, cap = false, dailyMissing = false) {
  const r = await root(),
    dir = intervalDir(r, day);
  const { registry } = await loadPinnedResearchAssets(6);
  if (cap)
    registry.sources.find(
      (s) => s.source_id === "eatbook_deals",
    )!.reasonable_per_run_cap.max_pages = 1;
  const sources = registry.sources.filter(
    (s) => s.cadence_class === "fresh_publisher",
  );
  expect(sources).toHaveLength(5);
  for (let h = 0; h < 24; h += 3) {
    if (miss && h === 3) continue;
    const slot = iso(start + h * 3600000),
      folder = passDir(dir, slot);
    const result = await runDiscovery({
      runDir: folder,
      registry: { sources },
      now: () => slot,
      fetchPage: await fixtureFetch(),
      provenance: { observation_mode: "live", scheduled_slot: slot },
    });
    await writeFile(path.join(folder, "result.json"), JSON.stringify(result));
    await writeFile(
      path.join(folder, "pass.json"),
      JSON.stringify({
        scheduled_slot: slot,
        attempted_at: slot,
        completed_at: slot,
        observation_mode: "live",
        source_ids: sources.map((s) => s.source_id),
        outcome: "success",
      }),
    );
    // Offline recovery uses the checkpoint before the missed slot, never a future checkpoint.
    if (h === 0)
      await persistLiveRecoveryCheckpoints({
        root: r,
        observedAt: slot,
        snapshots: result.source_snapshots,
      });
  }
  const selected = dailyMissing ? registry : { ...registry, sources };
  let recovery = null;
  if (miss)
    recovery = await recoverDiscovery({
      root: r,
      dir,
      date: day,
      registry: selected,
      now: () => iso(end),
      fetchPage: await fixtureFetch(true, cap),
    });
  return {
    root: r,
    dir,
    registry: selected,
    recovery,
    summary: await summarizeRev6Acquisition(dir, day, selected),
  };
}
function reviewed(
  candidates: CandidateProposal[],
  match: CandidateProposal | null = null,
): Reviews {
  return {
    validity: {
      complete: true,
      assessments: candidates.map((c) => ({
        candidate_id: c.candidate_id,
        verdict: "valid_current_promotion",
        evidence_reason: "Reviewed only this frozen projection",
      })),
    },
    benchmark: {
      complete: true,
      posts_reviewed: ["sgfooddeals:7"],
      offers: [
        {
          benchmark_id: "b",
          post_ids: ["sgfooddeals:7"],
          first_seen_at: iso(start + 4 * 3600000),
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
        match
          ? {
              benchmark_id: "b",
              candidate_id: match.candidate_id,
              classification: "probable_same_offer",
              reason: "Core evidence supports merchant and benefit",
            }
          : {
              benchmark_id: "b",
              candidate_id: null,
              classification: "no_match",
              reason: "Not observed in this cohort",
              miss_diagnosis: {
                classification: "no_independent_source_found",
                reason: "No cohort match",
              },
            },
      ],
    },
  };
}
function score(
  summary: Awaited<ReturnType<typeof summarizeRev6Acquisition>>,
  content = true,
  coverage = true,
) {
  return evaluateInterval({
    protocolRevision: 6,
    date: day,
    candidates: summary.candidates,
    posts: [
      {
        channel: "sgfooddeals",
        message_id: 7,
        first_seen_at: iso(start + 4 * 3600000),
        published_at: iso(start + 2 * 3600000),
        text: "Cafe 1-for-1",
        permalink: "https://t.me/sgfooddeals/7",
        observation_mode: "live",
      },
    ],
    coreContentComplete: summary.core_content_complete,
    coreCadenceComplete: summary.core_cadence_complete,
    allRegistryContentComplete: summary.all_registry_content_complete,
    allRegistryCadenceComplete: summary.all_registry_cadence_complete,
    telegramContentComplete: content,
    telegramCoverageComplete: coverage,
    acquisitionFrozen: true,
    rawBenchmarkFrozen: true,
    reviews: reviewed(summary.core_candidates),
  });
}
it("A: actual five publishers and both Telegram channels complete a clean live day", async () => {
  const { summary } = await publisherDay();
  const tg = await telegram();
  expect(tg).toMatchObject({ content: true, coverage: true });
  expect(
    summary.source_snapshots
      .filter((s) => CORE_SOURCE_IDS.includes(s.source_id))
      .flatMap((s) => s.incomplete_reasons),
  ).toEqual([]);
  expect(summary).toMatchObject({
    core_content_complete: true,
    core_cadence_complete: true,
  });
  expect(score(summary, tg.content, tg.coverage).metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: true,
  });
});
it("B/H: five publishers miss a slot; three prove recovery, two stay partial; restart is idempotent", async () => {
  const f = await publisherDay(true);
  const tg = await telegram(true);
  expect(
    Object.fromEntries(f.recovery!.sources.map((s) => [s.source_id, s.status])),
  ).toEqual({
    confirmgood_deals: "complete",
    eatbook_deals: "complete",
    everydayonsales_food: "complete",
    singpromos_ongoing: "partial",
    mustsharenews_deals: "partial",
  });
  expect(f.summary).toMatchObject({
    core_content_complete: true,
    all_registry_content_complete: false,
    core_cadence_complete: false,
    all_registry_cadence_complete: false,
  });
  const e = score(f.summary, tg.content, tg.coverage);
  expect(e.metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: false,
  });
  expect(e.revision6?.core_same_offer_recall).toBe(0);
  const fetchPage = vi.fn(await fixtureFetch(true));
  await recoverDiscovery({
    root: f.root,
    dir: f.dir,
    date: day,
    registry: f.registry,
    now: () => iso(end),
    fetchPage,
  });
  expect(fetchPage).not.toHaveBeenCalled();
  expect(f.summary.core_candidates.length).toBeGreaterThan(0);
  for (const candidate of f.summary.candidates)
    expect(
      new Set(candidate.occurrences.map((o) => JSON.stringify(o))).size,
    ).toBe(candidate.occurrences.length);
  expect(await readRecoveries(f.dir)).toHaveLength(1);
  expect(await summarizeRev6Acquisition(f.dir, day, f.registry)).toEqual(
    f.summary,
  );
});
it("C: Eatbook cap before checkpoint blocks core replacement", async () => {
  const f = await publisherDay(true, true);
  expect(
    f.recovery!.sources.find((s) => s.source_id === "eatbook_deals"),
  ).toMatchObject({
    status: "partial",
    proof: { cap_truncated: true, crossed_checkpoint: false },
  });
  expect(f.summary.core_content_complete).toBe(false);
  expect(score(f.summary).metrics.replacement_scoring_eligible).toBe(false);
});
it("F: missed supplemental daily/static passes remain visible without blocking core", async () => {
  const f = await publisherDay(false, false, true);
  expect(f.summary).toMatchObject({
    core_content_complete: true,
    core_cadence_complete: true,
    all_registry_content_complete: false,
    all_registry_cadence_complete: false,
  });
  expect(f.summary.supplemental_missing_passes.length).toBeGreaterThan(0);
  expect(score(f.summary).metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: true,
  });
});
function candidate(source: string, facts = false): CandidateProposal {
  const seen = iso(start + 3600000);
  return {
    candidate_id: "offer",
    source_id: source,
    origin_url: `https://${source}.test/`,
    candidate_url: `https://${source}.test/offer`,
    merchant: "Cafe",
    promotion_name: "Cafe deal",
    offer: "1-for-1",
    start_date: facts ? day : null,
    end_date: facts ? day : null,
    location: facts ? "Singapore outlet" : null,
    eligibility: facts ? "Members" : null,
    redemption_method: facts ? "Show code" : null,
    inspectable: true,
    evidence_summary: facts
      ? "Cafe 1-for-1 members show code at Singapore outlet, 28 September 2026"
      : "Cafe 1-for-1",
    extraction_confidence: "medium",
    temporal_basis: "current",
    source_snapshot_hash: source,
    seen_at: seen,
    first_seen_at: seen,
    observation_mode: "live",
    occurrences: [
      {
        source_id: source,
        url: `https://${source}.test/offer`,
        seen_at: seen,
        source_snapshot_hash: source,
        observation_mode: "live",
      },
    ],
  };
}
function isolatedScore(
  candidates: CandidateProposal[],
  coreMatch: boolean,
  coreComplete = true,
) {
  const core = projectCandidatesForSources(candidates, CORE_SOURCE_IDS),
    supplemental = projectCandidatesForSources(candidates, [
      "singpromos_ongoing",
    ]);
  const primaryReviews = reviewed(core, coreMatch ? core[0] : null);
  if (coreMatch)
    primaryReviews.matches!.assessments[0].fact_scores = {
      merchant: 2,
      promotion_name: 2,
      offer: 2,
      discount_value: 2,
      start_date: 0,
      end_date: 0,
      location: 0,
      eligibility: 0,
      redemption_method: 0,
      important_terms: 0,
    };
  const supplementalReviews = reviewed(supplemental, supplemental[0]);
  if (supplemental[0])
    supplementalReviews.matches!.assessments[0].fact_scores =
      Object.fromEntries(
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
        ].map((k) => [k, 2]),
      );
  return evaluateInterval({
    protocolRevision: 6,
    date: day,
    candidates,
    posts: [
      {
        channel: "sgfooddeals",
        message_id: 7,
        first_seen_at: iso(start + 4 * 3600000),
        published_at: iso(start + 2 * 3600000),
        text: "Cafe 1-for-1",
        permalink: "https://t.me/sgfooddeals/7",
        observation_mode: "live",
      },
    ],
    coreContentComplete: coreComplete,
    coreCadenceComplete: true,
    telegramContentComplete: true,
    telegramCoverageComplete: true,
    acquisitionFrozen: true,
    rawBenchmarkFrozen: true,
    reviews: primaryReviews,
    supplementalReviews,
  });
}
it("D/J: supplemental-only match produces zero core recall, separately observed match", () => {
  const e = isolatedScore([candidate("singpromos_ongoing", true)], false);
  expect(e.revision6).toMatchObject({
    core_same_offer_recall: 0,
    core_same_offer_recovered: 0,
    supplemental_observed_matches: 1,
    supplemental_only_matches: 1,
  });
  expect(cumulativeMetrics([e])).toMatchObject({
    replacement: { replacement_intervals: 0 },
    revision6: { core_replacement_intervals: 1, core_same_offer_recall: 0 },
  });
});
it("E/K: merged supplemental facts cannot leak into core evidence, identity or fact scoring", () => {
  const c = candidate("confirmgood_deals"),
    s = candidate("singpromos_ongoing", true);
  const merged = mergeCandidateObservations([c, s]);
  const [projected] = projectCandidatesForSources(merged, CORE_SOURCE_IDS);
  expect(projected).toMatchObject({
    location: null,
    start_date: null,
    end_date: null,
    eligibility: null,
    redemption_method: null,
    evidence_summary: "Cafe 1-for-1",
  });
  expect(
    projected.occurrences.every((o) => o.source_id === "confirmgood_deals"),
  ).toBe(true);
  expect(projected.candidate_id).toBe(
    projectCandidatesForSources([c], CORE_SOURCE_IDS)[0].candidate_id,
  );
  const e = isolatedScore(merged, true);
  expect(e.revision6).toMatchObject({
    core_same_offer_recovered: 1,
    supplemental_only_matches: 0,
    core_matched_fact_completeness: 0,
  });
  const core = projectCandidatesForSources(merged, CORE_SOURCE_IDS);
  const reviews = reviewed(core, core[0]);
  reviews.matches!.assessments[0].candidate_id = merged[0].candidate_id;
  expect(() =>
    evaluateInterval({
      protocolRevision: 6,
      date: day,
      candidates: merged,
      posts: [
        {
          channel: "sgfooddeals",
          message_id: 7,
          first_seen_at: iso(start + 4 * 3600000),
          published_at: iso(start + 2 * 3600000),
          text: "fixture",
          permalink: "https://t.me/sgfooddeals/7",
        },
      ],
      coreContentComplete: true,
      telegramContentComplete: true,
      telegramCoverageComplete: false,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews,
    }),
  ).toThrow("Unknown matched candidate");
});
it("I/L: historical assets remain pinned and all 19 runtime capabilities keep frozen roles", async () => {
  for (const revision of [3, 4, 5] as const)
    expect((await loadPinnedResearchAssets(revision)).protocol.revision).toBe(
      revision,
    );
  const assets = await loadPinnedResearchAssets();
  expect(assets.protocol.revision).toBe(6);
  expect(
    assets.registry.sources
      .filter((s) => s.research_role === "core_replacement")
      .map((s) => s.source_id)
      .sort(),
  ).toEqual([...CORE_SOURCE_IDS].sort());
  const audit = sourceCapabilityAudit(assets.registry);
  expect(audit).toHaveLength(19);
  expect(
    audit
      .filter((s) => s.runtime_catch_up_capability === "complete")
      .map((s) => s.source_id)
      .sort(),
  ).toEqual([...CORE_SOURCE_IDS].sort());
});
async function hashes(dir: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) Object.assign(result, await hashes(p));
    else
      result[p] = createHash("sha256")
        .update(await readFile(p))
        .digest("hex");
  }
  return result;
}
it("G/H/I: offline midnight reconciles rev6 publication day, preserves seals on restart and opens rev6", async () => {
  const r = await root();
  let at = new Date(start - 60000);
  const options = {
    root: r,
    now: () => at,
    collect,
    fetchPage: await fixtureFetch(true),
  };
  await new ResearchSourceMonitorService(options).initialize();
  // Seed proven live history before offline day; recovery uses real archive adapters.
  const { registry } = await loadPinnedResearchAssets(6);
  const seed = await runDiscovery({
    runDir: path.join(r, "seed"),
    registry: {
      sources: registry.sources.filter((s) =>
        CORE_SOURCE_IDS.includes(s.source_id),
      ),
    },
    now: () => iso(start - 60000),
    fetchPage: await fixtureFetch(),
    provenance: { observation_mode: "live" },
  });
  await persistLiveRecoveryCheckpoints({
    root: r,
    observedAt: seed.observed_at,
    snapshots: seed.source_snapshots,
  });
  at = new Date(end + 3600000);
  await new ResearchSourceMonitorService(options).initialize();
  const dir = intervalDir(r, day);
  await verifyObservationSeal(r, day);
  const raw = JSON.parse(
    await readFile(path.join(dir, "telegram-raw.json"), "utf8"),
  );
  expect(raw).toMatchObject({
    content_complete: true,
    coverage_complete: false,
  });
  expect(raw.posts).toHaveLength(2);
  expect(raw.posts[0]).toMatchObject({
    published_at: iso(start + 2 * 3600000),
    first_seen_at: at.toISOString(),
    observation_mode: "catch_up",
  });
  const acq = JSON.parse(
    await readFile(path.join(dir, "acquisition.json"), "utf8"),
  );
  expect(acq).toMatchObject({
    core_content_complete: true,
    core_cadence_complete: false,
    all_registry_content_complete: false,
  });
  expect((await readInterval(r, "2026-09-29")).protocol_revision).toBe(6);
  const priorState = JSON.parse(
    await readFile(path.join(r, "state.json"), "utf8"),
  );
  const before = await hashes(dir),
    checkpoints = await hashes(path.join(r, "recovery-checkpoints"));
  await new ResearchSourceMonitorService(options).initialize();
  expect(await hashes(dir)).toEqual(before);
  const resumedState = JSON.parse(
    await readFile(path.join(r, "state.json"), "utf8"),
  );
  for (const ch of ["sgfooddeals", "tastesoulsg"])
    expect(resumedState.telegram.channels[ch].observations).toEqual(
      priorState.telegram.channels[ch].observations,
    );
  expect(await hashes(path.join(r, "recovery-checkpoints"))).toEqual(
    checkpoints,
  );
  const tracker = await researchTracker(r, at);
  expect(formatResearchTracker(tracker)).toContain(
    "supplemental evidence ≠ primary cohort recovery",
  );
  expect(await hashes(dir)).toEqual(before);
}, 30000);
it("I: active rev5 retains hashes and semantics through close; only new day defaults to rev6", async () => {
  const r = await root();
  let at = new Date(start + 60000);
  const options = {
    root: r,
    now: () => at,
    collect,
    fetchPage: await fixtureFetch(),
  };
  await new ResearchSourceMonitorService({
    ...options,
    protocolRevision: 5,
  }).initialize();
  const original = await readInterval(r, day);
  await new ResearchSourceMonitorService(options).initialize();
  expect(await readInterval(r, day)).toEqual(original);
  at = new Date(end + 60000);
  await new ResearchSourceMonitorService(options).initialize();
  expect(await readInterval(r, day)).toMatchObject({
    protocol_revision: 5,
    protocol_sha256: original.protocol_sha256,
    registry_sha256: original.registry_sha256,
  });
  expect((await readInterval(r, "2026-09-29")).protocol_revision).toBe(6);
  const frozen = await hashes(intervalDir(r, day));
  await new ResearchSourceMonitorService(options).initialize();
  expect(await hashes(intervalDir(r, day))).toEqual(frozen);
}, 30000);

it("B service restart: closes the real five-publisher gap with complete core and partial supplemental recovery", async () => {
  const f = await publisherDay(true, false, true);
  // Initialize before the day (without running the continuous worker), then reconcile the captured passes.
  let at = new Date(start);
  const options = {
    root: f.root,
    now: () => at,
    collect,
    fetchPage: await fixtureFetch(true),
  };
  await new ResearchSourceMonitorService(options).initialize();
  at = new Date(end + 60000);
  await new ResearchSourceMonitorService(options).initialize();
  const frozen = JSON.parse(
    await readFile(path.join(f.dir, "acquisition.json"), "utf8"),
  );
  expect(frozen).toMatchObject({
    core_content_complete: true,
    all_registry_content_complete: false,
    core_cadence_complete: false,
  });
  expect(score(frozen).metrics).toMatchObject({
    replacement_scoring_eligible: true,
    temporal_scoring_eligible: false,
  });
  expect(await readRecoveries(f.dir)).toHaveLength(1);
  const before = await hashes(f.dir);
  await new ResearchSourceMonitorService(options).initialize();
  expect(await hashes(f.dir)).toEqual(before);
}, 30000);
it("Temporal core timing excludes supplemental receipt times and catch-up fact variants", () => {
  const core = candidate("confirmgood_deals"),
    supplemental = candidate("singpromos_ongoing", true);
  supplemental.first_seen_at = iso(start);
  supplemental.seen_at = iso(start);
  supplemental.occurrences[0].seen_at = iso(start);
  const e = isolatedScore(
    mergeCandidateObservations([core, supplemental]),
    true,
  );
  expect(e.revision6).toMatchObject({
    core_live_matched_offers: 1,
    core_lead_lag_minutes: [180],
  });
  const caught = {
    ...core,
    seen_at: iso(start + 2 * 3600000),
    observation_mode: "catch_up" as const,
    occurrences: [
      {
        ...core.occurrences[0],
        seen_at: iso(start + 2 * 3600000),
        observation_mode: "catch_up" as const,
      },
    ],
  };
  const recovered = isolatedScore(
    mergeCandidateObservations([core, caught, supplemental]),
    true,
  );
  expect(recovered.revision6?.core_live_matched_offers).toBe(0);
});

it("Supplemental-only is unknown while core content cannot be scored", () => {
  const e = isolatedScore(
    [candidate("singpromos_ongoing", true)],
    false,
    false,
  );
  expect(e.revision6).toMatchObject({
    core_same_offer_recall: null,
    supplemental_observed_matches: 1,
    supplemental_only_matches: null,
  });
});
