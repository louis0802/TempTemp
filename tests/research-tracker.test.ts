import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  mkdir,
  writeFile,
  readdir,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadPinnedResearchAssets } from "../scripts/research/source-monitor/protocol";
import { createTelegramResearchState } from "../scripts/research/source-monitor/telegram";
import {
  openInterval,
  freezeAcquisition,
  freezeRawBenchmark,
  sealEvaluation,
  intervalDir,
  addPartialReason,
} from "../scripts/research/source-monitor/intervals";
import {
  evaluateInterval,
  type Reviews,
} from "../scripts/research/source-monitor/evaluation";
import {
  researchTracker,
  formatResearchTracker,
} from "../scripts/research/source-monitor/tracker";
import { singaporeDayBounds } from "../scripts/research/source-monitor/scheduler";
import type {
  CandidateProposal,
  SourceSnapshot,
} from "../scripts/research/source-monitor/discovery";

const roots: string[] = [];
const now = new Date("2026-09-30T12:00:00Z");
async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "research-tracker-"));
  roots.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const json = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};
const candidate = (at: string): CandidateProposal => ({
  candidate_id: "coffee",
  first_seen_at: at,
  seen_at: at,
  source_id: "singpromos_ongoing",
  origin_url: "https://singpromos.com/",
  candidate_url: "https://singpromos.com/coffee",
  merchant: "McDonald's",
  promotion_name: "$1 Coffee",
  offer: "$1 Coffee",
  start_date: "2026-09-26",
  end_date: "2026-09-30",
  location: "Singapore",
  eligibility: null,
  redemption_method: "in store",
  inspectable: true,
  evidence_summary: "fixture",
  extraction_confidence: "medium",
  temporal_basis: "current",
  source_snapshot_hash: "fixturehash",
  occurrences: [
    {
      source_id: "singpromos_ongoing",
      url: "https://singpromos.com/coffee",
      candidate_url: "https://singpromos.com/coffee",
      seen_at: at,
      source_snapshot_hash: "fixturehash",
    },
  ],
});
const snapshot: SourceSnapshot = {
  source_id: "singpromos_ongoing",
  observed_at: "2026-09-25T16:01:00Z",
  status: "partial",
  enumerable: true,
  pages: [],
  listing_evidence: [],
  detail_inspections: [],
  entries_seen_count: 1,
  cards_evaluated: 1,
  cards_skipped_stale: 0,
  cards_outside_horizon: 0,
  cards_temporal_ambiguous: 1,
  candidate_proposals: 1,
  detail_attempts: 1,
  detail_failures: 1,
  cap_truncated: true,
  pagination_remaining: true,
  listing_failure: false,
  extraction_incomplete: true,
  incomplete_reasons: ["registered_category_or_tab_routes_not_traversed"],
  errors: ["Response exceeds size limit"],
  ordering_observed: "fixture",
  pagination_observed: "fixture",
  freshness_observed: "fixture",
  snapshot_hash: "fixture",
};
async function active(
  dir: string,
  date: string,
  revision: 3 | 4 | 5 = 4,
  late = false,
) {
  const assets = await loadPinnedResearchAssets(revision),
    bounds = singaporeDayBounds(date);
  await openInterval(
    dir,
    date,
    new Date(bounds.start.getTime() + (late ? 3600000 : 0)).toISOString(),
    assets.protocolSha256,
    assets.registrySha256,
    revision,
  );
  const telegram = createTelegramResearchState();
  telegram.channels.sgfooddeals.observations.push({
    channel: "sgfooddeals",
    message_id: 1,
    first_seen_at: new Date(bounds.start.getTime() + 3600000).toISOString(),
    published_at: bounds.start.toISOString(),
    text: "fixture",
    permalink: "https://t.me/sgfooddeals/1",
  });
  await json(path.join(dir, "state.json"), {
    schema_version: 1,
    active_interval: date,
    telegram,
    discovery: { last_successful_run_at: null },
  });
}
async function sealed(
  dir: string,
  date: string,
  partial = false,
  offer = "1-for-1 McSpicy",
  revision: 3 | 4 | 5 = 4,
) {
  const assets = await loadPinnedResearchAssets(revision),
    bounds = singaporeDayBounds(date),
    at = bounds.start.toISOString(),
    end = bounds.end.toISOString();
  await openInterval(
    dir,
    date,
    at,
    assets.protocolSha256,
    assets.registrySha256,
    revision,
  );
  if (partial)
    await addPartialReason(dir, date, "incomplete_telegram_coverage");
  const c = candidate(at),
    post = {
      channel: "sgfooddeals" as const,
      message_id: 1,
      first_seen_at: at,
      published_at: at,
      text: offer,
      permalink: "https://t.me/sgfooddeals/1",
    };
  const run = intervalDir(dir, date);
  await freezeAcquisition(
    dir,
    date,
    {
      source_snapshots: [snapshot],
      candidates: [c],
      totals: {},
      partial_reasons: [],
    },
    end,
  );
  await freezeRawBenchmark(
    dir,
    date,
    {
      posts: [post],
      polls: [],
      coverage_gaps: partial ? [{ reason: "missing_slot" }] : [],
      coverage_complete: !partial,
      channel_status: {},
      coverage_note: "fixture",
    },
    end,
  );
  const reviews: Reviews = {
    validity: {
      complete: true,
      assessments: [
        {
          candidate_id: c.candidate_id,
          verdict: "valid_current_promotion",
          evidence_reason: "fixture",
        },
      ],
    },
    benchmark: {
      complete: true,
      posts_reviewed: ["sgfooddeals:1"],
      offers: [
        {
          benchmark_id: `${date}:offer`,
          post_ids: ["sgfooddeals:1"],
          first_seen_at: at,
          merchant: "McDonald's",
          offer,
          start_date: date,
          end_date: date,
          location: "Singapore",
          eligibility: null,
          redemption_method: "in store",
          evidence_summary: "fixture",
          eligible: true,
        },
      ],
    },
    matches: {
      complete: true,
      assessments: [
        {
          benchmark_id: `${date}:offer`,
          candidate_id: null,
          classification: "no_match",
          reason: "Different offer",
          miss_diagnosis: {
            classification: "no_independent_source_found",
            reason: "fixture",
          },
        },
      ],
    },
  };
  await json(
    path.join(run, "reviews", "candidate-validity.json"),
    reviews.validity,
  );
  await json(
    path.join(run, "reviews", "telegram-offers.json"),
    reviews.benchmark,
  );
  await json(path.join(run, "reviews", "matches.json"), reviews.matches);
  await sealEvaluation(
    dir,
    date,
    evaluateInterval({
      date,
      protocolRevision: revision,
      candidates: [c],
      posts: [post],
      telegramCoverageComplete: !partial,
      acquisitionComplete: true,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews,
    }),
    end,
  );
}

