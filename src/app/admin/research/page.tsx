import { desc, eq, inArray } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField } from "@/components/ui/form";
import { Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { advanceResearchAction, assignSupervisorAction, researchFeedbackAction } from "../ops-actions";

const NEXT: Record<string, string[]> = { PROPOSAL: ["APPROVED_PROPOSAL", "TOPIC"], APPROVED_PROPOSAL: ["IN_PROGRESS"], FINAL_SUBMITTED: ["VIVA", "ASSESSED", "IN_PROGRESS"], VIVA: ["ASSESSED"], ASSESSED: ["APPROVED", "IN_PROGRESS", "REJECTED"], APPROVED: ["ARCHIVED"], TOPIC: ["PROPOSAL"], IN_PROGRESS: ["FINAL_SUBMITTED"] };

export default async function ResearchAdmin() {
  const sess = await requireStaffPage(["research.manage", "research.supervise"]);
  const db = getDb();
  const all = can(sess.actor, "research.manage");
  const rows = await db.select({ p: s.researchProjects, first: s.users.firstName, last: s.users.lastName }).from(s.researchProjects).innerJoin(s.students, eq(s.students.id, s.researchProjects.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(all ? undefined : eq(s.researchProjects.supervisorId, sess.user.id)).orderBy(desc(s.researchProjects.updatedAt)).limit(100);
  const allSubsRows = rows.length ? await db.select().from(s.researchSubmissions).where(inArray(s.researchSubmissions.projectId, rows.map((r) => r.p.id))).orderBy(desc(s.researchSubmissions.createdAt)) : [];
  const allSubs = new Map<string, typeof allSubsRows>();
  for (const x of allSubsRows) (allSubs.get(x.projectId) ?? allSubs.set(x.projectId, []).get(x.projectId)!).push(x);
  const supervisors = all ? await db.select({ id: s.users.id, f: s.users.firstName, l: s.users.lastName }).from(s.users).where(eq(s.users.userType, "STAFF")) : [];
  return (
    <>
      <PageHeader title="Research" description={all ? "All research projects: assign supervisors, track milestones, approve and archive." : "Projects you supervise."} />
      {rows.length === 0 ? <Card><EmptyState title="No research projects." /></Card> : rows.map(({ p, first, last }) => {
        const subs = (allSubs.get(p.id) ?? []).slice(0, 5);
        return (
          <Card key={p.id} className="mb-5">
            <CardHeader title={p.title} description={`${last} ${first}`} action={<StatusBadge status={p.status} />} />
            <div className="space-y-3 p-5 text-sm">
              {all && <ActionForm action={assignSupervisorAction} className="flex max-w-md items-end gap-2" showInlineError={false}><input type="hidden" name="id" value={p.id} /><SelectField label="Supervisor" name="supervisorId" defaultValue={p.supervisorId ?? ""} placeholder="None" options={supervisors.map((x) => ({ value: x.id, label: `${x.f} ${x.l}` }))} className="flex-1" /><SubmitButton size="sm" variant="secondary">Assign</SubmitButton></ActionForm>}
              {subs.map((x) => <div key={x.id} className="rounded-xl bg-surface p-3"><p className="font-semibold">{x.stage.replace(/_/g, " ").toLowerCase()} — {x.title}{x.aiDisclosure && <Badge tone="amber" className="ml-2">AI disclosed</Badge>}</p>{x.body && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted">{x.body}</p>}{x.assetId && <a className="text-xs font-semibold text-royal-700 underline" href={`/api/v1/assets/${x.assetId}`}>Download file</a>}
                {x.feedback ? <p className="mt-2 rounded-lg bg-gold-50 p-2 text-xs"><strong>Feedback:</strong> {x.feedback}</p> : <ActionForm action={researchFeedbackAction} className="mt-2 flex gap-2" showInlineError={false}><input type="hidden" name="id" value={x.id} /><TextAreaField label="" name="feedback" rows={2} className="flex-1" /><SubmitButton size="sm">Send</SubmitButton></ActionForm>}</div>)}
              <div className="flex flex-wrap gap-2">{(NEXT[p.status] ?? []).filter((n) => !["APPROVED", "ARCHIVED", "REJECTED"].includes(n) || all).map((n) => <Do key={n} label={`→ ${n.replace(/_/g, " ").toLowerCase()}`} run={async () => { "use server"; return advanceResearchAction(p.id, n); }} />)}</div>
            </div>
          </Card>
        );
      })}
    </>
  );
}
