import { NextResponse, type NextRequest } from "next/server";
import { can } from "@/core/permissions";
import { securityEvent } from "@/server/audit";
import { getSession, reqCtxFrom } from "@/server/http";
import { readAsset } from "@/server/services/assets";
import { requireActiveAccess } from "@/server/services/access";
import { toPublicError } from "@/server/errors";

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
  const headers: Record<string, string> = { "Content-Type": a.mimeType, "X-Content-Type-Options": "nosniff", "Content-Disposition": `${a.mimeType.startsWith("image/") || isMedia(a.mimeType) ? "inline" : "attachment"}; filename="${a.fileName.replace(/[^\w.\-]+/g, "_")}"` };
  if (a.isPublic) {
    headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=604800";
    return respond(req, a.data, headers, a.mimeType);
  }
  const s = await getSession();
  if (!s || s.mfaPending) return new NextResponse("Sign in required", { status: 401 });
  const ok = a.ownerId === s.user.id || a.kind === "LIBRARY" || STAFF_READ.some((p) => can(s.actor, p));
  if (!ok) {
    await securityEvent({ type: "IDOR_ATTEMPT", severity: "MEDIUM", userId: s.user.id, detail: { asset: id } }, reqCtxFrom(req));
    return new NextResponse("Not found", { status: 404 });
  }
  if (a.kind === "LIBRARY") {
    // Study materials and audio are for learners who hold an active access code (staff are exempt).
    try { await requireActiveAccess(s.user.id, s.user.userType); } catch (e) { return new NextResponse(toPublicError(e).message, { status: 403 }); }
  }
  headers["Cache-Control"] = a.kind === "LIBRARY" ? "private, max-age=3600" : "private, no-store";
  return respond(req, a.data, headers, a.mimeType);
}

/** Audio and video need byte-range replies so players can seek and resume without re-downloading the whole file. */
function respond(req: NextRequest, data: Buffer, headers: Record<string, string>, mime: string) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && isMedia(mime)) {
    const size = data.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2] || 0));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new NextResponse(new Uint8Array(data), { headers: isMedia(mime) ? { ...headers, "Accept-Ranges": "bytes" } : headers });
}
const isMedia = (m: string) => m.startsWith("audio/") || m.startsWith("video/");
