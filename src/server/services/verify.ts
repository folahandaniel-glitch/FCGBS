import { eq, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "../db";
import { certificates, enrolments, programmes, transcripts, verificationLog } from "../db/schema";
import { securityEvent, type ReqCtx } from "../audit";
import { rateLimit } from "../rate-limit";
import { getSetting } from "../settings";

export interface Verification {
  outcome: "VERIFIED" | "NOT_FOUND" | "REVOKED" | "SUPERSEDED";
  kind?: "CERTIFICATE" | "TRANSCRIPT";
  /** Limited public fields only — never DOB, contact details, grades, student number or documents. */
  holder?: string;
  award?: string;
  programme?: string;
  institution?: string;
  awardDate?: string;
  status?: string;
  number?: string;
}

const clean = (q: string) => q.trim().replace(/\s+/g, "").slice(0, 80);

/** Public certificate / transcript verification (spec §40, §103). Rate-limited; returns the minimum needed to confirm authenticity. */
export async function verifyDocument(raw: string, ctx: ReqCtx): Promise<Verification> {
  await rateLimit("verify", ctx.ip ?? "unknown", ctx);
  const q = clean(raw);
  const db = getDb();
  const inst = (await getSetting("institution")).name;
  const ipHash = ctx.ip ? createHash("sha256").update(ctx.ip).digest("hex").slice(0, 16) : null;
  const log = (outcome: string, certificateId?: string) => db.insert(verificationLog).values({ query: q.slice(0, 40), outcome, certificateId, ipHash });

  if (q.length < 6) {
    await log("NOT_FOUND");
    return { outcome: "NOT_FOUND" };
  }
  const [c] = await db.select().from(certificates).where(or(eq(certificates.number, q.toUpperCase()), eq(certificates.verifyToken, q))).limit(1);
  if (c) {
    const outcome = c.status === "REVOKED" ? "REVOKED" : c.status === "SUPERSEDED" ? "SUPERSEDED" : c.status === "VALID" ? "VERIFIED" : "NOT_FOUND";
    await log(outcome, c.id);
    if (outcome === "NOT_FOUND") return { outcome };
    return { outcome, kind: "CERTIFICATE", holder: c.holderName, award: c.awardTitle, programme: c.programmeName, institution: inst, awardDate: c.awardDate, status: c.status, number: c.number };
  }
  const [t] = await db
    .select({ t: transcripts, programme: programmes.name })
    .from(transcripts)
    .innerJoin(enrolments, eq(enrolments.id, transcripts.enrolmentId))
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(or(eq(transcripts.number, q.toUpperCase()), eq(transcripts.verifyToken, q)))
    .limit(1);
  if (t) {
    const snap = t.t.snapshot as { student?: { name?: string } };
    const outcome = t.t.status === "ISSUED" ? "VERIFIED" : t.t.status === "REVOKED" ? "REVOKED" : "NOT_FOUND";
    await log(outcome);
    if (outcome === "NOT_FOUND") return { outcome };
    return { outcome, kind: "TRANSCRIPT", holder: snap.student?.name, programme: t.programme, institution: inst, awardDate: t.t.issuedAt?.toISOString().slice(0, 10), status: t.t.status, number: t.t.number };
  }
  await log("NOT_FOUND");
  // Many misses from one source is probing; record it without blocking legitimate verifiers.
  await securityEvent({ type: "VERIFY_ABUSE", severity: "INFO", detail: { q: q.slice(0, 12) } }, ctx);
  return { outcome: "NOT_FOUND" };
}
