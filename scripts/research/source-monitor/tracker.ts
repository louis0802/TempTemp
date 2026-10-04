/** Read-only architecture + evidence progress; never invokes acquisition or production. */
import {
  readRecoveries,
  recoveryCheckpointStatus,
  runtimeCatchUpCapability,
  summarizeRev5Acquisition,
  summarizeRev6Acquisition,
  sourceCapabilityAudit,
} from "./recovery";
import { classifySnapshotCompleteness } from "./completeness";
import {
  REV6_ANALYSIS_EXCLUSIONS,
  researchAnalysisEvaluations,
} from "./analysis";
import path from "node:path";
import type { TelegramIntervalCoverage } from "./telegram";
import {
  sourceAdapterCapabilities,
  type DiscoveryResult,
  type SourceSnapshot,
} from "./discovery";
import {
  cumulativeMetrics,
  evaluateInterval,
  type Reviews,
} from "./evaluation";
import {
  intervalDir,
  listedIntervalDates,
  readInterval,
  verifyObservationSeal,
  type AcquisitionInput,
  type BenchmarkRawInput,
} from "./intervals";
import { CORE_SOURCE_IDS, loadPinnedResearchAssets } from "./protocol";
import {
  optionalJson,
  readDiscoveryPasses,
  summarizeDiscoveryPasses,
} from "./passes";
import { sealedResearchEvaluations, type ServiceState } from "./service";
import {
  TELEGRAM_CHANNELS,
  telegramIntervalCoverage,
  telegramContentCoverage,
} from "./telegram";

export function sourceIssues(snapshot: SourceSnapshot) {
  const issues = new Set(snapshot.incomplete_reasons);
  if (snapshot.status === "blocked" || snapshot.listing_failure)
    issues.add("blocked");
  if (snapshot.pagination_remaining) issues.add("pagination_incomplete");
  if (snapshot.cap_truncated) issues.add("cap_truncated");
  if (snapshot.cards_temporal_ambiguous) issues.add("temporal_ambiguous");
  if (
    snapshot.incomplete_reasons.includes(
      "registered_category_or_tab_routes_not_traversed",
    )
  )
    issues.add("category_routes_untraversed");
  if (
    snapshot.incomplete_reasons.includes(
      "pagination_control_without_fetchable_link",
    )
  )
    issues.add("dynamic_page_unsupported");
  if (snapshot.errors.some((e) => /size|too large|bytes/i.test(e)))
    issues.add("response_size_limit");
  return [...issues];
}
const normalizeMerchant = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ratio = (a: number, b: number) => (b ? a / b : null);

