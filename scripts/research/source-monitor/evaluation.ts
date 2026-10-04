/** Research-only, pure review validation and scoring. No ingestion or database imports. */
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  projectCandidatesForSources,
  type CandidateProposal,
} from "./discovery";
import { CORE_SOURCE_IDS } from "./protocol";

export const VALIDITY = [
  "valid_current_promotion",
  "valid_but_future",
  "expired_or_stale",
  "non_promotion",
  "duplicate",
  "insufficient_evidence",
  "extraction_error",
] as const;
export type ValidityVerdict = (typeof VALIDITY)[number];
export const MATCH_CLASS = [
  "exact_offer",
  "probable_same_offer",
  "related_but_different",
  "no_match",
] as const;
export type MatchClass = (typeof MATCH_CLASS)[number];
export const MISS_CLASS = [
  "source_not_registered",
  "source_registered_but_not_enumerated",
  "below_cap_or_pagination",
  "candidate_extraction_failure",
  "matching_failure",
  "source_published_later",
  "social_only",
  "no_independent_source_found",
  "unknown",
] as const;
export type MissClass = (typeof MISS_CLASS)[number];

export type CandidateForReview = {
  merchant?: string;
  observation_mode?: "live" | "catch_up";
  occurrences?: { seen_at: string; observation_mode?: "live" | "catch_up" }[];
  candidate_id: string;
  first_seen_at: string;
  inspectable: boolean;
  start_date?: string | null;
  end_date?: string | null;
  fact_scores?: Record<string, number>;
};
export type RawPostForReview = {
  observation_mode?: "live" | "catch_up";
  channel: "sgfooddeals" | "tastesoulsg";
  message_id: number;
  first_seen_at: string;
  published_at: string;
  text: string;
  permalink: string;
};
export type ValidityReview = {
  candidate_id: string;
  verdict: ValidityVerdict;
  evidence_reason: string;
  fact_scores?: Record<string, number>;
};
export type BenchmarkOffer = {
  benchmark_id: string;
  post_ids: string[];
  first_seen_at: string;
  merchant: string;
  offer: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  eligibility: string | null;
  redemption_method: string | null;
  evidence_summary: string;
  eligible: boolean;
  exclusion_reason?: string;
};
export type MatchReview = {
  benchmark_id: string;
  candidate_id: string | null;
  classification: MatchClass;
  reason: string;
  fact_scores?: Record<string, number>;
  miss_diagnosis?: {
    classification: MissClass;
    reason: string;
    diagnostic_source_url?: string | null;
  };
};
export type Reviews = {
  validity?: { complete: true; assessments: ValidityReview[] };
  benchmark?: {
    complete: true;
    posts_reviewed: string[];
    offers: BenchmarkOffer[];
  };
  matches?: { complete: true; assessments: MatchReview[] };
};
const reviewSchema = z.object({
  validity: z
    .object({
      complete: z.literal(true),
      assessments: z.array(
        z.object({
          candidate_id: z.string().min(1),
          verdict: z.enum(VALIDITY),
          evidence_reason: z.string().min(1),
          fact_scores: z
            .record(z.string(), z.number().int().min(0).max(2))
            .optional(),
        }),
      ),
    })
    .optional(),
  benchmark: z
    .object({
      complete: z.literal(true),
      posts_reviewed: z.array(z.string()),
      offers: z.array(
        z.object({
          benchmark_id: z.string().min(1),
          post_ids: z.array(z.string()),
          first_seen_at: z.string(),
          merchant: z.string(),
          offer: z.string(),
          start_date: z.string().nullable(),
          end_date: z.string().nullable(),
          location: z.string().nullable(),
          eligibility: z.string().nullable(),
          redemption_method: z.string().nullable(),
          evidence_summary: z.string(),
          eligible: z.boolean(),
          exclusion_reason: z.string().optional(),
        }),
      ),
    })
    .optional(),
  matches: z
    .object({
      complete: z.literal(true),
      assessments: z.array(
        z.object({
          benchmark_id: z.string().min(1),
          candidate_id: z.string().nullable(),
          classification: z.enum(MATCH_CLASS),
          reason: z.string().min(1),
          fact_scores: z
            .record(z.string(), z.number().int().min(0).max(2))
            .optional(),
          miss_diagnosis: z
            .object({
              classification: z.enum(MISS_CLASS),
              reason: z.string().min(1),
              diagnostic_source_url: z.string().nullable().optional(),
            })
            .optional(),
        }),
      ),
    })
    .optional(),
});

