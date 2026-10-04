import { describe, expect, it } from "vitest";
import {
  auditSample,
  cumulativeMetrics,
  evaluateInterval,
  type BenchmarkOffer,
  type CandidateForReview,
  type RawPostForReview,
  type Reviews,
} from "../scripts/research/source-monitor/evaluation";

const candidate: CandidateForReview = {
  candidate_id: "offer-a",
  first_seen_at: "2026-09-24T16:10:00Z",
  inspectable: true,
};
const post: RawPostForReview = {
  channel: "sgfooddeals",
  message_id: 12,
  first_seen_at: "2026-09-24T17:00:00Z",
  published_at: "2026-09-24T16:45:00Z",
  text: "Shop offer",
  permalink: "https://t.me/sgfooddeals/12",
};
const offer: BenchmarkOffer = {
  benchmark_id: "sgfooddeals:12:offer-1",
  post_ids: ["sgfooddeals:12"],
  first_seen_at: post.first_seen_at,
  merchant: "Shop",
  offer: "Two for one",
  start_date: null,
  end_date: null,
  location: "Singapore store",
  eligibility: null,
  redemption_method: null,
  evidence_summary: "Observed public post",
  eligible: true,
};
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
  ].map((key) => [key, 2]),
);
const reviews: Reviews = {
  validity: {
    complete: true,
    assessments: [
      {
        candidate_id: "offer-a",
        verdict: "valid_current_promotion",
        evidence_reason: "Saved source detail confirms current offer",
        fact_scores: scores,
      },
    ],
  },
  benchmark: {
    complete: true,
    posts_reviewed: ["sgfooddeals:12"],
    offers: [offer],
  },
  matches: {
    complete: true,
    assessments: [
      {
        benchmark_id: offer.benchmark_id,
        candidate_id: "offer-a",
        classification: "exact_offer",
        reason: "Same merchant, benefit, and scope",
      },
    ],
  },
};

