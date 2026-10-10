"use server";

import { redirect } from "next/navigation";
import { toPublicError } from "@/server/errors";
import { clearSessionCookie, getSession, reqCtx, setSessionCookie, type ActionResult } from "@/server/http";
import { resolveSessionToken, revokeSession } from "@/server/auth/session";
import { activateCode } from "@/server/services/access";
import { audit } from "@/server/audit";
import { bootstrapSuperAdmin, login, registerApplicant, requestPasswordReset, resetPasswordWithToken, verifyMfa } from "@/server/services/auth";

const fd = (f: FormData) => Object.fromEntries(Array.from(f.keys()).map((k) => [k, f.get(k)?.toString() ?? ""]));
const safeNext = (next: string | undefined, fallback: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : fallback);
const fail = (e: unknown): ActionResult => {
  const p = toPublicError(e);
  return { ok: false, error: p.message, fields: p.fields };
};

export async function registerAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  let dest = "";
  try {
    const ctx = await reqCtx();
    const d = fd(form);
    await registerApplicant({ ...d, acceptTerms: d.acceptTerms === "on" }, ctx);
    const r = await login({ identifier: d.email, password: d.password }, "public", ctx);
    await setSessionCookie(r.token, r.expiresAt);
    const code = (d.accessCode ?? "").trim();
    let activated = false;
    if (code) {
      // A wrong code must not undo the registration: the person is told and can enter it again on the dashboard.
      try { const sess = await resolveSessionToken(r.token); if (sess) { await activateCode(sess.actor, code, ctx); activated = true; } } catch { dest = "/access?code=failed"; }
    }
    // Easy path: a valid code opens the student portal and the free-certificate chooser. The formal application stays available.
    const formal = d.next && d.next.startsWith("/apply") && d.next !== "/apply";
    dest = dest || (activated ? "/student/courses/start" : formal ? safeNext(d.next, "/access") : "/access?welcome=1");
  } catch (e) {
    return fail(e);
  }
  redirect(dest);
}

async function doLogin(portal: "public" | "backend", form: FormData): Promise<ActionResult> {
  let dest = "";
  try {
    const d = fd(form);
    const r = await login({ identifier: d.identifier, password: d.password }, portal, await reqCtx());
    await setSessionCookie(r.token, r.expiresAt);
    const home = portal === "backend" ? "/admin" : r.userType === "APPLICANT" ? "/access" : "/student";
    if (r.mfaPending) dest = `/backend/verify${d.next ? `?next=${encodeURIComponent(d.next)}` : ""}`;
    else if (r.mustChangePassword) dest = portal === "backend" ? "/admin/security?force=password" : "/student/security?force=1";
    else dest = safeNext(d.next, home);
  } catch (e) {
    return fail(e);
  }
  redirect(dest);
}
export const loginAction = async (_: ActionResult | null, f: FormData) => doLogin("public", f);
export const backendLoginAction = async (_: ActionResult | null, f: FormData) => doLogin("backend", f);

export async function mfaAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  let dest = "";
  try {
    const s = await getSession();
    if (!s) throw new Error("expired");
    const d = fd(form);
    await verifyMfa(s.sessionId, s.user.id, d.code, await reqCtx());
    dest = s.user.mustChangePassword ? "/admin/security?force=password" : safeNext(d.next, "/admin");
  } catch (e) {
    return e instanceof Error && e.message === "expired" ? { ok: false, error: "Your sign-in expired. Please start again." } : fail(e);
  }
  redirect(dest);
}

export async function forgotAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await requestPasswordReset(fd(form).email ?? "", await reqCtx());
    return { ok: true, message: "If that email is registered, a reset link has been sent." };
  } catch (e) {
    return fail(e);
  }
}

export async function resetAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  let ok = false;
  try {
    await resetPasswordWithToken(fd(form), await reqCtx());
    ok = true;
  } catch (e) {
    return fail(e);
  }
  if (ok) redirect("/login?reset=1");
  return { ok: true };
}

export async function setupAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  let dest = "";
  try {
    const ctx = await reqCtx();
    const d = fd(form);
    await bootstrapSuperAdmin(d, ctx);
    const r = await login({ identifier: d.email, password: d.password }, "backend", ctx);
    await setSessionCookie(r.token, r.expiresAt);
    dest = "/admin/security?force=2fa";
  } catch (e) {
    return fail(e);
  }
  redirect(dest);
}

export async function logoutAction() {
  const s = await getSession();
  if (s) {
    await revokeSession(s.sessionId, "LOGOUT");
    await audit({ actor: s.actor, action: "auth.logout", entityType: "user", entityId: s.user.id }, await reqCtx());
  }
  await clearSessionCookie();
  redirect("/");
}
