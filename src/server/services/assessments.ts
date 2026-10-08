import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, securityEvent, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { rateLimit } from "../rate-limit";
import { assertCanTeach } from "./academics";
import { notifyUser } from "./notifications";

type Kind = "ASSIGNMENT" | "TEST" | "QUIZ" | "EXAM" | "PRACTICAL";

/* ====================================================== lecturer: build assessments */

export async function saveAssessment(actor: Actor, raw: { id?: string; offeringId: string; kind: Kind; title: string; instructions?: string; maxScore?: number; opensAt?: Date | null; dueAt?: Date | null; closesAt?: Date | null; timeLimitMin?: number | null; maxAttempts?: number; drawCount?: number; lateAllowed?: boolean; latePenaltyPct?: number; resubmission?: boolean; aiPolicy?: string }, ctx: ReqCtx) {
  await assertCanTeach(actor, raw.offeringId);
  if (!raw.title.trim()) throw new AppError("VALIDATION", "Enter a title.");
  const db = getDb();
  const values = { offeringId: raw.offeringId, kind: raw.kind, title: raw.title.trim(), instructions: raw.instructions, maxScore: raw.maxScore ?? 100, opensAt: raw.opensAt ?? null, dueAt: raw.dueAt ?? null, closesAt: raw.closesAt ?? raw.dueAt ?? null, timeLimitMin: raw.timeLimitMin ?? null, maxAttempts: Math.max(1, raw.maxAttempts ?? 1), pool: raw.drawCount ? { drawCount: raw.drawCount } : {}, lateAllowed: raw.lateAllowed ?? false, latePenaltyPct: raw.latePenaltyPct ?? 10, resubmission: raw.resubmission ?? false, aiPolicy: raw.aiPolicy ?? "DISCLOSE" };
  if (raw.id) {
    const [cur] = await db.select().from(s.assessments).where(eq(s.assessments.id, raw.id));
    if (!cur || cur.offeringId !== raw.offeringId) throw new AppError("NOT_FOUND", "Assessment not found.");
    if (cur.status !== "DRAFT") throw new AppError("RULE_VIOLATION", "Only draft assessments can be edited.");
    await db.update(s.assessments).set(values).where(eq(s.assessments.id, raw.id));
    await audit({ actor, action: "assessment.updated", entityType: "assessment", entityId: raw.id }, ctx);
    return raw.id;
  }
  const [a] = await db.insert(s.assessments).values({ ...values, createdBy: actor.id }).returning({ id: s.assessments.id });
  await audit({ actor, action: "assessment.created", entityType: "assessment", entityId: a.id, summary: values.title }, ctx);
  return a.id;
}

export async function publishAssessment(actor: Actor, assessmentId: string, ctx: ReqCtx) {
  const db = getDb();
  const [a] = await db.select().from(s.assessments).where(eq(s.assessments.id, assessmentId));
  if (!a) throw new AppError("NOT_FOUND", "Assessment not found.");
  const off = await assertCanTeach(actor, a.offeringId);
  if (["EXAM", "TEST", "QUIZ"].includes(a.kind)) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.questions).where(and(eq(s.questions.courseId, off.courseId), eq(s.questions.status, "APPROVED")));
    if (n === 0) throw new AppError("RULE_VIOLATION", "This course has no approved questions yet. Add and approve questions first.");
    if (a.pool.drawCount && a.pool.drawCount > n) throw new AppError("RULE_VIOLATION", `Only ${n} approved questions are available; reduce the number drawn.`);
  }
  await db.update(s.assessments).set({ status: "PUBLISHED" }).where(eq(s.assessments.id, a.id));
  await audit({ actor, action: "assessment.published", entityType: "assessment", entityId: a.id, summary: a.title }, ctx);
  const regs = await db.select({ userId: s.students.userId }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.courseRegistrations.offeringId, a.offeringId), ne(s.courseRegistrations.status, "DROPPED")));
  for (const r of regs) await notifyUser({ userId: r.userId, category: a.kind === "EXAM" ? "EXAMINATION" : "ASSIGNMENT", title: `New ${a.kind.toLowerCase()}: ${a.title}`, link: `/student/assessments/${a.id}` });
}

/* ====================================================== learner: assignments */

async function learnerRegistration(userId: string, assessmentId: string) {
  const [row] = await getDb()
    .select({ a: s.assessments, reg: s.courseRegistrations })
    .from(s.assessments)
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.offeringId, s.assessments.offeringId))
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .where(and(eq(s.assessments.id, assessmentId), eq(s.students.userId, userId), ne(s.courseRegistrations.status, "DROPPED")));
  if (!row) throw new AppError("NOT_FOUND", "Assessment not found.");
  if (row.a.status !== "PUBLISHED") throw new AppError("RULE_VIOLATION", "This assessment is not open.");
  return row;
}

