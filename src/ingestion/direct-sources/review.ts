import type { PoolClient } from "pg";
import { promotionSchema, publicationIssues } from "../../domain/promotion";
import { HttpError } from "../../server/http";
import { enabledDirectSource } from "./persistence";
import { directPromotionId, trustedDirectSource } from "./publication";
import { publishDirectDraft } from "./publish-store";
import type { SourceId } from "./types";

export async function reviewDirectCandidate(
  c: PoolClient,
  id: string,
  input: { action: "approve" | "exclude"; promotion?: unknown; reason: string },
  actor: string,
) {
  const identity = (
    await c.query(
      "SELECT i.source_id FROM app.direct_candidates c JOIN app.direct_source_revisions r ON r.id=c.source_revision_id JOIN app.direct_source_items i ON i.id=r.item_id WHERE c.id=$1",
      [id],
    )
  ).rows[0];
  if (!identity) throw new HttpError(404, "Candidate not found.");
  const source = enabledDirectSource(identity.source_id as SourceId);
  await c.query(
    "SELECT source_id FROM app.direct_source_health WHERE source_id=$1 FOR UPDATE",
    [source.id],
  );
  await c.query("LOCK TABLE app.promotions IN SHARE ROW EXCLUSIVE MODE");
  const row = (
    await c.query(
      `SELECT c.*,i.id AS item_id,i.current_revision_id,i.canonical_url
    FROM app.direct_candidates c JOIN app.direct_source_revisions r ON r.id=c.source_revision_id JOIN app.direct_source_items i ON i.id=r.item_id WHERE c.id=$1 FOR UPDATE OF c,i`,
      [id],
    )
  ).rows[0];
  if (
    row.status !== "needs_review" ||
    row.source_revision_id !== row.current_revision_id
  )
    throw new HttpError(
      409,
      "This candidate changed or was already reviewed. Reload the inbox.",
    );
  if (input.action === "exclude") {
    await c.query(
      "UPDATE app.direct_candidates SET status='excluded',updated_at=now() WHERE id=$1",
      [id],
    );
    await c.query(
      "INSERT INTO app.review_history(actor,action,reason,before_data,after_data) VALUES($1,'exclude_direct_candidate',$2,$3,$4)",
      [
        actor,
        input.reason,
        JSON.stringify({ candidateId: id, data: row.data }),
        JSON.stringify({ status: "excluded" }),
      ],
    );
    return { status: "excluded" };
  }
  if (
    !input.promotion ||
    typeof input.promotion !== "object" ||
    Array.isArray(input.promotion)
  )
    throw new HttpError(400, "A complete promotion is required.");
  const p = promotionSchema.parse({
    ...input.promotion,
    id: directPromotionId(source.id, row.candidate_key),
    merchant: source.publicationPolicy.merchant,
    category: source.publicationPolicy.category,
    sources: [trustedDirectSource(source, row.canonical_url)],
    status: "published",
    revision: 1,
    verifiedAt: new Date().toISOString(),
  });
  if (publicationIssues(p).length)
    throw new HttpError(
      400,
      "Resolve validity and evidence issues before approval.",
    );
  const saved = await publishDirectDraft(
    c,
    p,
    {
      sourceId: source.id,
      itemId: row.item_id,
      revisionId: row.source_revision_id,
      canonicalUrl: row.canonical_url,
    },
    true,
  );
  if (!saved.promotion) throw new HttpError(409, saved.reasons.join("; "));
  await c.query(
    "UPDATE app.direct_candidates SET status='resolved',promotion_id=$2,updated_at=now() WHERE id=$1",
    [id, saved.promotion.id],
  );
  await c.query(
    "INSERT INTO app.review_history(promotion_id,actor,action,reason,before_data,after_data) VALUES($1,$2,'approve_direct_candidate',$3,$4,$5)",
    [
      saved.promotion.id,
      actor,
      input.reason,
      JSON.stringify(row.data),
      JSON.stringify(saved.promotion),
    ],
  );
  return { promotion: saved.promotion };
}
