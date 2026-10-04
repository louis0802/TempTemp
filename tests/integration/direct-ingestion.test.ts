import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { closeDatabases, db } from "@/server/db";
import { savePromotion, fingerprint } from "@/server/db/publication";
import { persistDirectSourceRun } from "@/ingestion/direct-sources/persistence";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import {
  directPromotionId,
  evaluateDirectPublication,
  singaporeObservationDate,
  directCampaignLifecycle,
  DIRECT_SOURCE_PROCESSOR_VERSION,
  directRevisionHash,
} from "@/ingestion/direct-sources/publication";
import {
  capturedPepperRun,
  capturedOutletResolver,
  capturedShakeRun,
  capturedShakeOutletResolver,
} from "../helpers/direct-source-fixtures";
import { GET as inbox } from "@/app/api/admin/review/route";
import { POST as review } from "@/app/api/admin/direct-candidates/[id]/review/route";
import { POST as correctOffer } from "@/app/api/admin/promotions/[id]/review/route";
import type { DirectSourceRun } from "@/ingestion/direct-sources/runner";
import type { Promotion } from "@/domain/promotion";

const admin = new Pool({
  connectionString:
    "postgres://postgres:local-postgres-only@localhost:55432/promotions",
});
const database = `direct_test_${Date.now()}_${process.pid}`;
let pool: Pool, token: string, actor: string;
const legacyTables = [
  "source_posts",
  "post_revisions",
  "candidates",
  "promotion_sources",
];
let legacyBefore: unknown;
async function legacyShape() {
  return (
    await pool.query(
      `SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='app' AND table_name=ANY($1) ORDER BY table_name,ordinal_position`,
      [legacyTables],
    )
  ).rows;
}
async function count(table: string) {
  return Number(
    (await pool.query(`SELECT count(*) AS n FROM app.${table}`)).rows[0].n,
  );
}
async function promotion() {
  return (await pool.query("SELECT * FROM app.promotions ORDER BY id")).rows[0];
}
async function candidate() {
  return (
    await pool.query(
      "SELECT * FROM app.direct_candidates WHERE status='needs_review' ORDER BY created_at DESC",
    )
  ).rows[0];
}
async function ingest(run: DirectSourceRun, processorVersion?: string) {
  return persistDirectSourceRun(run, {
    pool,
    resolveOutlets: capturedOutletResolver(),
    processorVersion,
  });
}
function request(body?: unknown) {
  return new Request("http://127.0.0.1:3100/api/admin/review", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function draft(run: DirectSourceRun): Promise<Promotion> {
  return evaluateDirectPublication(run.candidates[0], {
    ...(await capturedOutletResolver()(run.candidates[0])),
    acquisitionReady: true,
    verifiedAt: run.observedAt,
    asOf: singaporeObservationDate(run.observedAt),
  }).promotion!;
}
async function saveExisting(p: Promotion, adminCorrected = false) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await savePromotion(c, p, adminCorrected);
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
beforeAll(async () => {
  process.loadEnvFile(".env.local");
  await admin.query(`CREATE DATABASE ${database}`);
  pool = new Pool({
    connectionString: `postgres://postgres:local-postgres-only@localhost:55432/${database}`,
  });
  await pool.query(
    await readFile("supabase/migrations/001_initial.sql", "utf8"),
  );
  legacyBefore = await legacyShape();
  await pool.query(
    await readFile("supabase/migrations/002_direct_sources.sql", "utf8"),
  );
  process.env.ADMIN_DATABASE_URL = `postgres://local_admin:local-admin-only@localhost:55432/${database}`;
  process.env.INGEST_DATABASE_URL = `postgres://local_ingest:local-ingest-only@localhost:55432/${database}`;
  process.env.DATABASE_URL = `postgres://local_web:local-web-only@localhost:55432/${database}`;
  const response = await fetch(
    "http://localhost:54321/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email: "admin@local.test",
        password: "LocalReview2026!",
      }),
    },
  );
  const session = await response.json();
  if (!response.ok) throw new Error("Local administrator setup required");
  token = session.access_token;
  actor = session.user.id;
  await pool.query("INSERT INTO app.administrators(user_id) VALUES($1)", [
    actor,
  ]);
});
afterAll(async () => {
  await closeDatabases();
  await pool?.end();
  await admin.query(`DROP DATABASE IF EXISTS ${database}`);
  await admin.end();
});
beforeEach(async () => {
  await pool.query(
    "TRUNCATE app.direct_source_health,app.direct_source_items,app.direct_source_revisions,app.direct_source_artifacts,app.direct_candidates,app.promotion_direct_sources,app.promotions,app.outlets,app.review_history,app.source_posts,app.post_revisions,app.candidates,app.promotion_sources CASCADE",
  );
});
describe("additive isolated schema and durable direct evidence", () => {
  it("applies after existing schema, preserving legacy tables and public-role denial", async () => {
    expect(await legacyShape()).toEqual(legacyBefore);
    for (const table of [
      "direct_candidates",
      "direct_source_artifacts",
      "direct_source_health",
    ])
      await expect(db().query(`SELECT * FROM app.${table}`)).rejects.toThrow(
        "permission denied",
      );
    expect(await count("source_posts")).toBe(0);
  });
  it("persists accepted Pepper items/revisions/hash-verified artifacts and queues incomplete facts", async () => {
    const run = await capturedPepperRun(),
      result = await ingest(run);
    expect(result).toMatchObject({
      observed: 1,
      newRevisions: 1,
      needsReview: 1,
      autoPublished: 0,
    });
    expect(await count("direct_source_items")).toBe(1);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_source_artifacts")).toBe(2);
    expect(await count("promotions")).toBe(0);
    expect(
      (await pool.query("SELECT external_key FROM app.direct_source_items"))
        .rows[0].external_key,
    ).toBe(run.candidates[0].candidateId);
    expect(
      (
        await pool.query(
          "SELECT last_success,status FROM app.direct_source_health",
        )
      ).rows[0],
    ).toMatchObject({
      status: "Healthy",
      last_success: new Date(run.observedAt),
    });
    for (const table of legacyTables) expect(await count(table)).toBe(0);
  });
  it("identical next-day replay advances last_seen without revision/candidate/promotion duplication", async () => {
    const a = await capturedPepperRun({ complete: true });
    await ingest(a);
    const before = await promotion();
    const b = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T14:00:00.000Z",
    });
    expect(await ingest(b)).toMatchObject({
      unchanged: 1,
      newRevisions: 0,
      autoPublished: 0,
      updated: 0,
    });
    expect(await promotion()).toEqual(before);
    expect(await count("direct_candidates")).toBe(1);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_source_artifacts")).toBe(2);
    const item = (
      await pool.query(
        "SELECT first_seen_at,last_seen_at FROM app.direct_source_items",
      )
    ).rows[0];
    expect(item.first_seen_at).toEqual(new Date(a.observedAt));
    expect(item.last_seen_at).toEqual(new Date(b.observedAt));
  });
  it("replays all seven original captured Pepper candidates conservatively without fabricated validity or participants", async () => {
    const run = await runDirectSource(sourceDefinition("pepper_lunch_sg"), {
      ...(await fixtureTransport(
        "tests/fixtures/direct-sources/pepper-captured-seven/manifest.json",
      )),
      mode: "fixture",
    });
    const result = await ingest(run);
    expect(result).toMatchObject({
      observed: 7,
      newRevisions: 7,
      autoPublished: 0,
      updated: 0,
      needsReview: 7,
    });
    expect(await count("direct_source_items")).toBe(7);
    expect(await count("direct_source_artifacts")).toBe(8);
    expect(await count("promotions")).toBe(0);
    const candidates = (
      await pool.query("SELECT data,status FROM app.direct_candidates")
    ).rows;
    for (const row of candidates) {
      const original = run.candidates.find(
        (c) => c.candidateId === row.data.directCandidate.candidateId,
      )!;
      expect(row.data.startDate).toBe(original.startDate);
      expect(row.data.endDate).toBe(original.endDate);
      expect(row.status).toBe("needs_review");
    }
    expect((await ingest(run)).unchanged).toBe(7);
    expect(await count("direct_candidates")).toBe(7);
  });
  it("uses actual restricted ingest-role grants and transactional publication", async () => {
    const run = await capturedPepperRun({ complete: true });
    expect(
      (
        await persistDirectSourceRun(run, {
          resolveOutlets: capturedOutletResolver(),
        })
      ).autoPublished,
    ).toBe(1);
    expect(await count("promotions")).toBe(1);
  });
  it("processor version changes do not create a source revision", async () => {
    const run = await capturedPepperRun();
    await ingest(run);
    await ingest(run, "direct-source-v2-test");
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_candidates")).toBe(2);
  });
  it("evidence content changes produce new revisions with deduplicated listing bytes", async () => {
    await ingest(await capturedPepperRun());
    const changed = await capturedPepperRun({
      observedAt: "2026-10-01T14:00:00.000Z",
      edit: (body) =>
        body.replace(
          "Not valid with other promotions",
          "Not valid with other discounts",
        ),
    });
    expect((await ingest(changed)).newRevisions).toBe(1);
    expect(await count("direct_source_revisions")).toBe(2);
    expect(await count("direct_source_artifacts")).toBe(3);
    expect(
      (
        await pool.query(
          "SELECT status FROM app.direct_candidates ORDER BY created_at",
        )
      ).rows.map((r) => r.status),
    ).toEqual(["superseded", "needs_review"]);
  });
  it("artifact byte/hash mismatch aborts all persistence and does not advance success", async () => {
    const good = await capturedPepperRun();
    await ingest(good);
    const bad = await capturedPepperRun({
      observedAt: "2026-10-01T14:00:00.000Z",
    });
    bad.pages[0].body = Buffer.from("wrong bytes");
    await expect(ingest(bad)).rejects.toThrow("artifact_hash_mismatch");
    expect(await count("direct_source_revisions")).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT last_success,status FROM app.direct_source_health",
        )
      ).rows[0],
    ).toEqual({ last_success: new Date(good.observedAt), status: "Failed" });
    const c = await pool.connect();
    try {
      await expect(
        c.query(
          "INSERT INTO app.direct_source_artifacts VALUES($1,$2,'text/html',$3,5,now())",
          [good.source.id, "0".repeat(64), Buffer.from("wrong")],
        ),
      ).rejects.toThrow("check constraint");
    } finally {
      c.release();
    }
  });
  it("rejects oversized and cross-source artifacts/evidence", async () => {
    const run = await capturedPepperRun();
    run.pages[0].body = Buffer.alloc(3_000_001);
    await expect(ingest(run)).rejects.toThrow("response_too_large");
    const mixed = await capturedPepperRun();
    mixed.candidates[0].evidence[0].sourceId = "paradise_group_sg";
    await expect(ingest(mixed)).rejects.toThrow("cross_source_evidence");
    expect(await count("direct_source_items")).toBe(0);
    expect(await count("direct_source_artifacts")).toBe(0);
  });
  it("rejects Paradise even when callers supply an enabled policy", async () => {
    const run = await runDirectSource(sourceDefinition("paradise_group_sg"), {
      ...(await fixtureTransport(
        "tests/fixtures/direct-sources/manifest.json",
      )),
      mode: "fixture",
    });
    run.source = {
      ...run.source,
      publicationPolicy: { ...run.source.publicationPolicy, enabled: true },
    };
    await expect(ingest(run)).rejects.toThrow("direct_publication_disabled");
    expect(await count("direct_source_health")).toBe(0);
  });
  it("failed acquisition retains last_success and has no publication work", async () => {
    const good = await capturedPepperRun();
    await ingest(good);
    const bad = await capturedPepperRun({
      observedAt: "2026-10-01T14:00:00.000Z",
    });
    bad.gate.detail_fetch_success = false;
    await expect(ingest(bad)).rejects.toThrow("direct_acquisition_not_ready");
    expect(
      (await pool.query("SELECT last_success FROM app.direct_source_health"))
        .rows[0].last_success,
    ).toEqual(new Date(good.observedAt));
    expect(await count("direct_candidates")).toBe(1);
  });
  it("rolls back a failed candidate/publication transaction without advancing last_success", async () => {
    await pool.query(
      "CREATE FUNCTION app.fail_direct() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER fail_direct BEFORE INSERT ON app.direct_candidates FOR EACH ROW EXECUTE FUNCTION app.fail_direct()",
    );
    try {
      await expect(
        ingest(await capturedPepperRun({ complete: true })),
      ).rejects.toThrow("injected");
      expect(await count("promotions")).toBe(0);
      expect(await count("direct_source_items")).toBe(0);
      expect(
        (await pool.query("SELECT last_success FROM app.direct_source_health"))
          .rows[0].last_success,
      ).toBeNull();
    } finally {
      await pool.query(
        "DROP TRIGGER fail_direct ON app.direct_candidates; DROP FUNCTION app.fail_direct()",
      );
    }
  });
  it("rejects an older crawl that would rewind the current source revision", async () => {
    await ingest(
      await capturedPepperRun({
        complete: true,
        observedAt: "2026-10-01T14:00:00.000Z",
      }),
    );
    await expect(
      ingest(await capturedPepperRun({ complete: true })),
    ).rejects.toThrow("stale_direct_observation");
    expect(await count("direct_source_revisions")).toBe(1);
    expect(
      (await pool.query("SELECT status FROM app.direct_source_health")).rows[0]
        .status,
    ).toBe("Healthy");
  });
});
describe("expired lifecycle persistence and processor separation", () => {
  it("excludes before resolver, retains audit, creates no Promotion/inbox and replays idempotently", async () => {
    const run = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T04:00:00.000Z",
      edit: (body) => body.replace("31 October 2026", "30 September 2026"),
    });
    let calls = 0;
    const result = await persistDirectSourceRun(run, {
      pool,
      resolveOutlets: async () => {
        calls++;
        throw new Error("expired resolver forbidden");
      },
    });
    expect(result).toMatchObject({
      observed: 1,
      excluded: 1,
      autoPublished: 0,
      needsReview: 0,
    });
    expect(calls).toBe(0);
    expect(await count("promotions")).toBe(0);
    expect(await count("direct_source_items")).toBe(1);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_source_artifacts")).toBe(2);
    const row = (await pool.query("SELECT * FROM app.direct_candidates"))
      .rows[0];
    expect(row.status).toBe("excluded");
    expect(row.issues).toContain("expired_campaign");
    expect(row.promotion_id).toBeNull();
    expect((await (await inbox(request())).json()).candidates).toEqual([]);
    expect((await ingest(run)).unchanged).toBe(1);
    expect(await count("direct_candidates")).toBe(1);
  });
  it("v2 reinterprets unchanged v1 bytes without a new source revision and repeated v2 does not duplicate", async () => {
    const run = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T04:00:00.000Z",
      edit: (body) => body.replace("31 October 2026", "30 September 2026"),
    });
    const hash = directRevisionHash(run.candidates[0]);
    await ingest(run, "direct-source-v1");
    // Reproduce the persisted historical v1 disposition independently of today's v2 evaluator.
    await pool.query(
      "UPDATE app.direct_candidates SET status='needs_review',issues='[]'::jsonb",
    );
    expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
    expect((await ingest(run)).excluded).toBe(1);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_candidates")).toBe(2);
    expect(
      (
        await pool.query(
          "SELECT revision_hash FROM app.direct_source_revisions",
        )
      ).rows[0].revision_hash,
    ).toBe(hash);
    expect((await ingest(run)).unchanged).toBe(1);
    expect(await count("direct_candidates")).toBe(2);
  });
  it("same bytes crossing expiry re-evaluate lifecycle without changing source revision or promotion facts", async () => {
    const active = await capturedPepperRun({ complete: true });
    await ingest(active);
    const before = await promotion();
    const expired = await capturedPepperRun({
      complete: true,
      observedAt: "2026-11-01T00:00:00.000Z",
    });
    expect(
      (
        await persistDirectSourceRun(expired, {
          pool,
          resolveOutlets: async () => {
            throw new Error("expired outlet resolution forbidden");
          },
        })
      ).excluded,
    ).toBe(1);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_candidates")).toBe(1);
    expect(await promotion()).toEqual(before);
    expect(
      (await pool.query("SELECT status FROM app.direct_candidates")).rows[0]
        .status,
    ).toBe("excluded");
  });
  it("changed formerly expired bytes can become active without blacklisting item identity", async () => {
    await ingest(
      await capturedPepperRun({
        complete: true,
        observedAt: "2026-10-01T04:00:00.000Z",
        edit: (body) => body.replace("31 October 2026", "30 September 2026"),
      }),
    );
    const active = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T14:00:00.000Z",
    });
    expect((await ingest(active)).autoPublished).toBe(1);
    expect(await count("direct_source_items")).toBe(1);
    expect(await count("direct_source_revisions")).toBe(2);
    expect(await count("promotions")).toBe(1);
  });
  it("expired same-title candidate never touches an existing generic Promotion", async () => {
    const active = await capturedPepperRun({ complete: true }),
      p = await draft(active);
    p.id = randomUUID();
    await saveExisting(p);
    const before = await promotion();
    const expired = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T04:00:00.000Z",
      edit: (body) => body.replace("31 October 2026", "30 September 2026"),
    });
    expect((await ingest(expired)).excluded).toBe(1);
    expect(await promotion()).toEqual(before);
    expect(await count("promotion_direct_sources")).toBe(0);
  });
  it("complete captured Shake run persists four excluded, five review and one active with no historical publishing", async () => {
    const source = sourceDefinition("shake_shack_sg"),
      old = { ...source.publicationPolicy };
    try {
      Object.assign(source.publicationPolicy, {
        enabled: true,
        autoPublish: true,
      });
      const run = await capturedShakeRun(),
        resolver = await capturedShakeOutletResolver(),
        calls: string[] = [];
      const resolveOutlets = async (c: (typeof run.candidates)[number]) => {
        calls.push(c.candidateId);
        return resolver(c);
      };
      const result = await persistDirectSourceRun(run, {
        pool,
        resolveOutlets,
      });
      expect(result).toMatchObject({
        observed: 10,
        newRevisions: 10,
        excluded: 4,
        needsReview: 5,
        autoPublished: 1,
        updated: 0,
      });
      expect(calls).toHaveLength(6);
      for (const c of run.candidates.filter(
        (c) =>
          directCampaignLifecycle(
            c,
            singaporeObservationDate(run.observedAt),
          ) === "expired",
      ))
        expect(calls).not.toContain(c.candidateId);
      expect(await count("direct_source_items")).toBe(10);
      expect(await count("direct_source_artifacts")).toBe(48);
      expect(await count("promotions")).toBe(1);
      expect((await promotion()).data.title).toBe("Hello, Parkway Parade!");
      expect((await (await inbox(request())).json()).candidates).toHaveLength(
        5,
      );
      expect(
        (await persistDirectSourceRun(run, { pool, resolveOutlets })).unchanged,
      ).toBe(10);
      expect(await count("direct_candidates")).toBe(10);
      expect(await count("promotions")).toBe(1);
    } finally {
      Object.assign(source.publicationPolicy, old);
    }
  });
});

