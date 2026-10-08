import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { lookupOptions } from "@/server/admin-resources";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { can } from "@/core/permissions";
import { courseTree } from "@/server/services/curriculum";
import { addRelationAction, removeRelationAction, saveModuleAction, saveWeightsAction } from "../../curriculum-actions";

export default async function CourseAdmin({ params }: { params: Promise<{ id: string }> }) {
  const sess = await requireStaffPage(["courses.manage", "teaching.own"]);
  const id = (await params).id;
  const [c] = await getDb().select().from(s.courses).where(eq(s.courses.id, id));
  if (!c) notFound();
  const [tree, rel, courses] = await Promise.all([courseTree(id), getDb().select({ rid: s.courseRelations.relatedCourseId, kind: s.courseRelations.kind, code: s.courses.code, title: s.courses.title }).from(s.courseRelations).innerJoin(s.courses, eq(s.courses.id, s.courseRelations.relatedCourseId)).where(eq(s.courseRelations.courseId, id)), lookupOptions("courses")]);
  const admin = can(sess.actor, "courses.manage");
  const w = c.assessmentWeights;
  return (
    <>
      <PageHeader eyebrow={c.code} title={c.title} breadcrumbs={[{ href: "/admin/r/courses", label: "Courses" }, { label: c.code }]} actions={admin ? <Link href={`/admin/r/courses/${id}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Course details & syllabus</Link> : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Modules & lessons" description="Lesson text uses simple Markdown: ## headings, - bullets, > quotes, **bold**. Video and audio are optional links." />
          {tree.mods.length === 0 && <EmptyState title="No modules yet." />}
          {tree.mods.map((m) => (
            <div key={m.id} className="border-b border-line last:border-0">
              <div className="flex items-center justify-between bg-surface px-5 py-2"><p className="text-xs font-bold uppercase tracking-wide text-gold-600">{m.title}</p><Link href={`/admin/courses/${id}/lesson/new?module=${m.id}`} className="text-xs font-semibold text-royal-700 hover:underline">+ Add lesson</Link></div>
              <ul>{tree.lessons.filter((l) => l.moduleId === m.id).map((l) => <li key={l.id}><Link href={`/admin/courses/${id}/lesson/${l.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-royal-50"><span className="font-medium text-navy-800">{l.title}</span><span className="flex gap-2"><Badge tone={l.authority === "INSTITUTIONAL" ? "navy" : "blue"}>{l.authority.toLowerCase()}</Badge><StatusBadge status={l.status} /></span></Link></li>)}</ul>
            </div>
          ))}
          <ActionForm action={saveModuleAction} className="grid gap-3 border-t border-line p-5 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-end" resetOnSuccess><input type="hidden" name="courseId" value={id} /><TextField label="New module title" name="title" required /><TextField label="Summary" name="summary" /><TextField label="Order" name="position" type="number" defaultValue={String(tree.mods.length)} /><SubmitButton size="sm">Add module</SubmitButton></ActionForm>
        </Card>
        <div className="space-y-6">
          {admin && (
            <Card>
              <CardHeader title="Assessment weights (%)" description="Must total 100." />
              <ActionForm action={saveWeightsAction} className="grid grid-cols-2 gap-3 p-5"><input type="hidden" name="courseId" value={id} />{(["assignment", "test", "exam", "practical"] as const).map((k) => <TextField key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} name={k} type="number" defaultValue={String(w[k])} />)}<div className="col-span-2"><SubmitButton size="sm">Save weights</SubmitButton></div></ActionForm>
            </Card>
          )}
          <Card>
            <CardHeader title="Prerequisites & co-requisites" />
            <ul className="divide-y divide-line">{rel.map((r) => <li key={r.rid + r.kind} className="flex items-center justify-between px-5 py-2.5 text-sm"><span><Badge tone={r.kind === "PREREQUISITE" ? "amber" : "blue"}>{r.kind.toLowerCase()}</Badge> {r.code} {r.title}</span>{admin && <Confirm label="Remove" title="Remove this relation?" variant="danger-outline" run={async () => { "use server"; return removeRelationAction(id, r.rid, r.kind); }} />}</li>)}{rel.length === 0 && <li className="px-5 py-3 text-sm text-muted">None.</li>}</ul>
            {admin && <ActionForm action={addRelationAction} className="space-y-3 border-t border-line p-5" resetOnSuccess><input type="hidden" name="courseId" value={id} /><SelectField label="Course" name="relatedId" options={courses.filter((o) => o.value !== id)} required /><SelectField label="Type" name="kind" options={[{ value: "PREREQUISITE", label: "Prerequisite" }, { value: "COREQUISITE", label: "Co-requisite" }]} /><SubmitButton size="sm">Add</SubmitButton></ActionForm>}
          </Card>
        </div>
      </div>
    </>
  );
}
