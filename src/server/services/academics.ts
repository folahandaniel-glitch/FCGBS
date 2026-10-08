import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { applyRepeatPolicy, classificationFor, courseTotal, creditsEarned, gpa, gradeFor, standingFor, type CourseRecord } from "@/core/grading";
import { getDb, type Executor } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { getSetting } from "../settings";
import { notifyUser } from "./notifications";

/* ============================================================ scoping helpers */

/** Lecturer scope: staff with `teaching.any` act on every course; with `teaching.own` only on offerings assigned to them. */
export async function assertCanTeach(actor: Actor, offeringId: string, db: Executor = getDb()) {
  const [o] = await db.select().from(s.offerings).where(eq(s.offerings.id, offeringId));
  if (!o) throw new AppError("NOT_FOUND", "Course offering not found.");
  if (can(actor, "teaching.any")) return o;
  if (!can(actor, "teaching.own")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (o.lecturerId === actor.id) return o;
  const [asst] = await db.select().from(s.offeringStaff).where(and(eq(s.offeringStaff.offeringId, offeringId), eq(s.offeringStaff.userId, actor.id)));
  if (!asst) throw new AppError("FORBIDDEN", "You are not assigned to this course.");
  return o;
}

export async function studentForUser(userId: string) {
  const [st] = await getDb().select().from(s.students).where(eq(s.students.userId, userId));
  return st ?? null;
}

async function ownRegistration(userId: string, registrationId: string) {
  const [r] = await getDb()
    .select({ reg: s.courseRegistrations, studentId: s.students.id })
    .from(s.courseRegistrations)
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .where(and(eq(s.courseRegistrations.id, registrationId), eq(s.students.userId, userId)));
  if (!r) throw new AppError("NOT_FOUND", "Registration not found.");
  return r.reg;
}

/* ============================================================ records, GPA, standing */

export interface RecordRow extends CourseRecord {
  order: number;
  code: string;
  title: string;
  termId: string | null;
  termName: string | null;
  total: number | null;
  status: string;
}

/** Everything an official record needs for one enrolment — published/locked results only, plus approved exemptions/transfers. */
export async function enrolmentRecords(enrolmentId: string, db: Executor = getDb()): Promise<RecordRow[]> {
  const cfg = await getSetting("academic", db);
  const rows = await db
    .select({ reg: s.courseRegistrations, course: s.courses, result: s.results, term: s.academicTerms, termStart: s.academicTerms.startsOn })
    .from(s.courseRegistrations)
    .innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId))
    .leftJoin(s.results, eq(s.results.registrationId, s.courseRegistrations.id))
    .leftJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId))
    .leftJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId))
    .where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.status, "DROPPED")))
    .orderBy(asc(s.academicTerms.startsOn), asc(s.courseRegistrations.createdAt));
  const out: RecordRow[] = [];
  rows.forEach((r, i) => {
    const base = { order: i, code: r.course.code, title: r.course.title, courseId: r.course.id, termId: r.term?.id ?? null, termName: r.term?.name ?? null };
    if (r.reg.source !== "REGISTERED") {
      out.push({ ...base, credits: r.course.credits, point: 0, grade: r.reg.source === "TRANSFER" ? "TR" : "EX", passed: true, graded: false, total: null, status: r.reg.source });
    } else if (r.result && ["PUBLISHED", "LOCKED"].includes(r.result.status) && r.result.grade) {
      out.push({ ...base, credits: r.result.credits || r.course.credits, point: r.result.gradePoint ?? 0, grade: r.result.grade, passed: Boolean(r.result.passed), graded: true, total: r.result.total, status: r.result.status });
    }
  });
  const counted = applyRepeatPolicy(out.filter((r) => r.graded), cfg.repeatPolicy);
  return [...out.filter((r) => !r.graded), ...counted].sort((a, b) => a.order - b.order);
}

export async function enrolmentSummary(enrolmentId: string, db: Executor = getDb()) {
  const cfg = await getSetting("academic", db);
  const records = await enrolmentRecords(enrolmentId, db);
  const overall = gpa(records);
  const byTerm = new Map<string, { name: string; recs: RecordRow[] }>();
  for (const r of records) {
    const k = r.termId ?? "none";
    if (!byTerm.has(k)) byTerm.set(k, { name: r.termName ?? "Transfer / exemption", recs: [] });
    byTerm.get(k)!.recs.push(r);
  }
  const terms = [...byTerm.values()].map((t) => ({ name: t.name, records: t.recs, gpa: gpa(t.recs).gpa, credits: creditsEarned(t.recs) }));
  const standing = standingFor(overall.gpa, overall.credits, cfg.standing);
  return { records, terms, cgpa: overall.gpa, gradedCredits: overall.credits, creditsEarned: creditsEarned(records), standing, classification: overall.credits ? classificationFor(overall.gpa, cfg.classification) : null };
}

