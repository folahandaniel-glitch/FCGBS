import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { myOfferings } from "@/server/services/teaching";

export default async function TeachHome() {
  const sess = await requireStaffPage(["teaching.own", "teaching.any"]);
  const offerings = await myOfferings(sess.actor);
  const pending = offerings.reduce((a, o) => a + o.pendingGrading, 0);
  return (
    <>
      <PageHeader eyebrow="Faculty portal" title={`Welcome, ${sess.user.firstName}`} description="Your assigned courses, class lists, assessments, attendance and results." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Assigned courses" value={offerings.length} tone="navy" />
        <Stat label="Students" value={offerings.reduce((a, o) => a + o.students, 0)} />
        <Stat label="Pending grading" value={pending} tone="gold" />
      </div>
      <Card className="mt-6">
        <CardHeader title="My courses" />
        {offerings.length === 0 ? (
          <EmptyState title="No courses have been assigned to you yet." description="The Dean or Registrar assigns lecturers when a course is offered." />
        ) : (
          <ul className="divide-y divide-line">
            {offerings.map((o) => (
              <li key={o.id}>
                <Link href={`/teach/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-royal-50">
                  <span><span className="font-mono text-xs font-bold text-royal-700">{o.code}</span> <strong className="text-navy-800">{o.title}</strong><span className="block text-xs text-muted">{o.term} · {o.students} students</span></span>
                  {o.pendingGrading > 0 && <Badge tone="amber">{o.pendingGrading} to grade</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
