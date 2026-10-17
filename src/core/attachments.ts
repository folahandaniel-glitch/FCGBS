/**
 * Pure helpers for attaching files and links to places across the site, and for forgiving bulk-import templates:
 * fuzzy matching of "where does this belong", file-kind detection, URL repair, column detection and cell clean-up.
 * Nothing here touches the database, so it is unit-tested directly.
 */

export type PlaceType = "course" | "lesson" | "teaching" | "question" | "topic" | "plan" | "timeline" | "track" | "programme";
export const PLACE_TYPES: PlaceType[] = ["course", "lesson", "teaching", "question", "topic", "plan", "timeline", "track", "programme"];
export type MaterialKind = "PDF" | "DOCX" | "PPTX" | "MP3" | "VIDEO" | "URL" | "OTHER";

export interface Target { type: PlaceType; key: string; code?: string; slug?: string; title: string; extra?: string }

/* ---------------------------------------------------------------- text */

export const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const NOISE = new Set(["pdf", "docx", "doc", "pptx", "ppt", "mp3", "final", "copy", "new", "version", "v1", "v2", "v3", "draft", "file", "slides", "slide", "handout", "notes", "lecture", "the", "of", "and", "a", "an", "for", "on", "to", "in", "by", "with"]);
const tokens = (s: string, strip = true) => norm(s).split(" ").filter((t) => t && (!strip || !NOISE.has(t)));

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const ratio = (a: string, b: string) => (a || b ? 1 - levenshtein(a, b) / Math.max(a.length, b.length) : 0);

/** 0..1 similarity between a free-text query (file name, typed name, code) and a candidate place. */
export function score(query: string, t: Target): number {
  const q = norm(query);
  if (!q) return 0;
  const qc = q.replace(/ /g, "");
  const code = t.code ? norm(t.code).replace(/ /g, "") : "";
  const slug = t.slug ? norm(t.slug).replace(/ /g, "") : "";
  if ((code && qc === code) || (slug && qc === slug)) return 1;
  const title = norm(t.title);
  if (q === title) return 0.99;
  let best = 0;
  // a course code written inside a longer phrase: "BIB208 hermeneutics notes"
  if (code && code.length >= 4) {
    const re = new RegExp(`(^|[^a-z0-9])${norm(t.code!).replace(/ /g, " ?")}([^a-z0-9]|$)`);
    if (re.test(q) || re.test(` ${q} `)) best = Math.max(best, 0.95);
  }
  if (title.length >= 5 && (q.includes(title) || title.includes(q)) && Math.min(q.length, title.length) >= 5) best = Math.max(best, 0.8 + 0.15 * (Math.min(q.length, title.length) / Math.max(q.length, title.length)));
  const qt = tokens(q), tt = tokens(title);
  if (qt.length && tt.length) {
    const set = new Set(tt);
    const hit = qt.filter((x) => set.has(x) || [...set].some((y) => x.length > 3 && y.length > 3 && ratio(x, y) >= 0.82)).length;
    const dice = (2 * hit) / (qt.length + tt.length);
    best = Math.max(best, dice * 0.92);
    // every word of the shorter side present → strong
    if (hit === Math.min(qt.length, tt.length) && hit >= 2) best = Math.max(best, 0.82);
  }
  best = Math.max(best, ratio(qc, title.replace(/ /g, "")) * 0.95, slug ? ratio(qc, slug) * 0.9 : 0);
  return Math.min(best, 0.99);
}

export interface Match { target: Target; score: number; runnerUp?: { target: Target; score: number } }
export const MIN_SCORE = 0.58;

export function bestMatch(query: string, targets: Target[], type?: PlaceType): Match | null {
  const pool = type ? targets.filter((t) => t.type === type) : targets;
  const rank = (list: Target[]) => list.map((t) => ({ target: t, score: score(query, t) })).sort((a, b) => b.score - a.score);
  let ranked = rank(pool);
  if ((!ranked[0] || ranked[0].score < MIN_SCORE) && type) ranked = rank(targets); // wrong place type given: look everywhere
  const top = ranked[0];
  if (!top || top.score < MIN_SCORE) return null;
  const second = ranked.find((r) => r.target.key !== top.target.key && r.score >= top.score - 0.05 && r.score >= MIN_SCORE);
  return { target: top.target, score: top.score, runnerUp: second };
}

