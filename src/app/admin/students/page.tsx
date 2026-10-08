import Link from "next/link";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { Card, EmptyState, PageHeader, StatusBadge, Table, Td, Th, inputClass } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

export default async function StudentsAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaffPage("students.view");
  const q = (await searchParams).q?.trim().slice(0, 60);
  const rows = await getDb()
    .select({ id: s.students.id, number: s.students.studentNumber, status: s.students.status, standing: s.students.standing, first: s.users.firstName, last: s.users.lastName, email: s.users.email, programme: s.programmes.name })
    .from(s.students)
    .innerJoin(s.users, eq(s.users.id, s.students.userId))
    .leftJoin(s.enrolments, and(eq(s.enrolments.studentId, s.students.id), eq(s.enrolments.status, "ACTIVE")))
    .leftJoin(s.programmes, eq(s.programmes.id, s.enrolments.programmeId))
    .where(q ? or(ilike(s.users.lastName, `%${q}%`), ilike(s.users.firstName, `%${q}%`), ilike(s.students.studentNumber, `%${q}%`), ilike(s.users.email, `%${q}%`)) : undefined)
    .orderBy(asc(s.users.lastName))
    .limit(200);
  return (
    <>
      <PageHeader title="Students" description="Student records, standing, registration and credentials." />
      <form role="search" className="mb-4 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Search name, ID or email…" className={inputClass} aria-label="Search students" /><button className="rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white">Search</button></form>
      <Card>
        {rows.length === 0 ? <EmptyState title="No students found." description="Students appear here after an admitted applicant is registered." /> : (
          <Table><thead><tr><Th>ID</Th><Th>Name</Th><Th>Programme</Th><Th>Status</Th><Th>Standing</Th><Th /></tr></thead><tbody>
            {rows.map((r) => <tr key={r.id}><Td className="font-mono text-xs">{r.number}</Td><Td>{r.last} {r.first}<span className="block text-xs text-muted">{r.email}</span></Td><Td className="text-xs">{r.programme ?? "—"}</Td><Td><StatusBadge status={r.status} /></Td><Td className="text-xs">{r.standing.replace(/_/g, " ").toLowerCase()}</Td><Td><Link href={`/admin/students/${r.id}`} className="font-semibold text-royal-700 hover:underline">Open</Link></Td></tr>)}
          </tbody></Table>
        )}
      </Card>
    </>
  );
}
