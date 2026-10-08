import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { Card, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "ACCEPTED", "CONDITIONALLY_ACCEPTED", "WAITLISTED", "REJECTED", "WITHDRAWN", "DRAFT"] as const;

export default async function AdmissionsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("admissions.view");
  const status = (await searchParams).status;
  const where = status && (STATUSES as readonly string[]).includes(status) ? eq(s.applications.status, status as "SUBMITTED") : undefined;
  const rows = await getDb()
    .select({ id: s.applications.id, no: s.applications.applicationNo, status: s.applications.status, submittedAt: s.applications.submittedAt, first: s.users.firstName, last: s.users.lastName, email: s.users.email, programme: s.programmes.name, registered: s.applications.registeredAt, accepted: s.applications.offerAcceptedAt })
    .from(s.applications)
    .innerJoin(s.users, eq(s.users.id, s.applications.userId))
    .innerJoin(s.programmes, eq(s.programmes.id, s.applications.programmeId))
    .where(and(where, sql`${s.applications.status} <> 'DRAFT' or ${status ?? ""} = 'DRAFT'`))
    .orderBy(desc(s.applications.submittedAt))
    .limit(200);
  return (
    <>
      <PageHeader title="Applications" description="Review, interview, decide and register admitted applicants." />
      <div className="mb-4 flex flex-wrap gap-2">{[undefined, ...STATUSES].map((st) => <Link key={st ?? "all"} href={st ? `/admin/admissions?status=${st}` : "/admin/admissions"} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${st === status ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>{st ? st.replace(/_/g, " ").toLowerCase() : "all (submitted)"}</Link>)}</div>
      <Card>
        {rows.length === 0 ? <EmptyState title="No applications found." /> : (
          <Table><thead><tr><Th>No.</Th><Th>Applicant</Th><Th>Programme</Th><Th>Submitted</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {rows.map((r) => <tr key={r.id}><Td className="font-mono text-xs">{r.no}</Td><Td>{r.first} {r.last}<span className="block text-xs text-muted">{r.email}</span></Td><Td className="text-xs">{r.programme}</Td><Td className="whitespace-nowrap text-xs">{r.submittedAt?.toLocaleDateString("en-GB") ?? "—"}</Td><Td><StatusBadge status={r.status} />{r.registered && <span className="ml-1 text-xs text-success-600">registered</span>}</Td><Td><Link href={`/admin/admissions/${r.id}`} className="font-semibold text-royal-700 hover:underline">Open</Link></Td></tr>)}
          </tbody></Table>
        )}
      </Card>
    </>
  );
}
