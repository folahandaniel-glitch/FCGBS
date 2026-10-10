import { and, desc, eq, gt, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { adjustExpiry, computeExpiry, DAY_MS, effectiveStatus, formatCode, isPlausibleCode, normaliseCode, remaining, type EffectiveAccess } from "@/core/access-engine";
import { FEATURE_DENIED, FEATURE_KEYS, featuresOfCode, sanitiseFeatures, type Feature } from "@/core/features";
import { getDb } from "../db";
import { accessCodes, accessExtensions, accessPeriods, users } from "../db/schema";
import { audit, securityEvent, type Actor, type ReqCtx } from "../audit";
import { AppError, NEED_ACCESS_CODE_MESSAGE } from "../errors";
import { decrypt, encrypt, hmac } from "../crypto";
import { rateLimit } from "../rate-limit";
import { getSetting } from "../settings";
import { notifyUser } from "./notifications";
import { ensureStudent } from "./selfservice";

/**
 * Access codes (modelled on the Fodan College access-code engine). Rule 1: nobody who is not staff may use a learning
 * feature without an active code. The server decides — hiding a menu item is never enough. Rule 2: a code belongs to
 * one account and starts its clock when first activated. Rule 3: time is the server's, never the device's.
 */
const codeHash = (normalised: string) => hmac(`fcgbs-code:${normalised}`);
export const isStaffUser = (t: string) => t === "STAFF" || t === "SUPER_ADMIN";
const LEARNER_TYPES = ["STUDENT", "APPLICANT", "ALUMNI"];

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(d) + " UTC";
}

/* ------------------------------------------------------------ generation */

export async function generateCodes(actor: Actor, raw: { count: number; durationDays?: number; note?: string; features?: string[] | null }, ctx: ReqCtx): Promise<{ batchId: string; codes: string[] }> {
  const cfg = await getSetting("accessCodes");
  const input = z.object({ count: z.number().int().min(1).max(cfg.maxBulk), durationDays: z.number().int().min(1).max(3650).optional(), note: z.string().trim().max(200).optional() }).parse(raw);
  const durationDays = input.durationDays ?? cfg.defaultDays;
  const batchId = randomUUID();
  const codes: string[] = [];
  const rows: (typeof accessCodes.$inferInsert)[] = [];
  const seen = new Set<string>();
  while (rows.length < input.count) {
    const code = formatCode((n) => [...randomBytes(n)]);
    const norm = normaliseCode(code);
    if (seen.has(norm)) continue;
    seen.add(norm);
    codes.push(code);
    rows.push({ codeHash: codeHash(norm), codeEnc: encrypt(code), codeSuffix: code.slice(-4), status: "UNUSED", durationDays, features: sanitiseFeatures(raw.features), batchId, note: input.note, createdBy: actor.id });
  }
  await getDb().transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 500) await tx.insert(accessCodes).values(rows.slice(i, i + 500));
    await audit({ actor, action: "codes.generated", entityType: "code_batch", entityId: batchId, summary: `${input.count} code(s), ${durationDays} days`, metadata: { count: input.count, durationDays, note: input.note } }, ctx, tx);
  });
  return { batchId, codes };
}

/* ------------------------------------------------------------ activation */