/** Re-derives and stores academic standing after results change. Standing changes are audited and notified. */
export async function refreshStanding(enrolmentId: string, ctx: ReqCtx = {}, db: Executor = getDb()) {
  const [e] = await db.select({ e: s.enrolments, st: s.students }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.enrolments.id, enrolmentId));
  if (!e || ["GRADUATING", "GRADUATED", "WITHDRAWN"].includes(e.e.standing)) return;
  const sum = await enrolmentSummary(enrolmentId, db);
  if (sum.standing === e.e.standing) return;
  await db.update(s.enrolments).set({ standing: sum.standing }).where(eq(s.enrolments.id, enrolmentId));
  await db.update(s.students).set({ standing: sum.standing }).where(eq(s.students.id, e.st.id));
  await audit({ action: "academic.standing_changed", entityType: "enrolment", entityId: enrolmentId, metadata: { from: e.e.standing, to: sum.standing, cgpa: sum.cgpa } }, ctx, db);
  if (sum.standing !== "GOOD_STANDING") await notifyUser({ userId: e.st.userId, category: "ACADEMIC_WARNING", title: `Academic standing: ${sum.standing.replace(/_/g, " ").toLowerCase()}`, body: `Your cumulative GPA is ${sum.cgpa.toFixed(2)}. Please speak with your advisor.`, link: "/student/results", email: true }, db);
}

/* ============================================================ course registration */

