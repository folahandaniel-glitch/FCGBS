import Link from "next/link";
import type { ReactNode } from "react";
import { TRANSLATIONS, type TranslationId } from "@/core/bible";
import type { Word } from "@/server/services/bible";

export function BibleBanner({ eyebrow, title, children, tone = "royal" }: { eyebrow?: string; title: ReactNode; children?: ReactNode; tone?: "royal" | "emerald" | "violet" | "amber" | "rose" }) {
  const g = { royal: "from-navy-900 via-royal-700 to-sky-500", emerald: "from-emerald-900 via-emerald-700 to-teal-400", violet: "from-violet-950 via-violet-700 to-fuchsia-500", amber: "from-amber-900 via-amber-600 to-yellow-400", rose: "from-rose-950 via-rose-700 to-orange-400" }[tone];
  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${g} text-white`}>
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 size-64 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-white/85">{children}</div>}
      </div>
    </section>
  );
}

export function BibleTabs({ active }: { active?: string }) {
  const tabs = [["/bible", "Read"], ["/bible/search", "Concordance"], ["/bible/strongs", "Hebrew & Greek"], ["/bible/topics", "Topics"], ["/bible/plans", "Reading plans"], ["/bible/languages", "Learn the languages"], ["/bible/notes", "My notes"]];
  return (
    <nav aria-label="Bible tools" className="no-scrollbar sticky top-[4.25rem] z-30 overflow-x-auto border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2 sm:px-6">
        {tabs.map(([href, label]) => <Link key={href} href={href} prefetch={false} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ${active === href ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-royal-50"}`}>{label}</Link>)}
      </div>
    </nav>
  );
}

export function TranslationPills({ base, current, parallel, book }: { base: string; current: TranslationId; parallel?: TranslationId; book: number }) {
  const ok = (t: (typeof TRANSLATIONS)[number]) => (t.id === "wlc" ? book < 39 : t.id === "tr" ? book >= 39 : true);
  const q = (t: string, p?: string) => `${base}?t=${t}${p ? `&p=${p}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Translation">
      {TRANSLATIONS.filter(ok).map((t) => <Link key={t.id} href={q(t.id, parallel && parallel !== t.id ? parallel : undefined)} prefetch={false} title={t.full} className={`rounded-full px-3 py-1.5 font-bold ${current === t.id ? "bg-royal-600 text-white" : "bg-white text-navy-800 ring-1 ring-line hover:bg-royal-50"}`}>{t.name}</Link>)}
      <span className="mx-1 text-muted">Compare with:</span>
      {parallel && <Link href={q(current)} prefetch={false} className="rounded-full bg-gold-100 px-3 py-1.5 font-bold text-gold-600">None ✕</Link>}
      {TRANSLATIONS.filter((t) => ok(t) && t.id !== current && t.id !== parallel).map((t) => <Link key={t.id} href={q(current, t.id)} prefetch={false} className="rounded-full bg-white px-3 py-1.5 font-semibold text-navy-800 ring-1 ring-line hover:bg-gold-50">{t.name}</Link>)}
    </div>
  );
}

/** KJV verse with Strong's numbers attached to each word (made interactive by ReaderClient). */
export function TaggedWords({ words }: { words: Word[] }) {
  return <>{words.map((w, i) => {
    const el = w.s.length ? <span data-s={w.s.join(" ")} role="button" tabIndex={0} className={w.em ? "italic" : undefined}>{w.w}</span> : <span className={w.em ? "italic text-muted" : undefined}>{w.w}</span>;
    return <span key={i}>{el}{" "}</span>;
  })}</>;
}

export const langClass = (t: TranslationId) => (t === "wlc" ? "heb" : t === "tr" ? "grk" : "");
export const langAttrs = (t: TranslationId) => (t === "wlc" ? { lang: "he", dir: "rtl" as const } : t === "tr" ? { lang: "el" } : { lang: "en" });
