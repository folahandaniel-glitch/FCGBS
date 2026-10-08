import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { StartExam } from "@/components/student/start-exam";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { submitAssignmentAction } from "../../actions";

const AI: Record<string, string> = { PROHIBITED: "AI use is not permitted for this work.", DISCLOSE: "AI may be used only as the school policy allows, and you must disclose how you used it.", ALLOWED: "AI use is allowed for this work. Never submit fabricated citations." };

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const sess = await requireLearnerPage();
  const id = (await params).id;
  const db = getDb();
  const [row] = await db.select({ a: s.assessments, reg: s.courseRegistrations.id, course: s.courses.title }).from(s.assessments).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.offeringId, s.assessments.offeringId)).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).where(and(eq(s.assessments.id, id), eq(s.students.userId, sess.user.id), eq(s.assessments.status, "PUBLISHED")));
  if (!row) notFound();
  const a = row.a;
  const isExam = ["EXAM", "TEST", "QUIZ"].includes(a.kind);
  const [sub] = await db.select().from(s.submissions).where(and(eq(s.submissions.assessmentId, id), eq(s.submissions.registrationId, row.reg)));
  const attempts = await db.select({ id: s.examAttempts.id, no: s.examAttempts.attemptNo, status: s.examAttempts.status, score: s.examAttempts.finalScore }).from(s.examAttempts).where(and(eq(s.examAttempts.assessmentId, id), eq(s.examAttempts.registrationId, row.reg)));
  const live = attempts.find((x) => x.status === "IN_PROGRESS");
  return (
    <>
      <PageHeader eyebrow={row.course} title={a.title} description={a.instructions ?? undefined} actions={<Badge tone="blue">{a.kind.toLowerCase()}</Badge>} breadcrumbs={[{ href: "/student/courses", label: "My courses" }, { label: a.title }]} />
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted">{a.dueAt && <span>Due: <strong className="text-ink">{a.dueAt.toLocaleString("en-GB")}</strong></span>}{a.timeLimitMin && <span>Time limit: <strong className="text-ink">{a.timeLimitMin} min</strong></span>}<span>Maximum score: <strong className="text-ink">{a.maxScore}</strong></span>{a.lateAllowed && <span>Late penalty {a.latePenaltyPct}%</span>}</div>
      <Alert tone="info" className="mb-4" title="AI policy">{AI[a.aiPolicy]}</Alert>
      {isExam ? (
        <Card><CardHeader title="Online examination" description={`Attempts allowed: ${a.maxAttempts}. Questions are drawn at random; the timer is controlled by the server.`} />
          <div className="space-y-3 p-5">
            {attempts.map((t) => <p key={t.id} className="text-sm">Attempt {t.no}: <Badge tone={t.status === "GRADED" ? "green" : "amber"}>{t.status.toLowerCase().replace("_", " ")}</Badge> {t.status === "GRADED" && t.score !== null && <>score {t.score}/{a.maxScore}</>}</p>)}
            {(live || attempts.length < a.maxAttempts) && <StartExam assessmentId={id} resume={Boolean(live)} />}
          </div></Card>
      ) : (
        <Card><CardHeader title={sub ? "Your submission" : "Submit your work"} description={sub ? `Submitted ${sub.submittedAt.toLocaleString("en-GB")}${sub.isLate ? " (late)" : ""}` : undefined} />
          <div className="space-y-4 p-5">
            {sub?.status === "GRADED" && <Alert tone="success" title={`Score: ${sub.score} / ${a.maxScore}`}>{sub.feedback}</Alert>}
            {sub?.text && <p className="whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm">{sub.text}</p>}
            {(!sub || (a.resubmission && sub.status !== "GRADED")) && (
              <ActionForm action={submitAssignmentAction} className="space-y-4">
                <input type="hidden" name="assessmentId" value={id} />
                <TextAreaField label="Your answer" name="text" rows={10} defaultValue={sub?.text ?? ""} />
                <label className="block text-sm font-semibold text-navy-800">Or attach a file (PDF, Word)<input type="file" name="file" accept=".pdf,.docx,.doc,.png,.jpg" className="mt-1.5 block text-sm" /></label>
                {a.aiPolicy !== "PROHIBITED" && <><CheckboxField name="aiUsed" label="I used AI tools in preparing this work" /><TextField label="If so, describe how (required when AI was used)" name="aiDisclosure" /></>}
                <SubmitButton pendingText="Submitting…">{sub ? "Resubmit" : "Submit"}</SubmitButton>
              </ActionForm>
            )}
          </div></Card>
      )}
    </>
  );
}
