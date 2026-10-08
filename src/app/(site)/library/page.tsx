import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { inputClass } from "@/components/ui/primitives";
import { getContent } from "@/server/services/content";
import { listLibrary } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Digital Library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [c, items] = await Promise.all([getContent("library"), listLibrary({ q: q?.slice(0, 60), publicOnly: true })]);
  const groups = [...new Set(items.map((i) => i.category))];
  return (
    <>
      <Hero eyebrow="Resources" title={c.title}>{c.intro}</Hero>
      <Section tone="white">
        <form role="search" className="mb-6 flex max-w-xl gap-3"><input name="q" defaultValue={q} placeholder="Search the library…" aria-label="Search the library" className={inputClass} /><button className="h-11 rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white">Search</button></form>
        {items.length === 0 ? <p className="text-muted">No public resources are listed yet. Enrolled students can sign in to access the full library.</p> : groups.map((g) => (
          <div key={g} className="mb-6"><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold-600">{g}</h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">{items.filter((i) => i.category === g).map((i) => <li key={i.id} className="rounded-xl bg-surface p-3 ring-1 ring-line">{i.externalUrl ? <a className="font-medium text-royal-700 hover:underline" href={i.externalUrl} rel="noopener noreferrer" target="_blank">{i.title}</a> : <span className="font-medium">{i.title}</span>}{i.author && <span className="text-muted"> — {i.author}</span>}</li>)}</ul></div>
        ))}
      </Section>
    </>
  );
}
