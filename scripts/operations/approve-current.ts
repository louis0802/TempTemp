/** One-time source-checked batch requested on 16 September 2026. Not a recurring auto-approval policy. */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  promotionSchema,
  publicationIssues,
  validity,
} from "../../src/domain/promotion";
import { transaction, closeDatabases } from "../../src/server/db";
import { savePromotion } from "../../src/server/db/publication";
const target = new URL(process.env.ADMIN_DATABASE_URL ?? "http://invalid");
if (
  !["localhost", "127.0.0.1"].includes(target.hostname) ||
  target.port !== "55432"
)
  throw new Error(
    "This one-time operation is restricted to the local Docker database",
  );
const now = new Date().toISOString();
const recipes = [
  {
    merchant: "Bari Bari Steak",
    title: "1-for-1 Teppan opening offer",
    category: "Meals" as const,
    description:
      "Share a 1-for-1 Teppan meal at the new 313@somerset outlet. Eligible mains include access to the free-flow salad bar.",
    startDate: "2026-09-15",
    endDate: "2026-09-18",
    weekdays: null,
    hours: { start: "11:00", end: "22:00" },
    scheduleLabel: "Daily · 11am–10pm · 15–18 September",
    terms: [
      "Dine-in at the 313@somerset outlet only.",
      "The second eligible main must be of equal or lower value.",
      "Excludes Oyster Blade Teppan and Miyazaki Beef Teppan.",
      "Each transaction includes a $10 return voucher; redemption on a subsequent visit requires a minimum $60 spend.",
      "Check the original source for the full merchant terms before ordering.",
    ],
    branch: "313@somerset",
    address: "313 Orchard Road, #B3-25/26/27, Singapore 238895",
    lat: 1.30102,
    lng: 103.83829,
    urls: ["https://t.me/sgfooddeals/4935", "https://t.me/tastesoulsg/4483"],
    evidence:
      "Participation and terms: both linked channel posts; corroborated opening offer and address at https://greatnewplaces.com/culinary/bari-bari-steak-somerset/ (15 September 2026). Store hours: https://www.313somerset.com.sg/opening-hours/. Building-level coordinates: https://mapcarta.com/W52236347. Unit retained separately.",
  },
  {
    merchant: "Lucine by LUNA",
    title: "1-for-1 mains, pasta and savoury selections",
    category: "Cafés" as const,
    description:
      "An evening 1-for-1 offer on mains at Lucine in 111 Somerset, available Wednesday through Friday.",
    startDate: "2026-09-02",
    endDate: "2026-10-23",
    weekdays: [3, 4, 5],
    hours: { start: "17:00", end: "21:00" },
    scheduleLabel: "Wed–Fri · 5pm–10pm · last order 9pm",
    terms: [
      "Valid Wednesday, Thursday and Friday only.",
      "Offer dining window is 5pm–10pm; place the last order before 9pm.",
      "Applies at Lucine by LUNA, 111 Somerset, #01-06.",
      "Includes mains, pasta and savoury selections described in the source posts.",
      "Additional merchant terms and menu restrictions may apply; check the original source before ordering.",
    ],
    branch: "111 Somerset",
    address: "111 Somerset Road, #01-06, Singapore 238164",
    lat: 1.300417,
    lng: 103.837222,
    urls: ["https://t.me/sgfooddeals/4929", "https://t.me/tastesoulsg/4465"],
    evidence:
      "Participation and Wed–Fri schedule: both linked source posts. Current 2 September–23 October 2026 offer and 9pm last-order cutoff corroborated at https://sg.everydayonsales.com/2-september-23-october-2026-lucine-by-luna-1-for-1-mains-promotion-every-wednesday-to-friday-at-tripleone-somerset/. Mall address: https://111somerset.com.sg/retail/. Building-level coordinates: https://en.wikipedia.org/wiki/111_Somerset. Earlier May/August promotion is a separate expired campaign.",
  },
];
try {
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await auth.auth.signInWithPassword({
    email: "admin@local.test",
    password: "LocalReview2026!",
  });
  if (error || !data.user)
    throw new Error("Local administrator authentication failed");
  const results = await transaction("admin", async (c) => {
    if (
      !(
        await c.query("SELECT 1 FROM app.administrators WHERE user_id=$1", [
          data.user!.id,
        ])
      ).rowCount
    )
      throw new Error("Administrator allowlist check failed");
    const approved = [];
    for (const r of recipes) {
      const rows = (
        await c.query(
          "SELECT ca.id,ca.data,sp.id AS post_id,sp.permalink,s.label FROM app.candidates ca JOIN app.post_revisions rev ON rev.id=ca.revision_id JOIN app.source_posts sp ON sp.id=rev.post_id AND sp.hash=rev.hash JOIN app.sources s ON s.id=sp.source_id WHERE sp.permalink=ANY($1::text[]) AND ca.status='needs_review' ORDER BY ca.id FOR UPDATE OF ca,sp",
          [r.urls],
        )
      ).rows;
      if (rows.length !== 2) {
        approved.push({
          merchant: r.merchant,
          status: "skipped: candidates no longer both pending",
        });
        continue;
      }
      const p = promotionSchema.parse({
        id: randomUUID(),
        merchant: r.merchant,
        title: r.title,
        category: r.category,
        benefit: "1-for-1",
        description: r.description,
        terms: r.terms,
        startDate: r.startDate,
        endDate: r.endDate,
        weekdays: r.weekdays,
        hours: r.hours,
        scheduleLabel: r.scheduleLabel,
        excludePublicHolidays: false,
        holidayDates: [],
        holidayCalendarThrough: null,
        outlets: [
          {
            id: randomUUID(),
            name: r.branch,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            evidence: r.evidence,
            verifiedAt: now,
          },
        ],
        sources: rows.map((row) => ({ label: row.label, url: row.permalink })),
        verifiedAt: now,
        reviewDueAt: null,
        status: "published",
        revision: 1,
      });
      if (publicationIssues(p).length || !validity(p).ongoing)
        throw new Error("Offer does not meet current publication requirements");
      await savePromotion(c, p, true);
      for (const row of rows) {
        await c.query(
          "INSERT INTO app.promotion_sources(promotion_id,post_id) VALUES($1,$2)",
          [p.id, row.post_id],
        );
        await c.query(
          "UPDATE app.candidates SET status='resolved' WHERE id=$1",
          [row.id],
        );
      }
      await c.query(
        "INSERT INTO app.review_history(promotion_id,actor,action,reason,before_data,after_data) VALUES($1,$2,'auto_approve_once',$3,$4,$5)",
        [
          p.id,
          data.user!.id,
          "User requested auto approval for now. One-time source-checked batch; duplicate channel references combined. " +
            r.evidence,
          JSON.stringify(
            rows.map((row) => ({ candidateId: row.id, data: row.data })),
          ),
          JSON.stringify(p),
        ],
      );
      approved.push({ merchant: p.merchant, id: p.id, status: p.status });
    }
    return approved;
  });
  console.log(JSON.stringify(results));
} finally {
  await closeDatabases();
}
