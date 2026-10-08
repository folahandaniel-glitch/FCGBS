import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { Hero, InfoCard, Section } from "@/components/site/blocks";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Ministry Formation" };

export default async function MinistryFormationPage() {
  const m = await getContent("ministryFormation");
  return (
    <>
      <Hero eyebrow="The defining feature of FCGBS" title={m.title}>{m.intro}</Hero>
      <Section tone="white"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{m.pillars.map((p) => <InfoCard key={p.title} title={p.title} text={p.text} />)}</div></Section>
      <Section><Alert tone="info">{m.note}</Alert></Section>
    </>
  );
}
