import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { can } from "@/core/permissions";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit, securityEvent } from "@/server/audit";
import { fileResponse, getSession, reqCtxFrom } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { certificatePdf, transcriptPdf } from "@/server/services/documents";

/** Official PDFs. Owners see their own issued documents; staff with the issuing permission see everything (including drafts). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const rc = reqCtxFrom(req);
  const sess = await getSession();
  if (!sess || sess.mfaPending) return new NextResponse("Sign in required", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["certificate", "transcript"].includes(kind)) return new NextResponse("Not found", { status: 404 });
  await rateLimit("export", sess.user.id, rc);
  const db = getDb();
  const enrolmentId = kind === "certificate" ? (await db.select({ e: s.certificates.enrolmentId, st: s.certificates.status }).from(s.certificates).where(eq(s.certificates.id, id)))[0] : (await db.select({ e: s.transcripts.enrolmentId, st: s.transcripts.status }).from(s.transcripts).where(eq(s.transcripts.id, id)))[0];
  if (!enrolmentId) return new NextResponse("Not found", { status: 404 });
  const [owner] = await db.select({ userId: s.students.userId }).from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(eq(s.enrolments.id, enrolmentId.e));
  const staff = can(sess.actor, kind === "certificate" ? "certificates.issue" : "transcripts.issue");
  const isOwner = owner?.userId === sess.user.id && (kind === "certificate" || enrolmentId.st === "ISSUED");
  if (!staff && !isOwner) {
    await securityEvent({ type: "IDOR_ATTEMPT", severity: "MEDIUM", userId: sess.user.id, detail: { kind, id } }, rc);
    return new NextResponse("Not found", { status: 404 });
  }
  const doc = kind === "certificate" ? await certificatePdf(id) : await transcriptPdf(id);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  await audit({ actor: sess.actor, action: `${kind}.downloaded`, entityType: kind, entityId: id }, rc);
  return fileResponse(Buffer.from(doc.bytes), "application/pdf", doc.fileName, true);
}
