import { NEW_PROGRAMMES } from "@/content/programmes-more";
import { afterAll, beforeAll, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { ALL_COURSES, PROGRAMMES } from "@/content/programmes";
import * as s from "@/server/db/schema";

let ctx: Awaited<ReturnType<typeof freshDb>>;
beforeAll(async () => { ctx = await freshDb(); }, 120000);
afterAll(async () => { await ctx?.close(); });

it("catalogue is internally consistent", () => {
  const codes = new Set(ALL_COURSES.map((c) => c.code));
  expect(codes.size).toBe(ALL_COURSES.length);
  for (const p of PROGRAMMES) for (const c of [...p.core, ...p.electives]) expect(codes.has(c), `${p.code} -> ${c}`).toBe(true);
  for (const c of ALL_COURSES) for (const r of c.prereq ?? []) expect(codes.has(r), `${c.code} prereq ${r}`).toBe(true);
});

it("seeds idempotently", async () => {
  await seedStructure(ctx.db);
  await seedStructure(ctx.db);
  const [p] = await ctx.db.select({ n: count() }).from(s.programmes);
  const [c] = await ctx.db.select({ n: count() }).from(s.courses);
  expect(p.n).toBe(PROGRAMMES.length + NEW_PROGRAMMES.length);
  expect(c.n).toBe(ALL_COURSES.length);
}, 120000);
