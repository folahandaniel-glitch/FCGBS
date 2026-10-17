import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { listQuestions, questionCategories } from "@/server/services/questions";

export const metadata: Metadata = { title: "Hard Questions", description: "Difficult and disputed questions answered exegetically, genealogically, archaeologically, apostolically, prophetically and theologically." };

const TONES = ["from-royal-500 to-navy-800", "from-emerald-500 to-teal-700", "from-violet-500 to-violet-800", "from-amber-500 to-orange-700", "from-rose-500 to-rose-800", "from-sky-500 to-royal-700"];

export default async function QuestionsHome({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80).trim();
  const c = (sp.c ?? "").slice(0, 60).trim();
  const [items, cats] = await Promise.all([listQuestions({ q: q || undefined, category: c || undefined }), questionCategories()]);
  const groups = [...new Set(items.map((i) => i.category))];
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-violet-900 to-royal-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
        <HelpCircle className="pointer-events-none absolute -bottom-10 right-8 size-56 text-white/10" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Faith with honest answers</p>
          <h1 className="mt-1 max-w-3xl font-display text-3xl font-bold sm:text-5xl">Hard Questions</h1>
          <p className="mt-3 max-w-2xl text-white/90">The questions believers and sceptics really ask — the genealogies of Jesus, why God allows evil, why God does not simply destroy Satan, and many more — answered through the text, the record, the evidence, the apostles, the prophets and the whole of Scripture. Fair to other views; never hiding a difficulty.</p>
          <form className="mt-5 flex max-w-xl gap-2" role="search"><input name="q" defaultValue={q} placeholder="Search a question or a Bible reference" aria-label="Search questions" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-ink shadow-lift" /><button className="rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-lift hover:bg-gold-400">Search</button></form>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          <Link href="/questions" className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!c ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>All</Link>
          {cats.map((x) => <Link key={x.name} href={`/questions?c=${encodeURIComponent(x.name)}`} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${c === x.name ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>{x.name} <span className="opacity-60">{x.count}</span></Link>)}
        </nav>
        {items.length === 0 && <p className="text-muted">No questions found. Try a shorter word.</p>}
        {groups.map((g, gi) => (
          <section key={g} aria-labelledby={`g${gi}`}>
            <h2 id={`g${gi}`} className="mb-3 font-display text-2xl font-bold text-navy-800">{g}</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {items.filter((i) => i.category === g).map((i, n) => (
                <li key={i.id}>
                  <Link href={`/questions/${i.slug}`} className="group flex h-full gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lift">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${TONES[(gi + n) % TONES.length]} text-white`}><HelpCircle className="size-5" aria-hidden /></span>
                    <span className="min-w-0"><span className="block font-extrabold leading-snug text-navy-800 group-hover:text-royal-700">{i.title}</span>{i.summary && <span className="mt-1 line-clamp-3 block text-sm text-ink/75">{i.summary}</span>}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
