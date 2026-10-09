import Link from "next/link";
import { BookOpen, KeyRound, Languages, Search } from "lucide-react";
import { COLOUR } from "@/components/bible/colours";
import { iconFor } from "@/components/teachings/ui";
import { listTracks } from "@/server/services/teachings";

/** Homepage band: the Bible Hub tools and the teaching tracks, in colour. Both open with an access code. */
export async function HomeLearn() {
  const tracks = await listTracks();
  const tools = [
    { href: "/bible", t: "Bible reader", d: "KJV, BSB, ASV, Hebrew and Greek", Icon: BookOpen, c: "from-royal-500 to-navy-800" },
    { href: "/bible/search", t: "Concordance", d: "Every verse, every word", Icon: Search, c: "from-violet-500 to-violet-800" },
    { href: "/bible/strongs", t: "Hebrew & Greek", d: "14,000+ lexicon entries", Icon: Languages, c: "from-rose-500 to-rose-800" },
    { href: "/access", t: "Access code", d: "One code opens every feature", Icon: KeyRound, c: "from-gold-500 to-amber-700" },
  ];
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-royal-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Learn the Word of God</p>
        <h2 className="mt-1 max-w-3xl font-display text-3xl font-bold text-navy-800 sm:text-4xl">Study the Bible, Hebrew and Greek — and teachings that build the Church</h2>
        <p className="mt-3 max-w-3xl text-muted">Apostolic, pastoral, evangelical and prophetic teachings, revival and reformation, Kingdom enterprise and technology for ministry — original, Scripture-centred and light on data.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map(({ href, t, d, Icon, c }) => (
            <Link key={href} href={href} prefetch={false} className={`group flex items-center gap-4 rounded-2xl bg-gradient-to-br ${c} p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15"><Icon className="size-6 text-gold-200" aria-hidden /></span>
              <span><span className="block font-extrabold">{t}</span><span className="text-xs text-white/85">{d}</span></span>
            </Link>
          ))}
        </div>
        {tracks.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tracks.map((t) => {
              const c = COLOUR[t.colour] ?? COLOUR.royal;
              const Icon = iconFor(t.icon);
              return (
                <li key={t.id}>
                  <Link href={`/teachings/${t.slug}`} prefetch={false} className={`flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ${c.ring} transition hover:-translate-y-0.5 hover:shadow-lift`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.grad} text-white`}><Icon className="size-5" aria-hidden /></span>
                    <span><span className="block font-bold text-navy-800">{t.title}</span><span className="text-xs text-muted">{t.count} teachings</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
