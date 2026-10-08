import type { Metadata } from "next";
import Link from "next/link";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { COLOUR } from "@/components/bible/colours";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Bible Reading Plans" };

export default async function PlansPage() {
  const c = await getContent("biblePlans");
  return (
    <>
      <BibleBanner eyebrow="Daily reading" title="Bible Reading Plans" tone="amber"><p>{c.intro}</p></BibleBanner>
      <BibleTabs active="/bible/plans" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2">
          {c.items.map((p) => (
            <li key={p.slug}>
              <Link href={`/bible/plans/${p.slug}`} className={`flex h-full flex-col rounded-3xl bg-gradient-to-br ${COLOUR[p.colour]?.grad ?? COLOUR.royal.grad} p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
                <span className="w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{p.days} days</span>
                <h2 className="mt-2 text-lg font-extrabold">{p.title}</h2>
                <p className="mt-1 text-sm text-white/85">{p.description}</p>
                <span className="mt-auto pt-3 text-xs font-bold text-gold-200">Start reading →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
