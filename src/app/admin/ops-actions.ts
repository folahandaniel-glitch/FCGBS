"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit } from "@/server/audit";
import { decideApplication, registerAdmittedStudent, type Decision } from "@/server/services/admissions";
import { advanceResults, decideAmendment, grantCredit, requestAmendment, registerForOfferings, dropRegistration } from "@/server/services/academics";
import { boardDecision, completeGraduation, createTranscript, issueCertificate, recommendGraduation, revokeCertificate, setTranscriptStatus } from "@/server/services/credentials";
import { adminResetLink, adminResetLink as _r, createRole, createStaff, saveRolePermissions, setAccountStatus, setUserRoles } from "@/server/services/people";
import { advanceResearch, assignMentor, giveResearchFeedback, setPlacementStatus, verifyActivity } from "@/server/services/formation";
import { advanceIntegrity, createInvoice, decideAppeal, publishPolicy, recordPayment, reportIntegrity, savePolicyDraft, voidInvoice } from "@/server/services/ops";
import { notifyUser } from "@/server/services/notifications";

void _r;
const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";
const ref = (p: string) => revalidatePath(p, "layout");

/* ---------------------------------------------------------------- admissions */

export async function decideApplicationAction(applicationId: string, to: Decision, note: string, extra?: { conditions?: string; interviewAt?: string }) {
  const perm = ["ACCEPTED", "CONDITIONALLY_ACCEPTED", "WAITLISTED", "REJECTED"].includes(to) ? "admissions.decide" : "admissions.review";
  return action({ role: "staff", perm }, async (a, ctx) => { await decideApplication(a, applicationId, to, note, ctx, { conditions: extra?.conditions, interviewAt: extra?.interviewAt ? new Date(extra.interviewAt) : undefined }); ref("/admin/admissions"); }, "Recorded and the applicant has been notified.");
}
export async function decideApplicationForm(_: ActionResult | null, f: FormData) {
  return decideApplicationAction(g(f, "id"), g(f, "to") as Decision, g(f, "note"), { conditions: g(f, "conditions"), interviewAt: g(f, "interviewAt") });
}
export async function verifyDocumentAction(docId: string, ok: boolean) {
  return action({ role: "staff", perm: "admissions.review" }, async (a, ctx) => {
    await getDb().update(s.applicationDocuments).set({ verified: ok, verifiedBy: a.id }).where(eq(s.applicationDocuments.id, docId));
    await audit({ actor: a, action: "admission.document_verified", entityType: "application_document", entityId: docId, metadata: { ok } }, ctx);
    ref("/admin/admissions");
  });
}
export async function registerStudentAction(applicationId: string) {
  return action({ role: "staff", perm: "admissions.register" }, async (a, ctx) => { const r = await registerAdmittedStudent(a, applicationId, ctx); ref("/admin"); return r; }, "Student registered.");
}

/* ------------------------------------------------------------------ students */

export async function setStudentStatusAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "students.status" }, async (a, ctx) => {
    const studentId = g(f, "studentId");
    const status = g(f, "status") as "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "WITHDRAWN";
    const reason = g(f, "reason");
    if (reason.length < 3) throw new AppError("VALIDATION", "Record a reason.");
    if (!["ACTIVE", "ON_LEAVE", "SUSPENDED", "WITHDRAWN"].includes(status)) throw new AppError("VALIDATION", "Choose a status.");
    const db = getDb();
    const [st] = await db.select().from(s.students).where(eq(s.students.id, studentId));
    if (!st) throw new AppError("NOT_FOUND", "Student not found.");
    await db.update(s.students).set({ status, standing: status === "SUSPENDED" ? "SUSPENDED" : status === "WITHDRAWN" ? "WITHDRAWN" : "GOOD_STANDING" }).where(eq(s.students.id, studentId));
    if (status === "SUSPENDED" || status === "ACTIVE") await setAccountStatus(a, st.userId, status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE", reason, ctx).catch(() => undefined);
    await audit({ actor: a, action: "student.status_changed", entityType: "student", entityId: studentId, metadata: { from: st.status, to: status, reason } }, ctx);
    await notifyUser({ userId: st.userId, category: "ANNOUNCEMENT", title: "Your student status changed", body: reason });
    ref("/admin/students");
  }, "Status updated.");
}

export async function registerOnBehalfAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => { await registerForOfferings(a, g(f, "enrolmentId"), [g(f, "offeringId")], ctx, { onBehalf: true }); ref("/admin/students"); }, "Registered.");
}
export async function dropOnBehalfAction(registrationId: string) {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => { await dropRegistration(a, registrationId, ctx, { onBehalf: true }); ref("/admin/students"); }, "Dropped.");
}
export async function grantCreditAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => { await grantCredit(a, g(f, "enrolmentId"), g(f, "courseId"), g(f, "source") as "EXEMPTION", g(f, "note"), ctx); ref("/admin/students"); }, "Credit granted.");
}
export async function assignMentorAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "ministry.manage" }, async (a, ctx) => { await assignMentor(a, g(f, "mentorId"), g(f, "studentId"), ctx); ref("/admin/students"); }, "Mentor assigned.");
}

