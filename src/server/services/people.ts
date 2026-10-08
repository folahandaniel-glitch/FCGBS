import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { can, sanitisePermissionList } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { generateTemporaryPassword, hashPassword } from "../auth/password";
import { revokeAllSessions } from "../auth/session";
import { issueResetToken } from "./auth";
import { notifyUser } from "./notifications";

/** Staff accounts are created only by people who may manage users; roles can only be assigned by the Super Admin (`super.roles`) — no self-service privilege escalation. */
export async function createStaff(actor: Actor, input: { email: string; firstName: string; lastName: string; phone?: string; roleKeys: string[]; title?: string; departmentId?: string; rank?: string; publicProfile?: boolean }, ctx: ReqCtx) {
  if (!can(actor, "users.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("VALIDATION", "Enter a valid email address.", { email: ["Enter a valid email address."] });
  if (!input.firstName.trim() || !input.lastName.trim()) throw new AppError("VALIDATION", "Enter first and last name.");
  if (input.roleKeys.length && !can(actor, "super.roles")) throw new AppError("FORBIDDEN", "Only the Super Admin can assign roles.");
  const temp = generateTemporaryPassword();
  const db = getDb();
  return db.transaction(async (tx) => {
    const [dupe] = await tx.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${email}`);
    if (dupe) throw new AppError("CONFLICT", "An account with this email already exists.", { email: ["Already in use."] });
    const [u] = await tx.insert(s.users).values({ email, passwordHash: await hashPassword(temp), userType: "STAFF", firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: input.phone, mustChangePassword: true, passwordChangedAt: new Date() }).returning({ id: s.users.id });
    if (input.roleKeys.length) {
      const roles = await tx.select({ id: s.roles.id }).from(s.roles).where(inArray(s.roles.key, input.roleKeys));
      if (roles.length) await tx.insert(s.userRoles).values(roles.map((r) => ({ userId: u.id, roleId: r.id, assignedBy: actor.id })));
    }
    await tx.insert(s.staffProfiles).values({ userId: u.id, title: input.title, departmentId: input.departmentId || null, rank: input.rank, publicProfile: Boolean(input.publicProfile) });
    await audit({ actor, action: "user.staff_created", entityType: "user", entityId: u.id, summary: email, metadata: { roles: input.roleKeys } }, ctx, tx);
    return { id: u.id, temporaryPassword: temp };
  });
}

export async function setUserRoles(actor: Actor, userId: string, roleKeys: string[], ctx: ReqCtx) {
  if (!can(actor, "super.roles")) throw new AppError("FORBIDDEN", "Only the Super Admin can assign roles.");
  const db = getDb();
  const [u] = await db.select({ type: s.users.userType }).from(s.users).where(eq(s.users.id, userId));
  if (!u || u.type !== "STAFF") throw new AppError("VALIDATION", "Roles can only be assigned to staff accounts.");
  await db.transaction(async (tx) => {
    const before = await tx.select({ k: s.roles.key }).from(s.userRoles).innerJoin(s.roles, eq(s.roles.id, s.userRoles.roleId)).where(eq(s.userRoles.userId, userId));
    await tx.delete(s.userRoles).where(eq(s.userRoles.userId, userId));
    const roles = roleKeys.length ? await tx.select({ id: s.roles.id }).from(s.roles).where(inArray(s.roles.key, roleKeys)) : [];
    if (roles.length) await tx.insert(s.userRoles).values(roles.map((r) => ({ userId, roleId: r.id, assignedBy: actor.id })));
    await audit({ actor, action: "user.roles_changed", entityType: "user", entityId: userId, metadata: { before: before.map((b) => b.k), after: roleKeys } }, ctx, tx);
  });
  await revokeAllSessions(userId, "ROLES_CHANGED"); // permissions are re-read on the next sign-in
}

export async function setAccountStatus(actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED", reason: string, ctx: ReqCtx) {
  if (!can(actor, "users.manage") && !can(actor, "students.status")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (reason.trim().length < 3) throw new AppError("VALIDATION", "Record a reason.");
  const [u] = await getDb().select({ type: s.users.userType, id: s.users.id }).from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new AppError("NOT_FOUND", "User not found.");
  if (u.type === "SUPER_ADMIN") throw new AppError("FORBIDDEN", "The Super Admin account cannot be changed here.");
  if (u.id === actor.id) throw new AppError("RULE_VIOLATION", "You cannot suspend your own account.");
  if (u.type === "STAFF" && !can(actor, "users.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().update(s.users).set({ status, updatedAt: new Date() }).where(eq(s.users.id, userId));
  if (status === "SUSPENDED") await revokeAllSessions(userId, "SUSPENDED");
  await audit({ actor, action: status === "SUSPENDED" ? "user.suspended" : "user.reactivated", entityType: "user", entityId: userId, metadata: { reason } }, ctx);
}

export async function adminResetLink(actor: Actor, userId: string, ctx: ReqCtx) {
  if (!can(actor, "users.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const [u] = await getDb().select({ type: s.users.userType }).from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new AppError("NOT_FOUND", "User not found.");
  if (u.type === "SUPER_ADMIN" && !can(actor, "super.accounts")) throw new AppError("FORBIDDEN", "You cannot reset the Super Admin.");
  const { url } = await issueResetToken(userId, actor.id, 60);
  await audit({ actor, action: "user.reset_link_issued", entityType: "user", entityId: userId }, ctx);
  return url;
}

/* ------------------------------------------------------------------- roles */

export async function saveRolePermissions(actor: Actor, roleId: string, perms: string[], ctx: ReqCtx) {
  if (!can(actor, "super.roles")) throw new AppError("FORBIDDEN", "Only the Super Admin can change roles.");
  const clean = sanitisePermissionList(perms);
  await getDb().transaction(async (tx) => {
    const before = await tx.select({ k: s.rolePermissions.permissionKey }).from(s.rolePermissions).where(eq(s.rolePermissions.roleId, roleId));
    await tx.delete(s.rolePermissions).where(eq(s.rolePermissions.roleId, roleId));
    if (clean.length) await tx.insert(s.rolePermissions).values(clean.map((permissionKey) => ({ roleId, permissionKey })));
    await audit({ actor, action: "role.permissions_changed", entityType: "role", entityId: roleId, metadata: { before: before.map((b) => b.k), after: clean } }, ctx, tx);
  });
}

export async function createRole(actor: Actor, key: string, name: string, description: string, ctx: ReqCtx) {
  if (!can(actor, "super.roles")) throw new AppError("FORBIDDEN", "Only the Super Admin can change roles.");
  if (!/^[a-z][a-z0-9-]{2,40}$/.test(key)) throw new AppError("VALIDATION", "Role key: lowercase letters, digits and dashes (3–40 characters).");
  const [r] = await getDb().insert(s.roles).values({ key, name, description, groupName: "Custom" }).returning({ id: s.roles.id });
  await audit({ actor, action: "role.created", entityType: "role", entityId: r.id, summary: name }, ctx);
  return r.id;
}

export async function listStaff() {
  const rows = await getDb()
    .select({ id: s.users.id, email: s.users.email, first: s.users.firstName, last: s.users.lastName, status: s.users.status, type: s.users.userType, lastLogin: s.users.lastLoginAt, totp: s.users.totpEnabled, title: s.staffProfiles.title, dept: s.departments.name })
    .from(s.users)
    .leftJoin(s.staffProfiles, eq(s.staffProfiles.userId, s.users.id))
    .leftJoin(s.departments, eq(s.departments.id, s.staffProfiles.departmentId))
    .where(and(inArray(s.users.userType, ["STAFF", "SUPER_ADMIN"]), isNull(s.users.deletedAt)))
    .orderBy(asc(s.users.lastName));
  const roles = await getDb().select({ userId: s.userRoles.userId, name: s.roles.name, key: s.roles.key }).from(s.userRoles).innerJoin(s.roles, eq(s.roles.id, s.userRoles.roleId));
  return rows.map((r) => ({ ...r, roles: roles.filter((x) => x.userId === r.id) }));
}

void notifyUser;
