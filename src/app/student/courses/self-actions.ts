"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { cancelRequest, claimFreeCertificate, requestEnrolment } from "@/server/services/selfservice";

export async function chooseFreeCertificateAction(programmeId: string) {
  return action({ role: "any", access: "COURSES" }, async (a, ctx) => {
    const r = await claimFreeCertificate(a, programmeId, ctx);
    revalidatePath("/student", "layout");
    return r;
  }, "Your free certificate programme is ready. Welcome!");
}

export async function requestEnrolmentAction(_: ActionResult | null, f: FormData) {
  return action({ role: "any", access: "COURSES" }, async (a, ctx) => {
    const r = await requestEnrolment(a, { programmeIds: f.getAll("programmeIds").map(String), courseIds: f.getAll("courseIds").map(String) }, String(f.get("note") ?? ""), ctx);
    revalidatePath("/student/courses/explore");
    return r;
  }, "Request sent. Please contact the school office so it can be approved.");
}

export async function cancelRequestAction(id: string) {
  return action({ role: "any", access: "COURSES" }, async (a, ctx) => { await cancelRequest(a, id, ctx); revalidatePath("/student/courses/explore"); }, "Request cancelled.");
}
