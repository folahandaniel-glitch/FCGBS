import { PlaceMaterials } from "@/components/teachings/place-materials";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText, FileType2, Presentation } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ListenButton } from "@/components/teachings/listen-button";
import { resolveRef } from "@/server/services/bible";
import { getQuestion, LENSES, listQuestions } from "@/server/services/questions";
import { scriptureList } from "@/server/services/teachings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const q = await getQuestion((await params).slug);
  return { title: q ? q.title : "Question", description: q?.summary?.slice(0, 160) };
}

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  const q = await getQuestion(slug);
  if (!q) notFound();
  const lenses = LENSES.filter((l) => (q[l.key as keyof typeof q] as string | null)?.trim());
  const refs = scriptureList(q.scriptures).map((r) => resolveRef(r)).filter((x): x is NonNullable<ReturnType<typeof resolveRef>> => Boolean(x));
  const related = (await listQuestions({ category: q.category })).filter((x) => x.slug !== q.slug).slice(0, 5);
  const dl = (f: string) => `/api/v1/materials/question/${q.slug}?format=${f}`;
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-violet-900 to-royal-700 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300"><Link href="/questions" className="hover:underline">Hard Questions</Link> › {q.category}</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{q.title}</h1>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6" id="question-body">
          {q.summary && (
            <div className="rounded-3xl bg-gradient-to-br from-gold-50 to-white p-6 shadow-card ring-1 ring-gold-400/40">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">The short answer</p>
              <p className="mt-2 text-lg leading-relaxed text-navy-900">{q.summary}</p>
            </div>
          )}
          <nav aria-label="Lenses" className="no-print flex flex-wrap gap-2">
            {lenses.map((l) => <a key={l.key} href={`#${l.key}`} className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-navy-800 ring-1 ring-line hover:bg-gold-100">{l.label}</a>)}
          </nav>
          {lenses.map((l) => (
            <section key={l.key} id={l.key} className={`scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ${l.ring}`}>
              <header className={`bg-gradient-to-r ${l.head} px-6 py-3 text-white`}><h2 className="text-lg font-extrabold">{l.label}</h2><p className="text-xs text-white/80">{l.sub}</p></header>
              <div className="p-6 sm:p-8"><Markdown source={q[l.key as keyof typeof q] as string} /></div>
            </section>
          ))}
          {refs.length > 0 && (
            <section aria-label="Scriptures" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line">
              <h2 className="mb-3 font-display text-xl font-bold text-navy-800">Scriptures to open</h2>
              <div className="space-y-2">{refs.map((r) => (
                <details key={r.label} className="rounded-2xl bg-surface p-3"><summary className="cursor-pointer font-bold text-royal-700">{r.label}</summary><p className="mt-2 font-serif leading-relaxed">{r.verses.slice(0, 20).map((v) => <span key={v.v}>{r.verses.length > 1 && <sup className="mr-1 font-sans text-[0.65rem] font-bold text-royal-600">{v.v}</sup>}{v.text} </span>)}</p><Link href={r.href} className="mt-1 inline-block text-xs font-bold text-royal-700 underline">Open in the Bible reader</Link></details>
              ))}</div>
            </section>
          )}
          {q.readings && <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line"><h2 className="mb-2 font-display text-xl font-bold text-navy-800">Further reading</h2><ul className="list-disc space-y-1 pl-5 text-sm">{q.readings.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></section>}
          <PlaceMaterials place={`question:${q.slug}`} />
        </div>
        <aside className="no-print space-y-5">
          <ListenButton targetId="question-body" title={q.title} />
          <div className="rounded-3xl bg-gradient-to-br from-navy-800 to-royal-700 p-5 text-white shadow-card">
            <h2 className="flex items-center gap-2 font-extrabold"><Download className="size-5 text-gold-300" aria-hidden /> Download</h2>
            <ul className="mt-3 grid gap-2 text-sm font-bold">
              <li><a href={dl("pptx")} className="flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 hover:bg-orange-400"><Presentation className="size-4" aria-hidden /> PowerPoint</a></li>
              <li><a href={dl("docx")} className="flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2.5 hover:bg-sky-400"><FileType2 className="size-4" aria-hidden /> Word</a></li>
              <li><a href={dl("pdf")} className="flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2.5 hover:bg-rose-400"><FileText className="size-4" aria-hidden /> PDF</a></li>
            </ul>
          </div>
          {related.length > 0 && <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line"><h2 className="font-extrabold text-navy-800">More in {q.category}</h2><ul className="mt-2 space-y-1.5 text-sm">{related.map((x) => <li key={x.id}><Link href={`/questions/${x.slug}`} className="text-royal-700 hover:underline">{x.title}</Link></li>)}</ul></div>}
          <Link href="/bible/timeline" className="block rounded-3xl bg-gradient-to-br from-gold-500 to-amber-700 p-5 text-white shadow-card hover:shadow-lift"><p className="font-extrabold">Bible timeline</p><p className="mt-1 text-sm text-white/90">See where this question sits in the story from Genesis to Revelation.</p></Link>
        </aside>
      </div>
    </>
  );
}
