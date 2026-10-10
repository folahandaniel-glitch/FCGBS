import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, type Executor } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { getSetting } from "../settings";
import { notifyUser } from "./notifications";

/**
 * Easy enrolment. A person who registers with the basics and enters an access code becomes a student at once and may
 * claim ONE free certificate programme. Every other programme or course is a request that an administrator approves
 * (the learner is told to contact the school). All grants are audited and use the same records as formal admission.
 */
const FREE = "SELF:FREE";
const APPROVED = "SELF:APPROVED";

/** Turns an applicant account into a student record (idempotent). Called when an access code is first activated. */
export async function ensureStudent(userId: string, db: Executor = getDb()) {
  const [have] = await db.select({ id: s.students.id, studentNumber: s.students.studentNumber }).from(s.students).where(eq(s.students.userId, userId));
  if (have) {
    await db.update(s.users).set({ userType: "STUDENT", updatedAt: new Date() }).where(and(eq(s.users.id, userId), eq(s.users.userType, "APPLICANT")));
    return { ...have, created: false };
  }
  const cfg = await getSetting("admissions", db);
  const [campus] = await db.select({ id: s.campuses.id }).from(s.campuses).where(eq(s.campuses.isOnline, true)).limit(1);
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 6; attempt++) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int + 1` }).from(s.students);
    const studentNumber = `${cfg.studentIdPrefix}/${year}/${String(n + attempt).padStart(cfg.studentIdDigits, "0")}`;
    const [st] = await db.insert(s.students).values({ userId, studentNumber, campusId: campus?.id }).onConflictDoNothing().returning({ id: s.students.id, studentNumber: s.students.studentNumber });
    if (st) {
      await db.update(s.users).set({ userType: "STUDENT", updatedAt: new Date() }).where(eq(s.users.id, userId));
      await notifyUser({ userId, category: "REGISTRATION", title: "Welcome to FCGBS", body: `Your student ID is ${st.studentNumber}. Choose your free certificate programme to begin.`, link: "/student/courses/start" }, db);
      return { ...st, created: true };
    }
    const [again] = await db.select({ id: s.students.id, studentNumber: s.students.studentNumber }).from(s.students).where(eq(s.students.userId, userId));
    if (again) return { ...again, created: false };
  }
  throw new AppError("INTERNAL", "Could not create a student record. Please try again.");
}

async function currentTerm(db: Executor) {
  const [t] = await db.select().from(s.academicTerms).where(eq(s.academicTerms.isCurrent, true)).limit(1);
  if (t) return t;
  const [last] = await db.select().from(s.academicTerms).orderBy(desc(s.academicTerms.startsOn)).limit(1);
  return last ?? null;
}

/** Opens (or finds) each course for the current semester so a self-enrolled learner has a classroom to enter. */
async function offeringsFor(db: Executor, courseIds: string[]) {
  const term = await currentTerm(db);
  if (!term) throw new AppError("NOT_CONFIGURED", "No academic semester is set up yet. Please contact the school office.");
  const [campus] = await db.select({ id: s.campuses.id }).from(s.campuses).where(eq(s.campuses.isOnline, true)).limit(1);
  const cfg = await getSetting("selfService", db);
  const have = await db.select().from(s.offerings).where(and(eq(s.offerings.termId, term.id), inArray(s.offerings.courseId, courseIds)));
  const map = new Map(have.map((o) => [o.courseId, o.id]));
  const missing = courseIds.filter((c) => !map.has(c));
  if (missing.length && !cfg.autoOpenCourses) throw new AppError("RULE_VIOLATION", "These courses are not open this semester yet. Please contact the school office.");
  if (missing.length) {
    const rows = await db.insert(s.offerings).values(missing.map((courseId) => ({ courseId, termId: term.id, campusId: campus?.id, status: "OPEN" }))).onConflictDoNothing().returning({ id: s.offerings.id, courseId: s.offerings.courseId });
    for (const r of rows) map.set(r.courseId, r.id);
    const again = await db.select().from(s.offerings).where(and(eq(s.offerings.termId, term.id), inArray(s.offerings.courseId, missing)));
    for (const o of again) map.set(o.courseId, o.id);
  }
  return { map, term };
}

async function registerCourses(db: Executor, enrolmentId: string, courseIds: string[], approver: string | null) {
  if (!courseIds.length) return 0;
  const { map } = await offeringsFor(db, courseIds);
  const already = new Set((await db.select({ c: s.courseRegistrations.courseId }).from(s.courseRegistrations).where(and(eq(s.courseRegistrations.enrolmentId, enrolmentId), ne(s.courseRegistrations.status, "DROPPED")))).map((r) => r.c));
  const rows = courseIds.filter((c) => !already.has(c) && map.get(c)).map((courseId) => ({ enrolmentId, courseId, offeringId: map.get(courseId)!, status: "APPROVED" as const, source: "REGISTERED" as const, approvedBy: approver ?? undefined, note: approver ? "Approved by administrator" : "Free certificate programme" }));
  if (rows.length) await db.insert(s.courseRegistrations).values(rows).onConflictDoNothing();
  return rows.length;
}

async function enrol(db: Executor, studentId: string, programmeId: string, note: string) {
  const term = await currentTerm(db);
  const [ex] = await db.select({ id: s.enrolments.id }).from(s.enrolments).where(and(eq(s.enrolments.studentId, studentId), eq(s.enrolments.programmeId, programmeId)));
  if (ex) return ex.id;
  const [session] = term ? await db.select({ id: s.academicSessions.id }).from(s.academicSessions).where(eq(s.academicSessions.id, term.sessionId)) : [];
  const [row] = await db.insert(s.enrolments).values({ studentId, programmeId, startSessionId: session?.id, note }).returning({ id: s.enrolments.id });
  return row.id;
}

const coreCourseIds = async (db: Executor, programmeId: string) =>
  (await db.select({ c: s.programmeCourses.courseId }).from(s.programmeCourses).innerJoin(s.courses, eq(s.courses.id, s.programmeCourses.courseId)).where(and(eq(s.programmeCourses.programmeId, programmeId), eq(s.programmeCourses.kind, "CORE"), eq(s.courses.status, "PUBLISHED"))).orderBy(asc(s.programmeCourses.year), asc(s.programmeCourses.semester), asc(s.programmeCourses.sort))).map((r) => r.c);

/* ------------------------------------------------------------------ read models */

export async function certificateProgrammes() {
  return getDb()
    .select({ id: s.programmes.id, code: s.programmes.code, slug: s.programmes.slug, name: s.programmes.name, description: s.programmes.description, months: s.programmes.durationMonths, credits: s.programmes.minCredits, level: s.programmeLevels.key, levelName: s.programmeLevels.name, rank: s.programmeLevels.rank })
    .from(s.programmes).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId))
    .where(and(eq(s.programmes.status, "PUBLISHED"), eq(s.programmeLevels.key, "CERTIFICATE"))).orderBy(asc(s.programmes.sort));
}

export async function myEnrolments(userId: string, db: Executor = getDb()) {
  return db
    .select({ id: s.enrolments.id, programmeId: s.programmes.id, programme: s.programmes.name, code: s.programmes.code, note: s.enrolments.note, status: s.enrolments.status, level: s.programmeLevels.name })
    .from(s.enrolments).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId))
    .where(eq(s.students.userId, userId)).orderBy(asc(s.enrolments.createdAt));
}

export async function myRequests(userId: string) {
  return getDb()
    .select({ id: s.enrolmentRequests.id, kind: s.enrolmentRequests.kind, status: s.enrolmentRequests.status, studentNote: s.enrolmentRequests.studentNote, adminNote: s.enrolmentRequests.adminNote, createdAt: s.enrolmentRequests.createdAt, decidedAt: s.enrolmentRequests.decidedAt, programme: s.programmes.name, programmeCode: s.programmes.code, course: s.courses.title, courseCode: s.courses.code })
    .from(s.enrolmentRequests).leftJoin(s.programmes, eq(s.programmes.id, s.enrolmentRequests.programmeId)).leftJoin(s.courses, eq(s.courses.id, s.enrolmentRequests.courseId))
    .where(eq(s.enrolmentRequests.userId, userId)).orderBy(desc(s.enrolmentRequests.createdAt));
}

export async function selfState(userId: string) {
  const cfg = await getSetting("selfService");
  const enrolments = await myEnrolments(userId);
  const freeUsed = enrolments.filter((e) => e.note === FREE).length;
  return { cfg, enrolments, freeUsed, freeLeft: Math.max(0, cfg.freeCertificates - freeUsed) };
}

/** Everything a learner can browse: programmes and courses, with what they already have or have asked for. */
export async function exploreCatalogue(userId: string) {
  const db = getDb();
  const [progs, courses, enrol, reqs, links] = await Promise.all([
    db.select({ id: s.programmes.id, code: s.programmes.code, name: s.programmes.name, description: s.programmes.description, months: s.programmes.durationMonths, credits: s.programmes.minCredits, level: s.programmeLevels.name, rank: s.programmeLevels.rank }).from(s.programmes).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId)).where(eq(s.programmes.status, "PUBLISHED")).orderBy(asc(s.programmeLevels.rank), asc(s.programmes.sort)),
    db.select({ id: s.courses.id, code: s.courses.code, title: s.courses.title, summary: s.courses.description, credits: s.courses.credits, level: s.courses.levelRank, dept: s.departments.name }).from(s.courses).leftJoin(s.departments, eq(s.departments.id, s.courses.departmentId)).where(eq(s.courses.status, "PUBLISHED")).orderBy(asc(s.courses.code)),
    myEnrolments(userId),
    myRequests(userId),
    db.select({ p: s.programmeCourses.programmeId, c: s.programmeCourses.courseId }).from(s.programmeCourses),
  ]);
  const myProg = new Set(enrol.map((e) => e.programmeId));
  const reqProg = new Map(reqs.filter((r) => r.kind === "PROGRAMME").map((r) => [r.programmeCode, r.status]));
  const reqCourse = new Map(reqs.filter((r) => r.kind === "COURSE").map((r) => [r.courseCode, r.status]));
  const myCourses = new Set(links.filter((l) => myProg.has(l.p)).map((l) => l.c));
  const regs = await db.select({ c: s.courseRegistrations.courseId }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.students.userId, userId), ne(s.courseRegistrations.status, "DROPPED")));
  const registered = new Set(regs.map((r) => r.c));
  return {
    programmes: progs.map((p) => ({ ...p, mine: myProg.has(p.id), request: reqProg.get(p.code) ?? null })),
    courses: courses.map((c) => ({ ...c, registered: registered.has(c.id), inMyProgramme: myCourses.has(c.id), request: reqCourse.get(c.code) ?? null })),
  };
}

/* --------------------------------------------------------------------- writes */

export async function claimFreeCertificate(actor: Actor, programmeId: string, ctx: ReqCtx) {
  const cfg = await getSetting("selfService");
  if (!cfg.enabled) throw new AppError("FORBIDDEN", "Self-service enrolment is not available right now.");
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM users WHERE id = ${actor.id} FOR UPDATE`);
    const st = await ensureStudent(actor.id, tx);
    const [prog] = await tx.select({ id: s.programmes.id, name: s.programmes.name, level: s.programmeLevels.key, status: s.programmes.status }).from(s.programmes).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId)).where(eq(s.programmes.id, programmeId));
    if (!prog || prog.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "That programme is not available.");
    if (prog.level !== "CERTIFICATE") throw new AppError("RULE_VIOLATION", "The free programme must be a certificate programme. Other programmes need approval — use Request.");
    const used = await tx.select({ id: s.enrolments.id }).from(s.enrolments).where(and(eq(s.enrolments.studentId, st.id), eq(s.enrolments.note, FREE)));
    if (used.length >= cfg.freeCertificates) throw new AppError("RULE_VIOLATION", `You have already chosen your free certificate programme. To study more, send a request and contact the school on ${cfg.approvalContact}.`);
    const enrolmentId = await enrol(tx, st.id, prog.id, FREE);
    const n = await registerCourses(tx, enrolmentId, await coreCourseIds(tx, prog.id), null);
    await audit({ actor, action: "selfservice.free_certificate", entityType: "enrolment", entityId: enrolmentId, summary: `${prog.name}: ${n} course(s)` }, ctx, tx);
    return { enrolmentId, courses: n, programme: prog.name };
  });
}

