import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { notifyUser } from "./notifications";

export const ACTIVITY_KINDS = ["EVANGELISM", "MISSIONS", "PRAYER", "TEACHING", "PASTORAL", "OUTREACH", "COMMUNITY", "LEADERSHIP", "MENTORSHIP", "OTHER"] as const;
export const PLACEMENT_KINDS = ["LOCAL_CHURCH", "MISSION_FIELD", "EVANGELISM", "CHRISTIAN_ORG", "COMMUNITY_PROJECT", "TEACHING", "PASTORAL", "YOUTH", "CHILDREN", "MEDIA", "MISSIONS_ORG"] as const;
export const FORMATION_KINDS = ["PRAYER", "BIBLE_STUDY", "DISCIPLESHIP", "FELLOWSHIP", "EVANGELISM", "SERVICE", "CHARACTER", "MENTORSHIP"] as const;
export const COMPETENCIES = ["Preaching/teaching", "Pastoral care", "Evangelism", "Leadership", "Reliability and faithfulness", "Character and integrity", "Teamwork", "Receiving feedback"] as const;

async function studentOf(userId: string) {
  const [st] = await getDb().select().from(s.students).where(eq(s.students.userId, userId));
  if (!st) throw new AppError("FORBIDDEN", "Only students have a ministry formation profile.");
  return st;
}

/** Staff scope for ministry records: ministry.view/manage see all; a mentor sees only students assigned to them. */
export async function mentorCanSee(actor: Actor, studentId: string) {
  if (can(actor, "ministry.manage") || can(actor, "ministry.view")) return true;
  const [m] = await getDb().select({ x: s.mentorAssignments.studentId }).from(s.mentorAssignments).where(and(eq(s.mentorAssignments.mentorId, actor.id), eq(s.mentorAssignments.studentId, studentId), eq(s.mentorAssignments.active, true)));
  return Boolean(m);
}

export async function proposePlacement(actor: Actor, input: { kind: string; organisation: string; location?: string; supervisorName?: string; supervisorContact?: string; startsOn?: string; endsOn?: string; hoursRequired?: number }, ctx: ReqCtx) {
  const st = await studentOf(actor.id);
  if (!PLACEMENT_KINDS.includes(input.kind as never)) throw new AppError("VALIDATION", "Choose a placement type.");
  if (input.organisation.trim().length < 2) throw new AppError("VALIDATION", "Enter the church or organisation.");
  const [en] = await getDb().select({ id: s.enrolments.id }).from(s.enrolments).where(and(eq(s.enrolments.studentId, st.id), eq(s.enrolments.status, "ACTIVE"))).limit(1);
  const [p] = await getDb().insert(s.ministryPlacements).values({ studentId: st.id, enrolmentId: en?.id, kind: input.kind, organisation: input.organisation.trim(), location: input.location, supervisorName: input.supervisorName, supervisorContact: input.supervisorContact, startsOn: input.startsOn || null, endsOn: input.endsOn || null, hoursRequired: input.hoursRequired ?? 0, createdBy: actor.id }).returning({ id: s.ministryPlacements.id });
  await audit({ actor, action: "ministry.placement_proposed", entityType: "placement", entityId: p.id }, ctx);
  return p.id;
}

export async function setPlacementStatus(actor: Actor, placementId: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED", opts: { outcome?: string; note?: string; mentorId?: string }, ctx: ReqCtx) {
  const [p] = await getDb().select().from(s.ministryPlacements).where(eq(s.ministryPlacements.id, placementId));
  if (!p) throw new AppError("NOT_FOUND", "Placement not found.");
  if (!can(actor, "ministry.manage") && !(await mentorCanSee(actor, p.studentId))) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (status === "COMPLETED" && !["PASS", "NOT_YET_COMPETENT"].includes(opts.outcome ?? "")) throw new AppError("VALIDATION", "Record the outcome (pass or not yet competent) — it is never decided automatically.");
  await getDb().update(s.ministryPlacements).set({ status, finalOutcome: opts.outcome, finalNote: opts.note, ...(opts.mentorId ? { mentorId: opts.mentorId } : {}) }).where(eq(s.ministryPlacements.id, placementId));
  await audit({ actor, action: `ministry.placement_${status.toLowerCase()}`, entityType: "placement", entityId: placementId, metadata: { outcome: opts.outcome, note: opts.note } }, ctx);
}

