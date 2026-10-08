/**
 * One-off builder: converts public-domain source texts in .data/src into compact gzip files in data/bible/.
 * Sources (all public domain): KJV with Strong's numbers, Berean Standard Bible (PD since 2023), American Standard
 * Version (1901), Westminster Leningrad Codex (Hebrew), Textus Receptus (Greek), Strong's Hebrew & Greek dictionaries.
 * Run:  node scripts/build-bible-data.mjs
 */
import fs from "node:fs";
import zlib from "node:zlib";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const SRC = ".data/src";
const OUT = "data/bible";
fs.mkdirSync(OUT, { recursive: true });

const CODES = "Gen Exo Lev Num Deu Jos Jdg Rth 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Eze Dan Hos Joe Amo Oba Jon Mic Nah Hab Zep Hag Zec Mal Mat Mar Luk Jhn Act Rom 1Co 2Co Gal Eph Phl Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jo 2Jo 3Jo Jde Rev".split(" ");
const save = (name, data) => {
  const buf = zlib.gzipSync(Buffer.from(JSON.stringify(data)), { level: 9 });
  fs.writeFileSync(`${OUT}/${name}.json.gz`, buf);
  console.log(name, (buf.length / 1024).toFixed(0) + " KB");
};

// ---- scrollmapper style: books[].chapters[].verses[{verse,text}]
const fromScroll = (file) => {
  const j = JSON.parse(fs.readFileSync(`${SRC}/${file}`, "utf8"));
  return j.books.map((b) => b.chapters.map((c) => {
    const arr = [];
    for (const v of c.verses) arr[v.verse - 1] = (v.text ?? "").replace(/\s+/g, " ").trim();
    for (let i = 0; i < arr.length; i++) arr[i] ??= "";
    return arr;
  }));
};
for (const [name, file] of [["bsb", "BSB.json"], ["asv", "ASV.json"], ["wlc", "WLC.json"], ["tr", "TR.json"]]) save(name, fromScroll(file));

// ---- KJV with Strong's: "word[G123]" → keep as "word{G123}" (compact, unambiguous)
const kjv = CODES.map((code) => {
  const f = `${SRC}/kjv/${code}.json`;
  if (!fs.existsSync(f)) throw new Error("missing KJV file " + code);
  const txt = fs.readFileSync(f, "utf8");
  const chapters = [];
  // The non-English fields in the source contain unescaped quotes, so read only the English field.
  const re = /"[0-9A-Za-z]{3}\|(\d+)\|(\d+)":\s*\{\s*"en":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(txt))) {
    const ch = Number(m[1]), v = Number(m[2]);
    const arr = (chapters[ch - 1] ??= []); if (arr[v - 1] !== undefined) continue; arr[v - 1] = JSON.parse('"' + m[3] + '"').replace(/\[fn\]/g, "").replace(/&#8212;/g, "—").replace(/\[([HG]\d+)\]/g, "{$1}").replace(/\s+/g, " ").trim();
  }
  for (const c of chapters) for (let i = 0; i < c.length; i++) c[i] ??= "";
  return chapters;
});
// Some source files carry stray extra data; the canonical verse structure comes from the BSB text.
const shape = fromScroll("BSB.json");
shape.forEach((bk, i) => { kjv[i].length = bk.length; bk.forEach((c, j) => { kjv[i][j] = (kjv[i][j] ?? []).slice(0, c.length); while (kjv[i][j].length < c.length) kjv[i][j].push(""); }); });
save("kjv", kjv);

// ---- Strong's dictionaries
const heb = require(`../${SRC}/sh.js`);
const grk = require(`../${SRC}/sg.js`);
const dict = {};
for (const [k, e] of Object.entries(heb)) dict[k] = { l: e.lemma, x: e.xlit, p: e.pron, d: e.derivation, s: e.strongs_def, k: e.kjv_def };
for (const [k, e] of Object.entries(grk)) dict[k] = { l: e.lemma, x: e.translit, p: e.pron ?? "", d: e.derivation, s: e.strongs_def, k: e.kjv_def };
save("strongs", dict);
console.log("entries", Object.keys(dict).length);
