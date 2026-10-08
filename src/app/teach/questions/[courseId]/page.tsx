import { desc, eq } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { addQuestionAction, reviewQuestionAction } from "../../actions";

export default async function QuestionBank({ params }: { params: Promise<{ courseId: string }> }) {
  const sess = await requireStaffPage(["questions.manage", "questions.approve"]);
  const courseId = (await params).courseId;
  const [course] = await getDb().select().from(s.courses).where(eq(s.courses.id, courseId));
  const qs = await getDb().select().from(s.questions).where(eq(s.questions.courseId, courseId)).orderBy(desc(s.questions.createdAt)).limit(200);
  const approver = can(sess.actor, "questions.approve");
  return (
    <>
      <PageHeader eyebrow="Question bank" title={course?.title ?? "Course"} description="Only approved questions are drawn into examinations. Lecturers' questions need approval by someone else." />
      <Card className="mb-6">
        <CardHeader title="Add a question" />
        <ActionForm action={addQuestionAction} className="space-y-3 p-5" resetOnSuccess>
          <input type="hidden" name="courseId" value={courseId} />
          <div className="grid gap-3 sm:grid-cols-3"><SelectField label="Type" name="type" options={[{ value: "MCQ", label: "Multiple choice" }, { value: "TRUE_FALSE", label: "True / false" }, { value: "SHORT", label: "Short answer (auto-matched)" }, { value: "ESSAY", label: "Essay (manual)" }]} /><TextField label="Marks" name="marks" type="number" defaultValue="1" /></div>
          <TextAreaField label="Question" name="stem" rows={3} required />
          <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <TextField key={i} label={`Option ${i} (multiple choice)`} name={`o${i}`} />)}</div>
          <TextField label="Correct answer" name="answer" required hint="Multiple choice: the option number (1–4). True/false: true or false. Short answer: accepted answers separated by |. Essay: marking guide." />
          <SubmitButton>Add question</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <CardHeader title={`Questions (${qs.length})`} />
        {qs.length === 0 ? <EmptyState title="No questions yet." /> : (
          <ul className="divide-y divide-line">
            {qs.map((q) => (
              <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                <span className="max-w-2xl"><Badge tone="blue">{q.type.toLowerCase().replace("_", "/")}</Badge> {q.stem}</span>
                <span className="flex items-center gap-2"><StatusBadge status={q.status} />{approver && q.status !== "APPROVED" && <Do label="Approve" run={async () => { "use server"; return reviewQuestionAction(q.id, true, courseId); }} />}{approver && q.status === "APPROVED" && <Do label="Archive" run={async () => { "use server"; return reviewQuestionAction(q.id, false, courseId); }} />}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
