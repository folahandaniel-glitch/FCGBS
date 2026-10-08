import { NextResponse, type NextRequest } from "next/server";
import { can } from "@/core/permissions";
import { securityEvent } from "@/server/audit";
import { getSession, reqCtxFrom } from "@/server/http";
import { readAsset } from "@/server/services/assets";

const STAFF_READ = ["admissions.view", "students.view", "teaching.own", "teaching.any", "library.manage", "research.manage", "research.supervise", "ministry.view", "ministry.mentor", "integrity.manage", "content.manage"] as const;

/**
 * Serves stored files. Public pictures (logo, site images) are cached hard; every other file needs a signed-in
 * session and is only returned to its owner or to staff whose permissions legitimately cover it — files are never
 * reachable by guessing a URL (spec §64).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const a = await readAsset(id);
  if (!a) return new NextResponse("Not found", { status: 404 });
  const headers: Record<string, string> = { "Content-Type": a.mimeType, "X-Content-Type-Options": "nosniff", "Content-Disposition": `${a.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename="${a.fileName.replace(/[^\w.\-]+/g, "_")}"` };
  if (a.isPublic) {
    headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800";
    return new NextResponse(new Uint8Array(a.data), { headers });
  }
  const s = await getSession();
  if (!s || s.mfaPending) return new NextResponse("Sign in required", { status: 401 });
  const ok = a.ownerId === s.user.id || (a.kind === "LIBRARY" && s.user.userType !== "APPLICANT") || STAFF_READ.some((p) => can(s.actor, p));
  if (!ok) {
    await securityEvent({ type: "IDOR_ATTEMPT", severity: "MEDIUM", userId: s.user.id, detail: { asset: id } }, reqCtxFrom(req));
    return new NextResponse("Not found", { status: 404 });
  }
  headers["Cache-Control"] = "private, no-store";
  return new NextResponse(new Uint8Array(a.data), { headers });
}
