"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/http";
import { decideRequest } from "@/server/services/selfservice";

export async function decideRequestAction(id: string, decision: "APPROVE" | "REJECT", note: string) {
  return action({ role: "staff", perm: "registration.manage" }, async (a, ctx) => { await decideRequest(a, id, decision, note, ctx); revalidatePath("/admin/requests"); }, decision === "APPROVE" ? "Approved and opened for the learner." : "Declined.");
}
