import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { learnerContext } from "@/server/services/learner";
import { updateProfileAction } from "../actions";

export default async function ProfilePage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  const st = lc?.student;
  const ec = (st?.emergencyContact ?? {}) as Record<string, string>;
  return (
    <>
      <PageHeader title="My profile" />
      <Card>
        <CardHeader title={`${sess.user.firstName} ${sess.user.lastName}`} description={sess.user.email} action={st && <Badge tone="blue">{st.studentNumber}</Badge>} />
        <div className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          <p><span className="block text-xs font-semibold uppercase text-muted">Programme</span>{lc?.primary?.programme ?? "—"}</p>
          <p><span className="block text-xs font-semibold uppercase text-muted">Level</span>{lc?.primary?.level ?? "—"}</p>
          <p><span className="block text-xs font-semibold uppercase text-muted">Status</span>{st?.status.toLowerCase()}</p>
        </div>
        {st && (
          <ActionForm action={updateProfileAction} className="space-y-4 border-t border-line p-5">
            <div className="grid gap-4 sm:grid-cols-2"><TextField label="Phone" name="phone" defaultValue="" /><TextField label="Address" name="address" defaultValue={st.address ?? ""} /></div>
            <p className="text-sm font-bold text-navy-800">Emergency contact</p>
            <div className="grid gap-4 sm:grid-cols-3"><TextField label="Name" name="ecName" defaultValue={ec.name} /><TextField label="Relationship" name="ecRel" defaultValue={ec.relationship} /><TextField label="Phone" name="ecPhone" defaultValue={ec.phone} /></div>
            <SubmitButton>Save profile</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
