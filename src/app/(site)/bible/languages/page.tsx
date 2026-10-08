import type { Metadata } from "next";
import Link from "next/link";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { getContent } from "@/server/services/content";
import { resolveRef, strongsEntry } from "@/server/services/bible";

export const metadata: Metadata = { title: "Learn Biblical Hebrew & Greek", description: "Hebrew and Greek alphabets, pronunciation and word studies for ministers, with links to the lexicon and the verses." };

const FOCUS: Record<string, { label: string; chip: string }> = {
  ALL: { label: "All", chip: "bg-navy-800 text-white" },
  APOSTOLIC: { label: "Apostolic", chip: "bg-royal-600 text-white" },
  PASTORAL: { label: "Pastoral", chip: "bg-teal-600 text-white" },
  EVANGELICAL: { label: "Evangelical", chip: "bg-emerald-600 text-white" },
  PROPHETIC: { label: "Prophetic", chip: "bg-violet-600 text-white" },
  REVIVAL: { label: "Revival", chip: "bg-rose-600 text-white" },
  FOUNDATION: { label: "Foundations", chip: "bg-amber-600 text-white" },
};
const CARD: Record<string, string> = { APOSTOLIC: "border-royal-500", PASTORAL: "border-teal-500", EVANGELICAL: "border-emerald-500", PROPHETIC: "border-violet-500", REVIVAL: "border-rose-500", FOUNDATION: "border-amber-500" };

export default async function LanguagesPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const focus = ((await searchParams).focus ?? "ALL").toUpperCase();
  const c = await getContent("bibleLanguages");
  const studies = c.studies.filter((s) => focus === "ALL" || s.focus === focus);
  return (
    <>
      <BibleBanner eyebrow="Original languages" title="Learn Biblical Hebrew & Greek" tone="rose"><p>{c.intro}</p></BibleBanner>
      <BibleTabs active="/bible/languages" />
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6">
        <section aria-labelledby="method">
          <h2 id="method" className="mb-3 font-display text-2xl font-bold text-navy-800">How to study a word</h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {c.method.map((m, i) => <li key={i} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-400 text-sm font-extrabold text-navy-900">{i + 1}</span><span className="text-sm">{m}</span></li>)}
          </ol>
        </section>

        <section aria-labelledby="heb">
          <h2 id="heb" className="mb-1 font-display text-2xl font-bold text-navy-800">The Hebrew alphabet <span className="text-base font-normal text-muted">(read right to left)</span></h2>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ink/85">{c.hebrewNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          <div dir="rtl" className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {c.hebrew.map((l) => (
              <div key={l.name} dir="ltr" className="rounded-2xl bg-gradient-to-b from-amber-50 to-white p-3 text-center shadow-card ring-1 ring-amber-200">
                <p lang="he" className="heb text-4xl text-navy-800">{l.ch}</p>
                <p className="text-sm font-bold text-amber-800">{l.name}</p>
                <p className="text-xs text-muted">{l.sound}</p>
                <p className="mt-0.5 text-[0.7rem] font-semibold text-gold-600">= {l.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="grk">
          <h2 id="grk" className="mb-1 font-display text-2xl font-bold text-navy-800">The Greek alphabet</h2>
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ink/85">{c.greekNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {c.greek.map((l) => (
              <div key={l.name} className="rounded-2xl bg-gradient-to-b from-violet-50 to-white p-3 text-center shadow-card ring-1 ring-violet-200">
                <p lang="el" className="grk text-3xl text-navy-800">{l.ch}</p>
                <p className="text-sm font-bold text-violet-800">{l.name}</p>
                <p className="text-xs text-muted">{l.sound}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="words">
          <h2 id="words" className="mb-3 font-display text-2xl font-bold text-navy-800">Word studies for ministers</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(FOCUS).map(([k, v]) => <Link key={k} href={k === "ALL" ? "/bible/languages#words" : `/bible/languages?focus=${k}#words`} scroll={false} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${focus === k ? v.chip : "bg-white text-navy-800 ring-1 ring-line"}`}>{v.label}</Link>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {studies.map((s) => {
              const e = strongsEntry(s.id);
              if (!e) return null;
              const heb = s.id[0] === "H";
              return (
                <article key={s.id} className={`rounded-3xl border-l-8 bg-white p-5 shadow-card ring-1 ring-line ${CARD[s.focus] ?? "border-royal-500"}`}>
                  <div className="flex items-baseline gap-3">
                    <span lang={heb ? "he" : "el"} dir={heb ? "rtl" : "ltr"} className={`text-3xl text-navy-800 ${heb ? "heb" : "grk"}`}>{e.l}</span>
                    <span className="font-bold text-royal-700">{e.x}</span>
                    <Link href={`/bible/strongs/${s.id}`} className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 hover:bg-violet-200">{s.id}</Link>
                  </div>
                  <p className="mt-1 text-xs text-muted">{e.s}</p>
                  <p className="mt-3 text-sm leading-relaxed">{s.note}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5">{s.refs.map((r) => { const p = resolveRef(r); return p ? <Link key={r} href={p.href} className="rounded-full bg-royal-50 px-2.5 py-1 text-xs font-semibold text-royal-700 hover:bg-gold-100">{p.label}</Link> : null; })}</p>
                </article>
              );
            })}
          </div>
        </section>

        <p className="rounded-2xl bg-gold-50 p-4 text-sm ring-1 ring-gold-400/40">Want structured learning? See the <Link href="/courses" className="font-bold text-royal-700 underline">Biblical Hebrew and Koine Greek courses</Link> in the Biblical Languages department.</p>
      </div>
    </>
  );
}
