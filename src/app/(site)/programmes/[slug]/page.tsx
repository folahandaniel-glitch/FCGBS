import { notFound } from "next/navigation";
import Link from "next/link";
import { Alert, ButtonLink } from "@/components/ui/primitives";
import { Checklist, Hero, Section } from "@/components/site/blocks";
import { getProgramme } from "@/server/services/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProgramme((await params).slug);
  return { title: p?.p.name ?? "Programme", description: p?.p.description ?? undefined };
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await getProgramme((await params).slug);
  if (!data) notFound();
  const { p, level, department, courses } = data;
  const core = courses.filter((c) => c.kind === "CORE");
  const electives = courses.filter((c) => c.kind === "ELECTIVE");
  const terms = [...new Set(core.map((c) => `${c.year}-${c.semester}`))];
  const row = (c: (typeof courses)[number]) => (
    <tr key={c.code} className="border-b border-line">
      <td className="py-2 pr-3 font-mono text-xs text-royal-700"><Link href={`/courses/${c.code}`} className="hover:underline">{c.code}</Link></td>
      <td className="py-2 pr-3">{c.title}</td>
      <td className="py-2 text-right tabular-nums">{c.credits}</td>
    </tr>
  );
  return (
    <>
      <Hero eyebrow={`${level}${department ? ` · ${department}` : ""}`} title={p.name}>{p.description}</Hero>
      <Section tone="white">
        <div className="grid gap-4 sm:grid-cols-4">
          {[["Code", p.code], ["Duration", `${p.durationMonths} months`], ["Credit units", String(p.minCredits)], ["Minimum CGPA", p.minCgpa.toFixed(1)]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface p-4"><p className="text-xs font-semibold uppercase text-muted">{k}</p><p className="mt-1 text-xl font-extrabold text-navy-800">{v}</p></div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href={`/apply?programme=${p.slug}`} variant="gold" size="lg">Apply for this programme</ButtonLink><ButtonLink href="/admissions" variant="secondary" size="lg">Admission process</ButtonLink></div>
      </Section>
      <Section title="Programme objectives"><Checklist items={p.objectives} /></Section>
      <Section title="Learning outcomes" tone="white"><Checklist items={p.learningOutcomes} /></Section>
      <Section title="Admission requirements"><Checklist items={p.admissionRequirements} /></Section>
      <Section title="Course structure" subtitle="Course codes, credit units and required courses." tone="white">
        {terms.sort().map((t) => {
          const [y, s] = t.split("-");
          return (
            <div key={t} className="mb-6 overflow-x-auto">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold-600">Year {y} · Semester {s}</h3>
              <table className="w-full min-w-[420px] text-left text-sm"><tbody>{core.filter((c) => `${c.year}-${c.semester}` === t).map(row)}</tbody></table>
            </div>
          );
        })}
        {electives.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gold-600">Electives (choose in consultation with your advisor)</h3>
            <table className="w-full min-w-[420px] text-left text-sm"><tbody>{electives.map(row)}</tbody></table>
          </div>
        )}
      </Section>
      <Section title="Practical, assessment and graduation requirements">
        <div className="grid gap-6 lg:grid-cols-2">
          <div><h3 className="font-bold text-navy-800">Practical requirements</h3><p className="mt-1 text-sm text-muted">{p.practicalRequirements}</p><h3 className="mt-4 font-bold text-navy-800">Assessment</h3><p className="mt-1 text-sm text-muted">{p.assessmentRequirements}</p></div>
          <div><h3 className="mb-2 font-bold text-navy-800">Graduation requirements</h3><Checklist items={p.graduationRequirements} /></div>
        </div>
        {p.tuitionFee > 0 && <p className="mt-6 text-sm text-ink/80">Tuition: {p.currency} {p.tuitionFee.toLocaleString()}</p>}
        {p.recognitionNote && <Alert tone="info" className="mt-6">{p.recognitionNote}</Alert>}
      </Section>
    </>
  );
}