export async function submitAssignment(actor: Actor, assessmentId: string, input: { text?: string; assetId?: string; aiUsed?: boolean; aiDisclosure?: string }, ctx: ReqCtx) {
  const { a, reg } = await learnerRegistration(actor.id, assessmentId);
  const now = new Date();
  if (a.opensAt && now < a.opensAt) throw new AppError("RULE_VIOLATION", "This assignment has not opened yet.");
  const late = Boolean(a.dueAt && now > a.dueAt);
  if (late && !a.lateAllowed) throw new AppError("RULE_VIOLATION", "The deadline has passed and late submissions are not accepted.");
  if (a.closesAt && now > a.closesAt && !a.lateAllowed) throw new AppError("RULE_VIOLATION", "This assignment is closed.");
  if (!input.text?.trim() && !input.assetId) throw new AppError("VALIDATION", "Write your answer or attach a file.");
  if (a.aiPolicy === "PROHIBITED" && input.aiUsed) throw new AppError("RULE_VIOLATION", "AI use is not permitted for this assignment.");
  if (a.aiPolicy === "DISCLOSE" && input.aiUsed && (input.aiDisclosure?.trim().length ?? 0) < 10) throw new AppError("VALIDATION", "Please describe how you used AI (at least a sentence).", { aiDisclosure: ["Describe how you used AI."] });
  const db = getDb();
  const [cur] = await db.select().from(s.submissions).where(and(eq(s.submissions.assessmentId, a.id), eq(s.submissions.registrationId, reg.id)));
  if (cur) {
    if (!a.resubmission) throw new AppError("RULE_VIOLATION", "You have already submitted this assignment.");
    if (cur.status === "GRADED") throw new AppError("RULE_VIOLATION", "This submission has already been graded.");
    await db.update(s.submissions).set({ text: input.text, assetId: input.assetId ?? cur.assetId, aiUsed: input.aiUsed ?? false, aiDisclosure: input.aiDisclosure, submittedAt: now, isLate: late, revision: cur.revision + 1 }).where(eq(s.submissions.id, cur.id));
    await audit({ actor, action: "assignment.resubmitted", entityType: "submission", entityId: cur.id }, ctx);
    return cur.id;
  }
  const [r] = await db.insert(s.submissions).values({ assessmentId: a.id, registrationId: reg.id, text: input.text, assetId: input.assetId, aiUsed: input.aiUsed ?? false, aiDisclosure: input.aiDisclosure, isLate: late }).returning({ id: s.submissions.id });
  await audit({ actor, action: "assignment.submitted", entityType: "submission", entityId: r.id, metadata: { late } }, ctx);
  return r.id;
}

export async function gradeSubmission(actor: Actor, submissionId: string, score: number, feedback: string, ctx: ReqCtx) {
  const db = getDb();
  const [row] = await db.select({ sub: s.submissions, a: s.assessments }).from(s.submissions).innerJoin(s.assessments, eq(s.assessments.id, s.submissions.assessmentId)).where(eq(s.submissions.id, submissionId));
  if (!row) throw new AppError("NOT_FOUND", "Submission not found.");
  await assertCanTeach(actor, row.a.offeringId);
  if (score < 0 || score > row.a.maxScore) throw new AppError("VALIDATION", `Score must be between 0 and ${row.a.maxScore}.`);
  await db.update(s.submissions).set({ score, feedback, status: "GRADED", gradedBy: actor.id, gradedAt: new Date() }).where(eq(s.submissions.id, submissionId));
  await audit({ actor, action: "assignment.graded", entityType: "submission", entityId: submissionId, metadata: { before: row.sub.score, after: score } }, ctx);
  const [u] = await db.select({ userId: s.students.userId }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.courseRegistrations.id, row.sub.registrationId));
  if (u) await notifyUser({ userId: u.userId, category: "ASSIGNMENT", title: `Feedback on ${row.a.title}`, link: `/student/assessments/${row.a.id}` });
}

/* ====================================================== learner: examinations */