export async function researchTracker(root: string, now = new Date()) {
  const assets = await loadPinnedResearchAssets();
  const state = await optionalJson<ServiceState>(path.join(root, "state.json"));
  const health = await optionalJson<Record<string, unknown>>(
    path.join(root, "health.json"),
  );
  const dates = await listedIntervalDates(root);
  const date = state?.active_interval ?? dates.at(-1) ?? null;
  const interval = date ? await readInterval(root, date) : null;
  const dir = date ? intervalDir(root, date) : null;
  const activeAssets = interval
    ? await loadPinnedResearchAssets(interval.protocol_revision)
    : assets;
  if (
    interval &&
    (interval.protocol_sha256 !== activeAssets.protocolSha256 ||
      interval.registry_sha256 !== activeAssets.registrySha256)
  )
    throw new Error("Tracker interval protocol/registry hash mismatch");
  const discovery = dir
    ? await optionalJson<DiscoveryResult>(
        path.join(dir, "discovery-result.json"),
      )
    : null;
  const multipass =
    dir && date && interval && interval.protocol_revision >= 4
      ? await (
          interval.protocol_revision === 6
            ? summarizeRev6Acquisition
            : interval.protocol_revision === 5
              ? summarizeRev5Acquisition
              : summarizeDiscoveryPasses
        )(dir, date, activeAssets.registry, now)
      : null;
  const acquisition = dir
    ? await optionalJson<AcquisitionInput>(path.join(dir, "acquisition.json"))
    : null;
  const raw = dir
    ? await optionalJson<BenchmarkRawInput>(path.join(dir, "telegram-raw.json"))
    : null;
  const current =
    discovery ??
    (acquisition
      ? {
          source_snapshots:
            acquisition.source_snapshots as DiscoveryResult["source_snapshots"],
          candidates: acquisition.candidates as DiscoveryResult["candidates"],
          totals: acquisition.totals as DiscoveryResult["totals"],
        }
      : multipass);
  const snapshots = new Map(
    (current?.source_snapshots ?? []).map((s) => [s.source_id, s]),
  );
  const evaluations = researchAnalysisEvaluations(
    await sealedResearchEvaluations(root),
  );
  const metrics = cumulativeMetrics(evaluations);
  const revision4Evaluations: typeof evaluations = [];
  for (const evaluation of evaluations)
    if ((await readInterval(root, evaluation.date)).protocol_revision === 4)
      revision4Evaluations.push(evaluation);
  const revision4Metrics = cumulativeMetrics(revision4Evaluations);
  const replacementMetrics = metrics.replacement;
  const temporalMetrics = metrics.temporal;
  const recoveries = dir ? await readRecoveries(dir) : [];
  const allRecovery: Awaited<ReturnType<typeof readRecoveries>> = [];
  const latestLive = new Map<string, string>();
  const reviewedRev5Offers = new Set<string>();
  const recoveredRev5Posts = new Set<string>();
  let missingTelegram = 0,
    missingSources = 0;
  const contentGaps: { date: string; reasons: string[] }[] = [];
  for (const day of dates) {
    const record = await readInterval(root, day);
    if (record.protocol_revision !== 5) continue;
    const dayDir = intervalDir(root, day);
    for (const { pass, snapshots: passSnapshots } of await readDiscoveryPasses(
      dayDir,
    )) {
      if (
        pass.observation_mode !== "live" ||
        pass.outcome !== "success" ||
        !pass.completed_at
      )
        continue;
      for (const snapshot of passSnapshots) {
        if (snapshot.status !== "captured" || snapshot.listing_failure)
          continue;
        const prior = latestLive.get(snapshot.source_id);
        if (!prior || Date.parse(prior) < Date.parse(pass.completed_at))
          latestLive.set(snapshot.source_id, pass.completed_at);
      }
    }
    allRecovery.push(...(await readRecoveries(dayDir)));
    const frozen = await optionalJson<AcquisitionInput>(
      path.join(dayDir, "acquisition.json"),
    );
    const benchmark = await optionalJson<BenchmarkRawInput>(
      path.join(dayDir, "telegram-raw.json"),
    );
    for (const post of (benchmark?.posts ?? []) as Parameters<
      typeof evaluateInterval
    >[0]["posts"])
      if (post.observation_mode === "catch_up")
        recoveredRev5Posts.add(`${post.channel}:${post.message_id}`);
    if (frozen && benchmark) {
      const review = await optionalJson<NonNullable<Reviews["benchmark"]>>(
        path.join(dayDir, "reviews", "telegram-offers.json"),
      );
      if (review?.complete) {
        await verifyObservationSeal(root, day);
        evaluateInterval({
          date: day,
          candidates: frozen.candidates as Parameters<
            typeof evaluateInterval
          >[0]["candidates"],
          posts: benchmark.posts as Parameters<
            typeof evaluateInterval
          >[0]["posts"],
          telegramCoverageComplete: true,
          acquisitionFrozen: true,
          rawBenchmarkFrozen: true,
          reviews: { benchmark: review },
        });
        for (const offer of review.offers.filter((o) => o.eligible))
          reviewedRev5Offers.add(offer.benchmark_id);
      }
    }
    const reasons = [
      ...(frozen?.content_partial_reasons ?? []),
      ...(benchmark?.content_partial_reasons ?? []),
    ];
    if (reasons.length) contentGaps.push({ date: day, reasons });
    missingTelegram += (benchmark?.coverage_gaps ?? []).filter(
      (g) => (g as { reason: string }).reason === "missing_slot",
    ).length;
    missingSources += (frozen?.cadence_gaps ?? []).length;
  }
  if (interval?.protocol_revision === 5 && !acquisition) {
    const currentContent = await summarizeRev5Acquisition(
      dir!,
      date!,
      activeAssets.registry,
      now,
    );
    if (currentContent.content_partial_reasons.length)
      contentGaps.push({
        date: date!,
        reasons: currentContent.content_partial_reasons,
      });
    missingSources += currentContent.cadence_gaps.length;
  }
  const blockers: string[] = [];
  if (!state) blockers.push("observation_service_not_initialized");
  if (interval?.protocol_revision === 3)
    blockers.push("active_interval_uses_revision_3_daily_acquisition");
  blockers.push(...(interval?.partial_reasons ?? []));
  if (date === "2026-09-25") blockers.push("2026-09-25_rehearsal_non_scoring");
  const end = interval
    ? Math.min(Date.parse(interval.interval_end_at), now.getTime())
    : 0;
  // Do not call the current slot missing until its full five-minute tolerance expires.
  const coverageEnd =
    interval && interval.protocol_revision >= 4
      ? Math.min(
          end,
          Math.floor((now.getTime() - 5 * 60_000) / 3_600_000) * 3_600_000 + 1,
        )
      : end;
  const coverage =
    state && interval && coverageEnd > Date.parse(interval.interval_start_at)
      ? telegramIntervalCoverage(
          state.telegram,
          interval.interval_start_at,
          new Date(coverageEnd),
          interval.protocol_revision,
        )
      : null;
  const gaps = raw?.coverage_gaps ?? coverage?.coverage_gaps ?? [];
  if (gaps.length || coverage?.coverage_complete === false)
    blockers.push("incomplete_telegram_coverage");
  if (!acquisition && multipass?.cadence_gaps.length)
    blockers.push("incomplete_discovery_cadence");
  if (!current) blockers.push("independent_acquisition_unavailable");
  if (
    interval?.protocol_revision !== 6 &&
    (current?.totals.incomplete_sources ?? 0) > 0
  )
    blockers.push("incomplete_source_enumeration_or_extraction");
  if (!acquisition || !raw) blockers.push("active_observations_not_frozen");
  if (metrics.revision6.core_replacement_intervals < 3)
    blockers.push("fewer_than_3_revision6_core_replacement_eligible_intervals");
  // No statistically justified sample minimum has been approved. Human assessment cannot be guessed.
  blockers.push("benchmark_sample_sufficiency_requires_researcher_review");
  const posts =
    raw?.posts.length ??
    (state && interval
      ? TELEGRAM_CHANNELS.flatMap(
          (ch) => state.telegram.channels[ch].observations,
        ).filter(
          (p) =>
            Date.parse(p.first_seen_at) >=
              Date.parse(interval.interval_start_at) &&
            Date.parse(p.first_seen_at) < Date.parse(interval.interval_end_at),
        ).length
      : null);
  let reviewed = null as number | null,
    matches = null as number | null,
    noMatch = null as number | null;
  let merchantCoverage = null as number | null,
    sameOfferCoverage = null as number | null;
  let cases: {
    benchmark_id: string;
    candidate_id: string | null;
    classification: string;
    reason: string;
  }[] = [];
  // Reviews are meaningful only after both observation sides are frozen and verified.
  if (dir && date && acquisition && raw && interval?.protocol_revision !== 6) {
    await verifyObservationSeal(root, date);
    const benchmark = await optionalJson<NonNullable<Reviews["benchmark"]>>(
      path.join(dir, "reviews", "telegram-offers.json"),
    );
    const matchReview = await optionalJson<NonNullable<Reviews["matches"]>>(
      path.join(dir, "reviews", "matches.json"),
    );
    if (benchmark?.complete) {
      const eligible = benchmark.offers.filter((o) => o.eligible);
      reviewed = eligible.length;
      const merchants = new Set(
        (acquisition.candidates as DiscoveryResult["candidates"]).map((c) =>
          normalizeMerchant(c.merchant),
        ),
      );
      merchantCoverage = ratio(
        eligible.filter((o) => merchants.has(normalizeMerchant(o.merchant)))
          .length,
        eligible.length,
      );
      if (matchReview?.complete) {
        // Validate provenance, one-to-one assignments and offer compatibility, even for descriptive rehearsal cases.
        // Omit the validity audit so this validation can never become a scored evaluation.
        evaluateInterval({
          date,
          candidates: acquisition.candidates as Parameters<
            typeof evaluateInterval
          >[0]["candidates"],
          posts: raw.posts as Parameters<typeof evaluateInterval>[0]["posts"],
          telegramCoverageComplete: true,
          acquisitionFrozen: true,
          rawBenchmarkFrozen: true,
          reviews: { benchmark, matches: matchReview },
        });
        cases = matchReview.assessments;
        matches = cases.filter((m) =>
          ["exact_offer", "probable_same_offer"].includes(m.classification),
        ).length;
        noMatch = cases.filter((m) => m.classification === "no_match").length;
        sameOfferCoverage = ratio(matches, eligible.length);
      }
    }
  }
  const sourceConcentration: Record<string, number> = {};
  for (const evaluation of evaluations.filter(
    (e) => (e.protocol_revision ?? 3) < 5 && e.metrics.scoring_eligible,
  )) {
    const frozen = await optionalJson<AcquisitionInput>(
      path.join(intervalDir(root, evaluation.date), "acquisition.json"),
    );
    const matched = new Set(
      [
        ...(evaluation.scoring_records?.exact ?? []),
        ...(evaluation.scoring_records?.probable ?? []),
      ].map((m) => m.candidate_id),
    );
    for (const c of (frozen?.candidates ?? []) as DiscoveryResult["candidates"])
      if (matched.has(c.candidate_id)) {
        for (const id of new Set(c.occurrences.map((o) => o.source_id)))
          sourceConcentration[id] = (sourceConcentration[id] ?? 0) + 1;
      }
  }
  const currentStage =
    metrics.revision6.core_replacement_intervals >= 3
      ? "S5"
      : (state && interval) ||
          metrics.revision6.core_replacement_intervals > 0 ||
          raw
        ? "S4"
        : state
          ? "S3"
          : current
            ? "S2"
            : "S1";
  const stages = {
    S0: "complete",
    S1: "complete",
    S2: "partial",
    S3:
      metrics.revision6.core_replacement_intervals > 0
        ? "complete"
        : state
          ? "partial"
          : "not_started",
    S4: metrics.revision6.core_replacement_intervals
      ? "complete"
      : "insufficient_evidence",
    S5: "insufficient_evidence",
    S6: "not_started",
    S7: "not_started",
    S8: "not_started",
  };
  const diagnosticRecovery = [...allRecovery];
  for (const day of dates) {
    if ((await readInterval(root, day)).protocol_revision !== 6) continue;
    diagnosticRecovery.push(...(await readRecoveries(intervalDir(root, day))));
    for (const { pass, snapshots } of await readDiscoveryPasses(
      intervalDir(root, day),
    )) {
      if (
        pass.observation_mode !== "live" ||
        pass.outcome !== "success" ||
        !pass.completed_at
      )
        continue;
      for (const snapshot of snapshots)
        if (
          classifySnapshotCompleteness(snapshot).enumeration_complete &&
          (!latestLive.has(snapshot.source_id) ||
            latestLive.get(snapshot.source_id)! < pass.completed_at)
        )
          latestLive.set(snapshot.source_id, pass.completed_at);
    }
  }
  const adapters = await Promise.all(
    assets.registry.sources.map(async (source) => {
      const snapshot = snapshots.get(source.source_id);
      const capability = runtimeCatchUpCapability(source);
      const latestRecovery = diagnosticRecovery
        .flatMap((r) => r.sources)
        .filter((r) => r.source_id === source.source_id)
        .sort((a, b) => a.recovered_at.localeCompare(b.recovered_at))
        .at(-1);
      const checkpoint = await recoveryCheckpointStatus(root, source.source_id);
      const completeness = snapshot
        ? classifySnapshotCompleteness(snapshot)
        : null;
      const limitation =
        source.source_id === "singpromos_ongoing"
          ? "Active/current listing does not prove publications made during downtime."
          : source.source_id === "mustsharenews_deals"
            ? "Stale/cache/order ambiguity prevents deterministic historical proof."
            : capability === "complete"
              ? "Complete only when dated traversal crosses the durable live checkpoint and verifies overlap/order/pagination."
              : String(
                  source.catch_up_limitation ??
                    "Runtime complete historical catch-up is not supported.",
                );
      return {
        source_id: source.source_id,
        research_role: source.research_role,
        cadence_class: source.cadence_class,
        catch_up_capability: capability,
        latest_successful_live_observation:
          latestLive.get(source.source_id) ?? null,
        latest_durable_checkpoint: checkpoint.checkpoint,
        durable_checkpoint_validity: checkpoint.validity,
        durable_checkpoint_reasons: checkpoint.reasons,
        enumeration_status: completeness
          ? completeness.enumeration_complete
            ? "complete"
            : "incomplete"
          : "unobserved",
        extraction_quality: completeness
          ? completeness.extraction_complete
            ? "complete"
            : "partial"
          : "unobserved",
        enumeration_reasons: completeness?.enumeration_reasons ?? [],
        extraction_reasons: completeness?.extraction_reasons ?? [],
        latest_recovery: latestRecovery ?? null,
        checkpoint_crossed: latestRecovery?.proof?.crossed_checkpoint ?? null,
        pagination_complete: latestRecovery?.proof?.pagination_complete ?? null,
        recovery_limitation: limitation,
        ...sourceAdapterCapabilities(source),
        capture_status: snapshot?.status ?? "unobserved",
        issues: [
          ...new Set(
            (current?.source_snapshots ?? [])
              .filter((s) => s.source_id === source.source_id)
              .flatMap(sourceIssues),
          ),
        ],
        detail_failures: snapshot?.detail_failures ?? null,
      };
    }),
  );
  const nextGate =
    metrics.revision6.core_replacement_intervals < 3
      ? "Collect and review at least 3 core replacement-eligible revision-6 intervals, then assess benchmark sample sufficiency. Temporal completeness is a separate gate."
      : "Researcher assessment of benchmark sample size/diversity, same-offer recall, precision, fact completeness, source concentration and gaps; prefer 5–7 valid days. No automatic production decision.";
  const coreCurrent =
    interval?.protocol_revision === 6 && dir && date
      ? (acquisition ??
        (await summarizeRev6Acquisition(dir, date, activeAssets.registry, now)))
      : null;
  const coreTelegramContent =
    raw?.content_complete ??
    (state && interval?.protocol_revision === 6
      ? telegramContentCoverage(
          state.telegram,
          interval.interval_start_at,
          new Date(end).toISOString(),
        )
      : null);
  const coreBlockers = [
    ...(metrics.revision6.core_replacement_intervals < 3
      ? ["fewer_than_3_revision6_core_replacement_eligible_intervals"]
      : []),
    "benchmark_sample_sufficiency_requires_researcher_review",
    ...(!coreCurrent ? ["revision6_observations_unavailable"] : []),
    ...(coreCurrent && !coreCurrent.core_content_complete
      ? [
          "incomplete_core_content",
          ...(coreCurrent.core_content_partial_reasons ?? []),
        ]
      : []),
    ...(coreTelegramContent === false ? ["incomplete_telegram_content"] : []),
    ...(!acquisition || !raw ? ["active_observations_not_frozen"] : []),
    ...(interval?.protocol_revision === 6 && interval.phase !== "sealed"
      ? ["required_core_reviews_not_sealed"]
      : []),
  ];
  const currentGaps = (coreCurrent?.cadence_gaps ?? []) as {
    source_id: string;
    scheduled_slot: string;
    outcome: string;
  }[];
  return {
    revision6: {
      analysis_exclusions: REV6_ANALYSIS_EXCLUSIONS,
      cohort: [...CORE_SOURCE_IDS],
      ...metrics.revision6,
      core_content_complete: coreCurrent?.core_content_complete ?? null,
      core_enumeration_complete: coreCurrent?.core_enumeration_complete ?? null,
      core_extraction_complete: coreCurrent?.core_extraction_complete ?? null,
      all_registry_enumeration_complete:
        coreCurrent?.all_registry_enumeration_complete ?? null,
      all_registry_extraction_complete:
        coreCurrent?.all_registry_extraction_complete ?? null,
      source_completeness: coreCurrent?.source_completeness ?? [],
      core_cadence_complete: coreCurrent?.core_cadence_complete ?? null,
      all_registry_content_complete:
        coreCurrent?.all_registry_content_complete ?? null,
      all_registry_cadence_complete:
        coreCurrent?.all_registry_cadence_complete ?? null,
      telegram_content_complete: coreTelegramContent,
      telegram_coverage_complete:
        raw?.coverage_complete ?? coverage?.coverage_complete ?? null,
      all_registry_missing_passes: currentGaps,
      supplemental_missing_passes: currentGaps.filter(
        (g) => !CORE_SOURCE_IDS.includes(g.source_id),
      ),
      supplemental_failures: [...snapshots.values()]
        .filter(
          (s) =>
            !CORE_SOURCE_IDS.includes(s.source_id) &&
            (s.listing_failure || s.status !== "captured"),
        )
        .map((s) => ({ source_id: s.source_id, issues: sourceIssues(s) })),
      supplemental_observations: evaluations
        .filter((e) => e.protocol_revision === 6)
        .map((e) => ({
          date: e.date,
          supplemental_candidates: e.revision6?.supplemental_candidates,
          supplemental_observed_matches:
            e.revision6?.supplemental_observed_matches,
          supplemental_only_matches: e.revision6?.supplemental_only_matches,
          supplemental_sources_contributing_matches:
            e.revision6?.supplemental_sources_contributing_matches,
        })),
      blockers: coreBlockers,
      capability_audit: sourceCapabilityAudit(assets.registry),
    },
    supplemental_distinction: "supplemental evidence ≠ primary cohort recovery",
    replacement_evidence: {
      ...replacementMetrics,
      benchmark_offers_reviewed: reviewedRev5Offers.size,
      catch_up_candidates_retained: new Set(
        allRecovery.flatMap((r) =>
          r.result.candidates.map((c) => c.candidate_id),
        ),
      ).size,
      catch_up_telegram_posts_retained: recoveredRev5Posts.size,
      unresolved_content_recovery_gaps: contentGaps,
    },
    temporal_evidence: {
      ...temporalMetrics,
      missing_telegram_slots:
        missingTelegram +
        (!raw && interval?.protocol_revision === 5
          ? (coverage?.coverage_gaps ?? []).filter(
              (g) => g.reason === "missing_slot",
            ).length
          : 0),
      missing_source_passes: missingSources,
    },
    recovery: recoveries,
    evidence_distinction: "content recovered ≠ live coverage restored",
    target_stage: "S8",
    current_stage: currentStage,
    stages,
    target:
      "Independent sources → normalized offers → evidence/merge → production ingestion → Telegram supplemental or removable",
    implementation: {
      source_registry: "complete",
      independent_enumeration: "complete",
      generic_candidate_extraction: "complete",
      source_specific_extraction: "partial",
      persistent_observation_service: "complete",
      synchronized_benchmark:
        metrics.revision6.core_replacement_intervals > 0
          ? "complete"
          : "partial",
      multi_day_scored_evidence: "insufficient_evidence",
      production_ingestion_bridge: "not_started",
      telegram_demotion_decision: "not_started",
    },
    observation: {
      configured_protocol_revision: assets.protocol.revision,
      active_protocol_revision: interval?.protocol_revision ?? null,
      active_interval: state?.active_interval ?? null,
      latest_interval: date,
      phase: interval?.phase ?? null,
      scoring_eligibility: !interval
        ? "unavailable"
        : date === "2026-09-25" ||
            interval?.partial_reasons.some(
              (r) => !r.startsWith("source_incomplete:"),
            ) ||
            raw?.coverage_complete === false ||
            (!raw && coverage?.coverage_complete === false) ||
            (!acquisition && !!multipass?.cadence_gaps.length)
          ? "non_scoring"
          : evaluations.find((e) => e.date === date)?.metrics.scoring_eligible
            ? "scored"
            : "pending_interval_close_and_review",
      telegram_poll_health:
        (raw?.channel_status as
          TelegramIntervalCoverage["channel_status"] | undefined) ??
        coverage?.channel_status ??
        null,
      coverage_gaps: gaps,
      independent_acquisition_health: {
        last_success_at: state?.discovery.last_successful_run_at ?? null,
        cadence_gaps:
          acquisition?.cadence_gaps ??
          (!acquisition ? multipass?.cadence_gaps : null) ??
          null,
      },
      health_snapshot: health,
    },
    latest_acquisition: {
      registered_sources: assets.registry.sources.length,
      sources_captured: [...snapshots.values()].filter(
        (s) => s.pages.length > 0,
      ).length,
      sources_with_snapshots: snapshots.size,
      incomplete_sources: current?.totals.incomplete_sources ?? null,
      candidates: current?.candidates.length ?? null,
      cards_evaluated: current?.totals.cards_evaluated ?? null,
      detail_failures: current?.totals.detail_failures ?? null,
    },
    evidence: {
      new_telegram_posts_observed: posts,
      eligible_benchmark_offers_reviewed: reviewed,
      same_offer_matches: matches,
      no_match_cases: noMatch,
      merchant_coverage: merchantCoverage,
      same_offer_coverage: sameOfferCoverage,
      current_interval_coverage_scope:
        "Frozen reviewed cases only; rehearsal ratios are descriptive, never scored recall. Merchant identity does not prove offer identity.",
      observed_cases: cases,
      scored: metrics,
      revision_4_scored: revision4Metrics,
      source_concentration: {
        matched_candidate_days_by_source: sourceConcentration,
        note: "Legacy revision-3/4 strict intervals only. Cross-source occurrences can contribute to multiple sources.",
      },
    },
    gates: {
      ...(assets.protocol.research_gates as object),
      next_gate: nextGate,
      sample_sufficiency: "researcher_review_required",
    },
    blockers:
      interval?.protocol_revision === 6 ? coreBlockers : [...new Set(blockers)],
    known_limitations: [
      "Public previews may miss transient/deleted posts and media edits.",
      "First-seen timing is bounded by source cadence; absence is not a publication timestamp.",
      "Generic semantic extraction requires source-backed review; custom listing parsers are not production adapters.",
      "Registered blocked probes and incomplete routes do not establish full source coverage.",
      "Telegram replacement is not proven.",
    ],
    adapters,
  };
}

