import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { loadPermissions } from "@/server/auth/session";
import type { Actor } from "@/server/audit";
import { acceptOffer, addApplicationDocument, decideApplication, registerAdmittedStudent, saveApplication, submitApplication } from "@/server/services/admissions";
import { advanceResults, computeOfferingResults, decideAmendment, enrolmentSummary, registerForOfferings, requestAmendment } from "@/server/services/academics";
import { gradeSubmission, publishAssessment, saveAssessment, startAttempt, saveAnswers, submitAttempt, submitAssignment } from "@/server/services/assessments";
import { boardDecision, completeGraduation, evaluateGraduation, issueCertificate, recommendGraduation, revokeCertificate } from "@/server/services/credentials";
import { verifyDocument } from "@/server/services/verify";
import { certificatePdf, transcriptPdf } from "@/server/services/documents";
import { createTranscript, setTranscriptStatus } from "@/server/services/credentials";

const ctx = { ip: "10.0.0.5", userAgent: "vitest" };
let close: () => Promise<void>;

async function mkUser(email: string, type: "STAFF" | "APPLICANT", role?: string, name = "Test"): Promise<Actor> {
  const db = getDb();
  const [u] = await db.insert(s.users).values({ email, passwordHash: await hashPassword("Str0ng!Passw0rd#42"), userType: type, firstName: name, lastName: "User" }).returning();
  if (role) {
    const [r] = await db.select().from(s.roles).where(eq(s.roles.key, role));
    await db.insert(s.userRoles).values({ userId: u.id, roleId: r.id });
  }
  return { id: u.id, userType: type, permissions: await loadPermissions(u.id), name, email };
}

let admissions: Actor, registrar: Actor, lecturer: Actor, hod: Actor, examOfficer: Actor, board: Actor, student: Actor, other: Actor;
const offeringIds: string[] = [];
let progId: string, enrolmentId: string, regs: string[] = [];

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  admissions = await mkUser("adm@t.com", "STAFF", "chancellor", "Adm");
  registrar = await mkUser("reg@t.com", "STAFF", "registrar", "Reg");
  lecturer = await mkUser("lec@t.com", "STAFF", "lecturer", "Lec");
  hod = await mkUser("hod@t.com", "STAFF", "hod", "Hod");
  examOfficer = await mkUser("exo@t.com", "STAFF", "exam-officer", "Exo");
  board = await mkUser("board@t.com", "STAFF", "board", "Board");
  other = await mkUser("lec2@t.com", "STAFF", "lecturer", "Other");
  student = await mkUser("stu@t.com", "APPLICANT", undefined, "Stu");
  const db = f.db;
  // A small programme: two real catalogue courses, 4 credits, no practicum, no research.
  const [lvl] = await db.select().from(s.programmeLevels).where(eq(s.programmeLevels.key, "CERTIFICATE"));
  const [p] = await db.insert(s.programmes).values({ code: "TST", slug: "tst", name: "Certificate in Testing", levelId: lvl.id, minCredits: 4, minCgpa: 1.0, status: "PUBLISHED" }).returning();
  progId = p.id;
  for (const code of ["BIB107", "FIV101"]) {
    const [c] = await db.select().from(s.courses).where(eq(s.courses.code, code));
    await db.insert(s.programmeCourses).values({ programmeId: p.id, courseId: c.id, kind: "CORE" });
  }
}, 180000);
afterAll(async () => { await close?.(); });

