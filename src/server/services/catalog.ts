import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "../db";
import * as s from "../db/schema";

/** Read-only public catalogue queries. Only PUBLISHED records are ever returned to the public site. */

export const listProgrammes = cache(async () =>
  getDb()
    .select({ id: s.programmes.id, code: s.programmes.code, slug: s.programmes.slug, name: s.programmes.name, description: s.programmes.description, months: s.programmes.durationMonths, minCredits: s.programmes.minCredits, level: s.programmeLevels.name, levelKey: s.programmeLevels.key, levelRank: s.programmeLevels.rank, department: s.departments.name })
    .from(s.programmes)
    .innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId))
    .leftJoin(s.departments, eq(s.departments.id, s.programmes.departmentId))
    .where(eq(s.programmes.status, "PUBLISHED"))
    .orderBy(asc(s.programmeLevels.rank), asc(s.programmes.sort)),
);

export const getProgramme = cache(async (slug: string) => {
  const [p] = await getDb()
    .select({ p: s.programmes, level: s.programmeLevels.name, department: s.departments.name })
    .from(s.programmes)
    .innerJoin(s.programmeLevels, eq(s.programmeLevels.id, s.programmes.levelId))
    .leftJoin(s.departments, eq(s.departments.id, s.programmes.departmentId))
    .where(and(eq(s.programmes.slug, slug), eq(s.programmes.status, "PUBLISHED")))
    .limit(1);
  if (!p) return null;
  const courses = await getDb()
    .select({ code: s.courses.code, title: s.courses.title, credits: s.courses.credits, kind: s.programmeCourses.kind, year: s.programmeCourses.year, semester: s.programmeCourses.semester, category: s.courses.category })
    .from(s.programmeCourses)
    .innerJoin(s.courses, eq(s.courses.id, s.programmeCourses.courseId))
    .where(eq(s.programmeCourses.programmeId, p.p.id))
    .orderBy(asc(s.programmeCourses.year), asc(s.programmeCourses.semester), asc(s.programmeCourses.sort));
  return { ...p, courses };
});

export const listCourses = cache(async (opts: { q?: string; dept?: string; category?: string; level?: number } = {}) => {
  const where = [eq(s.courses.status, "PUBLISHED")];
  if (opts.q) where.push(or(ilike(s.courses.title, `%${opts.q}%`), ilike(s.courses.code, `%${opts.q}%`), ilike(s.courses.description, `%${opts.q}%`))!);
  if (opts.dept) where.push(eq(departmentsCode, opts.dept));
  if (opts.category) where.push(eq(s.courses.category, opts.category));
  if (opts.level) where.push(eq(s.courses.levelRank, opts.level));
  return getDb()
    .select({ id: s.courses.id, code: s.courses.code, title: s.courses.title, description: s.courses.description, credits: s.courses.credits, levelRank: s.courses.levelRank, category: s.courses.category, department: s.departments.name, deptCode: s.departments.code })
    .from(s.courses)
    .leftJoin(s.departments, eq(s.departments.id, s.courses.departmentId))
    .where(and(...where))
    .orderBy(asc(s.courses.code))
    .limit(300);
});
const departmentsCode = s.departments.code;

export const getCourse = cache(async (code: string) => {
  const [c] = await getDb()
    .select({ c: s.courses, department: s.departments.name })
    .from(s.courses)
    .leftJoin(s.departments, eq(s.departments.id, s.courses.departmentId))
    .where(and(eq(s.courses.code, code.toUpperCase()), eq(s.courses.status, "PUBLISHED")))
    .limit(1);
  if (!c) return null;
  const rel = await getDb()
    .select({ kind: s.courseRelations.kind, code: s.courses.code, title: s.courses.title })
    .from(s.courseRelations)
    .innerJoin(s.courses, eq(s.courses.id, s.courseRelations.relatedCourseId))
    .where(eq(s.courseRelations.courseId, c.c.id));
  const programmes = await getDb()
    .select({ slug: s.programmes.slug, name: s.programmes.name, kind: s.programmeCourses.kind })
    .from(s.programmeCourses)
    .innerJoin(s.programmes, eq(s.programmes.id, s.programmeCourses.programmeId))
    .where(and(eq(s.programmeCourses.courseId, c.c.id), eq(s.programmes.status, "PUBLISHED")));
  return { ...c, relations: rel, programmes };
});

