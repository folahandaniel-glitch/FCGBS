import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat, Table, Td, Th } from "@/components/ui/primitives";
import { Confirm } from "@/components/admin/row-actions";
import { requireLearnerPage } from "@/server/http";
import { enrolmentSummary } from "@/server/services/academics";
import { learnerContext } from "@/server/services/learner";
import { appealAction } from "../actions";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc?.primary) return <EmptyState title="No active enrolment." />;
  const sum = await enrolmentSummary(lc.primary.e.id);
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Results, GPA & CGPA" description="Only results that have been reviewed, approved and published appear here. Calculations are made on the server." />
      {sp.submitted && <Alert tone="success" className="mb-4">Your examination was submitted. Results appear here after your lecturer and the Registrar publish them.</Alert>}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="CGPA" value={sum.records.some((r) => r.graded) ? sum.cgpa.toFixed(2) : "—"} tone="gold" hint={sum.classification ?? undefined} />
        <Stat label="Credits earned" value={sum.creditsEarned} />
        <Stat label="Standing" value={sum.standing.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} tone="green" />
        <Stat label="Courses graded" value={sum.records.filter((r) => r.graded).length} tone="navy" />
      </div>
      {sum.terms.length === 0 && <Card className="mt-6"><EmptyState title="No examination results are available." /></Card>}
      {sum.terms.map((t) => (
        <Card key={t.name} className="mt-6">
          <CardHeader title={t.name} description={`Semester GPA ${t.gpa.toFixed(2)} · ${t.credits} credits earned`} />
          <Table><thead><tr><Th>Code</Th><Th>Course</Th><Th>Credits</Th><Th>Total</Th><Th>Grade</Th><Th /></tr></thead><tbody>
            {t.records.map((r) => <tr key={r.courseId + r.order}><Td className="font-mono text-xs">{r.code}</Td><Td>{r.title}</Td><Td>{r.credits}</Td><Td>{r.total ?? "—"}</Td><Td><Badge tone={r.passed ? "green" : "red"}>{r.grade}</Badge></Td><Td>{r.graded && <Confirm label="Appeal" title={`Appeal ${r.code}`} description="Explain why you believe this result should be reviewed. The Academic Board will consider it." reason run={async ({ reason }) => { "use server"; const { dbResultId } = await import("@/server/services/appeal-lookup"); return appealAction(await dbResultId(r.courseId), reason); }} variant="secondary" confirmVariant="primary" confirmLabel="Submit appeal" />}</Td></tr>)}
          </tbody></Table>
        </Card>
      ))}
    </>
  );
}