export async function logActivity(actor: Actor, input: { kind: string; activityOn: string; hours: number; description: string; reflection?: string; placementId?: string }, ctx: ReqCtx) {
  const st = await studentOf(actor.id);
  if (!ACTIVITY_KINDS.includes(input.kind as never)) throw new AppError("VALIDATION", "Choose an activity type.");
  if (!(input.hours > 0 && input.hours <= 24)) throw new AppError("VALIDATION", "Hours must be between 0 and 24.");
  if (input.description.trim().length < 10) throw new AppError("VALIDATION", "Describe what you did (at least 10 characters).");
  if (new Date(input.activityOn) > new Date()) throw new AppError("VALIDATION", "The date cannot be in the future.");
  const [a] = await getDb().insert(s.ministryActivities).values({ studentId: st.id, kind: input.kind, activityOn: input.activityOn, hours: input.hours, description: input.description.trim(), reflection: input.reflection?.trim() || null, placementId: input.placementId || null }).returning({ id: s.ministryActivities.id });
  await audit({ actor, action: "ministry.activity_logged", entityType: "activity", entityId: a.id }, ctx);
  return a.id;
}

/** Verification by a mentor/ministry officer — hours count toward graduation only once verified, and never self-verified. */
export async function verifyActivity(actor: Actor, activityId: string, ok: boolean, note: string, ctx: ReqCtx) {
  const [a] = await getDb().select({ a: s.ministryActivities, userId: s.students.userId }).from(s.ministryActivities).innerJoin(s.students, eq(s.students.id, s.ministryActivities.studentId)).where(eq(s.ministryActivities.id, activityId));
  if (!a) throw new AppError("NOT_FOUND", "Activity not found.");
  if (a.userId === actor.id) throw new AppError("RULE_VIOLATION", "You cannot verify your own activity.");
  if (!(await mentorCanSee(actor, a.a.studentId)) || !(can(actor, "ministry.manage") || can(actor, "ministry.mentor"))) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().update(s.ministryActivities).set({ status: ok ? "VERIFIED" : "RETURNED", verifiedBy: actor.id, verifiedAt: new Date(), verifierNote: note }).where(eq(s.ministryActivities.id, activityId));
  await audit({ actor, action: ok ? "ministry.activity_verified" : "ministry.activity_returned", entityType: "activity", entityId: activityId, metadata: { hours: a.a.hours, note } }, ctx);
  await notifyUser({ userId: a.userId, category: "PRACTICUM", title: ok ? "Ministry activity verified" : "Ministry activity returned", body: note || undefined, link: "/student/ministry" });
}

export async function addEvaluation(actor: Actor, placementId: string, input: { kind: "SUPERVISOR" | "STUDENT_REFLECTION" | "FINAL"; ratings: Record<string, string>; narrative: string; recommendation?: string }, ctx: ReqCtx) {
  const [p] = await getDb().select({ p: s.ministryPlacements, userId: s.students.userId }).from(s.ministryPlacements).innerJoin(s.students, eq(s.students.id, s.ministryPlacements.studentId)).where(eq(s.ministryPlacements.id, placementId));
  if (!p) throw new AppError("NOT_FOUND", "Placement not found.");
  if (input.kind === "STUDENT_REFLECTION") { if (p.userId !== actor.id) throw new AppError("FORBIDDEN", "Only the student can write a reflection."); }
  else if (!(await mentorCanSee(actor, p.p.studentId)) || !(can(actor, "ministry.manage") || can(actor, "ministry.mentor"))) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const levels = new Set(["EMERGING", "DEVELOPING", "COMPETENT", "STRONG"]);
  for (const v of Object.values(input.ratings)) if (!levels.has(v)) throw new AppError("VALIDATION", "Ratings must be Emerging, Developing, Competent or Strong.");
  if (input.narrative.trim().length < 20) throw new AppError("VALIDATION", "Please write a narrative of at least 20 characters.");
  await getDb().insert(s.practicumEvaluations).values({ placementId, kind: input.kind, evaluatorId: actor.id, evaluatorName: actor.name, ratings: input.ratings, narrative: input.narrative, recommendation: input.recommendation });
  await audit({ actor, action: "ministry.evaluation_added", entityType: "placement", entityId: placementId, metadata: { kind: input.kind } }, ctx);
}

