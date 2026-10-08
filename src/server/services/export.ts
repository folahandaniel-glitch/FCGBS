import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, LevelFormat, PageNumber, Packer, Paragraph, TextRun } from "docx";
import { BRAND_LOGO_PNG_BASE64 } from "../brand-logo";

/**
 * Study-material exports. Any lesson or teaching (Markdown subset) can be downloaded as Word (DOCX), PowerPoint (PPTX),
 * PDF or plain text — generated on demand, so the files never go stale and nothing extra is stored. Every export carries
 * the school's name and the content's attribution line.
 */
export interface ExportDoc {
  title: string;
  subtitle?: string;
  kicker?: string; // e.g. "Apostolic Teachings"
  scriptures?: string[];
  body: string;
  school: string;
  note?: string;
}
export type ExportFormat = "docx" | "pptx" | "pdf" | "txt";
export const EXPORT_TYPES: Record<ExportFormat, { mime: string; ext: string }> = {
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx" },
  pdf: { mime: "application/pdf", ext: "pdf" },
  txt: { mime: "text/plain; charset=utf-8", ext: "txt" },
};

type Block = { t: "h2"; text: string } | { t: "h3"; text: string } | { t: "p"; text: string } | { t: "quote"; text: string } | { t: "ul"; items: string[] } | { t: "ol"; items: string[] };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) { out.push({ t: h[1].length === 2 ? "h2" : "h3", text: h[2].trim() }); i++; }
    else if (/^\s*[-*]\s+/.test(line)) { const items: string[] = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, "")); out.push({ t: "ul", items }); }
    else if (/^\s*\d+[.)]\s+/.test(line)) { const items: string[] = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, "")); out.push({ t: "ol", items }); }
    else if (line.startsWith(">")) { const q: string[] = []; while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, "")); out.push({ t: "quote", text: q.join(" ") }); }
    else { const p: string[] = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>)/.test(lines[i])) p.push(lines[i++]); out.push({ t: "p", text: p.join(" ") }); }
  }
  return out;
}

