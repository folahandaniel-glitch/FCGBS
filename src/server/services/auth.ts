import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { checkPassword } from "@/core/password-policy";
import { getDb } from "../db";
import { passwordResetTokens, recoveryCodes, userRoles, users } from "../db/schema";
import { audit, securityEvent, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { decrypt, encrypt, hmac, randomToken } from "../crypto";
import { burnVerify, hashPassword, verifyPassword } from "../auth/password";
import { completeMfa, createSession, revokeAllSessions } from "../auth/session";
import { hashRecoveryCode, newRecoveryCodes, newTotpSecret, verifyTotp } from "../auth/totp";
import { rateLimit, resetRateLimit } from "../rate-limit";
import { getSetting } from "../settings";
import { notifyUser, queueEmail } from "./notifications";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(160);
const name = z.string().trim().min(1, "Required").max(60).regex(/^[\p{L}\p{M}' .-]+$/u, "Use letters only.");
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number.");

export async function assertPasswordPolicy(password: string, context: string[] = []) {
  const c = checkPassword(password, undefined, context);
  if (!c.ok) throw new AppError("VALIDATION", c.errors[0] ?? "Choose a stronger password.", { password: c.errors });
}

/* ------------------------------------------------------------------ applicant registration */

export const registerSchema = z
  .object({
    firstName: name,
    lastName: name,
    email,
    phone: phone.optional().or(z.literal("").transform(() => undefined)),
    country: z.string().trim().max(60).optional(),
    password: z.string().max(128),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "You must accept the terms and privacy policy." }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

/** Public registration creates an APPLICANT only. Staff are created by the Super Admin; students are created by registration after admission. */
export async function registerApplicant(raw: unknown, ctx: ReqCtx) {
  await rateLimit("register", ctx.ip ?? "unknown", ctx);
  const input = registerSchema.parse(raw);
  await assertPasswordPolicy(input.password, [input.firstName, input.lastName, input.email.split("@")[0]]);
  const [dup] = await getDb().select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
  // Same message either way would hide duplicates, but a clear message is kinder; rate limiting protects against enumeration.
  if (dup) throw new AppError("CONFLICT", "An account with this email already exists. Try signing in or resetting your password.", { email: ["Already registered."] });
  const [u] = await getDb()
    .insert(users)
    .values({ email: input.email, passwordHash: await hashPassword(input.password), userType: "APPLICANT", firstName: input.firstName, lastName: input.lastName, phone: input.phone, country: input.country, passwordChangedAt: new Date() })
    .returning({ id: users.id });
  await audit({ actor: { id: u.id, userType: "APPLICANT" }, action: "auth.applicant_registered", entityType: "user", entityId: u.id }, ctx);
  return u.id;
}

/* ------------------------------------------------------------------------------------ login */

export const loginSchema = z.object({ identifier: z.string().trim().min(1, "Enter your email.").max(160), password: z.string().min(1, "Enter your password.").max(128) });
export type LoginPortal = "public" | "backend";

/** Password login with lockout and uniform errors (no account enumeration). Staff sign in at /backend; others at /login. */
export async function login(raw: unknown, portal: LoginPortal, ctx: ReqCtx) {
  const { identifier, password } = loginSchema.parse(raw);
  const idKey = identifier.toLowerCase();
  await rateLimit("login", `${ctx.ip ?? "unknown"}:${idKey}`, ctx);
  const db = getDb();
  const auth = await getSetting("authentication");
  const [u] = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, userType: users.userType, status: users.status, failedLoginCount: users.failedLoginCount, lockedUntil: users.lockedUntil, totpEnabled: users.totpEnabled, mustChangePassword: users.mustChangePassword, deletedAt: users.deletedAt })
    .from(users)
    .where(sql`lower(${users.email}) = ${idKey}`)
    .limit(1);

  const invalid = new AppError("INVALID_CREDENTIALS", "The email or password is incorrect.");
  if (!u || u.deletedAt) {
    await burnVerify(password);
    await securityEvent({ type: "FAILED_LOGIN", detail: { reason: "unknown_account", portal } }, ctx);
    throw invalid;
  }
  if (u.lockedUntil && u.lockedUntil > new Date()) {
    await securityEvent({ type: "FAILED_LOGIN", userId: u.id, detail: { reason: "locked" } }, ctx);
    throw new AppError("ACCOUNT_LOCKED", "This account is temporarily locked after repeated failed sign-ins. Try again later or contact the school.");
  }
  if (!(await verifyPassword(u.passwordHash, password))) {
    const failures = u.failedLoginCount + 1;
    const lock = failures >= auth.maxFailedLogins;
    await db.update(users).set({ failedLoginCount: lock ? 0 : failures, lockedUntil: lock ? new Date(Date.now() + auth.lockMinutes * 60_000) : null }).where(eq(users.id, u.id));
    await securityEvent({ type: lock ? "ACCOUNT_LOCKED" : "FAILED_LOGIN", severity: lock ? "HIGH" : "LOW", userId: u.id, detail: { failures, portal } }, ctx);
    await audit({ action: "auth.login_failed", entityType: "user", entityId: u.id }, ctx);
    throw invalid;
  }
  if (u.status === "SUSPENDED") {
    await audit({ action: "auth.login_blocked_suspended", entityType: "user", entityId: u.id }, ctx);
    throw new AppError("ACCOUNT_SUSPENDED", "This account is suspended. Please contact the school office.");
  }
  const isStaff = u.userType === "STAFF" || u.userType === "SUPER_ADMIN";
  if ((portal === "backend") !== isStaff) {
    // Same message as a wrong password — never reveal which portal an account belongs to.
    await securityEvent({ type: "FAILED_LOGIN", userId: u.id, detail: { reason: "wrong_portal", portal } }, ctx);
    throw invalid;
  }
  const mfaPending = u.totpEnabled;
  const session = await createSession(u.id, { hours: isStaff ? auth.staffSessionHours : auth.studentSessionHours, mfaPending, maxSessions: isStaff ? undefined : 4 }, ctx);
  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, ...(mfaPending ? {} : { lastLoginAt: new Date() }) }).where(eq(users.id, u.id));
  await resetRateLimit("login", `${ctx.ip ?? "unknown"}:${idKey}`);
  if (!mfaPending) {
    await audit({ actor: { id: u.id, userType: u.userType }, action: "auth.login", entityType: "user", entityId: u.id }, ctx);
    if (isStaff && auth.loginAlerts) await notifyUser({ userId: u.id, category: "SECURITY", title: "New sign-in to the FCGBS backend", body: `A sign-in occurred from ${ctx.ip ?? "an unknown address"}. If this was not you, revoke your sessions now.`, link: "/admin/security" });
  }
  return { token: session.token, expiresAt: session.expiresAt, mfaPending, mustChangePassword: u.mustChangePassword, userType: u.userType };
}

