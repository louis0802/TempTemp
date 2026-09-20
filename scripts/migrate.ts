import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("MIGRATION_DATABASE_URL is required");
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query(
    "SELECT pg_advisory_xact_lock(hashtext('promotion-migrations'))",
  );
  await c.query(
    "CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,applied_at timestamptz DEFAULT now())",
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (
        await c.query("SELECT 1 FROM public.schema_migrations WHERE name=$1", [
          name,
        ])
      ).rowCount
    )
      continue;
    await c.query(await readFile(`supabase/migrations/${name}`, "utf8"));
    await c.query("INSERT INTO public.schema_migrations(name) VALUES($1)", [
      name,
    ]);
    console.log(`Applied ${name}`);
  }
  await c.query("COMMIT");
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