export async function registerForOfferings(actor: Actor, enrolmentId: string, offeringIds: string[], ctx: ReqCtx, opts: { onBehalf?: boolean } = {}) {
  if (!offeringIds.length) throw new AppError("VALIDATION", "Select at least one course.");
  const db = getDb();
  const cfg = await getSetting("academic");
  return db.transaction(async (tx) => {
    const [en] = await tx.select({ e: s.enrolments, st: s.students }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.enrolments.id, enrolmentId)).for("update");
    if (!en) throw new AppError("NOT_FOUND", "Enrolment not found.");
    if (!opts.onBehalf && en.st.userId !== actor.id) throw new AppError("FORBIDDEN", "You can only register for your own courses.");
    if (en.e.status !== "ACTIVE" || ["SUSPENDED", "WITHDRAWN"].includes(en.st.status)) throw new AppError("RULE_VIOLATION", "This enrolment is not active.");
    const offs = await tx.select({ o: s.offerings, c: s.courses, t: s.academicTerms }).from(s.offerings).innerJoin(s.courses, eq(s.courses.id, s.offerings.courseId)).innerJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId)).where(inArray(s.offerings.id, offeringIds));
    if (offs.length !== offeringIds.length) throw new AppError("NOT_FOUND", "A selected course is not available.");
    const today = new Date().toISOString().slice(0, 10);
    const records = await enrolmentRecords(enrolmentId, tx);
    const passed = new Set(records.filter((r) => r.passed).map((r) => r.courseId));
    const existing = await tx.select({ courseId: s.courseRegistrations.courseId, offeringId: s.courseRegistrations.offeringId, credits: s.courses.credits, termId: s.offerings.termId, status: s.courseRegistrations.status }).from(s.courseRegistrations).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).leftJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId)).where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.status, "DROPPED")));
    const termCredits = new Map<string, number>();
    for (const e of existing) if (e.termId) termCredits.set(e.termId, (termCredits.get(e.termId) ?? 0) + e.credits);
    const created: string[] = [];
    for (const { o, c, t } of offs) {
      if (o.status !== "OPEN") throw new AppError("RULE_VIOLATION", `${c.code} is closed for registration.`);
      if (!opts.onBehalf && ((t.registrationOpens && today < t.registrationOpens) || (t.registrationCloses && today > t.registrationCloses))) throw new AppError("RULE_VIOLATION", `Registration for ${t.name} is not open.`);
      if (existing.some((e) => e.offeringId === o.id)) throw new AppError("CONFLICT", `You are already registered for ${c.code}.`);
      // Programme membership: only courses in the student's programme (core or elective) unless the Registrar registers it.
      if (!opts.onBehalf) {
        const [inProg] = await tx.select({ c: s.programmeCourses.courseId }).from(s.programmeCourses).where(and(eq(s.programmeCourses.programmeId, en.e.programmeId), eq(s.programmeCourses.courseId, c.id)));
        if (!inProg) throw new AppError("RULE_VIOLATION", `${c.code} is not part of your programme.`);
      }
      const isRepeat = passed.has(c.id) ? (() => { throw new AppError("RULE_VIOLATION", `You have already passed ${c.code}.`); })() : records.some((r) => r.courseId === c.id && r.graded);
      if (isRepeat) {
        const attempts = records.filter((r) => r.courseId === c.id).length;
        if (attempts > cfg.maxRepeatsPerCourse) throw new AppError("RULE_VIOLATION", `The maximum number of repeats for ${c.code} has been reached.`);
      }
      const prereq = await tx.select({ id: s.courseRelations.relatedCourseId, kind: s.courseRelations.kind }).from(s.courseRelations).where(eq(s.courseRelations.courseId, c.id));
      for (const p of prereq) {
        if (p.kind === "PREREQUISITE" && !passed.has(p.id)) {
          const [pc] = await tx.select({ code: s.courses.code }).from(s.courses).where(eq(s.courses.id, p.id));
          throw new AppError("RULE_VIOLATION", `${c.code} requires ${pc?.code ?? "a prerequisite"} to be passed first.`);
        }
        if (p.kind === "COREQUISITE" && !offs.some((x) => x.c.id === p.id) && !existing.some((e) => e.courseId === p.id) && !passed.has(p.id)) throw new AppError("RULE_VIOLATION", `${c.code} must be taken together with its co-requisite.`);
      }
      if (o.capacity) {
        const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.courseRegistrations).where(and(eq(s.courseRegistrations.offeringId, o.id), ne(s.courseRegistrations.status, "DROPPED")));
        if (n >= o.capacity) throw new AppError("RULE_VIOLATION", `${c.code} is full.`);
      }
      const total = (termCredits.get(t.id) ?? 0) + c.credits;
      if (total > cfg.maxCreditsPerSemester && !opts.onBehalf) throw new AppError("RULE_VIOLATION", `This would exceed the maximum of ${cfg.maxCreditsPerSemester} credits for ${t.name}.`);
      termCredits.set(t.id, total);
      const [r] = await tx.insert(s.courseRegistrations).values({ enrolmentId, offeringId: o.id, courseId: c.id, status: "APPROVED", isRepeat: Boolean(isRepeat), approvedBy: opts.onBehalf ? actor.id : null }).returning({ id: s.courseRegistrations.id });
      created.push(r.id);
    }
    await audit({ actor, action: "registration.created", entityType: "enrolment", entityId: enrolmentId, metadata: { offeringIds, onBehalf: Boolean(opts.onBehalf) } }, ctx, tx);
    return created;
  });
}

export async function dropRegistration(actor: Actor, registrationId: string, ctx: ReqCtx, opts: { onBehalf?: boolean } = {}) {
  const reg = opts.onBehalf ? (await getDb().select().from(s.courseRegistrations).where(eq(s.courseRegistrations.id, registrationId)))[0] : await ownRegistration(actor.id, registrationId);
  if (!reg) throw new AppError("NOT_FOUND", "Registration not found.");
  const [res] = await getDb().select({ status: s.results.status }).from(s.results).where(eq(s.results.registrationId, reg.id));
  if (res && res.status !== "DRAFT") throw new AppError("RULE_VIOLATION", "A course with submitted results cannot be dropped.");
  await getDb().update(s.courseRegistrations).set({ status: "DROPPED" }).where(eq(s.courseRegistrations.id, reg.id));
  await audit({ actor, action: "registration.dropped", entityType: "registration", entityId: reg.id }, ctx);
}

