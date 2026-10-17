import { and, asc, eq, like } from "drizzle-orm";
import ExcelJS from "exceljs";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { sha256 } from "../crypto";
import { rateLimit } from "../rate-limit";
import { storeAsset } from "./assets";
import { getContent } from "./content";
import {
  PLACE_TYPES, UPLOADABLE, audienceFrom, bestMatch, cell, detectColumns, extOf, fixUrl, isUrlLike, kindFor, kindFromWord, matchFileName, placeTypeFrom, titleFromName, titleFromUrl,
  type Col, type MaterialKind, type PlaceType, type Target,
} from "@/core/attachments";

/* -------------------------------------------------------------- places */

/** Everything a file or link can be attached to, read live so the template and the pickers are always current. */
export async function listTargets(): Promise<Target[]> {
  const db = getDb();
  const [courses, teachings, questions, lessons, programmes, tracks, timeline, topics, plans] = await Promise.all([
    db.select({ id: s.courses.id, code: s.courses.code, title: s.courses.title }).from(s.courses),
    db.select({ id: s.teachings.id, slug: s.teachings.slug, title: s.teachings.title }).from(s.teachings),
    db.select({ slug: s.hardQuestions.slug, title: s.hardQuestions.title }).from(s.hardQuestions),
    db.select({ id: s.lessons.id, title: s.lessons.title, code: s.courses.code }).from(s.lessons).innerJoin(s.courses, eq(s.courses.id, s.lessons.courseId)),
    db.select({ code: s.programmes.code, name: s.programmes.name }).from(s.programmes),
    db.select({ slug: s.teachingTracks.slug, title: s.teachingTracks.title }).from(s.teachingTracks),
    getContent("bibleTimeline"), getContent("bibleTopics"), getContent("biblePlans"),
  ]);
  return [
    ...courses.map((c): Target => ({ type: "course", key: `course:${c.id}`, code: c.code, title: c.title })),
    ...teachings.map((t): Target => ({ type: "teaching", key: `teaching:${t.id}`, slug: t.slug, title: t.title })),
    ...questions.map((q): Target => ({ type: "question", key: `question:${q.slug}`, slug: q.slug, title: q.title })),
    ...lessons.map((l): Target => ({ type: "lesson", key: `lesson:${l.id}`, title: `${l.code} ${l.title}`, extra: l.code })),
    ...programmes.map((p): Target => ({ type: "programme", key: `programme:${p.code}`, code: p.code, title: p.name })),
    ...tracks.map((t): Target => ({ type: "track", key: `track:${t.slug}`, slug: t.slug, title: t.title })),
    ...timeline.items.map((t): Target => ({ type: "timeline", key: `timeline:${t.id}`, slug: t.id, title: t.title })),
    ...topics.items.map((t): Target => ({ type: "topic", key: `topic:${t.slug}`, slug: t.slug, title: t.title })),
    ...plans.items.map((t): Target => ({ type: "plan", key: `plan:${t.slug}`, slug: t.slug, title: t.title })),
  ];
}

const split = (key: string) => { const i = key.indexOf(":"); return [key.slice(0, i) as PlaceType, key.slice(i + 1)] as const; };
/** Courses and teachings keep their own columns (existing pages already read them); everything else uses `place`. */
export function placeColumns(key: string | null): { courseId: string | null; teachingId: string | null; place: string | null } {
  if (!key) return { courseId: null, teachingId: null, place: null };
  const [type, ref] = split(key);
  if (type === "course") return { courseId: ref, teachingId: null, place: null };
  if (type === "teaching") return { courseId: null, teachingId: ref, place: null };
  return { courseId: null, teachingId: null, place: key };
}

export async function materialsForPlace(place: string, signedIn: boolean) {
  const rows = await getDb().select().from(s.materials).where(and(eq(s.materials.place, place), eq(s.materials.status, "PUBLISHED"))).orderBy(asc(s.materials.sort), asc(s.materials.title));
  return signedIn ? rows : rows.filter((m) => m.audience === "PUBLIC");
}

