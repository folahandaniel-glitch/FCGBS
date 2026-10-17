import { describe, expect, it } from "vitest";
import fs from "node:fs";
import zlib from "node:zlib";
import { parseRef } from "@/core/bible";
import { TEACHINGS, TRACKS } from "@/content/teachings";
import { COURSE_TEACHINGS } from "@/content/course-teachings";
import { MORE_LESSONS } from "@/content/lessons-more";
import { ALL_COURSES } from "@/content/programmes";
import { ELECTIVE_ADDITIONS, NEW_PROGRAMMES } from "@/content/programmes-more";
import { MATERIALS } from "@/content/materials";
import { BIBLE_TOPICS } from "@/content/bible-topics";
import { BIBLE_LANGUAGES } from "@/content/bible-languages";
import { BIBLE_TIMELINE } from "@/content/bible-timeline";
import { QUESTIONS_SEED } from "@/content/questions";

const bsb: string[][][] = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/bible/bsb.json.gz")).toString());
const strongs = JSON.parse(zlib.gunzipSync(fs.readFileSync("data/bible/strongs.json.gz")).toString());
const validRef = (r: string) => {
  const p = parseRef(r.replace(/–/g, "-"));
  const ch = p && bsb[p.book]?.[p.chapter - 1];
  return Boolean(ch && (!p!.v1 || p!.v1 <= ch.length) && (!p!.v2 || p!.v2 <= ch.length));
};
const courseCodes = new Set(ALL_COURSES.map((c) => c.code));

describe("seed content integrity", () => {
  it("has unique, well-formed teachings in known tracks", () => {
    const slugs = TEACHINGS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const tracks = new Set(TRACKS.map((t) => t.slug));
    for (const t of TEACHINGS) { expect(tracks.has(t.track), t.slug).toBe(true); expect(t.body.length, t.slug).toBeGreaterThan(1500); }
  });
  it("lists only real Scripture references", () => {
    for (const t of TEACHINGS) for (const r of t.scriptures) expect(validRef(r), `${t.slug}: ${r}`).toBe(true);
    for (const t of BIBLE_TOPICS) for (const r of t.refs) expect(validRef(r.ref), `${t.slug}: ${r.ref}`).toBe(true);
    for (const w of BIBLE_LANGUAGES.studies) { expect(strongs[w.id], w.id).toBeTruthy(); for (const r of w.refs) expect(validRef(r), `${w.id}: ${r}`).toBe(true); }
  });
  it("uses only real Strong's numbers in exegesis studies", () => {
    for (const t of TEACHINGS.filter((x) => x.track === "exegesis")) for (const m of t.body.matchAll(/([HG]d{1,4})/g)) expect(strongs[m[1]], `${t.slug}: ${m[1]}`).toBeTruthy();
  });
  it("has unique hard questions and a timeline with real references", () => {
    const slugs = QUESTIONS_SEED.map((q) => q.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const q of QUESTIONS_SEED) { expect(q.exegetical?.length ?? 0, q.slug).toBeGreaterThan(800); for (const r of q.scriptures) expect(validRef(r), `${q.slug}: ${r}`).toBe(true); }
    const eras = new Set(BIBLE_TIMELINE.eras.map((e) => e.key));
    const ids = BIBLE_TIMELINE.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of BIBLE_TIMELINE.items) { expect(eras.has(i.era), i.id).toBe(true); for (const r of i.refs) expect(validRef(r), `${i.id}: ${r}`).toBe(true); }
  });
  it("maps courses, lessons, programmes and materials to things that exist", () => {
    const teachings = new Set(TEACHINGS.map((t) => t.slug));
    for (const [code, slugs] of Object.entries(COURSE_TEACHINGS)) { expect(courseCodes.has(code), code).toBe(true); for (const s of slugs) expect(teachings.has(s), `${code}: ${s}`).toBe(true); }
    for (const l of MORE_LESSONS) expect(courseCodes.has(l.course), l.title).toBe(true);
    for (const p of NEW_PROGRAMMES) for (const c of [...p.core, ...p.electives]) expect(courseCodes.has(c), `${p.code}: ${c}`).toBe(true);
    for (const [, codes] of Object.entries(ELECTIVE_ADDITIONS)) for (const c of codes) expect(courseCodes.has(c), c).toBe(true);
    for (const m of MATERIALS) { for (const c of m.course ?? []) expect(courseCodes.has(c), `${m.title}: ${c}`).toBe(true); for (const t of m.teaching ?? []) expect(teachings.has(t), t).toBe(true); expect(m.url.startsWith("https://") || m.url.startsWith("/")).toBe(true); }
    expect(new Set(ALL_COURSES.map((c) => c.code)).size).toBe(ALL_COURSES.length);
  });
});
