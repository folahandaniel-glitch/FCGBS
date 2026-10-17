/**
 * Verifies every quotation marked as KJV in the seed content: a quote written as "..." (Book c:v–v, KJV) must appear in
 * that passage of the King James text (ellipses allowed). A bare "(2:38, KJV)" reuses the book of the previous reference in
 * the same text, and "Psalm 51:1, 10" checks both verses. Run: npx tsx scripts/check-quotes.ts
 */
import fs from "node:fs";
import zlib from "node:zlib";
import { parseRef } from "../src/core/bible";
import { TEACHINGS } from "../src/content/teachings";
import { LESSONS } from "../src/content/lessons";
import { MORE_LESSONS } from "../src/content/lessons-more";
import { QUESTIONS_SEED } from "../src/content/questions";

const kjv: string[][][] = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/bible/kjv.json.gz")).toString());
const plain = (t: string) => t.replace(/\{[HG]\d+\}/g, "").replace(/<\/?em>/g, "").replace(/\[|\]/g, "");
const norm = (t: string) => t.toLowerCase().replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function verses(ref: string): string | null {
  const r = parseRef(ref.replace(/–|—/g, "-"));
  if (!r) return null;
  const vs = kjv[r.book]?.[r.chapter - 1];
  if (!vs) return null;
  const a = r.v1 ?? 1, z = r.v2 ?? r.v1 ?? vs.length;
  return norm(vs.slice(a - 1, z).map(plain).join(" "));
}
function passage(ref: string, lastBook: string): { text: string | null; book: string } {
  let r = ref.replace(/^see\s+/i, "").trim();
  const bare = /^(\d+):(\d+)/.exec(r);
  if (bare && lastBook) r = `${lastBook} ${r}`;
  const list = /^(.*?\s(\d+):\d+(?:[–-]\d+)?)((?:\s*,\s*\d+(?:[–-]\d+)?)+)$/.exec(r);
  const parts = list ? [list[1], ...list[3].split(",").map((x) => x.trim()).filter(Boolean).map((v) => `${list[1].replace(/\s\d+:.*$/, "")} ${list[2]}:${v}`)] : [r];
  const texts = parts.map(verses);
  const book = r.replace(/\s+\d+:.*$/, "");
  return { text: texts.every(Boolean) ? texts.join(" ") : null, book };
}

const lensText = (q: (typeof QUESTIONS_SEED)[number]) => [q.summary, q.exegetical, q.genealogical, q.archaeological, q.apostolic, q.prophetic, q.theological, q.views, q.pastoral].filter(Boolean).join(" ");
const items = [...QUESTIONS_SEED.map((q) => ({ id: `Q:${q.slug}`, body: lensText(q) })), ...TEACHINGS.map((t) => ({ id: t.slug, body: t.body })), ...LESSONS.map((l) => ({ id: `${l.course}:${l.title}`, body: l.body })), ...MORE_LESSONS.map((l) => ({ id: `${l.course}:${l.title}`, body: l.body }))];
let n = 0, bad = 0;
for (const it of items) {
  const re = /["“]([^"”]{6,}?)["”]\s*\(([^()]*?),\s*KJV\)/g;
  let m: RegExpExecArray | null;
  let lastBook = "";
  // remember the most recent full reference anywhere before each quotation
  const book = (idx: number) => {
    const before = it.body.slice(0, idx);
    const all = [...before.matchAll(/((?:[1-3]\s)?[A-Z][a-z]+(?:\s(?:of\s)?[A-Z][a-z]+)?)\s\d+[:–\d]/g)];
    return all.length ? all[all.length - 1][1] : lastBook;
  };
  while ((m = re.exec(it.body))) {
    n++;
    const { text, book: b } = passage(m[2], book(m.index));
    if (b) lastBook = b;
    if (!text) { bad++; console.log(`[${it.id}] cannot resolve reference: ${m[2]}`); continue; }
    const segs = m[1].split(/…|\.\.\./).map(norm).filter((s) => s.length > 2);
    const miss = segs.filter((s) => !text.includes(s));
    if (miss.length) { bad++; console.log(`[${it.id}] ${m[2]}\n   quote:   ${m[1]}\n   missing: ${miss.join(" | ")}`); }
  }
}
console.log(`${n} KJV quotations checked, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