export const listDepartments = cache(async () =>
  getDb()
    .select({ id: s.departments.id, code: s.departments.code, name: s.departments.name, description: s.departments.description, courses: sql<number>`(select count(*)::int from courses c where c.department_id = ${s.departments.id} and c.status = 'PUBLISHED')` })
    .from(s.departments)
    .where(eq(s.departments.active, true))
    .orderBy(asc(s.departments.sort)),
);

export const listPosts = cache(async (kind: string, opts: { limit?: number; audience?: string[] } = {}) =>
  getDb()
    .select()
    .from(s.posts)
    .where(and(eq(s.posts.kind, kind), eq(s.posts.status, "PUBLISHED"), inArray(s.posts.audience, opts.audience ?? ["PUBLIC"])))
    .orderBy(desc(s.posts.pinned), kind === "FAQ" ? asc(s.posts.sort) : desc(s.posts.publishedAt))
    .limit(opts.limit ?? 50),
);

export const getPost = cache(async (kind: string, slug: string) => {
  const [p] = await getDb().select().from(s.posts).where(and(eq(s.posts.kind, kind), eq(s.posts.slug, slug), eq(s.posts.status, "PUBLISHED"), eq(s.posts.audience, "PUBLIC"))).limit(1);
  return p ?? null;
});

export const carouselPosts = cache(async () =>
  getDb().select().from(s.posts).where(and(eq(s.posts.showInCarousel, true), eq(s.posts.status, "PUBLISHED"), eq(s.posts.audience, "PUBLIC"))).orderBy(desc(s.posts.pinned), desc(s.posts.publishedAt)).limit(6),
);

export const getPolicy = cache(async (key: string) => {
  const [p] = await getDb().select().from(s.policies).where(and(eq(s.policies.key, key), eq(s.policies.isCurrent, true), eq(s.policies.status, "PUBLISHED"))).limit(1);
  return p ?? null;
});

export const publicFaculty = cache(async () =>
  getDb()
    .select({ firstName: s.users.firstName, lastName: s.users.lastName, title: s.staffProfiles.title, rank: s.staffProfiles.rank, specialization: s.staffProfiles.specialization, qualifications: s.staffProfiles.qualifications, bio: s.staffProfiles.bio, department: s.departments.name, avatar: s.users.avatarAssetId })
    .from(s.staffProfiles)
    .innerJoin(s.users, eq(s.users.id, s.staffProfiles.userId))
    .leftJoin(s.departments, eq(s.departments.id, s.staffProfiles.departmentId))
    .where(and(eq(s.staffProfiles.publicProfile, true), eq(s.users.status, "ACTIVE")))
    .orderBy(asc(s.users.lastName)),
);

export const listLibrary = cache(async (opts: { q?: string; hub?: string; category?: string; publicOnly?: boolean } = {}) => {
  const where = [eq(s.libraryResources.status, "PUBLISHED")];
  if (opts.publicOnly) where.push(eq(s.libraryResources.accessLevel, "PUBLIC"));
  if (opts.hub) where.push(eq(s.libraryResources.hub, opts.hub));
  if (opts.category) where.push(eq(s.libraryResources.category, opts.category));
  if (opts.q) where.push(or(ilike(s.libraryResources.title, `%${opts.q}%`), ilike(s.libraryResources.author, `%${opts.q}%`))!);
  return getDb().select().from(s.libraryResources).where(and(...where)).orderBy(asc(s.libraryResources.category), asc(s.libraryResources.title)).limit(200);
});
