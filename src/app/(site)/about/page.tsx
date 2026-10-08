import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { Hero, Prose, Section } from "@/components/site/blocks";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "About FCGBS" };

export default async function AboutPage() {
  const a = await getContent("about");
  return (
    <>
      <Hero eyebrow="About us" title={a.title} />
      <Section tone="white"><Prose paragraphs={a.intro} /></Section>
      <Section title={a.relationshipTitle}><p className="max-w-3xl leading-relaxed text-ink/90">{a.relationship}</p></Section>
      <Section><Alert tone="info" title={a.recognitionTitle}>{a.recognition}</Alert></Section>
    </>
  );
}
