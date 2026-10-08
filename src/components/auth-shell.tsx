import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";
import { Logo } from "./brand";

type Tone = "student" | "apply" | "staff";
const TONES: Record<Tone, { panel: string; blob1: string; blob2: string; heading: string }> = {
  student: { panel: "from-navy-950 via-navy-800 to-royal-600", blob1: "bg-sky-400/25", blob2: "bg-gold-400/25", heading: "Welcome back, minister in the making." },
  apply: { panel: "from-emerald-950 via-teal-800 to-emerald-500", blob1: "bg-lime-300/20", blob2: "bg-gold-400/30", heading: "Begin your journey of calling, learning and service." },
  staff: { panel: "from-violet-950 via-navy-800 to-violet-600", blob1: "bg-fuchsia-400/20", blob2: "bg-gold-400/25", heading: "Faculty and administration portal." },
};

/**
 * Shared frame for sign-in, registration and recovery: a colourful, welcoming split screen with the school logo and the
 * founder's picture (both editable under Admin → Logo & pictures). On phones the picture panel becomes a compact banner.
 */
export async function AuthShell({ title, subtitle, children, wide, tone = "student" }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean; tone?: Tone }) {
  const [b, founder] = await Promise.all([getBrand(), getContent("founder")]);
  const t = TONES[tone];
  const features = [
    { icon: <BookOpen className="size-4" aria-hidden />, text: "Bible, concordance, Hebrew & Greek" },
    { icon: <GraduationCap className="size-4" aria-hidden />, text: "Certificate, Diploma & Advanced Diploma" },
    { icon: <Sparkles className="size-4" aria-hidden />, text: "Apostolic · Pastoral · Evangelical · Prophetic" },
    { icon: <ShieldCheck className="size-4" aria-hidden />, text: "Verified, QR-secured certificates" },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className={`relative isolate overflow-hidden bg-gradient-to-br ${t.panel} px-6 py-8 text-white lg:px-12 lg:py-12`}>
        <div className={`pointer-events-none absolute -left-24 -top-24 size-80 rounded-full ${t.blob1} blur-3xl`} aria-hidden />
        <div className={`pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full ${t.blob2} blur-3xl`} aria-hidden />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" aria-hidden />
        <div className="mx-auto flex max-w-xl flex-col gap-6 lg:h-full lg:justify-between lg:gap-8">
          <Link href="/" aria-label="FCGBS home" className="flex items-center gap-3">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-lift lg:size-20"><Logo src={b.logoUrl} alt={`${b.name} logo`} className="size-full" priority /></span>
            <span><span className="block text-xl font-extrabold tracking-wide lg:text-2xl">{b.shortName}</span><span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gold-300 lg:text-xs">{b.name}</span></span>
          </Link>

          <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-6">
            <figure className="shrink-0">
              <img src={b.founderPhotoUrl} alt={`${founder.name}, ${founder.role}`} width={220} height={290} fetchPriority="high" decoding="async" className="h-28 w-24 rounded-2xl object-cover object-top shadow-lift ring-4 ring-gold-400/80 sm:h-32 sm:w-28 lg:h-64 lg:w-52 lg:rounded-3xl" />
              <figcaption className="mt-2 hidden text-sm lg:block"><strong className="block text-gold-300">{founder.name}</strong><span className="text-white/75">{founder.role}</span></figcaption>
            </figure>
            <div>
              <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl lg:text-4xl">{t.heading}</h2>
              <p className="mt-2 hidden max-w-md text-white/80 lg:block">Study the Word, be formed in character and equipped for faithful ministry and a life of Kingdom enterprise.</p>
              <p className="mt-1 text-xs text-white/75 lg:hidden">{founder.name} · {founder.role}</p>
            </div>
          </div>

          <ul className="hidden gap-2 lg:grid lg:grid-cols-2">
            {features.map((f) => <li key={f.text} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><span className="text-gold-300">{f.icon}</span>{f.text}</li>)}
          </ul>
          <p className="hidden border-l-4 border-gold-400 pl-3 text-sm italic text-white/80 lg:block">“{b.motto}” <span className="not-italic text-gold-300">— {b.mottoRef}</span></p>
        </div>
      </aside>

      <main id="main" className="relative flex items-center justify-center bg-[radial-gradient(circle_at_85%_10%,#fcf8ea,transparent_40%),radial-gradient(circle_at_10%_90%,#eef3ff,transparent_45%)] bg-surface px-4 py-8 sm:px-8 lg:py-12">
        <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <div className="rounded-3xl bg-white p-6 shadow-lift ring-1 ring-line sm:p-8">
            <div className="mb-1 h-1.5 w-16 rounded-full bg-gradient-to-r from-gold-400 via-royal-500 to-emerald-500" aria-hidden />
            <h1 className="mt-3 text-2xl font-extrabold text-navy-800">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">{b.name} · <Link href="/" className="font-semibold text-royal-700 underline">Back to website</Link> · <Link href="/bible" className="font-semibold text-royal-700 underline">Read the Bible</Link></p>
        </div>
      </main>
    </div>
  );
}
