import { eq } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { sharedEntriesForMentor } from "@/server/services/formation";
import { mentorRespondAction } from "../actions";

export default async function MenteesPage() {
  const sess = await requireStaffPage("ministry.mentor");
  const mentees = await getDb().select({ id: s.students.id, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber }).from(s.mentorAssignments).innerJoin(s.students, eq(s.students.id, s.mentorAssignments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(eq(s.mentorAssignments.mentorId, sess.user.id));
  const entries = await Promise.all(mentees.map((m) => sharedEntriesForMentor(sess.actor, m.id)));
  return (
    <>
      <PageHeader title="My mentees" description="You see only the reflections that your students have chosen to share with you." />
      {mentees.length === 0 && <Card><EmptyState title="No students have been assigned to you." /></Card>}
      {mentees.map((m, i) => (
        <Card key={m.id} className="mb-5">
          <CardHeader title={`${m.last} ${m.first}`} description={m.num} />
          {entries[i].length === 0 ? <p className="p-5 text-sm text-muted">Nothing shared yet.</p> : (
            <ul className="divide-y divide-line">
              {entries[i].map((e) => (
                <li key={e.id} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex items-center gap-2"><Badge tone="blue">{e.kind.replace(/_/g, " ").toLowerCase()}</Badge><span className="text-xs text-muted">{e.entryOn}</span></div>
                  <p className="whitespace-pre-wrap">{e.reflection}</p>
                  {e.mentorResponse ? <p className="rounded-lg bg-gold-50 p-3 text-xs"><strong>Your response:</strong> {e.mentorResponse}</p> : (
                    <ActionForm action={mentorRespondAction} className="flex items-end gap-2" showInlineError={false}><input type="hidden" name="entryId" value={e.id} /><TextAreaField label="Respond" name="response" rows={2} className="flex-1" /><SubmitButton size="sm">Send</SubmitButton></ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </>
  );
}
