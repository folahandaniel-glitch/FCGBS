import { PlaceMaterials } from "@/components/teachings/place-materials";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { COLOUR } from "@/components/bible/colours";
import { getContent } from "@/server/services/content";
import { resolveRef } from "@/server/services/bible";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const t = (await getContent("bibleTopics")).items.find((x) => x.slug === slug);
  return { title: t ? `${t.title} — Bible topic` : "Bible topic", description: t?.intro.slice(0, 160) };
}

export default async function TopicPage({ params }: Props) {
  const slug = (await params).slug;
  const c = await getContent("bibleTopics");
  const t = c.items.find((x) => x.slug === slug);
  if (!t) notFound();
  const col = COLOUR[t.colour] ?? COLOUR.royal;
  const others = c.items.filter((x) => x.slug !== slug).slice(0, 6);
  return (
    <>
      <BibleBanner eyebrow="Bible topic" title={t.title} tone={col.banner}><p>{t.intro}</p></BibleBanner>
      <BibleTabs active="/bible/topics" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        {t.refs.map((r) => {
          const p = resolveRef(r.ref);
          return (
            <article key={r.ref} className={`rounded-3xl bg-white p-5 shadow-card ring-1 ${col.ring}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={`font-extrabold ${col.text}`}>{p ? <Link href={p.href} className="hover:underline">{p.label}</Link> : r.ref}</h2>
                <span className="text-xs font-semibold text-muted">{r.note}</span>
              </div>
              {p && <p className="mt-2 font-serif leading-relaxed text-ink/90">{p.verses.slice(0, 14).map((v) => <span key={v.v}>{p.verses.length > 1 && <sup className="mr-1 font-sans text-[0.65rem] font-bold text-royal-600">{v.v}</sup>}{v.text} </span>)}{p.verses.length > 14 && <Link className="font-sans text-xs font-bold text-royal-700 underline" href={p.href}>read on…</Link>}</p>}
            </article>
          );
        })}
        <PlaceMaterials place={`topic:${t.slug}`} />
        <div className="pt-4"><h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold-600">More topics</h2><div className="flex flex-wrap gap-2">{others.map((o) => <Link key={o.slug} href={`/bible/topics/${o.slug}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 ring-1 ring-line hover:bg-gold-100">{o.title}</Link>)}<Link href="/bible/topics" className="rounded-full bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white">All topics</Link></div></div>
        <p className="text-xs text-muted">Scripture text: King James Version (public domain). Introductions are original to FCGBS.</p>
      </div>
    </>
  );
}
