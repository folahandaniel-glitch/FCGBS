import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { loadPermissions } from "@/server/auth/session";
import type { Actor } from "@/server/audit";
import { getContent, putContent, restoreContentVersion, contentHistory } from "@/server/services/content";
import { RESOURCES, saveResource } from "@/server/admin-resources";
import { createStaff, setUserRoles } from "@/server/services/people";
import { publishPolicy, savePolicyDraft } from "@/server/services/ops";
import { putSetting } from "@/server/settings";
import { globalSearch } from "@/server/services/search";
import { toCsv } from "@/server/services/reports";

const ctx = { ip: "10.0.0.9" };
let close: () => Promise<void>;
const mk = async (email: string, type: "STAFF" | "SUPER_ADMIN", role?: string): Promise<Actor> => {
  const [u] = await getDb().insert(s.users).values({ email, passwordHash: await hashPassword("Str0ng!Passw0rd#42"), userType: type, firstName: "T", lastName: email.split("@")[0] }).returning();
  if (role) { const [r] = await getDb().select().from(s.roles).where(eq(s.roles.key, role)); await getDb().insert(s.userRoles).values({ userId: u.id, roleId: r.id }); }
  return { id: u.id, userType: type, permissions: await loadPermissions(u.id), name: "T", email };
};
let superA: Actor, comms: Actor, board: Actor, ict: Actor;

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  superA = await mk("super@t.com", "SUPER_ADMIN");
  comms = await mk("comms@t.com", "STAFF", "communications");
  board = await mk("board@t.com", "STAFF", "board");
  ict = await mk("ict@t.com", "STAFF", "ict");
}, 180000);
afterAll(async () => { await close?.(); });

it("website content is editable, versioned and restorable", async () => {
  const before = await getContent("home");
  await putContent(comms, "home", { ...before, title: "A new headline" } as never, ctx);
  expect((await getContent("home")).title).toBe("A new headline");
  await putContent(comms, "home", { ...before, title: "Second headline" } as never, ctx);
  const hist = await contentHistory("home");
  expect(hist.length).toBe(2);
  await restoreContentVersion(comms, "home", 1, ctx);
  expect((await (await import("@/server/services/content")).getContent("home")).title).toBe("A new headline");
  await expect(putContent(comms, "home", { title: "javascript:alert(1)" } as never, ctx)).rejects.toThrow(/Script/);
});

it("content workflow: non-approvers cannot publish programmes; approvers can", async () => {
  const deanFull = await mk("dean@t.com", "STAFF", "dean");
  const dean: Actor = { ...deanFull, permissions: new Set(["programmes.manage"]) }; // can edit, cannot approve
  const [lvl] = await getDb().select().from(s.programmeLevels).limit(1);
  const fd = (status: string) => { const f = new FormData(); f.set("code", "NEWP"); f.set("name", "Certificate in New Things"); f.set("slug", "new-things"); f.set("levelId", lvl.id); f.set("status", status); f.set("durationMonths", "6"); f.set("minCredits", "10"); f.set("minCgpa", "1"); f.set("practicumHours", "0"); f.set("tuitionFee", "0"); f.set("sort", "9"); f.set("currency", "NGN"); return f; };
  const id = await saveResource(dean, RESOURCES.programmes, null, fd("PUBLISHED"), ctx);
  const [p] = await getDb().select().from(s.programmes).where(eq(s.programmes.id, id));
  expect(p.status).toBe("REVIEW"); // dean has programmes.manage but not curriculum.approve
  await saveResource(board, RESOURCES.programmes, id, fd("PUBLISHED"), ctx); // the Academic Board can approve
  const [again] = await getDb().select().from(s.programmes).where(eq(s.programmes.id, id));
  expect(again.status).toBe("PUBLISHED");
  expect(again.version).toBe(2);
  const decisions = await getDb().select().from(s.boardDecisions);
  expect(decisions.some((d) => d.kind === "PROGRAMME")).toBe(true);
  await expect(saveResource(ict, RESOURCES.programmes, id, fd("DRAFT"), ctx)).rejects.toThrow(/permission/i);
});

it("only the Super Admin can assign roles; staff creation shows a one-time password", async () => {
  await expect(createStaff(ict, { email: "x@t.com", firstName: "X", lastName: "Y", roleKeys: ["registrar"] }, ctx)).rejects.toThrow(/Only the Super Admin/);
  const r = await createStaff(ict, { email: "lect@t.com", firstName: "Lec", lastName: "Turer", roleKeys: [] }, ctx);
  expect(r.temporaryPassword.length).toBeGreaterThanOrEqual(14);
  await expect(setUserRoles(ict, r.id, ["registrar"], ctx)).rejects.toThrow(/Only the Super Admin/);
  await setUserRoles(superA, r.id, ["lecturer"], ctx);
  expect((await loadPermissions(r.id)).has("teaching.own")).toBe(true);
});

it("policies are versioned: author cannot approve; previous version is kept", async () => {
  const founder = await mk("founder@t.com", "STAFF", "founder");
  const id = await savePolicyDraft(founder, "ai-policy", { title: "Artificial Intelligence Policy", body: "A completely rewritten policy text for testing.", changeNote: "Test revision" }, ctx);
  await expect(publishPolicy(founder, id, ctx)).rejects.toThrow(/someone other/);
  const chancellor = await mk("chan@t.com", "STAFF", "chancellor");
  await publishPolicy(chancellor, id, ctx);
  const all = await getDb().select().from(s.policies).where(eq(s.policies.key, "ai-policy"));
  expect(all.filter((p) => p.isCurrent)).toHaveLength(1);
  expect(all.length).toBe(2);
});

it("grading scale changes are validated and audited", async () => {
  const bad = { gradingScale: [{ min: 0, max: 40, grade: "F", point: 0 }, { min: 50, max: 100, grade: "P", point: 3 }] };
  const cur = (await import("@/server/settings")).SETTING_DEFAULTS.academic;
  await expect(putSetting("academic", { ...cur, ...bad }, superA.id)).rejects.toThrow(/contiguous|Invalid/);
  await putSetting("academic", { ...cur, passPoint: 1.7 }, superA.id);
});

it("global search respects permissions; CSV export neutralises formulas", async () => {
  const forIct = await globalSearch(ict, "fivefold");
  expect(forIct.every((h) => ["Programme", "Course"].includes(h.kind))).toBe(true);
  expect(toCsv(["a"], [{ a: "=HYPERLINK(\"x\")" }])).toContain("'=HYPERLINK");
});
