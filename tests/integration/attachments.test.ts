import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { freshDb } from "../support/db";
import { seedStructure } from "@/server/seed";
import { registerApplicant } from "@/server/services/auth";
import { addAttachment, attachmentsAt, buildTemplate, importBatch, listTargets, materialsForPlace } from "@/server/services/attachments";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import type { Actor } from "@/server/audit";

const ctx = { ip: "10.0.0.9", userAgent: "vitest" };
const PW = "Str0ng!Passw0rd#42";
let close: () => Promise<void>;
let admin: Actor;

const pdf = (n: string) => ({ name: n, bytes: Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF ${n}`) });
const mp3 = (n: string) => ({ name: n, bytes: Buffer.concat([Buffer.from("ID3"), Buffer.alloc(200, 1)]) });
async function pptx(n: string) {
  const z = new JSZip();
  z.file("[Content_Types].xml", "<Types/>");
  z.file("ppt/presentation.xml", "<p/>");
  return { name: n, bytes: await z.generateAsync({ type: "nodebuffer" }) };
}
async function sheet(rows: string[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Attachments");
  rows.forEach((r) => ws.addRow(r));
  return { name: "my filled template.xlsx", bytes: Buffer.from(await wb.xlsx.writeBuffer()) };
}

beforeAll(async () => {
  const f = await freshDb();
  close = f.close;
  await seedStructure(f.db);
  await registerApplicant({ firstName: "Boss", lastName: "Admin", email: "boss3@example.com", password: PW, confirmPassword: PW, acceptTerms: true }, ctx);
  const [a] = await getDb().update(s.users).set({ userType: "SUPER_ADMIN" }).where(eq(s.users.email, "boss3@example.com")).returning();
  admin = { id: a.id, userType: "SUPER_ADMIN", permissions: new Set(), name: "Boss", email: a.email };
}, 120000);
afterAll(async () => { await close?.(); });

it("the template is rebuilt from the live site and is a readable workbook", async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await buildTemplate()) as unknown as ArrayBuffer);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Read me", "Where it can go", "Attachments"]);
  expect(wb.getWorksheet("Where it can go")!.rowCount).toBeGreaterThan(200);
  expect((await listTargets()).some((t) => t.type === "question")).toBe(true);
});

it("a messy template and loose files are corrected and put where they belong", async () => {
  const template = await sheet([
    ["Where", "Attach to", "Name", "File", "Link", "Type"],
    ["Courses", "BIB208 hermenutics", "", "week 1 notes", "", ""],
    ["", "genealogies of jesus matthew luke", "Genealogy chart", "", "www.example.org/genealogy.pdf", "Word"],
    ["topic", "zzzz qqqq nothing like it", "Orphan link", "", "https://example.org/x", ""],
    ["", "BIB208", "", "missing.pdf", "", ""],
    ["", "", "", "", "", ""],
  ]);
  const report = await importBatch(admin, [template, pdf("Week_1_notes.pdf"), await pptx("BIB301 exegesis slides.pptx"), mp3("Why does God allow evil and suffering.mp3"), { name: "malware.exe", bytes: Buffer.from("MZ") }], ctx);

  expect(report.templates).toBe(1);
  expect(report.errors).toBe(2); // the missing file, and the .exe
  expect(report.drafts).toBe(1); // the orphan link is kept, unplaced
  expect(report.placed + report.corrected).toBe(4);

  const [course] = await getDb().select().from(s.courses).where(eq(s.courses.code, "BIB208"));
  const onCourse = await attachmentsAt(`course:${course.id}`);
  const notes = onCourse.find((m) => m.title === "Week 1 Notes");
  expect(notes?.kind).toBe("PDF");
  expect(notes?.assetId).toBeTruthy();

  const onQuestion = await materialsForPlace("question:genealogies-of-jesus-matthew-and-luke", true);
  expect(onQuestion[0].url).toBe("https://www.example.org/genealogy.pdf");
  expect(onQuestion[0].kind).toBe("PDF"); // "Word" in the sheet was wrong; the link is a PDF

  const [slides] = await getDb().select().from(s.materials).where(eq(s.materials.title, "Exegesis Slides"));
  expect(slides.kind).toBe("PPTX");
  expect(slides.courseId).toBeTruthy();

  const audio = await materialsForPlace("question:why-does-god-allow-evil-and-suffering", true);
  expect(audio[0].kind).toBe("MP3");

  const drafts = await getDb().select().from(s.materials).where(eq(s.materials.status, "DRAFT"));
  expect(drafts.map((d) => d.title)).toEqual(["Orphan link"]);
  expect(drafts[0].place).toBeNull();

  // doing it again adds nothing
  const again = await importBatch(admin, [pdf("Week_1_notes.pdf"), template], ctx);
  expect(again.lines.filter((l) => l.title === "Week 1 Notes").every((l) => l.status === "skipped")).toBe(true);
});

it("one file or link can be added by hand to any place, with kind and title worked out", async () => {
  const id = await addAttachment(admin, { placeKey: "timeline:exile", url: "youtu.be/dQw4w9WgXcQ" }, ctx);
  const [m] = await getDb().select().from(s.materials).where(eq(s.materials.id, id));
  expect(m.kind).toBe("VIDEO");
  expect(m.url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  expect((await materialsForPlace("timeline:exile", true)).length).toBe(1);
  expect((await materialsForPlace("timeline:exile", false)).length).toBe(0); // students-only by default
  await expect(addAttachment(admin, { placeKey: "timeline:exile", url: "javascript:alert(1)" }, ctx)).rejects.toThrow(/link/i);
});