/** `byStaff` is set only by the admin "give access" function: staff handing out codes they just made are not guessing. */
export async function activateCode(actor: Pick<Actor, "id" | "userType">, rawCode: string, ctx: ReqCtx, opts: { byStaff?: boolean } = {}) {
  if (!LEARNER_TYPES.includes(actor.userType)) throw new AppError("FORBIDDEN", "Only learner accounts need or use access codes.");
  if (!opts.byStaff) {
    await rateLimit("codeActivation", actor.id, ctx);
    await rateLimit("codeActivation", `ip:${ctx.ip ?? "unknown"}`, ctx);
  }
  if (!isPlausibleCode(rawCode ?? "")) {
    await securityEvent({ type: "INVALID_ACCESS_CODE", userId: actor.id, detail: { reason: "format" } }, ctx);
    throw new AppError("INVALID_CODE", "That access code is not valid. Check it and try again.");
  }
  const norm = normaliseCode(rawCode);
  const cfg = await getSetting("accessCodes");
  const now = new Date(); // server clock

  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM users WHERE id = ${actor.id} FOR UPDATE`); // serialise this learner's activations
    const [code] = await tx.select().from(accessCodes).where(eq(accessCodes.codeHash, codeHash(norm))).for("update").limit(1);
    if (!code) return { error: "INVALID" as const };
    if (code.activatedBy && code.activatedBy !== actor.id) return { error: "USED_BY_OTHER" as const, codeId: code.id };
    if (code.activatedBy === actor.id) return { error: "ALREADY_YOURS" as const };
    if (code.status === "REVOKED" || code.status === "SUSPENDED") return { error: "DISABLED" as const, status: code.status };
    if (code.status !== "UNUSED") return { error: "INVALID" as const };

    const live = await tx.select().from(accessPeriods).where(and(eq(accessPeriods.userId, actor.id), eq(accessPeriods.status, "ACTIVE"))).for("update");
    const stillActive = live.filter((p) => p.currentExpiresAt > now);
    if (stillActive.length > 0 && !cfg.allowMultipleActive) return { error: "HAS_ACTIVE" as const, until: stillActive[0].currentExpiresAt };
    for (const p of live.filter((x) => x.currentExpiresAt <= now)) { // close out lapsed periods so status stays truthful
      await tx.update(accessPeriods).set({ status: "EXPIRED", updatedAt: now }).where(eq(accessPeriods.id, p.id));
      await tx.update(accessCodes).set({ status: "EXPIRED", statusChangedAt: now }).where(eq(accessCodes.id, p.codeId));
    }
    const expiresAt = computeExpiry(now, code.durationDays);
    await tx.update(accessCodes).set({ status: "ACTIVE", activatedBy: actor.id, activatedAt: now, statusChangedAt: now }).where(eq(accessCodes.id, code.id));
    const [period] = await tx.insert(accessPeriods).values({ userId: actor.id, codeId: code.id, status: "ACTIVE", activatedAt: now, originalExpiresAt: expiresAt, currentExpiresAt: expiresAt, durationDays: code.durationDays }).returning();
    await audit({ actor, action: "codes.activated", entityType: "access_code", entityId: code.id, summary: `Code …${code.codeSuffix} activated for ${code.durationDays} days`, metadata: { periodId: period.id, expiresAt } }, ctx, tx);
    return { period };
  });

  if ("error" in result) {
    switch (result.error) {
      case "INVALID":
        await securityEvent({ type: "INVALID_ACCESS_CODE", userId: actor.id, detail: { reason: "not_found" } }, ctx);
        throw new AppError("INVALID_CODE", "That access code is not valid. Check it and try again.");
      case "USED_BY_OTHER":
        await securityEvent({ type: "CODE_REUSE_ATTEMPT", severity: "HIGH", userId: actor.id, detail: { codeId: result.codeId } }, ctx);
        throw new AppError("INVALID_CODE", "This access code has already been used by another account. Each code belongs to one account.");
      case "ALREADY_YOURS": throw new AppError("CONFLICT", "You have already activated this code.");
      case "DISABLED": throw new AppError("INVALID_CODE", `This access code has been ${result.status!.toLowerCase()}. ${NEED_ACCESS_CODE_MESSAGE}`);
      case "HAS_ACTIVE": throw new AppError("CONFLICT", `You already have active access until ${fmtDate(result.until!)}. You can activate a new code after it expires.`);
    }
  }
  const p = result.period;
  // Easy enrolment: an applicant who holds a code becomes a student straight away (formal admission still works for programmes needing it).
  if (actor.userType === "APPLICANT") await ensureStudent(actor.id);
  await notifyUser({ userId: actor.id, category: "ACCESS", title: "Access activated", body: `Your access is active for ${p.durationDays} days, until ${fmtDate(p.currentExpiresAt)}.`, link: "/student" });
  return p;
}

/* ----------------------------------------------------------- learner view */

export interface AccessState {
  /** STAFF: administrators and faculty are not limited by codes. */
  status: EffectiveAccess | "STAFF";
  serverNow: string;
  activatedAt?: string;
  originalExpiresAt?: string;
  expiresAt?: string;
  durationDays?: number;
  remaining?: { totalMs: number; days: number; hours: number; minutes: number };
  codeSuffix?: string;
  message?: string;
  features: Feature[];
}

export async function getAccessState(userId: string, userType?: string): Promise<AccessState> {
  const now = new Date();
  const db = getDb();
  if (!userType) userType = (await db.select({ t: users.userType }).from(users).where(eq(users.id, userId)))[0]?.t;
  if (userType && isStaffUser(userType)) return { status: "STAFF", serverNow: now.toISOString(), features: FEATURE_KEYS };
  const rows = await db
    .select({ p: accessPeriods, codeSuffix: accessCodes.codeSuffix, features: accessCodes.features })
    .from(accessPeriods)
    .innerJoin(accessCodes, eq(accessCodes.id, accessPeriods.codeId))
    .where(eq(accessPeriods.userId, userId))
    .orderBy(desc(accessPeriods.currentExpiresAt))
    .limit(20);
  if (!rows.length) return { status: "NONE", serverNow: now.toISOString(), message: NEED_ACCESS_CODE_MESSAGE, features: [] };
  const pick = rows.find((r) => effectiveStatus(r.p, now) === "ACTIVE") ?? rows.find((r) => r.p.status === "SUSPENDED") ?? rows[0];
  const status = effectiveStatus(pick.p, now);
  const features = [...new Set(rows.filter((r) => effectiveStatus(r.p, now) === "ACTIVE").flatMap((r) => featuresOfCode(r)))];
  return {
    status, features, serverNow: now.toISOString(),
    activatedAt: pick.p.activatedAt.toISOString(), originalExpiresAt: pick.p.originalExpiresAt.toISOString(), expiresAt: pick.p.currentExpiresAt.toISOString(), durationDays: pick.p.durationDays,
    remaining: remaining(pick.p.currentExpiresAt, now), codeSuffix: pick.codeSuffix,
    message: status === "ACTIVE" ? undefined : status === "SUSPENDED" ? `Your access is currently suspended. ${NEED_ACCESS_CODE_MESSAGE}` : status === "REVOKED" ? `Your access has been revoked. ${NEED_ACCESS_CODE_MESSAGE}` : `Your access has expired. ${NEED_ACCESS_CODE_MESSAGE}`,
  };
}

/** True when this state lets the person use the feature (staff always can). */
export const allows = (s: AccessState, f: Feature) => s.status === "STAFF" || (s.status === "ACTIVE" && s.features.includes(f));

/** Throws unless the person holds valid access (staff are exempt). */
export async function requireActiveAccess(userId: string, userType?: string) {
  const s = await getAccessState(userId, userType);
  if (s.status === "STAFF" || s.status === "ACTIVE") return s;
  throw new AppError(s.status === "NONE" ? "ACCESS_REQUIRED" : "ACCESS_EXPIRED", s.message ?? NEED_ACCESS_CODE_MESSAGE);
}

/** Server-side gate for one feature. Hiding a menu item is never enough. */
export async function requireFeature(userId: string, feature: Feature, userType?: string) {
  const s = await requireActiveAccess(userId, userType);
  if (!allows(s, feature)) throw new AppError("ACCESS_REQUIRED", FEATURE_DENIED);
  return s;
}

/** Results and records stay readable after a code lapses (a graduate can always see their own record), unless the code never included them. */
export async function recordsOpen(userId: string, userType?: string) {
  const s = await getAccessState(userId, userType);
  if (s.status === "STAFF") return true;
  if (s.status === "ACTIVE") return s.features.includes("RESULTS");
  return s.status === "EXPIRED" || s.status === "ENDED";
}

export async function updateCodeEntitlements(actor: Actor, codeId: string, features: string[] | null, ctx: ReqCtx) {
  const clean = sanitiseFeatures(features);
  const [before] = await getDb().select({ features: accessCodes.features, suffix: accessCodes.codeSuffix }).from(accessCodes).where(eq(accessCodes.id, codeId));
  if (!before) throw new AppError("NOT_FOUND", "Access code not found.");
  await getDb().update(accessCodes).set({ features: clean }).where(eq(accessCodes.id, codeId));
  await audit({ actor, action: "codes.entitlements_changed", entityType: "access_code", entityId: codeId, summary: `Features of code …${before.suffix} changed`, metadata: { before: before.features, after: clean } }, ctx);
}

/* ---------------------------------------------------------- admin control */

export const adjustSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("EXTEND"), days: z.number().int().min(1).max(3650), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("REDUCE"), days: z.number().int().min(1).max(3650), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("SET_EXPIRY"), expiresAt: z.coerce.date(), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("END"), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("SUSPEND"), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("RESTORE"), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("REVOKE"), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("REACTIVATE"), reason: z.string().trim().min(3).max(300) }),
]);

/** Every change to an access period is recalculated on the server, stored with before/after values and a reason, and audited. */
export async function adjustAccess(actor: Actor, periodId: string, raw: unknown, ctx: ReqCtx) {
  const input = adjustSchema.parse(raw);
  const now = new Date();
  const out = await getDb().transaction(async (tx) => {
    const [p] = await tx.select().from(accessPeriods).where(eq(accessPeriods.id, periodId)).for("update").limit(1);
    if (!p) throw new AppError("NOT_FOUND", "Access period not found.");
    const prev = p.currentExpiresAt;
    let next = prev;
    let status = p.status;
    let delta: number | null = null;
    switch (input.action) {
      case "EXTEND": next = adjustExpiry(p as never, { kind: "EXTEND", days: input.days }, now); delta = input.days; if (status === "EXPIRED" || status === "ENDED") status = "ACTIVE"; break;
      case "REDUCE": next = adjustExpiry(p as never, { kind: "REDUCE", days: input.days }, now); delta = -input.days; break;
      case "SET_EXPIRY": next = adjustExpiry(p as never, { kind: "SET_EXPIRY", expiresAt: input.expiresAt }, now); delta = Math.round((next.getTime() - prev.getTime()) / DAY_MS); if (next > now && (status === "EXPIRED" || status === "ENDED")) status = "ACTIVE"; break;
      case "END": next = adjustExpiry(p as never, { kind: "END" }, now); status = "ENDED"; break;
      case "SUSPEND": if (status !== "ACTIVE") throw new AppError("CONFLICT", "Only active access can be suspended."); status = "SUSPENDED"; break;
      case "RESTORE": if (status !== "SUSPENDED") throw new AppError("CONFLICT", "Only suspended access can be restored."); status = "ACTIVE"; break;
      case "REVOKE": if (status === "REVOKED") throw new AppError("CONFLICT", "Access is already revoked."); status = "REVOKED"; break;
      case "REACTIVATE": if (status !== "REVOKED" && status !== "ENDED" && status !== "EXPIRED") throw new AppError("CONFLICT", "Access is not revoked, ended or expired."); status = "ACTIVE"; if (next <= now) throw new AppError("VALIDATION", "Extend or set a future expiry first — the period has already lapsed."); break;
    }
    if (status === "ACTIVE" && next <= now) status = "EXPIRED";
    if (status === "ACTIVE" && p.status !== "ACTIVE") {
      const cfg = await getSetting("accessCodes", tx);
      const others = await tx.select({ id: accessPeriods.id }).from(accessPeriods).where(and(eq(accessPeriods.userId, p.userId), eq(accessPeriods.status, "ACTIVE"), gt(accessPeriods.currentExpiresAt, now), sql`${accessPeriods.id} <> ${p.id}`));
      if (others.length && !cfg.allowMultipleActive) throw new AppError("CONFLICT", "This person already has another active access period.");
    }
    const [updated] = await tx.update(accessPeriods).set({ currentExpiresAt: next, status, updatedAt: now }).where(eq(accessPeriods.id, p.id)).returning();
    const codeStatus = status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : status === "REVOKED" ? "REVOKED" : "EXPIRED";
    await tx.update(accessCodes).set({ status: codeStatus, statusChangedAt: now, statusReason: input.reason }).where(eq(accessCodes.id, p.codeId));
    await tx.insert(accessExtensions).values({ periodId: p.id, action: input.action, previousExpiresAt: prev, newExpiresAt: next, deltaDays: delta, reason: input.reason, adminId: actor.id });
    await audit({ actor, action: `access.${input.action.toLowerCase()}`, entityType: "access_period", entityId: p.id, summary: `${input.action} — ${input.reason}`, metadata: { userId: p.userId, previousExpiresAt: prev, newExpiresAt: next, previousStatus: p.status, newStatus: status, deltaDays: delta } }, ctx, tx);
    return updated;
  });
  await notifyUser({ userId: out.userId, category: "ACCESS", title: "Your access was updated", body: out.status === "ACTIVE" ? `Your access is active until ${fmtDate(out.currentExpiresAt)}.` : `Your access status is now ${out.status.toLowerCase()}. ${NEED_ACCESS_CODE_MESSAGE}`, link: "/student" });
  return out;
}

/** Admin gives one person access in one step: a fresh code is made and activated for them. */
export async function assignAccess(actor: Actor, identifier: string, days: number | undefined, reason: string, ctx: ReqCtx) {
  if (reason.trim().length < 3) throw new AppError("VALIDATION", "Record a reason.");
  const key = identifier.trim().toLowerCase();
  if (key.length < 3) throw new AppError("VALIDATION", "Enter the person's e-mail address or student number.");
  const [u] = await getDb().select({ id: users.id, userType: users.userType }).from(users).where(sql`lower(${users.email}) = ${key} OR ${users.id} IN (SELECT user_id FROM students WHERE lower(student_number) = ${key})`).limit(1);
  if (!u || !LEARNER_TYPES.includes(u.userType)) throw new AppError("NOT_FOUND", "No learner account matches that e-mail or student number.");
  const { codes } = await generateCodes(actor, { count: 1, durationDays: days, note: `Assigned directly: ${reason}`.slice(0, 200) }, ctx);
  return activateCode({ id: u.id, userType: u.userType }, codes[0], ctx, { byStaff: true });
}

export async function setCodeStatus(actor: Actor, codeId: string, action: "SUSPEND" | "REVOKE" | "RESTORE", reason: string, ctx: ReqCtx) {
  if (reason.trim().length < 3) throw new AppError("VALIDATION", "Record a reason.");
  const db = getDb();
  const [code] = await db.select().from(accessCodes).where(eq(accessCodes.id, codeId));
  if (!code) throw new AppError("NOT_FOUND", "Code not found.");
  if (code.activatedBy) {
    const [p] = await db.select({ id: accessPeriods.id }).from(accessPeriods).where(eq(accessPeriods.codeId, code.id));
    const map = { SUSPEND: "SUSPEND", REVOKE: "REVOKE", RESTORE: code.status === "REVOKED" ? "REACTIVATE" : "RESTORE" } as const;
    return adjustAccess(actor, p.id, { action: map[action], reason }, ctx);
  }
  const next = action === "RESTORE" ? "UNUSED" : action === "SUSPEND" ? "SUSPENDED" : "REVOKED";
  if (action === "RESTORE" && code.status === "UNUSED") throw new AppError("CONFLICT", "Code is already usable.");
  await db.update(accessCodes).set({ status: next, statusChangedAt: new Date(), statusReason: reason }).where(eq(accessCodes.id, code.id));
  await audit({ actor, action: `codes.${action.toLowerCase()}`, entityType: "access_code", entityId: code.id, summary: `Code …${code.codeSuffix}: ${reason}` }, ctx);
}

/** Reveal a code for re-issue/export. Audited every time. */
export async function revealCode(actor: Actor, codeId: string, ctx: ReqCtx) {
  const [c] = await getDb().select().from(accessCodes).where(eq(accessCodes.id, codeId));
  if (!c) throw new AppError("NOT_FOUND", "Code not found.");
  await audit({ actor, action: "codes.revealed", entityType: "access_code", entityId: c.id }, ctx);
  return decrypt(c.codeEnc);
}

export async function revealBatch(actor: Actor, batchId: string, ctx: ReqCtx) {
  const rows = await getDb().select({ id: accessCodes.id, enc: accessCodes.codeEnc, status: accessCodes.status }).from(accessCodes).where(eq(accessCodes.batchId, batchId));
  await audit({ actor, action: "codes.batch_revealed", entityType: "code_batch", entityId: batchId, summary: `${rows.length} code(s) exported` }, ctx);
  return rows.map((r) => ({ code: decrypt(r.enc), status: r.status }));
}

/** Marks lapsed ACTIVE periods/codes as EXPIRED (idempotent; run lazily and from the daily cron). */
export async function syncExpired() {
  const now = new Date();
  const db = getDb();
  const lapsed = await db.update(accessPeriods).set({ status: "EXPIRED", updatedAt: now }).where(and(eq(accessPeriods.status, "ACTIVE"), lte(accessPeriods.currentExpiresAt, now))).returning({ codeId: accessPeriods.codeId });
  if (lapsed.length) await db.update(accessCodes).set({ status: "EXPIRED", statusChangedAt: now }).where(inArray(accessCodes.id, lapsed.map((l) => l.codeId)));
  return lapsed.length;
}

export async function listCodes(q: { status?: string; search?: string; batchId?: string; page?: number; pageSize?: number }) {
  await syncExpired();
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, q.pageSize ?? 25));
  const conds: SQL[] = [];
  if (q.status && ["UNUSED", "ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED"].includes(q.status)) conds.push(eq(accessCodes.status, q.status));
  if (q.batchId) conds.push(eq(accessCodes.batchId, q.batchId));
  if (q.search?.trim()) {
    const s = q.search.trim();
    const or1 = or(ilike(accessCodes.codeSuffix, `%${s.slice(-4)}%`), ilike(users.email, `%${s}%`), ilike(users.lastName, `%${s}%`), ilike(accessCodes.note, `%${s}%`), isPlausibleCode(s) ? eq(accessCodes.codeHash, codeHash(normaliseCode(s))) : undefined);
    if (or1) conds.push(or1);
  }
  const db = getDb();
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select({ id: accessCodes.id, suffix: accessCodes.codeSuffix, status: accessCodes.status, durationDays: accessCodes.durationDays, features: accessCodes.features, batchId: accessCodes.batchId, note: accessCodes.note, createdAt: accessCodes.createdAt, activatedAt: accessCodes.activatedAt, userId: users.id, userName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`, userEmail: users.email, expiresAt: accessPeriods.currentExpiresAt, originalExpiresAt: accessPeriods.originalExpiresAt, periodId: accessPeriods.id })
    .from(accessCodes).leftJoin(users, eq(users.id, accessCodes.activatedBy)).leftJoin(accessPeriods, eq(accessPeriods.codeId, accessCodes.id))
    .where(where).orderBy(desc(accessCodes.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(accessCodes).leftJoin(users, eq(users.id, accessCodes.activatedBy)).where(where);
  const counts = await db.select({ status: accessCodes.status, n: sql<number>`count(*)::int` }).from(accessCodes).groupBy(accessCodes.status);
  return { rows, total, page, pageSize, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number> };
}

export async function accessHistory(userId: string) {
  const periods = await getDb().select({ p: accessPeriods, suffix: accessCodes.codeSuffix }).from(accessPeriods).innerJoin(accessCodes, eq(accessCodes.id, accessPeriods.codeId)).where(eq(accessPeriods.userId, userId)).orderBy(desc(accessPeriods.activatedAt));
  const now = new Date();
  return periods.map((r) => ({ ...r.p, suffix: r.suffix, effective: effectiveStatus(r.p as never, now) }));
}
