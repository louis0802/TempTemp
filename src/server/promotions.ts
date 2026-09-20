import { DateTime } from "luxon";
import { demoPromotions } from "@/domain/demo";
import {
  PromotionResponse,
  promotionSchema,
  validity,
  zone,
} from "@/domain/promotion";
import { db } from "./db";
export const isDemo = () => process.env.DEMO_MODE === "true";
export async function getPromotions(
  bounds: number[],
  category: string,
  cursor: string | null,
  now: DateTime = DateTime.now(),
): Promise<PromotionResponse> {
  let rows;
  if (isDemo()) rows = demoPromotions();
  else {
    const today = now.setZone(zone).toISODate();
    const result = await db().query(
      `SELECT p.data FROM app.promotions p WHERE p.status='published' AND p.data->>'startDate'<=$1 AND p.data->>'endDate'>=$1 AND ($2='All' OR p.data->>'category'=$2) AND ($3::uuid IS NULL OR p.id>$3::uuid) AND EXISTS(SELECT 1 FROM app.promotion_outlets po JOIN app.outlets o ON o.id=po.outlet_id WHERE po.promotion_id=p.id AND ST_Intersects(o.location::geometry,ST_MakeEnvelope($4,$5,$6,$7,4326))) ORDER BY p.id LIMIT 201`,
      [today, category, cursor, ...bounds],
    );
    rows = result.rows.map((r) => promotionSchema.parse(r.data));
  }
  const [w, s, e, n] = bounds;
  const eligible = rows
    .filter(
      (p) =>
        (!cursor || p.id > cursor) &&
        (category === "All" || p.category === category) &&
        validity(p, now).ongoing,
    )
    .map((p) => ({
      ...p,
      outlets: p.outlets.filter(
        (o) => o.lng >= w && o.lng <= e && o.lat >= s && o.lat <= n,
      ),
      ...validity(p, now),
    }))
    .filter((p) => p.outlets.length)
    .sort((a, b) => a.id.localeCompare(b.id));
  const items = eligible.slice(0, 200);
  const sources = isDemo()
    ? ["sgfooddeals", "tastesoulsg"].map((id, i) => ({
        id,
        label: i ? "TasteSoul" : "SG Food Deals",
        lastSuccess: null,
        lastAttempt: null,
        status: "Demo · not connected",
      }))
    : (
        await db().query(
          'SELECT id,label,last_success AS "lastSuccess",last_attempt AS "lastAttempt",status FROM app.sources ORDER BY id',
        )
      ).rows;
  return {
    items,
    nextCursor: eligible.length > 200 ? items.at(-1)!.id : null,
    sources,
    demo: isDemo(),
  };
}
export async function getPromotion(id: string) {
  const p = isDemo()
    ? demoPromotions().find((p) => p.id === id)
    : (
        await db().query(
          "SELECT data FROM app.promotions WHERE id=$1 AND status='published'",
          [id],
        )
      ).rows[0]?.data;
  if (!p) return null;
  const parsed = promotionSchema.parse(p);
  return validity(parsed).ongoing ? { ...parsed, ...validity(parsed) } : null;
}
