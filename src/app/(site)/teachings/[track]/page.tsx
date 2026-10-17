import { PlaceMaterials } from "@/components/teachings/place-materials";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeachingBanner, TeachingCard, LEVELS } from "@/components/teachings/ui";
import { getTrack, listTeachings, listTracks } from "@/server/services/teachings";

type Props = { params: Promise<{ track: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTrack((await params).track);
  return { title: t ? `${t.title} — Teachings` : "Teachings", description: t?.tagline ?? undefined };
}

export default async function TrackPage({ params, searchParams }: Props) {
  const [{ track }, sp] = await Promise.all([params, searchParams]);
  const t = await getTrack(track);
  if (!t) notFound();
  const q = (sp.q ?? "").slice(0, 60).trim();
  const [items, tracks] = await Promise.all([listTeachings({ trackId: t.id, q: q || undefined }), listTracks()]);
  const levels = Object.keys(LEVELS).filter((l) => items.some((i) => i.level === l));
  return (
    <>
      <TeachingBanner eyebrow={`${items.length} teachings`} title={t.title} colour={t.colour} icon={t.icon}>
        {t.tagline && <p className="font-semibold text-gold-100">{t.tagline}</p>}
        {t.description && <p className="mt-2 text-sm">{t.description}</p>}
        <form className="mt-5 flex max-w-md gap-2" role="search"><input name="q" defaultValue={q} placeholder={`Search ${t.title}`} aria-label="Search this track" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-2.5 text-ink shadow-lift" /><button className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-900 hover:bg-gold-400">Search</button></form>
      </TeachingBanner>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        {items.length === 0 && <p className="text-muted">No teachings found.</p>}
        {levels.map((l) => (
          <section key={l}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-navy-800"><span className={`rounded-full px-3 py-1 text-xs font-bold ${LEVELS[l].cls}`}>{LEVELS[l].label}</span></h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.filter((i) => i.level === l).map((i) => <li key={i.id}><TeachingCard t={i} /></li>)}</ul>
          </section>
        ))}
        <PlaceMaterials place={`track:${t.slug}`} />
        <nav aria-label="Other tracks" className="flex flex-wrap gap-2 border-t border-line pt-6">
          {tracks.filter((x) => x.slug !== t.slug).map((x) => <Link key={x.id} href={`/teachings/${x.slug}`} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-navy-800 ring-1 ring-line hover:bg-gold-100">{x.title}</Link>)}
          <Link href="/teachings" className="rounded-full bg-navy-800 px-3.5 py-1.5 text-sm font-semibold text-white">All teachings</Link>
        </nav>
      </div>
    </>
  );
}
