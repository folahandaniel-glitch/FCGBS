import { and, asc, eq } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";

/** Course content may be edited by course administrators, and by the lecturer assigned to the course (lecturer content stays "LECTURER" authority). */
async function assertCourseEditor(actor: Actor, courseId: string) {
  if (can(actor, "courses.manage")) return "ACADEMIC" as const;
  if (can(actor, "teaching.own")) {
    const [o] = await getDb().select({ id: s.offerings.id }).from(s.offerings).where(and(eq(s.offerings.courseId, courseId), eq(s.offerings.lecturerId, actor.id))).limit(1);
    if (o) return "LECTURER" as const;
  }
  throw new AppError("FORBIDDEN", "You do not have permission to edit this course.");
}

export async function saveWeights(actor: Actor, courseId: string, w: { assignment: number; test: number; exam: number; practical: number }, ctx: ReqCtx) {
  if (!can(actor, "courses.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (Object.values(w).some((x) => !(x >= 0 && x <= 100))) throw new AppError("VALIDATION", "Each weight must be between 0 and 100.");
  if (w.assignment + w.test + w.exam + w.practical !== 100) throw new AppError("VALIDATION", "Assessment weights must total exactly 100.");
  const [c] = await getDb().select({ w: s.courses.assessmentWeights }).from(s.courses).where(eq(s.courses.id, courseId));
  await getDb().update(s.courses).set({ assessmentWeights: w, updatedAt: new Date() }).where(eq(s.courses.id, courseId));
  await audit({ actor, action: "course.weights_changed", entityType: "course", entityId: courseId, metadata: { before: c?.w, after: w } }, ctx);
}

export async function addRelation(actor: Actor, courseId: string, relatedId: string, kind: "PREREQUISITE" | "COREQUISITE", ctx: ReqCtx) {
  if (!can(actor, "courses.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (courseId === relatedId) throw new AppError("VALIDATION", "A course cannot require itself.");
  // Reject direct cycles (A requires B while B requires A).
  const [back] = await getDb().select().from(s.courseRelations).where(and(eq(s.courseRelations.courseId, relatedId), eq(s.courseRelations.relatedCourseId, courseId), eq(s.courseRelations.kind, "PREREQUISITE")));
  if (back && kind === "PREREQUISITE") throw new AppError("RULE_VIOLATION", "That would create a circular prerequisite.");
  await getDb().insert(s.courseRelations).values({ courseId, relatedCourseId: relatedId, kind }).onConflictDoNothing();
  await audit({ actor, action: "course.relation_added", entityType: "course", entityId: courseId, metadata: { relatedId, kind } }, ctx);
}

export async function removeRelation(actor: Actor, courseId: string, relatedId: string, kind: string, ctx: ReqCtx) {
  if (!can(actor, "courses.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().delete(s.courseRelations).where(and(eq(s.courseRelations.courseId, courseId), eq(s.courseRelations.relatedCourseId, relatedId), eq(s.courseRelations.kind, kind)));
  await audit({ actor, action: "course.relation_removed", entityType: "course", entityId: courseId, metadata: { relatedId, kind } }, ctx);
}

export async function saveModule(actor: Actor, courseId: string, input: { id?: string; title: string; summary?: string; position?: number }, ctx: ReqCtx) {
  await assertCourseEditor(actor, courseId);
  if (!input.title.trim()) throw new AppError("VALIDATION", "Enter a module title.");
  const db = getDb();
  if (input.id) await db.update(s.modules).set({ title: input.title.trim(), summary: input.summary, position: input.position ?? 0 }).where(and(eq(s.modules.id, input.id), eq(s.modules.courseId, courseId)));
  else await db.insert(s.modules).values({ courseId, title: input.title.trim(), summary: input.summary, position: input.position ?? 99 });
  await audit({ actor, action: "module.saved", entityType: "course", entityId: courseId, summary: input.title }, ctx);
}

export async function saveLesson(actor: Actor, courseId: string, input: { id?: string; moduleId: string; title: string; summary?: string; body?: string; videoUrl?: string; audioUrl?: string; readMinutes?: number; position?: number; authority?: string; status?: string }, ctx: ReqCtx) {
  const base = await assertCourseEditor(actor, courseId);
  if (!input.title.trim()) throw new AppError("VALIDATION", "Enter a lesson title.");
  for (const u of [input.videoUrl, input.audioUrl]) if (u && !/^https:\/\//.test(u)) throw new AppError("VALIDATION", "Media links must start with https://.");
  // Doctrine governance (spec §79): only users who can approve policies may publish INSTITUTIONAL teaching; lecturers' material is labelled as such.
  let authority = input.authority ?? base;
  if (authority === "INSTITUTIONAL" && !can(actor, "policies.approve")) authority = base;
  if (base === "LECTURER") authority = "LECTURER";
  let status = input.status ?? "PUBLISHED";
  if (base === "LECTURER" && status === "PUBLISHED" && !can(actor, "courses.manage")) status = "PUBLISHED"; // lecturer material is published but labelled; staff can archive it
  const [mod] = await getDb().select({ id: s.modules.id }).from(s.modules).where(and(eq(s.modules.id, input.moduleId), eq(s.modules.courseId, courseId)));
  if (!mod) throw new AppError("NOT_FOUND", "Module not found.");
  const values = { moduleId: input.moduleId, courseId, title: input.title.trim(), summary: input.summary || null, body: input.body ?? null, videoUrl: input.videoUrl || null, audioUrl: input.audioUrl || null, readMinutes: input.readMinutes || 8, position: input.position ?? 0, authority, status: status as "PUBLISHED", authorId: actor.id, updatedAt: new Date() };
  let id = input.id;
  if (id) await getDb().update(s.lessons).set(values).where(and(eq(s.lessons.id, id), eq(s.lessons.courseId, courseId)));
  else [{ id }] = await getDb().insert(s.lessons).values(values).returning({ id: s.lessons.id });
  await audit({ actor, action: input.id ? "lesson.updated" : "lesson.created", entityType: "lesson", entityId: id, summary: input.title }, ctx);
  return id!;
}

export async function courseTree(courseId: string) {
  const db = getDb();
  const mods = await db.select().from(s.modules).where(eq(s.modules.courseId, courseId)).orderBy(asc(s.modules.position));
  const lessons = await db.select({ id: s.lessons.id, moduleId: s.lessons.moduleId, title: s.lessons.title, status: s.lessons.status, authority: s.lessons.authority, position: s.lessons.position }).from(s.lessons).where(eq(s.lessons.courseId, courseId)).orderBy(asc(s.lessons.position));
  return { mods, lessons };
}

export async function addProgrammeCourse(actor: Actor, programmeId: string, courseId: string, kind: string, year: number, semester: number, ctx: ReqCtx) {
  if (!can(actor, "programmes.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().insert(s.programmeCourses).values({ programmeId, courseId, kind: kind === "ELECTIVE" ? "ELECTIVE" : "CORE", year: Math.max(1, year), semester: Math.max(1, semester) }).onConflictDoUpdate({ target: [s.programmeCourses.programmeId, s.programmeCourses.courseId], set: { kind: kind === "ELECTIVE" ? "ELECTIVE" : "CORE", year, semester } });
  // Keep the programme's minimum credits consistent with its core courses — configurable afterwards.
  await audit({ actor, action: "programme.course_set", entityType: "programme", entityId: programmeId, metadata: { courseId, kind, year, semester } }, ctx);
}

export async function removeProgrammeCourse(actor: Actor, programmeId: string, courseId: string, ctx: ReqCtx) {
  if (!can(actor, "programmes.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().delete(s.programmeCourses).where(and(eq(s.programmeCourses.programmeId, programmeId), eq(s.programmeCourses.courseId, courseId)));
  await audit({ actor, action: "programme.course_removed", entityType: "programme", entityId: programmeId, metadata: { courseId } }, ctx);
}
