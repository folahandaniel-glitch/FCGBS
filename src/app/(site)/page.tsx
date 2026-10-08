/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Cpu, Landmark } from "lucide-react";
import { Carousel, type CarouselSlide } from "@/components/site/carousel";
import { Checklist, InfoCard, Section } from "@/components/site/blocks";
import { ButtonLink } from "@/components/ui/primitives";
import { Logo } from "@/components/brand";
import { getBrand } from "@/server/brand";
import { carouselPosts, listProgrammes } from "@/server/services/catalog";
import { getContent } from "@/server/services/content";

const img = (id: string) => (id ? `/api/v1/assets/${id}` : null);

export default async function HomePage() {
  const [brand, home, car, programmes, posts, founder, identity] = await Promise.all([getBrand(), getContent("home"), getContent("carousel"), listProgrammes(), carouselPosts(), getContent("founder"), getContent("identity")]);
  const slides: CarouselSlide[] = [
    ...posts.map((p) => ({ title: p.title, text: p.summary ?? "", link: p.linkUrl || `/news/${p.slug}`, linkLabel: p.linkLabel || "Read more", imageUrl: img(p.imageAssetId ?? ""), tag: p.kind === "EVENT" ? "Event" : "Announcement" })),
    ...car.slides.map((s) => ({ title: s.title, text: s.text, link: s.link, linkLabel: s.linkLabel, imageUrl: img(s.imageAssetId) })),
  ];
  const levels = ["CERTIFICATE", "DIPLOMA", "ADVANCED_DIPLOMA"] as const;
  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(220,185,74,0.18),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(47,102,234,0.25),transparent_50%)]" aria-hidden />
        {brand.heroUrl && <img src={brand.heroUrl} alt="" className="absolute inset-0 size-full object-cover opacity-20" loading="eager" decoding="async" />}
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.4fr_1fr]">
          <div className="rise">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">{home.eyebrow}</p>
            <h1 className="font-display mt-3 text-4xl font-bold leading-[1.1] sm:text-5xl">
              <span className="text-gold-gradient">{home.title}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{home.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={home.primaryCta.href} variant="gold" size="lg">{home.primaryCta.label}</ButtonLink>
              <ButtonLink href={home.secondaryCta.href} variant="outlineLight" size="lg">{home.secondaryCta.label}</ButtonLink>
            </div>
            <p className="mt-6 max-w-2xl text-sm italic text-white/60">{home.scriptureLine}</p>
          </div>
          <div className="hidden justify-self-center lg:block">
            <div className="grid size-72 place-items-center rounded-[2rem] bg-white p-5 shadow-lift ring-4 ring-gold-400/30">
              <Logo src={brand.logoUrl} alt="Fodan Christian Global Bible School logo" className="size-full" priority />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <Carousel slides={slides} seconds={brand.site.carouselSeconds} />
        </div>
      </section>

      <Section title={home.pathwayTitle} subtitle={home.pathwaySubtitle} tone="white">
        <div className="grid gap-5 lg:grid-cols-3">
          {levels.map((lv, idx) => {
            const list = programmes.filter((p) => p.levelKey === lv);
            return (
              <div key={lv} className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gold-600">Level {idx + 1}</p>
                <h3 className="font-display mt-1 text-xl font-bold text-navy-800">{lv === "ADVANCED_DIPLOMA" ? "Advanced Diploma" : lv === "DIPLOMA" ? "Diploma" : "Certificate"}</h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link href={`/programmes/${p.slug}`} className="font-medium text-royal-700 hover:underline">
                        {p.name.replace(/^(Certificate|Diploma|Advanced Diploma) in /, "")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-6"><Link href="/programmes" className="inline-flex items-center gap-2 text-sm font-bold text-royal-700 hover:underline">All programmes and course structures <ArrowRight className="size-4" aria-hidden /></Link></div>
      </Section>

      <Section title={home.equationTitle}>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-800">
          {home.equation.map((e, i) => (
            <span key={e} className="flex items-center gap-2">
              <span className="rounded-full bg-gold-100 px-4 py-2 text-gold-600">{e}</span>
              {i < home.equation.length - 1 && <span aria-hidden className="text-muted">+</span>}
            </span>
          ))}
        </div>
      </Section>

      <Section title={home.featuresTitle} tone="white">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {home.features.map((f) => (
            <InfoCard key={f.title} title={f.title} text={f.text} />
          ))}
        </div>
      </Section>

      <section className="bg-navy-800 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-display text-3xl font-bold">{home.hubTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/80">{home.hubText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/technology-hub" variant="gold"><Cpu className="size-4" aria-hidden /> Technology Hub</ButtonLink>
              <ButtonLink href="/kingdom-enterprise" variant="outlineLight"><Landmark className="size-4" aria-hidden /> Kingdom Enterprise</ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-sm font-bold text-gold-400">{home.audienceTitle}</p>
            <div className="mt-3"><Checklist items={home.audience} tone="light" /></div>
          </div>
        </div>
      </section>

      <Section title="Our values" tone="white">
        <div className="flex flex-wrap gap-2">
          {identity.values.slice(0, 12).map((v) => (
            <span key={v} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-navy-800">{v}</span>
          ))}
        </div>
        <Link href="/vision-mission" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-royal-700 hover:underline">Vision, mission and all values <ArrowRight className="size-4" aria-hidden /></Link>
      </Section>

      <Section>
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <img src={brand.founderPhotoUrl} alt={`${founder.name}, ${founder.role}`} width={220} height={300} loading="lazy" decoding="async" className="mx-auto h-auto w-44 rounded-2xl object-cover shadow-card ring-1 ring-line sm:w-52" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-600">{founder.role}</p>
            <h2 className="font-display text-2xl font-bold text-navy-800 sm:text-3xl">{founder.name}</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink/85">{founder.bio[0].slice(0, 420)}…</p>
            <Link href="/leadership" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-royal-700 hover:underline">Read more <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
        </div>
      </Section>

      <section className="bg-gold-50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy-800">{home.ctaTitle}</h2>
            <p className="mt-1 max-w-2xl text-muted">{home.ctaText}</p>
          </div>
          <ButtonLink href="/apply" variant="navy" size="lg">Start your application</ButtonLink>
        </div>
      </section>
    </>
  );
}