describe("autonomous updates and origin-agnostic promotion dedupe", () => {
  it("auto-publishes a ready candidate without admin action with stable ID and provenance", async () => {
    const run = await capturedPepperRun({ complete: true });
    expect((await ingest(run)).autoPublished).toBe(1);
    const row = await promotion();
    expect(row.id).toBe(
      directPromotionId(run.source.id, run.candidates[0].candidateId),
    );
    expect(row).toMatchObject({
      status: "published",
      revision: 1,
      admin_corrected: false,
    });
    expect(
      (await pool.query("SELECT status FROM app.direct_candidates")).rows[0]
        .status,
    ).toBe("auto_published");
    expect(await count("promotion_direct_sources")).toBe(1);
    expect(await count("review_history")).toBe(0);
  });
  it("updates complete source changes on the same ID and increments revision", async () => {
    await ingest(await capturedPepperRun({ complete: true }));
    const before = await promotion();
    const changed = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T14:00:00.000Z",
      edit: (body) =>
        body.replace(
          "Not valid with other promotions",
          "Not valid with other discounts",
        ),
    });
    expect((await ingest(changed)).updated).toBe(1);
    const after = await promotion();
    expect(after.id).toBe(before.id);
    expect(after.revision).toBe(2);
    expect(after.status).toBe("published");
    expect(after.data.terms).not.toEqual(before.data.terms);
    expect(
      (
        await pool.query(
          "SELECT s.source_revision_id=i.current_revision_id AS latest FROM app.promotion_direct_sources s JOIN app.direct_source_items i ON i.id=s.source_item_id",
        )
      ).rows[0].latest,
    ).toBe(true);
  });
  it("incomplete replacement preserves facts, marks review, and links the latest authoritative revision", async () => {
    await ingest(await capturedPepperRun({ complete: true }));
    const before = await promotion();
    const changed = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T14:00:00.000Z",
      edit: (body) =>
        body.replace("Available from 1 September to 31 October 2026.", ""),
    });
    expect((await ingest(changed)).needsReview).toBe(1);
    const after = await promotion();
    expect(after.status).toBe("needs_review");
    expect(after.data.terms).toEqual(before.data.terms);
    expect(after.data.endDate).toBe(before.data.endDate);
    expect(after.data.description).toBe(before.data.description);
    expect(
      (
        await pool.query(
          "SELECT s.source_revision_id=i.current_revision_id AS latest FROM app.promotion_direct_sources s JOIN app.direct_source_items i ON i.id=s.source_item_id",
        )
      ).rows[0].latest,
    ).toBe(true);
  });
  it("administrator-corrected facts and status are never overwritten automatically", async () => {
    await ingest(await capturedPepperRun({ complete: true }));
    const before = await promotion();
    await pool.query("UPDATE app.promotions SET admin_corrected=true");
    const changed = await capturedPepperRun({
      complete: true,
      observedAt: "2026-10-01T14:00:00.000Z",
      edit: (body) =>
        body.replace(
          "Not valid with other promotions",
          "Not valid with other discounts",
        ),
    });
    expect((await ingest(changed)).needsReview).toBe(1);
    const after = await promotion();
    expect(after.data).toEqual(before.data);
    expect(after.revision).toBe(1);
    expect(after.status).toBe("published");
    expect((await candidate()).issues).toContain(
      "authoritative_source_changed_after_admin_correction",
    );
  });
  it.each(["direct", "telegram", "social"])(
    "exact generic fingerprint attaches to existing origin (%s) with no duplicate",
    async (origin) => {
      const historical = origin === "telegram";
      const run = await capturedPepperRun({ complete: true }),
        p = await draft(run);
      p.id = randomUUID();
      if (historical)
        p.sources = [
          { label: "Historical reference", url: "https://t.me/tastesoulsg/1" },
        ];
      if (origin === "social")
        p.sources = [
          {
            kind: "direct",
            sourceKind: "merchant_social",
            platform: "instagram",
            sourceId: "synthetic_social_reference",
            label: "Synthetic social provenance compatibility scenario",
            url: "https://www.instagram.com/research_fixture/p/EXACT/",
          },
        ];
      await saveExisting(p, historical);
      await ingest(run);
      expect(await count("promotions")).toBe(1);
      const row = await promotion();
      expect(row.id).toBe(p.id);
      expect(row.fingerprint).toBe(fingerprint(p));
      expect(row.revision).toBe(1);
      expect(row.data.sources).toContainEqual({
        kind: "direct",
        sourceId: run.source.id,
        label: run.source.label,
        url: run.candidates[0].canonicalUrl,
      });
      if (historical || origin === "social")
        expect(row.data.sources).toContainEqual(p.sources[0]);
      expect(await count("promotion_sources")).toBe(0);
      expect(await count("source_posts")).toBe(0);
    },
  );
  it.each(["web", "social"])(
    "exact merchant/title with different %s terms queues a conflict without another visible promotion",
    async (origin) => {
      const run = await capturedPepperRun({ complete: true }),
        p = await draft(run);
      p.id = randomUUID();
      p.terms = ["Different existing terms"];
      if (origin === "social")
        p.sources = [
          {
            kind: "direct",
            sourceKind: "merchant_social",
            platform: "instagram",
            sourceId: "synthetic_social_reference",
            label: "Synthetic social conflict scenario",
            url: "https://www.instagram.com/research_fixture/p/CONFLICT/",
          },
        ];
      await saveExisting(p);
      expect((await ingest(run)).conflicts).toBe(1);
      expect(await count("promotions")).toBe(1);
      expect((await promotion()).status).toBe("published");
      expect((await candidate()).issues).toContain(
        "existing_offer_terms_conflict",
      );
      expect(await count("promotion_direct_sources")).toBe(0);
    },
  );
  it("different exact title publishes normally", async () => {
    const run = await capturedPepperRun({ complete: true }),
      p = await draft(run);
    p.id = randomUUID();
    p.title = "Independent offer";
    await saveExisting(p);
    expect((await ingest(run)).autoPublished).toBe(1);
    expect(await count("promotions")).toBe(2);
  });
});
describe("direct review and normalized inbox", () => {
  it("returns legacy and direct origin rows with compatible data and official links", async () => {
    await ingest(await capturedPepperRun());
    const post = (
      await pool.query(
        "INSERT INTO app.source_posts(source_id,message_id,permalink,published_at,hash) VALUES('sgfooddeals',1,'https://t.me/sgfooddeals/1',now(),'legacy') RETURNING id",
      )
    ).rows[0];
    const revision = (
      await pool.query(
        "INSERT INTO app.post_revisions(post_id,hash,evidence) VALUES($1,'legacy','{}') RETURNING id",
        [post.id],
      )
    ).rows[0];
    await pool.query(
      "INSERT INTO app.candidates(revision_id,candidate_key,data,issues) VALUES($1,'legacy','{}','[\"legacy_issue\"]')",
      [revision.id],
    );
    const response = await inbox(request());
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.candidates).toHaveLength(2);
    const direct = result.candidates.find(
        (c: { originKind: string }) => c.originKind === "direct",
      ),
      legacy = result.candidates.find(
        (c: { originKind: string }) => c.originKind === "telegram",
      );
    expect(direct.sourceId).toBe("pepper_lunch_sg");
    expect(direct.permalink).toBe(
      "https://www.pepperlunch.com.sg/promo/uper-value-deal/",
    );
    expect(legacy).toMatchObject({
      sourceId: "sgfooddeals",
      permalink: "https://t.me/sgfooddeals/1",
      data: {},
      issues: ["legacy_issue"],
      label: "SG Food Deals",
      existing: null,
    });
    const first = await (
      await inbox(
        new Request("http://localhost/api/admin/review?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
    ).json();
    const second = await (
      await inbox(
        new Request(
          `http://localhost/api/admin/review?limit=1&candidateCursor=${first.nextCandidateCursor}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      )
    ).json();
    expect(
      new Set(
        [...first.candidates, ...second.candidates].map(
          (c: { id: string }) => c.id,
        ),
      ).size,
    ).toBe(2);
  });
  it("stale direct candidates cannot be approved", async () => {
    await ingest(await capturedPepperRun());
    const old = await candidate();
    await ingest(
      await capturedPepperRun({
        observedAt: "2026-10-01T14:00:00.000Z",
        edit: (body) =>
          body.replace(
            "Not valid with other promotions",
            "Not valid with other discounts",
          ),
      }),
    );
    const p = await draft(await capturedPepperRun({ complete: true }));
    expect(
      (
        await review(
          request({
            action: "approve",
            promotion: p,
            reason: "Verified source and branches",
          }),
          { params: Promise.resolve({ id: old.id }) },
        )
      ).status,
    ).toBe(409);
  });
  it("exclusion preserves artifacts/revisions and exact replay preserves the reviewer decision", async () => {
    const run = await capturedPepperRun();
    await ingest(run);
    const row = await candidate();
    const context = { params: Promise.resolve({ id: row.id }) };
    expect(
      (
        await review(
          request({
            action: "exclude",
            reason: "Not suitable for publication",
          }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(await count("direct_source_revisions")).toBe(1);
    expect(await count("direct_source_artifacts")).toBe(2);
    await ingest(run, "direct-source-v2-test");
    expect(
      (await pool.query("SELECT status FROM app.direct_candidates")).rows.map(
        (r) => r.status,
      ),
    ).toEqual(["excluded"]);
    expect(
      (
        await review(
          request({ action: "exclude", reason: "Repeat review" }),
          context,
        )
      ).status,
    ).toBe(409);
  });
  it("manual completion can publish and server replaces all client direct provenance", async () => {
    const run = await capturedPepperRun();
    await ingest(run);
    const row = await candidate();
    const p = await draft(await capturedPepperRun({ complete: true }));
    const response = await review(
      request({
        action: "approve",
        promotion: {
          ...p,
          sources: [
            {
              kind: "direct",
              sourceId: "evil",
              label: "Forged",
              url: "http://evil.example/",
            },
          ],
        },
        reason:
          "Manually verified campaign dates and physical JEM participation",
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(response.status).toBe(200);
    const published = (await response.json()).promotion;
    expect(published.sources).toEqual([
      {
        kind: "direct",
        sourceId: "pepper_lunch_sg",
        label: "Pepper Lunch Singapore",
        url: run.candidates[0].canonicalUrl,
      },
    ]);
    expect((await promotion()).admin_corrected).toBe(true);
    expect(
      (await pool.query("SELECT status FROM app.direct_candidates")).rows[0]
        .status,
    ).toBe("resolved");
  });
  it("manual completion uses generic fingerprint dedupe and preserves existing legacy references", async () => {
    const run = await capturedPepperRun();
    const p = await draft(await capturedPepperRun({ complete: true }));
    p.id = randomUUID();
    p.sources = [{ label: "Legacy", url: "https://t.me/sgfooddeals/5" }];
    await saveExisting(p);
    await ingest(run);
    const row = await candidate();
    const response = await review(
      request({
        action: "approve",
        promotion: p,
        reason: "Verified complete source facts",
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(response.status).toBe(200);
    expect(await count("promotions")).toBe(1);
    expect((await promotion()).id).toBe(p.id);
    expect((await promotion()).data.sources).toContainEqual(p.sources[0]);
  });
  it("manual incomplete dates and generic terms conflicts cannot publish", async () => {
    await ingest(await capturedPepperRun());
    const row = await candidate(),
      p = await draft(await capturedPepperRun({ complete: true }));
    const ctx = { params: Promise.resolve({ id: row.id }) };
    expect(
      (
        await review(
          request({
            action: "approve",
            promotion: { ...p, endDate: null },
            reason: "Missing dates",
          }),
          ctx,
        )
      ).status,
    ).toBe(400);
    await saveExisting({
      ...p,
      id: randomUUID(),
      terms: ["Conflicting existing terms"],
    });
    expect(
      (
        await review(
          request({
            action: "approve",
            promotion: p,
            reason: "Generic title conflict",
          }),
          ctx,
        )
      ).status,
    ).toBe(409);
    expect(await count("promotions")).toBe(1);
    expect((await candidate()).id).toBe(row.id);
  });
  it("ordinary promotion corrections also preserve server direct provenance", async () => {
    await ingest(await capturedPepperRun({ complete: true }));
    const row = await promotion();
    const response = await correctOffer(
      request({
        action: "correct",
        expectedRevision: 1,
        promotion: {
          ...row.data,
          sources: [
            {
              kind: "direct",
              sourceId: "forged",
              label: "Forged",
              url: "https://evil.example/",
            },
          ],
        },
        reason: "Verified administrative correction",
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(response.status).toBe(200);
    expect((await promotion()).data.sources).toEqual(row.data.sources);
  });
});
