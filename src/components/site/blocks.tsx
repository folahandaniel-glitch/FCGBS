import type { ReactNode } from "react";
import { cx } from "../ui/primitives";

/** Shared page furniture for the public site: kept tiny so pages stay fast. */
export function Hero({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-royal-700 text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-gold-400">{eyebrow}</p>}
        <h1 className="font-display max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        {children && <div className="mt-4 max-w-3xl text-base leading-relaxed text-white/75">{children}</div>}
      </div>
    </section>
  );
}

export function Section({ title, subtitle, children, tone = "plain", className }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; tone?: "plain" | "white" | "navy"; className?: string }) {
  return (
    <section className={cx(tone === "white" && "bg-white", tone === "navy" && "bg-navy-800 text-white", className)}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        {title && <h2 className={cx("font-display text-2xl font-bold sm:text-3xl", tone === "navy" ? "text-white" : "text-navy-800")}>{title}</h2>}
        {subtitle && <p className={cx("mt-2 max-w-3xl text-base", tone === "navy" ? "text-white/70" : "text-muted")}>{subtitle}</p>}
        <div className={cx((title || subtitle) && "mt-7")}>{children}</div>
      </div>
    </section>
  );
}

export function InfoCard({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-400 via-royal-500 to-emerald-500" aria-hidden />
      <h3 className="font-bold text-navy-800">{title}</h3>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>}
      {children}
    </div>
  );
}

export function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink/90">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function Checklist({ items, tone = "dark" }: { items: readonly string[]; tone?: "dark" | "light" }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((t) => (
        <li key={t} className={cx("flex gap-2.5 text-sm", tone === "light" ? "text-white/85" : "text-ink/85")}>
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold-500" />
          {t}
        </li>
      ))}
    </ul>
  );
}
