import { createHmac } from "node:crypto";
import { writeFile, access } from "node:fs/promises";
import { Pool } from "pg";
const secret = "local-only-secret-at-least-thirty-two-characters-long";
function jwt(role: string) {
  const b = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const raw = `${b({ alg: "HS256", typ: "JWT" })}.${b({ role, iss: "supabase", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 31536000 })}`;
  return `${raw}.${createHmac("sha256", secret).update(raw).digest("base64url")}`;
}
const content = `DEMO_MODE=false\nDATABASE_URL=postgres://local_web:local-web-only@localhost:55432/promotions\nADMIN_DATABASE_URL=postgres://local_admin:local-admin-only@localhost:55432/promotions\nINGEST_DATABASE_URL=postgres://local_ingest:local-ingest-only@localhost:55432/promotions\nMIGRATION_DATABASE_URL=postgres://postgres:local-postgres-only@localhost:55432/promotions\nNEXT_PUBLIC_SUPABASE_URL=http://localhost:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${jwt("anon")}\nBACKFILL_DAYS=30\nUNKNOWN_EXPIRY_REVIEW_DAYS=7\n`;
try {
  await access(".env.local");
  console.log("Preserving existing .env.local");
} catch {
  await writeFile(".env.local", content, { mode: 0o600 });
  console.log("Created local-only .env.local");
}
if (process.argv.includes("--admin")) {
  const pool = new Pool({
    connectionString:
      "postgres://postgres:local-postgres-only@localhost:55432/promotions",
  });
  try {
    for (const [name, password, role] of [
      ["local_web", "local-web-only", "promotion_web"],
      ["local_admin", "local-admin-only", "promotion_admin"],
      ["local_ingest", "local-ingest-only", "promotion_ingest"],
    ]) {
      if (
        !(await pool.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [name]))
          .rowCount
      )
        await pool.query(
          `CREATE ROLE ${name} LOGIN PASSWORD '${password}' IN ROLE ${role}`,
        );
    }
    const email = "admin@local.test",
      password = "LocalReview2026!";
    const headers = {
      Authorization: `Bearer ${jwt("service_role")}`,
      "Content-Type": "application/json",
      apikey: jwt("anon"),
    };
    let response = await fetch("http://localhost:54321/auth/v1/admin/users", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    let user = await response.json();
    if (!response.ok) {
      response = await fetch("http://localhost:54321/auth/v1/admin/users", {
        headers,
      });
      const body = await response.json();
      user = body.users?.find((u: { email: string }) => u.email === email);
    }
    if (!user?.id) throw new Error("Local auth is not ready");
    await pool.query(
      "INSERT INTO app.administrators(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [user.id],
    );
    console.log(
      "Local administrator ready: admin@local.test / LocalReview2026! (local Docker only)",
    );
  } finally {
    await pool.end();
  }
}
