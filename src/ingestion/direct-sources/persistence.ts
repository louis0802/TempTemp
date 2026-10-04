import type { Pool, PoolClient } from "pg";
import { db } from "../../server/db";
import { candidateId, contentHash } from "./evidence";
import { DEFAULT_LIMITS } from "./fetch";
import { sourceDefinition } from "./registry";
import {
  directPromotionCandidateSchema,
  type DirectSourceDefinition,
  type SourceId,
} from "./types";
import type { DirectSourceRun } from "./runner";
import {
  acquisitionReady,
  DIRECT_SOURCE_PROCESSOR_VERSION,
  directRevisionHash,
  evaluateDirectPublication,
  directCampaignLifecycle,
  singaporeObservationDate,
  trustedDirectSource,
  type DirectResolvedContext,
} from "./publication";
import {
  createDirectOutletResolver,
  type DirectOutletResolver,
} from "./outlet-resolution";
import {
  managedPromotion,
  publishDirectDraft,
  suspendDirectPromotion,
} from "./publish-store";

export interface DirectIngestResult {
  sourceId: SourceId;
  observed: number;
  unchanged: number;
  newRevisions: number;
  autoPublished: number;
  updated: number;
  needsReview: number;
  excluded: number;
  conflicts: number;
}
export function enabledDirectSource(id: SourceId) {
  const source = sourceDefinition(id);
  if (!source.publicationPolicy.enabled)
    throw new Error("direct_publication_disabled");
  return source;
}
export async function recordDirectAttempt(
  source: DirectSourceDefinition,
  pool: Pool,
  observedAt = new Date().toISOString(),
  status = "Checking",
) {
  // Recheck the registry rather than accepting caller-supplied production policy.
  const trusted = enabledDirectSource(source.id);
  await pool.query(
    `INSERT INTO app.direct_source_health(source_id,label,last_attempt,status) VALUES($1,$2,$3,$4)
    ON CONFLICT(source_id) DO UPDATE SET last_attempt=GREATEST(app.direct_source_health.last_attempt,excluded.last_attempt),status=CASE WHEN app.direct_source_health.last_attempt IS NULL OR excluded.last_attempt>=app.direct_source_health.last_attempt THEN excluded.status ELSE app.direct_source_health.status END`,
    [trusted.id, trusted.label, observedAt, status],
  );
}
async function inTransaction<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
function validateRun(run: DirectSourceRun, source: DirectSourceDefinition) {
  if (!acquisitionReady(run)) throw new Error("direct_acquisition_not_ready");
  if (!Number.isFinite(Date.parse(run.observedAt)))
    throw new Error("invalid_observation_time");
  for (const page of run.pages) {
    if (page.evidence.sourceId !== source.id)
      throw new Error("cross_source_evidence");
    trustedDirectSource(source, page.evidence.url);
    trustedDirectSource(source, page.evidence.requestedUrl);
    if (page.body.length > DEFAULT_LIMITS.maxBytes)
      throw new Error("response_too_large");
    if (contentHash(page.body) !== page.evidence.contentHash)
      throw new Error("artifact_hash_mismatch");
    if (
      page.evidence.httpStatus !== 200 ||
      !["text/html", "application/pdf"].includes(page.evidence.contentType)
    )
      throw new Error("artifact_not_accepted");
  }
  const keys = new Set<string>(),
    urls = new Set<string>();
  for (const raw of run.candidates) {
    if (
      raw.sourceId !== source.id ||
      raw.evidence.some((e) => e.sourceId !== source.id)
    )
      throw new Error("cross_source_evidence");
    const candidate = directPromotionCandidateSchema.parse(raw);
    trustedDirectSource(source, candidate.canonicalUrl);
    trustedDirectSource(source, candidate.listingUrl);
    if (
      candidate.candidateId !==
      candidateId(source.id, candidate.canonicalUrl, candidate.nativeId)
    )
      throw new Error("candidate_identity_mismatch");
    if (keys.has(candidate.candidateId) || urls.has(candidate.canonicalUrl))
      throw new Error("duplicate_direct_candidate_identity");
    keys.add(candidate.candidateId);
    urls.add(candidate.canonicalUrl);
    for (const e of candidate.evidence) {
      const page = run.pages.find((p) => p.evidence.id === e.id);
      if (
        !page ||
        directRevisionHash({ ...candidate, evidence: [page.evidence] }) !==
          directRevisionHash({ ...candidate, evidence: [e] })
      )
        throw new Error("candidate_evidence_artifact_mismatch");
    }
  }
}
export async function persistDirectSourceRun(
  run: DirectSourceRun,
  options: {
    pool?: Pool;
    resolveOutlets?: DirectOutletResolver;
    processorVersion?: string;
  } = {},
): Promise<DirectIngestResult> {
  const source = enabledDirectSource(run.source.id),
    pool = options.pool ?? db("ingest");
  await recordDirectAttempt(source, pool, run.observedAt);
  try {
    validateRun(run, source);
    // External lookups finish before acquiring any publication transaction locks.
    const resolver = options.resolveOutlets ?? createDirectOutletResolver();
    const contexts = new Map<string, DirectResolvedContext>();
    const asOf = singaporeObservationDate(run.observedAt);
    for (const candidate of run.candidates) {
      const outlets =
        directCampaignLifecycle(candidate, asOf) === "expired"
          ? { outlets: [], outletsVerified: false, outletIssues: [] }
          : await resolver(candidate).catch(() => ({
              outlets: [],
              outletsVerified: false,
              outletIssues: ["outlet_resolution_failed"],
            }));
      contexts.set(candidate.candidateId, {
        ...outlets,
        asOf,
        acquisitionReady: true,
        verifiedAt: run.observedAt,
      });
    }
    return await inTransaction(pool, async (c) => {
      await c.query(
        "SELECT source_id FROM app.direct_source_health WHERE source_id=$1 FOR UPDATE",
        [source.id],
      );
      // Coordinates origin-agnostic dedupe even with existing writers that do not use advisory locks.
      await c.query("LOCK TABLE app.promotions IN SHARE ROW EXCLUSIVE MODE");
      const result: DirectIngestResult = {
        sourceId: source.id,
        observed: run.candidates.length,
        unchanged: 0,
        newRevisions: 0,
        autoPublished: 0,
        updated: 0,
        needsReview: 0,
        excluded: 0,
        conflicts: 0,
      };
      for (const page of run.pages)
        await c.query(
          `INSERT INTO app.direct_source_artifacts(source_id,content_hash,content_type,body,byte_length,first_fetched_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_id,content_hash) DO NOTHING`,
          [
            source.id,
            page.evidence.contentHash,
            page.evidence.contentType,
            page.body,
            page.body.length,
            page.evidence.fetchedAt,
          ],
        );
      for (const candidate of run.candidates) {
        await c.query(
          `INSERT INTO app.direct_source_items(source_id,external_key,canonical_url,native_id,first_seen_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT(source_id,external_key) DO NOTHING`,
          [
            source.id,
            candidate.candidateId,
            candidate.canonicalUrl,
            candidate.nativeId,
            run.observedAt,
          ],
        );
        const item = (
          await c.query(
            "SELECT * FROM app.direct_source_items WHERE source_id=$1 AND external_key=$2 FOR UPDATE",
            [source.id, candidate.candidateId],
          )
        ).rows[0];
        if (
          !item ||
          item.canonical_url !== candidate.canonicalUrl ||
          item.native_id !== candidate.nativeId
        )
          throw new Error("source_item_identity_conflict");
        if (new Date(item.last_seen_at).getTime() > Date.parse(run.observedAt))
          throw new Error("stale_direct_observation");
        await c.query(
          "UPDATE app.direct_source_items SET last_seen_at=$2 WHERE id=$1",
          [item.id, run.observedAt],
        );
        const inserted = (
          await c.query(
            `INSERT INTO app.direct_source_revisions(item_id,revision_hash,observed_at,evidence) VALUES($1,$2,$3,$4) ON CONFLICT(item_id,revision_hash) DO NOTHING RETURNING id`,
            [
              item.id,
              directRevisionHash(candidate),
              run.observedAt,
              JSON.stringify(candidate.evidence),
            ],
          )
        ).rows[0];
        const revisionId: string =
          inserted?.id ??
          (
            await c.query(
              "SELECT id FROM app.direct_source_revisions WHERE item_id=$1 AND revision_hash=$2",
              [item.id, directRevisionHash(candidate)],
            )
          ).rows[0].id;
        if (inserted) result.newRevisions++;
        const version =
          options.processorVersion ?? DIRECT_SOURCE_PROCESSOR_VERSION;
        const previous = (
          await c.query(
            "SELECT * FROM app.direct_candidates WHERE source_revision_id=$1 AND candidate_key=$2 ORDER BY created_at DESC FOR UPDATE",
            [revisionId, candidate.candidateId],
          )
        ).rows;
        if (
          item.current_revision_id === revisionId &&
          previous.some(
            (r) =>
              (r.processor_version === version &&
                (directCampaignLifecycle(candidate, asOf) !== "expired" ||
                  r.status === "excluded")) ||
              r.status === "resolved" ||
              (r.status === "excluded" &&
                !r.issues.includes("expired_campaign")),
          )
        ) {
          result.unchanged++;
          continue;
        }
        await c.query(
          "UPDATE app.direct_candidates SET status='superseded',updated_at=now() WHERE source_revision_id IN (SELECT id FROM app.direct_source_revisions WHERE item_id=$1) AND status='needs_review' AND (source_revision_id<>$2 OR processor_version<>$3)",
          [item.id, revisionId, version],
        );
        await c.query(
          "UPDATE app.direct_source_items SET current_revision_id=$2 WHERE id=$1",
          [item.id, revisionId],
        );
        const context = contexts.get(candidate.candidateId)!;
        const evaluation = evaluateDirectPublication(candidate, context);
        const link = {
          sourceId: source.id,
          itemId: item.id,
          revisionId,
          canonicalUrl: item.canonical_url,
        };
        const current =
          evaluation.result === "exclude"
            ? null
            : await managedPromotion(c, item.id);
        const reasons = [...evaluation.reasons];
        let promotionId = current?.id ?? null;
        let status: "needs_review" | "auto_published" | "excluded" =
          evaluation.result === "exclude" ? "excluded" : "needs_review";
        if (status === "excluded") result.excluded++;
        let existing = current?.data ?? null;
        if (current?.admin_corrected)
          reasons.push("authoritative_source_changed_after_admin_correction");
        else if (evaluation.promotion) {
          const saved = await publishDirectDraft(c, evaluation.promotion, link);
          reasons.push(...saved.reasons);
          existing = saved.existing ?? existing;
          if (saved.promotion) {
            promotionId = saved.promotion.id;
            status = "auto_published";
            if (saved.result === "updated") result.updated++;
            else result.autoPublished++;
          }
        }
        if (status === "needs_review") {
          result.needsReview++;
          if (current) {
            if (!current.admin_corrected)
              await suspendDirectPromotion(c, current);
            // Link the latest authoritative observation while retaining previous facts.
            await c.query(
              "UPDATE app.promotion_direct_sources SET source_revision_id=$2,attached_at=now() WHERE source_item_id=$1",
              [item.id, revisionId],
            );
          }
        }
        if (reasons.includes("existing_offer_terms_conflict"))
          result.conflicts++;
        const codes = [...new Set(reasons)];
        const issueClassification = [
          ...evaluation.issues,
          ...codes
            .filter((code) => !evaluation.issues.some((i) => i.code === code))
            .map((code) => ({ code, severity: "publication_blocking" })),
        ];
        const data = {
          ...evaluation.draft,
          status:
            status === "auto_published"
              ? "published"
              : status === "excluded"
                ? "excluded"
                : "needs_review",
          id: promotionId ?? evaluation.draft.id,
          directCandidate: candidate,
          issueClassification,
          outletResolution: context,
          existing,
        };
        // Same byte revision returning after an intervening revision can be re-evaluated, never duplicate its candidate.
        await c.query(
          `INSERT INTO app.direct_candidates(source_revision_id,candidate_key,processor_version,data,issues,status,promotion_id) VALUES($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT(source_revision_id,candidate_key,processor_version) DO UPDATE SET data=excluded.data,issues=excluded.issues,status=excluded.status,promotion_id=excluded.promotion_id,updated_at=now()
          WHERE app.direct_candidates.status NOT IN ('resolved','excluded')`,
          [
            revisionId,
            candidate.candidateId,
            version,
            JSON.stringify(data),
            JSON.stringify([...new Set([...codes, ...candidate.issues])]),
            status,
            promotionId,
          ],
        );
      }
      await c.query(
        "UPDATE app.direct_source_health SET last_success=GREATEST(last_success,$2),status=CASE WHEN last_attempt<=$2 THEN 'Healthy' ELSE status END WHERE source_id=$1",
        [source.id, run.observedAt],
      );
      return result;
    });
  } catch (error) {
    await recordDirectAttempt(source, pool, run.observedAt, "Failed");
    throw error;
  }
}
