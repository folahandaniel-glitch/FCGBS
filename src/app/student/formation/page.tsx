import { desc, eq } from "drizzle-orm";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { learnerContext } from "@/server/services/learner";
import { FORMATION_KINDS } from "@/server/services/formation";
import { formationAction } from "../actions";

const nice = (k: string) => k.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function FormationPage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc) return <EmptyState title="No student record." />;
  const entries = await getDb().select().from(s.formationEntries).where(eq(s.formationEntries.studentId, lc.student.id)).orderBy(desc(s.formationEntries.entryOn)).limit(60);
  return (
    <>
      <PageHeader title="Spiritual formation" description="A private journal of prayer, Bible study, discipleship, service and growth. There are no scores or rankings here — only reflection and mentoring." />
      <Alert tone="info" className="mb-5">Your reflections are private. Only entries you choose to share are visible to your assigned mentor.</Alert>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="New reflection" />
          <ActionForm action={formationAction} className="space-y-3 p-5" resetOnSuccess>
            <SelectField label="Category" name="kind" options={FORMATION_KINDS.map((k) => ({ value: k, label: nice(k) }))} required />
            <TextField label="Date" name="entryOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <TextAreaField label="Reflection" name="reflection" rows={6} required />
            <CheckboxField name="share" label="Share this with my mentor" hint="Only works if a mentor has been assigned to you." />
            <SubmitButton pendingText="Saving…">Save reflection</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title="My journal" />
          {entries.length === 0 ? (
            <EmptyState title="No reflections yet." />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="space-y-1 px-5 py-4 text-sm">
                  <div className="flex items-center gap-2"><Badge tone="blue">{nice(e.kind)}</Badge><span className="text-xs text-muted">{e.entryOn}</span>{e.sharedWithMentor && <Badge tone="gold">Shared</Badge>}</div>
                  <p className="whitespace-pre-wrap">{e.reflection}</p>
                  {e.mentorResponse && <p className="rounded-lg bg-gold-50 p-3 text-xs"><strong>Mentor:</strong> {e.mentorResponse}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
