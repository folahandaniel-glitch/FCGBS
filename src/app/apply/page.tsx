import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Alert, Badge, Card, CardHeader, ProgressBar, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Do, Confirm } from "@/components/admin/row-actions";
import { Logo } from "@/components/brand";
import { requireApplicantPage } from "@/server/http";
import { getBrand } from "@/server/brand";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { getSetting } from "@/server/settings";
import { listProgrammes } from "@/server/services/catalog";
import { myApplication } from "@/server/services/admissions";
import { logoutAction } from "../(auth)/actions";
import { acceptOfferAction, saveApplicationAction, submitApplicationAction, uploadDocumentAction, withdrawApplicationAction } from "./actions";

export const metadata: Metadata = { title: "My application", robots: { index: false } };

const STEPS = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "DECISION", "OFFER_ACCEPTED", "REGISTERED"];

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ programme?: string }> }) {
  const sess = await requireApplicantPage();
  const sp = await searchParams;
  const [brand, programmes, app, cfg] = await Promise.all([getBrand(), listProgrammes(), myApplication(sess.user.id), getSetting("admissions")]);
  const docs = app ? await getDb().select({ id: s.applicationDocuments.id, kind: s.applicationDocuments.kind, verified: s.applicationDocuments.verified, createdAt: s.applicationDocuments.createdAt }).from(s.applicationDocuments).where(eq(s.applicationDocuments.applicationId, app.id)) : [];
  if (app?.registeredAt) redirect("/student");
  const editable = !app || app.status === "DRAFT";
  const decided = app && ["ACCEPTED", "CONDITIONALLY_ACCEPTED"].includes(app.status);
  const step = !app ? 0 : app.status === "DRAFT" ? 0 : app.status === "SUBMITTED" ? 1 : ["UNDER_REVIEW", "INTERVIEW_REQUIRED", "WAITLISTED"].includes(app.status) ? 2 : decided ? (app.offerAcceptedAt ? 4 : 3) : 3;
  const p = (app?.personal ?? {}) as Record<string, string>;
  const m = (app?.ministryBackground ?? {}) as Record<string, string>;
  const edu = app?.education?.[0] ?? {};
  const refs = app?.references ?? [];
  const preselect = app?.programmeId ?? programmes.find((x) => x.slug === sp.programme)?.id ?? "";
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><Logo src={brand.markUrl} alt="" className="size-10" /><span className="font-extrabold text-navy-800">{brand.shortName} Admissions</span></Link>
          <form action={logoutAction}><button className="text-sm font-semibold text-royal-700 hover:underline">Sign out</button></form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-800">Hello, {sess.user.firstName}</h1>
          <p className="text-sm text-muted">{app ? `Application ${app.applicationNo}` : "Start your application below."} {app && <StatusBadge status={app.status} />}</p>
          <div className="mt-4"><ProgressBar value={((step + 1) / STEPS.length) * 100} tone="gold" label="Application progress" /></div>
          <ol className="mt-2 grid grid-cols-3 gap-1 text-[0.7rem] font-semibold text-muted sm:grid-cols-6">{["Draft", "Submitted", "Review", "Decision", "Accept offer", "Registered"].map((t, i) => <li key={t} className={i <= step ? "text-navy-800" : ""}>{i + 1}. {t}</li>)}</ol>
        </div>

        {!cfg.open && !app && <Alert tone="warning" title="Applications are closed">Please check back later.</Alert>}

        {app && app.status !== "DRAFT" && (
          <Card><CardHeader title="Status" />
            <div className="space-y-3 p-5 text-sm">
              {app.status === "SUBMITTED" && <p>Your application has been received and will be reviewed by the Admissions Office. You will be notified of any update.</p>}
              {app.status === "INTERVIEW_REQUIRED" && <Alert tone="info" title="Interview required">The Admissions Office will contact you{app.interviewAt ? ` — scheduled for ${app.interviewAt.toLocaleString("en-GB")}` : ""}.</Alert>}
              {decided && (
                <>
                  <Alert tone="success" title={app!.status === "ACCEPTED" ? "You have been offered admission" : "Conditional offer of admission"}>{app!.decisionNote}{app!.conditions && <><br /><strong>Conditions:</strong> {app!.conditions}</>}</Alert>
                  {app!.offerAcceptedAt ? <p className="font-semibold text-success-600">Offer accepted. The Registrar will complete your registration and your student account will be activated.</p> : <Do variant="gold" size="md" label="Accept offer" run={acceptOfferAction} />}
                </>
              )}
              {app.status === "WAITLISTED" && <Alert tone="warning" title="Waiting list">{app.decisionNote}</Alert>}
              {app.status === "REJECTED" && <Alert tone="danger" title="Not admitted">{app.decisionNote || "We are unable to offer you admission at this time."}</Alert>}
              {["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "WAITLISTED"].includes(app.status) && <Confirm label="Withdraw application" title="Withdraw your application?" description="You can apply again later." run={withdrawApplicationAction} variant="danger-outline" />}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Application form" description={editable ? "Save as often as you like. Submit when everything is complete." : "Submitted — read only."} />
          <ActionForm action={saveApplicationAction} className="space-y-6 p-5" successMessage="Draft saved.">
            <fieldset disabled={!editable} className="space-y-6">
              <SelectField label="Programme applied for" name="programmeId" required defaultValue={preselect} placeholder="Select a programme" options={programmes.map((x) => ({ value: x.id, label: `${x.name} (${x.level})` }))} />
              <div><h3 className="mb-3 font-bold text-navy-800">Personal details</h3><div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Date of birth" name="dateOfBirth" type="date" defaultValue={p.dateOfBirth} required />
                <SelectField label="Gender" name="gender" defaultValue={p.gender ?? ""} placeholder="Select" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} required />
                <TextField label="Phone" name="phone" type="tel" defaultValue={p.phone} required />
                <TextField label="Country" name="country" defaultValue={p.country} required />
                <TextField label="Nationality" name="nationality" defaultValue={p.nationality} />
                <TextField label="Identification type" name="idType" defaultValue={p.idType} hint="e.g. National ID, passport" />
                <TextField label="Identification number" name="idNumber" defaultValue={p.idNumber} />
              </div><TextAreaField label="Address" name="address" rows={2} defaultValue={p.address} required className="mt-4" /></div>
              <div><h3 className="mb-3 font-bold text-navy-800">Previous education</h3><div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Level (e.g. Secondary, Diploma, Degree)" name="eduLevel" defaultValue={edu.level} /><TextField label="Institution" name="eduInstitution" defaultValue={edu.institution} /><TextField label="Qualification" name="eduQualification" defaultValue={edu.qualification} /><TextField label="Year" name="eduYear" defaultValue={edu.year} />
              </div></div>
              <div><h3 className="mb-3 font-bold text-navy-800">Church and ministry background</h3><div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Church / ministry" name="church" defaultValue={m.church} /><TextField label="Your role" name="ministryRole" defaultValue={m.role} /><TextField label="Years of involvement" name="ministryYears" defaultValue={m.years} />
              </div><TextAreaField label="Ministry experience (optional)" name="ministryDescription" rows={3} defaultValue={m.description} className="mt-4" /></div>
              <div><h3 className="mb-3 font-bold text-navy-800">References</h3>{[1, 2].map((i) => <div key={i} className="mb-3 grid gap-3 sm:grid-cols-4"><TextField label={`Referee ${i} name`} name={`refName${i}`} defaultValue={refs[i - 1]?.name} /><TextField label="Relationship" name={`refRel${i}`} defaultValue={refs[i - 1]?.relationship} /><TextField label="Email" name={`refEmail${i}`} type="email" defaultValue={refs[i - 1]?.email} /><TextField label="Phone" name={`refPhone${i}`} defaultValue={refs[i - 1]?.phone} /></div>)}<p className="text-xs text-muted">At least {cfg.referencesRequired} reference(s) required.</p></div>
              <TextAreaField label="Personal statement" name="statement" rows={7} defaultValue={app?.statement ?? ""} hint="Your testimony, calling and why you want to study at FCGBS (at least 50 characters)." required />
            </fieldset>
            {editable && <SubmitButton pendingText="Saving…">Save draft</SubmitButton>}
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Supporting documents" description={`Requested: ${cfg.requiredDocuments.join(", ")}. PDF or image files.`} />
          <div className="space-y-4 p-5">
            {docs.length === 0 ? <p className="text-sm text-muted">No documents uploaded yet.</p> : <ul className="space-y-1 text-sm">{docs.map((d) => <li key={d.id} className="flex items-center gap-2"><span className="font-semibold">{d.kind}</span><Badge tone={d.verified ? "green" : "amber"}>{d.verified ? "Verified" : "Awaiting verification"}</Badge></li>)}</ul>}
            {(editable || (app && ["UNDER_REVIEW", "INTERVIEW_REQUIRED"].includes(app.status))) && app && (
              <ActionForm action={uploadDocumentAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
                <SelectField label="Document type" name="kind" options={[{ value: "IDENTIFICATION", label: "Identification" }, { value: "CERTIFICATE", label: "Certificate / qualification" }, { value: "PHOTO", label: "Passport photograph" }, { value: "REFERENCE", label: "Reference letter" }, { value: "OTHER", label: "Other" }]} />
                <input type="file" name="file" required aria-label="Choose file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx" className="text-sm" />
                <SubmitButton pendingText="Uploading…" size="sm">Upload</SubmitButton>
              </ActionForm>
            )}
            {!app && <p className="text-xs text-muted">Save your draft first to enable uploads.</p>}
          </div>
        </Card>

        {app && app.status === "DRAFT" && (
          <Card><div className="flex flex-wrap items-center justify-between gap-3 p-5"><p className="text-sm text-muted">Ready? Submitting locks the form for review.{cfg.applicationFee > 0 ? ` An application fee of ${cfg.currency} ${cfg.applicationFee.toLocaleString()} applies; payment details are issued by the Finance Office.` : ""}</p><Do variant="gold" size="md" label="Submit application" run={submitApplicationAction} /></div></Card>
        )}
      </main>
    </div>
  );
}
