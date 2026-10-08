"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { readFormFile } from "@/server/files";
import { storeAsset } from "@/server/services/assets";
import { registerForOfferings, dropRegistration } from "@/server/services/academics";
import { saveAnswers, startAttempt, submitAssignment, submitAttempt } from "@/server/services/assessments";
import { completeLesson, learnerContext, submitAppeal } from "@/server/services/learner";
import { addFormationEntry, logActivity, proposePlacement, startResearch, submitResearchStage, addEvaluation } from "@/server/services/formation";
import { markAllRead } from "@/server/services/notifications";
import { createEvaluation } from "@/server/services/quality";

const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";

export async function registerCoursesAction(offeringIds: string[]) {
  return action({ role: "learner" }, async (a, ctx) => {
    const lc = await learnerContext(a.id);
    if (!lc?.primary) throw new AppError("NOT_FOUND", "No active enrolment.");
    await registerForOfferings(a, lc.primary.e.id, offeringIds, ctx);
    revalidatePath("/student", "layout");
  }, "Courses registered.");
}

export async function dropCourseAction(registrationId: string) {
  return action({ role: "learner" }, async (a, ctx) => { await dropRegistration(a, registrationId, ctx); revalidatePath("/student", "layout"); }, "Course dropped.");
}

export async function completeLessonAction(lessonId: string) {
  return action({ role: "learner" }, async (a) => { await completeLesson(a, lessonId); revalidatePath("/student", "layout"); }, "Marked as complete.");
}

export async function submitAssignmentAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => {
    let assetId: string | undefined;
    const file = f.get("file");
    if (file && typeof file !== "string" && (file as File).size > 0) assetId = (await storeAsset(a, await readFormFile(f), "SUBMISSION", ctx)).id;
    await submitAssignment(a, g(f, "assessmentId"), { text: g(f, "text"), assetId, aiUsed: f.get("aiUsed") === "on", aiDisclosure: g(f, "aiDisclosure") }, ctx);
    revalidatePath("/student", "layout");
  }, "Submitted.");
}

export async function startExamAction(assessmentId: string) {
  return action({ role: "learner" }, async (a, ctx) => ({ attemptId: await startAttempt(a, assessmentId, ctx) }));
}
export async function saveExamAction(attemptId: string, answers: Record<string, unknown>, events: { t: string }[]) {
  return action({ role: "learner" }, async (a, ctx) => { await saveAnswers(a, attemptId, answers, events, ctx); });
}
export async function submitExamAction(attemptId: string) {
  return action({ role: "learner" }, async (a, ctx) => { await submitAttempt(a, attemptId, ctx); revalidatePath("/student", "layout"); }, "Examination submitted.");
}

export async function appealAction(resultId: string, reason: string) {
  return action({ role: "learner" }, async (a, ctx) => { await submitAppeal(a, resultId, reason, ctx); }, "Appeal submitted to the Academic Board.");
}

export async function logActivityAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => {
    await logActivity(a, { kind: g(f, "kind"), activityOn: g(f, "activityOn"), hours: Number(g(f, "hours")), description: g(f, "description"), reflection: g(f, "reflection"), placementId: g(f, "placementId") }, ctx);
    revalidatePath("/student/ministry");
  }, "Activity recorded. It counts once your mentor verifies it.");
}

export async function proposePlacementAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => {
    await proposePlacement(a, { kind: g(f, "kind"), organisation: g(f, "organisation"), location: g(f, "location"), supervisorName: g(f, "supervisorName"), supervisorContact: g(f, "supervisorContact"), startsOn: g(f, "startsOn"), endsOn: g(f, "endsOn"), hoursRequired: Number(g(f, "hoursRequired") || 0) }, ctx);
    revalidatePath("/student/ministry");
  }, "Placement proposed for approval.");
}

export async function reflectPlacementAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => { await addEvaluation(a, g(f, "placementId"), { kind: "STUDENT_REFLECTION", ratings: {}, narrative: g(f, "narrative") }, ctx); revalidatePath("/student/ministry"); }, "Reflection saved.");
}

export async function formationAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => {
    await addFormationEntry(a, { kind: g(f, "kind"), reflection: g(f, "reflection"), entryOn: g(f, "entryOn"), share: f.get("share") === "on" }, ctx);
    revalidatePath("/student/formation");
  }, "Reflection saved.");
}

export async function startResearchAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => { await startResearch(a, g(f, "title"), g(f, "abstract"), ctx); revalidatePath("/student/research"); }, "Research topic registered.");
}

export async function researchSubmitAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => {
    let assetId: string | undefined;
    const file = f.get("file");
    if (file && typeof file !== "string" && (file as File).size > 0) assetId = (await storeAsset(a, await readFormFile(f), "SUBMISSION", ctx)).id;
    await submitResearchStage(a, g(f, "projectId"), { stage: g(f, "stage"), title: g(f, "title"), body: g(f, "body"), assetId, aiDisclosure: g(f, "aiDisclosure") }, ctx);
    revalidatePath("/student/research");
  }, "Submitted.");
}

export async function markNotificationsReadAction() {
  return action({ role: "any" }, async (a) => { await markAllRead(a.id); revalidatePath("/student", "layout"); });
}

export async function evaluateCourseAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a, ctx) => { await createEvaluation(a, { offeringId: g(f, "offeringId"), rating: Number(g(f, "rating")), comment: g(f, "comment") }, ctx); revalidatePath("/student", "layout"); }, "Thank you for your feedback.");
}

export async function updateProfileAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner" }, async (a) => {
    const lc = await learnerContext(a.id);
    if (!lc) throw new AppError("NOT_FOUND", "Profile not found.");
    await getDb().update(s.students).set({ address: g(f, "address") || null, emergencyContact: { name: g(f, "ecName"), relationship: g(f, "ecRel"), phone: g(f, "ecPhone") } }).where(eq(s.students.id, lc.student.id));
    await getDb().update(s.users).set({ phone: g(f, "phone") || null, updatedAt: new Date() }).where(eq(s.users.id, a.id));
    revalidatePath("/student/profile");
  }, "Profile updated.");
}
