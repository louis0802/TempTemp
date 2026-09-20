import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { Pool } from "pg";
import { POST as reviewOffer } from "@/app/api/admin/promotions/[id]/review/route";
import { POST as reviewCandidate } from "@/app/api/admin/candidates/[id]/review/route";
import { GET as adminReview } from "@/app/api/admin/review/route";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { demoPromotions } from "@/domain/demo";
import { runExports, processPending } from "@/ingestion/service";
import { SourceExport } from "@/ingestion/sources/approved-json";
import { db, closeDatabases } from "@/server/db";
import { getPromotions } from "@/server/promotions";
import { singaporeBounds } from "@/domain/promotion";
const admin = new Pool({
  connectionString:
    "postgres://postgres:local-postgres-only@localhost:55432/promotions",
});
let testDb: Pool;
let accessToken: string;
let userId: string;
const database = `promotion_test_${Date.now()}`;
const p = () => ({
  ...demoPromotions()[0],
  id: randomUUID(),
  outlets: [{ ...demoPromotions()[0].outlets[0], id: randomUUID() }],
});
function source(
  posts: SourceExport["posts"],
  id: "sgfooddeals" | "tastesoulsg" = "sgfooddeals",
): SourceExport {
  return {
    source: id,
    complete: true,
    coverageStart: DateTime.utc().minus({ days: 31 }).toISO()!,
    completeThrough: DateTime.utc().minus({ seconds: 1 }).toISO()!,
    posts,
  };
}
const post = (promotion = p(), messageId = 1) => ({
  messageId,
  publishedAt: DateTime.utc().minus({ days: 1 }).toISO()!,
  text: "Synthetic approved import",
  candidates: [{ key: "offer", promotion }],
});
beforeAll(async () => {
  process.loadEnvFile(".env.local");
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
  accessToken = session.access_token;
  userId = session.user.id;
  await admin.query(`CREATE DATABASE ${database}`);
  testDb = new Pool({
    connectionString: `postgres://postgres:local-postgres-only@localhost:55432/${database}`,
  });
  await testDb.query(
    await readFile("supabase/migrations/001_initial.sql", "utf8"),
  );
  process.env.INGEST_DATABASE_URL = `postgres://local_ingest:local-ingest-only@localhost:55432/${database}`;
  process.env.DATABASE_URL = `postgres://local_web:local-web-only@localhost:55432/${database}`;
  process.env.ADMIN_DATABASE_URL = `postgres://local_admin:local-admin-only@localhost:55432/${database}`;
  process.env.DEMO_MODE = "false";
  await testDb.query("INSERT INTO app.administrators(user_id) VALUES($1)", [
    userId,
  ]);
});
afterAll(async () => {
  await closeDatabases();
  await testDb?.end();
  await admin.query(`DROP DATABASE IF EXISTS ${database}`);
  await admin.end();
});
beforeEach(async () => {
  await testDb.query(
    "TRUNCATE app.review_history,app.promotion_sources,app.promotion_outlets,app.promotions,app.outlets,app.candidates,app.processing_attempts,app.post_revisions,app.source_posts,app.sync_runs CASCADE",
  );
  await testDb.query(
    "UPDATE app.sources SET checkpoint=0,last_success=NULL,last_attempt=NULL,status='Never checked'",
  );
});
describe("Real PostgreSQL/PostGIS ingestion and publication", () => {
  it("publishes once on replay, retains provenance and serves geographic reads", async () => {
    const exported = source([post()]);
    expect((await runExports([exported]))[0].ok).toBe(true);
    expect((await runExports([exported]))[0].ok).toBe(true);
    expect(
      (await testDb.query("SELECT * FROM app.source_posts")).rowCount,
    ).toBe(1);
    expect((await testDb.query("SELECT * FROM app.promotions")).rowCount).toBe(
      1,
    );
    expect(
      (await testDb.query("SELECT * FROM app.promotion_sources")).rowCount,
    ).toBe(1);
    const results = await getPromotions(singaporeBounds, "All", null);
    expect(results.items).toHaveLength(1);
    expect(results.items[0].sources[0].url).toBe("https://t.me/sgfooddeals/1");
  });
  it("rolls back partial collection without advancing checkpoint; other source progresses", async () => {
    const broken = source([
      post(),
      {
        ...post(p(), 2),
        publishedAt: DateTime.utc().plus({ days: 1 }).toISO()!,
      },
    ]);
    const results = await runExports([broken, source([post()], "tastesoulsg")]);
    expect(results.map((r) => r.ok)).toEqual([false, true]);
    const sources = (
      await testDb.query("SELECT * FROM app.sources ORDER BY id")
    ).rows;
    expect(sources[0].last_success).toBe(null);
    expect(sources[1].last_success).not.toBe(null);
    expect(
      (
        await testDb.query(
          "SELECT * FROM app.source_posts WHERE source_id='sgfooddeals'",
        )
      ).rowCount,
    ).toBe(0);
  });
  it("suspends edited published facts and preserves prior record", async () => {
    const first = post();
    await runExports([source([first])]);
    const changed = {
      ...first,
      text: "Corrected conditions",
      candidates: [
        {
          key: "offer",
          promotion: {
            ...first.candidates[0].promotion,
            terms: ["Changed terms"],
          },
        },
      ],
    };
    await runExports([source([changed])]);
    const row = (await testDb.query("SELECT * FROM app.promotions")).rows[0];
    expect(row.status).toBe("needs_review");
    expect(row.data.terms).not.toEqual(["Changed terms"]);
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(0);
    expect(
      (await testDb.query("SELECT * FROM app.post_revisions")).rowCount,
    ).toBe(2);
  });
  it("merges equivalent offers across channels with both references", async () => {
    const first = post();
    const second = {
      ...first,
      candidates: [
        {
          key: "offer",
          promotion: { ...first.candidates[0].promotion, id: randomUUID() },
        },
      ],
    };
    await runExports([source([first]), source([second], "tastesoulsg")]);
    const rows = (await testDb.query("SELECT * FROM app.promotions")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].data.sources).toHaveLength(2);
  });
  it("routes missing expiry, unstructured roundups and conflicts to review", async () => {
    const first = post();
    const conflict = {
      ...first,
      candidates: [
        {
          key: "offer",
          promotion: {
            ...first.candidates[0].promotion,
            id: randomUUID(),
            endDate: DateTime.utc().plus({ days: 30 }).toISODate(),
          },
        },
      ],
    };
    await runExports([
      source([
        first,
        post({ ...p(), endDate: null }, 2),
        {
          messageId: 3,
          publishedAt: first.publishedAt,
          text: "Image-dependent roundup",
          candidates: [],
        },
      ]),
      source([conflict], "tastesoulsg"),
    ]);
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(0);
    expect(
      (
        await testDb.query(
          "SELECT * FROM app.candidates WHERE status='needs_review'",
        )
      ).rowCount,
    ).toBe(3);
  });
  it("retains durable work and retries after a failed publication transaction", async () => {
    await testDb.query(
      "CREATE FUNCTION app.fail_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected'; END $$; CREATE TRIGGER fail_publication BEFORE INSERT ON app.promotion_outlets FOR EACH ROW EXECUTE FUNCTION app.fail_publication()",
    );
    try {
      await runExports([source([post()])]);
      expect(
        (await testDb.query("SELECT * FROM app.promotions")).rowCount,
      ).toBe(0);
      expect(
        (
          await testDb.query(
            "SELECT last_success FROM app.sources WHERE id=$1",
            ["sgfooddeals"],
          )
        ).rows[0].last_success,
      ).not.toBe(null);
      expect(
        (
          await testDb.query(
            "SELECT * FROM app.processing_attempts WHERE outcome='retryable_error'",
          )
        ).rowCount,
      ).toBe(1);
    } finally {
      await testDb.query(
        "DROP TRIGGER fail_publication ON app.promotion_outlets; DROP FUNCTION app.fail_publication()",
      );
    }
    await processPending();
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(1);
  });
  it("prevents the public role from reading raw posts or writing offers", async () => {
    await expect(db().query("SELECT * FROM app.source_posts")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db().query("UPDATE app.promotions SET status='published'"),
    ).rejects.toThrow("permission denied");
  });
  it("filters expiry at read time while collection is offline", async () => {
    const first = post();
    await runExports([source([first])]);
    expect(
      (
        await getPromotions(
          singaporeBounds,
          "All",
          null,
          DateTime.utc().plus({ days: 10 }),
        )
      ).items,
    ).toHaveLength(0);
  });
});

