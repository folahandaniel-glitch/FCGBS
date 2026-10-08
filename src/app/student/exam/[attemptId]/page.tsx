import { redirect } from "next/navigation";
import { ExamRunner } from "@/components/student/exam-runner";
import { requireLearnerPage } from "@/server/http";
import { closeAttempt, getAttemptForTaking } from "@/server/services/assessments";
import { reqCtx } from "@/server/http";
import { PageHeader } from "@/components/ui/primitives";

export default async function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const sess = await requireLearnerPage();
  const { attemptId } = await params;
  const { attempt, assessment, remainingMs } = await getAttemptForTaking(sess.actor, attemptId);
  if (attempt.status !== "IN_PROGRESS") redirect("/student/results");
  if (remainingMs <= 0) { await closeAttempt(attemptId, "AUTO", await reqCtx()); redirect("/student/results?submitted=1"); }
  return (
    <>
      <PageHeader title={assessment.title} description="Answer all questions. Your work autosaves; the server clock is final." />
      <ExamRunner attemptId={attemptId} questions={attempt.snapshot} initial={attempt.answers} remainingMs={remainingMs} />
    </>
  );
}
