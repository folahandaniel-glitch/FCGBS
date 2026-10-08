import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { assertCanTeach } from "@/server/services/academics";
import { offeringRoster } from "@/server/services/teaching";
import { attendanceAction, computeResultsAction, createAssessmentAction, publishAssessmentAction, setComponentsAction, setMeetingUrlAction, submitResultsAction } from "../actions";

export default async function OfferingPage({ params }: { params: Promise<{ offeringId: string }> }) {
  const sess = await requireStaffPage(["teaching.own", "teaching.any"]);
  const id = (await params).offeringId;
  const off = await assertCanTeach(sess.actor, id);
  const db = getDb();
  const [course] = await db.select().from(s.courses).where(eq(s.courses.id, off.courseId));
  const [roster, asses, results] = await Promise.all([
    offeringRoster(sess.actor, id),
    db.select().from(s.assessments).where(eq(s.assessments.offeringId, id)).orderBy(asc(s.assessments.createdAt)),
    db.select({ r: s.results, regId: s.courseRegistrations.id, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).leftJoin(s.results, eq(s.results.registrationId, s.courseRegistrations.id)).where(and(eq(s.courseRegistrations.offeringId, id), eq(s.courseRegistrations.source, "REGISTERED"))).orderBy(asc(s.users.lastName)),
  ]);
  const draftIds = results.filter((x) => x.r?.status === "DRAFT" && x.r.total !== null).map((x) => x.r!.id);
  const w = course.assessmentWeights;
  const canSubmit = can(sess.actor, "grades.enter");
  return (
    <>
      <PageHeader eyebrow={course.code} title={course.title} description={`${roster.length} students · weights: assignments ${w.assignment}%, tests ${w.test}%, exam ${w.exam}%${w.practical ? `, practical ${w.practical}%` : ""}`} breadcrumbs={[{ href: "/teach", label: "My courses" }, { label: course.code }]} actions={<Link href={`/teach/questions/${course.id}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Question bank</Link>} />

      <Card>
        <CardHeader title="Assessments" description="Assignments, tests and examinations. Examinations are auto-marked from the approved question bank." />
        {asses.length === 0 ? <EmptyState title="No assessments yet." /> : (
          <Table><thead><tr><Th>Title</Th><Th>Type</Th><Th>Due / closes</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {asses.map((a) => (
              <tr key={a.id}><Td className="font-semibold">{a.title}</Td><Td><Badge tone="blue">{a.kind.toLowerCase()}</Badge></Td><Td className="text-xs">{(a.dueAt ?? a.closesAt)?.toLocaleString("en-GB") ?? "—"}</Td><Td><StatusBadge status={a.status} /></Td>
                <Td className="space-x-2 whitespace-nowrap">{a.status === "DRAFT" && <Do label="Publish" run={async () => { "use server"; return publishAssessmentAction(a.id, id); }} />}{a.status !== "DRAFT" && <Link href={`/teach/${id}/grade/${a.id}`} className="text-sm font-semibold text-royal-700 hover:underline">Grade</Link>}</Td></tr>
            ))}
          </tbody></Table>
        )}
        <details className="border-t border-line p-5">
          <summary className="cursor-pointer text-sm font-semibold text-royal-700">Create an assessment</summary>
          <ActionForm action={createAssessmentAction} className="mt-4 space-y-3" resetOnSuccess>
            <input type="hidden" name="offeringId" value={id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Type" name="kind" options={[{ value: "ASSIGNMENT", label: "Assignment" }, { value: "TEST", label: "Test" }, { value: "QUIZ", label: "Quiz" }, { value: "EXAM", label: "Examination" }, { value: "PRACTICAL", label: "Practical" }]} required />
              <TextField label="Title" name="title" required className="sm:col-span-2" />
            </div>
            <TextAreaField label="Instructions" name="instructions" rows={3} />
            <div className="grid gap-3 sm:grid-cols-4">
              <TextField label="Opens" name="opensAt" type="datetime-local" /><TextField label="Due" name="dueAt" type="datetime-local" /><TextField label="Closes" name="closesAt" type="datetime-local" /><TextField label="Maximum score" name="maxScore" type="number" defaultValue="100" />
              <TextField label="Time limit (min, exams)" name="timeLimitMin" type="number" /><TextField label="Questions drawn" name="drawCount" type="number" /><TextField label="Attempts" name="maxAttempts" type="number" defaultValue="1" /><TextField label="Late penalty %" name="latePenaltyPct" type="number" defaultValue="10" />
            </div>
            <SelectField label="AI policy" name="aiPolicy" options={[{ value: "DISCLOSE", label: "Allowed with disclosure" }, { value: "PROHIBITED", label: "Not permitted" }, { value: "ALLOWED", label: "Allowed" }]} />
            <div className="flex flex-wrap gap-5"><CheckboxField name="lateAllowed" label="Accept late work (with penalty)" /><CheckboxField name="resubmission" label="Allow resubmission" /></div>
            <SubmitButton>Save draft</SubmitButton>
          </ActionForm>
        </details>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Results" description="Calculate from graded work, adjust components if needed, then submit for review. Once submitted, results cannot be edited." action={<Do label="Calculate results" run={async () => { "use server"; return computeResultsAction(id); }} />} />
        {results.length === 0 ? <EmptyState title="No students are registered yet." /> : (
          <Table><thead><tr><Th>Student</Th><Th>Assign.</Th><Th>Test</Th><Th>Exam</Th><Th>Practical</Th><Th>Total</Th><Th>Grade</Th><Th>Status</Th></tr></thead><tbody>
            {results.map((x) => (
              <tr key={x.regId}><Td>{x.last} {x.first}<span className="block font-mono text-[0.65rem] text-muted">{x.num}</span></Td>
                {x.r?.status === "DRAFT" ? (
                  <Td colSpan={4}><ActionForm action={setComponentsAction} className="flex items-center gap-1" showInlineError={false}><input type="hidden" name="resultId" value={x.r.id} />{(["assignment", "test", "exam", "practical"] as const).map((k) => <input key={k} name={k} type="number" min={0} max={100} step="0.1" defaultValue={x.r!.components[k] ?? ""} aria-label={k} className="w-16 rounded-lg border border-line px-2 py-1 text-xs" />)}<button className="rounded-lg bg-surface px-2 py-1 text-xs font-semibold ring-1 ring-line">Save</button></ActionForm></Td>
                ) : (<><Td>{x.r?.components?.assignment ?? "—"}</Td><Td>{x.r?.components?.test ?? "—"}</Td><Td>{x.r?.components?.exam ?? "—"}</Td><Td>{x.r?.components?.practical ?? "—"}</Td></>)}
                <Td className="font-bold">{x.r?.total ?? "—"}</Td><Td>{x.r?.grade ?? "—"}</Td><Td>{x.r ? <StatusBadge status={x.r.status} /> : <Badge>Not calculated</Badge>}</Td></tr>
            ))}
          </tbody></Table>
        )}
        {canSubmit && draftIds.length > 0 && <div className="flex items-center justify-between gap-3 border-t border-line p-5"><p className="text-sm text-muted">{draftIds.length} draft result(s) ready. After submission the HOD reviews, then the Registrar or Examination Officer approves — you cannot approve your own results.</p><Do variant="primary" size="md" label="Submit for review" run={async () => { "use server"; return submitResultsAction(draftIds, id); }} /></div>}
        {!canSubmit && <Alert tone="info" className="m-5">You can prepare results, but only a lecturer with grading rights can submit them.</Alert>}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Take attendance" />
          {roster.length === 0 ? <EmptyState title="No students registered." /> : (
            <ActionForm action={attendanceAction} className="space-y-3 p-5" resetOnSuccess>
              <input type="hidden" name="offeringId" value={id} />
              <div className="grid gap-3 sm:grid-cols-3"><TextField label="Date" name="heldOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><SelectField label="Kind" name="kind" options={[{ value: "LECTURE", label: "Lecture" }, { value: "EXAMINATION", label: "Examination" }, { value: "PRACTICUM", label: "Practicum" }]} /><TextField label="Topic" name="topic" /></div>
              <ul className="divide-y divide-line rounded-xl border border-line">{roster.map((r) => <li key={r.regId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><span>{r.last} {r.first}</span><select name={`a_${r.regId}`} defaultValue="PRESENT" className="rounded-lg border border-line px-2 py-1 text-xs" aria-label={`Attendance for ${r.first} ${r.last}`}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="EXCUSED">Excused</option><option value="ABSENT">Absent</option></select></li>)}</ul>
              <SubmitButton size="sm">Save attendance</SubmitButton>
            </ActionForm>
          )}
        </Card>
        <Card>
          <CardHeader title="Class list" description={`${roster.length} registered`} />
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">{roster.map((r) => <li key={r.regId} className="px-5 py-2.5 text-sm">{r.last} {r.first} <span className="font-mono text-xs text-muted">{r.number}</span></li>)}</ul>
          <ActionForm action={setMeetingUrlAction} className="flex gap-2 border-t border-line p-4"><input type="hidden" name="offeringId" value={id} /><input name="url" defaultValue={off.meetingUrl ?? ""} placeholder="https:// live class link" aria-label="Live class link" className="block w-full rounded-xl border border-line px-3 py-2 text-sm" /><SubmitButton size="sm" variant="secondary">Save link</SubmitButton></ActionForm>
        </Card>
      </div>
    </>
  );
}
