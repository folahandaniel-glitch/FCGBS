import { afterAll, beforeAll, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { registerApplicant } from "@/server/services/auth";
import { activateCode, generateCodes } from "@/server/services/access";
import { certificateProgrammes, claimFreeCertificate, decideRequest, exploreCatalogue, myEnrolments, pendingRequests, requestEnrolment, selfState } from "@/server/services/selfservice";
import { getDb } from "@/server/db";
import { courseRegistrations, courses, programmes, users } from "@/server/db/schema";
import type { Actor } from "@/server/audit";

const ctx = { ip: "10.0.0.7", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;
let admin: Actor;
let learner: Actor;

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  await registerApplicant({ firstName: "Boss", lastName: "Admin", email: "boss2@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [a] = await getDb().update(users).set({ userType: "SUPER_ADMIN" }).where(eq(users.email, "boss2@example.com")).returning();
  admin = { id: a.id, userType: "SUPER_ADMIN", permissions: new Set(), name: "Boss", email: a.email };
  await registerApplicant({ firstName: "Ada", lastName: "Learner", email: "ada@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [l] = await getDb().select().from(users).where(eq(users.email, "ada@example.com"));
  learner = { id: l.id, userType: "APPLICANT", permissions: new Set(), name: "Ada", email: l.email };
}, 120000);
afterAll(async () => { await close?.(); });

it("a code turns a new account into a student who may claim exactly one free certificate programme", async () => {
  const { codes } = await generateCodes(admin, { count: 1, durationDays: 30 }, ctx);
  await activateCode(learner, codes[0], ctx);
  const [u] = await getDb().select().from(users).where(eq(users.id, learner.id));
  expect(u.userType).toBe("STUDENT");
  learner = { ...learner, userType: "STUDENT" };

  const certs = await certificateProgrammes();
  expect(certs.length).toBeGreaterThan(3);
  const first = await claimFreeCertificate(learner, certs[0].id, ctx);
  expect(first.courses).toBeGreaterThan(3);
  const regs = await getDb().select().from(courseRegistrations);
  expect(regs.length).toBe(first.courses);
  expect(regs.every((r) => r.offeringId && r.status === "APPROVED")).toBe(true);

  // a second free programme is refused, with the office number in the message
  await expect(claimFreeCertificate(learner, certs[1].id, ctx)).rejects.toThrow(/08067578112/);
  const st = await selfState(learner.id);
  expect(st.freeLeft).toBe(0);
});

it("other programmes and courses are requests that an administrator approves or declines", async () => {
  const cat = await exploreCatalogue(learner.id);
  const diploma = cat.programmes.find((p) => p.level === "Diploma")!;
  const otherCourse = cat.courses.find((c) => !c.registered && !c.inMyProgramme && c.code.startsWith("TEC"))!;
  const r = await requestEnrolment(learner, { programmeIds: [diploma.id], courseIds: [otherCourse.id] }, "Please approve", ctx);
  expect(r.count).toBe(2);
  await expect(requestEnrolment(learner, { programmeIds: [diploma.id] }, "", ctx)).rejects.toThrow(/already/i);

  const pending = await pendingRequests();
  expect(pending.length).toBe(2);
  const prog = pending.find((p) => p.kind === "PROGRAMME")!;
  const crs = pending.find((p) => p.kind === "COURSE")!;
  await decideRequest(admin, prog.id, "APPROVE", "Paid at the office", ctx);
  await decideRequest(admin, crs.id, "REJECT", "Not this semester", ctx);
  await expect(decideRequest(admin, prog.id, "APPROVE", "", ctx)).rejects.toThrow(/already/i);

  const enrols = await myEnrolments(learner.id);
  expect(enrols.length).toBe(2);
  expect(enrols.some((e) => e.programmeId === diploma.id)).toBe(true);
  const [rejected] = (await pendingRequests("ALL")).filter((p) => p.id === crs.id);
  expect(rejected.status).toBe("REJECTED");
  const stillPending = await pendingRequests();
  expect(stillPending.length).toBe(0);
  void programmes; void courses; void and;
});
