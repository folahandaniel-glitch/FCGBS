import { describe, expect, it } from "vitest";
import { bestMatch, detectColumns, fixUrl, kindFor, kindFromWord, matchFileName, placeTypeFrom, titleFromName, type Target } from "@/core/attachments";

const T: Target[] = [
  { type: "course", key: "course:1", code: "BIB208", title: "Hermeneutics" },
  { type: "course", key: "course:2", code: "BIB301", title: "Advanced Biblical Interpretation and Exegesis" },
  { type: "question", key: "question:g", slug: "genealogies-of-jesus-matthew-and-luke", title: "How do the genealogies of Jesus in Matthew and Luke fit together?" },
  { type: "question", key: "question:e", slug: "why-does-god-allow-evil-and-suffering", title: "Why does God allow evil and suffering?" },
  { type: "timeline", key: "timeline:exile", slug: "exile", title: "Babylon takes Jerusalem; the Exile" },
  { type: "teaching", key: "teaching:p", slug: "isaiah-53-the-suffering-servant", title: "Isaiah 52:13–53:12: The Suffering Servant" },
];

describe("matching a typed or file name to a place", () => {
  it("finds courses by code, even inside a file name", () => {
    expect(bestMatch("BIB208", T)?.target.key).toBe("course:1");
    expect(bestMatch("bib 208 hermeneutics notes FINAL", T)?.target.key).toBe("course:1");
  });
  it("forgives spelling mistakes and word order", () => {
    expect(bestMatch("Hermenutics", T)?.target.key).toBe("course:1");
    expect(bestMatch("Genealogy of Jesus Matthew Luke", T)?.target.key).toBe("question:g");
    expect(bestMatch("why God allows evil", T)?.target.key).toBe("question:e");
    expect(bestMatch("suffering servant isaiah 53", T)?.target.key).toBe("teaching:p");
  });
  it("looks everywhere when the place type is wrong, and gives up when nothing fits", () => {
    expect(bestMatch("Hermeneutics", T, "question")?.target.key).toBe("course:1");
    expect(bestMatch("quantum cookery", T)).toBeNull();
  });
  it("understands loose place words", () => {
    expect(placeTypeFrom("Courses")).toBe("course");
    expect(placeTypeFrom("hard question")).toBe("question");
    expect(placeTypeFrom("Reading plan")).toBe("plan");
    expect(placeTypeFrom("blah")).toBeNull();
  });
});

describe("links, kinds, titles and file names", () => {
  it("repairs links", () => {
    expect(fixUrl("www.example.org/a.pdf")?.url).toBe("https://www.example.org/a.pdf");
    expect(fixUrl("http://example.org/x")?.url).toBe("https://example.org/x");
    expect(fixUrl("https://youtu.be/dQw4w9WgXcQ")?.url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(fixUrl("javascript:alert(1)")).toBeNull();
    expect(fixUrl("not a link")).toBeNull();
  });
  it("detects kinds", () => {
    expect(kindFor("notes.PDF", false)).toBe("PDF");
    expect(kindFor("deck.ppt", false)).toBe("PPTX");
    expect(kindFor("https://vimeo.com/123", true)).toBe("VIDEO");
    expect(kindFor("https://x.org/file.docx", true)).toBe("DOCX");
    expect(kindFor("https://x.org/page", true)).toBe("URL");
    expect(kindFromWord("Power Point")).toBe("PPTX");
    expect(kindFromWord("Audio")).toBe("MP3");
  });
  it("makes readable titles and matches file names loosely", () => {
    expect(titleFromName("BIB208_hermeneutics-week-3 FINAL (2).pdf")).toBe("Hermeneutics Week 3");
    expect(matchFileName("hermeneutics week 3", ["BIB208_x.pdf", "Hermeneutics_week_3.pdf"])?.name).toBe("Hermeneutics_week_3.pdf");
    expect(matchFileName("Hermeneutics_week_3", ["Hermeneutics_week_3.pdf"])?.exact).toBe(false);
    expect(matchFileName("zzz.pdf", ["a.pdf"])).toBeNull();
  });
});

describe("reading any template layout", () => {
  it("maps renamed and reordered columns", () => {
    const d = detectColumns([["Name of file", "Where", "Heading", "Web address"], ["a.pdf", "course", "A", ""]]);
    expect(d.headerRow).toBe(0);
    expect(d.map.file).toBe(0);
    expect(d.map.place).toBe(1);
    expect(d.map.title).toBe(2);
    expect(d.map.url).toBe(3);
  });
  it("reads a Type column of places as the place type", () => {
    const d = detectColumns([["Title", "Type", "Link"], ["A", "course", "https://a.org"], ["B", "lesson", "https://b.org"]]);
    expect(d.map.place).toBe(1);
    expect(d.map.kind).toBeUndefined();
  });
  it("guesses columns when there is no heading row", () => {
    const d = detectColumns([["BIB208", "Week 1 notes", "https://a.org/x"], ["BIB301", "Slides", "https://a.org/y"]]);
    expect(d.headerRow).toBe(-1);
    expect(d.map.url).toBe(2);
    expect(d.map.target).toBe(0);
    expect(d.map.title).toBe(1);
  });
});
