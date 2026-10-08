"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startExamAction } from "@/app/student/actions";
import { buttonClass } from "../ui/primitives";

export function StartExam({ assessmentId, resume }: { assessmentId: string; resume: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <button className={buttonClass("gold", "lg")} disabled={pending} onClick={() => start(async () => { const r = await startExamAction(assessmentId); if (r.ok && r.data) router.push(`/student/exam/${r.data.attemptId}`); else if (!r.ok) setErr(r.error); })}>{resume ? "Resume examination" : "Start examination"}</button>
      {!resume && <p className="mt-2 text-xs text-muted">Once you start, the timer runs on the server and cannot be paused.</p>}
      {err && <p role="alert" className="mt-2 text-sm text-danger-600">{err}</p>}
    </div>
  );
}