export async function requestEnrolment(actor: Actor, items: { programmeIds?: string[]; courseIds?: string[] }, note: string, ctx: ReqCtx) {
  const cfg = await getSetting("selfService");
  if (!cfg.enabled) throw new AppError("FORBIDDEN", "Self-service enrolment is not available right now.");
  const programmeIds = [...new Set(items.programmeIds ?? [])].slice(0, 10);
  const courseIds = [...new Set(items.courseIds ?? [])].slice(0, 30);
  if (!programmeIds.length && !courseIds.length) throw new AppError("VALIDATION", "Select at least one programme or course.");
  const db = getDb();
  return db.transaction(async (tx) => {
    await ensureStudent(actor.id, tx);
    const mine = await myEnrolments(actor.id, tx);
    const myProg = new Set(mine.map((e) => e.programmeId));
    const pending = await tx.select().from(s.enrolmentRequests).where(and(eq(s.enrolmentRequests.userId, actor.id), eq(s.enrolmentRequests.status, "PENDING")));
    const dupP = new Set(pending.map((r) => r.programmeId));
    const dupC = new Set(pending.map((r) => r.courseId));
    const rows: (typeof s.enrolmentRequests.$inferInsert)[] = [];
    if (programmeIds.length) {
      const ok = await tx.select({ id: s.programmes.id }).from(s.programmes).where(and(inArray(s.programmes.id, programmeIds), eq(s.programmes.status, "PUBLISHED")));
      for (const p of ok) if (!myProg.has(p.id) && !dupP.has(p.id)) rows.push({ userId: actor.id, kind: "PROGRAMME", programmeId: p.id, studentNote: note.slice(0, 500) });
    }
    if (courseIds.length) {
      const ok = await tx.select({ id: s.courses.id }).from(s.courses).where(and(inArray(s.courses.id, courseIds), eq(s.courses.status, "PUBLISHED")));
      const have = new Set((await tx.select({ c: s.courseRegistrations.courseId }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.students.userId, actor.id), ne(s.courseRegistrations.status, "DROPPED")))).map((r) => r.c));
      for (const c of ok) if (!have.has(c.id) && !dupC.has(c.id)) rows.push({ userId: actor.id, kind: "COURSE", courseId: c.id, studentNote: note.slice(0, 500) });
    }
    if (!rows.length) throw new AppError("CONFLICT", "You already have, or have already asked for, everything you selected.");
    await tx.insert(s.enrolmentRequests).values(rows);
    await audit({ actor, action: "selfservice.requested", entityType: "enrolment_request", summary: `${rows.length} request(s)` }, ctx, tx);
    await notifyUser({ userId: actor.id, category: "REGISTRATION", title: "Request received", body: `We have received ${rows.length} request(s). Please contact the school on ${cfg.approvalContact} so they can be approved.`, link: "/student/courses/explore" }, tx);
    return { count: rows.length };
  });
}