export async function materialsByPrefix(prefix: string, signedIn: boolean) {
  const rows = await getDb().select().from(s.materials).where(and(like(s.materials.place, `${prefix}%`), eq(s.materials.status, "PUBLISHED"))).orderBy(asc(s.materials.sort), asc(s.materials.title));
  return signedIn ? rows : rows.filter((m) => m.audience === "PUBLIC");
}

/** Everything already attached to one place (for the admin manager), whatever its status. */
export async function attachmentsAt(key: string) {
  const c = placeColumns(key);
  const where = c.courseId ? eq(s.materials.courseId, c.courseId) : c.teachingId ? eq(s.materials.teachingId, c.teachingId) : eq(s.materials.place, key);
  return getDb().select().from(s.materials).where(where).orderBy(asc(s.materials.sort), asc(s.materials.title));
}

export interface NewMaterial { title: string; kind: MaterialKind; description?: string | null; placeKey: string | null; assetId?: string | null; url?: string | null; audience?: "PUBLIC" | "STUDENTS"; sort?: number; status?: "PUBLISHED" | "DRAFT" }
export async function insertMaterial(m: NewMaterial) {
  const c = placeColumns(m.placeKey);
  const [row] = await getDb().insert(s.materials).values({ title: m.title.slice(0, 200), kind: m.kind, description: m.description || null, ...c, assetId: m.assetId ?? null, url: m.url ?? null, audience: m.audience ?? "STUDENTS", sort: m.sort ?? 0, status: m.status ?? "PUBLISHED" }).returning({ id: s.materials.id });
  return row.id;
}

/** One file or link, attached by hand from the manager. Kind, title and a repaired link are worked out when left blank. */
export async function addAttachment(actor: Actor, input: { placeKey: string | null; title?: string; kind?: string; description?: string; url?: string; file?: { name: string; bytes: Buffer } | null; audience?: string; sort?: number }, ctx: ReqCtx) {
  let url: string | null = null;
  let assetId: string | null = null;
  let kind: MaterialKind | null = kindFromWord(input.kind ?? "");
  let title = (input.title ?? "").trim();
  if (input.file) {
    const e = extOf(input.file.name);
    if (!UPLOADABLE.has(e)) throw new AppError("VALIDATION", `".${e}" files are not supported. Use PDF, DOCX, PPTX or MP3 (or paste a link).`);
    const a = await storeAsset(actor, input.file, "LIBRARY", ctx);
    assetId = a.id;
    kind = kindFor(input.file.name, false);
    title ||= titleFromName(input.file.name);
  } else {
    const fixed = fixUrl(input.url ?? "");
    if (!fixed) throw new AppError("VALIDATION", "Add a file, or paste a web link (for example https://…).");
    url = fixed.url;
    kind = kind && kind !== "URL" && kind !== "OTHER" ? kind : kindFor(url, true);
    title ||= titleFromUrl(url);
  }
  const id = await insertMaterial({ title, kind: kind ?? "OTHER", description: input.description, placeKey: input.placeKey, assetId, url, audience: audienceFrom(input.audience ?? "") ?? "STUDENTS", sort: input.sort });
  await audit({ actor, action: "material.added", entityType: "material", entityId: id, summary: `${title} → ${input.placeKey ?? "unplaced"}` }, ctx);
  return id;
}

export async function removeAttachment(actor: Actor, id: string, ctx: ReqCtx) {
  const [m] = await getDb().select({ title: s.materials.title }).from(s.materials).where(eq(s.materials.id, id));
  if (!m) throw new AppError("NOT_FOUND", "Attachment not found.");
  await getDb().delete(s.materials).where(eq(s.materials.id, id));
  await audit({ actor, action: "material.removed", entityType: "material", entityId: id, summary: m.title }, ctx);
}

/* ------------------------------------------------------------ template */

