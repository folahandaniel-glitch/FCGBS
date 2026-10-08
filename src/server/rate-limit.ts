import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { AppError } from "./errors";
import { securityEvent, type ReqCtx } from "./audit";

export const LIMITS = {
  login: { max: 10, windowSec: 15 * 60 },
  register: { max: 6, windowSec: 60 * 60 },
  passwordReset: { max: 5, windowSec: 60 * 60 },
  mfa: { max: 8, windowSec: 10 * 60 },
  upload: { max: 40, windowSec: 60 * 60 },
  verify: { max: 40, windowSec: 10 * 60 },
  contact: { max: 5, windowSec: 60 * 60 },
  ai: { max: 20, windowSec: 60 * 60 },
  examSave: { max: 900, windowSec: 10 * 60 },
  export: { max: 40, windowSec: 60 * 60 },
  codeActivation: { max: 8, windowSec: 15 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Fixed-window counter stored in Postgres so limits hold across serverless
 * instances. Atomic via INSERT … ON CONFLICT.
 */
export async function rateLimit(name: LimitName, subject: string, ctx: ReqCtx = {}) {
  const { max, windowSec } = LIMITS[name];
  const key = `${name}:${subject}`.slice(0, 200);
  const db = getDb();
  const res = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`);
  const count = Number(res.rows[0]?.count ?? 0);
  if (count > max) {
    if (count === max + 1) {
      await securityEvent({ type: "RATE_LIMITED", severity: "MEDIUM", detail: { limit: name } }, ctx);
    }
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
}

export async function resetRateLimit(name: LimitName, subject: string) {
  await getDb().execute(sql`DELETE FROM rate_limits WHERE key = ${`${name}:${subject}`.slice(0, 200)}`);
}
