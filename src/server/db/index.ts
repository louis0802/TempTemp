import { Pool, PoolClient } from "pg";
const pools = new Map<string, Pool>();
export function db(role: "web" | "admin" | "ingest" = "web") {
  const url =
    process.env[
      role === "admin"
        ? "ADMIN_DATABASE_URL"
        : role === "ingest"
          ? "INGEST_DATABASE_URL"
          : "DATABASE_URL"
    ];
  if (!url) throw new Error("Database configuration unavailable");
  if (!pools.has(role))
    pools.set(
      role,
      new Pool({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 5000,
        statement_timeout: 15000,
      }),
    );
  return pools.get(role)!;
}
export async function transaction<T>(
  role: "admin" | "ingest",
  fn: (c: PoolClient) => Promise<T>,
) {
  const c = await db(role).connect();
  try {
    await c.query("BEGIN");
    const value = await fn(c);
    await c.query("COMMIT");
    return value;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function closeDatabases() {
  await Promise.all([...pools.values()].map((p) => p.end()));
  pools.clear();
}