export async function verifyMfa(sessionId: string, userId: string, code: string, ctx: ReqCtx) {
  await rateLimit("mfa", userId, ctx);
  const db = getDb();
  const [u] = await db.select({ id: users.id, userType: users.userType, totpSecretEnc: users.totpSecretEnc }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.totpSecretEnc) throw new AppError("VALIDATION", "Two-factor authentication is not set up.");
  let ok = verifyTotp(decrypt(u.totpSecretEnc), code);
  let usedRecovery = false;
  if (!ok && /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(code.trim())) {
    const normalised = code.trim().toUpperCase().replace(/^(.{4})-?(.{4})$/, "$1-$2");
    const [rc] = await db.update(recoveryCodes).set({ usedAt: new Date() }).where(and(eq(recoveryCodes.userId, userId), eq(recoveryCodes.codeHash, hashRecoveryCode(normalised)), isNull(recoveryCodes.usedAt))).returning({ id: recoveryCodes.id });
    ok = usedRecovery = Boolean(rc);
  }
  if (!ok) {
    await securityEvent({ type: "MFA_FAILED", severity: "MEDIUM", userId }, ctx);
    throw new AppError("INVALID_CREDENTIALS", "That code is not valid. Check your authenticator app and try again.");
  }
  await completeMfa(sessionId);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  await audit({ actor: u, action: usedRecovery ? "auth.login_recovery_code" : "auth.login", entityType: "user", entityId: userId, summary: "Signed in with 2FA" }, ctx);
}

