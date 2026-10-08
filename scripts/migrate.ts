/** Applies SQL migrations in ./drizzle to DATABASE_URL. Idempotent and safe to run from concurrent deployments. */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Arbitrary constant shared by every deployment: serialises concurrent migration runs.
const MIGRATION_LOCK_ID = 7_391_845_562;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const local = /127\.0\.0\.1|localhost/.test(url);
  // One long-lived connection so the session-level advisory lock covers the migration transaction.
  const pool = new Pool({ connectionString: url, max: 1, idleTimeoutMillis: 0, ssl: local || /sslmode=disable/.test(url) ? undefined : true });
  try {
    await pool.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    await pool.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
  } finally {
    await pool.end();
  }
  console.log("✔ migrations applied");
}

main().catch((e) => {
  // Drizzle wraps the driver error; surface the PostgreSQL reason (code, message, detail, hint).
  const cause = (e?.cause ?? {}) as { code?: string; message?: string; detail?: string; hint?: string };
  console.error("✖ migration failed:", e?.message?.split("\n")[0] ?? e);
  if (cause.message) console.error(`  PostgreSQL ${cause.code ?? ""}: ${cause.message}`);
  if (cause.detail) console.error(`  detail: ${cause.detail}`);
  if (cause.hint) console.error(`  hint: ${cause.hint}`);
  process.exit(1);
});