export async function assignMentor(actor: Actor, mentorId: string, studentId: string, ctx: ReqCtx) {
  if (!can(actor, "ministry.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().insert(s.mentorAssignments).values({ mentorId, studentId }).onConflictDoUpdate({ target: [s.mentorAssignments.mentorId, s.mentorAssignments.studentId], set: { active: true } });
  await audit({ actor, action: "ministry.mentor_assigned", entityType: "student", entityId: studentId, metadata: { mentorId } }, ctx);
}

/* ---------------------------------------------------------------- spiritual formation */

export async function addFormationEntry(actor: Actor, input: { kind: string; reflection: string; entryOn?: string; share?: boolean }, ctx: ReqCtx) {
  const st = await studentOf(actor.id);
  if (!FORMATION_KINDS.includes(input.kind as never)) throw new AppError("VALIDATION", "Choose a category.");
  if (input.reflection.trim().length < 10) throw new AppError("VALIDATION", "Write a short reflection (at least 10 characters).");
  const [m] = await getDb().select({ id: s.mentorAssignments.mentorId }).from(s.mentorAssignments).where(and(eq(s.mentorAssignments.studentId, st.id), eq(s.mentorAssignments.active, true))).limit(1);
  const [e] = await getDb().insert(s.formationEntries).values({ studentId: st.id, kind: input.kind, reflection: input.reflection.trim(), entryOn: input.entryOn || new Date().toISOString().slice(0, 10), sharedWithMentor: Boolean(input.share && m), mentorId: input.share ? (m?.id ?? null) : null }).returning({ id: s.formationEntries.id });
  await audit({ actor, action: "formation.entry_added", entityType: "formation_entry", entityId: e.id }, ctx); // never logs the reflection text
  return e.id;
}

/** A mentor sees only entries the student chose to share, and only for students assigned to that mentor. */
export async function sharedEntriesForMentor(actor: Actor, studentId: string) {
  if (!(await mentorCanSee(actor, studentId)) || !can(actor, "ministry.mentor")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  return getDb().select().from(s.formationEntries).where(and(eq(s.formationEntries.studentId, studentId), eq(s.formationEntries.sharedWithMentor, true))).orderBy(desc(s.formationEntries.entryOn));
}

export async function respondToEntry(actor: Actor, entryId: string, response: string, ctx: ReqCtx) {
  const [e] = await getDb().select().from(s.formationEntries).where(eq(s.formationEntries.id, entryId));
  if (!e || !e.sharedWithMentor) throw new AppError("NOT_FOUND", "Entry not found.");
  if (!can(actor, "ministry.mentor") || !(await mentorCanSee(actor, e.studentId))) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (response.trim().length < 3) throw new AppError("VALIDATION", "Write a response.");
  await getDb().update(s.formationEntries).set({ mentorResponse: response.trim(), respondedAt: new Date(), mentorId: actor.id }).where(eq(s.formationEntries.id, entryId));
  await audit({ actor, action: "formation.mentor_responded", entityType: "formation_entry", entityId: entryId }, ctx);
}

/* ------------------------------------------------------------------------- research */

const NEXT_STATUS: Record<string, string[]> = {
  TOPIC: ["PROPOSAL"], PROPOSAL: ["APPROVED_PROPOSAL", "TOPIC"], APPROVED_PROPOSAL: ["IN_PROGRESS"], IN_PROGRESS: ["FINAL_SUBMITTED"], FINAL_SUBMITTED: ["VIVA", "ASSESSED", "IN_PROGRESS"], VIVA: ["ASSESSED"], ASSESSED: ["APPROVED", "IN_PROGRESS", "REJECTED"], APPROVED: ["ARCHIVED"],
};

export async function startResearch(actor: Actor, title: string, abstract: string, ctx: ReqCtx) {
  const st = await studentOf(actor.id);
  if (title.trim().length < 8) throw new AppError("VALIDATION", "Enter a research topic (at least 8 characters).");
  const [en] = await getDb().select({ id: s.enrolments.id }).from(s.enrolments).where(and(eq(s.enrolments.studentId, st.id), eq(s.enrolments.status, "ACTIVE"))).limit(1);
  const [p] = await getDb().insert(s.researchProjects).values({ studentId: st.id, enrolmentId: en?.id, title: title.trim(), abstract }).returning({ id: s.researchProjects.id });
  await audit({ actor, action: "research.started", entityType: "research", entityId: p.id }, ctx);
  return p.id;
}

export async function submitResearchStage(actor: Actor, projectId: string, input: { stage: string; title: string; body?: string; assetId?: string; aiDisclosure?: string }, ctx: ReqCtx) {
  const [p] = await getDb().select({ p: s.researchProjects, userId: s.students.userId }).from(s.researchProjects).innerJoin(s.students, eq(s.students.id, s.researchProjects.studentId)).where(eq(s.researchProjects.id, projectId));
  if (!p || p.userId !== actor.id) throw new AppError("NOT_FOUND", "Project not found.");
  if (!["PROPOSAL", "LITERATURE_REVIEW", "CHAPTER", "DRAFT", "FINAL"].includes(input.stage)) throw new AppError("VALIDATION", "Choose a stage.");
  if (!input.body?.trim() && !input.assetId) throw new AppError("VALIDATION", "Write your submission or attach a file.");
  await getDb().insert(s.researchSubmissions).values({ projectId, stage: input.stage, title: input.title || input.stage, body: input.body, assetId: input.assetId, aiDisclosure: input.aiDisclosure });
  const next = input.stage === "PROPOSAL" ? "PROPOSAL" : input.stage === "FINAL" ? "FINAL_SUBMITTED" : null;
  if (next && NEXT_STATUS[p.p.status]?.includes(next)) await getDb().update(s.researchProjects).set({ status: next, updatedAt: new Date() }).where(eq(s.researchProjects.id, projectId));
  await audit({ actor, action: "research.submitted", entityType: "research", entityId: projectId, metadata: { stage: input.stage } }, ctx);
}

export async function advanceResearch(actor: Actor, projectId: string, to: string, ctx: ReqCtx, opts: { note?: string; score?: number; grade?: string; supervisorId?: string } = {}) {
  const [p] = await getDb().select().from(s.researchProjects).where(eq(s.researchProjects.id, projectId));
  if (!p) throw new AppError("NOT_FOUND", "Project not found.");
  const supervisor = p.supervisorId === actor.id && can(actor, "research.supervise");
  if (!supervisor && !can(actor, "research.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  if (!(NEXT_STATUS[p.status] ?? []).includes(to)) throw new AppError("RULE_VIOLATION", `A project that is ${p.status.toLowerCase().replace(/_/g, " ")} cannot move to ${to.toLowerCase().replace(/_/g, " ")}.`);
  if (["APPROVED", "ARCHIVED", "REJECTED"].includes(to) && !can(actor, "research.manage")) throw new AppError("FORBIDDEN", "Only research administration can approve or archive a project.");
  await getDb().update(s.researchProjects).set({ status: to, assessmentNote: opts.note ?? p.assessmentNote, ...(opts.score !== undefined ? { score: opts.score, grade: opts.grade } : {}), ...(to === "APPROVED" ? { approvedBy: actor.id } : {}), ...(to === "ARCHIVED" ? { archivedAt: new Date() } : {}), updatedAt: new Date() }).where(eq(s.researchProjects.id, projectId));
  await audit({ actor, action: `research.${to.toLowerCase()}`, entityType: "research", entityId: projectId, metadata: { from: p.status, note: opts.note } }, ctx);
}

export async function giveResearchFeedback(actor: Actor, submissionId: string, feedback: string, ctx: ReqCtx) {
  const [r] = await getDb().select({ sub: s.researchSubmissions, p: s.researchProjects }).from(s.researchSubmissions).innerJoin(s.researchProjects, eq(s.researchProjects.id, s.researchSubmissions.projectId)).where(eq(s.researchSubmissions.id, submissionId));
  if (!r) throw new AppError("NOT_FOUND", "Submission not found.");
  if (!(r.p.supervisorId === actor.id && can(actor, "research.supervise")) && !can(actor, "research.manage")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await getDb().update(s.researchSubmissions).set({ feedback, feedbackBy: actor.id, feedbackAt: new Date() }).where(eq(s.researchSubmissions.id, submissionId));
  await audit({ actor, action: "research.feedback", entityType: "research", entityId: r.p.id }, ctx);
}

void inArray; void sql;
