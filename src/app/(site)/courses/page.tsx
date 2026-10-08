import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Section } from "@/components/site/blocks";
import { inputClass } from "@/components/ui/primitives";
import { listCourses, listDepartments } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string; level?: string }> }) {
  const sp = await searchParams;
  const [courses, depts] = await Promise.all([listCourses({ q: sp.q?.slice(0, 60), dept: sp.dept, level: sp.level ? Number(sp.level) : undefined }), listDepartments()]);
  return (
    <>
      <Hero eyebrow="Course catalogue" title="Courses">Search by title, code or department. Every course has objectives, outcomes, a syllabus, recommended reading and assessment details.</Hero>
      <Section tone="white">
        <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_14rem_9rem_auto]" role="search">
          <input name="q" defaultValue={sp.q} placeholder="Search courses…" aria-label="Search courses" className={inputClass} />
          <select name="dept" defaultValue={sp.dept ?? ""} aria-label="Department" className={inputClass}><option value="">All departments</option>{depts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
          <select name="level" defaultValue={sp.level ?? ""} aria-label="Level" className={inputClass}><option value="">All levels</option><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select>
          <button className="h-11 rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white hover:bg-navy-700">Search</button>
        </form>
        <p className="mb-3 text-sm text-muted">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.code}`} className="rounded-2xl border border-line bg-white p-4 shadow-card transition hover:shadow-lift">
              <p className="font-mono text-xs font-bold text-royal-700">{c.code} · {c.credits} credits · Level {c.levelRank}</p>
              <h3 className="mt-1 font-bold text-navy-800">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
              <p className="mt-2 text-xs font-semibold text-gold-600">{c.department}</p>
            </Link>
          ))}
        </div>
        {courses.length === 0 && <p className="py-10 text-center text-muted">No courses match your search.</p>}
      </Section>
    </>
  );
}