describe("admission → registration", () => {
  it("applicant applies; incomplete applications are refused", async () => {
    const id = await saveApplication(student, { programmeId: progId, personal: { dateOfBirth: "1990-01-01", gender: "Male", phone: "08012345678", address: "Lagos", country: "Nigeria" }, references: [], statement: "short" }, ctx);
    await expect(submitApplication(student, id, ctx)).rejects.toThrow(/personal statement/i);
    await saveApplication(student, { programmeId: progId, personal: { dateOfBirth: "1990-01-01", gender: "Male", phone: "08012345678", address: "Lagos", country: "Nigeria" }, references: [{ name: "Pastor A", relationship: "Pastor", email: "p@x.com", phone: "" }], statement: "I have served in my local church for ten years and desire to be trained for ministry." }, ctx);
    await expect(submitApplication(student, id, ctx)).rejects.toThrow(/document/i);
    const [asset] = await getDb().insert(s.assets).values({ kind: "APPLICATION", fileName: "id.pdf", mimeType: "application/pdf", size: 3, sha256: "x", data: Buffer.from("abc"), ownerId: student.id }).returning();
    await addApplicationDocument(student, id, "IDENTIFICATION", asset.id, ctx);
    await submitApplication(student, id, ctx);
  });

  it("staff decide; a student cannot be registered before accepting the offer", async () => {
    const [a] = await getDb().select().from(s.applications).where(eq(s.applications.userId, student.id));
    await expect(decideApplication(admissions, a.id, "ACCEPTED", "ok", ctx)).rejects.toThrow(/cannot move/i);
    await decideApplication(admissions, a.id, "UNDER_REVIEW", "", ctx);
    await expect(decideApplication(admissions, a.id, "ACCEPTED", "", ctx)).rejects.toThrow(/reason/i);
    await decideApplication(admissions, a.id, "ACCEPTED", "Strong candidate", ctx);
    await expect(registerAdmittedStudent(registrar, a.id, ctx)).rejects.toThrow(/accepted the offer/i);
    await acceptOffer(student, a.id, ctx);
    const r = await registerAdmittedStudent(registrar, a.id, ctx);
    expect(r.studentNumber).toMatch(/^FCGBS\/\d{4}\/0001$/);
    await expect(registerAdmittedStudent(registrar, a.id, ctx)).rejects.toThrow(/already registered/i);
    const [u] = await getDb().select().from(s.users).where(eq(s.users.id, student.id));
    expect(u.userType).toBe("STUDENT");
    const [en] = await getDb().select().from(s.enrolments).where(eq(s.enrolments.programmeId, progId));
    enrolmentId = en.id;
    student = { ...student, userType: "STUDENT" };
  });

  it("registers for offered courses within rules", async () => {
    const db = getDb();
    const [term] = await db.select().from(s.academicTerms).where(eq(s.academicTerms.isCurrent, true));
    for (const code of ["BIB107", "FIV101"]) {
      const [c] = await db.select().from(s.courses).where(eq(s.courses.code, code));
      const [o] = await db.insert(s.offerings).values({ courseId: c.id, termId: term.id, lecturerId: lecturer.id }).returning();
      offeringIds.push(o.id);
    }
    // A course outside the programme is refused.
    const [c2] = await db.select().from(s.courses).where(eq(s.courses.code, "HEB101"));
    const [oOut] = await db.insert(s.offerings).values({ courseId: c2.id, termId: term.id, lecturerId: lecturer.id }).returning();
    await expect(registerForOfferings(student, enrolmentId, [oOut.id], ctx)).rejects.toThrow(/not part of your programme/i);
    regs = await registerForOfferings(student, enrolmentId, offeringIds, ctx);
    expect(regs).toHaveLength(2);
    await expect(registerForOfferings(student, enrolmentId, [offeringIds[0]], ctx)).rejects.toThrow(/already registered/i);
  });
});

