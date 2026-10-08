"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult, type Guard } from "@/server/http";
import { advanceResults, computeOfferingResults, setDraftComponents } from "@/server/services/academics";
import { gradeAttemptManual, gradeSubmission, publishAssessment, saveAssessment } from "@/server/services/assessments";
import { addQuestion, reviewQuestion, takeAttendance } from "@/server/services/teaching";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { assertCanTeach } from "@/server/services/academics";
import { audit } from "@/server/audit";

const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";
const dt = (v: string) => (v ? new Date(v) : null);
const guard: Guard = { role: "staff", perm: ["teaching.own", "teaching.any"] };

export async function createAssessmentAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => {
    await saveAssessment(a, { offeringId: g(f, "offeringId"), kind: g(f, "kind") as "ASSIGNMENT", title: g(f, "title"), instructions: g(f, "instructions"), maxScore: Number(g(f, "maxScore") || 100), opensAt: dt(g(f, "opensAt")), dueAt: dt(g(f, "dueAt")), closesAt: dt(g(f, "closesAt")), timeLimitMin: g(f, "timeLimitMin") ? Number(g(f, "timeLimitMin")) : null, maxAttempts: Number(g(f, "maxAttempts") || 1), drawCount: g(f, "drawCount") ? Number(g(f, "drawCount")) : undefined, lateAllowed: f.get("lateAllowed") === "on", latePenaltyPct: Number(g(f, "latePenaltyPct") || 10), resubmission: f.get("resubmission") === "on", aiPolicy: g(f, "aiPolicy") || "DISCLOSE" }, ctx);
    revalidatePath(`/teach/${g(f, "offeringId")}`);
  }, "Assessment saved as draft.");
}

export async function publishAssessmentAction(assessmentId: string, offeringId: string) {
  return action(guard, async (a, ctx) => { await publishAssessment(a, assessmentId, ctx); revalidatePath(`/teach/${offeringId}`); }, "Published to students.");
}

export async function gradeSubmissionAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => { await gradeSubmission(a, g(f, "submissionId"), Number(g(f, "score")), g(f, "feedback"), ctx); revalidatePath("/teach", "layout"); }, "Graded.");
}

export async function gradeAttemptAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => {
    const manual: Record<string, number> = {};
    for (const [k, v] of f.entries()) if (k.startsWith("m_") && String(v) !== "") manual[k.slice(2)] = Number(v);
    await gradeAttemptManual(a, g(f, "attemptId"), manual, ctx);
    revalidatePath("/teach", "layout");
  }, "Marks saved.");
}

export async function attendanceAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => {
    const marks: Record<string, string> = {};
    for (const [k, v] of f.entries()) if (k.startsWith("a_")) marks[k.slice(2)] = String(v);
    await takeAttendance(a, g(f, "offeringId"), g(f, "heldOn"), g(f, "kind") || "LECTURE", g(f, "topic"), marks, ctx);
    revalidatePath(`/teach/${g(f, "offeringId")}`);
  }, "Attendance recorded.");
}

export async function computeResultsAction(offeringId: string) {
  return action(guard, async (a, ctx) => ({ n: await computeOfferingResults(a, offeringId, ctx) }), "Results calculated.");
}

export async function setComponentsAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => {
    const num = (k: string) => (g(f, k) === "" ? null : Number(g(f, k)));
    await setDraftComponents(a, g(f, "resultId"), { assignment: num("assignment"), test: num("test"), exam: num("exam"), practical: num("practical") }, ctx);
    revalidatePath("/teach", "layout");
  }, "Saved.");
}

export async function submitResultsAction(resultIds: string[], offeringId: string) {
  return action({ role: "staff", perm: "grades.enter" }, async (a, ctx) => { const n = await advanceResults(a, resultIds, "SUBMIT", ctx); revalidatePath(`/teach/${offeringId}`); return { n }; }, "Results submitted for review.");
}

export async function addQuestionAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: ["questions.manage", "questions.approve"] }, async (a, ctx) => {
    await addQuestion(a, g(f, "courseId"), { type: g(f, "type") as "MCQ", stem: g(f, "stem"), options: [g(f, "o1"), g(f, "o2"), g(f, "o3"), g(f, "o4")], answer: g(f, "answer"), marks: Number(g(f, "marks") || 1) }, ctx);
    revalidatePath(`/teach/questions/${g(f, "courseId")}`);
  }, "Question added.");
}

export async function reviewQuestionAction(questionId: string, approve: boolean, courseId: string) {
  return action({ role: "staff", perm: "questions.approve" }, async (a, ctx) => { await reviewQuestion(a, questionId, approve, ctx); revalidatePath(`/teach/questions/${courseId}`); });
}

export async function setMeetingUrlAction(_: ActionResult | null, f: FormData) {
  return action(guard, async (a, ctx) => {
    const id = g(f, "offeringId");
    await assertCanTeach(a, id);
    const url = g(f, "url");
    if (url && !/^https:\/\//.test(url)) throw new Error("Use an https link.");
    await getDb().update(s.offerings).set({ meetingUrl: url || null }).where(eq(s.offerings.id, id));
    await audit({ actor: a, action: "offering.meeting_url", entityType: "offering", entityId: id }, ctx);
    revalidatePath(`/teach/${id}`);
  }, "Saved.");
}

export async function mentorRespondAction(_: ActionResult | null, f: FormData) {
  const { respondToEntry } = await import("@/server/services/formation");
  return action({ role: "staff", perm: "ministry.mentor" }, async (a, ctx) => { await respondToEntry(a, g(f, "entryId"), g(f, "response"), ctx); revalidatePath("/teach/mentees"); }, "Response sent.");
}
