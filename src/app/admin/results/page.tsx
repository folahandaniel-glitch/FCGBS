import { asc, desc, eq, inArray } from "drizzle-orm";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { ActionForm } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { advanceResultsAction, decideAmendmentAction, requestAmendmentAction } from "../ops-actions";

const NEXT: Record<string, { act: "REVIEW" | "APPROVE" | "PUBLISH" | "LOCK"; label: string; perm: "grades.review" | "grades.approve" } | undefined> = {
  SUBMITTED: { act: "REVIEW", label: "Mark reviewed", perm: "grades.review" },
  REVIEWED: { act: "APPROVE", label: "Approve", perm: "grades.approve" },
  APPROVED: { act: "PUBLISH", label: "Publish", perm: "grades.approve" },
  PUBLISHED: { act: "LOCK", label: "Lock", perm: "grades.approve" },
};

export default async function ResultsAdmin() {
  const sess = await requireStaffPage(["grades.review", "grades.approve", "grades.amend", "teaching.any"]);
  const db = getDb();
  const rows = await db
    .select({ id: s.results.id, status: s.results.status, total: s.results.total, grade: s.results.grade, submittedBy: s.results.submittedBy, reviewedBy: s.results.reviewedBy, code: s.courses.code, title: s.courses.title, term: s.academicTerms.name, offeringId: s.offerings.id, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber })
    .from(s.results)
    .innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId))
    .innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId))
    .innerJoin(s.offerings, eq(s.offerings.id, s.courseRegistrations.offeringId))
    .innerJoin(s.academicTerms, eq(s.academicTerms.id, s.offerings.termId))
    .innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId))
    .innerJoin(s.students, eq(s.students.id, s.enrolments.studentId))
    .innerJoin(s.users, eq(s.users.id, s.students.userId))
    .where(inArray(s.results.status, ["SUBMITTED", "REVIEWED", "APPROVED", "PUBLISHED"]))
    .orderBy(asc(s.courses.code), asc(s.users.lastName))
    .limit(500);
  const amendments = await db.select({ a: s.resultAmendments, code: s.courses.code, first: s.users.firstName, last: s.users.lastName }).from(s.resultAmendments).innerJoin(s.results, eq(s.results.id, s.resultAmendments.resultId)).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(eq(s.resultAmendments.status, "PENDING")).orderBy(desc(s.resultAmendments.createdAt));
  // Group by course offering and status so a whole class can be advanced in one step.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) { const k = `${r.offeringId}|${r.status}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
  return (
    <>
      <PageHeader title="Results" description="Draft → Submitted → Reviewed → Approved → Published → Locked. The person who submitted a result cannot review or approve it; the reviewer cannot approve it." />
      {groups.size === 0 && <Card><EmptyState title="No results are awaiting action." /></Card>}
      {[...groups.entries()].map(([k, list]) => {
        const first = list[0];
        const step = NEXT[first.status];
        const allowed = step && can(sess.actor, step.perm);
        const blocked = step && allowed && list.some((r) => (step.act === "REVIEW" || step.act === "APPROVE") && r.submittedBy === sess.user.id || (step.act === "APPROVE" && r.reviewedBy === sess.user.id));
        const ids = list.map((r) => r.id);
        return (
          <Card key={k} className="mb-6">
            <CardHeader title={`${first.code} · ${first.title}`} description={`${first.term} · ${list.length} result(s)`} action={<span className="flex items-center gap-2"><StatusBadge status={first.status} />{allowed && !blocked && step && <Confirm label={step.label} title={`${step.label} ${list.length} result(s)?`} description={step.act === "PUBLISH" ? "Students will be notified and the results become visible. Published results can only be changed by an approved amendment." : "This is recorded in the audit log with your name."} variant="secondary" confirmVariant="primary" run={async () => { "use server"; return advanceResultsAction(ids, step.act); }} />}{blocked && <Badge tone="amber">You are not allowed to act on your own work</Badge>}</span>} />
            <Table><thead><tr><Th>Student</Th><Th>Total</Th><Th>Grade</Th>{first.status === "PUBLISHED" && <Th>Correction</Th>}</tr></thead><tbody>{list.map((r) => <tr key={r.id}><Td className="text-xs">{r.last} {r.first} <span className="font-mono text-muted">{r.num}</span></Td><Td>{r.total}</Td><Td><Badge tone="blue">{r.grade}</Badge></Td>{first.status === "PUBLISHED" && <Td><ActionForm action={requestAmendmentAction} className="flex gap-1" showInlineError={false} resetOnSuccess><input type="hidden" name="resultId" value={r.id} /><input name="newTotal" type="number" min={0} max={100} step="0.1" placeholder="New total" aria-label="New total" className="w-20 rounded-lg border border-line px-2 py-1 text-xs" /><input name="reason" placeholder="Reason (required)" aria-label="Reason" className="w-44 rounded-lg border border-line px-2 py-1 text-xs" /><button className="rounded-lg bg-surface px-2 py-1 text-xs font-semibold ring-1 ring-line">Request</button></ActionForm></Td>}</tr>)}</tbody></Table>
          </Card>
        );
      })}
      {amendments.length > 0 && (
        <Card><CardHeader title="Pending amendments" description="Approval needs `grades.amend` and a different person from the requester." />
          <ul className="divide-y divide-line">{amendments.map(({ a, code, first, last }) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><span><strong>{code}</strong> {last} {first}: {a.oldTotal} ({a.oldGrade}) → <strong>{a.newTotal} ({a.newGrade})</strong><span className="block text-xs text-muted">Reason: {a.reason}</span></span>{can(sess.actor, "grades.amend") && a.requestedBy !== sess.user.id && <span className="flex gap-2"><Confirm label="Approve" title="Approve this amendment?" reason confirmVariant="primary" run={async ({ reason }) => { "use server"; return decideAmendmentAction(a.id, true, reason); }} /><Confirm label="Reject" title="Reject this amendment?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return decideAmendmentAction(a.id, false, reason); }} /></span>}</li>)}</ul></Card>
      )}
      <Alert tone="info" className="mt-6">Published results are protected by a database rule: they cannot be edited silently, even by an administrator.</Alert>
    </>
  );
}