export async function changePassword(actor: Actor, raw: unknown, currentSessionId: string, ctx: ReqCtx) {
  const input = z
    .object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword: z.string().max(128), confirmPassword: z.string() })
    .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." })
    .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "Choose a different password." })
    .parse(raw);
  const db = getDb();
  const [u] = await db.select({ passwordHash: users.passwordHash, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(u.passwordHash, input.currentPassword))) {
    await securityEvent({ type: "FAILED_LOGIN", userId: actor.id, detail: { reason: "change_password_wrong_current" } }, ctx);
    throw new AppError("VALIDATION", "Your current password is incorrect.", { currentPassword: ["Your current password is incorrect."] });
  }
  await assertPasswordPolicy(input.newPassword, [u.firstName, u.lastName, actor.email.split("@")[0]]);
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, actor.id));
  const revoked = await revokeAllSessions(actor.id, "PASSWORD_CHANGED", currentSessionId);
  await audit({ actor, action: "auth.password_changed", entityType: "user", entityId: actor.id, metadata: { otherSessionsRevoked: revoked } }, ctx);
  await notifyUser({ userId: actor.id, category: "SECURITY", title: "Your password was changed", body: "If you did not make this change, contact the school immediately." });
}

/** Self-service reset request. Always responds the same way (no enumeration). */
export async function requestPasswordReset(identifier: string, ctx: ReqCtx) {
  await rateLimit("passwordReset", `${ctx.ip ?? "unknown"}`, ctx);
  const [u] = await getDb().select({ id: users.id, email: users.email, status: users.status }).from(users).where(sql`lower(${users.email}) = ${identifier.trim().toLowerCase()}`).limit(1);
  if (!u || u.status !== "ACTIVE") return;
  const { url } = await issueResetToken(u.id, null, 60);
  const base = process.env.APP_URL ?? "";
  await queueEmail(u.email, "Reset your FCGBS password", `We received a request to reset your password. This link expires in 60 minutes. If you did not request it, ignore this message.\n\n${base}${url}`, u.id);
  await audit({ action: "auth.password_reset_requested", entityType: "user", entityId: u.id }, ctx);
}

export async function issueResetToken(userId: string, createdBy: string | null, minutes: number) {
  const token = randomToken(32);
  await getDb().insert(passwordResetTokens).values({ userId, tokenHash: hmac(`reset:${token}`), createdBy, expiresAt: new Date(Date.now() + minutes * 60_000) });
  return { token, url: `/reset-password?token=${token}` };
}

export async function resetPasswordWithToken(raw: unknown, ctx: ReqCtx) {
  const input = z
    .object({ token: z.string().min(20).max(100), newPassword: z.string().max(128), confirmPassword: z.string() })
    .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." })
    .parse(raw);
  await rateLimit("passwordReset", `token:${ctx.ip ?? "unknown"}`, ctx);
  const db = getDb();
  const [t] = await db.select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId }).from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, hmac(`reset:${input.token}`)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
  if (!t) throw new AppError("VALIDATION", "This reset link is invalid or has expired. Request a new one.");
  const [u] = await db.select({ id: users.id, userType: users.userType, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, t.userId));
  await assertPasswordPolicy(input.newPassword, [u.firstName, u.lastName, u.email.split("@")[0]]);
  await db.transaction(async (tx) => {
    const used = await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.id, t.id), isNull(passwordResetTokens.usedAt))).returning({ id: passwordResetTokens.id });
    if (!used.length) throw new AppError("VALIDATION", "This reset link has already been used.");
    await tx.update(users).set({ passwordHash: await hashPassword(input.newPassword), mustChangePassword: false, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, u.id));
  });
  await revokeAllSessions(u.id, "PASSWORD_RESET");
  await audit({ actor: u, action: "auth.password_reset_completed", entityType: "user", entityId: u.id }, ctx);
}

/* ------------------------------------------------------------------------------ 2FA (TOTP) */

export async function beginTotpEnrolment(actor: Actor) {
  const db = getDb();
  const [cur] = await db.select({ enabled: users.totpEnabled }).from(users).where(eq(users.id, actor.id));
  if (cur?.enabled) throw new AppError("CONFLICT", "Two-factor authentication is already enabled.");
  const secret = newTotpSecret();
  await db.update(users).set({ totpSecretEnc: encrypt(secret), totpEnabled: false }).where(eq(users.id, actor.id));
  return secret;
}

