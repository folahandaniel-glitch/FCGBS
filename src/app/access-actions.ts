"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { activateCode } from "@/server/services/access";

/** Enter an access code. Any signed-in learner account may do this (staff do not need codes). */
export async function activateCodeAction(_: ActionResult | null, f: FormData) {
  return action({ role: "any", access: false }, async (a, ctx) => {
    await activateCode(a, String(f.get("code") ?? ""), ctx);
    revalidatePath("/", "layout");
  }, "Access activated. Welcome!");
}
