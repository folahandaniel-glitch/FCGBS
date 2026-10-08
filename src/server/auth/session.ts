import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { rolePermissions, sessions, userRoles, users } from "../db/schema";
import { hmac, randomToken } from "../crypto";
import type { Actor, ReqCtx } from "../audit";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: Actor["userType"];
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  mustChangePassword: boolean;
  totpEnabled: boolean;
  avatarAssetId: string | null;
}

export interface ResolvedSession {
  sessionId: string;
  mfaPending: boolean;
  expiresAt: Date;
  user: SessionUser;
  actor: Actor;
}

export async function loadPermissions(userId: string): Promise<Set<string>> {
  const rows = await getDb()
    .select({ key: rolePermissions.permissionKey })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return new Set(rows.map((r) => r.key));
}

export async function createSession(
  userId: string,
  opts: { hours: number; mfaPending: boolean; maxSessions?: number },
  ctx: ReqCtx,
): Promise<{ token: string; sessionId: string; expiresAt: Date; evicted: number }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + opts.hours * 3_600_000);
  const db = getDb();
  let evicted = 0;
  const [row] = await db
    .insert(sessions)
    .values({ tokenHash: hmac(token), userId, mfaPending: opts.mfaPending, ip: ctx.ip ?? null, userAgent: ctx.userAgent?.slice(0, 300) ?? null, expiresAt })
    .returning({ id: sessions.id });

  // Multiple-device policy: keep only the newest N sessions.
  if (opts.maxSessions) {
    const live = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .orderBy(asc(sessions.createdAt));
    for (const s of live.slice(0, Math.max(0, live.length - opts.maxSessions))) {
      await db.update(sessions).set({ revokedAt: new Date(), revokedReason: "SESSION_LIMIT" }).where(eq(sessions.id, s.id));
      evicted++;
    }
  }
  return { token, sessionId: row.id, expiresAt, evicted };
}

export async function resolveSessionToken(token: string | undefined | null): Promise<ResolvedSession | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const db = getDb();
  const [row] = await db
    .select({
      sessionId: sessions.id,
      mfaPending: sessions.mfaPending,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userType: users.userType,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        totpEnabled: users.totpEnabled,
        avatarAssetId: users.avatarAssetId,
        deletedAt: users.deletedAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hmac(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.user.deletedAt || row.user.status !== "ACTIVE") return null;

  // Touch at most once a minute to keep writes cheap.
  if (Date.now() - row.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.sessionId));
  }
  const perms = row.user.userType === "STAFF" ? await loadPermissions(row.user.id) : new Set<string>();
  const { deletedAt: _d, ...user } = row.user;
  void _d;
  return {
    sessionId: row.sessionId,
    mfaPending: row.mfaPending,
    expiresAt: row.expiresAt,
    user,
    actor: { id: user.id, userType: user.userType, permissions: perms, name: `${user.firstName} ${user.lastName}`, email: user.email },
  };
}

export async function revokeSession(sessionId: string, reason: string) {
  await getDb().update(sessions).set({ revokedAt: new Date(), revokedReason: reason }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeAllSessions(userId: string, reason: string, exceptSessionId?: string) {
  const cond = exceptSessionId
    ? and(eq(sessions.userId, userId), isNull(sessions.revokedAt), sql`${sessions.id} <> ${exceptSessionId}`)
    : and(eq(sessions.userId, userId), isNull(sessions.revokedAt));
  const res = await getDb().update(sessions).set({ revokedAt: new Date(), revokedReason: reason }).where(cond).returning({ id: sessions.id });
  return res.length;
}

export async function completeMfa(sessionId: string) {
  await getDb().update(sessions).set({ mfaPending: false }).where(eq(sessions.id, sessionId));
}