/** Registrar-approved exemption or transfer credit; capped by policy (spec §16). No grade point is created. */
export async function grantCredit(actor: Actor, enrolmentId: string, courseId: string, source: "EXEMPTION" | "TRANSFER", note: string, ctx: ReqCtx) {
  if (note.trim().length < 3) throw new AppError("VALIDATION", "Record the basis for this credit (institution, certificate, approval).");
  const cfg = await getSetting("academic");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [en] = await tx.select({ min: s.programmes.minCredits }).from(s.enrolments).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).where(eq(s.enrolments.id, enrolmentId));
    if (!en) throw new AppError("NOT_FOUND", "Enrolment not found.");
    const [c] = await tx.select().from(s.courses).where(eq(s.courses.id, courseId));
    const given = await tx.select({ credits: s.courses.credits }).from(s.courseRegistrations).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.source, "REGISTERED")));
    const total = given.reduce((a, g) => a + g.credits, 0) + (c?.credits ?? 0);
    if (en.min && total > (en.min * cfg.transferCreditsMaxPct) / 100) throw new AppError("RULE_VIOLATION", `Transfer and exemption credit cannot exceed ${cfg.transferCreditsMaxPct}% of the programme.`);
    const [r] = await tx.insert(s.courseRegistrations).values({ enrolmentId, courseId, offeringId: null, status: "COMPLETED", source, approvedBy: actor.id, note }).returning({ id: s.courseRegistrations.id });
    await audit({ actor, action: `registration.${source.toLowerCase()}`, entityType: "enrolment", entityId: enrolmentId, metadata: { courseId, note, approver: actor.id } }, ctx, tx);
    return r.id;
  });
}

/* ============================================================ result workflow */

type ResultAction = "SUBMIT" | "REVIEW" | "APPROVE" | "PUBLISH" | "LOCK";
const FLOW: Record<ResultAction, { from: string; to: "SUBMITTED" | "REVIEWED" | "APPROVED" | "PUBLISHED" | "LOCKED" }> = {
  SUBMIT: { from: "DRAFT", to: "SUBMITTED" },
  REVIEW: { from: "SUBMITTED", to: "REVIEWED" },
  APPROVE: { from: "REVIEWED", to: "APPROVED" },
  PUBLISH: { from: "APPROVED", to: "PUBLISHED" },
  LOCK: { from: "PUBLISHED", to: "LOCKED" },
};

/** Calculates (or re-calculates) DRAFT results for every registration in an offering from graded assessments. Server-side only. */
export async function computeOfferingResults(actor: Actor, offeringId: string, ctx: ReqCtx) {
  const db = getDb();
  const off = await assertCanTeach(actor, offeringId);
  const cfg = await getSetting("academic");
  const [course] = await db.select().from(s.courses).where(eq(s.courses.id, off.courseId));
  const weights = course.assessmentWeights ?? cfg.defaultWeights;
  const asses = await db.select().from(s.assessments).where(and(eq(s.assessments.offeringId, offeringId), inArray(s.assessments.status, ["PUBLISHED", "CLOSED"])));
  const regs = await db.select().from(s.courseRegistrations).where(and(eq(s.courseRegistrations.offeringId, offeringId), ne(s.courseRegistrations.status, "DROPPED"), eq(s.courseRegistrations.source, "REGISTERED")));
  const subs = asses.length ? await db.select().from(s.submissions).where(inArray(s.submissions.assessmentId, asses.map((a) => a.id))) : [];
  const atts = asses.length ? await db.select().from(s.examAttempts).where(inArray(s.examAttempts.assessmentId, asses.map((a) => a.id))) : [];
  const kindKey = (k: string) => (k === "ASSIGNMENT" ? "assignment" : k === "TEST" || k === "QUIZ" ? "test" : k === "EXAM" ? "exam" : "practical") as "assignment" | "test" | "exam" | "practical";
  let count = 0;
  for (const reg of regs) {
    const [cur] = await db.select().from(s.results).where(eq(s.results.registrationId, reg.id));
    if (cur && cur.status !== "DRAFT") continue; // never recalculated once submitted
    const parts: Record<"assignment" | "test" | "exam" | "practical", number[]> = { assignment: [], test: [], exam: [], practical: [] };
    for (const a of asses) {
      let score: number | null = null;
      if (a.kind === "EXAM" || a.kind === "TEST" || a.kind === "QUIZ") {
        const best = atts.filter((x) => x.assessmentId === a.id && x.registrationId === reg.id && x.finalScore !== null).sort((x, y) => (y.finalScore ?? 0) - (x.finalScore ?? 0))[0];
        score = best?.finalScore ?? null;
        if (score === null) { const sub = subs.find((x) => x.assessmentId === a.id && x.registrationId === reg.id && x.score !== null); score = sub?.score ?? null; }
      } else {
        const sub = subs.find((x) => x.assessmentId === a.id && x.registrationId === reg.id);
        score = sub?.score ?? null;
        if (sub && score !== null && sub.isLate && a.latePenaltyPct) score = Math.max(0, score * (1 - a.latePenaltyPct / 100));
      }
      parts[kindKey(a.kind)].push(a.maxScore ? Math.min(100, ((score ?? 0) / a.maxScore) * 100) : 0);
    }
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
    const components = { assignment: avg(parts.assignment), test: avg(parts.test), exam: avg(parts.exam), practical: avg(parts.practical) };
    const total = courseTotal(components, weights);
    const band = gradeFor(total, cfg.gradingScale);
    const values = { components, total, grade: band.grade, gradePoint: band.point, credits: course.credits, passed: band.point >= cfg.passPoint, updatedAt: new Date() };
    if (cur) await db.update(s.results).set(values).where(eq(s.results.id, cur.id));
    else await db.insert(s.results).values({ registrationId: reg.id, ...values });
    count++;
  }
  await audit({ actor, action: "results.computed", entityType: "offering", entityId: offeringId, metadata: { count } }, ctx);
  return count;
}

