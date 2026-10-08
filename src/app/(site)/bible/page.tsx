import type { Metadata } from "next";
import Link from "next/link";
import { BOOKS } from "@/core/bible";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { verseOfTheDay } from "@/server/services/bible";

export const metadata: Metadata = { title: "Bible, Concordance, Hebrew & Greek", description: "Read the Bible free in the KJV, BSB, ASV, Hebrew and Greek. Tap any KJV word to see its Strong's Hebrew or Greek source, search the concordance and study by topic." };

const TOOLS = [
  { href: "/bible/search", t: "Concordance", d: "Find every verse that uses a word or phrase, with counts by book.", c: "from-sky-500 to-royal-700" },
  { href: "/bible/strongs", t: "Hebrew & Greek lexicon", d: "14,000+ Strong's entries: original word, sound, meaning and every verse.", c: "from-violet-500 to-violet-800" },
  { href: "/bible/topics", t: "Topical study", d: "Verses gathered by theme: faith, prayer, the Spirit, revival, stewardship.", c: "from-emerald-500 to-teal-700" },
  { href: "/bible/plans", t: "Reading plans", d: "Walk through Scripture in 30, 90 or 365 days. Progress stays on your device.", c: "from-amber-500 to-orange-600" },
  { href: "/bible/languages", t: "Learn Hebrew & Greek", d: "Alphabets, sounds and word studies written for ministers.", c: "from-rose-500 to-rose-800" },
  { href: "/bible/notes", t: "My notes & highlights", d: "Private notes, colour highlights and bookmarks (sign in).", c: "from-navy-700 to-navy-900" },
];

export default function BibleHome() {
  const v = verseOfTheDay();
  const book = BOOKS[v.book];
  const groups = [...new Set(BOOKS.map((b) => b.group))];
  return (
    <>
      <BibleBanner eyebrow="Study the Word" title="Bible, Concordance & Original Languages">
        <form action="/bible/go" className="mt-4 flex max-w-xl gap-2" role="search">
          <input name="q" placeholder="John 3:16, Psalm 23, or a word such as “grace”" aria-label="Find a passage or word" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-ink shadow-lift" />
          <button className="rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-lift hover:bg-gold-400">Go</button>
        </form>
      </BibleBanner>
      <BibleTabs active="/bible" />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        <Link href={`/bible/${book.slug}/${v.chapter}?v=${v.v}#v${v.v}`} className="block rounded-3xl bg-gradient-to-r from-gold-100 via-white to-royal-50 p-6 shadow-card ring-1 ring-gold-400/40 hover:shadow-lift">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">Verse of the day</p>
          <p className="mt-2 font-serif text-xl leading-relaxed text-navy-900 sm:text-2xl">“{v.text}”</p>
          <p className="mt-2 text-sm font-bold text-royal-700">{v.label} (KJV)</p>
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((x) => (
            <Link key={x.href} href={x.href} className={`group rounded-3xl bg-gradient-to-br ${x.c} p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
              <h2 className="text-lg font-extrabold">{x.t}</h2>
              <p className="mt-1 text-sm text-white/85">{x.d}</p>
              <span className="mt-3 inline-block text-xs font-bold text-gold-300 group-hover:underline">Open →</span>
            </Link>
          ))}
        </div>

        {[true, false].map((ot) => (
          <section key={String(ot)}>
            <h2 className="mb-4 font-display text-2xl font-bold text-navy-800">{ot ? "Old Testament" : "New Testament"}</h2>
            {groups.filter((g) => BOOKS.some((b) => b.group === g && b.ot === ot)).map((g) => (
              <div key={g} className="mb-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-600">{g}</h3>
                <div className="flex flex-wrap gap-2">
                  {BOOKS.filter((b) => b.group === g).map((b) => <Link key={b.slug} href={`/bible/${b.slug}`} prefetch={false} className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-line hover:bg-gold-400 hover:text-navy-900 ${ot ? "bg-royal-50 text-royal-700" : "bg-emerald-50 text-emerald-800"}`}>{b.name}</Link>)}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