describe("research review scoring", () => {
  it("requires acquisition and raw benchmark freezes", () => {
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: false,
        rawBenchmarkFrozen: true,
        reviews,
      }),
    ).toThrow("acquisition freeze");
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: false,
        reviews,
      }),
    ).toThrow("raw benchmark freeze");
  });

  it("scores a fully reviewed synchronized interval", () => {
    const result = evaluateInterval({
      date: "2026-09-25",
      candidates: [candidate],
      posts: [post],
      telegramCoverageComplete: true,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews,
    });
    expect(result.metrics).toMatchObject({
      scoring_eligible: true,
      benchmark_offer_count: 1,
      exact_matches: 1,
      probable_matches: 0,
      benchmark_recall: 1,
      benchmark_overlap_rate: 1,
      candidate_validity_precision: 1,
      matched_fact_completeness: 1,
      median_lead_lag_minutes: 50,
    });
    expect(result.scoring_records?.timing[0]).toMatchObject({
      candidate_first_seen_at: candidate.first_seen_at,
      telegram_first_seen_at: post.first_seen_at,
      lead_lag_minutes: 50,
    });
    expect(cumulativeMetrics([result]).synchronized_intervals).toBe(1);
  });

  it("excludes incomplete Telegram coverage from every cumulative scoring denominator", () => {
    const partial = evaluateInterval({
      date: "2026-09-25",
      candidates: [candidate],
      posts: [post],
      telegramCoverageComplete: false,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews: { validity: reviews.validity },
    });
    expect(partial.metrics.benchmark_recall).toBeNull();
    expect(partial.metrics.pending_review).toContain(
      "incomplete_telegram_coverage",
    );
    expect(cumulativeMetrics([partial])).toMatchObject({
      synchronized_intervals: 0,
      benchmark_offer_count: null,
      candidate_offer_count: null,
      benchmark_recall: null,
    });
  });

  it("excludes a missed daily acquisition from synchronized cumulative scoring", () => {
    const result = evaluateInterval({
      date: "2026-09-25",
      candidates: [candidate],
      posts: [post],
      telegramCoverageComplete: true,
      acquisitionComplete: false,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews,
    });
    expect(result.metrics.pending_review).toContain("incomplete_acquisition");
    expect(result.metrics.benchmark_recall).toBeNull();
    expect(cumulativeMetrics([result]).synchronized_intervals).toBe(0);
  });

  it("rejects incomplete provenance and duplicate assignments", () => {
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: true,
        reviews: {
          ...reviews,
          benchmark: { complete: true, posts_reviewed: [], offers: [offer] },
        },
      }),
    ).toThrow("every raw post");
    const second = { ...offer, benchmark_id: "sgfooddeals:12:offer-2" };
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: true,
        reviews: {
          ...reviews,
          benchmark: {
            complete: true,
            posts_reviewed: ["sgfooddeals:12"],
            offers: [offer, second],
          },
          matches: {
            complete: true,
            assessments: [
              reviews.matches!.assessments[0],
              {
                benchmark_id: second.benchmark_id,
                candidate_id: "offer-a",
                classification: "probable_same_offer",
                reason: "Maybe same",
              },
            ],
          },
        },
      }),
    ).toThrow("One-to-one");
  });

  it("rejects a recovered match to an audited invalid candidate and malformed review JSON", () => {
    const invalid: Reviews = {
      ...reviews,
      validity: {
        complete: true,
        assessments: [
          {
            candidate_id: "offer-a",
            verdict: "expired_or_stale",
            evidence_reason: "Expired before observation",
          },
        ],
      },
    };
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: true,
        reviews: invalid,
      }),
    ).toThrow("failed validity audit");
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [candidate],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: true,
        reviews: {
          validity: { complete: true, assessments: null },
        } as unknown as Reviews,
      }),
    ).toThrow();
    expect(() =>
      evaluateInterval({
        date: "2026-09-25",
        candidates: [{ ...candidate, end_date: "2026-09-20" }],
        posts: [post],
        telegramCoverageComplete: true,
        acquisitionFrozen: true,
        rawBenchmarkFrozen: true,
        reviews: {
          ...reviews,
          benchmark: {
            complete: true,
            posts_reviewed: ["sgfooddeals:12"],
            offers: [{ ...offer, start_date: "2026-09-24" }],
          },
        },
      }),
    ).toThrow("contradictory dates");
  });

  it("takes matched fact scores outside the 50-candidate validity sample", () => {
    const candidates = Array.from({ length: 51 }, (_, index) => ({
      candidate_id: `offer-${index}`,
      first_seen_at: candidate.first_seen_at,
      inspectable: true,
    }));
    const audited = new Set(
      auditSample(candidates.map((item) => item.candidate_id)),
    );
    const unsampled = candidates.find(
      (item) => !audited.has(item.candidate_id),
    )!;
    const base: Reviews = {
      validity: {
        complete: true,
        assessments: [...audited].map((candidate_id) => ({
          candidate_id,
          verdict: "valid_current_promotion",
          evidence_reason: "Source detail checked",
        })),
      },
      benchmark: reviews.benchmark,
      matches: {
        complete: true,
        assessments: [
          {
            benchmark_id: offer.benchmark_id,
            candidate_id: unsampled.candidate_id,
            classification: "exact_offer",
            reason: "Same offer",
            fact_scores: scores,
          },
        ],
      },
    };
    const input = {
      date: "2026-09-25",
      candidates,
      posts: [post],
      telegramCoverageComplete: true,
      acquisitionFrozen: true,
      rawBenchmarkFrozen: true,
      reviews: base,
    };
    expect(evaluateInterval(input).metrics.matched_fact_completeness).toBe(1);
    const missingScores: Reviews = {
      ...base,
      matches: {
        complete: true,
        assessments: [
          {
            benchmark_id: offer.benchmark_id,
            candidate_id: unsampled.candidate_id,
            classification: "exact_offer",
            reason: "Same offer",
          },
        ],
      },
    };
    expect(
      evaluateInterval({ ...input, reviews: missingScores }).metrics
        .matched_fact_completeness,
    ).toBeNull();
  });
});
