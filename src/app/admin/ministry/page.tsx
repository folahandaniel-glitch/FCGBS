import { desc, eq, inArray } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Confirm, Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { placementStatusAction, verifyActivityAction } from "../ops-actions";

export default async function MinistryAdmin() {
  const sess = await requireStaffPage(["ministry.view", "ministry.manage", "ministry.mentor"]);
  const db = getDb();
  const scoped = !can(sess.actor, "ministry.view") && !can(sess.actor, "ministry.manage");
  // Mentors only see students assigned to them.
  const assigned = scoped ? (await db.select({ id: s.mentorAssignments.studentId }).from(s.mentorAssignments).where(eq(s.mentorAssignments.mentorId, sess.user.id))).map((a) => a.id) : null;
  const pickIds = assigned ?? undefined;
  const base = (q: { where?: unknown }) => q;
  void base;
  const placements = await db.select({ p: s.ministryPlacements, first: s.users.firstName, last: s.users.lastName }).from(s.ministryPlacements).innerJoin(s.students, eq(s.students.id, s.ministryPlacements.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(pickIds ? inArray(s.ministryPlacements.studentId, pickIds.length ? pickIds : ["00000000-0000-0000-0000-000000000000"]) : undefined).orderBy(desc(s.ministryPlacements.createdAt)).limit(100);
  const acts = await db.select({ a: s.ministryActivities, first: s.users.firstName, last: s.users.lastName }).from(s.ministryActivities).innerJoin(s.students, eq(s.students.id, s.ministryActivities.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(pickIds ? inArray(s.ministryActivities.studentId, pickIds.length ? pickIds : ["00000000-0000-0000-0000-000000000000"]) : undefined).orderBy(desc(s.ministryActivities.createdAt)).limit(100);
  const pending = acts.filter((x) => x.a.status === "SUBMITTED");
  const canAct = can(sess.actor, "ministry.manage") || can(sess.actor, "ministry.mentor");
  return (
    <>
      <PageHeader title="Ministry formation" description={scoped ? "Students assigned to you." : "Placements, practicum activities and mentoring across the school."} />
      <Card className="mb-6"><CardHeader title={`Activities awaiting verification (${pending.length})`} />
        {pending.length === 0 ? <EmptyState title="Nothing to verify." /> : <ul className="divide-y divide-line">{pending.map(({ a, first, last }) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><span><strong>{last} {first}</strong> · {a.kind.toLowerCase()} · {a.hours}h · {a.activityOn}<span className="block max-w-xl text-xs text-muted">{a.description}</span></span>{canAct && <span className="flex gap-2"><Do label="Verify" run={async () => { "use server"; return verifyActivityAction(a.id, true, ""); }} /><Confirm label="Return" title="Return to the student?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return verifyActivityAction(a.id, false, reason); }} /></span>}</li>)}</ul>}
      </Card>
      <Card><CardHeader title="Placements" />
        {placements.length === 0 ? <EmptyState title="No placements." /> : <ul className="divide-y divide-line">{placements.map(({ p, first, last }) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><span><strong>{last} {first}</strong> — {p.organisation}<span className="block text-xs text-muted">{p.kind.replace(/_/g, " ").toLowerCase()} · supervisor {p.supervisorName ?? "—"} {p.finalOutcome && `· ${p.finalOutcome.replace(/_/g, " ").toLowerCase()}`}</span></span><span className="flex items-center gap-2"><StatusBadge status={p.status} />{canAct && p.status === "PLANNED" && <Do label="Approve & activate" run={async () => { "use server"; return placementStatusAction(p.id, "ACTIVE"); }} />}{canAct && p.status === "ACTIVE" && <><Do label="Complete: pass" run={async () => { "use server"; return placementStatusAction(p.id, "COMPLETED", "PASS", ""); }} /><Do label="Not yet competent" run={async () => { "use server"; return placementStatusAction(p.id, "COMPLETED", "NOT_YET_COMPETENT", ""); }} /></>}</span></li>)}</ul>}
      </Card>
      <p className="mt-4 text-xs text-muted"><Badge tone="blue">Note</Badge> Spiritual-formation journals are private to students; mentors see only entries a student chooses to share.</p>
    </>
  );
}
