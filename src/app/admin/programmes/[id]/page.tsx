import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { lookupOptions } from "@/server/admin-resources";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { addProgrammeCourseAction, removeProgrammeCourseAction } from "../../curriculum-actions";

export default async function ProgrammeStructure({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage(["programmes.manage", "curriculum.approve"]);
  const id = (await params).id;
  const [p] = await getDb().select().from(s.programmes).where(eq(s.programmes.id, id));
  if (!p) notFound();
  const [rows, courses] = await Promise.all([
    getDb().select({ courseId: s.courses.id, code: s.courses.code, title: s.courses.title, credits: s.courses.credits, kind: s.programmeCourses.kind, year: s.programmeCourses.year, semester: s.programmeCourses.semester }).from(s.programmeCourses).innerJoin(s.courses, eq(s.courses.id, s.programmeCourses.courseId)).where(eq(s.programmeCourses.programmeId, id)).orderBy(asc(s.programmeCourses.year), asc(s.programmeCourses.semester), asc(s.courses.code)),
    lookupOptions("courses"),
  ]);
  const core = rows.filter((r) => r.kind === "CORE").reduce((a, r) => a + r.credits, 0);
  return (
    <>
      <PageHeader eyebrow={p.code} title={p.name} description={`Core credits: ${core} · minimum required: ${p.minCredits}${core < p.minCredits ? " — core courses currently total less than the minimum" : ""}`} breadcrumbs={[{ href: "/admin/r/programmes", label: "Programmes" }, { label: p.code }]} actions={<span className="flex items-center gap-2"><StatusBadge status={p.status} /><Link href={`/admin/r/programmes/${id}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Edit details</Link></span>} />
      <Card>
        <CardHeader title="Course structure" description="Core and elective courses by year and semester. Changes are audited." />
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.courseId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span><span className="font-mono text-xs font-bold text-royal-700">{r.code}</span> {r.title} <span className="text-xs text-muted">{r.credits} cr</span></span>
              <span className="flex items-center gap-3"><Badge tone={r.kind === "CORE" ? "navy" : "gold"}>{r.kind.toLowerCase()}</Badge><span className="text-xs text-muted">Y{r.year} S{r.semester}</span><Confirm label="Remove" title={`Remove ${r.code}?`} variant="danger-outline" run={async () => { "use server"; return removeProgrammeCourseAction(id, r.courseId); }} /></span>
            </li>
          ))}
        </ul>
        <ActionForm action={addProgrammeCourseAction} className="grid gap-3 border-t border-line p-5 sm:grid-cols-[2fr_1fr_6rem_6rem_auto] sm:items-end" resetOnSuccess>
          <input type="hidden" name="programmeId" value={id} />
          <SelectField label="Add a course" name="courseId" options={courses} required />
          <SelectField label="Type" name="kind" options={[{ value: "CORE", label: "Core" }, { value: "ELECTIVE", label: "Elective" }]} />
          <TextField label="Year" name="year" type="number" defaultValue="1" /><TextField label="Semester" name="semester" type="number" defaultValue="1" />
          <SubmitButton size="sm">Add</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
