import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { registerApplicant } from "@/server/services/auth";
import { adminResetLink, setAccountStatus } from "@/server/services/people";
import { createPlatformAccount, ensureDeveloper, isDeveloper, resetCredentials, setLevel, setStatus } from "@/server/services/developer";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import type { Actor } from "@/server/audit";

const OWNER = "owner@example.com";
const ctx = { ip: "10.0.0.11", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;
let dev: Actor;

const actor = (id: string, email: string): Actor => ({ id, userType: "SUPER_ADMIN", permissions: new Set(), name: email, email });

beforeAll(async () => {
  process.env.SUPERADMIN_EMAIL = OWNER;
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  await registerApplicant({ firstName: "Platform", lastName: "Owner", email: OWNER, password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [o] = await getDb().update(s.users).set({ userType: "SUPER_ADMIN" }).where(eq(s.users.email, OWNER)).returning();
  dev = actor(o.id, o.email);
}, 120000);
afterAll(async () => { delete process.env.SUPERADMIN_EMAIL; await close?.(); });

it("the owner's Super Admin account becomes the Developer, once", async () => {
  expect(await isDeveloper(dev.id)).toBe(false);
  expect(await ensureDeveloper()).toBe(true);
  expect(await ensureDeveloper()).toBe(false);
  expect(await isDeveloper(dev.id)).toBe(true);
});

it("only the Developer manages Super Admins, and nobody can change the Developer", async () => {
  const made = await createPlatformAccount(dev, { level: "SUPER_ADMIN", email: "second@example.com", firstName: "Second", lastName: "Super", roleKeys: [] }, ctx) as { id: string; temporaryPassword: string };
  expect(made.temporaryPassword.length).toBeGreaterThan(8);
  const other = actor(made.id, "second@example.com");
  expect(await isDeveloper(other.id)).toBe(false);

  const admin = await createPlatformAccount(dev, { level: "STAFF", email: "helper@example.com", firstName: "Help", lastName: "Er", roleKeys: [] }, ctx) as { id: string };

  await expect(createPlatformAccount(other, { level: "SUPER_ADMIN", email: "x@example.com", firstName: "X", lastName: "Y", roleKeys: [] }, ctx)).rejects.toThrow(/Developer/);
  await expect(setLevel(other, admin.id, "SUPER_ADMIN", ctx)).rejects.toThrow(/Developer/);
  await expect(resetCredentials(other, dev.id, true, ctx)).rejects.toThrow(/Developer/);
  await expect(adminResetLink(other, dev.id, ctx)).rejects.toThrow(/Developer/);
  await expect(setAccountStatus(other, dev.id, "SUSPENDED", "attempt", ctx)).rejects.toThrow();
  await expect(setStatus(dev, dev.id, "SUSPENDED", ctx)).rejects.toThrow(/cannot be changed/);

  await setLevel(dev, admin.id, "SUPER_ADMIN", ctx);
  await setLevel(dev, made.id, "STAFF", ctx);
  await setStatus(dev, made.id, "SUSPENDED", ctx);
  const [u] = await getDb().select().from(s.users).where(eq(s.users.id, made.id));
  expect([u.userType, u.status]).toEqual(["STAFF", "SUSPENDED"]);
});
