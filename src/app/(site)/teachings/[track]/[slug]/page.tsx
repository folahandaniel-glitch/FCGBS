import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText, FileType2, Presentation, FileDown } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { COLOUR } from "@/components/bible/colours";
import { ListenButton } from "@/components/teachings/listen-button";
import { MaterialList } from "@/components/teachings/materials";
import { LEVELS, TeachingBanner } from "@/components/teachings/ui";
import { getSession } from "@/server/http";
import { resolveRef } from "@/server/services/bible";
import { getTeaching, listTeachings, materialsFor, scriptureList } from "@/server/services/teachings";

type Props = { params: Promise<{ track: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track, slug } = await params;
  const t = await getTeaching(track, slug);
  return { title: t ? `${t.title} — ${t.trackTitle}` : "Teaching", description: t?.summary ?? undefined };
}

export default async function TeachingPage({ params }: Props) {
  const { track, slug } = await params;
  const t = await getTeaching(track, slug);
  if (!t) notFound();
  const sess = await getSession();
  const signedIn = Boolean(sess && !sess.mfaPending && sess.user.userType !== "APPLICANT");
  const locked = t.audience !== "PUBLIC" && !signedIn;
  const c = COLOUR[t.colour] ?? COLOUR.royal;
  const siblings = await listTeachings({ trackId: t.trackId });
  const i = siblings.findIndex((x) => x.id === t.id);
  const prev = siblings[i - 1], next = siblings[i + 1];
  const mats = locked ? [] : await materialsFor({ teachingId: t.id }, signedIn);
  const refs = scriptureList(t.scriptures).map((r) => resolveRef(r)).filter((x): x is NonNullable<ReturnType<typeof resolveRef>> => Boolean(x));
  const lv = LEVELS[t.level] ?? LEVELS.FOUNDATION;
  const dl = (f: string) => `/api/v1/materials/teaching/${t.slug}?format=${f}`;
  const audioSrc = t.audioAssetId ? `/api/v1/assets/${t.audioAssetId}` : t.audioUrl;
  const frame = t.videoUrl && /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//.test(t.videoUrl) ? t.videoUrl : null;
  return (
    <>
      <TeachingBanner eyebrow={`${t.trackTitle} · ${lv.label} · ${t.minutes} min`} title={t.title} colour={t.colour}>{t.summary && <p>{t.summary}</p>}</TeachingBanner>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href="/teachings" className="hover:underline">Teachings</Link> › <Link href={`/teachings/${t.trackSlug}`} className="hover:underline">{t.trackTitle}</Link></nav>
          {locked ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-line"><p className="font-display text-xl font-bold text-navy-800">This teaching is for FCGBS students.</p><p className="mt-2 text-sm text-muted">Sign in with your student account to read it.</p><Link href={`/login?next=/teachings/${t.trackSlug}/${t.slug}`} className="mt-4 inline-block rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white">Sign in</Link></div>
          ) : (
            <>
              {frame && <div className="aspect-video max-w-3xl overflow-hidden rounded-2xl shadow-card"><iframe src={frame} title="Teaching video" loading="lazy" allow="encrypted-media" className="size-full" /></div>}
              {audioSrc && /^(\/api\/|https:\/\/)/.test(audioSrc) && <audio controls preload="none" src={audioSrc} className="w-full max-w-xl" aria-label="Teaching audio" />}
              <div className="flex flex-wrap items-center gap-3 no-print"><ListenButton targetId="teaching-body" title={t.title} /></div>
              <article id="teaching-body" className={`rounded-3xl bg-white p-6 shadow-card ring-1 ${c.ring} sm:p-10`}><Markdown source={t.body ?? ""} /></article>
              {refs.length > 0 && (
                <section aria-label="Scriptures in this teaching">
                  <h2 className="mb-3 font-display text-xl font-bold text-navy-800">Scriptures to open</h2>
                  <div className="space-y-2">
                    {refs.map((r) => (
                      <details key={r.label} className={`group rounded-2xl bg-white p-4 shadow-card ring-1 ${c.ring}`}>
                        <summary className={`cursor-pointer font-bold ${c.text}`}>{r.label}</summary>
                        <p className="mt-2 font-serif leading-relaxed">{r.verses.slice(0, 20).map((v) => <span key={v.v}>{r.verses.length > 1 && <sup className="mr-1 font-sans text-[0.65rem] font-bold text-royal-600">{v.v}</sup>}{v.text} </span>)}</p>
                        <Link href={r.href} className="mt-2 inline-block text-xs font-bold text-royal-700 underline">Open in the Bible reader (with Hebrew/Greek)</Link>
                      </details>
                    ))}
                  </div>
                </section>
              )}
              <MaterialList items={mats} title="Attached materials" />
            </>
          )}
          <div className="flex justify-between gap-4 border-t border-line pt-5 text-sm font-semibold">
            {prev ? <Link href={`/teachings/${prev.trackSlug}/${prev.slug}`} className="max-w-[45%] text-royal-700 hover:underline">← {prev.title}</Link> : <span />}
            {next && <Link href={`/teachings/${next.trackSlug}/${next.slug}`} className="max-w-[45%] text-right text-royal-700 hover:underline">{next.title} →</Link>}
          </div>
        </div>

        <aside className="space-y-5 no-print">
          {!locked && (
            <div className="rounded-3xl bg-gradient-to-br from-navy-800 to-royal-700 p-5 text-white shadow-card">
              <h2 className="flex items-center gap-2 font-extrabold"><Download className="size-5 text-gold-300" aria-hidden /> Download &amp; teach</h2>
              <p className="mt-1 text-xs text-white/80">Use in your church, class or cell group. Please keep the school&apos;s name on it.</p>
              <ul className="mt-3 grid gap-2 text-sm font-bold">
                <li><a href={dl("pptx")} className="flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 hover:bg-orange-400"><Presentation className="size-4" aria-hidden /> PowerPoint slides (.pptx)</a></li>
                <li><a href={dl("docx")} className="flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2.5 hover:bg-sky-400"><FileType2 className="size-4" aria-hidden /> Word document (.docx)</a></li>
                <li><a href={dl("pdf")} className="flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2.5 hover:bg-rose-400"><FileText className="size-4" aria-hidden /> PDF handout</a></li>
                <li><a href={dl("txt")} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 hover:bg-white/25"><FileDown className="size-4" aria-hidden /> Plain text (low data)</a></li>
              </ul>
            </div>
          )}
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
            <h2 className="font-extrabold text-navy-800">More in {t.trackTitle}</h2>
            <ul className="mt-2 space-y-1.5 text-sm">{siblings.filter((x) => x.id !== t.id).slice(0, 6).map((x) => <li key={x.id}><Link href={`/teachings/${x.trackSlug}/${x.slug}`} className="text-royal-700 hover:underline">{x.title}</Link></li>)}</ul>
            <Link href={`/teachings/${t.trackSlug}`} className="mt-3 inline-block text-xs font-bold text-royal-700 underline">See all</Link>
          </div>
          <Link href="/bible" className="block rounded-3xl bg-gradient-to-br from-gold-500 to-amber-700 p-5 text-white shadow-card hover:shadow-lift"><p className="font-extrabold">Open the Bible study tools</p><p className="mt-1 text-sm text-white/90">Strong's Hebrew and Greek, concordance, topics and reading plans.</p></Link>
        </aside>
      </div>
    </>
  );
}
