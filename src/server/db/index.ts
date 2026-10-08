import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
/** Transaction handle — same query surface as DB. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

const globalForDb = globalThis as unknown as { __fcgbsDb?: DB; __fcgbsPool?: Pool };

/**
 * Returns the process-wide database handle. Uses a pooled node-postgres client
 * (works with Neon / Vercel Postgres / any managed PostgreSQL). Tests inject a
 * PGlite-backed instance through `setDb`.
 */
export function getDb(): DB {
  if (globalForDb.__fcgbsDb) return globalForDb.__fcgbsDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured. See .env.example and README (Local development).");
  }
  const isLocal = /127\.0\.0\.1|localhost/.test(url);
  const pool = new Pool({
    connectionString: url,
    max: isLocal ? 1 : Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: isLocal || /sslmode=disable/.test(url) ? undefined : true,
  });
  // The database closes connections that sit idle (and a paused serverless function cannot notice).
  // Without a listener, that close is an unhandled error; with one, the pool just drops the client.
  pool.on("error", (e) => console.warn("[db] idle connection dropped:", e.message));
  if (!isLocal || process.env.DATABASE_RETRY_READS === "1") retryReadsOnDroppedConnection(pool);
  globalForDb.__fcgbsPool = pool;
  globalForDb.__fcgbsDb = drizzle(pool, { schema });
  return globalForDb.__fcgbsDb;
}

const DROPPED = /Connection terminated|ECONNRESET|EPIPE|ETIMEDOUT|socket hang up|Client has encountered a connection error|terminating connection|timeout exceeded when trying to connect/i;
const isDropped = (e: unknown) => {
  const x = e as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  const code = x?.code ?? x?.cause?.code ?? "";
  return DROPPED.test(`${x?.message ?? ""} ${x?.cause?.message ?? ""} ${code}`) || /^(08|57P0)/.test(code);
};

/**
 * A page read that lands on a connection the database has already closed fails once and would show
 * the error page. Reads are safe to repeat, so they are tried again on a fresh connection. Writes are
 * never repeated here: a write may have been applied before the connection was lost.
 */
function retryReadsOnDroppedConnection(pool: Pool) {
  const run = pool.query.bind(pool) as (...a: unknown[]) => Promise<unknown>;
  (pool as unknown as { query: (...a: unknown[]) => Promise<unknown> }).query = async (...args: unknown[]) => {
    const first = args[0] as string | { text?: string };
    const text = (typeof first === "string" ? first : (first?.text ?? "")).trimStart().slice(0, 12).toLowerCase();
    const readOnly = typeof args[args.length - 1] !== "function" && (text.startsWith("select") || text.startsWith("with"));
    if (!readOnly) return run(...args);
    for (let attempt = 0; ; attempt++) {
      try {
        return await run(...args);
      } catch (e) {
        if (attempt >= 2 || !isDropped(e)) throw e;
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
  };
}

export function setDb(db: DB | undefined) {
  globalForDb.__fcgbsDb = db;
}

export { schema };
