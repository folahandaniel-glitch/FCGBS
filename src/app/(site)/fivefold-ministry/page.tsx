import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { Checklist, Hero, InfoCard, Section } from "@/components/site/blocks";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Fivefold Ministry Development Framework" };

export default async function FivefoldPage() {
  const f = await getContent("fivefold");
  return (
    <>
      <Hero eyebrow="Ephesians 4:11–13" title={f.title}><span className="italic">{f.intro}</span></Hero>
      <Section tone="white"><Alert tone="info" title="How FCGBS teaches the fivefold ministry">{f.principle}</Alert></Section>
      <Section title="Five studies, one framework"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.functions.map((x) => <InfoCard key={x.name} title={x.name} text={x.text} />)}</div></Section>
      <Section title="Biblical foundation" tone="white"><Checklist items={f.foundations} /></Section>
      <Section title="What students study"><Checklist items={f.topics} /></Section>
    </>
  );
}
