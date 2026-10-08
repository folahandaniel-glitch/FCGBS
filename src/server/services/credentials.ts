import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { graduationEligibility } from "@/core/grading";
import { getDb, type Executor } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { randomToken } from "../crypto";
import { getSetting } from "../settings";
import { enrolmentSummary } from "./academics";
import { notifyUser } from "./notifications";

/* ============================================================ eligibility */

export async function evaluateGraduation(enrolmentId: string) {
  const db = getDb();
  const [row] = await db.select({ e: s.enrolments, p: s.programmes, st: s.students }).from(s.enrolments).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.enrolments.id, enrolmentId));
  if (!row) throw new AppError("NOT_FOUND", "Enrolment not found.");
  const sum = await enrolmentSummary(enrolmentId);
  const core = await db.select({ id: s.programmeCourses.courseId }).from(s.programmeCourses).where(and(eq(s.programmeCourses.programmeId, row.p.id), eq(s.programmeCourses.kind, "CORE")));
  const passedIds = sum.records.filter((r) => r.passed).map((r) => r.courseId);
  const [{ outstanding }] = await db.select({ outstanding: sql<number>`count(*)::int` }).from(s.courseRegistrations).leftJoin(s.results, eq(s.results.registrationId, s.courseRegistrations.id)).where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), eq(s.courseRegistrations.source, "REGISTERED"), inArray(s.courseRegistrations.status, ["APPROVED", "PENDING"]), sql`(${s.results.id} is null or ${s.results.status} not in ('PUBLISHED','LOCKED'))`));
  const [{ hours }] = await db.select({ hours: sql<number>`coalesce(sum(${s.ministryActivities.hours}),0)::float` }).from(s.ministryActivities).where(and(eq(s.ministryActivities.studentId, row.st.id), eq(s.ministryActivities.status, "VERIFIED")));
  const [{ research }] = await db.select({ research: sql<number>`count(*)::int` }).from(s.researchProjects).where(and(eq(s.researchProjects.studentId, row.st.id), inArray(s.researchProjects.status, ["APPROVED", "ARCHIVED"])));
  const [{ owed }] = await db.execute<{ owed: number }>(sql`select coalesce(sum(i.amount - coalesce((select sum(p.amount) from payments p where p.invoice_id = i.id and p.status='CONFIRMED'),0)),0)::float as owed from invoices i where i.user_id = ${row.st.userId} and i.status in ('UNPAID','PARTIAL')`).then((r) => r.rows);
  const [{ cases }] = await db.select({ cases: sql<number>`count(*)::int` }).from(s.integrityCases).where(and(eq(s.integrityCases.studentId, row.st.id), inArray(s.integrityCases.status, ["REPORTED", "INVESTIGATING", "APPEALED"])));
  const result = graduationEligibility({
    requiredCourseIds: core.map((c) => c.id), passedCourseIds: passedIds, creditsEarned: sum.creditsEarned, minCredits: row.p.minCredits, cgpa: sum.cgpa, minCgpa: row.p.minCgpa,
    outstandingAssessments: outstanding, practicumHoursVerified: hours, practicumHoursRequired: row.p.practicumHours, researchRequired: row.p.researchRequired, researchApproved: research > 0, outstandingFees: owed ?? 0, openDisciplinaryCases: cases,
  });
  return { ...result, summary: { cgpa: sum.cgpa, creditsEarned: sum.creditsEarned, classification: sum.classification }, programme: row.p.name, student: row.st };
}

/* ============================================================ graduation workflow */