/* ------------------------------------------------------------------- results */

export async function advanceResultsAction(ids: string[], act: "REVIEW" | "APPROVE" | "PUBLISH" | "LOCK") {
  const perm = act === "REVIEW" ? "grades.review" : "grades.approve";
  return action({ role: "staff", perm }, async (a, ctx) => { const n = await advanceResults(a, ids, act, ctx); ref("/admin/results"); return { n }; }, "Done.");
}
export async function requestAmendmentAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: ["grades.enter", "grades.amend"] }, async (a, ctx) => { await requestAmendment(a, g(f, "resultId"), Number(g(f, "newTotal")), g(f, "reason"), ctx); ref("/admin/results"); }, "Amendment requested for approval.");
}
export async function decideAmendmentAction(id: string, approve: boolean, note: string) {
  return action({ role: "staff", perm: "grades.amend" }, async (a, ctx) => { await decideAmendment(a, id, approve, note, ctx); ref("/admin/results"); }, "Decision recorded.");
}
export async function decideAppealAction(id: string, uphold: boolean, note: string) {
  return action({ role: "staff", perm: "appeals.manage" }, async (a, ctx) => { await decideAppeal(a, id, uphold, note, ctx); ref("/admin/integrity"); }, "Decision recorded.");
}

/* ------------------------------------------------------ graduation & credentials */

export async function recommendGraduationAction(enrolmentId: string) {
  return action({ role: "staff", perm: "graduation.registrar" }, async (a, ctx) => { await recommendGraduation(a, enrolmentId, ctx); ref("/admin/graduation"); }, "Recommended to the Academic Board.");
}
export async function boardDecisionAction(id: string, approve: boolean, notes: string) {
  return action({ role: "staff", perm: "graduation.board" }, async (a, ctx) => { await boardDecision(a, id, approve, notes, ctx); ref("/admin/graduation"); }, "Board decision recorded.");
}
export async function completeGraduationAction(id: string) {
  return action({ role: "staff", perm: "graduation.registrar" }, async (a, ctx) => { await completeGraduation(a, id, ctx); ref("/admin/graduation"); }, "Graduation completed.");
}
export async function issueCertificateAction(id: string) {
  return action({ role: "staff", perm: "certificates.issue" }, async (a, ctx) => { await issueCertificate(a, id, ctx); ref("/admin/graduation"); }, "Certificate issued.");
}
export async function revokeCertificateAction(id: string, reason: string) {
  return action({ role: "staff", perm: "certificates.revoke" }, async (a, ctx) => { await revokeCertificate(a, id, reason, ctx); ref("/admin/graduation"); }, "Certificate revoked.");
}
export async function createTranscriptAction(enrolmentId: string) {
  return action({ role: "staff", perm: "transcripts.issue" }, async (a, ctx) => { await createTranscript(a, enrolmentId, ctx); ref("/admin/graduation"); ref("/admin/students"); }, "Transcript drafted.");
}
export async function transcriptStatusAction(id: string, to: "APPROVED" | "ISSUED" | "REVOKED", reason?: string) {
  return action({ role: "staff", perm: "transcripts.issue" }, async (a, ctx) => { await setTranscriptStatus(a, id, to, ctx, reason); ref("/admin/graduation"); ref("/admin/students"); }, "Updated.");
}

/* ----------------------------------------------------------------- ministry */

export async function verifyActivityAction(id: string, ok: boolean, note: string) {
  return action({ role: "staff", perm: ["ministry.manage", "ministry.mentor"] }, async (a, ctx) => { await verifyActivity(a, id, ok, note, ctx); ref("/admin/ministry"); }, "Recorded.");
}
export async function placementStatusAction(id: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED", outcome?: string, note?: string) {
  return action({ role: "staff", perm: ["ministry.manage", "ministry.mentor"] }, async (a, ctx) => { await setPlacementStatus(a, id, status, { outcome, note }, ctx); ref("/admin/ministry"); }, "Updated.");
}

/* ----------------------------------------------------------------- research */

