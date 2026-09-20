import { Pool } from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { demoPromotions } from "@/domain/demo";
import { getPromotions } from "@/server/promotions";
import { singaporeBounds } from "@/domain/promotion";
import { closeDatabases } from "@/server/db";
// Intentionally fixed to the local Docker endpoint. Never accepts a hosted database URL.
const owner = new Pool({
  connectionString:
    "postgres://postgres:local-postgres-only@localhost:55432/promotions",
});
const name = `promotion_load_${Date.now()}`;
let data: Pool | undefined;
try {
  await owner.query(`CREATE DATABASE ${name}`);
  data = new Pool({
    connectionString: `postgres://postgres:local-postgres-only@localhost:55432/${name}`,
  });
  await data.query(
    await readFile("supabase/migrations/001_initial.sql", "utf8"),
  );
  const sample = demoPromotions()[0];
  await data.query(
    `INSERT INTO app.outlets(id,data,location) SELECT ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,jsonb_set($1::jsonb,'{id}',to_jsonb('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))),ST_SetSRID(ST_MakePoint($2,$3),4326)::geography FROM generate_series(1,20000) n`,
    [
      JSON.stringify(sample.outlets[0]),
      sample.outlets[0].lng,
      sample.outlets[0].lat,
    ],
  );
  await data.query(
    `INSERT INTO app.promotions(id,merchant,fingerprint,status,data) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$2,'load-'||n,'published',jsonb_set(jsonb_set($1::jsonb,'{id}',to_jsonb('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))),'{outlets}',jsonb_build_array(a.data,b.data)) FROM generate_series(1,10000) n JOIN app.outlets a ON a.id=('10000000-0000-4000-8000-'||lpad((n*2-1)::text,12,'0'))::uuid JOIN app.outlets b ON b.id=('10000000-0000-4000-8000-'||lpad((n*2)::text,12,'0'))::uuid`,
    [JSON.stringify(sample), sample.merchant],
  );
  await data.query(
    `INSERT INTO app.promotion_outlets SELECT ('00000000-0000-4000-8000-'||lpad(((n+1)/2)::text,12,'0'))::uuid,('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,20000) n`,
  );
  await data.query(
    "ANALYZE app.promotions; ANALYZE app.outlets; ANALYZE app.promotion_outlets",
  );
  process.env.DATABASE_URL = `postgres://local_web:local-web-only@localhost:55432/${name}`;
  process.env.DEMO_MODE = "false";
  await getPromotions(singaporeBounds, "All", null);
  const durations: number[] = [];
  for (let round = 0; round < 10; round++) {
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 10 }, async () => {
        const before = performance.now();
        const result = await getPromotions(singaporeBounds, "All", null);
        if (result.items.length !== 200 || !result.nextCursor)
          throw new Error("Unexpected load-test response");
        durations.push(performance.now() - before);
      }),
    );
    await delay(Math.max(0, 1000 - (performance.now() - start)));
  }
  durations.sort((a, b) => a - b);
  const result = {
    date: new Date().toISOString(),
    profile:
      "Local Node 24, Docker PostgreSQL/PostGIS; service query path, not HTTP/network; 10 concurrent reads each second for 10 seconds",
    offers: 10000,
    outlets: 20000,
    requests: 100,
    p50ms: Math.round(durations[49]),
    p95ms: Math.round(durations[94]),
    maxMs: Math.round(durations[99]),
    targetP95ms: 500,
  };
  console.log(JSON.stringify(result));
  await writeFile(
    "docs/changes/singapore-promotion-map/load-check.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  if (result.p95ms >= 500) process.exitCode = 1;
} finally {
  await closeDatabases();
  await data?.end();
  await owner.query(`DROP DATABASE IF EXISTS ${name}`);
  await owner.end();
}
