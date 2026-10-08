import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { COLOUR } from "@/components/bible/colours";
import { PlanProgress } from "@/components/bible/plan-progress";
import { getContent } from "@/server/services/content";
import { planDays } from "@/server/services/bible";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const p = (await getContent("biblePlans")).items.find((x) => x.slug === slug);
  return { title: p?.title ?? "Reading plan" };
}

export default async function PlanPage({ params }: Props) {
  const slug = (await params).slug;
  const p = (await getContent("biblePlans")).items.find((x) => x.slug === slug);
  if (!p) notFound();
  const days = planDays(p.sources, Math.max(1, Math.min(p.days, 400))).map((d) => ({ day: d.day, label: d.label || "Rest and review", href: d.first ? `/bible/${d.first.slug}/${d.first.chapter}` : null }));
  return (
    <>
      <BibleBanner eyebrow={`${p.days}-day plan`} title={p.title} tone={COLOUR[p.colour]?.banner ?? "royal"}><p>{p.description}</p></BibleBanner>
      <BibleTabs active="/bible/plans" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><PlanProgress slug={p.slug} days={days} /></div>
    </>
  );
}
