import { afterAll, beforeAll, expect, it } from "vitest";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { bootstrapSuperAdmin, login, registerApplicant, beginTotpEnrolment, confirmTotpEnrolment, verifyMfa, superAdminExists } from "@/server/services/auth";
import { currentTotp } from "@/server/auth/totp";
import { resolveSessionToken } from "@/server/auth/session";
import { decrypt } from "@/server/crypto";
import { can } from "@/core/permissions";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const ctx = { ip: "10.0.0.1", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;

beforeAll(async () => {
  process.env.SETUP_TOKEN = "test-setup-token-123456";
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
}, 120000);
afterAll(async () => { await close?.(); });

it("setup is owner-only and needs the setup key", async () => {
  await expect(bootstrapSuperAdmin({ setupToken: "wrong-wrong-wrong-1", email: "folahandaniel@gmail.com", password: PW, confirmPassword: PW }, ctx)).rejects.toThrow(/setup key/i);
  await expect(bootstrapSuperAdmin({ setupToken: "test-setup-token-123456", email: "someone@else.com", password: PW, confirmPassword: PW }, ctx)).rejects.toThrow(/owner/i);
  await bootstrapSuperAdmin({ setupToken: "test-setup-token-123456", email: "folahandaniel@gmail.com", password: PW, confirmPassword: PW }, ctx);
  expect(await superAdminExists()).toBe(true);
  await expect(bootstrapSuperAdmin({ setupToken: "test-setup-token-123456", email: "folahandaniel@gmail.com", password: PW, confirmPassword: PW }, ctx)).rejects.toThrow(/already exists/i);
});

it("super admin signs in at backend only, with 2FA", async () => {
  await expect(login({ identifier: "folahandaniel@gmail.com", password: PW }, "public", ctx)).rejects.toThrow(/incorrect/i);
  const r = await login({ identifier: "folahandaniel@gmail.com", password: PW }, "backend", ctx);
  const sess = await resolveSessionToken(r.token);
  expect(sess?.actor.userType).toBe("SUPER_ADMIN");
  expect(can(sess!.actor, "super.roles")).toBe(true);
  const secret = await beginTotpEnrolment(sess!.actor);
  const codes = await confirmTotpEnrolment(sess!.actor, currentTotp(secret), ctx);
  expect(codes).toHaveLength(10);
  const r2 = await login({ identifier: "folahandaniel@gmail.com", password: PW }, "backend", ctx);
  expect(r2.mfaPending).toBe(true);
  const s2 = await resolveSessionToken(r2.token);
  await expect(verifyMfa(s2!.sessionId, s2!.user.id, "000000", ctx)).rejects.toThrow();
  const [u] = await getDb().select().from(users).where(eq(users.id, s2!.user.id));
  await verifyMfa(s2!.sessionId, s2!.user.id, currentTotp(decrypt(u.totpSecretEnc!)), ctx);
  expect((await resolveSessionToken(r2.token))?.mfaPending).toBe(false);
});

it("applicants register publicly, cannot reach the backend, and hold no permissions", async () => {
  await registerApplicant({ firstName: "Ada", lastName: "Obi", email: "ada@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  await expect(registerApplicant({ firstName: "Ada", lastName: "Obi", email: "ADA@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, ctx)).rejects.toThrow(/already exists/i);
  await expect(login({ identifier: "ada@example.com", password: PW }, "backend", ctx)).rejects.toThrow(/incorrect/i);
  const r = await login({ identifier: "ada@example.com", password: PW }, "public", ctx);
  const s = await resolveSessionToken(r.token);
  expect(s?.actor.userType).toBe("APPLICANT");
  expect(can(s!.actor, "students.view")).toBe(false);
  await expect(registerApplicant({ firstName: "B", lastName: "C", email: "weak@example.com", password: "password", confirmPassword: "password", acceptTerms: true }, ctx)).rejects.toThrow();
});

it("locks the account after repeated failures", async () => {
  await registerApplicant({ firstName: "Lock", lastName: "Me", email: "lock@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, { ip: "10.9.9.9" });
  for (let i = 0; i < 5; i++) await expect(login({ identifier: "lock@example.com", password: "wrong-password-1" }, "public", { ip: `10.1.1.${i}` })).rejects.toThrow();
  await expect(login({ identifier: "lock@example.com", password: PW }, "public", { ip: "10.2.2.2" })).rejects.toThrow(/locked/i);
});