describe("assessment → results → graduation → certificate", () => {
  let assignmentId: string;
  it("only the assigned lecturer can create assessments", async () => {
    await expect(saveAssessment(other, { offeringId: offeringIds[0], kind: "ASSIGNMENT", title: "Hack" }, ctx)).rejects.toThrow(/not assigned/i);
    assignmentId = await saveAssessment(lecturer, { offeringId: offeringIds[0], kind: "ASSIGNMENT", title: "Essay 1", dueAt: new Date(Date.now() + 86_400_000), aiPolicy: "DISCLOSE" }, ctx);
    await publishAssessment(lecturer, assignmentId, ctx);
  });

  it("students submit with AI disclosure rules; lecturer grades", async () => {
    await expect(submitAssignment(student, assignmentId, { text: "My essay", aiUsed: true }, ctx)).rejects.toThrow(/AI/);
    const sub = await submitAssignment(student, assignmentId, { text: "My essay", aiUsed: true, aiDisclosure: "I used AI to plan my outline." }, ctx);
    await expect(submitAssignment(student, assignmentId, { text: "again" }, ctx)).rejects.toThrow(/already submitted/i);
    await expect(gradeSubmission(other, sub, 80, "x", ctx)).rejects.toThrow();
    await gradeSubmission(lecturer, sub, 80, "Good work", ctx);
  });

  it("auto-marked exam: server-side timing and scoring", async () => {
    const examId = await saveAssessment(lecturer, { offeringId: offeringIds[0], kind: "EXAM", title: "Final", timeLimitMin: 30, closesAt: new Date(Date.now() + 86_400_000) }, ctx);
    await expect(startAttempt(student, examId, ctx)).rejects.toThrow(/not open/i);
    await publishAssessment(lecturer, examId, ctx);
    const attemptId = await startAttempt(student, examId, ctx);
    const [at] = await getDb().select().from(s.examAttempts).where(eq(s.examAttempts.id, attemptId));
    expect(JSON.stringify(at.snapshot)).not.toMatch(/"answer"/); // the key never reaches the client snapshot
    const [q] = await getDb().select().from(s.questions).where(eq(s.questions.id, at.snapshot[0].id));
    await saveAnswers(student, attemptId, { [q.id]: q.answer as string }, [{ t: "tab_hidden" }], ctx);
    await submitAttempt(student, attemptId, ctx);
    const [done] = await getDb().select().from(s.examAttempts).where(eq(s.examAttempts.id, attemptId));
    expect(done.status).toBe("GRADED");
    expect(done.finalScore).toBeGreaterThan(0);
    await expect(saveAnswers(student, attemptId, {}, [], ctx)).rejects.toThrow(/submitted/i);
    await expect(startAttempt(student, examId, ctx)).rejects.toThrow(/attempts/i);
  });

  it("results follow Draft → Submitted → Reviewed → Approved → Published with separation of duties", async () => {
    // Second course: grant a direct DRAFT result.
    await computeOfferingResults(lecturer, offeringIds[0], ctx);
    await computeOfferingResults(lecturer, offeringIds[1], ctx);
    const rs = await getDb().select().from(s.results);
    expect(rs).toHaveLength(2);
    const ids = rs.map((r) => r.id);
    // Make the second course a clear pass so graduation can succeed.
    const second = rs.find((r) => r.registrationId === regs[1])!;
    const { setDraftComponents } = await import("@/server/services/academics");
    await setDraftComponents(lecturer, second.id, { assignment: 90, test: 85, exam: 88 }, ctx);
    const first = rs.find((r) => r.registrationId === regs[0])!;
    await setDraftComponents(lecturer, first.id, { assignment: 90, test: 80, exam: 85 }, ctx);

    await expect(advanceResults(lecturer, ids, "APPROVE", ctx)).rejects.toThrow(/permission/i);
    await advanceResults(lecturer, ids, "SUBMIT", ctx);
    await expect(advanceResults(lecturer, ids, "SUBMIT", ctx)).rejects.toThrow(/cannot be/i);
    await advanceResults(hod, ids, "REVIEW", ctx);
    await expect(advanceResults(hod, ids, "APPROVE", ctx)).rejects.toThrow(/permission/i);
    await advanceResults(registrar, ids, "APPROVE", ctx);
    await advanceResults(registrar, ids, "PUBLISH", ctx);
    const pub = await getDb().select().from(s.results);
    expect(pub.every((r) => r.status === "PUBLISHED")).toBe(true);
  });

  it("a published result cannot be changed silently, only by an approved amendment", async () => {
    const [r] = await getDb().select().from(s.results).where(eq(s.results.registrationId, regs[0]));
    await expect(getDb().update(s.results).set({ total: 100, grade: "A+" }).where(eq(s.results.id, r.id))).rejects.toThrow();
    const am = await requestAmendment(registrar, r.id, 82, "Marking error found in assignment two.", ctx);
    await expect(decideAmendment(registrar, am, true, "approved", ctx)).rejects.toThrow(/own amendment/i);
    await decideAmendment(await mkUser("reg2@t.com", "STAFF", "registrar", "Reg2"), am, true, "Verified against script", ctx);
    const [after] = await getDb().select().from(s.results).where(eq(s.results.id, r.id));
    expect(after.total).toBe(82);
  });

  it("GPA/CGPA are computed server-side", async () => {
    const sum = await enrolmentSummary(enrolmentId);
    expect(sum.records).toHaveLength(2);
    expect(sum.cgpa).toBeGreaterThan(3);
    expect(sum.creditsEarned).toBe(4);
  });

  it("graduation needs registrar + a different board member; certificate needs board approval", async () => {
    const ev = await evaluateGraduation(enrolmentId);
    expect(ev.eligible).toBe(true);
    const gid = await recommendGraduation(registrar, enrolmentId, ctx);
    await expect(issueCertificate(registrar, gid, ctx)).rejects.toThrow(/Academic Board/i);
    await boardDecision(board, gid, true, "Approved", ctx);
    await completeGraduation(registrar, gid, ctx);
    const cert = await issueCertificate(registrar, gid, ctx);
    await expect(issueCertificate(registrar, gid, ctx)).rejects.toThrow(/Academic Board|already exists/i); // a second issue is refused
    const [c] = await getDb().select().from(s.certificates).where(eq(s.certificates.id, cert.id));
    expect(c.status).toBe("VALID");
    const [u] = await getDb().select().from(s.users).where(eq(s.users.id, student.id));
    expect(u.userType).toBe("ALUMNI");

    // Public verification returns only limited fields.
    const v = await verifyDocument(c.number, { ip: "1.1.1.1" });
    expect(v.outcome).toBe("VERIFIED");
    expect(Object.keys(v).sort()).toEqual(["award", "awardDate", "holder", "institution", "kind", "number", "outcome", "programme", "status"]);
    expect((await verifyDocument("FCGBS-CERT-9999-0000", { ip: "1.1.1.1" })).outcome).toBe("NOT_FOUND");

    await expect(revokeCertificate(lecturer, c.id, "long enough reason here", ctx)).rejects.toThrow(/permission/i);
    await revokeCertificate(registrar, c.id, "Issued in error; verified by Registrar.", ctx);
    expect((await verifyDocument(c.verifyToken, { ip: "1.1.1.2" })).outcome).toBe("REVOKED");
  });

  it("generates PDFs and a verifiable transcript with two-person issue", async () => {
    const [c] = await getDb().select().from(s.certificates);
    expect((await certificatePdf(c.id))!.bytes.length).toBeGreaterThan(3000);
    const tid = await createTranscript(registrar, enrolmentId, ctx);
    await setTranscriptStatus(registrar, tid, "APPROVED", ctx);
    await expect(setTranscriptStatus(registrar, tid, "ISSUED", ctx)).rejects.toThrow(/someone other/i);
    const reg2 = await mkUser("reg3@t.com", "STAFF", "registrar", "Reg3");
    await setTranscriptStatus(reg2, tid, "ISSUED", ctx);
    expect((await transcriptPdf(tid))!.bytes.length).toBeGreaterThan(3000);
    const [t] = await getDb().select().from(s.transcripts).where(eq(s.transcripts.id, tid));
    expect((await verifyDocument(t.number, { ip: "2.2.2.2" })).kind).toBe("TRANSCRIPT");
  });

  it("finance and lecturers cannot reach grading permissions", async () => {
    const fin = await mkUser("fin@t.com", "STAFF", "finance", "Fin");
    const rs = await getDb().select().from(s.results).where(and(eq(s.results.registrationId, regs[0])));
    await expect(advanceResults(fin, [rs[0].id], "PUBLISH", ctx)).rejects.toThrow(/permission/i);
    await expect(advanceResults(examOfficer, [rs[0].id], "SUBMIT", ctx)).rejects.toThrow(/permission/i);
  });
});