const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Starts (or resumes) an attempt. Questions are drawn at random from the approved bank, options shuffled, and frozen in a snapshot. */
export async function startAttempt(actor: Actor, assessmentId: string, ctx: ReqCtx) {
  const { a, reg } = await learnerRegistration(actor.id, assessmentId);
  if (!["EXAM", "TEST", "QUIZ"].includes(a.kind)) throw new AppError("RULE_VIOLATION", "This is not an online examination.");
  const db = getDb();
  const now = new Date();
  if (a.opensAt && now < a.opensAt) throw new AppError("RULE_VIOLATION", "This examination has not opened yet.");
  if (a.closesAt && now > a.closesAt) throw new AppError("RULE_VIOLATION", "This examination has closed.");
  const prior = await db.select().from(s.examAttempts).where(and(eq(s.examAttempts.assessmentId, a.id), eq(s.examAttempts.registrationId, reg.id)));
  const live = prior.find((p) => p.status === "IN_PROGRESS");
  if (live) {
    if (live.deadlineAt > now) return live.id;
    await closeAttempt(live.id, "AUTO", ctx); // lapsed: auto-submit, then fall through to a possible new attempt
  }
  if (prior.filter((p) => p.status !== "IN_PROGRESS" || p.id === live?.id).length >= a.maxAttempts) throw new AppError("RULE_VIOLATION", "You have used all your attempts for this assessment.");
  const [off] = await db.select({ courseId: s.offerings.courseId }).from(s.offerings).where(eq(s.offerings.id, a.offeringId));
  const bank = await db.select().from(s.questions).where(and(eq(s.questions.courseId, off.courseId), eq(s.questions.status, "APPROVED"), a.pool.questionIds?.length ? inArray(s.questions.id, a.pool.questionIds) : undefined));
  if (!bank.length) throw new AppError("RULE_VIOLATION", "This examination has no questions yet.");
  const chosen = (a.shuffle ? shuffle(bank) : bank).slice(0, a.pool.drawCount ?? bank.length);
  const snapshot = chosen.map((q) => ({ id: q.id, type: q.type as string, stem: q.stem, marks: q.marks, options: q.type === "MATCHING" ? shuffle(q.options) : q.type === "SHORT" || q.type === "ESSAY" ? [] : a.shuffle ? shuffle(q.options) : q.options }));
  let deadline = new Date(now.getTime() + (a.timeLimitMin ?? 60) * 60_000);
  if (a.closesAt && a.closesAt < deadline) deadline = a.closesAt;
  const [row] = await db.insert(s.examAttempts).values({ assessmentId: a.id, registrationId: reg.id, attemptNo: prior.length + 1, deadlineAt: deadline, snapshot, ip: ctx.ip ?? null }).returning({ id: s.examAttempts.id });
  await audit({ actor, action: "exam.started", entityType: "attempt", entityId: row.id, summary: a.title }, ctx);
  return row.id;
}

async function ownAttempt(userId: string, attemptId: string) {
  const [row] = await getDb()
    .select({ at: s.examAttempts, a: s.assessments })
    .from(s.examAttempts)
    .innerJoin(s.assessments, eq(s.assessments.id, s.examAttempts.assessmentId))
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.examAttempts.registrationId))
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .where(and(eq(s.examAttempts.id, attemptId), eq(s.students.userId, userId)));
  if (!row) throw new AppError("NOT_FOUND", "Attempt not found.");
  return row;
}

export async function getAttemptForTaking(actor: Actor, attemptId: string) {
  const { at, a } = await ownAttempt(actor.id, attemptId);
  return { attempt: at, assessment: a, remainingMs: Math.max(0, at.deadlineAt.getTime() - Date.now()) };
}

/** Autosave. The server clock decides: nothing is accepted after the deadline. */
export async function saveAnswers(actor: Actor, attemptId: string, answers: Record<string, unknown>, events: { t: string }[], ctx: ReqCtx) {
  await rateLimit("examSave", actor.id, ctx);
  const { at } = await ownAttempt(actor.id, attemptId);
  if (at.status !== "IN_PROGRESS") throw new AppError("RULE_VIOLATION", "This attempt has been submitted.");
  if (at.deadlineAt.getTime() + 5_000 < Date.now()) {
    await closeAttempt(at.id, "AUTO", ctx);
    throw new AppError("RULE_VIOLATION", "Time is up — your answers were submitted automatically.");
  }
  const allowed = new Set(at.snapshot.map((q) => q.id));
  const clean = Object.fromEntries(Object.entries(answers).filter(([k]) => allowed.has(k)));
  const ev = events.slice(0, 20).map((e) => ({ t: String(e.t).slice(0, 30), at: new Date().toISOString() }));
  await getDb().update(s.examAttempts).set({ answers: clean, events: [...at.events, ...ev].slice(-200) }).where(eq(s.examAttempts.id, at.id));
  if (ev.length) await securityEvent({ type: "SUSPICIOUS_EXAM_ACTIVITY", severity: "INFO", userId: actor.id, detail: { attempt: at.id, events: ev.map((e) => e.t) } }, ctx);
}