/** The central template, generated on demand from the live site so its lists are never out of date. */
export async function buildTemplate(): Promise<Buffer> {
  const targets = await listTargets();
  const wb = new ExcelJS.Workbook();
  wb.creator = "FCGBS";
  const head = { font: { bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1E3A8A" } } };

  const help = wb.addWorksheet("Read me");
  help.columns = [{ width: 110 }];
  [
    "FCGBS central upload template",
    "",
    "1. Fill the 'Attachments' sheet: one row per file or link. Leave a cell empty if you are not sure; it is worked out for you.",
    "2. Go to Admin → Upload centre, choose this file together with all the PDF, DOCX, PPTX and MP3 files in one go, and press Upload.",
    "3. Every file is placed where it belongs. Anything that could not be placed is kept as a Draft in Admin → Study materials, and the report tells you why.",
    "",
    "Columns (all optional except that each row needs a file name or a link):",
    "• Place type: course, lesson, teaching, question, topic, plan, timeline, track or programme. Leave empty and it is detected.",
    "• Attach to: the name, code or slug of the place (e.g. BIB208, 'Hermeneutics', 'genealogies-of-jesus-matthew-and-luke'). Spelling mistakes are corrected.",
    "• Title: what learners see. Empty = made from the file name.",
    "• File name: the exact name of a file you upload with this template (case, spaces and extension mistakes are forgiven).",
    "• Link: any web page, YouTube or Vimeo video, Google Drive or PDF link. https:// is added if you forget it.",
    "• Type: PDF, Word, PowerPoint, Audio, Video or Link. Empty = detected from the file or link.",
    "• Description, Audience (Everyone or Students), Order (1, 2, 3 …).",
    "",
    "You may also upload files with no template at all: a file named 'BIB208 hermeneutics notes.pdf' is placed on that course automatically.",
    "Large files: the web host accepts about 4 MB per upload. For bigger audio or slides, upload them to Drive/YouTube and paste the link in the 'Link' column.",
    "The 'Where it can go' sheet lists every place on the site today; this template is rebuilt from the live site each time you download it.",
  ].forEach((t, i) => { const r = help.addRow([t]); if (i === 0) r.font = { bold: true, size: 14 }; r.alignment = { wrapText: true }; });

  const where = wb.addWorksheet("Where it can go");
  where.columns = [{ header: "Place type", width: 12 }, { header: "Code or slug", width: 40 }, { header: "Name", width: 80 }];
  where.getRow(1).eachCell((c) => Object.assign(c, head));
  const order = new Map(PLACE_TYPES.map((t, i) => [t, i]));
  [...targets].sort((a, b) => order.get(a.type)! - order.get(b.type)! || a.title.localeCompare(b.title)).forEach((t) => where.addRow([t.type, t.code ?? t.slug ?? t.extra ?? "", t.title]));
  where.views = [{ state: "frozen", ySplit: 1 }];

  const ws = wb.addWorksheet("Attachments");
  const cols = [["Place type", 14], ["Attach to", 44], ["Title", 38], ["File name", 36], ["Link", 40], ["Type", 12], ["Description", 40], ["Audience", 12], ["Order", 8]] as const;
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  ws.getRow(1).eachCell((c) => Object.assign(c, head));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const last = Math.max(targets.length + 1, 2);
  for (let r = 2; r <= 301; r++) {
    ws.getCell(`A${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${PLACE_TYPES.join(",")}"`], showErrorMessage: false };
    ws.getCell(`B${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`'Where it can go'!$C$2:$C$${last}`], showErrorMessage: false };
    ws.getCell(`F${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"PDF,Word,PowerPoint,Audio,Video,Link"'], showErrorMessage: false };
    ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Everyone,Students"'], showErrorMessage: false };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* -------------------------------------------------------------- import */

export interface ImportLine { row: number | null; status: "placed" | "corrected" | "draft" | "skipped" | "error"; title: string; what: string; where: string; notes: string[] }
export interface ImportReport { lines: ImportLine[]; placed: number; corrected: number; drafts: number; skipped: number; errors: number; templates: number }

async function readRows(f: { name: string; bytes: Buffer }): Promise<string[][] | null> {
  try {
    const wb = new ExcelJS.Workbook();
    if (extOf(f.name) === "csv") await wb.csv.read(new (await import("node:stream")).Readable({ read() { this.push(f.bytes); this.push(null); } }));
    else await wb.xlsx.load(f.bytes as unknown as ArrayBuffer);
    for (const ws of wb.worksheets) {
      if (/^(read ?me|where)/i.test(ws.name)) continue;
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const out: string[] = [];
        for (let i = 1; i <= row.cellCount; i++) {
          const v = row.getCell(i).value as unknown;
          out.push(v == null ? "" : typeof v === "object" ? String((v as { text?: string; hyperlink?: string; result?: unknown }).text ?? (v as { hyperlink?: string }).hyperlink ?? (v as { result?: unknown }).result ?? "") : String(v));
        }
        rows.push(out);
      });
      if (rows.length) { const d = detectColumns(rows); if (d.headerRow >= 0) return rows; }
    }
  } catch { /* not a readable sheet: treat as an ordinary file */ }
  return null;
}

/**
 * The one-step importer. Takes every file the administrator dropped in (a filled-in template and/or loose PDF, DOCX, PPTX, MP3 files),
 * repairs whatever is wrong (column names and order, misspelt places, missing https://, wrong file types, missing titles) and puts each
 * item where it belongs. What cannot be placed with confidence is kept as a Draft study material, never lost.
 */
export async function importBatch(actor: Actor, input: { name: string; bytes: Buffer }[], ctx: ReqCtx): Promise<ImportReport> {
  if (!input.length) throw new AppError("VALIDATION", "Choose at least one file.");
  if (input.length > 60) throw new AppError("VALIDATION", "Please upload up to 60 files at a time.");
  await rateLimit("upload", actor.id, ctx);
  const targets = await listTargets();
  const lines: ImportLine[] = [];
  const templates: { name: string; rows: string[][] }[] = [];
  const files: { name: string; bytes: Buffer }[] = [];
  for (const f of input) {
    const e = extOf(f.name);
    const rows = e === "xlsx" || e === "csv" ? await readRows(f) : null;
    if (rows) templates.push({ name: f.name, rows }); else files.push(f);
  }
  const byName = new Map(files.map((f) => [f.name, f]));
  const used = new Set<string>();
  const stored = new Map<string, string>();
  const nameList = files.map((f) => f.name);
  let counter = 0;

  async function assetFor(name: string) {
    if (stored.has(name)) return stored.get(name)!;
    const f = byName.get(name)!;
    const a = await storeAsset(actor, f, "LIBRARY", ctx, { skipRateLimit: true });
    stored.set(name, a.id);
    return a.id;
  }
  async function duplicate(placeKey: string | null, assetName: string | null, url: string | null) {
    const c = placeColumns(placeKey);
    const rows = await getDb().select({ assetId: s.materials.assetId, url: s.materials.url, courseId: s.materials.courseId, teachingId: s.materials.teachingId, place: s.materials.place }).from(s.materials);
    const here = rows.filter((r) => (c.courseId && r.courseId === c.courseId) || (c.teachingId && r.teachingId === c.teachingId) || (c.place && r.place === c.place) || (!placeKey && !r.courseId && !r.teachingId && !r.place));
    if (url) return here.some((r) => r.url === url);
    if (assetName) {
      const hash = sha256(byName.get(assetName)!.bytes);
      const ids = here.map((r) => r.assetId).filter(Boolean) as string[];
      if (!ids.length) return false;
      const existing = await getDb().select({ id: s.assets.id, sha: s.assets.sha256 }).from(s.assets);
      return existing.some((a) => ids.includes(a.id) && a.sha === hash);
    }
    return false;
  }

  async function place(line: Omit<ImportLine, "status" | "where">, p: { fileName: string | null; url: string | null; title: string; kind: MaterialKind; desc: string; audience: "PUBLIC" | "STUDENTS"; sort: number; query: string; typeHint: PlaceType | null }, corrected: boolean) {
    const notes = [...line.notes];
    let m = p.query ? bestMatch(p.query, targets, p.typeHint ?? undefined) : null;
    if (!m && p.query && p.fileName) m = bestMatch(titleFromName(p.fileName), targets, p.typeHint ?? undefined);
    let key: string | null = null;
    let whereLabel = "No place found: kept as a Draft in Admin → Study materials";
    if (m) {
      key = m.target.key;
      whereLabel = `${m.target.type}: ${m.target.title}`;
      if (m.score < 0.99) { corrected = true; notes.push(`"${p.query}" was matched to "${m.target.title}" (${m.target.type}).`); }
      if (p.typeHint && m.target.type !== p.typeHint) notes.push(`You said "${p.typeHint}", but this is a ${m.target.type}, so it was put there.`);
      if (m.runnerUp) notes.push(`Also close to "${m.runnerUp.target.title}" (${m.runnerUp.target.type}). Check it is right.`);
    }
    if (await duplicate(key, p.fileName, p.url)) { lines.push({ ...line, notes, status: "skipped", where: whereLabel, what: line.what + " (already there, not added again)" }); return; }
    const assetId = p.fileName ? await assetFor(p.fileName) : null;
    await insertMaterial({ title: p.title, kind: p.kind, description: p.desc, placeKey: key, assetId, url: p.url, audience: p.audience, sort: p.sort, status: key ? "PUBLISHED" : "DRAFT" });
    lines.push({ ...line, notes, status: key ? (corrected ? "corrected" : "placed") : "draft", where: whereLabel });
  }

  // ---- 1. rows from templates
  for (const t of templates) {
    const { map, headerRow, notes: colNotes } = detectColumns(t.rows);
    const body = t.rows.slice(headerRow + 1);
    for (let i = 0; i < body.length; i++) {
      const r = body[i];
      if (!r.some((x) => String(x ?? "").trim())) continue;
      const rowNo = headerRow + 2 + i;
      counter++;
      const notes: string[] = i === 0 ? [...colNotes] : [];
      let fileCell = cell(r, map, "file"), urlCell = cell(r, map, "url"), titleCell = cell(r, map, "title"), targetCell = cell(r, map, "target");
      const placeCell = cell(r, map, "place"), kindCell = cell(r, map, "kind"), audCell = cell(r, map, "audience"), desc = cell(r, map, "description");
      let corrected = false;
      // misplaced cells: a link in the file column, a file name in the link column, either hiding in Title / Attach to
      for (const k of ["file", "title", "target"] as const) {
        const v = k === "file" ? fileCell : k === "title" ? titleCell : targetCell;
        if (!urlCell && isUrlLike(v)) { urlCell = v; if (k === "file") fileCell = ""; else if (k === "title") titleCell = ""; else targetCell = ""; corrected = true; notes.push("A web link was in the wrong column and was moved to Link."); }
      }
      if (!fileCell && urlCell && !isUrlLike(urlCell) && matchFileName(urlCell, nameList)) { fileCell = urlCell; urlCell = ""; corrected = true; }
      if (!fileCell) for (const v of [titleCell, targetCell]) if (v && UPLOADABLE.has(extOf(v)) && matchFileName(v, nameList)) { fileCell = v; if (v === titleCell) titleCell = ""; else targetCell = ""; corrected = true; break; }

      let fileName: string | null = null, url: string | null = null;
      if (fileCell) {
        const hit = matchFileName(fileCell, nameList);
        if (!hit) { lines.push({ row: rowNo, status: "error", title: titleCell || fileCell, what: `File "${fileCell}"`, where: "", notes: [`"${fileCell}" is not among the files you uploaded with this template. Add it and upload again, or paste a link.`] }); continue; }
        fileName = hit.name; used.add(hit.name);
        if (!hit.exact) { corrected = true; notes.push(`"${fileCell}" was matched to the uploaded file "${hit.name}".`); }
      } else if (urlCell) {
        const fx = fixUrl(urlCell);
        if (!fx) { lines.push({ row: rowNo, status: "error", title: titleCell || urlCell, what: `Link "${urlCell}"`, where: "", notes: ["This is not a usable web link."] }); continue; }
        url = fx.url;
        if (fx.changed) { corrected = true; notes.push(`The link was tidied to ${fx.url}.`); }
      } else { lines.push({ row: rowNo, status: "error", title: titleCell || targetCell || "(empty)", what: "Row", where: "", notes: ["No file name and no link on this row."] }); continue; }

      if (fileName) { const e = extOf(fileName); if (!UPLOADABLE.has(e)) { lines.push({ row: rowNo, status: "error", title: titleCell || fileName, what: fileName, where: "", notes: [`".${e}" files are not supported. Use PDF, DOCX, PPTX or MP3.`] }); continue; } }
      const real = fileName ? kindFor(fileName, false) : kindFor(url!, true);
      let kind = kindFromWord(kindCell) ?? real;
      if (kindCell && kind !== real && (real !== "URL" && real !== "OTHER")) { kind = real; corrected = true; notes.push(`Type was set to ${real} to match the real file.`); }
      if (!kindCell) kind = real;
      const title = titleCell || (fileName ? titleFromName(fileName) : titleFromUrl(url!));
      if (!titleCell) { corrected = true; notes.push("The title was made from the file or link."); }
      const query = targetCell || (placeCell && !placeTypeFrom(placeCell) ? placeCell : "") || (fileName ? titleFromName(fileName) + " " + fileName : title);
      const order = Number.parseInt(cell(r, map, "order"), 10);
      try {
        await place({ row: rowNo, title, what: fileName ?? url!, notes }, { fileName, url, title, kind, desc, audience: audienceFrom(audCell) ?? "STUDENTS", sort: Number.isFinite(order) ? order : counter, query, typeHint: placeTypeFrom(placeCell) }, corrected);
      } catch (err) {
        lines.push({ row: rowNo, status: "error", title, what: fileName ?? url!, where: "", notes: [err instanceof Error ? err.message : "Could not save this row."] });
      }
    }
  }

  // ---- 2. files with no row: place by their file name
  for (const f of files) {
    if (used.has(f.name)) continue;
    counter++;
    const e = extOf(f.name);
    if (!UPLOADABLE.has(e)) { lines.push({ row: null, status: "error", title: f.name, what: f.name, where: "", notes: [e === "m4a" || e === "wav" || e === "ogg" || e === "aac" ? "Audio must be MP3. Convert it, or paste a link." : `".${e}" files are not supported. Use PDF, DOCX, PPTX or MP3.`] }); continue; }
    try {
      await place({ row: null, title: titleFromName(f.name), what: f.name, notes: ["No template row: the place was worked out from the file name."] }, { fileName: f.name, url: null, title: titleFromName(f.name), kind: kindFor(f.name, false), desc: "", audience: "STUDENTS", sort: counter, query: `${titleFromName(f.name)} ${f.name.replace(/\.[a-z0-9]+$/i, "")}`, typeHint: null }, true);
    } catch (err) {
      lines.push({ row: null, status: "error", title: f.name, what: f.name, where: "", notes: [err instanceof Error ? err.message : "Could not store this file."] });
    }
  }

  const count = (st: ImportLine["status"]) => lines.filter((l) => l.status === st).length;
  const report: ImportReport = { lines, placed: count("placed"), corrected: count("corrected"), drafts: count("draft"), skipped: count("skipped"), errors: count("error"), templates: templates.length };
  await audit({ actor, action: "materials.imported", entityType: "material", summary: `Upload centre: ${report.placed + report.corrected} placed, ${report.drafts} draft, ${report.errors} errors`, metadata: { files: input.length } }, ctx);
  return report;
}

export type { Col };