export async function cancelRequest(actor: Actor, id: string, ctx: ReqCtx) {
  const res = await getDb().update(s.enrolmentRequests).set({ status: "CANCELLED", decidedAt: new Date() }).where(and(eq(s.enrolmentRequests.id, id), eq(s.enrolmentRequests.userId, actor.id), eq(s.enrolmentRequests.status, "PENDING"))).returning({ id: s.enrolmentRequests.id });
  if (!res.length) throw new AppError("NOT_FOUND", "That request cannot be cancelled.");
  await audit({ actor, action: "selfservice.cancelled", entityType: "enrolment_request", entityId: id }, ctx);
}

/* ------------------------------------------------------------- administrator */

export async function pendingRequests(status: "PENDING" | "ALL" = "PENDING") {
  const q = getDb()
    .select({ id: s.enrolmentRequests.id, userId: s.enrolmentRequests.userId, kind: s.enrolmentRequests.kind, status: s.enrolmentRequests.status, studentNote: s.enrolmentRequests.studentNote, adminNote: s.enrolmentRequests.adminNote, createdAt: s.enrolmentRequests.createdAt, decidedAt: s.enrolmentRequests.decidedAt, first: s.users.firstName, last: s.users.lastName, email: s.users.email, phone: s.users.phone, programme: s.programmes.name, programmeCode: s.programmes.code, course: s.courses.title, courseCode: s.courses.code })
    .from(s.enrolmentRequests).innerJoin(s.users, eq(s.users.id, s.enrolmentRequests.userId)).leftJoin(s.programmes, eq(s.programmes.id, s.enrolmentRequests.programmeId)).leftJoin(s.courses, eq(s.courses.id, s.enrolmentRequests.courseId));
  return (status === "PENDING" ? q.where(eq(s.enrolmentRequests.status, "PENDING")) : q).orderBy(desc(s.enrolmentRequests.createdAt)).limit(300);
}

