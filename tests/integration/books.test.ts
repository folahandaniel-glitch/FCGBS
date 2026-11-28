import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { registerApplicant } from "@/server/services/auth";
import { codesFor, generateBookCodes, myBookIds, ownership, publishedBooks, redeemBookCode, revokeBookCode, saveBook, setDownloadAllowed } from "@/server/services/books";
import { splitChapters } from "@/core/books";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import type { Actor } from "@/server/audit";

const ctx = { ip: "10.0.0.12", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;
let admin: Actor, one: Actor, two: Actor;

async function person(email: string, first: string, type: Actor["userType"]): Promise<Actor> {
  await registerApplicant({ firstName: first, lastName: "Tester", email, password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [u] = await getDb().update(s.users).set({ userType: type }).where(eq(s.users.email, email)).returning();
  return { id: u.id, userType: type, permissions: new Set(), name: first, email };
}

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  admin = await person("books-admin@example.com", "Boss", "SUPER_ADMIN");
  one = await person("buyer1@example.com", "Ada", "APPLICANT");
  two = await person("buyer2@example.com", "Bola", "APPLICANT");
}, 120000);
afterAll(async () => { await close?.(); });

it("splits a manuscript into chapters", () => {
  expect(splitChapters("# One\ntext\n## sub\n# Two\nmore").map((c) => c.title)).toEqual(["One", "Two"]);
});

it("one code unlocks one book once; downloads stay off until allowed", async () => {
  const base = { author: "Author", published: true, manuscript: "# Chapter\nWords." };
  const bookA = await saveBook(admin, null, { ...base, title: "First Book" }, ctx);
  const bookB = await saveBook(admin, null, { ...base, title: "Second Book" }, ctx);
  await expect(saveBook(one, null, { ...base, title: "Nope" }, ctx)).rejects.toThrow(/Super Admin/);
  await expect(saveBook(admin, null, { title: "Empty", author: "A", published: true }, ctx)).rejects.toThrow(/manuscript/);
  expect((await publishedBooks()).length).toBe(2);
  expect("manuscript" in (await publishedBooks())[0]).toBe(false);

  const [code] = await generateBookCodes(admin, bookA, 1, "receipt 1", ctx);
  expect(code).toMatch(/^BK-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  await expect(redeemBookCode(one, bookB, code, ctx)).rejects.toThrow(/not valid/); // wrong book
  await redeemBookCode(one, bookA, ` ${code.toLowerCase().replace(/-/g, " ")} `, ctx);
  await expect(redeemBookCode(two, bookA, code, ctx)).rejects.toThrow(/already been used/); // only once
  expect(await myBookIds(one.id)).toEqual([bookA]);
  expect(await ownership(two.id, bookA)).toBeNull();

  expect((await ownership(one.id, bookA))!.download).toBe(false);
  const [row] = await codesFor(admin, bookA);
  expect(row.code).toBe(code);
  await setDownloadAllowed(admin, row.id, true, ctx);
  expect((await ownership(one.id, bookA))!.download).toBe(true);
  await revokeBookCode(admin, row.id, ctx);
  expect(await ownership(one.id, bookA)).toBeNull();
});
