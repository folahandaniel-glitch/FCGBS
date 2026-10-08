"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { blockUser, createPost, moderate, reportPost, type Scope } from "@/server/services/community";

const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";

export async function postAction(_: ActionResult | null, f: FormData) {
  return action({ role: "learner", access: "COMMUNITY" }, async (a, ctx) => { await createPost(a, { scope: g(f, "scope") as Scope, courseId: g(f, "courseId") || undefined, parentId: g(f, "parentId") || undefined, body: g(f, "body") }, ctx); revalidatePath("/student/community"); }, "Posted.");
}
export async function reportAction(postId: string, reason: string) {
  return action({ role: "any", access: "COMMUNITY" }, async (a, ctx) => { await reportPost(a, postId, reason, ctx); }, "Thank you — moderators will review it.");
}
export async function blockAction(userId: string) {
  return action({ role: "learner", access: "COMMUNITY" }, async (a) => { await blockUser(a, userId); revalidatePath("/student/community"); }, "Blocked.");
}
export async function moderateAction(reportId: string, act: "HIDE" | "DISMISS") {
  return action({ role: "staff", perm: "community.moderate" }, async (a, ctx) => { await moderate(a, reportId, act, ctx); revalidatePath("/admin/community"); }, "Done.");
}
