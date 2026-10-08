/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Hero, Prose, Section } from "@/components/site/blocks";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Founder & Leadership" };

export default async function LeadershipPage() {
  const [brand, f, l] = await Promise.all([getBrand(), getContent("founder"), getContent("leadership")]);
  return (
    <>
      <Hero eyebrow="Founder & President" title={f.name} />
      <Section tone="white">
        <div className="grid gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto flex gap-3 md:flex-col">
            <img src={brand.founderPhotoUrl} alt={`${f.name}`} width={240} height={330} loading="lazy" decoding="async" className="h-auto w-40 rounded-2xl object-cover shadow-card sm:w-52" />
            <img src={brand.founderPhoto2Url} alt="" width={240} height={330} loading="lazy" decoding="async" className="h-auto w-40 rounded-2xl object-cover shadow-card sm:w-52" />
          </div>
          <Prose paragraphs={f.bio} />
        </div>
      </Section>
      <Section title="Leadership" subtitle={l.intro}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {l.members.map((m, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-5 text-center shadow-card">
              {m.photoAssetId && <img src={`/api/v1/assets/${m.photoAssetId}`} alt={m.name} loading="lazy" className="mx-auto mb-3 size-24 rounded-full object-cover" />}
              <p className="font-bold text-navy-800">{m.name}</p>
              <p className="text-sm font-semibold text-gold-600">{m.title}</p>
              <p className="mt-2 text-sm text-muted">{m.bio}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
