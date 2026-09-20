import { createHash } from "node:crypto";
import { PoolClient } from "pg";
import { Promotion } from "@/domain/promotion";
export function fingerprint(p: Promotion) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        merchant: p.merchant.toLowerCase(),
        title: p.title,
        benefit: p.benefit,
        description: p.description,
        terms: p.terms,
        start: p.startDate,
        end: p.endDate,
        weekdays: p.weekdays,
        hours: p.hours,
        ...(p.redemptionCutoff ? { redemptionCutoff: p.redemptionCutoff } : {}),
        schedule: p.scheduleLabel,
        holidays: p.holidayDates,
        exclude: p.excludePublicHolidays,
        outlets: p.outlets.map((o) => o.id).sort(),
      }),
    )
    .digest("hex");
}
export async function savePromotion(
  c: PoolClient,
  p: Promotion,
  adminCorrected = false,
) {
  await c.query(
    `INSERT INTO app.promotions(id,merchant,fingerprint,status,revision,admin_corrected,data) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET merchant=excluded.merchant,fingerprint=excluded.fingerprint,status=excluded.status,revision=excluded.revision,admin_corrected=app.promotions.admin_corrected OR excluded.admin_corrected,data=excluded.data,updated_at=now()`,
    [
      p.id,
      p.merchant,
      fingerprint(p),
      p.status,
      p.revision,
      adminCorrected,
      JSON.stringify(p),
    ],
  );
  await c.query("DELETE FROM app.promotion_outlets WHERE promotion_id=$1", [
    p.id,
  ]);
  for (const o of p.outlets) {
    // Shared outlet identity must not silently move a previously verified branch.
    const existing = (
      await c.query("SELECT data FROM app.outlets WHERE id=$1", [o.id])
    ).rows[0]?.data;
    if (
      existing &&
      (existing.lat !== o.lat ||
        existing.lng !== o.lng ||
        existing.address !== o.address)
    )
      throw new Error("Outlet identity conflicts with verified directory");
    await c.query(
      "INSERT INTO app.outlets(id,data,location) VALUES($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography) ON CONFLICT(id) DO NOTHING",
      [o.id, JSON.stringify(o), o.lng, o.lat],
    );
    await c.query(
      "INSERT INTO app.promotion_outlets(promotion_id,outlet_id) VALUES($1,$2)",
      [p.id, o.id],
    );
  }
}
