import "server-only";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { BOOKS, hasText, parseRef, refHref, refLabel, type Ref, type TranslationId } from "@/core/bible";

/**
 * Bible data lives in gzip files (data/bible) and is held in memory after first use: the database stays small,
 * chapters cost one small response, and concordance / Strong's lookups are instant. All texts are public domain.
 */
type Text = string[][][]; // [book][chapter-1][verse-1]
const cache = new Map<string, unknown>();

function load<T>(name: string): T {
  const hit = cache.get(name);
  if (hit) return hit as T;
  const file = path.join(process.cwd(), "data", "bible", `${name}.json.gz`);
  const v = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")) as T;
  cache.set(name, v);
  return v;
}

export const textOf = (t: TranslationId) => load<Text>(t);
export const chapterCount = (book: number) => textOf("bsb")[book].length;
export const verseCount = (book: number, chapter: number) => textOf("bsb")[book][chapter - 1]?.length ?? 0;

export function chapterVerses(t: TranslationId, book: number, chapter: number): string[] {
  if (!hasText(t, book)) return [];
  return textOf(t)[book]?.[chapter - 1] ?? [];
}

/* ------------------------------------------------------------- tagged KJV */

export interface Word { w: string; s: string[]; em?: boolean }
/** "loved{G25} the world,{G2889} <em>is</em>" → words with Strong's numbers. */
export function parseTagged(text: string): Word[] {
  const out: Word[] = [];
  let em = false;
  for (const raw of text.replace(/\[\[|\]\]/g, "").split(/\s+/)) {
    if (!raw) continue;
    const s: string[] = [];
    let w = raw.replace(/\{([HG]\d+)\}/g, (_, id: string) => { s.push(id); return ""; });
    const opens = w.includes("<em>"), closes = w.includes("</em>");
    w = w.replace(/<\/?em>/g, "");
    if (opens) em = true;
    if (w) out.push({ w, s, em: em || undefined });
    else if (s.length && out.length) out[out.length - 1].s.push(...s);
    if (closes) em = false;
  }
  return out;
}

export const plain = (text: string) => text.replace(/\{[HG]\d+\}/g, "").replace(/<\/?em>/g, "").replace(/\[\[|\]\]/g, "").replace(/\s+/g, " ").trim();

/* ---------------------------------------------------------------- strong's */

export interface StrongsEntry { l: string; x: string; p: string; d: string; s: string; k: string }
export const strongsDict = () => load<Record<string, StrongsEntry>>("strongs");
export const strongsEntry = (id: string) => strongsDict()[id.toUpperCase()] ?? null;

const pack = (b: number, c: number, v: number) => b * 1_000_000 + c * 1000 + v;
export const unpack = (n: number): [number, number, number] => [Math.floor(n / 1_000_000), Math.floor((n % 1_000_000) / 1000), n % 1000];

interface Index { occ: Map<string, number[]>; render: Map<string, Map<string, number>> }
function strongsIndex(): Index {
  const hit = cache.get("strongs-index") as Index | undefined;
  if (hit) return hit;
  const occ = new Map<string, number[]>();
  const render = new Map<string, Map<string, number>>();
  const kjv = textOf("kjv");
  kjv.forEach((bk, b) => bk.forEach((ch, c) => ch.forEach((txt, v) => {
    if (!txt) return;
    const seen = new Set<string>();
    for (const w of parseTagged(txt)) {
      const word = w.w.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
      for (const id of w.s) {
        if (!seen.has(id)) { seen.add(id); (occ.get(id) ?? occ.set(id, []).get(id)!).push(pack(b, c + 1, v + 1)); }
        if (word) { const m = render.get(id) ?? render.set(id, new Map()).get(id)!; m.set(word, (m.get(word) ?? 0) + 1); }
      }
    }
  })));
  const idx = { occ, render };
  cache.set("strongs-index", idx);
  return idx;
}

