import Link from "next/link";
import { Alert, ButtonLink } from "@/components/ui/primitives";
import { Checklist, Hero, InfoCard, Section } from "./blocks";
import { listCourses, listLibrary } from "@/server/services/catalog";

/** Shared layout for the Technology Hub and Kingdom Enterprise pages: editable text + live course and library lists. */
export async function HubPage({ title, intro, principles, pathways, note, category, hub }: { title: string; intro: string; principles: readonly string[]; pathways: readonly { title: string; text: string }[]; note?: string; category: string; hub: string }) {
  const [courses, resources] = await Promise.all([listCourses({ category }), listLibrary({ hub })]);
  return (
    <>
      <Hero eyebrow="FCGBS Hub" title={title}>{intro}</Hero>
      <Section title="Guiding principles" tone="white"><Checklist items={principles} /></Section>
      <Section title="Pathways"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pathways.map((p) => <InfoCard key={p.title} title={p.title} text={p.text} />)}</div></Section>
      <Section title="Hub courses" subtitle="Included in the programmes and open to any enrolled student as electives." tone="white">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.code}`} className="rounded-2xl border border-line bg-white p-4 shadow-card hover:shadow-lift">
              <p className="font-mono text-xs font-bold text-royal-700">{c.code} · {c.credits} credits</p>
              <h3 className="mt-1 font-bold text-navy-800">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
            </Link>
          ))}
        </div>
      </Section>
      {resources.length > 0 && (
        <Section title="Recommended reading">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">{resources.slice(0, 20).map((r) => <li key={r.id} className="rounded-xl bg-white p-3 ring-1 ring-line">{r.citation ?? r.title}</li>)}</ul>
        </Section>
      )}
      {note && <Section><Alert tone="warning" title="Please note">{note}</Alert></Section>}
      <Section><ButtonLink href="/apply" variant="gold" size="lg">Apply and begin</ButtonLink></Section>
    </>
  );
}
