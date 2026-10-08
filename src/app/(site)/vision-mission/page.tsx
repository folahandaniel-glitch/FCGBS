import type { Metadata } from "next";
import { Checklist, Hero, InfoCard, Section } from "@/components/site/blocks";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Vision, Mission & Values" };

export default async function VisionPage() {
  const i = await getContent("identity");
  return (
    <>
      <Hero eyebrow="Who we are" title="Vision, Mission & Core Values" />
      <Section title="Our vision" tone="white"><p className="max-w-3xl text-lg leading-relaxed text-ink/90">{i.vision}</p></Section>
      <Section title="Our mission" subtitle="FCGBS exists to:"><Checklist items={i.mission} /></Section>
      <Section title="Core values" tone="white">
        <div className="flex flex-wrap gap-2">
          {i.values.map((v) => <span key={v} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-navy-800">{v}</span>)}
        </div>
      </Section>
      <Section title="What we emphasise"><Checklist items={i.emphasis} /></Section>
      <Section title="Academic philosophy" subtitle="Knowledge + Character + Spiritual Formation + Ministry Competence + Kingdom Service" tone="white">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{i.philosophy.map((p) => <InfoCard key={p.title} title={p.title} text={p.text} />)}</div>
      </Section>
    </>
  );
}
