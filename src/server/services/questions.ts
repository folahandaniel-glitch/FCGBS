import { and, asc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";

/** Hard Questions: disputed and difficult questions, each answered through several lenses. */
export async function listQuestions(opts: { q?: string; category?: string } = {}) {
  const conds = [eq(s.hardQuestions.status, "PUBLISHED")];
  if (opts.category) conds.push(eq(s.hardQuestions.category, opts.category));
  if (opts.q) conds.push(or(ilike(s.hardQuestions.title, `%${opts.q}%`), ilike(s.hardQuestions.summary, `%${opts.q}%`), ilike(s.hardQuestions.exegetical, `%${opts.q}%`), ilike(s.hardQuestions.theological, `%${opts.q}%`), ilike(s.hardQuestions.scriptures, `%${opts.q}%`))!);
  return getDb().select({ id: s.hardQuestions.id, slug: s.hardQuestions.slug, title: s.hardQuestions.title, category: s.hardQuestions.category, summary: s.hardQuestions.summary, featured: s.hardQuestions.featured, sort: s.hardQuestions.sort }).from(s.hardQuestions).where(and(...conds)).orderBy(asc(s.hardQuestions.category), asc(s.hardQuestions.sort), asc(s.hardQuestions.title)).limit(300);
}

export async function getQuestion(slug: string) {
  const [q] = await getDb().select().from(s.hardQuestions).where(and(eq(s.hardQuestions.slug, slug), eq(s.hardQuestions.status, "PUBLISHED"))).limit(1);
  return q ?? null;
}

export async function questionCategories() {
  const rows = await getDb().select({ c: s.hardQuestions.category }).from(s.hardQuestions).where(eq(s.hardQuestions.status, "PUBLISHED"));
  const n = new Map<string, number>();
  for (const r of rows) n.set(r.c, (n.get(r.c) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}

export const LENSES = [
  { key: "exegetical", label: "Exegesis", sub: "What the text says and means", tone: "royal", ring: "ring-royal-200", head: "from-royal-600 to-navy-800" },
  { key: "genealogical", label: "Genealogy & history", sub: "Persons, lines and the historical record", tone: "amber", ring: "ring-amber-200", head: "from-amber-500 to-orange-700" },
  { key: "archaeological", label: "Archaeology & evidence", sub: "What the ground and the manuscripts show", tone: "emerald", ring: "ring-emerald-200", head: "from-emerald-500 to-teal-700" },
  { key: "apostolic", label: "Apostolic witness", sub: "How the apostles taught and applied it", tone: "sky", ring: "ring-sky-200", head: "from-sky-500 to-royal-700" },
  { key: "prophetic", label: "Prophetic dimension", sub: "Promise, fulfilment and prophecy", tone: "violet", ring: "ring-violet-200", head: "from-violet-500 to-violet-800" },
  { key: "theological", label: "Theological synthesis", sub: "Putting the whole Bible together", tone: "rose", ring: "ring-rose-200", head: "from-rose-500 to-rose-800" },
  { key: "views", label: "Where Christians differ", sub: "Fair statement of other views", tone: "slate", ring: "ring-slate-200", head: "from-slate-500 to-slate-800" },
  { key: "pastoral", label: "Pastoral note", sub: "Living and speaking wisely", tone: "teal", ring: "ring-teal-200", head: "from-teal-500 to-cyan-700" },
] as const;
export type LensKey = (typeof LENSES)[number]["key"];
