import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "../db";
import * as s from "../db/schema";
import { AppError } from "../errors";
import { audit, type Actor, type ReqCtx } from "../audit";

/** The learner's student row, active enrolments and current term — resolved once per request. */
export const learnerContext = cache(async (userId: string) => {
  const db = getDb();
  const [st] = await db.select().from(s.students).where(eq(s.students.userId, userId));
  if (!st) return null;
  const enrolments = await db
    .select({ e: s.enrolments, programme: s.programmes.name, programmeSlug: s.programmes.slug, level: s.programmeLevels.name })
    .from(s.enrolments)
    .innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId))
    .innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId))
    .where(eq(s.enrolments.studentId, st.id))
    .orderBy(desc(s.enrolments.createdAt));
  const [term] = await db.select().from(s.academicTerms).where(eq(s.academicTerms.isCurrent, true)).limit(1);
  return { student: st, enrolments, primary: enrolments.find((e) => e.e.status === "ACTIVE") ?? enrolments[0] ?? null, term: term ?? null };
});

export async function myRegistrations(enrolmentId: string) {
  return getDb()
    .select({ regId: s.courseRegistrations.id, status: s.courseRegistrations.status, source: s.courseRegistrations.source, offeringId: s.offerings.id, code: s.courses.code, title: s.courses.title, credits: s.courses.credits, courseId: s.courses.id, term: s.academicTerms.name, resultStatus: s.results.status, grade: s.results.grade, total: s.results.total })
    .from(s.courseRegistrations)
    .innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId))
    .leftJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId))
    .leftJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId))
    .leftJoin(s.results, eq(s.results.registrationId, s.courseRegistrations.id))
    .where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.status, "DROPPED")))
    .orderBy(desc(s.academicTerms.startsOn), asc(s.courses.code));
}

/** Offerings a student may register for: this programme's courses (core or elective) open in the current term. */
export async function availableOfferings(enrolmentId: string, programmeId: string, termId: string) {
  const mine = await getDb().select({ courseId: s.courseRegistrations.courseId }).from(s.courseRegistrations).where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.status, "DROPPED")));
  const have = new Set(mine.map((m) => m.courseId));
  const rows = await getDb()
    .select({ offeringId: s.offerings.id, courseId: s.courses.id, code: s.courses.code, title: s.courses.title, credits: s.courses.credits, kind: s.programmeCourses.kind, year: s.programmeCourses.year, semester: s.programmeCourses.semester })
    .from(s.offerings)
    .innerJoin(s.courses, eq(s.courses.id, s.offerings.courseId))
    .innerJoin(s.programmeCourses, and(eq(s.programmeCourses.courseId, s.courses.id), eq(s.programmeCourses.programmeId, programmeId)))
    .where(and(eq(s.offerings.termId, termId), eq(s.offerings.status, "OPEN")))
    .orderBy(asc(s.programmeCourses.year), asc(s.programmeCourses.semester), asc(s.courses.code));
  return rows.filter((r) => !have.has(r.courseId));
}

/** A learner may read a course only if they hold a registration for it (or it is an exemption they hold credit for). */
export async function courseForLearner(userId: string, offeringId: string) {
  const db = getDb();
  const [row] = await db
    .select({ reg: s.courseRegistrations, course: s.courses, offering: s.offerings, term: s.academicTerms, lecturer: sql<string>`(select first_name || ' ' || last_name from users where id = ${s.offerings.lecturerId})` })
    .from(s.courseRegistrations)
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .innerJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId))
    .innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId))
    .innerJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId))
    .where(and(eq(s.offerings.id, offeringId), eq(s.students.userId, userId), ne(s.courseRegistrations.status, "DROPPED")));
  if (!row) throw new AppError("NOT_FOUND", "Course not found.");
  const mods = await db.select().from(s.modules).where(and(eq(s.modules.courseId, row.course.id), eq(s.modules.status, "PUBLISHED"))).orderBy(asc(s.modules.position));
  const lessons = mods.length ? await db.select({ id: s.lessons.id, moduleId: s.lessons.moduleId, title: s.lessons.title, readMinutes: s.lessons.readMinutes, position: s.lessons.position, authority: s.lessons.authority }).from(s.lessons).where(and(inArray(s.lessons.moduleId, mods.map((m) => m.id)), eq(s.lessons.status, "PUBLISHED"))).orderBy(asc(s.lessons.position)) : [];
  const done = new Set((await db.select({ id: s.lessonProgress.lessonId }).from(s.lessonProgress).where(eq(s.lessonProgress.userId, userId))).map((d) => d.id));
  const assessments = await db.select().from(s.assessments).where(and(eq(s.assessments.offeringId, offeringId), eq(s.assessments.status, "PUBLISHED"))).orderBy(asc(s.assessments.dueAt));
  const subs = await db.select({ assessmentId: s.submissions.assessmentId, status: s.submissions.status, score: s.submissions.score }).from(s.submissions).where(eq(s.submissions.registrationId, row.reg.id));
  return { ...row, modules: mods, lessons, done, assessments, subs };
}