const strip = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
function runs(text: string, base: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  const out: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    out.push(t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), ...base, bold: true }) : new TextRun({ text: t.slice(1, -1), ...base, italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

/* ------------------------------------------------------------------ text */
export function toTxt(d: ExportDoc): Buffer {
  const lines = [d.title.toUpperCase(), d.subtitle ?? "", d.kicker ? `(${d.kicker})` : "", d.scriptures?.length ? `Scriptures: ${d.scriptures.join("; ")}` : "", ""].filter((x, i) => x || i === 1);
  for (const b of parseBlocks(d.body)) {
    if (b.t === "h2" || b.t === "h3") lines.push("", strip(b.text).toUpperCase());
    else if (b.t === "p") lines.push(strip(b.text), "");
    else if (b.t === "quote") lines.push(`    "${strip(b.text)}"`, "");
    else b.items.forEach((x, i) => lines.push(`  ${b.t === "ul" ? "•" : `${i + 1}.`} ${strip(x)}`));
  }
  lines.push("", "—", d.school, d.note ?? "");
  return Buffer.from(lines.join("\n"), "utf8");
}

/* ------------------------------------------------------------------ docx */
export async function toDocx(d: ExportDoc): Promise<Buffer> {
  const NAVY = "0B2A5B", GOLD = "A07A12";
  const kids: Paragraph[] = [];
  if (d.kicker) kids.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: d.kicker.toUpperCase(), bold: true, size: 20, color: GOLD, characterSpacing: 40 })] }));
  kids.push(new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun({ text: d.title, bold: true, size: 44, color: NAVY, font: "Georgia" })] }));
  if (d.subtitle) kids.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: d.subtitle, italics: true, size: 24, color: "55617F" })] }));
  if (d.scriptures?.length) kids.push(new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "C9A227", space: 6 } }, children: [new TextRun({ text: "Scriptures: ", bold: true, size: 21, color: NAVY }), new TextRun({ text: d.scriptures.join("; "), size: 21 })] }));
  for (const b of parseBlocks(d.body)) {
    if (b.t === "h2") kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 }, children: [new TextRun({ text: strip(b.text), bold: true, size: 30, color: NAVY, font: "Georgia" })] }));
    else if (b.t === "h3") kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: strip(b.text), bold: true, size: 25, color: "123573" })] }));
    else if (b.t === "p") kids.push(new Paragraph({ spacing: { after: 140, line: 320 }, children: runs(b.text, { size: 23 }) }));
    else if (b.t === "quote") kids.push(new Paragraph({ spacing: { before: 100, after: 160 }, indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: "C9A227", space: 10 } }, children: runs(b.text, { italics: true, size: 23, color: NAVY }) }));
    else b.items.forEach((x) => kids.push(new Paragraph({ spacing: { after: 60, line: 300 }, ...(b.t === "ul" ? { bullet: { level: 0 } } : { numbering: { reference: "num", level: 0, instance: kids.length } }), children: runs(x, { size: 23 }) })));
  }
  kids.push(new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F2", space: 8 } }, children: [new TextRun({ text: d.school, bold: true, size: 20, color: NAVY }), ...(d.note ? [new TextRun({ text: `  ·  ${d.note}`, size: 18, color: "55617F" })] : [])] }));
  const doc = new Document({
    creator: d.school,
    title: d.title,
    styles: { default: { document: { run: { font: "Calibri", size: 23 } } } },
    numbering: { config: [{ reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] }] },
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${d.school} · Page `, size: 16, color: "55617F" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "55617F" })] })] }) },
      children: kids,
    }],
  });
  return Packer.toBuffer(doc);
}

/* ------------------------------------------------------------------ pdf */
export async function toPdf(d: ExportDoc): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(d.title); pdf.setAuthor(d.school); pdf.setCreator(d.school);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifI = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(BRAND_LOGO_PNG_BASE64, "base64"));
  const NAVY = rgb(0.043, 0.165, 0.357), GOLD = rgb(0.79, 0.635, 0.153), INK = rgb(0.05, 0.09, 0.2);
  const W = 595.28, H = 841.89, M = 56, MAXW = W - M * 2;
  const ok = (f: PDFFont) => new Set(f.getCharacterSet());
  const okR = ok(serif);
  const clean = (t: string) => [...strip(t).replace(/→/g, "->").replace(/[  ]/g, " ")].map((c) => (okR.has(c.codePointAt(0)!) ? c : "?")).join("");
  const wrap = (text: string, font: PDFFont, size: number, max: number) => {
    const out: string[] = []; let line = "";
    for (const w of clean(text).split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line);
    return out;
  };
  let page = pdf.addPage([W, H]);
  let y = H - M;
  let n = 0;
  const footer = () => { n++; page.drawText(clean(`${d.school}  ·  ${n}`), { x: M, y: 28, size: 8, font: serif, color: rgb(0.33, 0.38, 0.5) }); };
  const room = (h: number) => { if (y - h < M) { footer(); page = pdf.addPage([W, H]); y = H - M; } };
  const para = (text: string, font: PDFFont, size: number, opts: { indent?: number; gap?: number; color?: ReturnType<typeof rgb>; lead?: number } = {}) => {
    const lead = opts.lead ?? size * 1.45;
    for (const ln of wrap(text, font, size, MAXW - (opts.indent ?? 0))) { room(lead); page.drawText(ln, { x: M + (opts.indent ?? 0), y: y - size, size, font, color: opts.color ?? INK }); y -= lead; }
    y -= opts.gap ?? 6;
  };
  // Header band
  page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 4, color: GOLD });
  page.drawImage(logo, { x: M, y: H - 80, width: 56, height: 56 });
  page.drawText(clean(d.school), { x: M + 68, y: H - 48, size: 13, font: sans, color: rgb(1, 1, 1) });
  if (d.kicker) page.drawText(clean(d.kicker.toUpperCase()), { x: M + 68, y: H - 66, size: 8.5, font: sans, color: rgb(0.86, 0.73, 0.29) });
  y = H - 96 - 34;
  para(d.title, serifB, 22, { color: NAVY, lead: 27, gap: 4 });
  if (d.subtitle) para(d.subtitle, serifI, 12.5, { color: rgb(0.33, 0.38, 0.5), gap: 8 });
  if (d.scriptures?.length) { para(`Scriptures: ${d.scriptures.join("; ")}`, serif, 10.5, { color: NAVY, gap: 10 }); }
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 1, color: GOLD }); y -= 14;
  for (const b of parseBlocks(d.body)) {
    if (b.t === "h2") { room(40); y -= 8; para(b.text, serifB, 15, { color: NAVY, lead: 19, gap: 4 }); }
    else if (b.t === "h3") { room(30); y -= 4; para(b.text, serifB, 12.5, { color: rgb(0.07, 0.21, 0.45), lead: 16, gap: 3 }); }
    else if (b.t === "p") para(b.text, serif, 11.5, { gap: 7 });
    else if (b.t === "quote") { const s0 = y; para(b.text, serifI, 11.5, { indent: 16, color: NAVY, gap: 9 }); page.drawRectangle({ x: M + 2, y: y + 6, width: 3, height: Math.max(0, s0 - y - 8), color: GOLD }); }
    else b.items.forEach((x, i) => { room(16); page.drawText(b.t === "ul" ? "•" : `${i + 1}.`, { x: M + 4, y: y - 11.5, size: 11.5, font: serif, color: GOLD }); para(x, serif, 11.5, { indent: 22, gap: 3 }); });
  }
  y -= 10; room(30);
  para(d.note ?? "", serifI, 9, { color: rgb(0.33, 0.38, 0.5), gap: 0 });
  footer();
  return Buffer.from(await pdf.save());
}

/* ------------------------------------------------------------------ pptx */
const firstSentence = (t: string, max = 150) => {
  const s = strip(t).trim();
  const m = s.match(/^.{20,}?[.!?](\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
};

export async function toPptx(d: ExportDoc): Promise<Buffer> {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = d.title; pptx.author = d.school; pptx.company = d.school;
  const NAVY = "0B2A5B", GOLD = "C9A227", INK = "0D1733";
  const logo = `data:image/png;base64,${BRAND_LOGO_PNG_BASE64}`;
  const addChrome = (s: ReturnType<typeof pptx.addSlide>, n: number) => {
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: GOLD } });
    s.addText(d.school, { x: 0.6, y: 7.0, w: 9, h: 0.3, fontSize: 10, color: "55617F", fontFace: "Calibri" });
    s.addText(String(n), { x: 12.2, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: "55617F", align: "right" });
  };
  const t = pptx.addSlide();
  t.background = { color: NAVY };
  t.addShape(pptx.ShapeType.rect, { x: 0, y: 5.2, w: 13.33, h: 0.08, fill: { color: GOLD } });
  t.addImage({ data: logo, x: 0.7, y: 0.6, w: 1.2, h: 1.2 });
  if (d.kicker) t.addText(d.kicker.toUpperCase(), { x: 0.7, y: 2.1, w: 11.5, h: 0.4, fontSize: 16, bold: true, color: "DCB94A", charSpacing: 3 });
  t.addText(d.title, { x: 0.7, y: 2.5, w: 11.9, h: 1.8, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "top", fit: "shrink" });
  if (d.subtitle) t.addText(d.subtitle, { x: 0.7, y: 4.35, w: 11.9, h: 0.7, fontSize: 18, italic: true, color: "DBE6FF" });
  t.addText(d.school, { x: 0.7, y: 5.6, w: 11.9, h: 0.4, fontSize: 14, color: "FFFFFF" });
  if (d.scriptures?.length) t.addText(`Scriptures: ${d.scriptures.slice(0, 6).join("  ·  ")}`, { x: 0.7, y: 6.1, w: 11.9, h: 0.5, fontSize: 13, color: "DCB94A" });

  let n = 1;
  type Sec = { title: string; bullets: string[]; notes: string[]; quote?: string };
  const secs: Sec[] = [];
  let cur: Sec = { title: "Introduction", bullets: [], notes: [] };
  for (const b of parseBlocks(d.body)) {
    if (b.t === "h2") { if (cur.bullets.length || cur.quote) secs.push(cur); cur = { title: strip(b.text), bullets: [], notes: [] }; }
    else if (b.t === "h3") cur.bullets.push(`${strip(b.text)}`);
    else if (b.t === "p") { cur.bullets.push(firstSentence(b.text)); cur.notes.push(strip(b.text)); }
    else if (b.t === "quote") { cur.quote = firstSentence(b.text, 260); cur.notes.push(strip(b.text)); }
    else { b.items.forEach((x) => { cur.bullets.push(firstSentence(x, 120)); cur.notes.push(strip(x)); }); }
  }
  if (cur.bullets.length || cur.quote) secs.push(cur);
  for (const sec of secs) {
    const chunks: string[][] = [];
    for (let i = 0; i < sec.bullets.length; i += 5) chunks.push(sec.bullets.slice(i, i + 5));
    if (!chunks.length) chunks.push([]);
    chunks.forEach((c, ci) => {
      const s = pptx.addSlide(); n++;
      addChrome(s, n);
      s.addText(sec.title + (ci ? " (cont.)" : ""), { x: 0.6, y: 0.4, w: 12.1, h: 0.9, fontSize: 30, bold: true, color: NAVY, fontFace: "Georgia", fit: "shrink" });
      s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.3, w: 1.4, h: 0.06, fill: { color: GOLD } });
      if (c.length) s.addText(c.map((b) => ({ text: b, options: { bullet: { code: "25CF" }, breakLine: true, paraSpaceAfter: 10 } })), { x: 0.7, y: 1.6, w: sec.quote && ci === chunks.length - 1 ? 12 : 12, h: sec.quote && ci === chunks.length - 1 ? 3.3 : 5.1, fontSize: 21, color: INK, valign: "top", fit: "shrink" });
      if (sec.quote && ci === chunks.length - 1) {
        s.addShape(pptx.ShapeType.rect, { x: 0.7, y: c.length ? 5.0 : 2.0, w: 0.08, h: 1.6, fill: { color: GOLD } });
        s.addText(sec.quote, { x: 1.0, y: c.length ? 5.0 : 2.0, w: 11.4, h: 1.6, fontSize: 19, italic: true, color: NAVY, valign: "middle", fit: "shrink" });
      }
      if (ci === 0 && sec.notes.length) s.addNotes(sec.notes.join("\n\n"));
    });
  }
  const e = pptx.addSlide(); n++;
  e.background = { color: NAVY };
  e.addText("Reflect · Pray · Apply", { x: 0.7, y: 2.2, w: 11.9, h: 1, fontSize: 38, bold: true, color: "FFFFFF", fontFace: "Georgia" });
  e.addText(d.note ?? d.school, { x: 0.7, y: 3.5, w: 11.9, h: 0.8, fontSize: 16, color: "DBE6FF" });
  e.addText(d.school, { x: 0.7, y: 6.6, w: 11.9, h: 0.4, fontSize: 12, color: "DCB94A" });
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

export async function exportDoc(d: ExportDoc, format: ExportFormat): Promise<Buffer> {
  switch (format) {
    case "docx": return toDocx(d);
    case "pptx": return toPptx(d);
    case "pdf": return toPdf(d);
    default: return toTxt(d);
  }
}
