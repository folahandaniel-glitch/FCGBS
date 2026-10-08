import { desc, eq } from "drizzle-orm";
import { Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField } from "@/components/ui/form";
import { Confirm, Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { decideAppealAction, integrityStepAction, reportIntegrityAction } from "../ops-actions";

const KINDS = ["PLAGIARISM", "CHEATING", "FABRICATION", "FALSE_CITATION", "COLLABORATION", "EXAM_MISCONDUCT", "IDENTITY_FRAUD", "AI_MISUSE", "OTHER"];

export default async function IntegrityAdmin() {
  const sess = await requireStaffPage(["integrity.manage", "appeals.manage"]);
  const db = getDb();
  const manage = can(sess.actor, "integrity.manage");
  const cases = manage ? await db.select({ c: s.integrityCases, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber }).from(s.integrityCases).innerJoin(s.students, eq(s.students.id, s.integrityCases.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).orderBy(desc(s.integrityCases.createdAt)).limit(100) : [];
  const appeals = can(sess.actor, "appeals.manage") ? await db.select({ a: s.academicAppeals, code: s.courses.code, first: s.users.firstName, last: s.users.lastName }).from(s.academicAppeals).innerJoin(s.results, eq(s.results.id, s.academicAppeals.resultId)).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).innerJoin(s.students, eq(s.students.id, s.academicAppeals.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).orderBy(desc(s.academicAppeals.createdAt)).limit(100) : [];
  const students = manage ? await db.select({ id: s.students.id, f: s.users.firstName, l: s.users.lastName, n: s.students.studentNumber }).from(s.students).innerJoin(s.users, eq(s.users.id, s.students.userId)).orderBy(s.users.lastName).limit(500) : [];
  return (
    <>
      <PageHeader title="Integrity & appeals" description="Plagiarism, cheating, fabrication, false citation, unauthorised collaboration, exam misconduct, identity fraud and unauthorised AI use. Every step is audited; students may appeal." />
      {manage && (
        <>
          <Card className="mb-6"><CardHeader title="Cases" />
            {cases.length === 0 ? <EmptyState title="No cases." /> : <ul className="divide-y divide-line">{cases.map(({ c, first, last, num }) => (
              <li key={c.id} className="space-y-2 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{c.caseNo}</strong> · {c.kind.replace(/_/g, " ").toLowerCase()} · {last} {first} <span className="font-mono text-xs text-muted">{num}</span></span><StatusBadge status={c.status} /></div>
                <p className="text-muted">{c.description}</p>
                {c.decision && <p className="rounded-lg bg-gold-50 p-2 text-xs"><strong>Decision:</strong> {c.decision}{c.sanction && ` · Sanction: ${c.sanction}`}</p>}
                <div className="flex flex-wrap gap-2">
                  {c.status === "REPORTED" && <Do label="Open investigation" run={async () => { "use server"; return integrityStepAction(c.id, "INVESTIGATE"); }} />}
                  {(c.status === "INVESTIGATING" || c.status === "APPEALED") && <Confirm label="Record decision" title="Record the decision" description="State the findings. Sanctions are proportionate and may be appealed." reason confirmVariant="primary" run={async ({ reason }) => { "use server"; return integrityStepAction(c.id, "DECIDE", reason, ""); }} />}
                  {c.status === "DECIDED" && <Do label="Close case" run={async () => { "use server"; return integrityStepAction(c.id, "CLOSE"); }} />}
                </div>
              </li>))}</ul>}
          </Card>
          <Card className="mb-6"><CardHeader title="Report a case" />
            <ActionForm action={reportIntegrityAction} className="space-y-3 p-5" resetOnSuccess>
              <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Student" name="studentId" options={students.map((x) => ({ value: x.id, label: `${x.l} ${x.f} (${x.n})` }))} required /><SelectField label="Type" name="kind" options={KINDS.map((k) => ({ value: k, label: k.replace(/_/g, " ").toLowerCase() }))} required /></div>
              <TextAreaField label="What happened (include evidence references)" name="description" rows={4} required />
              <SubmitButton size="sm">Report</SubmitButton>
            </ActionForm></Card>
        </>
      )}
      {can(sess.actor, "appeals.manage") && (
        <Card><CardHeader title="Academic appeals" description="Considered by the Academic Board. An upheld appeal leads to a corrected result through the amendment process." />
          {appeals.length === 0 ? <EmptyState title="No appeals." /> : <ul className="divide-y divide-line">{appeals.map(({ a, code, first, last }) => (
            <li key={a.id} className="space-y-2 px-5 py-4 text-sm"><div className="flex items-center justify-between"><span><strong>{code}</strong> · {last} {first}</span><StatusBadge status={a.status} /></div><p className="text-muted">{a.reason}</p>{a.decisionNote && <p className="rounded-lg bg-gold-50 p-2 text-xs">{a.decisionNote}</p>}
              {["SUBMITTED", "UNDER_REVIEW"].includes(a.status) && <div className="flex gap-2"><Confirm label="Uphold" title="Uphold this appeal?" reason confirmVariant="primary" run={async ({ reason }) => { "use server"; return decideAppealAction(a.id, true, reason); }} /><Confirm label="Dismiss" title="Dismiss this appeal?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return decideAppealAction(a.id, false, reason); }} /></div>}</li>))}</ul>}
        </Card>
      )}
    </>
  );
}
