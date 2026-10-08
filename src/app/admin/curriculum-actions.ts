"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { action, type ActionResult, type Guard } from "@/server/http";
import { addProgrammeCourse, addRelation, removeProgrammeCourse, removeRelation, saveLesson, saveModule, saveWeights } from "@/server/services/curriculum";

const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";
const courseEditors: Guard = { role: "staff", perm: ["courses.manage", "teaching.own"] };

export async function saveWeightsAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "courses.manage" }, async (a, ctx) => {
    await saveWeights(a, g(f, "courseId"), { assignment: Number(g(f, "assignment")), test: Number(g(f, "test")), exam: Number(g(f, "exam")), practical: Number(g(f, "practical")) }, ctx);
    revalidatePath(`/admin/courses/${g(f, "courseId")}`);
  }, "Weights saved.");
}

export async function addRelationAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "courses.manage" }, async (a, ctx) => { await addRelation(a, g(f, "courseId"), g(f, "relatedId"), g(f, "kind") as "PREREQUISITE", ctx); revalidatePath(`/admin/courses/${g(f, "courseId")}`); }, "Added.");
}
export async function removeRelationAction(courseId: string, relatedId: string, kind: string) {
  return action({ role: "staff", perm: "courses.manage" }, async (a, ctx) => { await removeRelation(a, courseId, relatedId, kind, ctx); revalidatePath(`/admin/courses/${courseId}`); }, "Removed.");
}

export async function saveModuleAction(_: ActionResult | null, f: FormData) {
  return action(courseEditors, async (a, ctx) => { await saveModule(a, g(f, "courseId"), { id: g(f, "id") || undefined, title: g(f, "title"), summary: g(f, "summary"), position: Number(g(f, "position") || 99) }, ctx); revalidatePath(`/admin/courses/${g(f, "courseId")}`); }, "Module saved.");
}

export async function saveLessonAction(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  let dest = "";
  const res = await action(courseEditors, async (a, ctx) => {
    const id = await saveLesson(a, g(f, "courseId"), { id: g(f, "id") && g(f, "id") !== "new" ? g(f, "id") : undefined, moduleId: g(f, "moduleId"), title: g(f, "title"), summary: g(f, "summary"), body: f.get("body")?.toString() ?? "", videoUrl: g(f, "videoUrl"), audioUrl: g(f, "audioUrl"), readMinutes: Number(g(f, "readMinutes") || 8), position: Number(g(f, "position") || 0), authority: g(f, "authority") || undefined, status: g(f, "status") || "PUBLISHED" }, ctx);
    dest = `/admin/courses/${g(f, "courseId")}/lesson/${id}?saved=1`;
    revalidatePath("/", "layout");
  }, "Lesson saved.");
  if (res.ok && dest) redirect(dest);
  return res;
}

export async function addProgrammeCourseAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "programmes.manage" }, async (a, ctx) => { await addProgrammeCourse(a, g(f, "programmeId"), g(f, "courseId"), g(f, "kind"), Number(g(f, "year") || 1), Number(g(f, "semester") || 1), ctx); revalidatePath(`/admin/programmes/${g(f, "programmeId")}`); }, "Course added to the programme.");
}
export async function removeProgrammeCourseAction(programmeId: string, courseId: string) {
  return action({ role: "staff", perm: "programmes.manage" }, async (a, ctx) => { await removeProgrammeCourse(a, programmeId, courseId, ctx); revalidatePath(`/admin/programmes/${programmeId}`); }, "Removed.");
}