export async function advanceResearchAction(id: string, to: string, note?: string, score?: number, grade?: string) {
  return action({ role: "staff", perm: ["research.manage", "research.supervise"] }, async (a, ctx) => { await advanceResearch(a, id, to, ctx, { note, score, grade }); ref("/admin/research"); }, "Updated.");
}
export async function researchFeedbackAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: ["research.manage", "research.supervise"] }, async (a, ctx) => { await giveResearchFeedback(a, g(f, "id"), g(f, "feedback"), ctx); ref("/admin/research"); }, "Feedback sent.");
}
export async function assignSupervisorAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "research.manage" }, async (a, ctx) => {
    await getDb().update(s.researchProjects).set({ supervisorId: g(f, "supervisorId") || null }).where(eq(s.researchProjects.id, g(f, "id")));
    await audit({ actor: a, action: "research.supervisor_assigned", entityType: "research", entityId: g(f, "id") }, ctx);
    ref("/admin/research");
  }, "Supervisor assigned.");
}

/* ------------------------------------------------------------ finance & integrity */

export async function createInvoiceAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "finance.manage" }, async (a, ctx) => { await createInvoice(a, { userId: g(f, "userId"), kind: g(f, "kind"), description: g(f, "description"), amount: Number(g(f, "amount")), currency: g(f, "currency"), dueOn: g(f, "dueOn") }, ctx); ref("/admin/finance"); }, "Invoice created.");
}
export async function recordPaymentAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "finance.manage" }, async (a, ctx) => { await recordPayment(a, g(f, "invoiceId"), { amount: Number(g(f, "amount")), method: g(f, "method"), reference: g(f, "reference"), note: g(f, "note") }, ctx); ref("/admin/finance"); }, "Payment recorded.");
}
export async function voidInvoiceAction(id: string, reason: string, waive: boolean) {
  return action({ role: "staff", perm: "finance.manage" }, async (a, ctx) => { await voidInvoice(a, id, reason, waive, ctx); ref("/admin/finance"); }, "Done.");
}
export async function reportIntegrityAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: ["integrity.manage", "teaching.own", "teaching.any"] }, async (a, ctx) => { await reportIntegrity(a, { studentId: g(f, "studentId"), kind: g(f, "kind"), courseId: g(f, "courseId"), description: g(f, "description") }, ctx); ref("/admin/integrity"); }, "Case reported.");
}
export async function integrityStepAction(id: string, step: "INVESTIGATE" | "DECIDE" | "CLOSE", decision?: string, sanction?: string) {
  return action({ role: "staff", perm: "integrity.manage" }, async (a, ctx) => { await advanceIntegrity(a, id, step, { decision, sanction }, ctx); ref("/admin/integrity"); }, "Updated.");
}

/* ----------------------------------------------------------------- policies */

export async function savePolicyAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: ["policies.manage", "policies.approve"] }, async (a, ctx) => { await savePolicyDraft(a, g(f, "key"), { title: g(f, "title"), body: f.get("body")?.toString() ?? "", changeNote: g(f, "changeNote"), effectiveOn: g(f, "effectiveOn") }, ctx); ref("/admin/policies"); }, "Draft saved for review.");
}
export async function publishPolicyAction(id: string) {
  return action({ role: "staff", perm: "policies.approve" }, async (a, ctx) => { await publishPolicy(a, id, ctx); ref("/", ); ref("/admin/policies"); }, "Published. The previous version is kept in the history.");
}

/* ------------------------------------------------------------- staff & roles */

export async function createStaffAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "users.manage" }, async (a, ctx) => {
    const r = await createStaff(a, { email: g(f, "email"), firstName: g(f, "firstName"), lastName: g(f, "lastName"), phone: g(f, "phone"), roleKeys: f.getAll("roles").map(String), title: g(f, "title"), departmentId: g(f, "departmentId"), rank: g(f, "rank"), publicProfile: f.get("publicProfile") === "on" }, ctx);
    ref("/admin/faculty");
    return r;
  }, "Account created. Copy the temporary password now — it is shown once.");
}
export async function setRolesAction(userId: string, roleKeys: string[]) {
  return action({ role: "staff", perm: "super.roles" }, async (a, ctx) => { await setUserRoles(a, userId, roleKeys, ctx); ref("/admin/faculty"); }, "Roles updated. The user must sign in again.");
}
export async function accountStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED", reason: string) {
  return action({ role: "staff", perm: ["users.manage", "students.status"] }, async (a, ctx) => { await setAccountStatus(a, userId, status, reason, ctx); ref("/admin/faculty"); }, "Done.");
}
export async function resetLinkAction(userId: string) {
  return action({ role: "staff", perm: "users.manage" }, async (a, ctx) => ({ url: await adminResetLink(a, userId, ctx) }), "One-time reset link created.");
}
export async function saveRoleAction(roleId: string, perms: string[]) {
  return action({ role: "staff", perm: "super.roles" }, async (a, ctx) => { await saveRolePermissions(a, roleId, perms, ctx); ref("/admin/roles"); }, "Role saved and audited.");
}
export async function createRoleAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "super.roles" }, async (a, ctx) => { await createRole(a, g(f, "key"), g(f, "name"), g(f, "description"), ctx); ref("/admin/roles"); }, "Role created.");
}
