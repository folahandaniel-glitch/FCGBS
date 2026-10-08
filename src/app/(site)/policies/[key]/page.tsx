import { notFound } from "next/navigation";
import { Hero, Section } from "@/components/site/blocks";
import { Markdown } from "@/components/markdown";
import { getPolicy } from "@/server/services/catalog";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const p = await getPolicy((await params).key);
  return { title: p?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ key: string }> }) {
  const p = await getPolicy((await params).key);
  if (!p) notFound();
  return (
    <>
      <Hero eyebrow="Policies" title={p.title} />
      <Section tone="white">
        <Markdown source={p.body} />
        <p className="mt-8 text-xs text-muted">Version {p.version}{p.effectiveOn ? ` · effective ${p.effectiveOn}` : ""}</p>
      </Section>
    </>
  );
}
