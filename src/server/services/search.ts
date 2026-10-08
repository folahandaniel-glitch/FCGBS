import { and, eq, ilike, or } from "drizzle-orm";
import { can, type Principal } from "@/core/permissions";
import { getDb } from "../db";
import * as s from "../db/schema";

export interface Hit { kind: string; title: string; sub?: string; href: string }

/** Global search that respects permissions: a result type is searched only if the caller may see that type (spec §61). */
export async function globalSearch(actor: Principal, q: string): Promise<Hit[]> {
  const term = `%${q.trim().slice(0, 60)}%`;
  if (q.trim().length < 2) return [];
  const db = getDb();
  const out: Hit[] = [];
  const [progs, courses, posts, lib] = await Promise.all([
    db.select({ id: s.programmes.id, name: s.programmes.name, code: s.programmes.code }).from(s.programmes).where(or(ilike(s.programmes.name, term), ilike(s.programmes.code, term))).limit(8),
    db.select({ id: s.courses.id, title: s.courses.title, code: s.courses.code }).from(s.courses).where(or(ilike(s.courses.title, term), ilike(s.courses.code, term))).limit(10),
    can(actor, "content.manage") ? db.select({ id: s.posts.id, title: s.posts.title, kind: s.posts.kind }).from(s.posts).where(ilike(s.posts.title, term)).limit(8) : Promise.resolve([]),
    can(actor, "library.manage") ? db.select({ id: s.libraryResources.id, title: s.libraryResources.title }).from(s.libraryResources).where(ilike(s.libraryResources.title, term)).limit(8) : Promise.resolve([]),
  ]);
  progs.forEach((p) => out.push({ kind: "Programme", title: p.name, sub: p.code, href: can(actor, "programmes.manage") ? `/admin/programmes/${p.id}` : `/programmes` }));
  courses.forEach((c) => out.push({ kind: "Course", title: c.title, sub: c.code, href: can(actor, "courses.manage") ? `/admin/courses/${c.id}` : `/courses/${c.code}` }));
  posts.forEach((p) => out.push({ kind: p.kind.toLowerCase(), title: p.title, href: `/admin/r/posts/${p.id}` }));
  lib.forEach((l) => out.push({ kind: "Library", title: l.title, href: `/admin/r/library/${l.id}` }));
  if (can(actor, "students.view")) {
    const st = await db.select({ id: s.students.id, n: s.students.studentNumber, f: s.users.firstName, l: s.users.lastName }).from(s.students).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(or(ilike(s.users.firstName, term), ilike(s.users.lastName, term), ilike(s.students.studentNumber, term))).limit(10);
    st.forEach((x) => out.push({ kind: "Student", title: `${x.l} ${x.f}`, sub: x.n, href: `/admin/students/${x.id}` }));
  }
  if (can(actor, "faculty.view") || can(actor, "users.view")) {
    const fa = await db.select({ id: s.users.id, f: s.users.firstName, l: s.users.lastName, e: s.users.email }).from(s.users).where(and(eq(s.users.userType, "STAFF"), or(ilike(s.users.firstName, term), ilike(s.users.lastName, term)))).limit(8);
    fa.forEach((x) => out.push({ kind: "Staff", title: `${x.l} ${x.f}`, sub: x.e, href: `/admin/faculty` }));
  }
  if (can(actor, "certificates.issue") || can(actor, "audit.view")) {
    const ce = await db.select({ id: s.certificates.id, n: s.certificates.number, h: s.certificates.holderName }).from(s.certificates).where(or(ilike(s.certificates.number, term), ilike(s.certificates.holderName, term))).limit(8);
    ce.forEach((x) => out.push({ kind: "Certificate", title: x.h, sub: x.n, href: `/admin/graduation` }));
  }
  return out;
}
