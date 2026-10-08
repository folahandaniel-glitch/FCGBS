import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { exportDoc, parseBlocks, type ExportDoc } from "@/server/services/export";

const doc: ExportDoc = {
  title: "Gifts for equipping, not for status",
  subtitle: "Reading Ephesians 4:7–16 in context",
  kicker: "Apostolic Teachings",
  scriptures: ["Ephesians 4:11-16", "1 Corinthians 12:28"],
  school: "Fodan Christian Global Bible School",
  note: "Scripture quotations are from the King James Version (public domain).",
  body: `## The passage
"And he gave some, apostles; and some, prophets…" (Ephesians 4:11–12, KJV)

> Christ is the giver — **not** the church, and not the minister.

## Three things to notice
- **Christ is the giver.** The gifts are *given by Christ* (v. 7–8, 11).
- **The purpose is equipping.** The goal is that *all the saints* do the work of ministry.
- **The measure is Christ.** The target is Christlike maturity “with a curly quote” and an en–dash.

## Reflect
1. Why does Paul stress unity first?
2. How could a church misuse these verses?`,
};

describe("study-material export", () => {
  it("parses the Markdown subset", () => {
    const b = parseBlocks(doc.body);
    expect(b.map((x) => x.t)).toEqual(["h2", "p", "quote", "h2", "ul", "h2", "ol"]);
  });

  it("produces a valid DOCX package", async () => {
    const buf = await exportDoc(doc, "docx");
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Gifts for equipping");
    expect(xml).toContain("Three things to notice");
  });

  it("produces a valid PPTX package with notes", async () => {
    const buf = await exportDoc(doc, "pptx");
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides.length).toBeGreaterThanOrEqual(4);
    const first = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(first).toContain("Gifts for equipping");
  });

  it("produces a PDF and plain text", async () => {
    const pdf = await exportDoc(doc, "pdf");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const txt = (await exportDoc(doc, "txt")).toString("utf8");
    expect(txt).toContain("THE PASSAGE");
    expect(txt).toContain("Fodan Christian Global Bible School");
  });
});
