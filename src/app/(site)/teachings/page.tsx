import type { Metadata } from "next";
import Link from "next/link";
import { COLOUR } from "@/components/bible/colours";
import { TeachingBanner, TeachingCard, iconFor } from "@/components/teachings/ui";
import { latestTeachings, listTeachings, listTracks } from "@/server/services/teachings";

export const metadata: Metadata = { title: "Teachings — Apostolic, Pastoral, Evangelical, Prophetic, Revival", description: "Free, original, Scripture-based teachings on apostolic, pastoral, evangelical and prophetic ministry, revival and reformation, Kingdom enterprise and foundations of faith. Download as Word, PowerPoint or PDF." };

export default async function TeachingsHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 60).trim();
  const [tracks, found, latest] = await Promise.all([listTracks(), q ? listTeachings({ q, limit: 40 }) : Promise.resolve([]), q ? Promise.resolve([]) : latestTeachings(6)]);
  return (
    <>
      <TeachingBanner eyebrow="Teaching library" title="Teachings that build the Church" colour="royal" icon="book">
        <p>Original, Scripture-centred teachings for pastors, teachers, evangelists, prophets, apostles and every believer — free to read, listen to and download for your church or class.</p>
        <form className="mt-5 flex max-w-xl gap-2" role="search"><input name="q" defaultValue={q} placeholder="Search teachings, e.g. revival, shepherd, giving" aria-label="Search teachings" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-ink shadow-lift" /><button className="rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-lift hover:bg-gold-400">Search</button></form>
      </TeachingBanner>
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {q ? (
          <section aria-live="polite"><h2 className="mb-4 font-display text-2xl font-bold text-navy-800">{found.length} result{found.length === 1 ? "" : "s"} for “{q}”</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{found.map((t) => <li key={t.id}><TeachingCard t={t} /></li>)}</ul>
            {found.length === 0 && <p className="text-muted">Nothing found. Try a shorter word, or browse the tracks below.</p>}
          </section>
        ) : null}
        <section aria-labelledby="tracks">
          <h2 id="tracks" className="mb-4 font-display text-2xl font-bold text-navy-800">Choose a track</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => {
              const c = COLOUR[t.colour] ?? COLOUR.royal;
              const Icon = iconFor(t.icon);
              return (
                <li key={t.id}>
                  <Link href={`/teachings/${t.slug}`} className={`group relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${c.grad} p-6 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
                    <Icon className="absolute -bottom-6 -right-4 size-32 text-white/15 transition group-hover:scale-110" aria-hidden />
                    <Icon className="size-8 text-gold-200" aria-hidden />
                    <h3 className="mt-3 text-xl font-extrabold">{t.title}</h3>
                    {t.tagline && <p className="mt-1 text-sm text-white/90">{t.tagline}</p>}
                    <p className="relative mt-auto pt-4 text-xs font-bold text-gold-200">{t.count} teachings · {Math.round(t.minutes / 60 * 10) / 10 || 0} hrs reading →</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        {latest.length > 0 && (
          <section aria-labelledby="latest">
            <h2 id="latest" className="mb-4 font-display text-2xl font-bold text-navy-800">Start here</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{latest.map((t) => <li key={t.id}><TeachingCard t={t} /></li>)}</ul>
          </section>
        )}
        <section className="grid gap-4 rounded-3xl bg-gradient-to-r from-gold-100 via-white to-royal-50 p-6 ring-1 ring-gold-400/40 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><h2 className="font-display text-xl font-bold text-navy-800">Want to study with accountability and a certificate?</h2><p className="mt-1 text-sm text-ink/80">These teachings complement the school&apos;s Certificate, Diploma and Advanced Diploma programmes.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/programmes" className="rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">See programmes</Link><Link href="/bible" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 ring-1 ring-line hover:bg-royal-50">Open the Bible</Link></div>
        </section>
      </div>
    </>
  );
}