export type DailyMetrics = {
  replacement_scoring_eligible?: boolean;
  temporal_scoring_eligible?: boolean;
  scoring_eligible: boolean;
  pending_review: string[];
  benchmark_offer_count: number | null;
  candidate_offer_count: number;
  exact_matches: number | null;
  probable_matches: number | null;
  benchmark_recall: number | null;
  benchmark_overlap_rate: number | null;
  candidate_validity_precision: number | null;
  candidate_inspectable_rate: number | null;
  matched_fact_completeness: number | null;
  source_coverage_misses: number | null;
  enumeration_misses: number | null;
  extraction_misses: number | null;
  matching_misses: number | null;
  median_lead_lag_minutes: number | null;
  timing_resolution:
    | "daily_acquisition_vs_hourly_telegram"
    | "tiered_acquisition_vs_hourly_telegram";
  timing_note: string;
};
export type Evaluation = {
  revision6?: ReturnType<typeof revision6MetricNames> & {
    core_content_complete: boolean;
    core_cadence_complete: boolean;
    all_registry_content_complete: boolean;
    all_registry_cadence_complete: boolean;
    telegram_content_complete: boolean;
    telegram_coverage_complete: boolean;
    supplemental_candidates: number;
    supplemental_observed_matches: number | null;
    supplemental_only_matches: number | null;
    supplemental_sources_contributing_matches: string[];
  };
  protocol_revision?: 3 | 4 | 5 | 6;
  replacement_metrics?: DailyMetrics & {
    same_offer_recovered: number | null;
    merchant_coverage: number | null;
    catch_up_recovered_offers: number;
  };
  replacement_records?: Evaluation["scoring_records"];
  replacement_catch_up_benchmark_ids?: string[];
  replacement_merchants?: { benchmark: string[]; recovered: string[] };
  temporal_metrics?: {
    live_matched_offers: number;
    lead_lag_minutes: number[];
    observation_coverage_complete: boolean;
  };

  date: string;
  metrics: DailyMetrics;
  scoring_records: {
    candidate_ids: string[];
    benchmark_ids: string[];
    exact: { benchmark_id: string; candidate_id: string }[];
    probable: { benchmark_id: string; candidate_id: string }[];
    validity: ValidityReview[];
    inspectable_candidate_ids: string[];
    fact_scored_candidate_ids: string[];
    fact_complete_candidate_ids: string[];
    misses: { benchmark_id: string; classification: MissClass }[];
    timing: {
      benchmark_id: string;
      candidate_id: string;
      candidate_first_seen_at: string;
      telegram_first_seen_at: string;
      lead_lag_minutes: number;
    }[];
  } | null;
};

const ratio = (n: number, d: number) => (d ? n / d : null);
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const observed = (post: RawPostForReview) =>
  `${post.channel}:${post.message_id}`;
const ms = (value: string) => {
  const result = Date.parse(value);
  if (!Number.isFinite(result) || !value.endsWith("Z"))
    throw new Error(`Invalid UTC instant: ${value}`);
  return result;
};
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

export function auditSample(candidateIds: string[]) {
  return candidateIds.length <= 50
    ? [...candidateIds].sort()
    : [...candidateIds]
        .sort((a, b) => sha(a).localeCompare(sha(b)))
        .slice(0, 50)
        .sort();
}

const FACT_FIELDS = [
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
];
function factComplete(scores?: Record<string, number>) {
  if (!factScoresPresent(scores)) return false;
  return (
    FACT_FIELDS.reduce((sum, field) => sum + scores[field], 0) >= 16 &&
    [
      "merchant",
      "offer",
      "discount_value",
      "location",
      "redemption_method",
    ].every((field) => scores[field] === 2)
  );
}
function factScoresPresent(
  scores?: Record<string, number>,
): scores is Record<string, number> {
  return (
    !!scores && FACT_FIELDS.every((field) => [0, 1, 2].includes(scores[field]))
  );
}

