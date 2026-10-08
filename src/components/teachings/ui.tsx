import Link from "next/link";
import { BookOpen, Compass, Cpu, Flame, HeartHandshake, Landmark, Megaphone, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { COLOUR } from "@/components/bible/colours";

export const TRACK_ICONS: Record<string, LucideIcon> = { compass: Compass, shepherd: HeartHandshake, megaphone: Megaphone, flame: Flame, spark: Sparkles, landmark: Landmark, book: BookOpen, cpu: Cpu };
export const iconFor = (k?: string | null) => TRACK_ICONS[k ?? ""] ?? BookOpen;
export const LEVELS: Record<string, { label: string; cls: string }> = {
  FOUNDATION: { label: "Foundation", cls: "bg-emerald-100 text-emerald-800" },
  INTERMEDIATE: { label: "Intermediate", cls: "bg-amber-100 text-amber-800" },
  ADVANCED: { label: "Advanced", cls: "bg-rose-100 text-rose-800" },
};

export function TeachingBanner({ eyebrow, title, colour = "royal", children, icon }: { eyebrow?: string; title: ReactNode; colour?: string; children?: ReactNode; icon?: string | null }) {
  const c = COLOUR[colour] ?? COLOUR.royal;
  const Icon = iconFor(icon);
  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${c.grad} text-white`}>
      <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <Icon className="pointer-events-none absolute -bottom-8 right-6 size-48 text-white/10" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">{eyebrow}</p>}
        <h1 className="mt-1 max-w-3xl font-display text-3xl font-bold sm:text-5xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-white/90">{children}</div>}
      </div>
    </section>
  );
}

export function TeachingCard({ t }: { t: { slug: string; title: string; summary: string | null; level: string; minutes: number; trackSlug: string; trackTitle: string; colour: string; audience: string } }) {
  const c = COLOUR[t.colour] ?? COLOUR.royal;
  const lv = LEVELS[t.level] ?? LEVELS.FOUNDATION;
  return (
    <Link href={`/teachings/${t.trackSlug}/${t.slug}`} className={`group flex h-full flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ${c.ring} transition hover:-translate-y-0.5 hover:shadow-lift`}>
      <div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-bold">
        <span className={`rounded-full px-2.5 py-0.5 ${c.soft} ${c.text}`}>{t.trackTitle}</span>
        <span className={`rounded-full px-2.5 py-0.5 ${lv.cls}`}>{lv.label}</span>
        {t.audience !== "PUBLIC" && <span className="rounded-full bg-navy-800 px-2.5 py-0.5 text-white">Students</span>}
      </div>
      <h3 className="mt-3 text-lg font-extrabold leading-snug text-navy-800 group-hover:text-royal-700">{t.title}</h3>
      {t.summary && <p className="mt-1.5 line-clamp-3 text-sm text-ink/75">{t.summary}</p>}
      <p className="mt-auto pt-3 text-xs font-semibold text-muted">{t.minutes} min read</p>
    </Link>
  );
}
