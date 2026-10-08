import { desc, eq } from "drizzle-orm";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { learnerContext } from "@/server/services/learner";
import { evaluateGraduation } from "@/server/services/credentials";

export default async function RecordsPage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc?.primary) return <EmptyState title="No student record." />;
  const db = getDb();
  const ids = lc.enrolments.map((e) => e.e.id);
  const certs = (await Promise.all(ids.map((id) => db.select().from(s.certificates).where(eq(s.certificates.enrolmentId, id))))).flat();
  const trans = (await Promise.all(ids.map((id) => db.select().from(s.transcripts).where(eq(s.transcripts.enrolmentId, id)).orderBy(desc(s.transcripts.createdAt))))).flat().filter((t) => t.status === "ISSUED");
  const [grad] = await db.select().from(s.graduations).where(eq(s.graduations.enrolmentId, lc.primary.e.id));
  const ev = lc.primary.e.status === "ACTIVE" ? await evaluateGraduation(lc.primary.e.id) : null;
  return (
    <>
      <PageHeader title="Transcript, certificate & graduation" />
      <Card><CardHeader title="Graduation status" description={grad ? grad.status.replace(/_/g, " ").toLowerCase() : "Not yet on a graduation list"} />
        {ev && <ul className="divide-y divide-line">{ev.checks.map((c) => <li key={c.key} className="flex items-start justify-between gap-3 px-5 py-3 text-sm"><span className="font-medium">{c.label}<span className="block text-xs text-muted">{c.detail}</span></span><Badge tone={c.ok ? "green" : "amber"}>{c.ok ? "Met" : "Outstanding"}</Badge></li>)}</ul>}
        {ev && <p className="p-5 text-xs text-muted">Eligibility is a checklist. Graduation also needs Registrar recommendation and Academic Board approval.</p>}
      </Card>
      <Card className="mt-6"><CardHeader title="Certificates" />
        {certs.length === 0 ? <EmptyState title="No certificate has been issued yet." description="Certificates are issued after the Academic Board approves graduation." /> : <ul className="divide-y divide-line">{certs.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><span><strong>{c.awardTitle}</strong><br /><span className="text-xs text-muted">{c.number} · {c.awardDate}</span></span><span className="flex items-center gap-3"><Badge tone={c.status === "VALID" ? "green" : "red"}>{c.status.toLowerCase()}</Badge>{c.status === "VALID" && <a className="font-semibold text-royal-700 underline" href={`/api/v1/documents/certificate/${c.id}`} target="_blank" rel="noopener">View PDF</a>}</span></li>)}</ul>}
      </Card>
      <Card className="mt-6"><CardHeader title="Official transcripts" />
        {trans.length === 0 ? <><EmptyState title="No transcript has been issued." description="Request an official transcript from the Registrar's office." /><Alert tone="info" className="m-5 mt-0">Issued transcripts appear here with a QR verification code.</Alert></> : <ul className="divide-y divide-line">{trans.map((t) => <li key={t.id} className="flex items-center justify-between px-5 py-4 text-sm"><span>{t.number}<br /><span className="text-xs text-muted">{t.issuedAt?.toLocaleDateString("en-GB")}</span></span><a className="font-semibold text-royal-700 underline" href={`/api/v1/documents/transcript/${t.id}`} target="_blank" rel="noopener">View PDF</a></li>)}</ul>}
      </Card>
    </>
  );
}
