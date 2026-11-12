import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { Hero, Prose, Section } from "@/components/site/blocks";
import { getContent, seoMetadata } from "@/server/services/content";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("about"); }

export default async function AboutPage() {
  const hero = (await getContent("pageHeroes")).about;
  const a = await getContent("about");
  return (
    <>
      <Hero eyebrow={hero.kicker} title={a.title} />
      <Section tone="white"><Prose paragraphs={a.intro} /></Section>
      <Section title={a.relationshipTitle}><p className="max-w-3xl leading-relaxed text-ink/90">{a.relationship}</p></Section>
      <Section><Alert tone="info" title={a.recognitionTitle}>{a.recognition}</Alert></Section>
    </>
  );
}
