/** Verifies the Bible timeline: every Scripture reference parses and every entry belongs to a declared era. Run: npx tsx scripts/check-timeline.ts */
import { BIBLE_TIMELINE } from "../src/content/bible-timeline";
import { parseRef } from "../src/core/bible";

let bad = 0;
const eras = new Set(BIBLE_TIMELINE.eras.map((e) => e.key));
for (const i of BIBLE_TIMELINE.items) {
  if (!eras.has(i.era)) { bad++; console.log("bad era", i.id); }
  for (const r of i.refs) if (!parseRef(r)) { bad++; console.log("bad ref", i.id, r); }
}
console.log(`${BIBLE_TIMELINE.items.length} entries, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
