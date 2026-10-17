/** Lists every Strong's number mentioned in the exegesis studies with its dictionary lemma/gloss so wrong ids are visible. Run: npx tsx scripts/check-strongs.ts */
import fs from "node:fs";
import zlib from "node:zlib";
import { EXEGESIS } from "../src/content/teachings/exegesis";

const dict = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/bible/strongs.json.gz")).toString());
let missing = 0;
for (const t of EXEGESIS) {
  const ids = [...new Set([...t.body.matchAll(/\b([HG]\d{1,4})\b/g)].map((m) => m[1]))];
  for (const id of ids) {
    const e = dict[id];
    if (!e) { missing++; console.log(`${t.slug}: ${id} NOT FOUND`); continue; }
    const at = t.body.indexOf(id); const around = t.body.slice(Math.max(0, at - 45), at).replace(/s+/g, " ");
    console.log(`${id.padEnd(6)} ${JSON.stringify(e).slice(0, 110)}   <- ${around}`);
  }
}
console.log(missing, "missing");
