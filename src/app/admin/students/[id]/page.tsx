import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, CardHeader, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Confirm, Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { lookupOptions } from "@/server/admin-resources";
import { enrolmentSummary } from "@/server/services/academics";
import { evaluateGraduation } from "@/server/services/credentials";
import { assignMentorAction, createTranscriptAction, dropOnBehalfAction, grantCreditAction, registerOnBehalfAction, setStudentStatusAction, transcriptStatusAction } from "../../ops-actions";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const sess = await requireStaffPage("students.view");
  const id = (await params).id;
  const db = getDb();
  const [st] = await db.select({ st: s.students, u: s.users }).from(s.students).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(eq(s.students.id, id));
  if (!st) notFound();
  const enrols = await db.select({ e: s.enrolments, programme: s.programmes.name }).from(s.enrolments).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).where(eq(s.enrolments.studentId, id)).orderBy(desc(s.enrolments.createdAt));
  const [courses, mentors] = await Promise.all([lookupOptions("courses"), db.select({ id: s.users.id, n: s.users.firstName, l: s.users.lastName }).from(s.users).innerJoin(s.userRoles, eq(s.userRoles.userId, s.users.id)).innerJoin(s.roles, eq(s.roles.id, s.userRoles.roleId)).where(eq(s.roles.key, "mentor"))]);
  const offerings = await db.select({ id: s.offerings.id, code: s.courses.code, title: s.courses.title, term: s.academicTerms.name }).from(s.offerings).innerJoin(s.courses, eq(s.courses.id, s.offerings.courseId)).innerJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId)).where(eq(s.offerings.status, "OPEN"));
  const edit = can(sess.actor, "students.status");
  const reg = can(sess.actor, "registration.manage");
  return (
    <>
      <PageHeader eyebrow={st.st.studentNumber} title={`${st.u.firstName} ${st.u.lastName}`} description={st.u.email} breadcrumbs={[{ href: "/admin/students", label: "Students" }, { label: st.st.studentNumber }]} actions={<span className="flex gap-2"><StatusBadge status={st.st.status} /><Badge tone="blue">{st.st.standing.replace(/_/g, " ").toLowerCase()}</Badge></span>} />
      {await Promise.all(enrols.map(async (en) => {
        const sum = await enrolmentSummary(en.e.id);
        const regs = await db.select({ id: s.courseRegistrations.id, code: s.courses.code, title: s.courses.title, status: s.courseRegistrations.status, source: s.courseRegistrations.source, rs: s.results.status, grade: s.results.grade }).from(s.courseRegistrations).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).leftJoin(s.results, eq(s.results.registrationId, s.courseRegistrations.id)).where(eq(s.courseRegistrations.enrolmentId, en.e.id));
        const trans = await db.select().from(s.transcripts).where(eq(s.transcripts.enrolmentId, en.e.id)).orderBy(desc(s.transcripts.createdAt));
        const ev = en.e.status === "ACTIVE" && can(sess.actor, "graduation.registrar") ? await evaluateGraduation(en.e.id) : null;
        return (
          <Card key={en.e.id} className="mb-6">
            <CardHeader title={en.programme} description={`CGPA ${sum.cgpa.toFixed(2)} · ${sum.creditsEarned} credits · ${en.e.status.toLowerCase()}`} />
            <Table><thead><tr><Th>Course</Th><Th>Source</Th><Th>Status</Th><Th>Result</Th><Th /></tr></thead><tbody>{regs.map((r) => <tr key={r.id}><Td className="text-xs"><span className="font-mono font-bold">{r.code}</span> {r.title}</Td><Td className="text-xs">{r.source.toLowerCase()}</Td><Td><StatusBadge status={r.status} /></Td><Td className="text-xs">{r.rs ? `${r.grade ?? "—"} (${r.rs.toLowerCase()})` : "—"}</Td><Td>{reg && r.status !== "DROPPED" && r.rs !== "PUBLISHED" && r.rs !== "LOCKED" && <Confirm label="Drop" title={`Drop ${r.code}?`} variant="danger-outline" run={async () => { "use server"; return dropOnBehalfAction(r.id); }} />}</Td></tr>)}</tbody></Table>
            {ev && <div className="border-t border-line p-5 text-sm"><p className="mb-2 font-bold text-navy-800">Graduation readiness: {ev.eligible ? <Badge tone="green">Eligible</Badge> : <Badge tone="amber">Not yet</Badge>}</p><ul className="grid gap-1 sm:grid-cols-2">{ev.checks.map((c) => <li key={c.key} className="text-xs">{c.ok ? "✔" : "✖"} {c.label} — <span className="text-muted">{c.detail}</span></li>)}</ul></div>}
            {can(sess.actor, "transcripts.issue") && <div className="flex flex-wrap items-center gap-3 border-t border-line p-5 text-sm"><Do label="Draft transcript" run={async () => { "use server"; return createTranscriptAction(en.e.id); }} />{trans.map((t) => <span key={t.id} className="flex items-center gap-2"><a href={`/api/v1/documents/transcript/${t.id}`} target="_blank" rel="noopener" className="font-mono text-xs underline">{t.number}</a><StatusBadge status={t.status} />{t.status === "DRAFT" && <Do label="Approve" run={async () => { "use server"; return transcriptStatusAction(t.id, "APPROVED"); }} />}{t.status === "APPROVED" && <Do label="Issue" run={async () => { "use server"; return transcriptStatusAction(t.id, "ISSUED"); }} />}</span>)}</div>}
            {reg && (
              <div className="grid gap-4 border-t border-line p-5 lg:grid-cols-2">
                <ActionForm action={registerOnBehalfAction} className="space-y-3" resetOnSuccess><input type="hidden" name="enrolmentId" value={en.e.id} /><SelectField label="Register for an open offering (Registrar override)" name="offeringId" options={offerings.map((o) => ({ value: o.id, label: `${o.code} ${o.title} (${o.term})` }))} /><SubmitButton size="sm">Register</SubmitButton></ActionForm>
                <ActionForm action={grantCreditAction} className="space-y-3" resetOnSuccess><input type="hidden" name="enrolmentId" value={en.e.id} /><SelectField label="Grant exemption / transfer credit" name="courseId" options={courses} /><SelectField label="Type" name="source" options={[{ value: "EXEMPTION", label: "Exemption" }, { value: "TRANSFER", label: "Transfer credit" }]} /><TextField label="Basis (institution, certificate, approval)" name="note" required /><SubmitButton size="sm">Grant credit</SubmitButton></ActionForm>
              </div>
            )}
          </Card>
        );
      }))}
      {enrols.length === 0 && <Alert tone="warning">This student has no enrolment.</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        {edit && <Card><CardHeader title="Change status" description="Suspension and withdrawal require a reason and are audited." /><ActionForm action={setStudentStatusAction} className="space-y-3 p-5"><input type="hidden" name="studentId" value={id} /><SelectField label="Status" name="status" defaultValue={st.st.status} options={["ACTIVE", "ON_LEAVE", "SUSPENDED", "WITHDRAWN"].map((v) => ({ value: v, label: v.replace(/_/g, " ").toLowerCase() }))} /><TextField label="Reason" name="reason" required /><SubmitButton size="sm">Update</SubmitButton></ActionForm></Card>}
        {can(sess.actor, "ministry.manage") && <Card><CardHeader title="Ministry mentor" /><ActionForm action={assignMentorAction} className="space-y-3 p-5"><input type="hidden" name="studentId" value={id} /><SelectField label="Assign a mentor" name="mentorId" options={mentors.map((m) => ({ value: m.id, label: `${m.n} ${m.l}` }))} placeholder="Select" required /><SubmitButton size="sm">Assign</SubmitButton></ActionForm></Card>}
      </div>
    </>
  );
}
