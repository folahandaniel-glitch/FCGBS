"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/http";
import { decideRequest, pendingRequests } from "@/server/services/selfservice";

export async function decideRequestAction(id: string, decision: "APPROVE" | "REJECT", note: string) {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => { await decideRequest(a, id, decision, note, ctx); revalidatePath("/admin/requests"); }, decision === "APPROVE" ? "Approved and opened for the learner." : "Declined.");
}

export async function approveAllRequestsAction() {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => {
    let done = 0;
    for (const r of await pendingRequests("PENDING")) { await decideRequest(a, r.id, "APPROVE", "Approved with Approve all", ctx); done++; }
    revalidatePath("/admin/requests");
    return { done };
  }, "All waiting requests were approved.");
}
