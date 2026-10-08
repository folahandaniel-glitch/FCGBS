import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { requireStaffPage } from "@/server/http";
import { submissionsFor } from "@/server/services/teaching";
import { gradeAttemptAction, gradeSubmissionAction } from "../../../actions";

export default async function GradePage({ params }: { params: Promise<{ offeringId: string; assessmentId: string }> }) {
  const sess = await requireStaffPage(["teaching.own", "teaching.any"]);
  const { offeringId, assessmentId } = await params;
  const { assessment: a, subs, attempts } = await submissionsFor(sess.actor, assessmentId);
  const isExam = ["EXAM", "TEST", "QUIZ"].includes(a.kind);
  return (
    <>
      <PageHeader title={`Grade: ${a.title}`} description={`Maximum score ${a.maxScore}`} breadcrumbs={[{ href: "/teach", label: "My courses" }, { href: `/teach/${offeringId}`, label: "Course" }, { label: "Grade" }]} />
      {!isExam && (subs.length === 0 ? <Card><EmptyState title="No submissions yet." /></Card> : subs.map((x) => (
        <Card key={x.id} className="mb-4">
          <CardHeader title={`${x.last} ${x.first}`} description={x.number} action={<span className="flex gap-2">{x.late && <Badge tone="red">Late</Badge>}<Badge tone={x.status === "GRADED" ? "green" : "amber"}>{x.status.toLowerCase()}</Badge></span>} />
          <div className="space-y-3 p-5">
            {x.text && <p className="whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm">{x.text}</p>}
            {x.assetId && <a className="text-sm font-semibold text-royal-700 underline" href={`/api/v1/assets/${x.assetId}`}>Download attachment</a>}
            {x.aiUsed && <Alert tone="warning" title="AI use disclosed">{x.aiDisclosure}</Alert>}
            <ActionForm action={gradeSubmissionAction} className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"><input type="hidden" name="submissionId" value={x.id} /><TextField label="Score" name="score" type="number" step="0.1" min="0" max={a.maxScore} defaultValue={x.score ?? ""} required /><TextAreaField label="Feedback" name="feedback" rows={2} defaultValue={x.feedback ?? ""} /><SubmitButton size="sm">Save grade</SubmitButton></ActionForm>
          </div>
        </Card>
      )))}
      {isExam && (attempts.length === 0 ? <Card><EmptyState title="No attempts yet." /></Card> : attempts.map((t) => {
        const manual = t.snapshot.filter((q) => q.type === "ESSAY" || q.type === "SHORT");
        const flags = t.events.length;
        return (
          <Card key={t.id} className="mb-4">
            <CardHeader title={`${t.last} ${t.first}`} description={t.number} action={<span className="flex gap-2"><Badge tone={t.status === "GRADED" ? "green" : "amber"}>{t.status.toLowerCase()}</Badge>{flags > 0 && <Badge tone="red">{flags} activity flag(s)</Badge>}</span>} />
            <div className="space-y-3 p-5 text-sm">
              <p>Auto score: <strong>{t.autoScore ?? "—"}</strong> · Final: <strong>{t.finalScore ?? "pending"}</strong></p>
              {flags > 0 && <p className="text-xs text-muted">Recorded activity (for your review, not proof of misconduct): {[...new Set(t.events.map((e) => e.t))].join(", ")}</p>}
              {manual.length > 0 && (
                <ActionForm action={gradeAttemptAction} className="space-y-3">
                  <input type="hidden" name="attemptId" value={t.id} />
                  {manual.map((q) => <div key={q.id} className="rounded-xl bg-surface p-3"><p className="font-semibold">{q.stem}</p><p className="mt-1 whitespace-pre-wrap text-muted">{String(t.answers[q.id] ?? "(no answer)")}</p><TextField label={`Marks (max ${q.marks})`} name={`m_${q.id}`} type="number" step="0.5" min="0" max={q.marks} className="mt-2 max-w-40" /></div>)}
                  <SubmitButton size="sm">Save marks</SubmitButton>
                </ActionForm>
              )}
            </div>
          </Card>
        );
      }))}
    </>
  );
}
