import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { cache } from "react";
import { can, isStaffType, type Permission, type SuperCapability } from "@/core/permissions";
import { securityEvent, type Actor, type ReqCtx } from "./audit";
import { resolveSessionToken, type ResolvedSession } from "./auth/session";
import { AppError, toPublicError } from "./errors";
import { getSetting } from "./settings";
import type { Feature } from "@/core/features";
import { requireActiveAccess, requireFeature } from "./services/access";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-fcgbs_session" : "fcgbs_session";

export async function reqCtx(): Promise<ReqCtx> {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null, userAgent: h.get("user-agent") };
}

export function reqCtxFrom(req: NextRequest): ReqCtx {
  return { ip: (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || null, userAgent: req.headers.get("user-agent") };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Per-request memoised session lookup (server components & actions). */
export const getSession = cache(async (): Promise<ResolvedSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSessionToken(token);
});

/* ---------------------------------------------------------- page guards */

/** Learners: enrolled students, plus alumni (who keep read access to their own records). */
export async function requireLearnerPage(opts: { allowPasswordChange?: boolean } = {}) {
  const s = await getSession();
  if (!s || s.mfaPending) redirect("/login");
  if (s.user.userType === "APPLICANT") redirect("/apply");
  if (isStaffType(s.user.userType)) redirect("/admin");
  if (s.user.mustChangePassword && !opts.allowPasswordChange) redirect("/student/security?force=1");
  return s;
}

export async function requireApplicantPage() {
  const s = await getSession();
  if (!s || s.mfaPending) redirect("/register");
  if (s.user.userType === "STUDENT" || s.user.userType === "ALUMNI") redirect("/student");
  if (isStaffType(s.user.userType)) redirect("/admin");
  return s;
}

export async function requireStaffPage(perm?: Permission | SuperCapability | (Permission | SuperCapability)[], opts: { allowSetup?: boolean } = {}) {
  const s = await getSession();
  if (!s) redirect("/backend");
  if (s.mfaPending) redirect("/backend/verify");
  if (!isStaffType(s.user.userType)) redirect(s.user.userType === "APPLICANT" ? "/apply" : "/student");
  if (!opts.allowSetup) {
    if (s.user.mustChangePassword) redirect("/admin/security?force=password");
    const cfg = await getSetting("authentication");
    if (!s.user.totpEnabled && ((s.user.userType === "SUPER_ADMIN" && cfg.requireSuperAdmin2fa) || (s.user.userType === "STAFF" && cfg.requireStaff2fa))) redirect("/admin/security?force=2fa");
  }
  const perms = perm === undefined ? [] : Array.isArray(perm) ? perm : [perm];
  if (perms.length && !perms.some((p) => can(s.actor, p))) {
    await securityEvent({ type: "PRIVILEGE_ESCALATION", severity: "MEDIUM", userId: s.user.id, detail: { perm: perms, via: "page" } }, await reqCtx());
    redirect("/admin?denied=1");
  }
  return s;
}

/* -------------------------------------------------------- server actions */

export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string[]> };

/**
 * `access` is the learning feature the call needs (src/core/features.ts). Learners need an active access code for any
 * learner action ("ANY"); pass false only for account basics (profile, security, notifications). Staff are exempt.
 */
export type Guard = { role: "learner" | "staff" | "applicant" | "any"; perm?: Permission | SuperCapability | (Permission | SuperCapability)[]; access?: Feature | "ANY" | false };

async function enforceAccess(s: ResolvedSession, role: Guard["role"] | "learner", access: Guard["access"]) {
  if (access === false) return;
  const want = access ?? (role === "learner" ? "ANY" : undefined);
  if (!want) return;
  if (want === "ANY") await requireActiveAccess(s.user.id, s.user.userType);
  else await requireFeature(s.user.id, want, s.user.userType);
}

/**
 * Wraps a server action: resolves the session, enforces role/permission on the server, converts errors to
 * safe messages. Next.js server actions already enforce same-origin POSTs, which covers CSRF.
 */
