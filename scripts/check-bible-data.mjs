import fs from "node:fs";
import zlib from "node:zlib";
const load = (n) => JSON.parse(zlib.gunzipSync(fs.readFileSync(`data/bible/${n}.json.gz`)));
for (const t of ["kjv", "bsb", "asv", "wlc", "tr"]) {
  const d = load(t);
  let n = 0, e = 0;
  for (const b of d) for (const c of b) for (const v of c) { n++; if (!v) e++; }
  console.log(t, "books", d.length, "verses", n, "empty", e);
}
const k = load("kjv");
console.log(k.map((b) => b.length).join(","));
console.log(k[42][2][15]);