/* ---------------------------------------------------------- place words */

const PLACE_WORDS: Record<PlaceType, string[]> = {
  course: ["course", "courses", "class", "subject", "unit", "module", "syllabus"],
  lesson: ["lesson", "lessons", "lecture", "session"],
  teaching: ["teaching", "teachings", "sermon", "study", "message", "library"],
  question: ["question", "questions", "hard question", "controversial", "topic question", "faq"],
  topic: ["bible topic", "topic", "topics", "topical"],
  plan: ["plan", "reading plan", "plans"],
  timeline: ["timeline", "bible timeline", "event", "era"],
  track: ["track", "stream", "category", "teaching track"],
  programme: ["programme", "program", "certificate", "diploma", "degree"],
};
export function placeTypeFrom(raw: string): PlaceType | null {
  const n = norm(raw);
  if (!n) return null;
  let best: { t: PlaceType; s: number } | null = null;
  for (const t of PLACE_TYPES) for (const w of PLACE_WORDS[t]) {
    const s = n === w ? 1 : ratio(n, w) >= 0.8 ? ratio(n, w) : n.startsWith(w) ? 0.85 : 0;
    if (s && (!best || s > best.s)) best = { t, s };
  }
  return best ? best.t : null;
}

/* ------------------------------------------------------- kinds and urls */