export async function recommendGraduation(actor: Actor, enrolmentId: string, ctx: ReqCtx) {
  if (!can(actor, "graduation.registrar")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const ev = await evaluateGraduation(enrolmentId);
  if (!ev.eligible) throw new AppError("RULE_VIOLATION", `Not eligible: ${ev.checks.filter((c) => !c.ok).map((c) => c.label).join("; ")}.`);
  const db = getDb();
  const [session] = await db.select({ id: s.academicSessions.id }).from(s.academicSessions).where(eq(s.academicSessions.isCurrent, true)).limit(1);
  const [g] = await db.insert(s.graduations).values({ enrolmentId, sessionId: session?.id, status: "REGISTRAR_APPROVED", eligibility: { checks: ev.checks, summary: ev.summary }, registrarBy: actor.id, registrarAt: new Date() }).onConflictDoNothing().returning({ id: s.graduations.id });
  if (!g) throw new AppError("CONFLICT", "This student is already on a graduation list.");
  await audit({ actor, action: "graduation.registrar_approved", entityType: "graduation", entityId: g.id, metadata: { enrolmentId, summary: ev.summary } }, ctx);
  return g.id;
}

export async function boardDecision(actor: Actor, graduationId: string, approve: boolean, notes: string, ctx: ReqCtx) {
  if (!can(actor, "graduation.board")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const db = getDb();
  const [g] = await db.select().from(s.graduations).where(eq(s.graduations.id, graduationId));
  if (!g || g.status !== "REGISTRAR_APPROVED") throw new AppError("RULE_VIOLATION", "Only registrar-approved candidates go to the Academic Board.");
  if (g.registrarBy === actor.id) throw new AppError("RULE_VIOLATION", "The Registrar's recommendation must be approved by a different person.");
  // Eligibility is re-checked at the moment of approval: a late disciplinary case or fee must still block graduation.
  if (approve) {
    const ev = await evaluateGraduation(g.enrolmentId);
    if (!ev.eligible) throw new AppError("RULE_VIOLATION", `No longer eligible: ${ev.checks.filter((c) => !c.ok).map((c) => c.label).join("; ")}.`);
  }
  await db.update(s.graduations).set({ status: approve ? "BOARD_APPROVED" : "REJECTED", boardBy: actor.id, boardAt: new Date(), notes }).where(eq(s.graduations.id, g.id));
  await db.insert(s.boardDecisions).values({ kind: "GRADUATION", refType: "graduation", refId: g.id, title: "Graduation approval", decision: approve ? "APPROVED" : "REJECTED", notes, decidedBy: actor.id });
  await audit({ actor, action: approve ? "graduation.board_approved" : "graduation.board_rejected", entityType: "graduation", entityId: g.id, metadata: { notes, approver: actor.id } }, ctx);
}

/** Marks the student as a graduate and an alumnus. Requires Board approval. */
export async function completeGraduation(actor: Actor, graduationId: string, ctx: ReqCtx) {
  if (!can(actor, "graduation.registrar")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const db = getDb();
  await db.transaction(async (tx) => {
    const [g] = await tx.select().from(s.graduations).where(eq(s.graduations.id, graduationId)).for("update");
    if (!g || g.status !== "BOARD_APPROVED") throw new AppError("RULE_VIOLATION", "The Academic Board must approve graduation first.");
    const [en] = await tx.select({ e: s.enrolments, st: s.students, p: s.programmes }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).where(eq(s.enrolments.id, g.enrolmentId));
    await tx.update(s.graduations).set({ status: "GRADUATED", graduatedAt: new Date() }).where(eq(s.graduations.id, g.id));
    await tx.update(s.enrolments).set({ status: "COMPLETED", standing: "GRADUATED", completedOn: new Date().toISOString().slice(0, 10) }).where(eq(s.enrolments.id, en.e.id));
    await tx.update(s.students).set({ status: "GRADUATED", standing: "GRADUATED" }).where(eq(s.students.id, en.st.id));
    await tx.update(s.users).set({ userType: "ALUMNI", updatedAt: new Date() }).where(and(eq(s.users.id, en.st.userId), eq(s.users.userType, "STUDENT")));
    await tx.insert(s.alumniProfiles).values({ userId: en.st.userId, graduationYear: new Date().getFullYear() }).onConflictDoNothing();
    await audit({ actor, action: "graduation.completed", entityType: "graduation", entityId: g.id, summary: en.p.name }, ctx, tx);
    await notifyUser({ userId: en.st.userId, category: "GRADUATION", title: "Congratulations — you have graduated", body: `You have completed the ${en.p.name}.`, link: "/student", email: true }, tx);
  });
}

/* ============================================================ certificates */

async function nextSerial(table: "certificates" | "transcripts", db: Executor = getDb()) {
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int + 1 as n from ${table === "certificates" ? s.certificates : s.transcripts}`).then((x) => x.rows);
  return String(r.n).padStart(4, "0");
}

/** Certificates can only be issued for a graduation the Academic Board has approved — never manufactured by ordinary users. */
export async function issueCertificate(actor: Actor, graduationId: string, ctx: ReqCtx) {
  if (!can(actor, "certificates.issue")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const cfg = await getSetting("certificates");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [g] = await tx.select().from(s.graduations).where(eq(s.graduations.id, graduationId)).for("update");
    if (!g || !["BOARD_APPROVED", "GRADUATED"].includes(g.status)) throw new AppError("RULE_VIOLATION", "A certificate can only be issued after Academic Board approval of graduation.");
    const [dupe] = await tx.select({ id: s.certificates.id }).from(s.certificates).where(and(eq(s.certificates.graduationId, g.id), eq(s.certificates.status, "VALID")));
    if (dupe) throw new AppError("CONFLICT", "A valid certificate already exists for this graduation.");
    const [en] = await tx.select({ st: s.students, p: s.programmes, u: s.users, lvl: s.programmeLevels.name }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId)).where(eq(s.enrolments.id, g.enrolmentId));
    const sum = await enrolmentSummary(g.enrolmentId, tx);
    const number = `${cfg.numberPrefix}-${new Date().getFullYear()}-${await nextSerial("certificates", tx)}`;
    const [c] = await tx.insert(s.certificates).values({ number, verifyToken: randomToken(18), enrolmentId: g.enrolmentId, graduationId: g.id, awardTitle: en.p.name, holderName: [en.u.firstName, en.u.otherNames, en.u.lastName].filter(Boolean).join(" "), programmeName: en.p.name, awardDate: new Date().toISOString().slice(0, 10), cgpa: sum.cgpa, classification: sum.classification, issuedBy: actor.id }).returning({ id: s.certificates.id, number: s.certificates.number });
    await tx.update(s.graduations).set({ status: "CERTIFICATE_ISSUED" }).where(eq(s.graduations.id, g.id));
    await audit({ actor, action: "certificate.issued", entityType: "certificate", entityId: c.id, summary: number, metadata: { graduationId: g.id, approver: g.boardBy } }, ctx, tx);
    await notifyUser({ userId: en.st.userId, category: "CERTIFICATE", title: "Your certificate has been issued", body: `Certificate ${number}.`, link: "/student/certificates", email: true }, tx);
    return c;
  });
}

export async function revokeCertificate(actor: Actor, certificateId: string, reason: string, ctx: ReqCtx, supersededBy?: string) {
  if (!can(actor, "certificates.revoke")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (reason.trim().length < 10) throw new AppError("VALIDATION", "A clear reason (at least 10 characters) is required to revoke a certificate.");
  const [c] = await getDb().update(s.certificates).set({ status: supersededBy ? "SUPERSEDED" : "REVOKED", revokedAt: new Date(), revokedBy: actor.id, revokedReason: reason, supersededById: supersededBy ?? null }).where(and(eq(s.certificates.id, certificateId), eq(s.certificates.status, "VALID"))).returning({ id: s.certificates.id, number: s.certificates.number });
  if (!c) throw new AppError("RULE_VIOLATION", "Only a valid certificate can be revoked.");
  await audit({ actor, action: supersededBy ? "certificate.superseded" : "certificate.revoked", entityType: "certificate", entityId: c.id, summary: c.number, metadata: { reason } }, ctx);
}

/* ============================================================ transcripts */

export async function createTranscript(actor: Actor, enrolmentId: string, ctx: ReqCtx) {
  if (!can(actor, "transcripts.issue")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const db = getDb();
  const cfg = await getSetting("certificates");
  const [en] = await db.select({ e: s.enrolments, st: s.students, u: s.users, p: s.programmes, lvl: s.programmeLevels.name }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId)).where(eq(s.enrolments.id, enrolmentId));
  if (!en) throw new AppError("NOT_FOUND", "Enrolment not found.");
  const sum = await enrolmentSummary(enrolmentId);
  const [grad] = await db.select().from(s.graduations).where(eq(s.graduations.enrolmentId, enrolmentId));
  const snapshot = {
    institution: (await getSetting("institution")).name,
    student: { name: [en.u.firstName, en.u.otherNames, en.u.lastName].filter(Boolean).join(" "), number: en.st.studentNumber },
    programme: { name: en.p.name, level: en.lvl, code: en.p.code },
    terms: sum.terms.map((t) => ({ name: t.name, gpa: t.gpa, credits: t.credits, courses: t.records.map((r) => ({ code: r.code, title: r.title, credits: r.credits, grade: r.grade, point: r.graded ? r.point : null, total: r.total })) })),
    cgpa: sum.cgpa, creditsEarned: sum.creditsEarned, standing: en.e.standing, classification: sum.classification,
    graduation: grad && ["GRADUATED", "CERTIFICATE_ISSUED"].includes(grad.status) ? { date: grad.graduatedAt?.toISOString().slice(0, 10) } : null,
    footer: cfg.transcriptFooter,
  };
  const number = `${cfg.transcriptPrefix}-${new Date().getFullYear()}-${await nextSerial("transcripts")}`;
  const [t] = await db.insert(s.transcripts).values({ number, enrolmentId, snapshot, verifyToken: randomToken(18) }).returning({ id: s.transcripts.id });
  await audit({ actor, action: "transcript.generated", entityType: "transcript", entityId: t.id, summary: number }, ctx);
  return t.id;
}

export async function setTranscriptStatus(actor: Actor, transcriptId: string, to: "APPROVED" | "ISSUED" | "REVOKED", ctx: ReqCtx, reason?: string) {
  if (!can(actor, "transcripts.issue")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const [t] = await getDb().select().from(s.transcripts).where(eq(s.transcripts.id, transcriptId));
  if (!t) throw new AppError("NOT_FOUND", "Transcript not found.");
  const ok = (to === "APPROVED" && t.status === "DRAFT") || (to === "ISSUED" && t.status === "APPROVED") || (to === "REVOKED" && t.status === "ISSUED");
  if (!ok) throw new AppError("RULE_VIOLATION", `A ${t.status.toLowerCase()} transcript cannot become ${to.toLowerCase()}.`);
  if (to === "ISSUED" && t.approvedBy === actor.id) throw new AppError("RULE_VIOLATION", "A transcript must be issued by someone other than the person who approved it.");
  if (to === "REVOKED" && (reason?.trim().length ?? 0) < 10) throw new AppError("VALIDATION", "A reason is required to revoke a transcript.");
  await getDb().update(s.transcripts).set({ status: to, ...(to === "APPROVED" ? { approvedBy: actor.id } : {}), ...(to === "ISSUED" ? { issuedBy: actor.id, issuedAt: new Date() } : {}), ...(to === "REVOKED" ? { revokedReason: reason } : {}) }).where(eq(s.transcripts.id, t.id));
  await audit({ actor, action: `transcript.${to.toLowerCase()}`, entityType: "transcript", entityId: t.id, summary: t.number, metadata: { reason } }, ctx);
}

void ne;