export async function confirmTotpEnrolment(actor: Actor, code: string, ctx: ReqCtx) {
  await rateLimit("mfa", actor.id, ctx);
  const db = getDb();
  const [u] = await db.select({ enc: users.totpSecretEnc, enabled: users.totpEnabled }).from(users).where(eq(users.id, actor.id));
  if (!u?.enc) throw new AppError("VALIDATION", "Start enrolment first.");
  if (u.enabled) throw new AppError("CONFLICT", "Two-factor authentication is already enabled.");
  if (!verifyTotp(decrypt(u.enc), code)) throw new AppError("VALIDATION", "That code did not match. Check that your phone's time is correct and try again.");
  const { plain, hashes } = newRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.update(users).set({ totpEnabled: true }).where(eq(users.id, actor.id));
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, actor.id));
    await tx.insert(recoveryCodes).values(hashes.map((codeHash) => ({ userId: actor.id, codeHash })));
  });
  await audit({ actor, action: "security.2fa_enabled", entityType: "user", entityId: actor.id }, ctx);
  return plain;
}

export async function disableTotp(actor: Actor, password: string, ctx: ReqCtx) {
  const cfg = await getSetting("authentication");
  if (actor.userType === "SUPER_ADMIN" && cfg.requireSuperAdmin2fa) throw new AppError("FORBIDDEN", "Two-factor authentication is mandatory for the Super Admin.");
  const db = getDb();
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!(await verifyPassword(u.hash, password))) throw new AppError("VALIDATION", "Password is incorrect.");
  await db.update(users).set({ totpEnabled: false, totpSecretEnc: null }).where(eq(users.id, actor.id));
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, actor.id));
  await audit({ actor, action: "security.2fa_disabled", entityType: "user", entityId: actor.id }, ctx);
}

/* ------------------------------------------------------------------- Super Admin setup */

const DEFAULT_OWNER_EMAIL = "folahandaniel@gmail.com";
export const ownerEmail = () => process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_OWNER_EMAIL;

export async function superAdminExists() {
  const [row] = await getDb().select({ id: users.id }).from(users).where(eq(users.userType, "SUPER_ADMIN")).limit(1);
  return Boolean(row);
}

/**
 * Creates the first Super Admin. Possible only while none exists, only for the owner e-mail, and only with
 * SETUP_TOKEN from the server environment. No credentials are hard-coded anywhere.
 */
export async function bootstrapSuperAdmin(raw: unknown, ctx: ReqCtx) {
  await rateLimit("login", `setup:${ctx.ip ?? "unknown"}`, ctx);
  const input = z
    .object({ setupToken: z.string().trim().min(1, "Enter the setup key."), firstName: name.optional().or(z.literal("")), lastName: name.optional().or(z.literal("")), email, password: z.string().max(128), confirmPassword: z.string() })
    .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." })
    .parse(raw);
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 16 || hmac(input.setupToken) !== hmac(expected)) {
    await securityEvent({ type: "PRIVILEGE_ESCALATION", severity: "HIGH", detail: { reason: "bad_setup_token" } }, ctx);
    throw new AppError("FORBIDDEN", "Invalid setup key.");
  }
  if (input.email !== ownerEmail()) {
    await securityEvent({ type: "PRIVILEGE_ESCALATION", severity: "HIGH", detail: { reason: "setup_not_owner_email" } }, ctx);
    throw new AppError("FORBIDDEN", "This e-mail is not the owner account for this platform.");
  }
  const firstName = input.firstName || "Super";
  const lastName = input.lastName || "Admin";
  await assertPasswordPolicy(input.password, [firstName, lastName, input.email.split("@")[0]]);
  const passwordHash = await hashPassword(input.password);
  const id = await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7391845563)`);
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.userType, "SUPER_ADMIN")).limit(1);
    if (existing) throw new AppError("CONFLICT", "A Super Admin already exists.");
    const [taken] = await tx.select().from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
    let uid: string;
    if (taken) {
      // The setup key proves ownership of the platform: an applicant account on the owner e-mail is taken over.
      await tx.update(users).set({ userType: "SUPER_ADMIN", passwordHash, status: "ACTIVE", totpEnabled: false, totpSecretEnc: null, failedLoginCount: 0, lockedUntil: null, deletedAt: null, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, taken.id));
      await tx.delete(userRoles).where(eq(userRoles.userId, taken.id));
      uid = taken.id;
    } else {
      [{ id: uid }] = await tx.insert(users).values({ email: input.email, passwordHash, userType: "SUPER_ADMIN", firstName, lastName, passwordChangedAt: new Date() }).returning({ id: users.id });
    }
    await audit({ actor: { id: uid, userType: "SUPER_ADMIN" }, action: "security.super_admin_created", entityType: "user", entityId: uid, summary: "Super Admin created via secure setup" }, ctx, tx);
    return uid;
  });
  await revokeAllSessions(id, "OWNER_SETUP");
  return id;
}
