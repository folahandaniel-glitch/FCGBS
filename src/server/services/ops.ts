import { and, desc, eq, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { notifyUser } from "./notifications";

/* ============================================================== finance
 * Finance is deliberately separate from academics: nothing here reads or writes results, and finance
 * permissions never include grading (spec §65). Payments are recorded by Finance Officers; online
 * payment is prepared but off until configured (honest — no fake "paid" states). */

export async function createInvoice(actor: Actor, input: { userId: string; kind: string; description: string; amount: number; currency?: string; dueOn?: string }, ctx: ReqCtx) {
  if (!can(actor, "finance.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (!(input.amount > 0)) throw new AppError("VALIDATION", "Enter an amount greater than zero.");
  if (input.description.trim().length < 3) throw new AppError("VALIDATION", "Describe the charge.");
  const number = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const [i] = await getDb().insert(s.invoices).values({ number, userId: input.userId, kind: input.kind, description: input.description.trim(), amount: input.amount, currency: input.currency || "NGN", dueOn: input.dueOn || null, createdBy: actor.id }).returning({ id: s.invoices.id });
  await audit({ actor, action: "finance.invoice_created", entityType: "invoice", entityId: i.id, summary: number, metadata: { amount: input.amount, kind: input.kind } }, ctx);
  return i.id;
}

export async function recordPayment(actor: Actor, invoiceId: string, input: { amount: number; method: string; reference?: string; note?: string }, ctx: ReqCtx) {
  if (!can(actor, "finance.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (!(input.amount > 0)) throw new AppError("VALIDATION", "Enter the amount received.");
  return getDb().transaction(async (tx) => {
    const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, invoiceId)).for("update");
    if (!inv || ["VOID", "WAIVED", "PAID"].includes(inv.status)) throw new AppError("RULE_VIOLATION", "This invoice cannot receive payment.");
    const [{ paid }] = await tx.select({ paid: sql<number>`coalesce(sum(amount),0)::float` }).from(s.payments).where(and(eq(s.payments.invoiceId, invoiceId), eq(s.payments.status, "CONFIRMED")));
    if (paid + input.amount > inv.amount + 0.001) throw new AppError("VALIDATION", `That exceeds the balance (${(inv.amount - paid).toLocaleString()}).`);
    const receiptNo = `RCP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const [p] = await tx.insert(s.payments).values({ invoiceId, receiptNo, amount: input.amount, method: input.method, reference: input.reference, note: input.note, recordedBy: actor.id }).returning({ id: s.payments.id });
    const status = paid + input.amount >= inv.amount - 0.001 ? "PAID" : "PARTIAL";
    await tx.update(s.invoices).set({ status }).where(eq(s.invoices.id, invoiceId));
    await audit({ actor, action: "finance.payment_recorded", entityType: "invoice", entityId: invoiceId, metadata: { amount: input.amount, method: input.method, receiptNo } }, ctx, tx);
    await notifyUser({ userId: inv.userId, category: "ANNOUNCEMENT", title: "Payment received", body: `Receipt ${receiptNo}`, link: "/student" }, tx);
    return p.id;
  });
}

export async function voidInvoice(actor: Actor, invoiceId: string, reason: string, waive: boolean, ctx: ReqCtx) {
  if (!can(actor, "finance.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (reason.trim().length < 5) throw new AppError("VALIDATION", "Record a reason.");
  const [i] = await getDb().update(s.invoices).set({ status: waive ? "WAIVED" : "VOID" }).where(and(eq(s.invoices.id, invoiceId), sql`${s.invoices.status} in ('UNPAID','PARTIAL')`)).returning({ id: s.invoices.id });
  if (!i) throw new AppError("RULE_VIOLATION", "Only open invoices can be voided or waived.");
  await audit({ actor, action: waive ? "finance.invoice_waived" : "finance.invoice_voided", entityType: "invoice", entityId: invoiceId, metadata: { reason } }, ctx);
}

/* ============================================================== integrity */

export async function reportIntegrity(actor: Actor, input: { studentId: string; kind: string; courseId?: string; description: string }, ctx: ReqCtx) {
  if (!can(actor, "integrity.manage") && !can(actor, "teaching.own") && !can(actor, "teaching.any")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (input.description.trim().length < 20) throw new AppError("VALIDATION", "Describe what happened (at least 20 characters).");
  const caseNo = `IC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const [c] = await getDb().insert(s.integrityCases).values({ caseNo, kind: input.kind, studentId: input.studentId, courseId: input.courseId || null, reportedBy: actor.id, description: input.description.trim() }).returning({ id: s.integrityCases.id });
  await audit({ actor, action: "integrity.reported", entityType: "integrity_case", entityId: c.id, summary: caseNo }, ctx);
  return c.id;
}

export async function advanceIntegrity(actor: Actor, caseId: string, step: "INVESTIGATE" | "DECIDE" | "CLOSE", input: { note?: string; decision?: string; sanction?: string }, ctx: ReqCtx) {
  if (!can(actor, "integrity.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const [c] = await getDb().select().from(s.integrityCases).where(eq(s.integrityCases.id, caseId));
  if (!c) throw new AppError("NOT_FOUND", "Case not found.");
  if (step === "INVESTIGATE") {
    if (c.status !== "REPORTED") throw new AppError("RULE_VIOLATION", "Only a newly reported case can be opened for investigation.");
    await getDb().update(s.integrityCases).set({ status: "INVESTIGATING", investigatorId: actor.id }).where(eq(s.integrityCases.id, caseId));
  } else if (step === "DECIDE") {
    if (c.status !== "INVESTIGATING" && c.status !== "APPEALED") throw new AppError("RULE_VIOLATION", "Investigate the case before deciding.");
    if (c.investigatorId === actor.id && c.status === "APPEALED") throw new AppError("RULE_VIOLATION", "An appeal must be decided by someone other than the investigator.");
    if (!input.decision?.trim()) throw new AppError("VALIDATION", "Record the decision and reasons.");
    await getDb().update(s.integrityCases).set(c.status === "APPEALED" ? { appealDecision: input.decision, status: "CLOSED" } : { status: "DECIDED", decision: input.decision, sanction: input.sanction || null, decidedBy: actor.id, decidedAt: new Date() }).where(eq(s.integrityCases.id, caseId));
  } else {
    if (c.status !== "DECIDED") throw new AppError("RULE_VIOLATION", "Only decided cases can be closed.");
    await getDb().update(s.integrityCases).set({ status: "CLOSED" }).where(eq(s.integrityCases.id, caseId));
  }
  await audit({ actor, action: `integrity.${step.toLowerCase()}`, entityType: "integrity_case", entityId: caseId, metadata: { note: input.note, decision: input.decision, sanction: input.sanction } }, ctx);
}

export async function decideAppeal(actor: Actor, appealId: string, uphold: boolean, note: string, ctx: ReqCtx) {
  if (!can(actor, "appeals.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (note.trim().length < 5) throw new AppError("VALIDATION", "Record the Board's reasons.");
  const [a] = await getDb().update(s.academicAppeals).set({ status: uphold ? "UPHELD" : "DISMISSED", decidedBy: actor.id, decisionNote: note, decidedAt: new Date() }).where(and(eq(s.academicAppeals.id, appealId), sql`${s.academicAppeals.status} in ('SUBMITTED','UNDER_REVIEW')`)).returning({ id: s.academicAppeals.id, studentId: s.academicAppeals.studentId });
  if (!a) throw new AppError("RULE_VIOLATION", "This appeal has already been decided.");
  await getDb().insert(s.boardDecisions).values({ kind: "APPEAL", refType: "appeal", refId: a.id, title: "Academic appeal", decision: uphold ? "APPROVED" : "REJECTED", notes: note, decidedBy: actor.id });
  await audit({ actor, action: uphold ? "appeal.upheld" : "appeal.dismissed", entityType: "appeal", entityId: a.id, metadata: { note } }, ctx);
  const [st] = await getDb().select({ userId: s.students.userId }).from(s.students).where(eq(s.students.id, a.studentId));
  if (st) await notifyUser({ userId: st.userId, category: "RESULT", title: `Your appeal was ${uphold ? "upheld" : "not upheld"}`, body: uphold ? "The Registrar will process a corrected result through the amendment process." : note, link: "/student/results" });
}

/* ============================================================== policies (versioned) */

export async function savePolicyDraft(actor: Actor, key: string, input: { title: string; body: string; changeNote: string; effectiveOn?: string }, ctx: ReqCtx) {
  if (!can(actor, "policies.manage") && !can(actor, "policies.approve")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (input.body.trim().length < 20) throw new AppError("VALIDATION", "Write the policy text.");
  if (input.changeNote.trim().length < 3) throw new AppError("VALIDATION", "Record what changed.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(s.policies).where(and(eq(s.policies.key, key), eq(s.policies.isCurrent, true)));
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(version),0)::int` }).from(s.policies).where(eq(s.policies.key, key));
    const [p] = await tx.insert(s.policies).values({ key, title: input.title.trim(), body: input.body, version: max + 1, status: "REVIEW", changeNote: input.changeNote, effectiveOn: input.effectiveOn || null, authorId: actor.id, previousId: cur?.id ?? null }).returning({ id: s.policies.id, version: s.policies.version });
    await audit({ actor, action: "policy.draft_saved", entityType: "policy", entityId: p.id, summary: `${key} v${p.version}` }, ctx, tx);
    return p.id;
  });
}

/** Publishing doctrine/policy needs `policies.approve` and a different person from the author where possible; the previous version is kept, never overwritten. */
export async function publishPolicy(actor: Actor, policyId: string, ctx: ReqCtx) {
  if (!can(actor, "policies.approve")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().transaction(async (tx) => {
    const [p] = await tx.select().from(s.policies).where(eq(s.policies.id, policyId)).for("update");
    if (!p || p.status !== "REVIEW") throw new AppError("RULE_VIOLATION", "Only a policy in review can be published.");
    if (p.authorId === actor.id && actor.userType !== "SUPER_ADMIN") throw new AppError("RULE_VIOLATION", "A policy must be approved by someone other than its author.");
    await tx.update(s.policies).set({ isCurrent: false }).where(and(eq(s.policies.key, p.key), eq(s.policies.isCurrent, true)));
    await tx.update(s.policies).set({ status: "PUBLISHED", isCurrent: true, approvedBy: actor.id, approvedAt: new Date(), effectiveOn: p.effectiveOn ?? new Date().toISOString().slice(0, 10) }).where(eq(s.policies.id, policyId));
    await tx.insert(s.boardDecisions).values({ kind: "POLICY", refType: "policy", refId: p.id, title: `${p.title} v${p.version}`, decision: "APPROVED", decidedBy: actor.id });
    await audit({ actor, action: "policy.published", entityType: "policy", entityId: p.id, summary: `${p.key} v${p.version}`, metadata: { approver: actor.id, previous: p.previousId } }, ctx, tx);
  });
}

export async function policyHistory(key: string) {
  return getDb().select().from(s.policies).where(eq(s.policies.key, key)).orderBy(desc(s.policies.version));
}
