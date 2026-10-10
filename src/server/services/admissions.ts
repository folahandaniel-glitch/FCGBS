import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { getSetting } from "../settings";
import { notifyUser } from "./notifications";

/* ------------------------------------------------------------------ applicant side */

const personal = z.object({
  dateOfBirth: z.string().min(8, "Enter your date of birth."),
  gender: z.string().min(1, "Select gender."),
  phone: z.string().min(7, "Enter a phone number."),
  address: z.string().min(5, "Enter your address."),
  country: z.string().min(2, "Enter your country."),
  nationality: z.string().optional().default(""),
  idType: z.string().optional().default(""),
  idNumber: z.string().optional().default(""),
});

export const applicationInput = z.object({
  programmeId: z.string().uuid(),
  personal: personal.partial(),
  education: z.array(z.object({ level: z.string().optional(), institution: z.string().optional(), year: z.string().optional(), qualification: z.string().optional(), notes: z.string().optional() })).max(8).default([]),
  ministryBackground: z.record(z.string(), z.string().max(1000)).default({}),
  references: z.array(z.object({ name: z.string().min(2), relationship: z.string().min(2), email: z.string().email(), phone: z.string().default("") })).max(3).default([]),
  statement: z.string().max(5000).default(""),
});

const OPEN_STATES = ["DRAFT"] as const;

