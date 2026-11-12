import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { getContent, seoMetadata } from "@/server/services/content";
import { listPosts } from "@/server/services/catalog";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("faq"); }

export default async function FaqPage() {
  const h = (await getContent("pageHeadings")).faq;
  const faqs = await listPosts("FAQ");
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })) };
  return (
    <>
      <Hero eyebrow={h.kicker} title={h.title}>{h.intro}</Hero>
      <Section tone="white">
        <div className="max-w-3xl space-y-3">
          {faqs.map((f) => (
            <details key={f.id} className="group rounded-2xl border border-line bg-surface p-4">
              <summary className="cursor-pointer list-none font-semibold text-navy-800">{f.title}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{f.body}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      </Section>
    </>
  );
}
