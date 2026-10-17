import type { Metadata } from "next";
import Link from "next/link";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { COLOUR } from "@/components/bible/colours";
import { getContent } from "@/server/services/content";
import { resolveRef } from "@/server/services/bible";
import { getSession } from "@/server/http";
import { MaterialList } from "@/components/teachings/materials";
import { materialsByPrefix } from "@/server/services/attachments";

export const metadata: Metadata = { title: "Bible Timeline", description: "A Genesis-to-Revelation timeline with theological explanation and graded archaeological evidence." };

const LEVEL: Record<string, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-emerald-100 text-emerald-800" },
  moderate: { label: "Moderate", cls: "bg-sky-100 text-sky-800" },
  debated: { label: "Debated", cls: "bg-amber-100 text-amber-800" },
  none: { label: "Faith / text only", cls: "bg-slate-100 text-slate-700" },
};

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ era?: string }> }) {
  const { era } = await searchParams;
  const c = await getContent("bibleTimeline");
  const eras = new Map(c.eras.map((e) => [e.key, e]));
  const sess = await getSession();
  const files = await materialsByPrefix("timeline:", Boolean(sess && !sess.mfaPending && sess.user.userType !== "APPLICANT"));
  const items = era ? c.items.filter((i) => i.era === era) : c.items;
  return (
    <>
      <BibleBanner eyebrow="Genesis to Revelation" title="Bible Timeline" tone="amber"><p>{c.intro}</p></BibleBanner>
      <BibleTabs active="/bible/timeline" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav aria-label="Eras" className="mb-8 flex flex-wrap gap-2">
          <Link href="/bible/timeline" className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-line ${!era ? "bg-navy-800 text-white" : "bg-white text-navy-800 hover:bg-gold-100"}`}>All eras</Link>
          {c.eras.map((e) => <Link key={e.key} href={`/bible/timeline?era=${e.key}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ring-line ${era === e.key ? "bg-navy-800 text-white" : "bg-white text-navy-800 hover:bg-gold-100"}`}>{e.label}</Link>)}
        </nav>
        <ol className="relative space-y-6 border-l-4 border-gold-300 pl-6 sm:pl-8">
          {items.map((it) => {
            const col = COLOUR[eras.get(it.era)?.colour ?? "royal"] ?? COLOUR.royal;
            return (
              <li key={it.id} id={it.id} className="relative scroll-mt-24">
                <span className={`absolute -left-[2.15rem] top-5 size-5 rounded-full ring-4 ring-white sm:-left-[2.65rem] ${col.dot}`} aria-hidden />
                <article className={`overflow-hidden rounded-3xl bg-white shadow-card ring-1 ${col.ring}`}>
                  <header className={`bg-gradient-to-r ${col.grad} px-5 py-3 text-white`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/80">{eras.get(it.era)?.label} · {it.date}</p>
                    <h2 className="text-lg font-extrabold sm:text-xl">{it.title}</h2>
                  </header>
                  <div className="space-y-4 p-5 text-sm leading-relaxed sm:text-base">
                    <p>{it.summary}</p>
                    <p className={`rounded-2xl ${col.soft} p-3`}><b className={col.text}>Theological meaning. </b>{it.theology}</p>
                    <p className="text-xs text-muted"><b>Books:</b> {it.books}{it.figures && <> · <b>People:</b> {it.figures}</>}</p>
                    {it.evidence.length > 0 && (
                      <details className="rounded-2xl bg-surface p-3" open={it.evidence.some((e) => e.level === "strong")}>
                        <summary className="cursor-pointer font-bold text-navy-800">Archaeology &amp; history ({it.evidence.length})</summary>
                        <ul className="mt-2 space-y-2">
                          {it.evidence.map((e) => (
                            <li key={e.item} className="text-sm"><span className={`mr-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase ${LEVEL[e.level]?.cls}`}>{LEVEL[e.level]?.label}</span><b>{e.item}.</b> {e.note}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <MaterialList items={files.filter((m) => m.place === `timeline:${it.id}`)} title="Files & links" />
                    <div className="flex flex-wrap gap-2">
                      {it.refs.map((r) => { const p = resolveRef(r); return p ? <Link key={r} href={p.href} className="rounded-full bg-royal-50 px-3 py-1 text-xs font-bold text-royal-700 hover:bg-royal-100">{p.label}</Link> : <span key={r} className="rounded-full bg-surface px-3 py-1 text-xs">{r}</span>; })}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 rounded-2xl bg-gold-50 p-4 text-xs text-ink/80">{c.note}</p>
        <p className="mt-3 text-sm"><Link href="/questions" className="font-bold text-royal-700 underline">Explore the Hard Questions →</Link></p>
      </div>
    </>
  );
}
