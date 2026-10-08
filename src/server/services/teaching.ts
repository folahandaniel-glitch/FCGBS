import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { assertCanTeach } from "./academics";

/** Offerings the actor may work on: all for teaching.any, otherwise those they lead or assist. */
export async function myOfferings(actor: Actor, termId?: string) {
  const db = getDb();
  const base = db
    .select({ id: s.offerings.id, code: s.courses.code, title: s.courses.title, term: s.academicTerms.name, termId: s.offerings.termId, students: sql<number>`(select count(*)::int from course_registrations r where r.offering_id = ${s.offerings.id} and r.status <> 'DROPPED')`, pendingGrading: sql<number>`(select count(*)::int from submissions sb join assessments a on a.id = sb.assessment_id where a.offering_id = ${s.offerings.id} and sb.status = 'SUBMITTED')` })
    .from(s.offerings)
    .innerJoin(s.courses, eq(s.courses.id, s.offerings.courseId))
    .innerJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId));
  const rows = can(actor, "teaching.any")
    ? await base.orderBy(desc(s.academicTerms.startsOn), asc(s.courses.code)).limit(100)
    : await base.where(sql`${s.offerings.lecturerId} = ${actor.id} or exists (select 1 from offering_staff os where os.offering_id = ${s.offerings.id} and os.user_id = ${actor.id})`).orderBy(desc(s.academicTerms.startsOn), asc(s.courses.code));
  return termId ? rows.filter((r) => r.termId === termId) : rows;
}

export async function offeringRoster(actor: Actor, offeringId: string) {
  await assertCanTeach(actor, offeringId);
  return getDb()
    .select({ regId: s.courseRegistrations.id, studentId: s.students.id, number: s.students.studentNumber, first: s.users.firstName, last: s.users.lastName, status: s.courseRegistrations.status })
    .from(s.courseRegistrations)
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .innerJoin(s.users, eq(s.users.id, s.students.userId))
    .where(and(eq(s.courseRegistrations.offeringId, offeringId), ne(s.courseRegistrations.status, "DROPPED")))
    .orderBy(asc(s.users.lastName));
}

export async function takeAttendance(actor: Actor, offeringId: string, heldOn: string, kind: string, topic: string, marks: Record<string, string>, ctx: ReqCtx) {
  await assertCanTeach(actor, offeringId);
  const valid = new Set(["PRESENT", "ABSENT", "EXCUSED", "LATE"]);
  const roster = await offeringRoster(actor, offeringId);
  const ids = new Set(roster.map((r) => r.regId));
  const db = getDb();
  await db.transaction(async (tx) => {
    const [sess] = await tx.insert(s.attendanceSessions).values({ offeringId, heldOn, kind, topic: topic || null, takenBy: actor.id }).returning({ id: s.attendanceSessions.id });
    const rows = Object.entries(marks).filter(([k, v]) => ids.has(k) && valid.has(v)).map(([registrationId, status]) => ({ sessionId: sess.id, registrationId, status }));
    if (rows.length) await tx.insert(s.attendanceRecords).values(rows);
    await audit({ actor, action: "attendance.taken", entityType: "offering", entityId: offeringId, metadata: { heldOn, count: rows.length } }, ctx, tx);
  });
}

