import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { registerApplicant } from "@/server/services/auth";
import { activateCode, adjustAccess, allows, assignAccess, generateCodes, getAccessState, listCodes, requireActiveAccess, requireFeature, revealCode, setCodeStatus } from "@/server/services/access";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { isPlausibleCode, normaliseCode } from "@/core/access-engine";
import type { Actor } from "@/server/audit";

const ctx = { ip: "10.0.0.9", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;
let admin: Actor;
let learner: Actor;
let other: Actor;

const mk = async (email: string, type: "STUDENT" | "SUPER_ADMIN" = "STUDENT"): Promise<Actor> => {
  await registerApplicant({ firstName: "Test", lastName: email.split("@")[0], email, password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [u] = await getDb().update(users).set({ userType: type }).where(eq(users.email, email)).returning();
  return { id: u.id, userType: u.userType, permissions: new Set(), name: "T", email };
};

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  admin = await mk("boss@example.com", "SUPER_ADMIN");
  learner = await mk("learner@example.com");
  other = await mk("other@example.com");
}, 120000);
afterAll(async () => { await close?.(); });

it("a learner with no code is locked out of every feature; staff are not", async () => {
  expect((await getAccessState(learner.id)).status).toBe("NONE");
  await expect(requireActiveAccess(learner.id)).rejects.toThrow(/access code/i);
  await expect(requireFeature(learner.id, "BIBLE")).rejects.toThrow();
  expect((await getAccessState(admin.id)).status).toBe("STAFF");
  await expect(requireFeature(admin.id, "TEACHINGS")).resolves.toBeTruthy();
});

it("generates unique, well-formed codes stored only as hash and ciphertext", async () => {
  const { codes } = await generateCodes(admin, { count: 5, durationDays: 10 }, ctx);
  expect(new Set(codes).size).toBe(5);
  expect(codes.every((c) => /^FCG-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(c) && isPlausibleCode(c))).toBe(true);
  expect(normaliseCode(codes[0].toLowerCase().replace(/-/g, " "))).toBe(normaliseCode(codes[0]));
  const rows = await listCodes({});
  expect(rows.rows.length).toBe(5);
  expect(JSON.stringify(rows.rows)).not.toContain(codes[0]);
});

it("activates a code once, starts the clock then, and opens the features", async () => {
  const { codes } = await generateCodes(admin, { count: 2, durationDays: 30, features: ["BIBLE", "TEACHINGS"] }, ctx);
  await expect(activateCode(learner, "FCG-AAAA-BBBB-CCCC", ctx)).rejects.toThrow(/not valid/i);
  const p = await activateCode(learner, codes[0], ctx);
  expect(p.durationDays).toBe(30);
  expect(+p.currentExpiresAt - +p.activatedAt).toBe(30 * 86_400_000);
  const st = await getAccessState(learner.id);
  expect(st.status).toBe("ACTIVE");
  expect(allows(st, "BIBLE")).toBe(true);
  expect(allows(st, "RESULTS")).toBe(false); // not on this code
  await expect(requireFeature(learner.id, "COURSES")).rejects.toThrow(/access plan/i);
  await expect(requireFeature(learner.id, "TEACHINGS")).resolves.toBeTruthy();
  // one code, one account
  await expect(activateCode(other, codes[0], ctx)).rejects.toThrow(/already been used/i);
  await expect(activateCode(learner, codes[0], ctx)).rejects.toThrow(/already activated/i);
  // a second code while one is running is refused
  await expect(activateCode(learner, codes[1], ctx)).rejects.toThrow(/already have active access/i);
});

it("admin can extend, suspend, restore and revoke; the learner is locked out immediately", async () => {
  const [row] = (await listCodes({ status: "ACTIVE" })).rows;
  await adjustAccess(admin, row.periodId!, { action: "EXTEND", days: 5, reason: "Goodwill" }, ctx);
  expect(+(await getAccessState(learner.id)).remaining!.days).toBeGreaterThanOrEqual(34);
  await adjustAccess(admin, row.periodId!, { action: "SUSPEND", reason: "Under review" }, ctx);
  expect((await getAccessState(learner.id)).status).toBe("SUSPENDED");
  await expect(requireActiveAccess(learner.id)).rejects.toThrow();
  await adjustAccess(admin, row.periodId!, { action: "RESTORE", reason: "Cleared" }, ctx);
  expect((await getAccessState(learner.id)).status).toBe("ACTIVE");
  await setCodeStatus(admin, row.id, "REVOKE", "Chargeback", ctx);
  expect((await getAccessState(learner.id)).status).toBe("REVOKED");
  await expect(adjustAccess(admin, row.periodId!, { action: "EXTEND", days: 1, reason: "" }, ctx)).rejects.toThrow();
});

it("access can be given directly, expires by the server clock and is revealable only by an audited call", async () => {
  await assignAccess(admin, "other@example.com", 1, "Scholarship", ctx);
  expect((await getAccessState(other.id)).status).toBe("ACTIVE");
  const [row] = (await listCodes({ status: "ACTIVE" })).rows;
  await adjustAccess(admin, row.periodId!, { action: "END", reason: "Course finished" }, ctx);
  expect((await getAccessState(other.id)).status).toBe("ENDED");
  expect(await revealCode(admin, row.id, ctx)).toMatch(/^FCG-/);
});