export function strongsUsage(id: string) {
  const { occ, render } = strongsIndex();
  const refs = occ.get(id.toUpperCase()) ?? [];
  const words = [...(render.get(id.toUpperCase())?.entries() ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 14);
  return { refs, words };
}

/** Search the lexicon by number, original word, transliteration or English gloss. */
export function searchStrongs(q: string, limit = 40) {
  const dict = strongsDict();
  const s = q.trim();
  if (!s) return [];
  const num = s.match(/^([hg])?\s*0*(\d{1,4})$/i);
  if (num) {
    const ids = num[1] ? [num[1].toUpperCase() + num[2]] : ["H" + num[2], "G" + num[2]];
    return ids.filter((i) => dict[i]).map((i) => ({ id: i, ...dict[i] }));
  }
  const lower = s.toLowerCase();
  const exact: { id: string; e: StrongsEntry }[] = [], rest: { id: string; e: StrongsEntry }[] = [];
  for (const [id, e] of Object.entries(dict)) {
    const x = (e.x ?? "").toLowerCase(), k = (e.k ?? "").toLowerCase(), d = (e.s ?? "").toLowerCase();
    if (e.l === s || x === lower || k.split(/[,;]\s*/).some((p) => p.replace(/\.$/, "") === lower)) exact.push({ id, e });
    else if (x.includes(lower) || k.includes(lower) || d.includes(lower) || e.l.includes(s)) rest.push({ id, e });
    if (exact.length + rest.length > 400) break;
  }
  return [...exact, ...rest].slice(0, limit).map((r) => ({ id: r.id, ...r.e }));
}

/* ------------------------------------------------------------ concordance */

interface Flat { b: number; c: number; v: number; text: string; lower: string }
function flat(t: TranslationId): Flat[] {
  const key = `flat-${t}`;
  const hit = cache.get(key) as Flat[] | undefined;
  if (hit) return hit;
  const out: Flat[] = [];
  textOf(t).forEach((bk, b) => bk.forEach((ch, c) => ch.forEach((txt, v) => {
    if (!txt) return;
    const text = t === "kjv" ? plain(txt) : txt;
    out.push({ b, c: c + 1, v: v + 1, text, lower: text.toLowerCase() });
  })));
  cache.set(key, out);
  return out;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words (AND) or "exact phrases"; a trailing * means any ending (love* → loved, lovest, loveth). */
export function parseQuery(q: string): RegExp[] {
  const parts: string[] = [];
  q.replace(/"([^"]+)"|(\S+)/g, (_, phrase?: string, word?: string) => { parts.push((phrase ?? word ?? "").toLowerCase()); return ""; });
  return parts.filter(Boolean).slice(0, 6).map((p) => new RegExp(`(^|[^\\p{L}'])${esc(p.replace(/\*$/, ""))}${p.endsWith("*") ? "\\p{L}*" : "(?![\\p{L}])"}`, "iu"));
}

export function concordance(t: TranslationId, q: string, opts: { book?: number; testament?: "ot" | "nt"; offset?: number; limit?: number } = {}) {
  const res = parseQuery(q);
  if (!res.length || res.every((r) => r.source.length < 14)) return { total: 0, items: [] as Flat[], byBook: [] as { book: number; n: number }[], words: 0 };
  const hits: Flat[] = [];
  for (const v of flat(t)) if (res.every((r) => r.test(v.lower))) hits.push(v);
  const counts = new Map<number, number>();
  for (const h of hits) counts.set(h.b, (counts.get(h.b) ?? 0) + 1);
  let list = hits;
  if (opts.book !== undefined) list = list.filter((h) => h.b === opts.book);
  else if (opts.testament) list = list.filter((h) => (h.b < 39) === (opts.testament === "ot"));
  const g = new RegExp(res[0].source, "giu");
  let words = 0;
  for (const h of hits) words += (h.lower.match(g) ?? []).length;
  const off = opts.offset ?? 0;
  return { total: list.length, items: list.slice(off, off + (opts.limit ?? 40)), byBook: [...counts.entries()].map(([book, n]) => ({ book, n })), words };
}

/* ----------------------------------------------------------- misc helpers */

export function verseText(t: TranslationId, r: { book: number; chapter: number; v: number }) {
  const raw = chapterVerses(t, r.book, r.chapter)[r.v - 1] ?? "";
  return t === "kjv" ? plain(raw) : raw;
}

export function passage(t: TranslationId, r: Ref) {
  const verses = chapterVerses(t, r.book, r.chapter);
  const a = r.v1 ?? 1, z = r.v2 ?? r.v1 ?? verses.length;
  return verses.slice(a - 1, z).map((txt, i) => ({ v: a + i, text: t === "kjv" ? plain(txt) : txt })).filter((x) => x.text);
}

/** A passage for every day: deterministic and the same for all visitors. */
const VOTD = ["Psalms 23:1", "John 3:16", "Romans 8:28", "Philippians 4:13", "Isaiah 40:31", "Proverbs 3:5", "Jeremiah 29:11", "Joshua 1:9", "Matthew 6:33", "2 Timothy 1:7", "Psalms 46:1", "Romans 12:2", "Ephesians 2:8", "Hebrews 11:1", "1 John 4:19", "Galatians 5:22", "Acts 1:8", "Isaiah 41:10", "Psalms 119:105", "John 14:6", "Matthew 28:19", "2 Corinthians 5:17", "Micah 6:8", "Lamentations 3:22", "1 Peter 5:7", "Colossians 3:23", "James 1:5", "Psalms 121:1", "Habakkuk 2:14", "Zechariah 4:6", "Joel 2:28", "Malachi 3:10", "Revelation 3:20", "Luke 4:18", "Psalms 85:6"];
export function verseOfTheDay(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const ref = VOTD[day % VOTD.length];
  const m = ref.match(/^(.*) (\d+):(\d+)$/)!;
  const book = BOOKS.find((b) => b.name === m[1])!.i;
  return { book, chapter: Number(m[2]), v: Number(m[3]), label: ref, text: verseText("kjv", { book, chapter: Number(m[2]), v: Number(m[3]) }) };
}

/** Resolves "John 3:16" to its label, link and KJV verses (null if the reference is not valid). */
export function resolveRef(text: string, t: TranslationId = "kjv") {
  const r = parseRef(text);
  if (!r || r.book < 0 || r.book > 65 || r.chapter < 1 || r.chapter > chapterCount(r.book)) return null;
  return { ref: r, label: refLabel(r), href: refHref(r), verses: passage(t, r) };
}

/* ----------------------------------------------------------- reading plans */

export interface PlanDay { day: number; label: string; first: { slug: string; chapter: number } | null; count: number }

/** Shares the plan's chapters evenly across its days; sources are "book", "book:7" or "book:1-30". */
export function planDays(sources: string[], days: number): PlanDay[] {
  const chapters: [number, number][] = [];
  for (const src of sources) {
    const [slug, rng] = src.split(":");
    const b = BOOKS.find((x) => x.slug === slug);
    if (!b) continue;
    const n = chapterCount(b.i);
    const [a, z] = rng ? rng.split("-").map(Number) : [1, n];
    for (let c = Math.max(1, a); c <= Math.min(n, z ?? a); c++) chapters.push([b.i, c]);
  }
  const N = chapters.length;
  const out: PlanDay[] = [];
  for (let d = 0; d < days; d++) {
    const part = chapters.slice(Math.floor((d * N) / days), Math.floor(((d + 1) * N) / days));
    const segs: string[] = [];
    for (let i = 0; i < part.length;) {
      let j = i;
      while (j + 1 < part.length && part[j + 1][0] === part[i][0] && part[j + 1][1] === part[j][1] + 1) j++;
      const name = BOOKS[part[i][0]].name;
      segs.push(`${name} ${part[i][1]}${j > i ? `–${part[j][1]}` : ""}`);
      i = j + 1;
    }
    out.push({ day: d + 1, label: segs.join("; "), first: part[0] ? { slug: BOOKS[part[0][0]].slug, chapter: part[0][1] } : null, count: part.length });
  }
  return out;
}
