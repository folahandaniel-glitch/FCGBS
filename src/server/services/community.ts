import { and, asc, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { rateLimit } from "../rate-limit";

/**
 * Community (spec §67): separate spaces — COURSE discussions (registered students of that course + its staff),
 * STUDENT (all students), FACULTY (staff), MINISTRY (students and staff). Every post can be reported; staff with
 * `community.moderate` hide or remove posts; users can block others. Posts are plain text.
 */
export type Scope = "COURSE" | "STUDENT" | "FACULTY" | "MINISTRY";

async function canAccess(actor: Actor, scope: Scope, courseId?: string | null) {
  const learner = actor.userType === "STUDENT" || actor.userType === "ALUMNI";
  const staff = actor.userType === "STAFF" || actor.userType === "SUPER_ADMIN";
  if (scope === "FACULTY") return staff;
  if (scope === "STUDENT") return learner || can(actor, "community.moderate");
  if (scope === "MINISTRY") return learner || staff;
  if (!courseId) return false;
  if (staff) return true;
  const [reg] = await getDb().select({ id: s.courseRegistrations.id }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.courseRegistrations.courseId, courseId), eq(s.students.userId, actor.id), ne(s.courseRegistrations.status, "DROPPED")));
  return Boolean(reg);
}

export async function listPosts(actor: Actor, scope: Scope, courseId?: string | null) {
  if (!(await canAccess(actor, scope, courseId))) throw new AppError("FORBIDDEN", "You do not have access to this space.");
  const blocked = (await getDb().select({ id: s.userBlocks.blockedId }).from(s.userBlocks).where(eq(s.userBlocks.blockerId, actor.id))).map((b) => b.id);
  return getDb()
    .select({ id: s.discussionPosts.id, parentId: s.discussionPosts.parentId, title: s.discussionPosts.title, body: s.discussionPosts.body, createdAt: s.discussionPosts.createdAt, userId: s.discussionPosts.userId, first: s.users.firstName, last: s.users.lastName })
    .from(s.discussionPosts)
    .innerJoin(s.users, eq(s.users.id, s.discussionPosts.userId))
    .where(and(eq(s.discussionPosts.scope, scope), courseId ? eq(s.discussionPosts.courseId, courseId) : undefined, eq(s.discussionPosts.status, "VISIBLE"), blocked.length ? notInArray(s.discussionPosts.userId, blocked) : undefined))
    .orderBy(desc(s.discussionPosts.createdAt))
    .limit(100);
}

export async function createPost(actor: Actor, input: { scope: Scope; courseId?: string; parentId?: string; title?: string; body: string }, ctx: ReqCtx) {
  if (!(await canAccess(actor, input.scope, input.courseId))) throw new AppError("FORBIDDEN", "You do not have access to this space.");
  await rateLimit("contact", `post:${actor.id}`, ctx);
  const body = input.body.trim();
  if (body.length < 2 || body.length > 3000) throw new AppError("VALIDATION", "Write between 2 and 3000 characters.");
  const [p] = await getDb().insert(s.discussionPosts).values({ scope: input.scope, courseId: input.courseId || null, parentId: input.parentId || null, userId: actor.id, title: input.title?.trim() || null, body }).returning({ id: s.discussionPosts.id });
  return p.id;
}

export async function reportPost(actor: Actor, postId: string, reason: string, ctx: ReqCtx) {
  if (reason.trim().length < 5) throw new AppError("VALIDATION", "Tell us what is wrong (at least 5 characters).");
  const [p] = await getDb().select().from(s.discussionPosts).where(eq(s.discussionPosts.id, postId));
  if (!p || !(await canAccess(actor, p.scope as Scope, p.courseId))) throw new AppError("NOT_FOUND", "Post not found.");
  await getDb().insert(s.discussionReports).values({ postId, reporterId: actor.id, reason: reason.trim() });
  await audit({ actor, action: "community.reported", entityType: "post", entityId: postId }, ctx);
}

export async function blockUser(actor: Actor, userId: string) {
  if (userId === actor.id) throw new AppError("VALIDATION", "You cannot block yourself.");
  await getDb().insert(s.userBlocks).values({ blockerId: actor.id, blockedId: userId }).onConflictDoNothing();
}

export async function moderate(actor: Actor, reportId: string, action: "HIDE" | "DISMISS", ctx: ReqCtx) {
  if (!can(actor, "community.moderate")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const db = getDb();
  const [r] = await db.select().from(s.discussionReports).where(eq(s.discussionReports.id, reportId));
  if (!r || r.status !== "OPEN") throw new AppError("RULE_VIOLATION", "This report has already been handled.");
  if (action === "HIDE") await db.update(s.discussionPosts).set({ status: "HIDDEN" }).where(eq(s.discussionPosts.id, r.postId));
  await db.update(s.discussionReports).set({ status: action === "HIDE" ? "ACTIONED" : "DISMISSED", resolvedBy: actor.id }).where(eq(s.discussionReports.id, reportId));
  await audit({ actor, action: `community.${action.toLowerCase()}`, entityType: "post", entityId: r.postId }, ctx);
}

export async function openReports() {
  return getDb().select({ id: s.discussionReports.id, reason: s.discussionReports.reason, postId: s.discussionPosts.id, body: s.discussionPosts.body, scope: s.discussionPosts.scope, authorFirst: s.users.firstName, authorLast: s.users.lastName, createdAt: s.discussionReports.createdAt }).from(s.discussionReports).innerJoin(s.discussionPosts, eq(s.discussionPosts.id, s.discussionReports.postId)).innerJoin(s.users, eq(s.users.id, s.discussionPosts.userId)).where(eq(s.discussionReports.status, "OPEN")).orderBy(asc(s.discussionReports.createdAt)).limit(100);
}

void inArray; void sql;