export async function action<T>(guard: Guard, fn: (actor: Actor, ctx: ReqCtx, session: ResolvedSession) => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const s = await getSession();
    if (!s || s.mfaPending) throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
    const ctx = await reqCtx();
    const t = s.user.userType;
    const deny = async (why: string) => {
      await securityEvent({ type: "PRIVILEGE_ESCALATION", severity: "HIGH", userId: s.user.id, detail: { via: "action", why } }, ctx);
      throw new AppError("FORBIDDEN", "You do not have permission to do that.");
    };
    if (guard.role === "learner" && t !== "STUDENT" && t !== "ALUMNI") await deny("not a learner");
    if (guard.role === "applicant" && t !== "APPLICANT") await deny("not an applicant");
    if (guard.role === "staff" && !isStaffType(t)) await deny("not staff");
    if (guard.perm) {
      const perms = Array.isArray(guard.perm) ? guard.perm : [guard.perm];
      if (!perms.some((p) => can(s.actor, p))) await deny(`missing ${perms.join("|")}`);
    }
    await enforceAccess(s, guard.role, guard.access);
    const data = await fn(s.actor, ctx, s);
    return { ok: true, data, message };
  } catch (e) {
    if (isRedirect(e)) throw e;
    const p = toPublicError(e);
    return { ok: false, error: p.message, fields: p.fields };
  }
}

function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/* ------------------------------------------------------------ API routes */

type ApiAuth = "none" | "learner" | "staff" | "any";

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

/**
 * API-first handler (spec §77): the same endpoints serve the web app (cookie) and future mobile apps
 * (Authorization: Bearer). Cookie-authenticated unsafe methods must be same-origin (CSRF protection).
 */
export function api<P = Record<string, string>>(
  opts: { auth: ApiAuth; perm?: Permission | SuperCapability | (Permission | SuperCapability)[]; allowMfaPending?: boolean; access?: Guard["access"] },
  fn: (args: { req: NextRequest; params: P; actor: Actor | null; session: ResolvedSession | null; ctx: ReqCtx }) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    const ctx = reqCtxFrom(req);
    try {
      const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
      const token = bearer ?? req.cookies.get(SESSION_COOKIE)?.value;
      const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (unsafe && !bearer && !sameOrigin(req)) {
        await securityEvent({ type: "UNAUTHORIZED_API", severity: "MEDIUM", detail: { reason: "cross_origin", path: req.nextUrl.pathname } }, ctx);
        throw new AppError("FORBIDDEN", "Cross-site request blocked.");
      }
      let session: ResolvedSession | null = null;
      if (opts.auth !== "none") {
        session = await resolveSessionToken(token);
        if (!session) throw new AppError("UNAUTHENTICATED", "Please sign in.");
        if (session.mfaPending && !opts.allowMfaPending) throw new AppError("MFA_REQUIRED", "Two-factor verification required.");
        if (session.user.mustChangePassword) throw new AppError("PASSWORD_CHANGE_REQUIRED", "You must change your password first.");
        const t = session.user.userType;
        const bad = (opts.auth === "learner" && t !== "STUDENT" && t !== "ALUMNI") || (opts.auth === "staff" && !isStaffType(t));
        if (bad) {
          await securityEvent({ type: "UNAUTHORIZED_API", severity: "HIGH", userId: session.user.id, detail: { path: req.nextUrl.pathname } }, ctx);
          throw new AppError("FORBIDDEN", "Permission denied.");
        }
        if (opts.perm) {
          const perms = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
          if (!perms.some((p) => can(session!.actor, p))) {
            await securityEvent({ type: "PRIVILEGE_ESCALATION", severity: "HIGH", userId: session.user.id, detail: { perm: perms, path: req.nextUrl.pathname } }, ctx);
            throw new AppError("FORBIDDEN", "You do not have permission to do that.");
          }
        }
      }
      if (session) await enforceAccess(session, opts.auth === "learner" ? "learner" : "any", opts.access);
      const out = await fn({ req, params: await context.params, actor: session?.actor ?? null, session, ctx });
      if (out instanceof Response) return out;
      return NextResponse.json({ ok: true, data: out ?? null }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      const p = toPublicError(e);
      return NextResponse.json({ ok: false, error: { code: p.code, message: p.message, fields: p.fields } }, { status: p.status, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export async function readJson(req: NextRequest, maxBytes = 256_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new AppError("VALIDATION", "Request too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError("VALIDATION", "Request too large.");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION", "Invalid JSON body.");
  }
}

export function fileResponse(body: Buffer | string, type: string, fileName: string, inline = false) {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safe}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
