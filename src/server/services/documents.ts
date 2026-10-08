import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { getSetting } from "../settings";
import { BRAND_LOGO_PNG_BASE64 } from "../brand-logo";

const NAVY = rgb(0.043, 0.165, 0.357);
const GOLD = rgb(0.79, 0.635, 0.153);

async function logoImage(pdf: PDFDocument) {
  const b = await getSetting("branding");
  if (b.logoAssetId) {
    const [a] = await getDb().select().from(s.assets).where(eq(s.assets.id, b.logoAssetId));
    if (a?.mimeType === "image/png") return pdf.embedPng(a.data);
    if (a?.mimeType === "image/jpeg") return pdf.embedJpg(a.data);
  }
  return pdf.embedPng(Buffer.from(BRAND_LOGO_PNG_BASE64, "base64"));
}

async function qr(pdf: PDFDocument, url: string) {
  return pdf.embedPng(await QRCode.toBuffer(url, { margin: 1, width: 260, color: { dark: "#0b2a5b" } }));
}

const centre = (page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = NAVY) => {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size, font, color });
};
const wrap = (text: string, font: PDFFont, size: number, max: number) => {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
};
const safe = (t: string) => t.replace(/[^\x20-\x7E -ÿ]/g, "?"); // standard PDF fonts are WinAnsi

const base = () => process.env.APP_URL ?? "http://localhost:3000";

/** Landscape A4 certificate with logo, signatories, number and QR verification code. */
export async function certificatePdf(certId: string): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const [c] = await getDb().select().from(s.certificates).where(eq(s.certificates.id, certId));
  if (!c) return null;
  const [inst, cfg] = await Promise.all([getSetting("institution"), getSetting("certificates")]);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifR = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const W = page.getWidth();
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: 555, borderColor: NAVY, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: W - 60, height: 535, borderColor: GOLD, borderWidth: 1 });
  const logo = await logoImage(pdf);
  const lh = 92;
  const lw = (logo.width / logo.height) * lh;
  page.drawImage(logo, { x: (W - lw) / 2, y: 462, width: lw, height: lh });
  centre(page, safe(inst.name.toUpperCase()), 430, serif, 20);
  centre(page, safe(`Operating within the vision of ${inst.parentMinistry}`), 414, serifR, 10, rgb(0.3, 0.3, 0.4));
  centre(page, "CERTIFICATE OF AWARD", 380, serif, 28, GOLD);
  centre(page, "This is to certify that", 350, serifR, 13);
  centre(page, safe(c.holderName), 318, serif, 30);
  const lines = wrap(safe(cfg.awardStatement), serifR, 13, 560);
  lines.forEach((l, i) => centre(page, l, 290 - i * 16, serifR, 13));
  centre(page, safe(c.awardTitle), 258 - (lines.length - 1) * 16, serif, 22);
  if (c.classification) centre(page, safe(`with ${c.classification}`), 236 - (lines.length - 1) * 16, serifR, 13);
  centre(page, `Awarded on ${c.awardDate}`, 206, serifR, 12);
  cfg.signatories.filter((x) => x.name || x.title).forEach((sg, i, arr) => {
    const x = 120 + (i * (W - 240 - 160)) / Math.max(1, arr.length - 1 || 1);
    page.drawLine({ start: { x, y: 120 }, end: { x: x + 160, y: 120 }, thickness: 0.8, color: NAVY });
    if (sg.name) page.drawText(safe(sg.name), { x, y: 106, size: 11, font: serif, color: NAVY });
    page.drawText(safe(sg.title), { x, y: 92, size: 9, font: sans, color: rgb(0.3, 0.3, 0.4) });
  });
  const url = `${base()}/verify/${c.verifyToken}`;
  const q = await qr(pdf, url);
  page.drawImage(q, { x: W - 130, y: 48, width: 76, height: 76 });
  page.drawText("Scan to verify", { x: W - 125, y: 38, size: 8, font: sans, color: NAVY });
  page.drawText(`Certificate No. ${c.number}`, { x: 52, y: 52, size: 9, font: sans, color: NAVY });
  page.drawText(safe(`Verify: ${base().replace(/^https?:\/\//, "")}/verify`), { x: 52, y: 40, size: 8, font: sans, color: rgb(0.4, 0.4, 0.5) });
  if (c.status !== "VALID") {
    page.drawText(c.status, { x: 200, y: 250, size: 110, font: serif, color: rgb(0.8, 0.1, 0.1), opacity: 0.18, rotate: degrees(25) });
  }
  return { bytes: await pdf.save(), fileName: `${c.number}.pdf` };
}

