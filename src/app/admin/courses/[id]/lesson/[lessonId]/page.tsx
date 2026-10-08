import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Markdown } from "@/components/markdown";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { saveLessonAction } from "../../../../curriculum-actions";

export default async function LessonEditor({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ module?: string; saved?: string }> }) {
  const sess = await requireStaffPage(["courses.manage", "teaching.own"]);
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const db = getDb();
  const [course] = await db.select().from(s.courses).where(eq(s.courses.id, id));
  if (!course) notFound();
  const mods = await db.select().from(s.modules).where(eq(s.modules.courseId, id)).orderBy(asc(s.modules.position));
  const isNew = lessonId === "new";
  const [lesson] = isNew ? [null] : await db.select().from(s.lessons).where(and(eq(s.lessons.id, lessonId), eq(s.lessons.courseId, id)));
  if (!isNew && !lesson) notFound();
  const canInst = can(sess.actor, "policies.approve");
  return (
    <>
      <PageHeader eyebrow={course.code} title={isNew ? "New lesson" : lesson!.title} breadcrumbs={[{ href: `/admin/courses/${id}`, label: course.title }, { label: isNew ? "New lesson" : "Edit lesson" }]} />
      {sp.saved && <Alert tone="success" className="mb-4">Saved.</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <ActionForm action={saveLessonAction} className="space-y-4">
            <input type="hidden" name="courseId" value={id} /><input type="hidden" name="id" value={lessonId} />
            <SelectField label="Module" name="moduleId" defaultValue={lesson?.moduleId ?? sp.module ?? mods[0]?.id ?? ""} options={mods.map((m) => ({ value: m.id, label: m.title }))} required />
            <TextField label="Title" name="title" defaultValue={lesson?.title} required />
            <TextField label="Summary" name="summary" defaultValue={lesson?.summary ?? ""} />
            <TextAreaField label="Lesson text (Markdown)" name="body" rows={18} defaultValue={lesson?.body ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2"><TextField label="Video link (YouTube/Vimeo, https)" name="videoUrl" defaultValue={lesson?.videoUrl ?? ""} /><TextField label="Audio link (https)" name="audioUrl" defaultValue={lesson?.audioUrl ?? ""} /><TextField label="Reading time (min)" name="readMinutes" type="number" defaultValue={String(lesson?.readMinutes ?? 8)} /><TextField label="Order" name="position" type="number" defaultValue={String(lesson?.position ?? 0)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Content authority" name="authority" defaultValue={lesson?.authority ?? "ACADEMIC"} options={[{ value: "ACADEMIC", label: "Approved academic content" }, ...(canInst ? [{ value: "INSTITUTIONAL", label: "Official institutional teaching" }] : []), { value: "LECTURER", label: "Lecturer material" }]} hint="Official doctrine can only be published by the Academic Board / Founder." />
              <SelectField label="Status" name="status" defaultValue={lesson?.status ?? "PUBLISHED"} options={["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.toLowerCase() }))} />
            </div>
            <SubmitButton pendingText="Saving…">Save lesson</SubmitButton>
          </ActionForm>
        </Card>
        <Card className="p-5"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-gold-600">Preview</p><Markdown source={lesson?.body ?? "Start typing to see a preview after saving."} /></Card>
      </div>
    </>
  );
}
