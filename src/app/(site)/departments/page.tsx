import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Section } from "@/components/site/blocks";
import { getContent, seoMetadata } from "@/server/services/content";
import { listDepartments } from "@/server/services/catalog";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("departments"); }

export default async function DepartmentsPage() {
  const h = (await getContent("pageHeadings")).departments;
  const depts = await listDepartments();
  return (
    <>
      <Hero eyebrow={h.kicker} title={h.title}>{h.intro}</Hero>
      <Section tone="white">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => (
            <Link key={d.id} href={`/courses?dept=${d.code}`} className="rounded-2xl border border-line bg-white p-5 shadow-card transition hover:shadow-lift">
              <h3 className="font-bold text-navy-800">{d.name}</h3>
              <p className="mt-1 text-sm text-muted">{d.description}</p>
              <p className="mt-3 text-xs font-semibold text-gold-600">{d.courses} courses</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