export function evaluateInterval(input: {
  protocolRevision?: 3 | 4 | 5 | 6;
  date: string;
  candidates: CandidateForReview[];
  posts: RawPostForReview[];
  coreContentComplete?: boolean;
  coreCadenceComplete?: boolean;
  allRegistryContentComplete?: boolean;
  allRegistryCadenceComplete?: boolean;
  supplementalReviews?: Reviews;
  telegramContentComplete?: boolean;
  acquisitionContentComplete?: boolean;
  telegramCoverageComplete: boolean;
  acquisitionComplete?: boolean;
  acquisitionFrozen: boolean;
  rawBenchmarkFrozen: boolean;
  reviews: Reviews;
}): Evaluation {
  if (input.protocolRevision === 6) return evaluateRevision6(input);
  if (input.protocolRevision === 5) return evaluateRevision5(input);
  if (!input.acquisitionFrozen)
    throw new Error("Cannot evaluate before acquisition freeze");
  if (!input.rawBenchmarkFrozen)
    throw new Error("Cannot evaluate before raw benchmark freeze");
  reviewSchema.parse(input.reviews);
  const candidates = input.candidates;
  if (!unique(candidates.map((c) => c.candidate_id)))
    throw new Error("Duplicate candidate identity");
  for (const candidate of candidates) {
    ms(candidate.first_seen_at);
    for (const date of [candidate.start_date, candidate.end_date])
      if (date != null && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error(`Invalid candidate date: ${candidate.candidate_id}`);
  }
  if (!unique(input.posts.map(observed)))
    throw new Error("Duplicate raw post identity");
  const candidateById = new Map(candidates.map((c) => [c.candidate_id, c]));
  const postById = new Map(input.posts.map((p) => [observed(p), p]));
  const pending: string[] = [];
  if (input.acquisitionComplete === false)
    pending.push("incomplete_acquisition");
  let valid: ValidityReview[] = [];
  if (input.reviews.validity?.complete) {
    valid = input.reviews.validity.assessments;
    const expected = auditSample(candidates.map((c) => c.candidate_id));
    const received = valid.map((a) => a.candidate_id).sort();
    if (JSON.stringify(expected) !== JSON.stringify(received))
      throw new Error(
        "Candidate validity audit must cover the protocol sample exactly once",
      );
    for (const audit of valid) {
      if (!VALIDITY.includes(audit.verdict) || !audit.evidence_reason?.trim())
        throw new Error(`Invalid validity review: ${audit.candidate_id}`);
    }
  } else pending.push("candidate_validity");

  let offers: BenchmarkOffer[] = [];
  if (input.telegramCoverageComplete && input.acquisitionComplete !== false) {
    if (input.reviews.benchmark?.complete) {
      const review = input.reviews.benchmark;
      const allPostIds = [...postById.keys()].sort();
      if (
        JSON.stringify([...review.posts_reviewed].sort()) !==
        JSON.stringify(allPostIds)
      )
        throw new Error(
          "Benchmark review must cover every raw post exactly once",
        );
      offers = review.offers;
      if (!unique(offers.map((o) => o.benchmark_id)))
        throw new Error("Duplicate benchmark offer identity");
      for (const offer of offers) {
        if (
          !offer.benchmark_id ||
          !offer.post_ids.length ||
          !unique(offer.post_ids) ||
          offer.post_ids.some((id) => !postById.has(id))
        )
          throw new Error(
            `Invalid benchmark provenance: ${offer.benchmark_id}`,
          );
        const first = Math.min(
          ...offer.post_ids.map((id) => ms(postById.get(id)!.first_seen_at)),
        );
        if (ms(offer.first_seen_at) !== first)
          throw new Error(
            `Benchmark first_seen_at changed: ${offer.benchmark_id}`,
          );
        if (
          !offer.merchant?.trim() ||
          !offer.offer?.trim() ||
          !offer.evidence_summary?.trim() ||
          (!offer.eligible && !offer.exclusion_reason)
        )
          throw new Error(`Incomplete benchmark offer: ${offer.benchmark_id}`);
      }
    } else pending.push("telegram_offers");
  } else if (!input.telegramCoverageComplete)
    pending.push("incomplete_telegram_coverage");

  const eligible = offers.filter((o) => o.eligible);
  let matches: MatchReview[] = [];
  if (
    input.telegramCoverageComplete &&
    input.acquisitionComplete !== false &&
    input.reviews.benchmark?.complete
  ) {
    if (input.reviews.matches?.complete) {
      matches = input.reviews.matches.assessments;
      if (
        JSON.stringify(matches.map((m) => m.benchmark_id).sort()) !==
        JSON.stringify(eligible.map((o) => o.benchmark_id).sort())
      )
        throw new Error(
          "Match review must cover each eligible benchmark offer exactly once",
        );
      const assigned: string[] = [];
      const audited = new Map(
        valid.map((item) => [item.candidate_id, item.verdict]),
      );
      for (const match of matches) {
        if (
          !MATCH_CLASS.includes(match.classification) ||
          !match.reason?.trim()
        )
          throw new Error(`Invalid match: ${match.benchmark_id}`);
        if (
          [
            "exact_offer",
            "probable_same_offer",
            "related_but_different",
          ].includes(match.classification)
        ) {
          if (!match.candidate_id || !candidateById.has(match.candidate_id))
            throw new Error(`Unknown matched candidate: ${match.benchmark_id}`);
          if (match.classification !== "related_but_different") {
            const candidate = candidateById.get(match.candidate_id)!;
            const benchmark = eligible.find(
              (item) => item.benchmark_id === match.benchmark_id,
            )!;
            if (
              (candidate.end_date &&
                benchmark.start_date &&
                candidate.end_date < benchmark.start_date) ||
              (candidate.start_date &&
                benchmark.end_date &&
                candidate.start_date > benchmark.end_date)
            )
              throw new Error(
                `Matched candidate has contradictory dates: ${match.candidate_id}`,
              );
            const verdict = audited.get(match.candidate_id);
            if (
              verdict &&
              verdict !== "valid_current_promotion" &&
              verdict !== "valid_but_future"
            )
              throw new Error(
                `Matched candidate failed validity audit: ${match.candidate_id}`,
              );
            assigned.push(match.candidate_id);
          }
        } else if (
          match.candidate_id !== null ||
          !match.miss_diagnosis ||
          !MISS_CLASS.includes(match.miss_diagnosis.classification)
        ) {
          throw new Error(
            `No-match needs a miss diagnosis: ${match.benchmark_id}`,
          );
        }
      }
      if (!unique(assigned))
        throw new Error("One-to-one benchmark assignment required");
    } else pending.push("offer_matching");
  }

  const matched = matches.filter((m) =>
    ["exact_offer", "probable_same_offer"].includes(m.classification),
  );
  const matchedIds = [...new Set(matched.map((m) => m.candidate_id!))];
  const auditScores = new Map(
    valid.map((a) => [a.candidate_id, a.fact_scores]),
  );
  const matchScores = new Map(
    matched.map((m) => [m.candidate_id!, m.fact_scores]),
  );
  const scoresFor = (id: string) =>
    auditScores.get(id) ??
    matchScores.get(id) ??
    candidateById.get(id)?.fact_scores;
  const factScoredIds = matchedIds.filter((id) =>
    factScoresPresent(scoresFor(id)),
  );
  const factCompleteIds = matchedIds.filter((id) =>
    factComplete(scoresFor(id)),
  );
  const offerById = new Map(eligible.map((item) => [item.benchmark_id, item]));
  const timing = matched.map((item) => {
    const candidate = candidateById.get(item.candidate_id!)!;
    const benchmark = offerById.get(item.benchmark_id)!;
    return {
      benchmark_id: item.benchmark_id,
      candidate_id: item.candidate_id!,
      candidate_first_seen_at: candidate.first_seen_at,
      telegram_first_seen_at: benchmark.first_seen_at,
      lead_lag_minutes:
        (ms(benchmark.first_seen_at) - ms(candidate.first_seen_at)) / 60_000,
    };
  });
  const scoring =
    input.telegramCoverageComplete &&
    input.acquisitionComplete !== false &&
    pending.length === 0;
  const misses = matches
    .filter((m) => m.classification === "no_match")
    .map((m) => ({
      benchmark_id: m.benchmark_id,
      classification: m.miss_diagnosis!.classification,
    }));
  const metrics: DailyMetrics = {
    scoring_eligible: scoring,
    pending_review: pending,
    benchmark_offer_count: scoring ? eligible.length : null,
    candidate_offer_count: candidates.length,
    exact_matches: scoring
      ? matches.filter((m) => m.classification === "exact_offer").length
      : null,
    probable_matches: scoring
      ? matches.filter((m) => m.classification === "probable_same_offer").length
      : null,
    benchmark_recall: scoring ? ratio(matched.length, eligible.length) : null,
    benchmark_overlap_rate: scoring
      ? ratio(matchedIds.length, candidates.length)
      : null,
    candidate_validity_precision: valid.length
      ? ratio(
          valid.filter((v) => v.verdict === "valid_current_promotion").length,
          valid.length,
        )
      : null,
    candidate_inspectable_rate: ratio(
      candidates.filter((c) => c.inspectable).length,
      candidates.length,
    ),
    matched_fact_completeness:
      scoring && factScoredIds.length === matchedIds.length
        ? ratio(factCompleteIds.length, matchedIds.length)
        : null,
    source_coverage_misses: scoring
      ? misses.filter((m) =>
          [
            "source_not_registered",
            "source_registered_but_not_enumerated",
          ].includes(m.classification),
        ).length
      : null,
    enumeration_misses: scoring
      ? misses.filter((m) => m.classification === "below_cap_or_pagination")
          .length
      : null,
    extraction_misses: scoring
      ? misses.filter(
          (m) => m.classification === "candidate_extraction_failure",
        ).length
      : null,
    matching_misses: scoring
      ? misses.filter((m) => m.classification === "matching_failure").length
      : null,
    median_lead_lag_minutes: scoring
      ? median(timing.map((item) => item.lead_lag_minutes))
      : null,
    timing_resolution:
      input.protocolRevision === 4
        ? "tiered_acquisition_vs_hourly_telegram"
        : "daily_acquisition_vs_hourly_telegram",
    timing_note:
      input.protocolRevision === 4
        ? "Independent first appearance is bounded by 3-hour publisher or daily directory/campaign observations; Telegram by hourly slots."
        : "Candidate first observed during daily acquisition; Telegram first observed during hourly poll. Comparative timing is bounded by acquisition cadence.",
  };
  return {
    date: input.date,
    metrics,
    scoring_records: scoring
      ? {
          candidate_ids: candidates.map((c) => c.candidate_id),
          benchmark_ids: eligible.map((o) => o.benchmark_id),
          exact: matches
            .filter((m) => m.classification === "exact_offer")
            .map((m) => ({
              benchmark_id: m.benchmark_id,
              candidate_id: m.candidate_id!,
            })),
          probable: matches
            .filter((m) => m.classification === "probable_same_offer")
            .map((m) => ({
              benchmark_id: m.benchmark_id,
              candidate_id: m.candidate_id!,
            })),
          validity: valid,
          inspectable_candidate_ids: candidates
            .filter((c) => c.inspectable)
            .map((c) => c.candidate_id),
          fact_scored_candidate_ids: factScoredIds,
          fact_complete_candidate_ids: factCompleteIds,
          misses,
          timing,
        }
      : null,
  };
}

export function cumulativeMetrics(evaluations: Evaluation[]) {
  return {
    ...strictCumulativeMetrics(
      evaluations.filter((e) => (e.protocol_revision ?? 3) < 5),
    ),
    ...revision5MetricFamilies(evaluations),
    revision6: revision6MetricFamilies(evaluations),
  };
}
function strictCumulativeMetrics(evaluations: Evaluation[]) {
  const scored = evaluations.flatMap((e) =>
    e.scoring_records ? [e.scoring_records] : [],
  );
  const candidates = new Set(scored.flatMap((s) => s.candidate_ids));
  const benchmarks = new Set(scored.flatMap((s) => s.benchmark_ids));
  const exact = new Map(
    scored.flatMap((s) => s.exact.map((m) => [m.benchmark_id, m] as const)),
  );
  const probable = new Map(
    scored.flatMap((s) => s.probable.map((m) => [m.benchmark_id, m] as const)),
  );
  const matched = new Set(
    [...exact.values(), ...probable.values()].map((m) => m.candidate_id),
  );
  const audits = new Map(
    scored.flatMap((s) => s.validity.map((v) => [v.candidate_id, v] as const)),
  );
  const inspectable = new Set(
    scored.flatMap((s) => s.inspectable_candidate_ids),
  );
  const factScored = new Set(
    scored.flatMap((s) => s.fact_scored_candidate_ids),
  );
  const complete = new Set(
    scored.flatMap((s) => s.fact_complete_candidate_ids),
  );
  const misses = new Map(
    scored.flatMap((s) =>
      s.misses.map((m) => [m.benchmark_id, m.classification] as const),
    ),
  );
  const timing = new Map(
    scored.flatMap((s) =>
      s.timing.map((item) => [item.benchmark_id, item] as const),
    ),
  );
  return {
    synchronized_intervals: scored.length,
    benchmark_offer_count: scored.length ? benchmarks.size : null,
    candidate_offer_count: scored.length ? candidates.size : null,
    exact_matches: scored.length ? exact.size : null,
    probable_matches: scored.length ? probable.size : null,
    benchmark_recall: scored.length
      ? ratio(
          new Set([...exact.keys(), ...probable.keys()]).size,
          benchmarks.size,
        )
      : null,
    benchmark_overlap_rate: scored.length
      ? ratio(matched.size, candidates.size)
      : null,
    candidate_validity_precision: scored.length
      ? ratio(
          [...audits.values()].filter(
            (v) => v.verdict === "valid_current_promotion",
          ).length,
          audits.size,
        )
      : null,
    candidate_inspectable_rate: scored.length
      ? ratio(inspectable.size, candidates.size)
      : null,
    matched_fact_completeness:
      scored.length && [...matched].every((id) => factScored.has(id))
        ? ratio(
            [...matched].filter((id) => complete.has(id)).length,
            matched.size,
          )
        : null,
    source_coverage_misses: scored.length
      ? [...misses.values()].filter((m) =>
          [
            "source_not_registered",
            "source_registered_but_not_enumerated",
          ].includes(m),
        ).length
      : null,
    enumeration_misses: scored.length
      ? [...misses.values()].filter((m) => m === "below_cap_or_pagination")
          .length
      : null,
    extraction_misses: scored.length
      ? [...misses.values()].filter((m) => m === "candidate_extraction_failure")
          .length
      : null,
    matching_misses: scored.length
      ? [...misses.values()].filter((m) => m === "matching_failure").length
      : null,
    median_lead_lag_minutes: scored.length
      ? median([...timing.values()].map((item) => item.lead_lag_minutes))
      : null,
    timing_note:
      "Comparative timing is bounded by each interval protocol: revision 3 daily acquisition; revision 4 tiered 3-hour/daily acquisition versus hourly Telegram.",
  };
}

function evaluateRevision5(
  input: Parameters<typeof evaluateInterval>[0],
): Evaluation {
  const replacement = evaluateInterval({
    ...input,
    protocolRevision: 4,
    telegramCoverageComplete: input.telegramContentComplete === true,
    acquisitionComplete: input.acquisitionContentComplete === true,
  });
  const replacementEligible = replacement.metrics.scoring_eligible;
  const temporalEligible =
    replacementEligible &&
    input.telegramCoverageComplete &&
    input.acquisitionComplete === true;
  const candidates = new Map(input.candidates.map((c) => [c.candidate_id, c]));
  const posts = new Map(input.posts.map((p) => [observed(p), p]));
  const offers = new Map(
    (input.reviews.benchmark?.offers ?? []).map((o) => [o.benchmark_id, o]),
  );
  const allRecords = replacement.scoring_records;
  const liveTiming = (allRecords?.timing ?? []).filter((t) => {
    const c = candidates.get(t.candidate_id)!;
    const firstLive =
      c.occurrences?.some(
        (o) =>
          o.observation_mode === "live" &&
          ms(o.seen_at) === ms(c.first_seen_at),
      ) ?? c.observation_mode === "live";
    const benchmark = offers.get(t.benchmark_id)!;
    return (
      firstLive &&
      benchmark.post_ids.every(
        (id) => posts.get(id)?.observation_mode === "live",
      )
    );
  });
  const matched = [
    ...(allRecords?.exact ?? []),
    ...(allRecords?.probable ?? []),
  ];
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const benchmarkMerchants = [
    ...new Set(
      (input.reviews.benchmark?.offers ?? [])
        .filter((o) => o.eligible)
        .map((o) => normalize(o.merchant)),
    ),
  ];
  const independentMerchants = new Set(
    input.candidates.map((c) => normalize(c.merchant ?? "")),
  );
  const recoveredMerchants = benchmarkMerchants.filter((m) =>
    independentMerchants.has(m),
  );
  const catchUpIds = matched
    .filter((m) => {
      const c = candidates.get(m.candidate_id)!;
      return (
        c.observation_mode === "catch_up" ||
        c.occurrences?.some((o) => o.observation_mode === "catch_up") ||
        offers
          .get(m.benchmark_id)!
          .post_ids.some((id) => posts.get(id)?.observation_mode === "catch_up")
      );
    })
    .map((m) => m.benchmark_id);
  const contentRecords = allRecords ? { ...allRecords, timing: [] } : null;
  const strictRecords =
    temporalEligible && allRecords
      ? { ...allRecords, timing: liveTiming }
      : null;
  // Legacy fields remain strict: content-only records live under explicitly named fields.
  const strict = temporalEligible
    ? replacement.metrics
    : evaluateInterval({
        ...input,
        protocolRevision: 4,
        telegramCoverageComplete: false,
        acquisitionComplete: false,
      }).metrics;
  return {
    date: input.date,
    protocol_revision: 5,
    metrics: {
      ...strict,
      scoring_eligible: temporalEligible,
      replacement_scoring_eligible: replacementEligible,
      temporal_scoring_eligible: temporalEligible,
      median_lead_lag_minutes: temporalEligible
        ? median(liveTiming.map((t) => t.lead_lag_minutes))
        : null,
      timing_note:
        "Revision 5: live receipt evidence only; content recovered does not restore live coverage.",
    },
    scoring_records: strictRecords,
    replacement_records: contentRecords,
    replacement_catch_up_benchmark_ids: catchUpIds,
    replacement_merchants: replacementEligible
      ? { benchmark: benchmarkMerchants, recovered: recoveredMerchants }
      : undefined,
    replacement_metrics: {
      ...replacement.metrics,
      pending_review: replacement.metrics.pending_review.map((reason) =>
        reason === "incomplete_telegram_coverage"
          ? "incomplete_telegram_content"
          : reason === "incomplete_acquisition"
            ? "incomplete_acquisition_content"
            : reason,
      ),
      scoring_eligible: temporalEligible,
      replacement_scoring_eligible: replacementEligible,
      temporal_scoring_eligible: temporalEligible,
      median_lead_lag_minutes: null,
      same_offer_recovered: replacementEligible ? matched.length : null,
      merchant_coverage: replacementEligible
        ? ratio(recoveredMerchants.length, benchmarkMerchants.length)
        : null,
      catch_up_recovered_offers: catchUpIds.length,
    },
    temporal_metrics: {
      live_matched_offers: temporalEligible ? liveTiming.length : 0,
      lead_lag_minutes: temporalEligible
        ? liveTiming.map((t) => t.lead_lag_minutes)
        : [],
      observation_coverage_complete:
        input.telegramCoverageComplete && input.acquisitionComplete === true,
    },
  };
}

export function revision5MetricFamilies(evaluations: Evaluation[]) {
  const rev5 = evaluations.filter((e) => e.protocol_revision === 5);
  const replacement = rev5.filter(
    (e) => e.metrics.replacement_scoring_eligible,
  );
  const temporal = rev5.filter((e) => e.metrics.temporal_scoring_eligible);
  const aggregate = strictCumulativeMetrics(
    replacement.map((e) => ({
      date: e.date,
      metrics: e.replacement_metrics!,
      scoring_records: e.replacement_records ?? null,
    })),
  );
  const benchmarks = new Set(
    replacement.flatMap((e) => e.replacement_merchants?.benchmark ?? []),
  );
  const merchants = new Set(
    replacement.flatMap((e) => e.replacement_merchants?.recovered ?? []),
  );
  const timing = temporal.flatMap((e) => e.scoring_records?.timing ?? []);
  return {
    replacement: {
      replacement_intervals: replacement.length,
      benchmark_offer_count: aggregate.benchmark_offer_count,
      same_offer_recovered: replacement.length
        ? new Set(
            replacement.flatMap((e) =>
              [
                ...(e.replacement_records?.exact ?? []),
                ...(e.replacement_records?.probable ?? []),
              ].map((m) => m.benchmark_id),
            ),
          ).size
        : null,
      benchmark_recall: aggregate.benchmark_recall,
      same_offer_coverage: aggregate.benchmark_recall,
      merchant_coverage: ratio(merchants.size, benchmarks.size),
      candidate_validity_precision: aggregate.candidate_validity_precision,
      matched_fact_completeness: aggregate.matched_fact_completeness,
      catch_up_recovered_offers: new Set(
        replacement.flatMap((e) => e.replacement_catch_up_benchmark_ids ?? []),
      ).size,
    },
    temporal: {
      temporal_complete_intervals: temporal.length,
      live_matched_offers: timing.length,
      lead_lag_minutes: timing.map((t) => t.lead_lag_minutes),
      median_lead_lag_minutes: median(timing.map((t) => t.lead_lag_minutes)),
      observation_coverage: ratio(
        rev5.filter((e) => e.temporal_metrics?.observation_coverage_complete)
          .length,
        rev5.length,
      ),
    },
  };
}

function revision6MetricNames(
  families: ReturnType<typeof revision5MetricFamilies>,
) {
  const r = families.replacement,
    t = families.temporal;
  return {
    core_replacement_intervals: r.replacement_intervals,
    core_benchmark_offer_count: r.benchmark_offer_count,
    core_same_offer_recovered: r.same_offer_recovered,
    core_same_offer_recall: r.benchmark_recall,
    core_merchant_coverage: r.merchant_coverage,
    core_candidate_validity_precision: r.candidate_validity_precision,
    core_matched_fact_completeness: r.matched_fact_completeness,
    core_catch_up_recovered_offers: r.catch_up_recovered_offers,
    core_temporal_complete_intervals: t.temporal_complete_intervals,
    core_live_matched_offers: t.live_matched_offers,
    core_lead_lag_minutes: t.lead_lag_minutes,
    core_median_lead_lag_minutes: t.median_lead_lag_minutes,
  };
}

export function revision6MetricFamilies(evaluations: Evaluation[]) {
  // Reuse aggregation algebra on an isolated family; no historical evaluation is rewritten.
  return revision6MetricNames(
    revision5MetricFamilies(
      evaluations
        .filter((e) => e.protocol_revision === 6)
        .map((e) => ({ ...e, protocol_revision: 5 })),
    ),
  );
}

export function evaluateRevision6(
  input: Parameters<typeof evaluateInterval>[0],
): Evaluation {
  const candidates = input.candidates as CandidateProposal[];
  if (candidates.some((c) => !Array.isArray(c.occurrences) || !c.source_id))
    throw new Error("Revision 6 requires source-backed candidate evidence");
  const core = projectCandidatesForSources(candidates, CORE_SOURCE_IDS);
  const supplementalIds = [
    ...new Set(
      candidates.flatMap((c) => c.occurrences.map((o) => o.source_id)),
    ),
  ].filter((id) => !CORE_SOURCE_IDS.includes(id));
  const supplemental = projectCandidatesForSources(candidates, supplementalIds);
  const result = evaluateRevision5({
    ...input,
    candidates: core,
    acquisitionContentComplete: input.coreContentComplete === true,
    acquisitionComplete: input.coreCadenceComplete === true,
  });
  const matched = (e: Evaluation) => [
    ...(e.replacement_records?.exact ?? []),
    ...(e.replacement_records?.probable ?? []),
  ];
  const coreMatches = new Set(matched(result).map((m) => m.benchmark_id));
  const supplementalResult = input.supplementalReviews
    ? evaluateRevision5({
        ...input,
        candidates: supplemental,
        reviews: {
          ...input.supplementalReviews,
          benchmark: input.reviews.benchmark,
        },
        acquisitionContentComplete: true,
        acquisitionComplete: false,
      })
    : null;
  const supplementalMatches = supplementalResult?.metrics
    .replacement_scoring_eligible
    ? matched(supplementalResult)
    : null;
  // A later catch-up variant cannot supply facts for an earlier live timing match.
  if (result.scoring_records && result.temporal_metrics) {
    result.scoring_records.timing = result.scoring_records.timing.filter((t) =>
      core
        .find((c) => c.candidate_id === t.candidate_id)!
        .source_evidence?.every((e) => e.observation_mode === "live"),
    );
    const timing = result.scoring_records.timing.map((t) => t.lead_lag_minutes);
    result.temporal_metrics.live_matched_offers = timing.length;
    result.temporal_metrics.lead_lag_minutes = timing;
    result.metrics.median_lead_lag_minutes = median(timing);
  }
  result.protocol_revision = 6;
  result.metrics.timing_note =
    "Revision 6: core live evidence only; content recovered ≠ live coverage restored; supplemental evidence ≠ primary cohort recovery.";
  result.revision6 = {
    ...revision6MetricFamilies([result]),
    core_content_complete: input.coreContentComplete === true,
    core_cadence_complete: input.coreCadenceComplete === true,
    all_registry_content_complete: input.allRegistryContentComplete === true,
    all_registry_cadence_complete: input.allRegistryCadenceComplete === true,
    telegram_content_complete: input.telegramContentComplete === true,
    telegram_coverage_complete: input.telegramCoverageComplete,
    supplemental_candidates: supplemental.length,
    supplemental_observed_matches: supplementalMatches?.length ?? null,
    supplemental_only_matches:
      result.metrics.replacement_scoring_eligible && supplementalMatches
        ? supplementalMatches.filter((m) => !coreMatches.has(m.benchmark_id))
            .length
        : null,
    supplemental_sources_contributing_matches: [
      ...new Set(
        (supplementalMatches ?? []).flatMap((m) =>
          supplemental
            .find((c) => c.candidate_id === m.candidate_id)!
            .occurrences.map((o) => o.source_id),
        ),
      ),
    ],
  };
  return result;
}