export async function decideRequest(admin: Actor, id: string, decision: "APPROVE" | "REJECT", note: string, ctx: ReqCtx) {
  const cfg = await getSetting("selfService");
  return getDb().transaction(async (tx) => {
    const [r] = await tx.select().from(s.enrolmentRequests).where(eq(s.enrolmentRequests.id, id)).for("update");
    if (!r) throw new AppError("NOT_FOUND", "Request not found.");
    if (r.status !== "PENDING") throw new AppError("CONFLICT", "This request has already been decided.");
    let summary = "";
    if (decision === "APPROVE") {
      const st = await ensureStudent(r.userId, tx);
      if (r.kind === "PROGRAMME" && r.programmeId) {
        const enrolmentId = await enrol(tx, st.id, r.programmeId, APPROVED);
        const n = await registerCourses(tx, enrolmentId, await coreCourseIds(tx, r.programmeId), admin.id);
        summary = `programme enrolled, ${n} course(s) opened`;
      } else if (r.kind === "COURSE" && r.courseId) {
        const mine = await tx.select({ id: s.enrolments.id, programmeId: s.enrolments.programmeId }).from(s.enrolments).where(and(eq(s.enrolments.studentId, st.id), eq(s.enrolments.status, "ACTIVE"))).orderBy(asc(s.enrolments.createdAt));
        const links = await tx.select({ p: s.programmeCourses.programmeId }).from(s.programmeCourses).where(eq(s.programmeCourses.courseId, r.courseId));
        let target = mine.find((e) => links.some((l) => l.p === e.programmeId))?.id ?? mine[0]?.id;
        if (!target) {
          const [home] = await tx.select({ id: s.programmes.id }).from(s.programmeCourses).innerJoin(s.programmes, eq(s.programmes.id, s.programmeCourses.programmeId)).innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId)).where(and(eq(s.programmeCourses.courseId, r.courseId), eq(s.programmes.status, "PUBLISHED"))).orderBy(asc(s.programmeLevels.rank)).limit(1);
          if (!home) throw new AppError("RULE_VIOLATION", "This course is not part of any published programme. Add it to a programme first.");
          target = await enrol(tx, st.id, home.id, APPROVED);
        }
        const n = await registerCourses(tx, target, [r.courseId], admin.id);
        summary = `course opened (${n})`;
      }
    }
    await tx.update(s.enrolmentRequests).set({ status: decision === "APPROVE" ? "APPROVED" : "REJECTED", adminNote: note.slice(0, 500) || null, decidedBy: admin.id, decidedAt: new Date() }).where(eq(s.enrolmentRequests.id, id));
    await audit({ actor: admin, action: `selfservice.${decision === "APPROVE" ? "approved" : "rejected"}`, entityType: "enrolment_request", entityId: id, summary, metadata: { userId: r.userId, kind: r.kind, note } }, ctx, tx);
    await notifyUser({ userId: r.userId, category: "REGISTRATION", title: decision === "APPROVE" ? "Your request was approved" : "Your request was not approved", body: decision === "APPROVE" ? "The course is now open in My courses." : `${note || "Please contact the school office"} (${cfg.approvalContact}).`, link: "/student/courses" }, tx);
    return { userId: r.userId };
  });
}
