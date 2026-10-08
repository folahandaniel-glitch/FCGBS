import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";

/** Public teaching library: tracks (Apostolic, Pastoral, Evangelical, Prophetic, Revival & Reformation …) and their teachings. */
export async function listTracks() {
  const db = getDb();
  const tracks = await db.select().from(s.teachingTracks).where(eq(s.teachingTracks.status, "PUBLISHED")).orderBy(asc(s.teachingTracks.sort), asc(s.teachingTracks.title));
  const counts = await db.select({ trackId: s.teachings.trackId, n: sql<number>`count(*)::int`, mins: sql<number>`coalesce(sum(${s.teachings.minutes}),0)::int` }).from(s.teachings).where(eq(s.teachings.status, "PUBLISHED")).groupBy(s.teachings.trackId);
  return tracks.map((t) => ({ ...t, count: counts.find((c) => c.trackId === t.id)?.n ?? 0, minutes: counts.find((c) => c.trackId === t.id)?.mins ?? 0 }));
}

export async function getTrack(slug: string) {
  const [t] = await getDb().select().from(s.teachingTracks).where(and(eq(s.teachingTracks.slug, slug), eq(s.teachingTracks.status, "PUBLISHED"))).limit(1);
  return t ?? null;
}

const cols = { id: s.teachings.id, slug: s.teachings.slug, title: s.teachings.title, summary: s.teachings.summary, level: s.teachings.level, minutes: s.teachings.minutes, author: s.teachings.author, featured: s.teachings.featured, audience: s.teachings.audience, trackId: s.teachings.trackId, trackSlug: s.teachingTracks.slug, trackTitle: s.teachingTracks.title, colour: s.teachingTracks.colour, audioUrl: s.teachings.audioUrl, audioAssetId: s.teachings.audioAssetId, videoUrl: s.teachings.videoUrl };

export async function listTeachings(opts: { trackId?: string; q?: string; featured?: boolean; limit?: number } = {}) {
  const conds = [eq(s.teachings.status, "PUBLISHED"), eq(s.teachingTracks.status, "PUBLISHED")];
  if (opts.trackId) conds.push(eq(s.teachings.trackId, opts.trackId));
  if (opts.featured) conds.push(eq(s.teachings.featured, true));
  if (opts.q) conds.push(or(ilike(s.teachings.title, `%${opts.q}%`), ilike(s.teachings.summary, `%${opts.q}%`), ilike(s.teachings.body, `%${opts.q}%`), ilike(s.teachings.scriptures, `%${opts.q}%`))!);
  return getDb().select(cols).from(s.teachings).innerJoin(s.teachingTracks, eq(s.teachingTracks.id, s.teachings.trackId)).where(and(...conds)).orderBy(asc(s.teachingTracks.sort), asc(s.teachings.sort), asc(s.teachings.title)).limit(opts.limit ?? 200);
}

export async function getTeaching(trackSlug: string, slug: string) {
  const [t] = await getDb().select({ ...cols, body: s.teachings.body, scriptures: s.teachings.scriptures, updatedAt: s.teachings.updatedAt, imageAssetId: s.teachings.imageAssetId }).from(s.teachings).innerJoin(s.teachingTracks, eq(s.teachingTracks.id, s.teachings.trackId)).where(and(eq(s.teachings.slug, slug), eq(s.teachingTracks.slug, trackSlug), eq(s.teachings.status, "PUBLISHED"))).limit(1);
  return t ?? null;
}

export async function getTeachingBySlug(slug: string) {
  const [t] = await getDb().select({ ...cols, body: s.teachings.body, scriptures: s.teachings.scriptures }).from(s.teachings).innerJoin(s.teachingTracks, eq(s.teachingTracks.id, s.teachings.trackId)).where(and(eq(s.teachings.slug, slug), eq(s.teachings.status, "PUBLISHED"))).limit(1);
  return t ?? null;
}

export async function latestTeachings(limit = 6) {
  return getDb().select(cols).from(s.teachings).innerJoin(s.teachingTracks, eq(s.teachingTracks.id, s.teachings.trackId)).where(and(eq(s.teachings.status, "PUBLISHED"), eq(s.teachingTracks.status, "PUBLISHED"))).orderBy(desc(s.teachings.featured), desc(s.teachings.updatedAt)).limit(limit);
}

export const scriptureList = (raw: string | null) => (raw ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

/** Materials (PDF, DOCX, PPTX, MP3, video, links) for a course or a teaching. Students-only items are hidden from visitors. */
export async function materialsFor(owner: { courseId?: string; teachingId?: string }, signedIn: boolean) {
  const conds = [eq(s.materials.status, "PUBLISHED")];
  if (owner.courseId) conds.push(eq(s.materials.courseId, owner.courseId));
  if (owner.teachingId) conds.push(eq(s.materials.teachingId, owner.teachingId));
  if (!signedIn) conds.push(eq(s.materials.audience, "PUBLIC"));
  return getDb().select().from(s.materials).where(and(...conds)).orderBy(asc(s.materials.sort), asc(s.materials.title));
}

export async function materialsForCourses(courseIds: string[]) {
  if (!courseIds.length) return [];
  return getDb().select().from(s.materials).where(and(inArray(s.materials.courseId, courseIds), eq(s.materials.status, "PUBLISHED"))).orderBy(asc(s.materials.sort), asc(s.materials.title));
}
