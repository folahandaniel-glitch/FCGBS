import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { Hero, InfoCard, Section } from "@/components/site/blocks";
import { getContent, seoMetadata } from "@/server/services/content";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("ministryFormation"); }

export default async function MinistryFormationPage() {
  const hero = (await getContent("pageHeroes")).ministryFormation;
  const m = await getContent("ministryFormation");
  return (
    <>
      <Hero eyebrow={hero.kicker} title={m.title}>{m.intro}</Hero>
      <Section tone="white"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{m.pillars.map((p) => <InfoCard key={p.title} title={p.title} text={p.text} />)}</div></Section>
      <Section><Alert tone="info">{m.note}</Alert></Section>
    </>
  );
}
