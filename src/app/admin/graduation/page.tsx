import { desc, eq } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Confirm, Do } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { evaluateGraduation } from "@/server/services/credentials";
import { boardDecisionAction, completeGraduationAction, issueCertificateAction, recommendGraduationAction, revokeCertificateAction } from "../ops-actions";

export default async function GraduationAdmin() {
  const sess = await requireStaffPage(["graduation.registrar", "graduation.board", "certificates.issue", "transcripts.issue"]);
  const db = getDb();
  // Candidates not yet on a list: active enrolments with every check met.
  const active = await db.select({ e: s.enrolments.id, programme: s.programmes.name, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber }).from(s.enrolments).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).where(eq(s.enrolments.status, "ACTIVE")).limit(300);
  const listed = new Set((await db.select({ e: s.graduations.enrolmentId }).from(s.graduations)).map((g) => g.e));
  const checks = can(sess.actor, "graduation.registrar") ? await Promise.all(active.filter((a) => !listed.has(a.e)).map(async (a) => ({ ...a, ev: await evaluateGraduation(a.e) }))) : [];
  const eligible = checks.filter((c) => c.ev.eligible);
  const lists = await db.select({ g: s.graduations, programme: s.programmes.name, first: s.users.firstName, last: s.users.lastName, num: s.students.studentNumber }).from(s.graduations).innerJoin(s.enrolments, eq(s.enrolments.id, s.graduations.enrolmentId)).innerJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).innerJoin(s.users, eq(s.users.id, s.students.userId)).orderBy(desc(s.graduations.createdAt)).limit(200);
  const certs = await db.select().from(s.certificates).orderBy(desc(s.certificates.issuedAt)).limit(100);
  return (
    <>
      <PageHeader title="Graduation & credentials" description="Eligible → Registrar recommends → Academic Board approves → Graduated → Certificate issued. Each step is a different permission; certificates cannot be issued without Board approval." />
      {can(sess.actor, "graduation.registrar") && (
        <Card className="mb-6"><CardHeader title="Eligible candidates" description="All eight requirements are met (courses, credits, CGPA, published results, practicum, research, clearance, discipline)." />
          {eligible.length === 0 ? <EmptyState title="No new candidates are eligible." /> : <ul className="divide-y divide-line">{eligible.map((c) => <li key={c.e} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span>{c.last} {c.first} <span className="font-mono text-xs text-muted">{c.num}</span><span className="block text-xs text-muted">{c.programme} · CGPA {c.ev.summary.cgpa.toFixed(2)}</span></span><Confirm label="Recommend to the Board" title="Recommend for graduation?" variant="secondary" confirmVariant="primary" run={async () => { "use server"; return recommendGraduationAction(c.e); }} /></li>)}</ul>}
        </Card>
      )}
      <Card className="mb-6"><CardHeader title="Graduation list" />
        {lists.length === 0 ? <EmptyState title="Nobody is on a graduation list yet." /> : <ul className="divide-y divide-line">{lists.map(({ g, programme, first, last, num }) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <span>{last} {first} <span className="font-mono text-xs text-muted">{num}</span><span className="block text-xs text-muted">{programme}</span></span>
            <span className="flex flex-wrap items-center gap-2"><StatusBadge status={g.status} />
              {g.status === "REGISTRAR_APPROVED" && can(sess.actor, "graduation.board") && g.registrarBy !== sess.user.id && <><Confirm label="Board approve" title="Approve graduation?" reason confirmVariant="primary" run={async ({ reason }) => { "use server"; return boardDecisionAction(g.id, true, reason); }} /><Confirm label="Reject" title="Reject graduation?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return boardDecisionAction(g.id, false, reason); }} /></>}
              {g.status === "REGISTRAR_APPROVED" && g.registrarBy === sess.user.id && <Badge tone="amber">Awaiting a different Board member</Badge>}
              {g.status === "BOARD_APPROVED" && can(sess.actor, "graduation.registrar") && <Do label="Complete graduation" run={async () => { "use server"; return completeGraduationAction(g.id); }} />}
              {["BOARD_APPROVED", "GRADUATED"].includes(g.status) && can(sess.actor, "certificates.issue") && <Do variant="gold" label="Issue certificate" run={async () => { "use server"; return issueCertificateAction(g.id); }} />}
            </span>
          </li>))}</ul>}
      </Card>
      <Card><CardHeader title="Certificates" />
        {certs.length === 0 ? <EmptyState title="No certificates issued yet." /> : <ul className="divide-y divide-line">{certs.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><span><strong>{c.holderName}</strong> — {c.awardTitle}<span className="block font-mono text-xs text-muted">{c.number} · {c.awardDate}</span></span><span className="flex items-center gap-3"><StatusBadge status={c.status} /><a className="font-semibold text-royal-700 underline" href={`/api/v1/documents/certificate/${c.id}`} target="_blank" rel="noopener">PDF</a>{c.status === "VALID" && can(sess.actor, "certificates.revoke") && <Confirm label="Revoke" title="Revoke this certificate?" description="The public verification page will show it as revoked." reason variant="danger-outline" run={async ({ reason }) => { "use server"; return revokeCertificateAction(c.id, reason); }} />}</span></li>)}</ul>}
      </Card>
    </>
  );
}
