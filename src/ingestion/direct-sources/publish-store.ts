import type { PoolClient } from "pg";
import {
  promotionSchema,
  publicationIssues,
  type Promotion,
} from "../../domain/promotion";
import { fingerprint, savePromotion } from "../../server/db/publication";
import { sourceDefinition } from "./registry";
import { trustedDirectSource } from "./publication";
import type { SourceId } from "./types";

export interface DirectLink {
  sourceId: SourceId;
  itemId: string;
  revisionId: string;
  canonicalUrl: string;
}
export type StoredPromotion = {
  id: string;
  data: Promotion;
  revision: number;
  admin_corrected: boolean;
  status: Promotion["status"];
};
export async function managedPromotion(
  c: PoolClient,
  itemId: string,
): Promise<StoredPromotion | undefined> {
  return (
    await c.query<StoredPromotion>(
      "SELECT p.* FROM app.promotions p JOIN app.promotion_direct_sources s ON s.promotion_id=p.id WHERE s.source_item_id=$1 FOR UPDATE OF p",
      [itemId],
    )
  ).rows[0];
}
async function attach(
  c: PoolClient,
  p: Promotion,
  link: DirectLink,
  manual = false,
) {
  const direct = trustedDirectSource(
    sourceDefinition(link.sourceId),
    link.canonicalUrl,
  );
  const sources = p.sources.filter(
    (s) =>
      !(
        "kind" in s &&
        s.kind === "direct" &&
        s.sourceId === link.sourceId &&
        s.url === link.canonicalUrl
      ),
  );
  const result = promotionSchema.parse({ ...p, sources: [...sources, direct] });
  // Autonomous provenance attachment preserves facts/revision; manual completion retains administrator ownership.
  await c.query(
    "UPDATE app.promotions SET data=$2,admin_corrected=admin_corrected OR $3,updated_at=now() WHERE id=$1",
    [result.id, JSON.stringify(result), manual],
  );
  await c.query(
    `INSERT INTO app.promotion_direct_sources(promotion_id,source_id,source_item_id,source_revision_id) VALUES($1,$2,$3,$4)
    ON CONFLICT(source_item_id) DO UPDATE SET promotion_id=excluded.promotion_id,source_revision_id=excluded.source_revision_id,attached_at=now()`,
    [result.id, link.sourceId, link.itemId, link.revisionId],
  );
  return result;
}
/** Caller holds source/item locks and promotion-table writer lock. No origin-specific matching. */
export async function publishDirectDraft(
  c: PoolClient,
  draft: Promotion,
  link: DirectLink,
  manual = false,
): Promise<{
  result: "published" | "updated" | "attached" | "needs_review";
  promotion?: Promotion;
  existing?: Promotion;
  reasons: string[];
}> {
  const source = sourceDefinition(link.sourceId);
  if (!source.publicationPolicy.enabled)
    throw new Error("direct_publication_disabled");
  const current = await managedPromotion(c, link.itemId);
  if (current?.admin_corrected && !manual)
    return {
      result: "needs_review",
      existing: current.data,
      reasons: ["authoritative_source_changed_after_admin_correction"],
    };
  if (current?.status === "withdrawn" && !manual)
    return {
      result: "needs_review",
      existing: current.data,
      reasons: ["existing_promotion_withdrawn"],
    };
  const p = promotionSchema.parse({
    ...draft,
    id: current?.id ?? draft.id,
    revision: current ? current.revision + 1 : 1,
    status: "published",
    sources: [
      ...(current?.data.sources ?? []).filter(
        (s) =>
          !(
            "kind" in s &&
            s.kind === "direct" &&
            s.sourceId === link.sourceId &&
            s.url === link.canonicalUrl
          ),
      ),
      trustedDirectSource(source, link.canonicalUrl),
    ],
  });
  if (publicationIssues(p).length)
    throw new Error("incomplete_direct_publication");
  const exact = (
    await c.query<StoredPromotion>(
      "SELECT * FROM app.promotions WHERE fingerprint=$1 AND status='published' AND id<>$2 ORDER BY id FOR UPDATE",
      [fingerprint(p), p.id],
    )
  ).rows[0];
  if (exact) {
    // An update must not silently reassign the managed item to a different visible offer.
    if (current)
      return {
        result: "needs_review",
        existing: exact.data,
        reasons: ["existing_offer_terms_conflict"],
      };
    return {
      result: "attached",
      promotion: await attach(c, exact.data, link, manual),
      reasons: [],
    };
  }
  const conflict = (
    await c.query<StoredPromotion>(
      "SELECT * FROM app.promotions WHERE merchant=$1 AND data->>'title'=$2 AND id<>$3 ORDER BY id FOR UPDATE",
      [p.merchant, p.title, p.id],
    )
  ).rows[0];
  if (conflict)
    return {
      result: "needs_review",
      existing: conflict.data,
      reasons: ["existing_offer_terms_conflict"],
    };
  const collision =
    !current &&
    (await c.query("SELECT 1 FROM app.promotions WHERE id=$1", [p.id]))
      .rowCount;
  if (collision)
    return { result: "needs_review", reasons: ["promotion_identity_conflict"] };
  await savePromotion(c, p, manual);
  return {
    result: current ? "updated" : "published",
    promotion: await attach(c, p, link, manual),
    reasons: [],
  };
}
export async function suspendDirectPromotion(
  c: PoolClient,
  current: StoredPromotion,
) {
  if (
    current.admin_corrected ||
    current.status === "withdrawn" ||
    current.status === "needs_review"
  )
    return;
  const p = {
    ...current.data,
    status: "needs_review" as const,
    revision: current.revision + 1,
  };
  await c.query(
    "UPDATE app.promotions SET status='needs_review',revision=$2,data=$3,updated_at=now() WHERE id=$1",
    [p.id, p.revision, JSON.stringify(p)],
  );
}
