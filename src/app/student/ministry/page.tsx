import { desc, eq, sql } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Stat, Table, Td, Th } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { learnerContext } from "@/server/services/learner";
import { ACTIVITY_KINDS, PLACEMENT_KINDS } from "@/server/services/formation";
import { logActivityAction, proposePlacementAction, reflectPlacementAction } from "../actions";

const label = (v: string) => v.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function MinistryPage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc) return <EmptyState title="No student record." />;
  const db = getDb();
  const [placements, activities, [tot], [prog]] = await Promise.all([
    db.select().from(s.ministryPlacements).where(eq(s.ministryPlacements.studentId, lc.student.id)).orderBy(desc(s.ministryPlacements.createdAt)),
    db.select().from(s.ministryActivities).where(eq(s.ministryActivities.studentId, lc.student.id)).orderBy(desc(s.ministryActivities.activityOn)).limit(50),
    db.select({ v: sql<number>`coalesce(sum(hours) filter (where status='VERIFIED'),0)::float`, p: sql<number>`coalesce(sum(hours) filter (where status='SUBMITTED'),0)::float` }).from(s.ministryActivities).where(eq(s.ministryActivities.studentId, lc.student.id)),
    lc.primary ? db.select({ h: s.programmes.practicumHours }).from(s.programmes).where(eq(s.programmes.id, lc.primary.e.programmeId)) : Promise.resolve([{ h: 0 }]),
  ]);
  const required = prog?.h ?? 0;
  return (
    <>
      <PageHeader title="Ministry formation profile" description="Your service, practicum and mentoring record — separate from, but connected to, your academic record." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Verified hours" value={tot.v} tone="green" hint={required ? `of ${required} required` : "No requirement for your programme"} />
        <Stat label="Awaiting verification" value={tot.p} tone="gold" />
        <Stat label="Placements" value={placements.length} tone="navy" />
      </div>
      {required > 0 && <Card className="mt-4 p-4"><ProgressBar value={(tot.v / required) * 100} tone="green" label="Practicum hours" /></Card>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Placements" />
          {placements.length === 0 ? (
            <EmptyState title="No ministry practicum has been assigned." description="Propose a placement below; the ministry office will confirm it." />
          ) : (
            <ul className="divide-y divide-line">
              {placements.map((p) => (
                <li key={p.id} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex items-center justify-between"><strong>{p.organisation}</strong><Badge tone={p.status === "ACTIVE" ? "green" : p.status === "COMPLETED" ? "navy" : "amber"}>{p.status.toLowerCase()}</Badge></div>
                  <p className="text-xs text-muted">{label(p.kind)} · supervisor {p.supervisorName ?? "to be confirmed"}{p.finalOutcome ? ` · outcome: ${label(p.finalOutcome)}` : ""}</p>
                  <ActionForm action={reflectPlacementAction} className="flex gap-2" resetOnSuccess>
                    <input type="hidden" name="placementId" value={p.id} />
                    <input name="narrative" placeholder="Add a reflection on this placement…" className="block w-full rounded-xl border border-line px-3 py-2 text-sm" aria-label="Reflection" />
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <details className="border-t border-line p-5">
            <summary className="cursor-pointer text-sm font-semibold text-royal-700">Propose a placement</summary>
            <ActionForm action={proposePlacementAction} className="mt-4 space-y-3" resetOnSuccess>
              <SelectField label="Type" name="kind" options={PLACEMENT_KINDS.map((k) => ({ value: k, label: label(k) }))} required />
              <TextField label="Church / organisation" name="organisation" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Location" name="location" /><TextField label="Supervisor name" name="supervisorName" /><TextField label="Supervisor contact" name="supervisorContact" /><TextField label="Hours planned" name="hoursRequired" type="number" min={0} /><TextField label="Start" name="startsOn" type="date" /><TextField label="End" name="endsOn" type="date" />
              </div>
              <SubmitButton size="sm">Propose</SubmitButton>
            </ActionForm>
          </details>
        </Card>
        <Card>
          <CardHeader title="Log a ministry activity" description="Hours count toward graduation only after your mentor or supervisor verifies them." />
          <ActionForm action={logActivityAction} className="space-y-3 p-5" resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Type" name="kind" options={ACTIVITY_KINDS.map((k) => ({ value: k, label: label(k) }))} required />
              <TextField label="Date" name="activityOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              <TextField label="Hours" name="hours" type="number" step="0.5" min="0.5" max="24" required />
            </div>
            {placements.length > 0 && <SelectField label="Placement (optional)" name="placementId" placeholder="None" options={placements.map((p) => ({ value: p.id, label: p.organisation }))} />}
            <TextAreaField label="What did you do?" name="description" rows={3} required />
            <TextAreaField label="Reflection (optional)" name="reflection" rows={3} />
            <SubmitButton pendingText="Saving…">Record activity</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Activity log" />
        {activities.length === 0 ? (
          <EmptyState title="No ministry activities recorded yet." />
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Type</Th><Th>Hours</Th><Th>Description</Th><Th>Status</Th></tr></thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}><Td className="whitespace-nowrap">{a.activityOn}</Td><Td>{label(a.kind)}</Td><Td>{a.hours}</Td><Td className="max-w-md text-xs">{a.description}{a.verifierNote && <span className="block text-muted">Mentor: {a.verifierNote}</span>}</Td><Td><Badge tone={a.status === "VERIFIED" ? "green" : a.status === "RETURNED" ? "red" : "amber"}>{a.status.toLowerCase()}</Badge></Td></tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