export async function lessonForLearner(userId: string, lessonId: string) {
  const db = getDb();
  const [l] = await db.select().from(s.lessons).where(and(eq(s.lessons.id, lessonId), eq(s.lessons.status, "PUBLISHED")));
  if (!l) throw new AppError("NOT_FOUND", "Lesson not found.");
  // Access: registered for the course, or the lesson belongs to an exempted course. Staff preview is handled elsewhere.
  const [reg] = await db.select({ id: s.courseRegistrations.id }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.courseRegistrations.courseId, l.courseId), eq(s.students.userId, userId), ne(s.courseRegistrations.status, "DROPPED")));
  if (!reg) throw new AppError("NOT_FOUND", "Lesson not found.");
  const siblings = await db.select({ id: s.lessons.id, title: s.lessons.title }).from(s.lessons).innerJoin(s.modules, eq(s.modules.id, s.lessons.moduleId)).where(and(eq(s.lessons.courseId, l.courseId), eq(s.lessons.status, "PUBLISHED"))).orderBy(asc(s.modules.position), asc(s.lessons.position));
  const [off] = await db.select({ id: s.offerings.id }).from(s.offerings).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.offeringId, s.offerings.id)).where(eq(s.courseRegistrations.id, reg.id));
  return { lesson: l, siblings, offeringId: off?.id };
}

export async function completeLesson(actor: Actor, lessonId: string) {
  await lessonForLearner(actor.id, lessonId);
  await getDb().insert(s.lessonProgress).values({ userId: actor.id, lessonId }).onConflictDoNothing();
}

export async function gpaPublishedResults(enrolmentId: string) {
  return getDb()
    .select({ resultId: s.results.id, code: s.courses.code, title: s.courses.title, credits: s.results.credits, grade: s.results.grade, point: s.results.gradePoint, total: s.results.total, status: s.results.status, term: s.academicTerms.name, regId: s.courseRegistrations.id })
    .from(s.results)
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId))
    .innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId))
    .leftJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId))
    .leftJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId))
    .where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), inArray(s.results.status, ["PUBLISHED", "LOCKED"])))
    .orderBy(desc(s.academicTerms.startsOn), asc(s.courses.code));
}

/** Attendance percentage per registration, from taken sessions only. */
export async function attendancePct(registrationId: string, offeringId: string) {
  const [t] = await getDb().select({ n: sql<number>`count(*)::int` }).from(s.attendanceSessions).where(eq(s.attendanceSessions.offeringId, offeringId));
  if (!t.n) return null;
  const [p] = await getDb().select({ n: sql<number>`count(*)::int` }).from(s.attendanceRecords).innerJoin(s.attendanceSessions, eq(s.attendanceSessions.id, s.attendanceRecords.sessionId)).where(and(eq(s.attendanceRecords.registrationId, registrationId), eq(s.attendanceSessions.offeringId, offeringId), inArray(s.attendanceRecords.status, ["PRESENT", "LATE", "EXCUSED"])));
  return Math.round((p.n / t.n) * 100);
}

export async function submitAppeal(actor: Actor, resultId: string, reason: string, ctx: ReqCtx) {
  if (reason.trim().length < 20) throw new AppError("VALIDATION", "Please explain your appeal in at least 20 characters.");
  const db = getDb();
  const [r] = await db.select({ studentId: s.students.id }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.results.id, resultId), eq(s.students.userId, actor.id), inArray(s.results.status, ["PUBLISHED", "LOCKED"])));
  if (!r) throw new AppError("NOT_FOUND", "Result not found.");
  const [dupe] = await db.select({ id: s.academicAppeals.id }).from(s.academicAppeals).where(and(eq(s.academicAppeals.resultId, resultId), inArray(s.academicAppeals.status, ["SUBMITTED", "UNDER_REVIEW"])));
  if (dupe) throw new AppError("CONFLICT", "You already have an open appeal for this result.");
  const [a] = await db.insert(s.academicAppeals).values({ resultId, studentId: r.studentId, reason }).returning({ id: s.academicAppeals.id });
  await audit({ actor, action: "appeal.submitted", entityType: "result", entityId: resultId }, ctx);
  return a.id;
}