describe("read-only source substitution tracker", () => {
  it("handles a fresh repo without creating state", async () => {
    const dir = await root();
    const before = await readdir(dir);
    const t = await researchTracker(dir, now);
    expect(t.current_stage).toBe("S1");
    expect(t.evidence.scored.synchronized_intervals).toBe(0);
    expect(t.blockers).toContain("observation_service_not_initialized");
    expect(t.latest_acquisition.candidates).toBeNull();
    expect(await readdir(dir)).toEqual(before);
    expect(formatResearchTracker(t)).toContain("SOURCE SUBSTITUTION TRACKER");
  });
  it("keeps the active revision 3 rehearsal non-scoring and does not count raw posts as reviewed offers", async () => {
    const dir = await root();
    await active(dir, "2026-09-25", 3, true);
    const before = await readFile(path.join(dir, "state.json"), "utf8");
    const t = await researchTracker(dir, now);
    expect(t.current_stage).toBe("S4");
    expect(t.stages.S4).not.toBe("complete");
    expect(t.observation).toMatchObject({
      configured_protocol_revision: 6,
      active_protocol_revision: 3,
      scoring_eligibility: "non_scoring",
    });
    expect(t.evidence.new_telegram_posts_observed).toBe(1);
    expect(t.evidence.same_offer_matches).toBeNull();
    expect(t.evidence.scored.benchmark_recall).toBeNull();
    expect(await readFile(path.join(dir, "state.json"), "utf8")).toBe(before);
  });
  it("keeps partial sealed intervals out of cumulative recall", async () => {
    const dir = await root();
    await sealed(dir, "2026-09-26", true);
    const t = await researchTracker(dir, now);
    expect(t.observation.scoring_eligibility).toBe("non_scoring");
    expect(t.evidence.scored.synchronized_intervals).toBe(0);
    expect(t.evidence.scored.benchmark_recall).toBeNull();
  });
  it("distinguishes merchant coverage from same-offer coverage on a valid sealed interval", async () => {
    const dir = await root();
    await sealed(dir, "2026-09-26");
    const t = await researchTracker(dir, now);
    expect(t.evidence.scored.synchronized_intervals).toBe(1);
    expect(t.observation.scoring_eligibility).toBe("scored");
    expect(t.current_stage).toBe("S4");
    expect(t.evidence.merchant_coverage).toBe(1);
    expect(t.evidence.same_offer_coverage).toBe(0);
    expect(t.evidence.no_match_cases).toBe(1);
    expect(t.gates.next_gate).toContain(
      "3 core replacement-eligible revision-6",
    );
    expect(t.blockers).toContain(
      "benchmark_sample_sufficiency_requires_researcher_review",
    );
  });
  it("keeps three legacy days separate from the revision-6 replacement gate", async () => {
    const dir = await root();
    for (const date of ["2026-09-26", "2026-09-27", "2026-09-28"])
      await sealed(dir, date);
    const t = await researchTracker(dir, now);
    expect(t.current_stage).toBe("S4");
    expect(t.replacement_evidence.replacement_intervals).toBe(0);
    expect(t.evidence.scored.synchronized_intervals).toBe(3);
    expect(t.stages.S5).toBe("insufficient_evidence");
    expect(t.gates.next_gate).toContain("revision-6");
    expect(t.implementation.production_ingestion_bridge).toBe("not_started");
  });
  it("does not use scored revision-3 days to advance the revision-6 gate", async () => {
    const dir = await root();
    for (const date of ["2026-09-26", "2026-09-27", "2026-09-28"])
      await sealed(dir, date, false, "1-for-1 McSpicy", 3);
    await sealed(dir, "2026-09-29");
    const t = await researchTracker(dir, now);
    expect(t.evidence.scored.synchronized_intervals).toBe(4);
    expect(t.evidence.revision_4_scored.synchronized_intervals).toBe(1);
    expect(t.current_stage).toBe("S4");
    expect(t.gates.next_gate).toContain(
      "3 core replacement-eligible revision-6",
    );
    expect(t.blockers).toContain(
      "fewer_than_3_revision6_core_replacement_eligible_intervals",
    );
    expect(formatResearchTracker(t)).toContain(
      "Revision 4 scored synchronized days: 1",
    );
  });
  it("reports actual source-specific listing support, generic semantic maturity and snapshot limitations", async () => {
    const dir = await root();
    await active(dir, "2026-09-26");
    await json(
      path.join(intervalDir(dir, "2026-09-26"), "discovery-result.json"),
      {
        source_snapshots: [snapshot],
        candidates: [candidate(snapshot.observed_at)],
        totals: {
          incomplete_sources: 1,
          cards_evaluated: 1,
          detail_failures: 1,
        },
      },
    );
    const t = await researchTracker(dir, now),
      adapter = t.adapters.find((a) => a.source_id === "singpromos_ongoing")!;
    expect(adapter).toMatchObject({
      listing_parser_supported: true,
      semantic_extraction: "generic",
      production_ready: false,
    });
    expect(adapter.issues).toEqual(
      expect.arrayContaining([
        "pagination_incomplete",
        "category_routes_untraversed",
        "cap_truncated",
        "temporal_ambiguous",
        "response_size_limit",
      ]),
    );
    expect(
      t.adapters.find((a) => a.source_id === "capitaland_mall_deals")
        ?.listing_parser_supported,
    ).toBe(false);
  });
  it("rejects changed sealed evidence instead of presenting its metrics", async () => {
    const dir = await root();
    await sealed(dir, "2026-09-26");
    await json(path.join(intervalDir(dir, "2026-09-26"), "acquisition.json"), {
      candidates: [],
    });
    await expect(researchTracker(dir, now)).rejects.toThrow();
  });
});