/** Manual adjustment of a DRAFT result by the lecturer (e.g. practical score). The server still derives grade and points. */
export async function setDraftComponents(actor: Actor, resultId: string, comps: Partial<{ assignment: number | null; test: number | null; exam: number | null; practical: number | null }>, ctx: ReqCtx) {
  const db = getDb();
  const cfg = await getSetting("academic");
  const [r] = await db.select({ r: s.results, off: s.courseRegistrations.offeringId, course: s.courses }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).where(eq(s.results.id, resultId));
  if (!r || !r.off) throw new AppError("NOT_FOUND", "Result not found.");
  await assertCanTeach(actor, r.off);
  if (r.r.status !== "DRAFT") throw new AppError("RULE_VIOLATION", "Only draft results can be edited.");
  for (const v of Object.values(comps)) if (v !== null && v !== undefined && (v < 0 || v > 100)) throw new AppError("VALIDATION", "Scores are percentages between 0 and 100.");
  const components = { ...r.r.components, ...comps };
  const total = courseTotal(components, r.course.assessmentWeights ?? cfg.defaultWeights);
  const band = gradeFor(total, cfg.gradingScale);
  await db.update(s.results).set({ components, total, grade: band.grade, gradePoint: band.point, passed: band.point >= cfg.passPoint, updatedAt: new Date() }).where(eq(s.results.id, resultId));
  await audit({ actor, action: "results.draft_edited", entityType: "result", entityId: resultId, metadata: { before: r.r.components, after: components } }, ctx);
}

/**
 * Advances results one step. Separation of duties (spec §129): whoever submitted a result can never
 * review or approve it, and the reviewer can never approve it. Every step is audited and runs in one transaction.
 */
export async function advanceResults(actor: Actor, resultIds: string[], act: ResultAction, ctx: ReqCtx) {
  if (!resultIds.length) throw new AppError("VALIDATION", "Select at least one result.");
  const perm = { SUBMIT: "grades.enter", REVIEW: "grades.review", APPROVE: "grades.approve", PUBLISH: "grades.approve", LOCK: "grades.approve" }[act] as "grades.enter" | "grades.review" | "grades.approve";
  if (!can(actor, perm)) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const { from, to } = FLOW[act];
  const db = getDb();
  const changed = await db.transaction(async (tx) => {
    const rows = await tx.select({ r: s.results, off: s.courseRegistrations.offeringId, enrolmentId: s.courseRegistrations.enrolmentId }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).where(inArray(s.results.id, resultIds)).for("update");
    for (const { r, off } of rows) {
      if (r.status !== from) throw new AppError("RULE_VIOLATION", `A ${r.status.toLowerCase()} result cannot be ${act.toLowerCase()}ed.`);
      if (act === "SUBMIT" && off) await assertCanTeach(actor, off, tx);
      if (act === "SUBMIT" && (r.total === null || !r.grade)) throw new AppError("RULE_VIOLATION", "Calculate results before submitting.");
      if ((act === "REVIEW" || act === "APPROVE") && r.submittedBy === actor.id) throw new AppError("RULE_VIOLATION", "You cannot review or approve results that you submitted yourself.");
      if (act === "APPROVE" && r.reviewedBy === actor.id) throw new AppError("RULE_VIOLATION", "The reviewer and the approver must be different people.");
    }
    const now = new Date();
    const patch = { SUBMIT: { submittedBy: actor.id, submittedAt: now }, REVIEW: { reviewedBy: actor.id, reviewedAt: now }, APPROVE: { approvedBy: actor.id, approvedAt: now }, PUBLISH: { publishedBy: actor.id, publishedAt: now }, LOCK: { lockedAt: now } }[act];
    await tx.update(s.results).set({ status: to, ...patch, updatedAt: now }).where(inArray(s.results.id, rows.map((x) => x.r.id)));
    for (const { r } of rows) await audit({ actor, action: `results.${act.toLowerCase()}`, entityType: "result", entityId: r.id, metadata: { from, to, total: r.total, grade: r.grade, approver: act === "APPROVE" || act === "PUBLISH" ? actor.id : undefined } }, ctx, tx);
    return rows;
  });
  if (act === "PUBLISH") {
    for (const { r, enrolmentId } of changed) {
      const [u] = await db.select({ userId: s.students.userId }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.enrolments.id, enrolmentId));
      if (u) await notifyUser({ userId: u.userId, category: "RESULT", title: "A result has been published", body: "You can now view it in your results.", link: "/student/results" });
      await refreshStanding(enrolmentId, ctx);
      void r;
    }
  }
  return changed.length;
}