export function formatResearchTracker(
  t: Awaited<ReturnType<typeof researchTracker>>,
) {
  const value = (v: unknown) =>
    v === null || v === undefined
      ? "unknown / unreviewed"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  const lines = [
    "SOURCE SUBSTITUTION TRACKER",
    "",
    "Target",
    "------",
    t.target,
    t.evidence_distinction,
    `Revision 6 core replacement cohort: ${t.revision6.cohort.join(", ")}`,
    `Core replacement evidence: ${value({ intervals: t.revision6.core_replacement_intervals, offers: t.revision6.core_benchmark_offer_count, recovered: t.revision6.core_same_offer_recovered, recall: t.revision6.core_same_offer_recall })}`,
    `Core temporal evidence: ${value({ intervals: t.revision6.core_temporal_complete_intervals, live_matches: t.revision6.core_live_matched_offers, lead_lag: t.revision6.core_lead_lag_minutes })}`,
    `Core content completeness: ${value(t.revision6.core_content_complete)}`,
    `Core enumeration completeness: ${value(t.revision6.core_enumeration_complete)}`,
    `Core extraction completeness: ${value(t.revision6.core_extraction_complete)}`,
    `Full-registry enumeration completeness: ${value(t.revision6.all_registry_enumeration_complete)}`,
    `Full-registry extraction completeness: ${value(t.revision6.all_registry_extraction_complete)}`,
    `Analysis exclusions: ${value(t.revision6.analysis_exclusions)}`,
    `Core cadence completeness: ${value(t.revision6.core_cadence_complete)}`,
    `Full-registry content completeness: ${value(t.revision6.all_registry_content_complete)}`,
    `Full-registry cadence completeness: ${value(t.revision6.all_registry_cadence_complete)}`,
    `Supplemental source gaps: ${value(t.revision6.supplemental_missing_passes)}`,
    `Supplemental-only observed matches: ${value(t.revision6.supplemental_observations)}`,
    `Catch-up recovery status by source: ${value(t.recovery.flatMap((r) => r.sources))}`,
    t.supplemental_distinction,
    `Replacement evidence (revision 5): ${value(t.replacement_evidence)}`,
    `Temporal evidence (revision 5): ${value(t.temporal_evidence)}`,
    `Stage: ${t.current_stage} → ${t.target_stage}`,
    "",
    "Implementation",
    "--------------",
  ];
  for (const [key, status] of Object.entries(t.implementation))
    lines.push(`${key.replaceAll("_", " ").padEnd(34)} ${status}`);
  lines.push(
    "",
    "Current observation",
    "-------------------",
    `Protocol revision: ${value(t.observation.active_protocol_revision)} (configured: ${t.observation.configured_protocol_revision})`,
    `Active interval: ${value(t.observation.active_interval)}`,
    `Scoring eligibility: ${t.observation.scoring_eligibility}`,
  );
  for (const [channel, health] of Object.entries(
    t.observation.telegram_poll_health ?? {},
  ))
    lines.push(
      `Telegram ${channel}: ${health.coverage_complete ? "complete so far" : health.reasons.join(", ")}`,
    );
  lines.push(
    `Coverage gaps: ${t.observation.coverage_gaps.length}`,
    `Independent acquisition health: ${value(t.observation.independent_acquisition_health)}`,
    "",
    "Latest acquisition",
    "------------------",
  );
  for (const [key, count] of Object.entries(t.latest_acquisition))
    lines.push(`${key.replaceAll("_", " ")}: ${value(count)}`);
  lines.push("", "Benchmark", "---------");
  for (const key of [
    "new_telegram_posts_observed",
    "eligible_benchmark_offers_reviewed",
    "same_offer_matches",
    "no_match_cases",
    "merchant_coverage",
    "same_offer_coverage",
  ] as const)
    lines.push(`${key}: ${value(t.evidence[key])}`);
  lines.push(
    `Legacy scored synchronized days (revisions 3/4): ${t.evidence.scored.synchronized_intervals}`,
    `Revision 4 scored synchronized days: ${t.evidence.revision_4_scored.synchronized_intervals}`,
    `Legacy strict eligible benchmark offers: ${value(t.evidence.scored.benchmark_offer_count)}`,
    `Legacy strict benchmark recall: ${value(t.evidence.scored.benchmark_recall)}`,
    `Legacy strict candidate validity precision: ${value(t.evidence.scored.candidate_validity_precision)}`,
    `Legacy strict matched fact completeness: ${value(t.evidence.scored.matched_fact_completeness)}`,
    `Source concentration: ${value(t.evidence.source_concentration)}`,
    "",
    "Evidence gates",
    "--------------",
    `Next gate: ${t.gates.next_gate}`,
    "Blockers:",
    ...t.blockers.map((b) => `- ${b}`),
    "Known limitations:",
    ...t.known_limitations.map((b) => `- ${b}`),
    "",
    "Source adapter maturity and observed limitations",
    "-----------------------------------------------",
  );
  for (const a of t.adapters)
    lines.push(
      `${a.source_id}: cadence=${a.cadence_class}; enumeration=${a.enumeration_status}; enumeration reasons=${a.enumeration_reasons.join(",") || "none"}; extraction=${a.extraction_quality}; extraction reasons=${a.extraction_reasons.join(",") || "none"}; enumeration supported=${a.enumeration_supported}; custom listing=${a.listing_parser_supported}; detail fetch=${a.detail_fetch_supported}; semantics=${a.semantic_extraction}; production=${a.production_ready}; catch-up=${a.catch_up_capability}; latest live=${a.latest_successful_live_observation}; durable checkpoint validity=${a.durable_checkpoint_validity}; checkpoint reasons=${a.durable_checkpoint_reasons.join(",") || "none"}; durable checkpoint=${value(a.latest_durable_checkpoint)}; latest recovery=${value(a.latest_recovery)}; checkpoint crossed=${value(a.checkpoint_crossed)}; pagination complete=${value(a.pagination_complete)}; recovery limitation=${a.recovery_limitation}; capture=${a.capture_status}; issues=${a.issues.join(",") || "none observed"}`,
    );
  return lines.join("\n") + "\n";
}
