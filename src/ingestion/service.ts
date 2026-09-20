import {
  defaultPromotionPipeline,
  PromotionPipeline,
} from "./resolution/pipeline";
import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { PoolClient } from "pg";
import { db, transaction } from "@/server/db";
import { fingerprint, savePromotion } from "@/server/db/publication";
import { Promotion } from "@/domain/promotion";
import {
  cleanCandidate,
  normalise,
  parserVersion,
  positiveDays,
} from "./cleanup";
import { SourceExport, postSchema } from "./sources/approved-json";
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function suspend(c: PoolClient, postId: string) {
  await c.query(
    `UPDATE app.promotions SET status='needs_review',revision=revision+1,data=jsonb_set(jsonb_set(data,'{status}','"needs_review"'),'{revision}',to_jsonb(revision+1)),updated_at=now() WHERE id IN(SELECT promotion_id FROM app.promotion_sources WHERE post_id=$1) AND status<>'withdrawn'`,
    [postId],
  );
}
export async function collect(
  source: SourceExport,
  method = "approved export",
) {
  const start = DateTime.utc();
  const run = (
    await db("ingest").query(
      "INSERT INTO app.sync_runs(source_id) VALUES($1) RETURNING id",
      [source.source],
    )
  ).rows[0].id;
  await db("ingest").query(
    "UPDATE app.sources SET last_attempt=$2 WHERE id=$1",
    [source.source, start.toISO()],
  );
  try {
    const count = await transaction("ingest", async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        source.source,
      ]);
      const current = (
        await c.query("SELECT * FROM app.sources WHERE id=$1 FOR UPDATE", [
          source.source,
        ])
      ).rows[0];
      const cutoff = current.last_success
        ? DateTime.fromJSDate(current.last_success)
        : start.minus({ days: positiveDays(process.env.BACKFILL_DAYS, 30) });
      const through = DateTime.fromISO(source.completeThrough);
      if (
        DateTime.fromISO(source.coverageStart) > cutoff ||
        through > start ||
        through < cutoff
      )
        throw new Error("Export does not cover the required checkpoint window");
      let checkpoint = Number(current.checkpoint),
        count = 0;
      for (const post of source.posts) {
        if (DateTime.fromISO(post.publishedAt) > through)
          throw new Error("Post exceeds export completion boundary");
        const digest = hash(post),
          previous = (
            await c.query(
              "SELECT * FROM app.source_posts WHERE source_id=$1 AND message_id=$2",
              [source.source, post.messageId],
            )
          ).rows[0];
        if (previous?.hash === digest) {
          checkpoint = Math.max(checkpoint, post.messageId);
          continue;
        }
        const saved = (
          await c.query(
            `INSERT INTO app.source_posts(source_id,message_id,permalink,published_at,hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(source_id,message_id) DO UPDATE SET hash=excluded.hash RETURNING id`,
            [
              source.source,
              post.messageId,
              `https://t.me/${source.source}/${post.messageId}`,
              post.publishedAt,
              digest,
            ],
          )
        ).rows[0];
        if (previous) await suspend(c, saved.id);
        await c.query(
          `INSERT INTO app.post_revisions(post_id,hash,evidence) VALUES($1,$2,$3) ON CONFLICT(post_id,hash) DO NOTHING`,
          [
            saved.id,
            digest,
            JSON.stringify({ ...post, text: normalise(post.text) }),
          ],
        );
        checkpoint = Math.max(checkpoint, post.messageId);
        count++;
      }
      await c.query(
        "UPDATE app.sources SET checkpoint=$2,last_success=$3,status=$4 WHERE id=$1",
        [source.source, checkpoint, through.toISO(), `Healthy · ${method}`],
      );
      return count;
    });
    await db("ingest").query(
      "UPDATE app.sync_runs SET finished_at=now(),outcome='success',counts=$2 WHERE id=$1",
      [run, JSON.stringify({ collected: count })],
    );
    return { source: source.source, ok: true, count };
  } catch (error) {
    await db("ingest").query(
      "UPDATE app.sources SET status='Failed · checkpoint retained' WHERE id=$1",
      [source.source],
    );
    await db("ingest").query(
      "UPDATE app.sync_runs SET finished_at=now(),outcome='failed',error=$2 WHERE id=$1",
      [run, error instanceof Error ? error.message : "Import failed"],
    );
    return { source: source.source, ok: false, count: 0 };
  }
}
export async function processPending(
  pipeline: PromotionPipeline = defaultPromotionPipeline(),
) {
  const pending = (
    await db("ingest").query(
      `SELECT r.id FROM app.post_revisions r JOIN app.source_posts p ON p.id=r.post_id AND p.hash=r.hash WHERE NOT EXISTS(SELECT 1 FROM app.processing_attempts a WHERE a.revision_id=r.id AND a.parser_version=$1 AND a.outcome<>'retryable_error') LIMIT 500`,
      [parserVersion],
    )
  ).rows;
  for (const row of pending) {
    try {
      // Resolve network dependencies before taking database publication locks.
      const snapshot = (
        await db("ingest").query(
          "SELECT r.evidence,p.source_id,p.message_id FROM app.post_revisions r JOIN app.source_posts p ON p.id=r.post_id WHERE r.id=$1",
          [row.id],
        )
      ).rows[0];
      const rawPost = postSchema.parse(snapshot.evidence);
      const automated = rawPost.candidates.length
        ? []
        : await pipeline.process({
            text: rawPost.text,
            publishedAt: rawPost.publishedAt,
            channel: snapshot.source_id,
            label:
              snapshot.source_id === "sgfooddeals"
                ? "SG Food Deals"
                : "TasteSoul",
            url: `https://t.me/${snapshot.source_id}/${snapshot.message_id}`,
          });
      await transaction("ingest", async (c) => {
        const revision = (
          await c.query(
            "SELECT r.*,p.source_id,p.message_id FROM app.post_revisions r JOIN app.source_posts p ON p.id=r.post_id WHERE r.id=$1 FOR UPDATE OF r",
            [row.id],
          )
        ).rows[0];
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          revision.source_id,
        ]);
        // Serialize against candidate review before rechecking latest source/state.
        await c.query(
          "SELECT id FROM app.candidates WHERE revision_id=$1 FOR UPDATE",
          [row.id],
        );
        const latest = (
          await c.query(
            "SELECT hash FROM app.source_posts WHERE id=$1 FOR UPDATE",
            [revision.post_id],
          )
        ).rows[0];
        if (latest.hash !== revision.hash) return;
        if (
          (
            await c.query(
              "SELECT 1 FROM app.processing_attempts WHERE revision_id=$1 AND parser_version=$2 AND outcome<>'retryable_error'",
              [row.id, parserVersion],
            )
          ).rowCount
        )
          return;
        const post = postSchema.parse(revision.evidence),
          allIssues: string[] = [];
        if (
          !post.candidates.length &&
          (
            await c.query(
              "SELECT 1 FROM app.candidates WHERE revision_id=$1 AND status IN ('resolved','published','excluded') LIMIT 1",
              [row.id],
            )
          ).rowCount
        ) {
          await c.query(
            "INSERT INTO app.processing_attempts(revision_id,parser_version,outcome,issues) VALUES($1,$2,'needs_review',$3)",
            [
              row.id,
              parserVersion,
              JSON.stringify(["reviewed_revision_preserved"]),
            ],
          );
          return;
        }
        const processingCandidates = post.candidates.length
          ? post.candidates
          : automated
              .filter((result) => result.action === "approve")
              .map((result) => ({
                key: result.key,
                promotion: result.promotion,
              }));
        for (const candidate of processingCandidates) {
          if (
            !post.candidates.length &&
            (
              await c.query(
                "SELECT 1 FROM app.candidates WHERE revision_id=$1 AND candidate_key=$2 AND status<>'needs_review'",
                [row.id, candidate.key],
              )
            ).rowCount
          )
            continue;
          const { promotion: p, issues } = cleanCandidate(candidate.promotion);
          if (!post.candidates.length && p) {
            const today = DateTime.now().setZone("Asia/Singapore").toISODate()!;
            if (
              !p.startDate ||
              !p.endDate ||
              p.startDate > today ||
              p.endDate < today
            ) {
              issues.push("validity_changed_before_publication");
              p.status = "needs_review";
            }
          }
          // Structured imports and deterministic verified results share publication reconciliation.
          if (p) {
            p.sources = [
              {
                label:
                  revision.source_id === "sgfooddeals"
                    ? "SG Food Deals"
                    : "TasteSoul",
                url: `https://t.me/${revision.source_id}/${revision.message_id}`,
              },
            ];
            // Serialise equivalent offer matching across both channels.
            await c.query(
              "SELECT pg_advisory_xact_lock(hashtext('offer-reconciliation'))",
            );
            const existing = (
              await c.query(
                "SELECT * FROM app.promotions WHERE id=$1 FOR UPDATE",
                [p.id],
              )
            ).rows[0];
            if (existing) {
              issues.push("existing_identity_requires_review");
              p.status = "needs_review";
            }
            const equivalent = (
              await c.query(
                "SELECT * FROM app.promotions WHERE fingerprint=$1 AND status='published' AND admin_corrected=false LIMIT 1 FOR UPDATE",
                [fingerprint(p)],
              )
            ).rows[0];
            const conflict = (
              await c.query(
                "SELECT id FROM app.promotions WHERE lower(merchant)=lower($1) AND data->>'title'=$2 AND fingerprint<>$3 AND status<>'withdrawn' LIMIT 1",
                [p.merchant, p.title, fingerprint(p)],
              )
            ).rowCount;
            if (conflict) {
              issues.push("conflicting_terms");
              p.status = "needs_review";
              await c.query(
                `UPDATE app.promotions SET status='needs_review',revision=revision+1,data=jsonb_set(jsonb_set(data,'{status}','"needs_review"'),'{revision}',to_jsonb(revision+1)) WHERE lower(merchant)=lower($1) AND data->>'title'=$2 AND fingerprint<>$3 AND status='published'`,
                [p.merchant, p.title, fingerprint(p)],
              );
            }
            if (equivalent && !issues.length) {
              const merged: Promotion = equivalent.data;
              merged.sources = [...merged.sources, ...p.sources].filter(
                (s, i, a) => a.findIndex((x) => x.url === s.url) === i,
              );
              merged.revision++;
              await savePromotion(c, merged);
              p.id = merged.id;
              await c.query(
                "INSERT INTO app.promotion_sources VALUES($1,$2) ON CONFLICT DO NOTHING",
                [merged.id, revision.post_id],
              );
            } else if (!existing) {
              await savePromotion(c, p);
              await c.query(
                "INSERT INTO app.promotion_sources VALUES($1,$2) ON CONFLICT DO NOTHING",
                [p.id, revision.post_id],
              );
            }
          }
          allIssues.push(...issues);
          await c.query(
            `INSERT INTO app.candidates(revision_id,candidate_key,data,issues,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(revision_id,candidate_key) DO UPDATE SET data=excluded.data,issues=excluded.issues,status=excluded.status`,
            [
              row.id,
              candidate.key,
              JSON.stringify(
                automated.length
                  ? {
                      ...(p ?? {}),
                      resolutionAudit: {
                        ...automated.find((r) => r.key === candidate.key)
                          ?.audit,
                        classification: issues.length
                          ? "unresolved"
                          : "approve",
                        reasons: issues.length
                          ? issues
                          : ["verified_and_reconciled"],
                        canonicalPromotionId: p?.id,
                      },
                    }
                  : (p ?? candidate.promotion),
              ),
              JSON.stringify(issues),
              issues.length ? "needs_review" : "published",
            ],
          );
        }
        await c.query(
          "INSERT INTO app.processing_attempts(revision_id,parser_version,outcome,issues) VALUES($1,$2,$3,$4)",
          [
            row.id,
            parserVersion,
            post.candidates.length
              ? allIssues.length
                ? "needs_review"
                : "published"
              : !automated.length ||
                  allIssues.length ||
                  automated.some((result) => result.action === "unresolved")
                ? "needs_review"
                : automated.every((result) => result.action === "approve")
                  ? "published"
                  : automated.every((result) => result.action === "exclude")
                    ? "excluded"
                    : "completed",
            JSON.stringify(
              post.candidates.length
                ? allIssues
                : [
                    ...allIssues,
                    ...automated.flatMap((result) => result.reasons),
                  ],
            ),
          ],
        );
        if (!post.candidates.length) {
          await c.query(
            "UPDATE app.candidates SET status='superseded' WHERE revision_id=$1 AND status='needs_review' AND NOT(candidate_key=ANY($2::text[]))",
            [row.id, automated.map((result) => result.key)],
          );
          for (const result of automated.filter(
            (result) => result.action !== "approve",
          )) {
            await c.query(
              "INSERT INTO app.candidates(revision_id,candidate_key,data,issues,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(revision_id,candidate_key) DO UPDATE SET data=excluded.data,issues=excluded.issues,status=excluded.status WHERE app.candidates.status='needs_review'",
              [
                row.id,
                result.key,
                JSON.stringify({
                  ...result.suggestion,
                  resolutionAudit: result.audit,
                }),
                JSON.stringify(result.reasons),
                result.action === "exclude" ? "excluded" : "needs_review",
              ],
            );
          }
        }
      });
    } catch {
      await db("ingest").query(
        "INSERT INTO app.processing_attempts(revision_id,parser_version,outcome,issues) VALUES($1,$2,'retryable_error','[\"processing_failed\"]')",
        [row.id, parserVersion],
      );
    }
  }
  return pending.length;
}
export async function runExports(exports: SourceExport[]) {
  const results = [];
  for (const source of exports) results.push(await collect(source));
  await processPending();
  return results;
}
