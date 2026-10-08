import type { Metadata } from "next";
import Link from "next/link";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { searchStrongs, strongsEntry } from "@/server/services/bible";

export const metadata: Metadata = { title: "Hebrew & Greek Lexicon (Strong's)", description: "Search Strong's Hebrew and Greek dictionary by number, original word, transliteration or English meaning." };

const FEATURED: [string, string][] = [["G26", "agape · love"], ["G3056", "logos · word"], ["G4151", "pneuma · spirit"], ["G1577", "ekklesia · church"], ["G5485", "charis · grace"], ["G4102", "pistis · faith"], ["G1411", "dunamis · power"], ["G2222", "zoe · life"], ["H7965", "shalom · peace"], ["H2617", "hesed · mercy"], ["H7307", "ruach · spirit"], ["H3519", "kabod · glory"], ["H430", "Elohim · God"], ["H3068", "YHWH · the LORD"], ["H6944", "qodesh · holy"], ["H539", "aman · believe"]];

export default async function StrongsHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 60).trim();
  const results = q ? searchStrongs(q, 50) : [];
  return (
    <>
      <BibleBanner eyebrow="Original languages" title="Hebrew & Greek Lexicon" tone="violet">
        <form action="/bible/strongs" className="mt-3 flex max-w-xl gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="G26, H7965, agape, shalom, or an English word" aria-label="Search the lexicon" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-ink shadow-lift" />
          <button className="rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-lift hover:bg-gold-400">Search</button>
        </form>
        <p className="mt-2 text-xs text-white/70">Strong&apos;s Exhaustive Concordance numbers: H = Hebrew &amp; Aramaic (Old Testament), G = Greek (New Testament).</p>
      </BibleBanner>
      <BibleTabs active="/bible/strongs" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {q && (
          <section aria-live="polite">
            <p className="mb-3 text-sm text-muted">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((e) => (
                <li key={e.id}>
                  <Link href={`/bible/strongs/${e.id}`} className="block h-full rounded-2xl bg-white p-4 shadow-card ring-1 ring-line hover:ring-royal-500">
                    <div className="flex items-baseline gap-3"><span lang={e.id[0] === "H" ? "he" : "el"} dir={e.id[0] === "H" ? "rtl" : "ltr"} className="font-serif text-2xl text-navy-800">{e.l}</span><span className="font-semibold text-royal-700">{e.x}</span><span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{e.id}</span></div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/80">{e.s || e.k}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-navy-800">Words every minister should know</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEATURED.map(([id, label], i) => {
              const e = strongsEntry(id);
              const tones = ["from-violet-500 to-violet-700", "from-royal-500 to-royal-700", "from-emerald-500 to-teal-700", "from-rose-500 to-rose-700"];
              return e && (
                <Link key={id} href={`/bible/strongs/${id}`} className={`rounded-2xl bg-gradient-to-br ${tones[i % 4]} p-4 text-white shadow-card hover:-translate-y-0.5 hover:shadow-lift`}>
                  <p lang={id[0] === "H" ? "he" : "el"} dir={id[0] === "H" ? "rtl" : "ltr"} className="text-center font-serif text-3xl">{e.l}</p>
                  <p className="mt-2 text-center text-xs font-bold text-gold-200">{label}</p>
                  <p className="text-center text-[0.7rem] text-white/75">{id}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
