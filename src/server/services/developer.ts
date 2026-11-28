import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { generateTemporaryPassword, hashPassword } from "../auth/password";
import { revokeAllSessions } from "../auth/session";
import { createStaff } from "./people";
import { ownerEmail } from "./auth";

/**
 * The Developer is the platform owner: a Super Admin carrying `is_developer`. Only the Developer may create, promote, demote,
 * suspend or reset Super Admins. No one else can change the Developer's account. Every action here is audited.
 */

export type Level = "SUPER_ADMIN" | "STAFF";

export async function isDeveloper(userId: string) {
  const [u] = await getDb().select({ dev: s.users.isDeveloper, type: s.users.userType }).from(s.users).where(eq(s.users.id, userId));
  return Boolean(u?.dev && u.type === "SUPER_ADMIN");
}

async function assertDeveloper(actor: Actor) {
  if (!(await isDeveloper(actor.id))) throw new AppError("FORBIDDEN", "Only the Developer can do that.");
}

/** Gives the owner's existing Super Admin account the Developer flag, once. Safe to run on every deploy. */
export async function ensureDeveloper() {
  const db = getDb();
  const [have] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.isDeveloper, true)).limit(1);
  if (have) return false;
  const rows = await db.update(s.users).set({ isDeveloper: true, updatedAt: new Date() })
    .where(and(sql`lower(${s.users.email}) = ${ownerEmail()}`, eq(s.users.userType, "SUPER_ADMIN"), isNull(s.users.deletedAt)))
    .returning({ id: s.users.id });
  if (rows.length) await audit({ actor: { id: rows[0].id, userType: "SUPER_ADMIN" }, action: "security.developer_assigned", entityType: "user", entityId: rows[0].id, summary: ownerEmail() }, {});
  return rows.length > 0;
}

export async function listPlatformAccounts() {
  const db = getDb();
  const rows = await db.select({ id: s.users.id, email: s.users.email, first: s.users.firstName, last: s.users.lastName, type: s.users.userType, dev: s.users.isDeveloper, status: s.users.status, totp: s.users.totpEnabled, lastLogin: s.users.lastLoginAt })
    .from(s.users).where(and(inArray(s.users.userType, ["SUPER_ADMIN", "STAFF"]), isNull(s.users.deletedAt))).orderBy(asc(s.users.userType), asc(s.users.lastName));
  const roles = await db.select({ userId: s.userRoles.userId, name: s.roles.name }).from(s.userRoles).innerJoin(s.roles, eq(s.roles.id, s.userRoles.roleId));
  return rows.map((r) => ({ ...r, roles: roles.filter((x) => x.userId === r.id).map((x) => x.name) }));
}