interface TranscriptSnap {
  institution: string;
  student: { name: string; number: string };
  programme: { name: string; level: string };
  terms: { name: string; gpa: number; credits: number; courses: { code: string; title: string; credits: number; grade: string; point: number | null }[] }[];
  cgpa: number;
  creditsEarned: number;
  standing: string;
  classification: string | null;
  graduation: { date?: string } | null;
  footer: string;
}

export async function transcriptPdf(transcriptId: string): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const [t] = await getDb().select().from(s.transcripts).where(eq(s.transcripts.id, transcriptId));
  if (!t) return null;
  const d = t.snapshot as unknown as TranscriptSnap;
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const logo = await logoImage(pdf);
  const url = `${base()}/verify/${t.verifyToken}`;
  const q = await qr(pdf, url);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const header = () => {
    const lh = 56;
    page.drawImage(logo, { x: 40, y: 780, width: (logo.width / logo.height) * lh, height: lh });
    page.drawText(safe(d.institution.toUpperCase()), { x: 160, y: 808, size: 14, font: bold, color: NAVY });
    page.drawText("OFFICIAL ACADEMIC TRANSCRIPT", { x: 160, y: 790, size: 11, font: bold, color: GOLD });
    page.drawText(safe(`No. ${t.number}  ·  Status: ${t.status}`), { x: 160, y: 774, size: 8, font: reg, color: rgb(0.3, 0.3, 0.4) });
    page.drawImage(q, { x: 500, y: 770, width: 55, height: 55 });
    y = 750;
  };
  header();
  const row = (label: string, v: string) => { page.drawText(label, { x: 40, y, size: 9, font: bold, color: NAVY }); page.drawText(safe(v), { x: 150, y, size: 9, font: reg }); y -= 14; };
  row("Student", d.student.name); row("Student ID", d.student.number); row("Programme", `${d.programme.name} (${d.programme.level})`);
  y -= 6;
  for (const term of d.terms) {
    if (y < 120) { page = pdf.addPage([595.28, 841.89]); header(); }
    page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 16, color: rgb(0.93, 0.95, 0.99) });
    page.drawText(safe(term.name), { x: 46, y, size: 9.5, font: bold, color: NAVY });
    page.drawText(`GPA ${term.gpa.toFixed(2)} · Credits earned ${term.credits}`, { x: 380, y, size: 8.5, font: reg });
    y -= 18;
    for (const c of term.courses) {
      if (y < 70) { page = pdf.addPage([595.28, 841.89]); header(); }
      page.drawText(c.code, { x: 46, y, size: 8.5, font: reg });
      page.drawText(safe(c.title.slice(0, 58)), { x: 100, y, size: 8.5, font: reg });
      page.drawText(String(c.credits), { x: 420, y, size: 8.5, font: reg });
      page.drawText(c.grade, { x: 460, y, size: 8.5, font: bold });
      page.drawText(c.point === null ? "-" : c.point.toFixed(1), { x: 510, y, size: 8.5, font: reg });
      y -= 12;
    }
    y -= 8;
  }
  if (y < 150) { page = pdf.addPage([595.28, 841.89]); header(); }
  y -= 4;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: NAVY });
  y -= 16;
  page.drawText(`CGPA: ${d.cgpa.toFixed(2)}     Credits earned: ${d.creditsEarned}     Standing: ${d.standing.replace(/_/g, " ")}${d.classification ? `     Classification: ${d.classification}` : ""}`, { x: 40, y, size: 9.5, font: bold, color: NAVY });
  y -= 16;
  if (d.graduation?.date) { page.drawText(`Graduated: ${d.graduation.date}`, { x: 40, y, size: 9.5, font: bold }); y -= 16; }
  wrap(safe(d.footer), reg, 7.5, 515).forEach((l) => { page.drawText(l, { x: 40, y, size: 7.5, font: reg, color: rgb(0.35, 0.35, 0.45) }); y -= 10; });
  page.drawText(safe(`Verify: ${url}`), { x: 40, y: 30, size: 7, font: reg, color: rgb(0.4, 0.4, 0.5) });
  if (t.status !== "ISSUED") page.drawText(t.status === "REVOKED" ? "REVOKED" : "NOT YET ISSUED", { x: 90, y: 400, size: 70, font: bold, color: rgb(0.8, 0.1, 0.1), opacity: 0.15 });
  return { bytes: await pdf.save(), fileName: `${t.number}.pdf` };
}
