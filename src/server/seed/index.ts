import { and, eq, inArray, sql } from "drizzle-orm";
import { ALL_PERMISSIONS, SYSTEM_ROLES } from "@/core/permissions";
import { ADMISSION_BY_LEVEL, ALL_COURSES, ASSESSMENT_NOTE, DEPARTMENTS, GRADUATION_BY_LEVEL, LEVELS, PROGRAMMES, RECOGNITION_NOTE } from "@/content/programmes";
import { LESSONS, QUESTIONS } from "@/content/lessons";
import { MORE_LESSONS } from "@/content/lessons-more";
import { COURSE_TEACHINGS } from "@/content/course-teachings";
import { ELECTIVE_ADDITIONS, NEW_PROGRAMMES } from "@/content/programmes-more";
import { MATERIALS } from "@/content/materials";
import { FAQS, POLICIES } from "@/content/policies";
import { TEACHINGS, TRACKS } from "@/content/teachings";
import type { DB } from "../db";
import * as s from "../db/schema";

/**
 * Idempotent structural seed: roles, levels, departments, the full course catalogue with lessons and
 * sample questions, programmes, the first academic session, policies, FAQs and library listings.
 * Safe to run on every deploy. Contains NO people, students, results or demo accounts.
 */
export async function seedStructure(db: DB) {
  // ---- roles & permissions
  for (const r of SYSTEM_ROLES) {
    const [row] = await db
      .insert(s.roles)
      .values({ key: r.key, name: r.name, groupName: r.group, description: r.description, isSystem: true })
      .onConflictDoUpdate({ target: s.roles.key, set: { isSystem: true } })
      .returning({ id: s.roles.id });
    const have = await db.select({ k: s.rolePermissions.permissionKey }).from(s.rolePermissions).where(eq(s.rolePermissions.roleId, row.id));
    // Only seed a role's permissions the first time, so the Super Admin's edits are never overwritten.
    if (have.length === 0) await db.insert(s.rolePermissions).values(r.permissions.filter((p) => ALL_PERMISSIONS.includes(p)).map((p) => ({ roleId: row.id, permissionKey: p })));
  }

  // Permissions introduced after a deployment: give them to the roles whose defaults include them, exactly once.
  const [seenRow] = await db.select({ v: s.settings.value }).from(s.settings).where(eq(s.settings.key, "permissionsSeen")).limit(1);
  // Before this record existed, every permission except the access-code ones was already in the catalogue.
  const seen = new Set<string>(Array.isArray(seenRow?.v) ? (seenRow.v as string[]) : ALL_PERMISSIONS.filter((p) => !p.startsWith("codes.")));
  {
    const fresh = ALL_PERMISSIONS.filter((p) => !seen.has(p));
    for (const r of SYSTEM_ROLES) {
      const add = r.permissions.filter((p) => fresh.includes(p));
      if (!add.length) continue;
      const [row] = await db.select({ id: s.roles.id }).from(s.roles).where(eq(s.roles.key, r.key));
      if (row) await db.insert(s.rolePermissions).values(add.map((p) => ({ roleId: row.id, permissionKey: p }))).onConflictDoNothing();
    }
  }
  await db.insert(s.settings).values({ key: "permissionsSeen", value: [...ALL_PERMISSIONS] }).onConflictDoUpdate({ target: s.settings.key, set: { value: [...ALL_PERMISSIONS] } });

  // ---- levels, departments, campus
  for (const l of LEVELS) await db.insert(s.programmeLevels).values(l).onConflictDoNothing();
  for (const [i, d] of DEPARTMENTS.entries()) await db.insert(s.departments).values({ ...d, sort: i }).onConflictDoNothing();
  await db.insert(s.campuses).values({ code: "ONLINE", name: "Online Campus (Global)", isOnline: true, country: "Global" }).onConflictDoNothing();

  const levels = new Map((await db.select().from(s.programmeLevels)).map((l) => [l.key, l.id]));
  const depts = new Map((await db.select().from(s.departments)).map((d) => [d.code, d.id]));

  // ---- courses
  const existingCourseCodes = new Set((await db.select({ code: s.courses.code }).from(s.courses)).map((c) => c.code));
  const approved = { status: "PUBLISHED" as const };
  for (const c of ALL_COURSES) {
    await db
      .insert(s.courses)
      .values({
        code: c.code, title: c.title, description: c.summary, departmentId: depts.get(c.dept), levelRank: c.level, credits: c.credits,
        contactHours: c.credits * 15, category: c.category, objectives: c.objectives, outcomes: c.outcomes,
        topics: c.topics.map(([title, pts]) => ({ title, points: pts.split(";").map((p) => p.trim()).filter(Boolean) })),
        readings: c.readings, practicalRequirements: c.practical ?? null, ministryRequirements: c.ministry ?? null,
        assessmentWeights: c.weights ?? { assignment: 20, test: 20, exam: 60, practical: 0 }, ...approved,
      })
      .onConflictDoNothing();
  }
  const courseRows = await db.select().from(s.courses);
  const courseId = new Map(courseRows.map((c) => [c.code, c.id]));

  // ---- prerequisites
  for (const c of ALL_COURSES) for (const p of c.prereq ?? []) {
    const a = courseId.get(c.code), b = courseId.get(p);
    if (a && b) await db.insert(s.courseRelations).values({ courseId: a, relatedCourseId: b, kind: "PREREQUISITE" }).onConflictDoNothing();
  }

  // ---- lessons: a generated Course Guide per course, plus flagship lessons
  for (const c of ALL_COURSES) {
    const cid = courseId.get(c.code)!;
    const [existing] = await db.select({ id: s.modules.id }).from(s.modules).where(eq(s.modules.courseId, cid)).limit(1);
    if (existing) continue;
    const [mod] = await db.insert(s.modules).values({ courseId: cid, title: "Course guide", summary: "Orientation, outcomes, syllabus and reading.", position: 0 }).returning({ id: s.modules.id });
    const guide = [
      `## About this course\n${c.summary}`,
      `## Learning objectives\n${c.objectives.map((o) => `- ${o}`).join("\n")}`,
      `## Learning outcomes\nBy the end of this course you should be able to:\n${c.outcomes.map((o) => `- ${o}`).join("\n")}`,
      `## Syllabus\n${c.topics.map(([t, pts]) => `### ${t}\n${pts.split(";").map((p) => `- ${p.trim()}`).join("\n")}`).join("\n\n")}`,
      `## Recommended reading\nThese works are listed for your study; obtain them lawfully (library, purchase or publisher). The school does not supply copyrighted books.\n${c.readings.map((r) => `- ${r}`).join("\n")}`,
      c.practical || c.ministry ? `## Practical and ministry requirements\n${[c.practical, c.ministry].filter(Boolean).join("\n\n")}` : "",
      `## How you will be assessed\n${ASSESSMENT_NOTE}`,
    ].filter(Boolean).join("\n\n");
    await db.insert(s.lessons).values({ moduleId: mod.id, courseId: cid, title: "Course guide and syllabus", summary: "Start here.", body: guide, readMinutes: 6, position: 0, authority: "ACADEMIC" });
    const flagship = LESSONS.filter((l) => l.course === c.code);
    if (flagship.length) {
      const [m2] = await db.insert(s.modules).values({ courseId: cid, title: "Lessons", summary: "Core lesson notes.", position: 1 }).returning({ id: s.modules.id });
      for (const [i, l] of flagship.entries()) await db.insert(s.lessons).values({ moduleId: m2.id, courseId: cid, title: l.title, summary: l.summary, body: l.body, readMinutes: l.minutes, position: i, authority: l.authority ?? "ACADEMIC" });
    }
  }

  // ---- sample approved questions (only if the course has none)
  const withQ = new Set((await db.select({ c: s.questions.courseId }).from(s.questions)).map((r) => r.c));
  for (const q of QUESTIONS) {
    const cid = courseId.get(q.course);
    if (!cid || withQ.has(cid)) continue;
    await db.insert(s.questions).values({
      courseId: cid, type: "MCQ", stem: q.stem, marks: 1, status: "APPROVED", explanation: q.explanation,
      options: q.options.map((text, i) => ({ id: String.fromCharCode(97 + i), text })), answer: String.fromCharCode(97 + q.answer),
    });
  }

  // ---- programmes
  for (const [i, p] of [...PROGRAMMES, ...NEW_PROGRAMMES].entries()) {
    const levelRank = LEVELS.find((l) => l.key === p.level)!.rank;
    const credits = p.core.reduce((a, code) => a + (ALL_COURSES.find((c) => c.code === code)?.credits ?? 0), 0);
    const [row] = await db
      .insert(s.programmes)
      .values({
        code: p.code, slug: p.slug, name: p.name, levelId: levels.get(p.level)!, departmentId: depts.get(p.dept), description: p.description,
        objectives: p.objectives, learningOutcomes: p.outcomes, admissionRequirements: ADMISSION_BY_LEVEL[p.level],
        graduationRequirements: GRADUATION_BY_LEVEL(credits, p.practicumHours, p.research, p.minCgpa),
        practicalRequirements: p.practical ?? "No practicum requirement for this programme.", assessmentRequirements: ASSESSMENT_NOTE,
        recognitionNote: RECOGNITION_NOTE, durationMonths: p.months, minCredits: credits, minCgpa: p.minCgpa, practicumHours: p.practicumHours,
        researchRequired: p.research, status: "PUBLISHED", sort: levelRank * 100 + i,
      })
      .onConflictDoNothing()
      .returning({ id: s.programmes.id });
    if (!row) continue; // already seeded; leave admin edits alone
    const semesters = levelRank === 1 ? 2 : 4;
    const per = Math.ceil(p.core.length / semesters);
    const links = [
      ...p.core.map((code, idx) => ({ programmeId: row.id, courseId: courseId.get(code)!, kind: "CORE", year: Math.floor(Math.floor(idx / per) / 2) + 1, semester: (Math.floor(idx / per) % 2) + 1, sort: idx })),
      ...p.electives.map((code, idx) => ({ programmeId: row.id, courseId: courseId.get(code)!, kind: "ELECTIVE", year: 1, semester: 1, sort: 100 + idx })),
    ].filter((l) => l.courseId);
    if (links.length) await db.insert(s.programmeCourses).values(links).onConflictDoNothing();
  }

  // ---- new courses become electives of existing programmes (only when the course is first created)
  const freshCourses = new Set(ALL_COURSES.filter((c) => !existingCourseCodes.has(c.code)).map((c) => c.code));
  if (freshCourses.size) {
    const progId = new Map((await db.select({ id: s.programmes.id, code: s.programmes.code }).from(s.programmes)).map((p) => [p.code, p.id]));
    for (const [pcode, codes] of Object.entries(ELECTIVE_ADDITIONS)) {
      const pid = progId.get(pcode);
      if (!pid) continue;
      const rows = codes.filter((c) => freshCourses.has(c) && courseId.get(c)).map((c, idx) => ({ programmeId: pid, courseId: courseId.get(c)!, kind: "ELECTIVE", year: 1, semester: 1, sort: 200 + idx }));
      if (rows.length) await db.insert(s.programmeCourses).values(rows).onConflictDoNothing();
    }
  }

  // ---- teaching-library lessons and extra flagship lessons: added once by title, never overwriting lecturer edits
  const addLessons = async (code: string, moduleTitle: string, lessons: { title: string; summary: string | null; body: string; minutes: number }[]) => {
    const cid = courseId.get(code);
    if (!cid || !lessons.length) return;
    const have = new Set((await db.select({ t: s.lessons.title }).from(s.lessons).where(eq(s.lessons.courseId, cid))).map((l) => l.t));
    const todo = lessons.filter((l) => !have.has(l.title));
    if (!todo.length) return;
    let [mod] = await db.select({ id: s.modules.id }).from(s.modules).where(and(eq(s.modules.courseId, cid), eq(s.modules.title, moduleTitle))).limit(1);
    if (!mod) {
      const mods = await db.select({ p: s.modules.position }).from(s.modules).where(eq(s.modules.courseId, cid));
      [mod] = await db.insert(s.modules).values({ courseId: cid, title: moduleTitle, summary: "Lessons from the FCGBS teaching library and faculty.", position: Math.max(0, ...mods.map((m) => m.p)) + 1 }).returning({ id: s.modules.id });
    }
    const start = (await db.select({ p: s.lessons.position }).from(s.lessons).where(eq(s.lessons.moduleId, mod.id))).reduce((a, l) => Math.max(a, l.p + 1), 0);
    await db.insert(s.lessons).values(todo.map((l, i) => ({ moduleId: mod.id, courseId: cid, title: l.title, summary: l.summary, body: l.body, readMinutes: l.minutes, position: start + i, authority: "ACADEMIC" })));
  };
  const teaching = new Map(TEACHINGS.map((t) => [t.slug, t]));
  for (const [code, slugs] of Object.entries(COURSE_TEACHINGS)) {
    await addLessons(code, "Teaching lessons", slugs.map((sl) => teaching.get(sl)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((t) => ({ title: t.title, summary: t.summary, body: t.body, minutes: t.minutes })));
  }
  for (const code of new Set(MORE_LESSONS.map((l) => l.course))) {
    await addLessons(code, "Lessons", MORE_LESSONS.filter((l) => l.course === code).map((l) => ({ title: l.title, summary: l.summary, body: l.body, minutes: l.minutes })));
  }

  // ---- starter study materials (links), added once per owner and title
  {
    const teachingId = new Map((await db.select({ id: s.teachings.id, slug: s.teachings.slug }).from(s.teachings)).map((t) => [t.slug, t.id]));
    const have = new Set((await db.select({ c: s.materials.courseId, t: s.materials.teachingId, title: s.materials.title }).from(s.materials)).map((m) => `${m.c ?? ""}|${m.t ?? ""}|${m.title}`));
    const rows: (typeof s.materials.$inferInsert)[] = [];
    for (const m of MATERIALS) {
      for (const code of m.course ?? []) {
        const cid = courseId.get(code);
        if (cid && !have.has(`${cid}||${m.title}`)) rows.push({ title: m.title, kind: m.kind, description: m.description, courseId: cid, url: m.url, audience: m.audience ?? "STUDENTS", status: "PUBLISHED" });
      }
      for (const slug of m.teaching ?? []) {
        const tid = teachingId.get(slug);
        if (tid && !have.has(`|${tid}|${m.title}`)) rows.push({ title: m.title, kind: m.kind, description: m.description, teachingId: tid, url: m.url, audience: m.audience ?? "PUBLIC", status: "PUBLISHED" });
      }
    }
    for (let i = 0; i < rows.length; i += 100) await db.insert(s.materials).values(rows.slice(i, i + 100));
  }

  // ---- first academic session (current year) and two semesters
  const [anySession] = await db.select({ id: s.academicSessions.id }).from(s.academicSessions).limit(1);
  if (!anySession) {
    const y = new Date().getFullYear();
    const [sess] = await db.insert(s.academicSessions).values({ name: `${y}/${y + 1}`, startsOn: `${y}-09-01`, endsOn: `${y + 1}-07-31`, admissionDeadline: `${y}-12-15`, isCurrent: true }).returning({ id: s.academicSessions.id });
    await db.insert(s.academicTerms).values([
      { sessionId: sess.id, name: "First Semester", ordinal: 1, startsOn: `${y}-09-15`, endsOn: `${y + 1}-02-15`, registrationOpens: `${y}-09-01`, registrationCloses: `${y}-10-31`, examsStart: `${y + 1}-01-15`, examsEnd: `${y + 1}-02-10`, isCurrent: true },
      { sessionId: sess.id, name: "Second Semester", ordinal: 2, startsOn: `${y + 1}-03-01`, endsOn: `${y + 1}-07-15`, registrationOpens: `${y + 1}-02-20`, registrationCloses: `${y + 1}-03-31`, examsStart: `${y + 1}-06-20`, examsEnd: `${y + 1}-07-10` },
    ]);
  }

  // ---- policies (v1, published) and FAQs
  for (const p of POLICIES) {
    const [have] = await db.select({ id: s.policies.id }).from(s.policies).where(eq(s.policies.key, p.key)).limit(1);
    if (!have) await db.insert(s.policies).values({ key: p.key, title: p.title, body: p.body, version: 1, status: "PUBLISHED", isCurrent: true, approvedAt: new Date(), changeNote: "Initial institutional draft for Academic Board review.", effectiveOn: new Date().toISOString().slice(0, 10) });
  }
  const [anyFaq] = await db.select({ id: s.posts.id }).from(s.posts).where(eq(s.posts.kind, "FAQ")).limit(1);
  if (!anyFaq) {
    await db.insert(s.posts).values(FAQS.map((f, i) => ({ kind: "FAQ", title: f.q, slug: `faq-${i + 1}`, body: f.a, status: "PUBLISHED" as const, sort: i, publishedAt: new Date() })));
  }

  // ---- teaching library: tracks and teachings are added by slug; anything an administrator already edited is left alone
  for (const t of TRACKS) await db.insert(s.teachingTracks).values({ slug: t.slug, title: t.title, tagline: t.tagline, description: t.description, colour: t.colour, icon: t.icon, sort: t.sort, status: "PUBLISHED" }).onConflictDoNothing();
  const trackId = new Map((await db.select({ id: s.teachingTracks.id, slug: s.teachingTracks.slug }).from(s.teachingTracks)).map((t) => [t.slug, t.id]));
  const haveTeaching = new Set((await db.select({ slug: s.teachings.slug }).from(s.teachings)).map((t) => t.slug));
  const freshTeachings = TEACHINGS.filter((t) => !haveTeaching.has(t.slug) && trackId.has(t.track));
  for (let i = 0; i < freshTeachings.length; i += 25) {
    await db.insert(s.teachings).values(freshTeachings.slice(i, i + 25).map((t, j) => ({ trackId: trackId.get(t.track)!, slug: t.slug, title: t.title, summary: t.summary, body: t.body, scriptures: t.scriptures.join("\n"), level: t.level, minutes: t.minutes, author: "FCGBS Faculty", featured: Boolean(t.featured), audience: "PUBLIC", sort: i + j, status: "PUBLISHED" as const })).slice(0)).onConflictDoNothing();
  }

  // ---- library: every recommended reading is listed as a citation-only record (no file, no copyright claim)
  const [anyLib] = await db.select({ id: s.libraryResources.id }).from(s.libraryResources).limit(1);
  if (!anyLib) {
    const seen = new Map<string, { cat: string; hub: string | null }>();
    for (const c of ALL_COURSES) for (const r of c.readings) if (!/provided by the school|course portal|Bible \(KJV/i.test(r) && !seen.has(r)) {
      seen.set(r, { cat: c.category.replace(/_/g, " ").toLowerCase().replace(/^\w/, (x) => x.toUpperCase()), hub: c.category === "TECH_HUB" ? "TECH" : c.category === "KINGDOM_ENTERPRISE" ? "KINGDOM_ENTERPRISE" : null });
    }
    const rows = [...seen.entries()].map(([citation, v]) => {
      const [author, ...rest] = citation.split(", ");
      return { title: rest.join(", ") || citation, author: rest.length ? author : null, category: v.cat, resourceType: "REFERENCE", accessLevel: "STUDENTS", citation, description: "Recommended reading — citation only. Obtain this work lawfully; the school does not distribute it.", rightsConfirmed: false, hub: v.hub, status: "PUBLISHED" as const };
    });
    for (let i = 0; i < rows.length; i += 50) await db.insert(s.libraryResources).values(rows.slice(i, i + 50));
  }
  void inArray;
  void sql;
}
