import { notFound } from "next/navigation";
import Link from "next/link";
import { Checklist, Hero, Section } from "@/components/site/blocks";
import { getCourse } from "@/server/services/catalog";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const c = await getCourse((await params).code);
  return { title: c ? `${c.c.code} ${c.c.title}` : "Course", description: c?.c.description ?? undefined };
}

export default async function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const data = await getCourse((await params).code);
  if (!data) notFound();
  const { c, department, relations, programmes } = data;
  const w = c.assessmentWeights;
  return (
    <>
      <Hero eyebrow={`${c.code} · ${department ?? ""}`} title={c.title}>{c.description}</Hero>
      <Section tone="white">
        <div className="grid gap-4 sm:grid-cols-4">
          {[["Level", `Level ${c.levelRank}`], ["Credit units", String(c.credits)], ["Contact hours", String(c.contactHours)], ["Attendance", `${c.attendanceMinPct}% minimum`]].map(([k, v]) => <div key={k} className="rounded-xl bg-surface p-4"><p className="text-xs font-semibold uppercase text-muted">{k}</p><p className="mt-1 text-xl font-extrabold text-navy-800">{v}</p></div>)}
        </div>
        {relations.length > 0 && <p className="mt-4 text-sm text-muted">{relations.map((r) => `${r.kind === "PREREQUISITE" ? "Prerequisite" : "Co-requisite"}: ${r.code} ${r.title}`).join(" · ")}</p>}
      </Section>
      <Section title="Objectives"><Checklist items={c.objectives} /></Section>
      <Section title="Learning outcomes" tone="white"><Checklist items={c.outcomes} /></Section>
      <Section title="Course topics">
        <div className="grid gap-4 sm:grid-cols-2">
          {c.topics.map((t, i) => <div key={i} className="rounded-2xl border border-line bg-white p-4"><h3 className="font-bold text-navy-800">{i + 1}. {t.title}</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted">{t.points.map((p) => <li key={p}>{p}</li>)}</ul></div>)}
        </div>
      </Section>
      <Section title="Required and recommended resources" tone="white">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink/85">{c.readings.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">Titles are listed for study; obtain them lawfully. FCGBS does not distribute copyrighted books.</p>
      </Section>
      <Section title="Assessment, practical and ministry requirements">
        <p className="text-sm text-ink/85">Assignments {w.assignment}% · Tests {w.test}% · Examination {w.exam}%{w.practical ? ` · Practical ${w.practical}%` : ""}</p>
        {c.practicalRequirements && <p className="mt-2 text-sm"><strong>Practical:</strong> {c.practicalRequirements}</p>}
        {c.ministryRequirements && <p className="mt-2 text-sm"><strong>Ministry:</strong> {c.ministryRequirements}</p>}
        {programmes.length > 0 && <div className="mt-5"><p className="text-sm font-bold text-navy-800">Offered in</p><ul className="mt-1 space-y-1 text-sm">{programmes.map((p) => <li key={p.slug}><Link className="text-royal-700 hover:underline" href={`/programmes/${p.slug}`}>{p.name}</Link> <span className="text-muted">({p.kind.toLowerCase()})</span></li>)}</ul></div>}
      </Section>
    </>
  );
}