export async function addQuestion(actor: Actor, courseId: string, input: { type: "MCQ" | "TRUE_FALSE" | "SHORT" | "ESSAY"; stem: string; options: string[]; answer: string; marks: number }, ctx: ReqCtx) {
  if (!can(actor, "questions.manage") && !can(actor, "questions.approve")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const db = getDb();
  if (!can(actor, "teaching.any")) {
    const [o] = await db.select({ id: s.offerings.id }).from(s.offerings).where(and(eq(s.offerings.courseId, courseId), eq(s.offerings.lecturerId, actor.id))).limit(1);
    if (!o) throw new AppError("FORBIDDEN", "You are not assigned to this course.");
  }
  if (input.stem.trim().length < 8) throw new AppError("VALIDATION", "Write the question.");
  let options: Record<string, string>[] = [];
  let answer: unknown = null;
  if (input.type === "MCQ") {
    const opts = input.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) throw new AppError("VALIDATION", "Provide at least two options.");
    options = opts.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
    const idx = Number(input.answer);
    if (!(idx >= 1 && idx <= opts.length)) throw new AppError("VALIDATION", "Mark which option is correct.");
    answer = String.fromCharCode(96 + idx);
  } else if (input.type === "TRUE_FALSE") {
    options = [{ id: "true", text: "True" }, { id: "false", text: "False" }];
    if (!["true", "false"].includes(input.answer)) throw new AppError("VALIDATION", "Mark the correct answer.");
    answer = input.answer;
  } else if (input.type === "SHORT") {
    answer = input.answer.split("|").map((x) => x.trim()).filter(Boolean);
    if (!(answer as string[]).length) throw new AppError("VALIDATION", "Provide at least one accepted answer (separate alternatives with |).");
  } else answer = input.answer; // ESSAY: marking guide
  const [q] = await db.insert(s.questions).values({ courseId, type: input.type, stem: input.stem.trim(), options, answer, marks: input.marks || 1, status: can(actor, "questions.approve") ? "APPROVED" : "PENDING", authorId: actor.id, reviewedBy: can(actor, "questions.approve") ? actor.id : null }).returning({ id: s.questions.id });
  await audit({ actor, action: "question.created", entityType: "question", entityId: q.id }, ctx);
  return q.id;
}

export async function reviewQuestion(actor: Actor, questionId: string, approve: boolean, ctx: ReqCtx) {
  if (!can(actor, "questions.approve")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const [q] = await getDb().select().from(s.questions).where(eq(s.questions.id, questionId));
  if (!q) throw new AppError("NOT_FOUND", "Question not found.");
  if (q.authorId === actor.id && !can(actor, "teaching.any")) throw new AppError("RULE_VIOLATION", "Questions must be approved by someone other than the author.");
  await getDb().update(s.questions).set({ status: approve ? "APPROVED" : "ARCHIVED", reviewedBy: actor.id }).where(eq(s.questions.id, questionId));
  await audit({ actor, action: approve ? "question.approved" : "question.rejected", entityType: "question", entityId: questionId }, ctx);
}

export async function submissionsFor(actor: Actor, assessmentId: string) {
  const [a] = await getDb().select().from(s.assessments).where(eq(s.assessments.id, assessmentId));
  if (!a) throw new AppError("NOT_FOUND", "Assessment not found.");
  await assertCanTeach(actor, a.offeringId);
  const subs = await getDb()
    .select({ id: s.submissions.id, text: s.submissions.text, assetId: s.submissions.assetId, aiUsed: s.submissions.aiUsed, aiDisclosure: s.submissions.aiDisclosure, late: s.submissions.isLate, status: s.submissions.status, score: s.submissions.score, feedback: s.submissions.feedback, first: s.users.firstName, last: s.users.lastName, number: s.students.studentNumber })
    .from(s.submissions)
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.submissions.registrationId))
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .innerJoin(s.users, eq(s.users.id, s.students.userId))
    .where(eq(s.submissions.assessmentId, assessmentId));
  const attempts = await getDb()
    .select({ id: s.examAttempts.id, status: s.examAttempts.status, finalScore: s.examAttempts.finalScore, autoScore: s.examAttempts.autoScore, events: s.examAttempts.events, snapshot: s.examAttempts.snapshot, answers: s.examAttempts.answers, first: s.users.firstName, last: s.users.lastName, number: s.students.studentNumber })
    .from(s.examAttempts)
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.examAttempts.registrationId))
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .innerJoin(s.users, eq(s.users.id, s.students.userId))
    .where(and(eq(s.examAttempts.assessmentId, assessmentId), inArray(s.examAttempts.status, ["SUBMITTED", "GRADED"])));
  return { assessment: a, subs, attempts };
}