export async function submitAttempt(actor: Actor, attemptId: string, ctx: ReqCtx) {
  const { at } = await ownAttempt(actor.id, attemptId);
  if (at.status !== "IN_PROGRESS") return at.id;
  await closeAttempt(at.id, "STUDENT", ctx);
  return at.id;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Marks objective items server-side from the live key. Essays (and unmatched short answers) wait for the lecturer. */
export async function closeAttempt(attemptId: string, by: "STUDENT" | "AUTO", ctx: ReqCtx) {
  const db = getDb();
  const [row] = await db.select({ at: s.examAttempts, a: s.assessments }).from(s.examAttempts).innerJoin(s.assessments, eq(s.assessments.id, s.examAttempts.assessmentId)).where(eq(s.examAttempts.id, attemptId));
  if (!row || row.at.status !== "IN_PROGRESS") return;
  const qs = await db.select().from(s.questions).where(inArray(s.questions.id, row.at.snapshot.map((q) => q.id)));
  const key = new Map(qs.map((q) => [q.id, q]));
  let earned = 0;
  let total = 0;
  let pendingManual = false;
  for (const sn of row.at.snapshot) {
    total += sn.marks;
    const q = key.get(sn.id);
    const given = row.at.answers[sn.id];
    if (!q || given === undefined || given === null || given === "") continue;
    if (q.type === "MCQ" || q.type === "TRUE_FALSE") earned += norm(given) === norm(q.answer) ? sn.marks : 0;
    else if (q.type === "MULTI") {
      const a = (Array.isArray(q.answer) ? q.answer : []).map(norm).sort().join("|");
      const g = (Array.isArray(given) ? given : []).map(norm).sort().join("|");
      earned += a === g && a ? sn.marks : 0;
    } else if (q.type === "MATCHING") {
      const ans = (q.answer ?? {}) as Record<string, string>;
      const g = (given ?? {}) as Record<string, string>;
      const ids = Object.keys(ans);
      earned += ids.length ? (ids.filter((k) => norm(g[k]) === norm(ans[k])).length / ids.length) * sn.marks : 0;
    } else if (q.type === "SHORT") {
      const accepted = (Array.isArray(q.answer) ? q.answer : []).map(norm);
      if (accepted.includes(norm(given))) earned += sn.marks;
      else pendingManual = true;
    }
  }
  if (row.at.snapshot.some((sn) => sn.type === "ESSAY" && row.at.answers[sn.id])) pendingManual = true;
  const scaled = total ? Math.round(((earned / total) * row.a.maxScore) * 10) / 10 : 0;
  await db.update(s.examAttempts).set({ status: pendingManual ? "SUBMITTED" : "GRADED", submittedAt: new Date(), autoScore: scaled, finalScore: pendingManual ? null : scaled }).where(eq(s.examAttempts.id, attemptId));
  await audit({ action: by === "AUTO" ? "exam.auto_submitted" : "exam.submitted", entityType: "attempt", entityId: attemptId, metadata: { autoScore: scaled, pendingManual } }, ctx);
}

/** Lecturer awards marks for essay/short items (marks per question id); final score = auto marks + manual marks, scaled. */
export async function gradeAttemptManual(actor: Actor, attemptId: string, manual: Record<string, number>, ctx: ReqCtx) {
  const db = getDb();
  const [row] = await db.select({ at: s.examAttempts, a: s.assessments }).from(s.examAttempts).innerJoin(s.assessments, eq(s.assessments.id, s.examAttempts.assessmentId)).where(eq(s.examAttempts.id, attemptId));
  if (!row) throw new AppError("NOT_FOUND", "Attempt not found.");
  await assertCanTeach(actor, row.a.offeringId);
  if (row.at.status === "IN_PROGRESS") throw new AppError("RULE_VIOLATION", "The student is still writing.");
  const total = row.at.snapshot.reduce((a, q) => a + q.marks, 0);
  for (const [qid, m] of Object.entries(manual)) {
    const sn = row.at.snapshot.find((q) => q.id === qid);
    if (!sn) throw new AppError("VALIDATION", "Unknown question.");
    if (m < 0 || m > sn.marks) throw new AppError("VALIDATION", `Marks for a question must be between 0 and ${sn.marks}.`);
  }
  const manualTotal = Object.values({ ...row.at.manualScores, ...manual }).reduce((a, b) => a + b, 0);
  // autoScore is already scaled; recover raw auto marks, then add manual marks and re-scale.
  const autoRaw = total ? ((row.at.autoScore ?? 0) / row.a.maxScore) * total : 0;
  const finalScore = Math.round((Math.min(total, autoRaw + manualTotal) / total) * row.a.maxScore * 10) / 10;
  await db.update(s.examAttempts).set({ manualScores: { ...row.at.manualScores, ...manual }, finalScore, status: "GRADED", gradedBy: actor.id }).where(eq(s.examAttempts.id, attemptId));
  await audit({ actor, action: "exam.graded_manual", entityType: "attempt", entityId: attemptId, metadata: { before: row.at.finalScore, after: finalScore } }, ctx);
}