describe("Authenticated review transactions", () => {
  const request = (body: unknown) =>
    new Request("http://127.0.0.1:3100/api/admin/review", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  it("rejects a valid non-admin identity and stale corrections", async () => {
    await testDb.query("DELETE FROM app.administrators WHERE user_id=$1", [
      userId,
    ]);
    try {
      expect(
        (
          await adminReview(
            new Request("http://localhost", {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          )
        ).status,
      ).toBe(403);
    } finally {
      await testDb.query("INSERT INTO app.administrators(user_id) VALUES($1)", [
        userId,
      ]);
    }
    const item = post();
    await runExports([source([item])]);
    const id = item.candidates[0].promotion.id;
    const context = { params: Promise.resolve({ id }) };
    const result = await reviewOffer(
      request({
        action: "withdraw",
        expectedRevision: 1,
        reason: "Verified ended early",
      }),
      context,
    );
    expect(result.status).toBe(200);
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(0);
    expect(
      (
        await reviewOffer(
          request({
            action: "approve",
            expectedRevision: 1,
            reason: "Stale approval",
          }),
          context,
        )
      ).status,
    ).toBe(409);
    expect(
      (await testDb.query("SELECT * FROM app.review_history")).rowCount,
    ).toBe(1);
  });
  it("allows complete verified correction of an unstructured candidate, once", async () => {
    await runExports([
      source([
        {
          messageId: 1,
          publishedAt: DateTime.utc().minus({ days: 1 }).toISO()!,
          text: "Unstructured example",
          candidates: [],
        },
      ]),
    ]);
    const candidate = (await testDb.query("SELECT id FROM app.candidates"))
      .rows[0];
    const context = { params: Promise.resolve({ id: candidate.id }) };
    const body = {
      promotion: p(),
      reason: "Verified every term and participating branch",
    };
    expect((await reviewCandidate(request(body), context)).status).toBe(200);
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(1);
    expect((await reviewCandidate(request(body), context)).status).toBe(409);
  });
});

describe("Curator pagination and dismissal", () => {
  it("pages offers and candidates independently without losing records", async () => {
    const entries = Array.from({ length: 4 }, (_, i) => post(p(), i + 1));
    // Keep titles unique to avoid cross-offer conflict reconciliation in this fixture.
    entries.forEach((e, i) => {
      e.candidates[0].promotion.title = `Independent offer ${i}`;
      e.candidates[0].promotion.endDate = null;
    });
    await runExports([source(entries)]);
    const query = async (q: string) =>
      (
        await adminReview(
          new Request(`http://localhost/api/admin/review?limit=2${q}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        )
      ).json();
    const first = await query("");
    expect(first.offers).toHaveLength(2);
    expect(first.candidates).toHaveLength(2);
    expect(first.nextOfferCursor).toBeTruthy();
    expect(first.nextCandidateCursor).toBeTruthy();
    const next = await query(
      `&offerCursor=${first.nextOfferCursor}&candidateCursor=${first.nextCandidateCursor}`,
    );
    expect(next.offers).toHaveLength(2);
    expect(next.candidates).toHaveLength(2);
    expect(next.nextOfferCursor).toBe(null);
    expect(
      new Set(
        [...first.offers, ...next.offers].map((p: { id: string }) => p.id),
      ).size,
    ).toBe(4);
  });
  it("dismisses a non-offer with an audit record and rejects duplicate dismissal", async () => {
    await runExports([
      source([
        {
          messageId: 1,
          publishedAt: DateTime.utc().minus({ days: 1 }).toISO()!,
          text: "A restaurant profile with no offer",
          candidates: [],
        },
      ]),
    ]);
    const id = (await testDb.query("SELECT id FROM app.candidates")).rows[0].id;
    const request = () =>
      new Request("http://localhost", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "exclude",
          reason: "Restaurant profile without promotional benefit",
        }),
      });
    const context = { params: Promise.resolve({ id }) };
    expect((await reviewCandidate(request(), context)).status).toBe(200);
    expect((await reviewCandidate(request(), context)).status).toBe(409);
    expect(
      (
        await testDb.query(
          "SELECT * FROM app.review_history WHERE action='exclude_candidate'",
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (await getPromotions(singaporeBounds, "All", null)).items,
    ).toHaveLength(0);
  });
});

import { POST as importApproved } from "@/app/api/admin/import/route";
it("imports an authenticated approved export and reports an independent source failure", async () => {
  const good = source([post()]);
  const bad = {
    ...source([post()], "tastesoulsg"),
    coverageStart: DateTime.utc().toISO()!,
  };
  const response = await importApproved(
    new Request("http://localhost/api/admin/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([good, bad]),
    }),
  );
  expect(response.status).toBe(207);
  const result = await response.json();
  expect(result.results.map((r: { ok: boolean }) => r.ok)).toEqual([
    true,
    false,
  ]);
  expect(
    (await getPromotions(singaporeBounds, "All", null)).items,
  ).toHaveLength(1);
});

// Automated raw results use the same transactional publication and review workflow.
describe("Deterministic raw pipeline persistence", () => {
  it("persists real inbox resolution audits without treating exports as import windows", async () => {
    const inbox = JSON.parse(
      await readFile(
        "exports/review-inbox-2026-09-16/review-inbox.json",
        "utf8",
      ),
    );
    const item = inbox.items.find(
      (i: { source: { url: string } }) =>
        i.source.url === "https://t.me/tastesoulsg/4457",
    );
    // This is an isolated synthetic collection batch, never an operational replay of the inbox.
    const { collect } = await import("@/ingestion/service");
    const { PromotionPipeline } =
      await import("@/ingestion/resolution/pipeline");
    const { PromotionParticipationResolver } =
      await import("@/ingestion/resolution/outlets");
    await collect(
      source(
        [
          {
            messageId: 4457,
            publishedAt: item.source.publishedAt,
            text: item.source.originalText,
            candidates: [],
          },
        ],
        "tastesoulsg",
      ),
    );
    await processPending(
      new PromotionPipeline(
        new PromotionParticipationResolver([], {
          resolve: async () => {
            throw new Error("No live geocoding in database tests");
          },
        }),
      ),
    );
    const candidate = (await testDb.query("SELECT * FROM app.candidates"))
      .rows[0];
    expect(candidate.status).toBe("needs_review");
    expect(candidate.data.resolutionAudit.outletResolution.scope).toBe(
      "all_outlets",
    );
    expect(candidate.issues).not.toContain(
      "linked_or_media_terms_require_verification",
    );
    expect(candidate.data.resolutionAudit.issues).toContainEqual({
      code: "media_export_marker_present",
      severity: "informational",
    });
    expect(candidate.data.resolutionAudit.outletResolution.issues).toContain(
      "authoritative_merchant_directory_unavailable",
    );
    expect((await testDb.query("SELECT * FROM app.promotions")).rowCount).toBe(
      0,
    );
  });
  it("publishes fully resolved raw fixtures once and preserves reviewer decisions on parser replay", async () => {
    const { collect } = await import("@/ingestion/service");
    const { PromotionPipeline } =
      await import("@/ingestion/resolution/pipeline");
    const { PromotionParticipationResolver } =
      await import("@/ingestion/resolution/outlets");
    const { GenkiOutletProvider } =
      await import("@/ingestion/resolution/directory");
    const { ResolutionCache } = await import("@/ingestion/resolution/cache");
    const html = await readFile(
      "tests/fixtures/resolution/genki-locator.html",
      "utf8",
    );
    const provider = new GenkiOutletProvider(
      new ResolutionCache(),
      async () => new Response(html),
    );
    const pipeline = new PromotionPipeline(
      new PromotionParticipationResolver([provider], {
        resolve: async (_merchant, branch) => ({
          address: branch.address,
          lat: 1.3,
          lng: 103.85,
          coordinatePrecision: "building",
          coordinateEvidence: [
            {
              url: "https://www.onemap.gov.sg/",
              checkedAt: DateTime.utc().toISO()!,
              summary:
                "Synthetic integration coordinate; not verified live data",
            },
          ],
        }),
      }),
    );
    const start = DateTime.now()
      .setZone("Asia/Singapore")
      .minus({ days: 1 })
      .toISODate();
    const end = DateTime.now()
      .setZone("Asia/Singapore")
      .plus({ days: 5 })
      .toISODate();
    const raw = {
      messageId: 9876,
      publishedAt: DateTime.utc().minus({ days: 1 }).toISO()!,
      text: `Genki Sushi: 50% off sushi\n📅 ${start} to ${end}\n📍 All outlets\nMembers only.`,
      candidates: [],
    };
    await collect(source([raw]));
    await processPending(pipeline);
    const offers = (await testDb.query("SELECT * FROM app.promotions")).rows;
    expect(offers).toHaveLength(1);
    expect(offers[0].status).toBe("published");
    expect(
      (await testDb.query("SELECT outcome FROM app.processing_attempts"))
        .rows[0].outcome,
    ).toBe("published");
    expect(offers[0].data.outlets).toHaveLength(22);
    expect(
      (await testDb.query("SELECT data FROM app.candidates")).rows[0].data
        .resolutionAudit.classification,
    ).toBe("approve");
    await processPending(pipeline);
    expect((await testDb.query("SELECT * FROM app.promotions")).rowCount).toBe(
      1,
    );
    await testDb.query("UPDATE app.candidates SET status='resolved'");
    await testDb.query("DELETE FROM app.processing_attempts");
    await processPending(pipeline);
    expect((await testDb.query("SELECT * FROM app.promotions")).rowCount).toBe(
      1,
    );
    expect(
      (await testDb.query("SELECT status FROM app.candidates")).rows[0].status,
    ).toBe("resolved");
  });
});

describe("Autonomous terminal processing outcomes", () => {
  it.each([
    ["excluded", "Restaurant: ordinary menu prices\n#article", ["excluded"]],
    ["excluded", "Tea shop: new tea pack $52\n📍 Online", ["excluded"]],
    [
      "completed",
      "1. Genki Sushi: 50% off sushi\n2. Restaurant: ordinary menu prices\nApplies to all offers:\n📅 RANGE\n📍 All outlets",
      ["excluded", "published"],
    ],
    [
      "needs_review",
      "1. Genki Sushi: 50% off sushi\n📅 RANGE\n📍 All outlets\n2. Genki Sushi: 10% off sushi\n📅 ongoing\n📍 All outlets",
      ["needs_review", "published"],
    ],
  ])(
    "persists %s for automated raw dispositions",
    async (outcome, text, statuses) => {
      const { collect } = await import("@/ingestion/service");
      const { controlledPipeline } =
        await import("../helpers/resolution-fixtures");
      const start = DateTime.now()
        .setZone("Asia/Singapore")
        .minus({ days: 1 })
        .toISODate();
      const end = DateTime.now()
        .setZone("Asia/Singapore")
        .plus({ days: 5 })
        .toISODate();
      await collect(
        source([
          {
            messageId: 8765,
            publishedAt: DateTime.utc().minus({ days: 1 }).toISO()!,
            text: text.replaceAll("RANGE", `${start} to ${end}`),
            candidates: [],
          },
        ]),
      );
      await processPending(controlledPipeline());
      expect(
        (
          await testDb.query("SELECT outcome FROM app.processing_attempts")
        ).rows.map((r) => r.outcome),
      ).toEqual([outcome]);
      expect(
        (
          await testDb.query(
            "SELECT status FROM app.candidates ORDER BY status",
          )
        ).rows.map((r) => r.status),
      ).toEqual(statuses);
      expect(
        (
          await testDb.query(
            "SELECT id FROM app.promotions WHERE status='published'",
          )
        ).rowCount,
      ).toBe(statuses.includes("published") ? 1 : 0);
      expect(await processPending(controlledPipeline())).toBe(0);
    },
  );
});
