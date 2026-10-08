import { NextResponse, type NextRequest } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit } from "@/server/audit";
import { closeAttempt } from "@/server/services/assessments";
import { syncExpired } from "@/server/services/access";

/**
 * Daily maintenance (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`):
 * auto-submits examinations whose server deadline has passed, and purges expired sessions, reset tokens and rate-limit rows.
 * Correctness never depends on this job — expiry is also enforced lazily on every relevant request.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 16 || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new NextResponse("Unauthorized", { status: 401 });
  const db = getDb();
  const lapsed = await db.select({ id: s.examAttempts.id }).from(s.examAttempts).where(and(eq(s.examAttempts.status, "IN_PROGRESS"), lt(s.examAttempts.deadlineAt, new Date())));
  for (const a of lapsed) await closeAttempt(a.id, "AUTO", {});
  await db.delete(s.sessions).where(lt(s.sessions.expiresAt, new Date(Date.now() - 7 * 86_400_000)));
  await db.delete(s.passwordResetTokens).where(lt(s.passwordResetTokens.expiresAt, new Date(Date.now() - 86_400_000)));
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  const expiredAccess = await syncExpired();
  await audit({ action: "system.maintenance", summary: `auto-submitted ${lapsed.length} attempt(s); ${expiredAccess} access period(s) expired` });
  return NextResponse.json({ ok: true, autoSubmitted: lapsed.length });
}
