import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Alert, Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Confirm, Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { decideApplicationAction, decideApplicationForm, registerStudentAction, verifyDocumentAction } from "../../ops-actions";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const sess = await requireStaffPage("admissions.view");
  const id = (await params).id;
  const db = getDb();
  const [row] = await db.select({ a: s.applications, u: s.users, programme: s.programmes.name }).from(s.applications).innerJoin(s.users, eq(s.users.id, s.applications.userId)).innerJoin(s.programmes, eq(s.programmes.id, s.applications.programmeId)).where(eq(s.applications.id, id));
  if (!row) notFound();
  const docs = await db.select().from(s.applicationDocuments).where(eq(s.applicationDocuments.applicationId, id));
  const a = row.a;
  const p = a.personal as Record<string, string>;
  const m = a.ministryBackground as Record<string, string>;
  const review = can(sess.actor, "admissions.review");
  const decide = can(sess.actor, "admissions.decide");
  const reviewable = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "WAITLISTED"].includes(a.status);
  const dl = (rows: [string, string | undefined][]) => <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">{rows.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-muted">{k}</dt><dd className="font-medium text-navy-800">{v || "—"}</dd></div>)}</dl>;
  return (
    <>
      <PageHeader eyebrow={a.applicationNo} title={`${row.u.firstName} ${row.u.lastName}`} description={`${row.programme} · ${row.u.email}`} breadcrumbs={[{ href: "/admin/admissions", label: "Applications" }, { label: a.applicationNo }]} actions={<StatusBadge status={a.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader title="Personal details" />{dl([["Date of birth", p.dateOfBirth], ["Gender", p.gender], ["Phone", p.phone], ["Country", p.country], ["Nationality", p.nationality], ["Identification", `${p.idType ?? ""} ${p.idNumber ?? ""}`], ["Address", p.address]])}</Card>
          <Card><CardHeader title="Education & ministry" />{dl([["Education", a.education.map((e) => [e.level, e.qualification, e.institution, e.year].filter(Boolean).join(", ")).join(" | ")], ["Church / ministry", m.church], ["Role", m.role], ["Years", m.years], ["Experience", m.description]])}</Card>
          <Card><CardHeader title="Personal statement" /><p className="whitespace-pre-wrap p-5 text-sm leading-relaxed">{a.statement}</p></Card>
          <Card><CardHeader title="References" /><ul className="divide-y divide-line">{a.references.map((r, i) => <li key={i} className="px-5 py-3 text-sm"><strong>{r.name}</strong> — {r.relationship} · {r.email} {r.phone}</li>)}{a.references.length === 0 && <li className="px-5 py-3 text-sm text-muted">None supplied.</li>}</ul></Card>
          <Card><CardHeader title="Documents" />
            <ul className="divide-y divide-line">{docs.map((d) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span><a className="font-semibold text-royal-700 underline" href={`/api/v1/assets/${d.assetId}`} target="_blank" rel="noopener">{d.kind}</a> <Badge tone={d.verified ? "green" : "amber"}>{d.verified ? "verified" : "unverified"}</Badge></span>{review && <Do label={d.verified ? "Unverify" : "Mark verified"} run={async () => { "use server"; return verifyDocumentAction(d.id, !d.verified); }} />}</li>)}{docs.length === 0 && <li className="px-5 py-3 text-sm text-muted">No documents.</li>}</ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Decision" description="Decisions are made by people and recorded with reasons. The applicant is notified." />
            <div className="space-y-3 p-5 text-sm">
              {a.decisionNote && <Alert tone="info" title={`Last decision (${a.status.toLowerCase().replace(/_/g, " ")})`}>{a.decisionNote}</Alert>}
              {a.offerAcceptedAt && <Alert tone="success">Offer accepted {a.offerAcceptedAt.toLocaleDateString("en-GB")}.</Alert>}
              {reviewable && review && (
                <ActionForm action={decideApplicationForm} className="space-y-3">
                  <input type="hidden" name="id" value={id} />
                  <SelectField label="Move to" name="to" options={[{ value: "UNDER_REVIEW", label: "Under review" }, { value: "INTERVIEW_REQUIRED", label: "Interview required" }, ...(decide ? [{ value: "ACCEPTED", label: "Accept" }, { value: "CONDITIONALLY_ACCEPTED", label: "Accept with conditions" }, { value: "WAITLISTED", label: "Waitlist" }, { value: "REJECTED", label: "Reject" }] : [])]} />
                  <TextAreaField label="Notes / reason (required for decisions)" name="note" rows={3} />
                  <TextField label="Conditions (if conditional)" name="conditions" />
                  <TextField label="Interview date/time (if interview)" name="interviewAt" type="datetime-local" />
                  <SubmitButton pendingText="Saving…">Record</SubmitButton>
                </ActionForm>
              )}
              {["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(a.status) && a.offerAcceptedAt && !a.registeredAt && can(sess.actor, "admissions.register") && <Confirm label="Register as student" title="Register this applicant as a student?" description="Creates the student account, student ID and first enrolment." variant="primary" confirmVariant="primary" run={async () => { "use server"; return registerStudentAction(id); }} />}
              {a.registeredAt && <Alert tone="success">Registered as a student on {a.registeredAt.toLocaleDateString("en-GB")}.</Alert>}
              {["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(a.status) && !a.offerAcceptedAt && <p className="text-xs text-muted">Waiting for the applicant to accept the offer.</p>}
              {!reviewable && !["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(a.status) && <p className="text-xs text-muted">No further action is available.</p>}
              {decide && ["UNDER_REVIEW", "INTERVIEW_REQUIRED"].includes(a.status) && <Confirm label="Reject…" title="Reject this application?" description="The applicant will be notified. A reason is recorded." reason variant="danger-outline" run={async ({ reason }) => { "use server"; return decideApplicationAction(id, "REJECTED", reason); }} />}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