const EXT_KIND: Record<string, MaterialKind> = { pdf: "PDF", docx: "DOCX", doc: "DOCX", pptx: "PPTX", ppt: "PPTX", mp3: "MP3", xlsx: "OTHER", xls: "OTHER", png: "OTHER", jpg: "OTHER", jpeg: "OTHER", webp: "OTHER" };
export const UPLOADABLE = new Set(["pdf", "docx", "doc", "pptx", "ppt", "mp3", "xlsx", "xls", "png", "jpg", "jpeg", "webp"]);
export const extOf = (name: string) => (/\.([a-z0-9]{2,5})(?:[?#].*)?$/i.exec(name.trim())?.[1] ?? "").toLowerCase();

const looksLikeUrl = (v: string) => /^(https?:\/\/|www\.)\S+$/i.test(v.trim()) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(v.trim()) || /^(youtu\.be|youtube\.com|vimeo\.com|drive\.google\.com|docs\.google\.com|dropbox\.com|archive\.org)\b/i.test(v.trim());
export const isUrlLike = looksLikeUrl;

/** Repairs a pasted link: adds https://, upgrades http:// , trims, strips trailing punctuation; returns null if it cannot be a web link. */
export function fixUrl(raw: string): { url: string; changed: boolean } | null {
  let v = raw.trim().replace(/^<|>$/g, "").replace(/[),.;]+$/, "");
  if (!v || /\s/.test(v)) return null;
  const original = v;
  if (/^(javascript|data|file|vbscript):/i.test(v)) return null;
  if (/^http:\/\//i.test(v)) v = "https://" + v.slice(7);
  else if (!/^https:\/\//i.test(v)) { if (!looksLikeUrl(v)) return null; v = "https://" + v.replace(/^\/+/, ""); }
  try { const u = new URL(v); if (!u.hostname.includes(".")) return null; v = u.toString(); } catch { return null; }
  // YouTube / Vimeo watch links become their embeddable form so they play inside the page
  const yt = /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/i.exec(v);
  if (yt) v = `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = /^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/i.exec(v);
  if (vm) v = `https://player.vimeo.com/video/${vm[1]}`;
  return { url: v, changed: v !== original };
}

export function kindFor(nameOrUrl: string, isUrl: boolean): MaterialKind {
  if (isUrl && /(youtube|youtu\.be|vimeo)/i.test(nameOrUrl)) return "VIDEO";
  const e = extOf(isUrl ? nameOrUrl.split("?")[0] : nameOrUrl);
  if (e && EXT_KIND[e]) return EXT_KIND[e];
  return isUrl ? "URL" : "OTHER";
}

export function kindFromWord(raw: string): MaterialKind | null {
  const n = norm(raw);
  if (!n) return null;
  const map: [RegExp, MaterialKind][] = [[/^(pdf|portable)/, "PDF"], [/^(doc|word|docx)/, "DOCX"], [/^(ppt|pptx|power ?point|slides?|presentation)/, "PPTX"], [/^(mp3|audio|sound|podcast|music|listen)/, "MP3"], [/^(video|youtube|vimeo|film|clip)/, "VIDEO"], [/^(url|link|web|website|site|page)/, "URL"], [/^(other|file)/, "OTHER"]];
  for (const [re, k] of map) if (re.test(n)) return k;
  return null;
}

export function audienceFrom(raw: string): "PUBLIC" | "STUDENTS" | null {
  const n = norm(raw);
  if (!n) return null;
  if (/^(public|everyone|all|open|anyone|free|visitors?)/.test(n)) return "PUBLIC";
  if (/^(student|students|member|members|signed|private|learner|learners|registered|restricted|paid)/.test(n)) return "STUDENTS";
  return null;
}

/** "BIB208_hermeneutics-week-3 FINAL (2).pdf" → "Hermeneutics Week 3" */
export function titleFromName(name: string) {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/\s*\(\d+\)\s*$/, "").replace(/[_\-.]+/g, " ").replace(/\b(final|copy|v\d+|draft|new)\b/gi, " ").replace(/\s+/g, " ").trim();
  const t = base.replace(/^[A-Z]{3}\d{3}\s+/, "") || base;
  return (t || base).split(" ").map((w, i) => (w === w.toUpperCase() && w.length > 1 && /[A-Z]/.test(w) && w.length <= 5 ? w : i === 0 || w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ").slice(0, 160);
}
export function titleFromUrl(url: string) {
  try { const u = new URL(url); const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? ""); return last ? titleFromName(last) : u.hostname.replace(/^www\./, ""); } catch { return url.slice(0, 80); }
}

/** Finds the uploaded file a template cell is talking about, tolerating case, spaces, underscores and a missing/wrong extension. */
export function matchFileName(cell: string, files: string[]): { name: string; exact: boolean } | null {
  const c = cell.trim().replace(/^.*[\\/]/, "");
  if (!c) return null;
  const lc = c.toLowerCase();
  const exact = files.find((f) => f.toLowerCase() === lc);
  if (exact) return { name: exact, exact: true };
  const strip = (s: string) => norm(s.replace(/\.[a-z0-9]{2,5}$/i, "")).replace(/ /g, "");
  const cs = strip(c);
  const same = files.filter((f) => strip(f) === cs);
  if (same.length === 1) return { name: same[0], exact: false };
  const ranked = files.map((f) => ({ f, s: ratio(strip(f), cs) })).sort((a, b) => b.s - a.s);
  return ranked[0] && ranked[0].s >= 0.8 && (!ranked[1] || ranked[0].s - ranked[1].s > 0.05) ? { name: ranked[0].f, exact: false } : null;
}

/* ------------------------------------------------------ template parsing */

export type Col = "place" | "target" | "title" | "file" | "url" | "kind" | "description" | "audience" | "order";
const HEADERS: Record<Col, string[]> = {
  place: ["place", "where", "place type", "section", "area", "location", "attach type", "belongs to type", "level"],
  target: ["target", "attach to", "course", "course code", "code", "slug", "lesson", "teaching", "question", "topic", "page", "item", "for", "belongs to", "place name", "name of place", "destination", "course title", "programme"],
  title: ["title", "name", "material", "material title", "label", "heading", "resource", "resource title", "document title"],
  file: ["file", "filename", "file name", "document", "attachment", "path", "upload", "file to upload"],
  url: ["url", "link", "website", "href", "web", "web link", "address"],
  kind: ["kind", "type", "format", "file type", "material type"],
  description: ["description", "notes", "note", "details", "summary", "about", "comment", "comments"],
  audience: ["audience", "visibility", "who", "access", "who can open", "who can see"],
  order: ["order", "sort", "position", "no", "number", "sequence", "rank"],
};

export function headerCol(cell: string): Col | null {
  const n = norm(cell);
  if (!n) return null;
  let best: { c: Col; s: number } | null = null;
  for (const c of Object.keys(HEADERS) as Col[]) for (const h of HEADERS[c]) {
    const s = n === h ? 1 : n.replace(/ /g, "") === h.replace(/ /g, "") ? 0.98 : ratio(n, h) >= 0.82 ? ratio(n, h) : n.includes(h) && h.length > 3 ? (n.endsWith(h) ? 0.8 : 0.75) : 0;
    if (s && (!best || s > best.s)) best = { c, s };
  }
  return best?.c ?? null;
}

/** Works out which column is which, from the header row if there is one, otherwise from what the cells look like. */
export function detectColumns(rows: string[][]): { map: Partial<Record<Col, number>>; headerRow: number; notes: string[] } {
  const notes: string[] = [];
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const found: Partial<Record<Col, number>> = {};
    let hits = 0;
    rows[r].forEach((cell, i) => { const c = headerCol(cell); if (c && found[c] === undefined) { found[c] = i; hits++; } });
    if (hits >= 2 && (found.title !== undefined || found.file !== undefined || found.url !== undefined || found.target !== undefined)) {
      // "Type" is ambiguous: kind of file, or kind of place? Look at the values.
      if (found.kind !== undefined && found.place === undefined) {
        const vals = rows.slice(r + 1, r + 30).map((x) => x[found.kind!] ?? "").filter(Boolean);
        const placey = vals.filter((v) => placeTypeFrom(v) && !kindFromWord(v)).length;
        if (vals.length && placey > vals.length / 2) { found.place = found.kind; delete found.kind; notes.push('The "Type" column held places, not file types, so it was read as the place type.'); }
      }
      return { map: found, headerRow: r, notes };
    }
  }
  // no header: guess from the content of the first rows
  const sample = rows.slice(0, 20);
  const width = Math.max(0, ...sample.map((r) => r.length));
  const map: Partial<Record<Col, number>> = {};
  const used = new Set<number>();
  const pick = (col: Col, test: (v: string) => boolean) => {
    for (let i = 0; i < width; i++) {
      if (used.has(i)) continue;
      const vals = sample.map((r) => (r[i] ?? "").trim()).filter(Boolean);
      if (vals.length && vals.filter(test).length >= Math.ceil(vals.length * 0.6)) { map[col] = i; used.add(i); return; }
    }
  };
  pick("url", (v) => looksLikeUrl(v));
  pick("file", (v) => !!UPLOADABLE.has(extOf(v)) && !looksLikeUrl(v));
  pick("kind", (v) => !!kindFromWord(v) && v.length < 14);
  pick("audience", (v) => !!audienceFrom(v) && v.length < 14);
  pick("place", (v) => !!placeTypeFrom(v) && v.length < 18);
  pick("order", (v) => /^\d{1,3}$/.test(v));
  const rest = [...Array(width).keys()].filter((i) => !used.has(i));
  if (rest.length) map.target = rest[0];
  if (rest.length > 1) map.title = rest[1];
  if (rest.length > 2) map.description = rest[2];
  notes.push("No heading row was found, so the columns were worked out from the cells.");
  return { map, headerRow: -1, notes };
}

export function cell(row: string[], map: Partial<Record<Col, number>>, c: Col) {
  const i = map[c];
  return i === undefined ? "" : String(row[i] ?? "").replace(/\s+/g, " ").trim();
}
