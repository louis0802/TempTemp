import { execFileSync } from "node:child_process";
import { Pool } from "pg";
import { writeFile } from "node:fs/promises";
const owner = new Pool({
  connectionString:
    "postgres://postgres:local-postgres-only@localhost:55432/promotions",
});
const database = `promotion_restore_${Date.now()}`;
const started = Date.now();
let restored: Pool | undefined;
try {
  const counts =
    "SELECT (SELECT count(*) FROM app.source_posts) AS posts,(SELECT count(*) FROM app.post_revisions) AS revisions,(SELECT count(*) FROM app.candidates) AS candidates,(SELECT count(*) FROM app.promotions) AS promotions,(SELECT count(*) FROM app.review_history) AS audit";
  const before = (await owner.query(counts)).rows[0];
  const backup = execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "docker/compose.yml",
      "exec",
      "-T",
      "db",
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "promotions",
      "-n",
      "app",
      "-Fc",
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  await owner.query(`CREATE DATABASE ${database}`);
  restored = new Pool({
    connectionString: `postgres://postgres:local-postgres-only@localhost:55432/${database}`,
  });
  await restored.query("CREATE EXTENSION postgis; CREATE EXTENSION pgcrypto");
  execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "docker/compose.yml",
      "exec",
      "-T",
      "db",
      "pg_restore",
      "--exit-on-error",
      "-U",
      "postgres",
      "-d",
      database,
    ],
    { input: backup, maxBuffer: 64 * 1024 * 1024 },
  );
  const after = (await restored.query(counts)).rows[0];
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Restored counts do not match");
  const sourceHashes = (
    await owner.query("SELECT id,hash FROM app.source_posts ORDER BY id")
  ).rows;
  const restoredHashes = (
    await restored.query("SELECT id,hash FROM app.source_posts ORDER BY id")
  ).rows;
  if (JSON.stringify(sourceHashes) !== JSON.stringify(restoredHashes))
    throw new Error("Restored source identities/hashes do not match");
  const result = {
    date: new Date().toISOString(),
    scope: "Local app schema only; no auth schema or hosted backup policy",
    counts: after,
    archiveBytes: backup.length,
    elapsedMs: Date.now() - started,
    result: "passed",
  };
  console.log(JSON.stringify(result));
  await writeFile(
    "docs/changes/singapore-promotion-map/restore-check.json",
    JSON.stringify(result, null, 2) + "\n",
  );
} finally {
  await restored?.end();
  await owner.query(`DROP DATABASE IF EXISTS ${database}`);
  await owner.end();
}
