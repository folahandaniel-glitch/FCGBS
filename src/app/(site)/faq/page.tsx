import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { listPosts } from "@/server/services/catalog";

export const metadata: Metadata = { title: "FAQs" };

export default async function FaqPage() {
  const faqs = await listPosts("FAQ");
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })) };
  return (
    <>
      <Hero eyebrow="Answers" title="Frequently asked questions" />
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
