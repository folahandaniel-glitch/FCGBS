/** Writes sample exports of one teaching to a folder so the layout can be inspected. Usage: npx tsx --conditions=react-server scripts/sample-export.ts <outDir> */
import fs from "node:fs";
import { TEACHINGS } from "../src/content/teachings";
import { exportDoc } from "../src/server/services/export";

const out = process.argv[2] ?? ".data/samples";
fs.mkdirSync(out, { recursive: true });
const t = TEACHINGS.find((x) => x.slug === "the-gospel-in-a-nutshell")!;
const doc = { title: t.title, subtitle: t.summary, kicker: "Evangelical Teachings", scriptures: t.scriptures, body: t.body, school: "Fodan Christian Global Bible School", note: "Scripture quotations are from the King James Version (public domain). Original teaching material of FCGBS." };
(async () => {
  for (const f of ["pdf", "docx", "pptx"] as const) fs.writeFileSync(`${out}/sample.${f}`, await exportDoc(doc, f));
  console.log("written to", out);
})();