export async function createPlatformAccount(actor: Actor, input: { level: Level; email: string; firstName: string; lastName: string; roleKeys: string[] }, ctx: ReqCtx) {
  await assertDeveloper(actor);
  if (input.level === "STAFF") return createStaff(actor, { ...input, roleKeys: input.roleKeys }, ctx);
  if (input.level !== "SUPER_ADMIN") throw new AppError("VALIDATION", "Choose Super Admin or Admin.");
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("VALIDATION", "Enter a valid email address.");
  if (!input.firstName.trim() || !input.lastName.trim()) throw new AppError("VALIDATION", "Enter first and last name.");
  const temp = generateTemporaryPassword();
  const db = getDb();
  const [dupe] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${email}`);
  if (dupe) throw new AppError("CONFLICT", "An account with this email already exists. If it is an Admin, use “Make Super Admin”.");
  const [u] = await db.insert(s.users).values({ email, passwordHash: await hashPassword(temp), userType: "SUPER_ADMIN", firstName: input.firstName.trim(), lastName: input.lastName.trim(), mustChangePassword: true, passwordChangedAt: new Date() }).returning({ id: s.users.id });
  await audit({ actor, action: "security.super_admin_created", entityType: "user", entityId: u.id, summary: email }, ctx);
  return { id: u.id, temporaryPassword: temp };
}

/** The target must be an administrator account that is neither the Developer nor the person acting. */
async function target(actor: Actor, userId: string) {
  await assertDeveloper(actor);
  const [u] = await getDb().select({ id: s.users.id, type: s.users.userType, dev: s.users.isDeveloper, email: s.users.email }).from(s.users).where(eq(s.users.id, userId));
  if (!u || (u.type !== "SUPER_ADMIN" && u.type !== "STAFF")) throw new AppError("NOT_FOUND", "Administrator not found.");
  if (u.dev || u.id === actor.id) throw new AppError("RULE_VIOLATION", "The Developer account cannot be changed here.");
  return u;
}

export async function setLevel(actor: Actor, userId: string, level: Level, ctx: ReqCtx) {
  const u = await target(actor, userId);
  if (u.type === level) return;
  await getDb().update(s.users).set({ userType: level, updatedAt: new Date() }).where(eq(s.users.id, userId));
  if (level === "SUPER_ADMIN") await getDb().delete(s.userRoles).where(eq(s.userRoles.userId, userId));
  await revokeAllSessions(userId, "ROLES_CHANGED");
  await audit({ actor, action: level === "SUPER_ADMIN" ? "security.promoted_super_admin" : "security.demoted_to_admin", entityType: "user", entityId: userId, summary: u.email }, ctx);
}

export async function setStatus(actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED", ctx: ReqCtx) {
  const u = await target(actor, userId);
  await getDb().update(s.users).set({ status, failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(s.users.id, userId));
  if (status === "SUSPENDED") await revokeAllSessions(userId, "SUSPENDED");
  await audit({ actor, action: status === "SUSPENDED" ? "user.suspended" : "user.reactivated", entityType: "user", entityId: userId, summary: u.email }, ctx);
}

/** A new temporary password, and optionally clears two-factor (lost phone). The person is signed out everywhere. */
export async function resetCredentials(actor: Actor, userId: string, resetTwoFactor: boolean, ctx: ReqCtx) {
  const u = await target(actor, userId);
  const temp = generateTemporaryPassword();
  await getDb().update(s.users).set({ passwordHash: await hashPassword(temp), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null, passwordChangedAt: new Date(), updatedAt: new Date(), ...(resetTwoFactor ? { totpEnabled: false, totpSecretEnc: null } : {}) }).where(eq(s.users.id, userId));
  if (resetTwoFactor) await getDb().delete(s.recoveryCodes).where(eq(s.recoveryCodes.userId, userId));
  await revokeAllSessions(userId, "PASSWORD_RESET");
  await audit({ actor, action: "security.credentials_reset", entityType: "user", entityId: userId, summary: u.email, metadata: { resetTwoFactor } }, ctx);
  return { temporaryPassword: temp };
}

/** Health of the platform for the Developer. Settings are reported only as present or missing, never their values. */
export async function systemInfo(actor: Actor) {
  await assertDeveloper(actor);
  const db = getDb();
  const n = async (t: typeof s.users | typeof s.courses | typeof s.teachings | typeof s.hardQuestions | typeof s.materials | typeof s.accessCodes) => (await db.select({ c: sql<number>`count(*)::int` }).from(t))[0].c;
  const [users, courses, teachings, questions, files, codes] = await Promise.all([n(s.users), n(s.courses), n(s.teachings), n(s.hardQuestions), n(s.materials), n(s.accessCodes)]);
  const env = ["DATABASE_URL", "APP_URL", "SETUP_TOKEN", "CRON_SECRET", "RESEND_API_KEY"].map((name) => ({ name, set: Boolean(process.env[name]) }));
  return { counts: { Accounts: users, Courses: courses, Teachings: teachings, "Hard Questions": questions, "Files & links": files, "Access codes": codes }, env, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local", environment: process.env.VERCEL_ENV ?? "development" };
}
