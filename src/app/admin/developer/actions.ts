"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/http";
import { createPlatformAccount, resetCredentials, setLevel, setStatus, type Level } from "@/server/services/developer";

/** Every service call re-checks that the actor is the Developer; "super.accounts" keeps ordinary staff out earlier. */
const guard = { role: "staff" as const, perm: "super.accounts" as const };
const done = () => revalidatePath("/admin/developer");

export async function createAccountAction(form: FormData) {
  return action(guard, async (a, ctx) => {
    const g = (k: string) => String(form.get(k) ?? "");
    const r = await createPlatformAccount(a, { level: g("level") as Level, email: g("email"), firstName: g("firstName"), lastName: g("lastName"), roleKeys: form.getAll("roles").map(String) }, ctx);
    done();
    return r;
  }, "Account created.");
}
export async function setLevelAction(userId: string, level: Level) {
  return action(guard, async (a, ctx) => { await setLevel(a, userId, level, ctx); done(); }, "Updated.");
}
export async function setStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  return action(guard, async (a, ctx) => { await setStatus(a, userId, status, ctx); done(); }, "Updated.");
}
export async function resetCredentialsAction(userId: string, resetTwoFactor: boolean) {
  return action(guard, async (a, ctx) => { const r = await resetCredentials(a, userId, resetTwoFactor, ctx); done(); return r; }, "Reset.");
}
