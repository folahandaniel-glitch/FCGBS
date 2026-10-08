"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { adjustAccess, assignAccess, generateCodes, revealCode, setCodeStatus, updateCodeEntitlements } from "@/server/services/access";

const num = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? undefined : Number(v));

export async function generateCodesAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "codes.generate" }, async (a, ctx) => {
    const custom = f.get("customFeatures") === "on";
    const r = await generateCodes(a, { count: Number(f.get("count") ?? 1), durationDays: num(f.get("durationDays")), note: String(f.get("note") ?? ""), features: custom ? f.getAll("features").map(String) : null }, ctx);
    revalidatePath("/admin/access-codes");
    return r;
  });
}

export async function assignAccessAction(_: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "codes.generate" }, async (a, ctx) => {
    await assignAccess(a, String(f.get("identifier") ?? ""), num(f.get("durationDays")), String(f.get("reason") ?? ""), ctx);
    revalidatePath("/admin/access-codes");
  }, "Access given and activated.");
}

export async function codeStatusAction(id: string, act: "SUSPEND" | "REVOKE" | "RESTORE", reason: string) {
  return action({ role: "staff", perm: "codes.manage" }, async (a, ctx) => { await setCodeStatus(a, id, act, reason, ctx); revalidatePath("/admin/access-codes"); }, "Done.");
}

export async function revealCodeAction(id: string) {
  return action({ role: "staff", perm: "codes.generate" }, async (a, ctx) => revealCode(a, id, ctx));
}

export async function adjustAccessAction(periodId: string, payload: unknown) {
  return action({ role: "staff", perm: "codes.manage" }, async (a, ctx) => { await adjustAccess(a, periodId, payload, ctx); revalidatePath("/admin/access-codes"); }, "Access updated.");
}

export async function codeEntitlementsAction(id: string, _: ActionResult | null, f: FormData) {
  return action({ role: "staff", perm: "codes.manage" }, async (a, ctx) => {
    await updateCodeEntitlements(a, id, f.get("customFeatures") === "on" ? f.getAll("features").map(String) : null, ctx);
    revalidatePath("/admin/access-codes");
  }, "Features updated.");
}
