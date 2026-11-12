import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Section } from "@/components/site/blocks";
import { getContent, seoMetadata } from "@/server/services/content";
import { listProgrammes } from "@/server/services/catalog";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("programmes"); }

export default async function ProgrammesPage() {
  const h = (await getContent("pageHeadings")).programmes;
  const all = await listProgrammes();
  const levels = [...new Map(all.map((p) => [p.levelKey, { name: p.level, rank: p.levelRank }])).entries()].sort((a, b) => a[1].rank - b[1].rank);
  return (
    <>
      <Hero eyebrow={h.kicker} title={h.title}>{h.intro}</Hero>
      {levels.map(([key, lv], i) => (
        <Section key={key} title={`Level ${lv.rank} · ${lv.name}`} tone={i % 2 ? "plain" : "white"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {all.filter((p) => p.levelKey === key).map((p) => (
              <Link key={p.id} href={`/programmes/${p.slug}`} className="group rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <p className="text-xs font-bold uppercase tracking-wide text-gold-600">{p.code} · {p.months} months</p>
                <h3 className="mt-1 font-bold text-navy-800 group-hover:text-royal-700">{p.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{p.description}</p>
                <p className="mt-3 text-xs font-semibold text-navy-700">{p.minCredits} credit units</p>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
