/**
 * LOCAL DEMO DATA — clearly labelled and never for production (spec §86, §115).
 * Creates demo staff and two demo students (e-mails end in @demo.fcgbs.test), opens CCF courses in the current
 * semester, publishes a sample assignment and assigns a mentor. Refuses to run against a non-local database.
 * Passwords are random and written to .data/demo-credentials.txt (git-ignored).
 */
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { seedStructure } from "../src/server/seed";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/127\.0\.0\.1|localhost/.test(url) || process.env.NODE_ENV === "production") throw new Error("Demo data is only allowed on a local development database.");
  const db = getDb();
  await seedStructure(db);
  const lines: string[] = ["FCGBS DEMO CREDENTIALS (local only)", ""];
  const mk = async (key: string, first: string, last: string, type: "STAFF" | "APPLICANT", role?: string) => {
    const email = `${key}@demo.fcgbs.test`;
    const [ex] = await db.select().from(s.users).where(eq(s.users.email, email));
    if (ex) return ex.id;
    const pw = `Demo!${randomBytes(6).toString("base64url")}9a`;
    const [u] = await db.insert(s.users).values({ email, passwordHash: await hashPassword(pw), userType: type, firstName: first, lastName: last }).returning({ id: s.users.id });
    if (role) { const [r] = await db.select().from(s.roles).where(eq(s.roles.key, role)); await db.insert(s.userRoles).values({ userId: u.id, roleId: r.id }); await db.insert(s.staffProfiles).values({ userId: u.id, title: "Demo", rank: role, publicProfile: false }); }
    lines.push(`${type === "STAFF" ? "/backend" : "/login"}  ${email}  ${pw}  (${role ?? "student"})`);
    return u.id;
  };
  const lecturer = await mk("demo-lecturer", "Demo", "Lecturer", "STAFF", "lecturer");
  await mk("demo-hod", "Demo", "Hod", "STAFF", "hod");
  await mk("demo-registrar", "Demo", "Registrar", "STAFF", "registrar");
  await mk("demo-registrar2", "Demo", "Registrar Two", "STAFF", "registrar");
  await mk("demo-board", "Demo", "Board", "STAFF", "board");
  const mentor = await mk("demo-mentor", "Demo", "Mentor", "STAFF", "mentor");
  await mk("demo-finance", "Demo", "Finance", "STAFF", "finance");
  const [prog] = await db.select().from(s.programmes).where(eq(s.programmes.code, "CCF"));
  const [term] = await db.select().from(s.academicTerms).where(eq(s.academicTerms.isCurrent, true));
  const [campus] = await db.select().from(s.campuses).limit(1);
  for (const [i, nm] of [["demo-student1", "Ada"], ["demo-student2", "Tunde"]].entries()) {
    const uid = await mk(nm[0], nm[1], "Demo", "APPLICANT");
    const [has] = await db.select().from(s.students).where(eq(s.students.userId, uid));
    if (has) continue;
    await db.update(s.users).set({ userType: "STUDENT" }).where(eq(s.users.id, uid));
    const [st] = await db.insert(s.students).values({ userId: uid, studentNumber: `FCGBS/DEMO/${String(i + 1).padStart(4, "0")}`, campusId: campus?.id }).returning();
    await db.insert(s.enrolments).values({ studentId: st.id, programmeId: prog.id });
    if (i === 0) await db.insert(s.mentorAssignments).values({ mentorId: mentor, studentId: st.id });
  }
  const core = await db.select({ courseId: s.programmeCourses.courseId }).from(s.programmeCourses).where(eq(s.programmeCourses.programmeId, prog.id));
  for (const c of core) await db.insert(s.offerings).values({ courseId: c.courseId, termId: term.id, lecturerId: lecturer, campusId: campus?.id }).onConflictDoNothing();
  const [off] = await db.select().from(s.offerings).where(eq(s.offerings.lecturerId, lecturer)).limit(1);
  if (off) {
    const [dupe] = await db.select().from(s.assessments).where(eq(s.assessments.offeringId, off.id));
    if (!dupe) await db.insert(s.assessments).values({ offeringId: off.id, kind: "ASSIGNMENT", title: "Demo reflection essay", instructions: "Write 300 words on what you hope to learn.", dueAt: new Date(Date.now() + 14 * 86_400_000), status: "PUBLISHED", createdBy: lecturer });
  }
  fs.mkdirSync(".data", { recursive: true });
  if (lines.length > 2) fs.writeFileSync(".data/demo-credentials.txt", lines.join("\n") + "\n");
  console.log(lines.length > 2 ? "✔ demo data created — credentials in .data/demo-credentials.txt" : "✔ demo data already present");
  process.exit(0);
}
main().catch((e) => { console.error("✖ demo seed failed:", e); process.exit(1); });
