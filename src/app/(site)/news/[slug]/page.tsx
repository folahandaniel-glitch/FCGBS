/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { Hero, Section } from "@/components/site/blocks";
import { Markdown } from "@/components/markdown";
import { getPost } from "@/server/services/catalog";

async function find(slug: string) {
  for (const k of ["NEWS", "EVENT", "ANNOUNCEMENT", "ARTICLE"]) {
    const p = await getPost(k, slug);
    if (p) return p;
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  return { title: p?.title ?? "News", description: p?.summary ?? undefined };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  if (!p) notFound();
  return (
    <>
      <Hero eyebrow={p.kind} title={p.title}>{p.summary}</Hero>
      <Section tone="white">
        {p.imageAssetId && <img src={`/api/v1/assets/${p.imageAssetId}`} alt="" loading="lazy" className="mb-6 max-h-96 w-full max-w-3xl rounded-2xl object-cover" />}
        {(p.startsAt || p.location) && <p className="mb-4 text-sm font-semibold text-gold-600">{p.startsAt?.toLocaleString("en-GB")} {p.location ? `· ${p.location}` : ""}</p>}
        <Markdown source={p.body ?? ""} />
      </Section>
    </>
  );
}
