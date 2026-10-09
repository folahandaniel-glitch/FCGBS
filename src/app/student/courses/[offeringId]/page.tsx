import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { attendancePct, courseForLearner } from "@/server/services/learner";
import { evaluateCourseAction } from "../../actions";
import { MaterialList } from "@/components/teachings/materials";
import { materialsFor } from "@/server/services/teachings";

export default async function CourseDetail({ params }: { params: Promise<{ offeringId: string }> }) {
  const sess = await requireLearnerPage();
  const c = await courseForLearner(sess.user.id, (await params).offeringId);
  const att = await attendancePct(c.reg.id, c.offering.id);
  const mats = (await materialsFor({ courseId: c.course.id }, true)).filter((m) => !m.teachingId);
  const doneCount = c.lessons.filter((l) => c.done.has(l.id)).length;
  return (
    <>
      <PageHeader eyebrow={`${c.course.code} · ${c.term.name}`} title={c.course.title} description={c.course.description ?? undefined} breadcrumbs={[{ href: "/student/courses", label: "My courses" }, { label: c.course.code }]} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Lecturer</p><p className="mt-1 font-bold text-navy-800">{c.lecturer ?? "To be assigned"}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Lesson progress</p><p className="mt-1 font-bold text-navy-800">{doneCount} / {c.lessons.length}</p><div className="mt-2"><ProgressBar value={c.lessons.length ? (doneCount / c.lessons.length) * 100 : 0} /></div></Card>
        <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Attendance</p><p className="mt-1 font-bold text-navy-800">{att === null ? "Not recorded yet" : `${att}%`}</p>{c.offering.meetingUrl && <a className="mt-1 block text-xs font-semibold text-royal-700 underline" href={c.offering.meetingUrl} rel="noopener noreferrer" target="_blank">Join live class</a>}</Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Lessons" />
          {c.modules.map((m) => (
            <div key={m.id} className="border-b border-line last:border-0"><p className="bg-surface px-5 py-2 text-xs font-bold uppercase tracking-wide text-gold-600">{m.title}</p>
              <ul>{c.lessons.filter((l) => l.moduleId === m.id).map((l) => <li key={l.id}><Link href={`/student/learn/${l.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-royal-50">{c.done.has(l.id) ? <CheckCircle2 className="size-5 text-success-600" aria-hidden /> : <Circle className="size-5 text-line" aria-hidden />}<span className="flex-1 font-medium text-navy-800">{l.title}</span><span className="text-xs text-muted">{l.readMinutes} min</span></Link></li>)}</ul></div>
          ))}
        </Card>
        <div className="space-y-6">
          {mats.length > 0 && <MaterialList items={mats} title="Study materials" />}
          <Card>
            <CardHeader title="Assignments & examinations" />
            {c.assessments.length === 0 ? <p className="p-5 text-sm text-muted">No assignments have been published.</p> : <ul className="divide-y divide-line">{c.assessments.map((a) => { const sub = c.subs.find((x) => x.assessmentId === a.id); return <li key={a.id} className="px-5 py-3 text-sm"><Link href={`/student/assessments/${a.id}`} className="font-semibold text-navy-800 hover:underline">{a.title}</Link><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted"><Badge tone="blue">{a.kind.toLowerCase()}</Badge>{a.dueAt && <span>Due {a.dueAt.toLocaleDateString("en-GB")}</span>}{sub && <Badge tone={sub.status === "GRADED" ? "green" : "amber"}>{sub.status === "GRADED" ? `Score ${sub.score}` : "Submitted"}</Badge>}</div></li>; })}</ul>}
          </Card>
          <Card>
            <CardHeader title="Rate this course" description="Anonymous to the lecturer; read by quality assurance." />
            <ActionForm action={evaluateCourseAction} className="space-y-3 p-5" resetOnSuccess>
              <input type="hidden" name="offeringId" value={c.offering.id} />
              <label className="block text-sm font-semibold text-navy-800">Rating<select name="rating" className="mt-1.5 block w-full rounded-xl border border-line px-3 py-2.5" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {["", "Poor", "Fair", "Good", "Very good", "Excellent"][n]}</option>)}</select></label>
              <TextAreaField label="Comment (optional)" name="comment" rows={3} />
              <SubmitButton size="sm">Send feedback</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