async function nextNumber(prefix: string, table: "applications" | "students", db = getDb()) {
  const year = new Date().getFullYear();
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int + 1 as n from ${table === "applications" ? s.applications : s.students}`).then((x) => x.rows);
  return `${prefix}-${year}-${String(r.n).padStart(4, "0")}`;
}

export async function myApplication(userId: string) {
  const [a] = await getDb().select().from(s.applications).where(eq(s.applications.userId, userId)).orderBy(desc(s.applications.createdAt)).limit(1);
  return a ?? null;
}

export async function saveApplication(actor: Actor, raw: unknown, ctx: ReqCtx) {
  const cfg = await getSetting("admissions");
  if (!cfg.open) throw new AppError("RULE_VIOLATION", "Applications are currently closed.");
  const input = applicationInput.parse(raw);
  const db = getDb();
  const [prog] = await db.select({ id: s.programmes.id }).from(s.programmes).where(and(eq(s.programmes.id, input.programmeId), eq(s.programmes.status, "PUBLISHED")));
  if (!prog) throw new AppError("NOT_FOUND", "That programme is not open for application.");
  const existing = await myApplication(actor.id);
  const [session] = await db.select({ id: s.academicSessions.id }).from(s.academicSessions).where(eq(s.academicSessions.isCurrent, true)).limit(1);
  if (existing) {
    if (!(OPEN_STATES as readonly string[]).includes(existing.status)) throw new AppError("RULE_VIOLATION", "This application has been submitted and can no longer be edited.");
    await db.update(s.applications).set({ programmeId: input.programmeId, personal: input.personal as Record<string, string>, education: input.education, ministryBackground: input.ministryBackground, references: input.references, statement: input.statement, updatedAt: new Date() }).where(eq(s.applications.id, existing.id));
    return existing.id;
  }
  const applicationNo = await nextNumber(cfg.applicationNoPrefix, "applications");
  const [a] = await db.insert(s.applications).values({ applicationNo, userId: actor.id, programmeId: input.programmeId, sessionId: session?.id, personal: input.personal as Record<string, string>, education: input.education, ministryBackground: input.ministryBackground, references: input.references, statement: input.statement }).returning({ id: s.applications.id });
  await audit({ actor, action: "admission.application_created", entityType: "application", entityId: a.id, summary: applicationNo }, ctx);
  return a.id;
}

export async function addApplicationDocument(actor: Actor, applicationId: string, kind: string, assetId: string, ctx: ReqCtx) {
  const [a] = await getDb().select().from(s.applications).where(and(eq(s.applications.id, applicationId), eq(s.applications.userId, actor.id)));
  if (!a) throw new AppError("NOT_FOUND", "Application not found.");
  if (a.status !== "DRAFT" && a.status !== "CONDITIONALLY_ACCEPTED" && a.status !== "UNDER_REVIEW" && a.status !== "INTERVIEW_REQUIRED") throw new AppError("RULE_VIOLATION", "Documents can no longer be added.");
  await getDb().insert(s.applicationDocuments).values({ applicationId, kind, assetId });
  await audit({ actor, action: "admission.document_added", entityType: "application", entityId: applicationId, metadata: { kind } }, ctx);
}

export async function submitApplication(actor: Actor, applicationId: string, ctx: ReqCtx) {
  const db = getDb();
  const cfg = await getSetting("admissions");
  const [a] = await db.select().from(s.applications).where(and(eq(s.applications.id, applicationId), eq(s.applications.userId, actor.id)));
  if (!a) throw new AppError("NOT_FOUND", "Application not found.");
  if (a.status !== "DRAFT") throw new AppError("RULE_VIOLATION", "This application has already been submitted.");
  const p = personal.safeParse(a.personal);
  if (!p.success) throw new AppError("VALIDATION", p.error.issues[0].message, Object.fromEntries(p.error.issues.map((i) => [`personal.${i.path.join(".")}`, [i.message]])));
  if (!a.statement || a.statement.trim().length < 50) throw new AppError("VALIDATION", "Please write a personal statement of at least 50 characters.");
  if (a.references.length < cfg.referencesRequired) throw new AppError("VALIDATION", `Please provide at least ${cfg.referencesRequired} reference(s).`);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.applicationDocuments).where(eq(s.applicationDocuments.applicationId, a.id));
  if (n < 1) throw new AppError("VALIDATION", "Please upload at least one supporting document (for example identification).");
  await db.transaction(async (tx) => {
    await tx.update(s.applications).set({ status: "SUBMITTED", submittedAt: new Date(), updatedAt: new Date() }).where(eq(s.applications.id, a.id));
    if (cfg.applicationFee > 0) {
      const number = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
      await tx.insert(s.invoices).values({ number, userId: actor.id, applicationId: a.id, kind: "APPLICATION", description: "Application fee", amount: cfg.applicationFee, currency: cfg.currency });
    }
    await audit({ actor, action: "admission.submitted", entityType: "application", entityId: a.id, summary: a.applicationNo }, ctx, tx);
  });
  await notifyUser({ userId: actor.id, category: "ADMISSION", title: "Application received", body: `Your application ${a.applicationNo} has been submitted for review.`, link: "/apply", email: true });
}

export async function withdrawApplication(actor: Actor, applicationId: string, ctx: ReqCtx) {
  const [a] = await getDb().update(s.applications).set({ status: "WITHDRAWN", updatedAt: new Date() }).where(and(eq(s.applications.id, applicationId), eq(s.applications.userId, actor.id), inArray(s.applications.status, ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "WAITLISTED"]))).returning({ id: s.applications.id });
  if (!a) throw new AppError("RULE_VIOLATION", "This application cannot be withdrawn.");
  await audit({ actor, action: "admission.withdrawn", entityType: "application", entityId: a.id }, ctx);
}

export async function acceptOffer(actor: Actor, applicationId: string, ctx: ReqCtx) {
  const [cur] = await getDb().select().from(s.applications).where(and(eq(s.applications.id, applicationId), eq(s.applications.userId, actor.id)));
  if (!cur || !["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(cur.status)) throw new AppError("RULE_VIOLATION", "There is no offer to accept.");
  const cfg = await getSetting("admissions");
  if (cur.decisionAt && Date.now() - cur.decisionAt.getTime() > cfg.offerValidDays * 86_400_000) throw new AppError("RULE_VIOLATION", "This offer has expired. Please contact the Admissions Office.");
  await getDb().update(s.applications).set({ offerAcceptedAt: new Date(), updatedAt: new Date() }).where(eq(s.applications.id, cur.id));
  await audit({ actor, action: "admission.offer_accepted", entityType: "application", entityId: cur.id }, ctx);
}

/* ------------------------------------------------------------------ staff side */

export type Decision = "UNDER_REVIEW" | "INTERVIEW_REQUIRED" | "ACCEPTED" | "CONDITIONALLY_ACCEPTED" | "WAITLISTED" | "REJECTED";

const TRANSITIONS: Record<string, Decision[]> = {
  SUBMITTED: ["UNDER_REVIEW", "INTERVIEW_REQUIRED", "REJECTED"],
  UNDER_REVIEW: ["INTERVIEW_REQUIRED", "ACCEPTED", "CONDITIONALLY_ACCEPTED", "WAITLISTED", "REJECTED"],
  INTERVIEW_REQUIRED: ["UNDER_REVIEW", "ACCEPTED", "CONDITIONALLY_ACCEPTED", "WAITLISTED", "REJECTED"],
  WAITLISTED: ["ACCEPTED", "CONDITIONALLY_ACCEPTED", "REJECTED"],
};

/**
 * Moves an application through the review workflow. Review steps need `admissions.review`; the decision
 * itself (accept/conditional/waitlist/reject) needs `admissions.decide`, enforced by the caller. A decision
 * always carries a note, and applicants are notified — a human decides, never software alone.
 */
export async function decideApplication(actor: Actor, applicationId: string, to: Decision, note: string, ctx: ReqCtx, extra: { interviewAt?: Date; conditions?: string } = {}) {
  const db = getDb();
  const [a] = await db.select().from(s.applications).where(eq(s.applications.id, applicationId));
  if (!a) throw new AppError("NOT_FOUND", "Application not found.");
  if (!(TRANSITIONS[a.status] ?? []).includes(to)) throw new AppError("RULE_VIOLATION", `An application that is ${a.status.toLowerCase().replace(/_/g, " ")} cannot move to ${to.toLowerCase().replace(/_/g, " ")}.`);
  const isDecision = ["ACCEPTED", "CONDITIONALLY_ACCEPTED", "WAITLISTED", "REJECTED"].includes(to);
  if (isDecision && note.trim().length < 3) throw new AppError("VALIDATION", "Please record a reason for the decision.");
  if (to === "CONDITIONALLY_ACCEPTED" && !extra.conditions?.trim()) throw new AppError("VALIDATION", "State the conditions of the offer.");
  await db.update(s.applications).set({ status: to, reviewedBy: actor.id, reviewNotes: note || a.reviewNotes, ...(isDecision ? { decisionBy: actor.id, decisionAt: new Date(), decisionNote: note } : {}), ...(extra.interviewAt ? { interviewAt: extra.interviewAt } : {}), ...(extra.conditions ? { conditions: extra.conditions } : {}), updatedAt: new Date() }).where(eq(s.applications.id, a.id));
  await audit({ actor, action: `admission.${to.toLowerCase()}`, entityType: "application", entityId: a.id, summary: a.applicationNo, metadata: { from: a.status, to, reason: note } }, ctx);
  const msg: Record<Decision, string> = {
    UNDER_REVIEW: "Your application is now under review.",
    INTERVIEW_REQUIRED: "You are invited to an interview. The Admissions Office will contact you.",
    ACCEPTED: "Congratulations — you have been offered admission. Please accept your offer and complete registration.",
    CONDITIONALLY_ACCEPTED: "You have been conditionally offered admission. Please see the conditions on your application page.",
    WAITLISTED: "Your application has been placed on the waiting list.",
    REJECTED: "We are unable to offer you admission at this time.",
  };
  await notifyUser({ userId: a.userId, category: "ADMISSION", title: `Application ${to.toLowerCase().replace(/_/g, " ")}`, body: msg[to], link: "/apply", email: true });
}

/** Creates the student account, ID and first enrolment once the offer is accepted. One transaction; idempotent per application. */
export async function registerAdmittedStudent(actor: Actor, applicationId: string, ctx: ReqCtx) {
  const db = getDb();
  const cfg = await getSetting("admissions");
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(s.applications).where(eq(s.applications.id, applicationId)).for("update");
    if (!a) throw new AppError("NOT_FOUND", "Application not found.");
    if (!["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(a.status)) throw new AppError("RULE_VIOLATION", "Only admitted applicants can be registered.");
    if (!a.offerAcceptedAt) throw new AppError("RULE_VIOLATION", "The applicant has not yet accepted the offer.");
    if (a.registeredAt) throw new AppError("CONFLICT", "This applicant is already registered.");
    const p = a.personal as Record<string, string>;
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int + 1` }).from(s.students);
    const year = new Date().getFullYear();
    const studentNumber = `${cfg.studentIdPrefix}/${year}/${String(n).padStart(cfg.studentIdDigits, "0")}`;
    const [campus] = await tx.select({ id: s.campuses.id }).from(s.campuses).where(eq(s.campuses.isOnline, true)).limit(1);
    const [existing] = await tx.select({ id: s.students.id, studentNumber: s.students.studentNumber }).from(s.students).where(eq(s.students.userId, a.userId));
    const [st] = existing ? [existing] : await tx.insert(s.students).values({ userId: a.userId, studentNumber, dateOfBirth: p.dateOfBirth || null, gender: p.gender, address: p.address, nationality: p.nationality, campusId: a.campusId ?? campus?.id, admissionSessionId: a.sessionId }).onConflictDoNothing().returning({ id: s.students.id });
    if (!st) throw new AppError("CONFLICT", "A student record already exists for this applicant.");
    await tx.insert(s.enrolments).values({ studentId: st.id, programmeId: a.programmeId, startSessionId: a.sessionId }).onConflictDoNothing();
    await tx.update(s.users).set({ userType: "STUDENT", updatedAt: new Date() }).where(eq(s.users.id, a.userId));
    await tx.update(s.applications).set({ registeredAt: new Date(), updatedAt: new Date() }).where(eq(s.applications.id, a.id));
    await audit({ actor, action: "admission.student_registered", entityType: "student", entityId: st.id, summary: studentNumber, metadata: { applicationId: a.id, approver: actor.id } }, ctx, tx);
    await notifyUser({ userId: a.userId, category: "ADMISSION", title: "Welcome to FCGBS", body: `Your student ID is ${studentNumber}. You can now register for courses.`, link: "/student", email: true }, tx);
    return { studentId: st.id, studentNumber };
  });
}
