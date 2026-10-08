/** Verifies that every Strong's number and every Scripture reference in the Bible content is real. Run: npx tsx scripts/check-bible-content.ts */
import fs from "node:fs";
import zlib from "node:zlib";
import { parseRef } from "../src/core/bible";
import { BIBLE_TOPICS } from "../src/content/bible-topics";
import { BIBLE_LANGUAGES } from "../src/content/bible-languages";

const load = (n: string) => JSON.parse(zlib.gunzipSync(fs.readFileSync(`data/bible/${n}.json.gz`)).toString());
const bsb: string[][][] = load("bsb");
const dict: Record<string, { l: string; x: string; s: string }> = load("strongs");
let bad = 0;
const checkRef = (r: string, where: string) => {
  const p = parseRef(r);
  const ch = p && bsb[p.book]?.[p.chapter - 1];
  if (!p || !ch || (p.v1 && p.v1 > ch.length) || (p.v2 && p.v2 > ch.length) || (p.v1 && p.v2 && p.v2 < p.v1)) { bad++; console.log("BAD REF", where, r); }
};
for (const t of BIBLE_TOPICS) for (const r of t.refs) checkRef(r.ref, t.slug);
for (const w of BIBLE_LANGUAGES.studies) {
  const e = dict[w.id];
  if (!e) { bad++; console.log("NO STRONGS", w.id); continue; }
  console.log(w.id.padEnd(6), e.x.padEnd(14), e.l, "|", (e.s ?? "").slice(0, 50));
  w.refs.forEach((r) => checkRef(r, w.id));
}
console.log(bad ? `${bad} problem(s)` : "all references valid");
