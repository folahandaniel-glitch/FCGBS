import Link from "next/link";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { Alert, Card, CardHeader, PageHeader, Stat, Table, Td, Th } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { can } from "@/core/permissions";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sess = await requireStaffPage();
  const sp = await searchParams;
  const db = getDb();
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [applicants, submitted, students, faculty, programmes, courses, pendingResults, certs, graduating, openCases, exams] = await Promise.all([
    n(db.select({ n: count() }).from(s.applications)),
    n(db.select({ n: count() }).from(s.applications).where(inArray(s.applications.status, ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED"]))),
    n(db.select({ n: count() }).from(s.students).where(eq(s.students.status, "ACTIVE"))),
    n(db.select({ n: count() }).from(s.users).where(eq(s.users.userType, "STAFF"))),
    n(db.select({ n: count() }).from(s.programmes).where(eq(s.programmes.status, "PUBLISHED"))),
    n(db.select({ n: count() }).from(s.courses).where(eq(s.courses.status, "PUBLISHED"))),
    n(db.select({ n: count() }).from(s.results).where(inArray(s.results.status, ["SUBMITTED", "REVIEWED", "APPROVED"]))),
    n(db.select({ n: count() }).from(s.certificates).where(eq(s.certificates.status, "VALID"))),
    n(db.select({ n: count() }).from(s.graduations).where(inArray(s.graduations.status, ["ELIGIBLE", "REGISTRAR_APPROVED", "BOARD_APPROVED"]))),
    n(db.select({ n: count() }).from(s.integrityCases).where(inArray(s.integrityCases.status, ["REPORTED", "INVESTIGATING", "APPEALED"]))),
    n(db.select({ n: count() }).from(s.assessments).where(sql`${s.assessments.kind} = 'EXAM' and ${s.assessments.status} = 'PUBLISHED'`)),
  ]);
  const recent = can(sess.actor, "audit.view") ? await db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(8) : [];
  return (
    <>
      <PageHeader eyebrow="Institutional dashboard" title={`Welcome, ${sess.user.firstName}`} description="A live view of admissions, academics, results and credentials." />
      {sp.denied && <Alert tone="warning" className="mb-4">You do not have permission to open that area.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total applicants" value={applicants} hint={`${submitted} awaiting review`} />
        <Stat label="Active students" value={students} tone="green" />
        <Stat label="Faculty & staff" value={faculty} tone="navy" />
        <Stat label="Programmes · Courses" value={`${programmes} · ${courses}`} tone="gold" />
        <Stat label="Results pending approval" value={pendingResults} tone="red" />
        <Stat label="Graduation candidates" value={graduating} />
        <Stat label="Certificates issued" value={certs} tone="gold" />
        <Stat label="Open integrity cases · Live exams" value={`${openCases} · ${exams}`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {recent.length > 0 && (
          <Card>
            <CardHeader title="Recent audit activity" action={<Link href="/admin/audit" className="text-sm font-semibold text-royal-700 hover:underline">View all</Link>} />
            <Table><thead><tr><Th>When</Th><Th>Action</Th><Th>Summary</Th></tr></thead><tbody>{recent.map((r) => <tr key={r.id}><Td className="whitespace-nowrap text-xs">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Td><Td className="font-mono text-xs">{r.action}</Td><Td className="text-xs">{r.summary}</Td></tr>)}</tbody></Table>
          </Card>
        )}
        <Card>
          <CardHeader title="Outstanding tasks" />
          <ul className="space-y-2 p-4 text-sm">
            {[[submitted, "applications to review", "/admin/admissions"], [pendingResults, "results awaiting review or approval", "/admin/results"], [graduating, "graduation candidates in progress", "/admin/graduation"], [openCases, "open integrity cases", "/admin/integrity"]].map(([k, label, href]) => (
              <li key={String(label)} className="flex items-center justify-between"><span>{label as string}</span><Link href={href as string} className="rounded-full bg-royal-50 px-2.5 py-0.5 font-bold text-royal-700">{k as number}</Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