/* ---- amendments: the only way a published result can change */

export async function requestAmendment(actor: Actor, resultId: string, newTotal: number, reason: string, ctx: ReqCtx) {
  if (!can(actor, "grades.enter") && !can(actor, "grades.amend")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (reason.trim().length < 10) throw new AppError("VALIDATION", "Explain the reason for the correction (at least 10 characters).");
  if (newTotal < 0 || newTotal > 100) throw new AppError("VALIDATION", "The corrected total must be between 0 and 100.");
  const cfg = await getSetting("academic");
  const db = getDb();
  const [r] = await db.select().from(s.results).where(eq(s.results.id, resultId));
  if (!r || !["PUBLISHED", "LOCKED"].includes(r.status)) throw new AppError("RULE_VIOLATION", "Only published results need an amendment; edit draft results directly.");
  const band = gradeFor(newTotal, cfg.gradingScale);
  const [a] = await db.insert(s.resultAmendments).values({ resultId, oldTotal: r.total, oldGrade: r.grade, newTotal, newGrade: band.grade, newGradePoint: band.point, reason, requestedBy: actor.id }).returning({ id: s.resultAmendments.id });
  await audit({ actor, action: "results.amendment_requested", entityType: "result", entityId: resultId, metadata: { old: { total: r.total, grade: r.grade }, new: { total: newTotal, grade: band.grade }, reason } }, ctx);
  return a.id;
}

export async function decideAmendment(actor: Actor, amendmentId: string, approve: boolean, note: string, ctx: ReqCtx) {
  if (!can(actor, "grades.amend")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const cfg = await getSetting("academic");
  return getDb().transaction(async (tx) => {
    const [a] = await tx.select().from(s.resultAmendments).where(eq(s.resultAmendments.id, amendmentId)).for("update");
    if (!a || a.status !== "PENDING") throw new AppError("RULE_VIOLATION", "This amendment has already been decided.");
    if (a.requestedBy === actor.id) throw new AppError("RULE_VIOLATION", "You cannot approve your own amendment request.");
    if (note.trim().length < 3) throw new AppError("VALIDATION", "Record a note for the decision.");
    await tx.update(s.resultAmendments).set({ status: approve ? "APPROVED" : "REJECTED", decidedBy: actor.id, decisionNote: note, decidedAt: new Date() }).where(eq(s.resultAmendments.id, a.id));
    if (approve) {
      // The database trigger refuses any change to a published result unless this transaction-local flag is set.
      await tx.execute(sql`select set_config('fcgbs.amendment', 'on', true)`);
      await tx.update(s.results).set({ total: a.newTotal, grade: a.newGrade, gradePoint: a.newGradePoint, passed: a.newGradePoint >= cfg.passPoint, updatedAt: new Date() }).where(eq(s.results.id, a.resultId));
    }
    await audit({ actor, action: approve ? "results.amendment_approved" : "results.amendment_rejected", entityType: "result", entityId: a.resultId, metadata: { old: { total: a.oldTotal, grade: a.oldGrade }, new: { total: a.newTotal, grade: a.newGrade }, reason: a.reason, requestedBy: a.requestedBy, approver: actor.id, note } }, ctx, tx);
    if (approve) {
      const [e] = await tx.select({ en: s.courseRegistrations.enrolmentId }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).where(eq(s.results.id, a.resultId));
      if (e) await refreshStanding(e.en, ctx, tx);
    }
    return a.resultId;
  });
}

void isNull;
