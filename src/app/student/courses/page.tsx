import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { Confirm } from "@/components/admin/row-actions";
import { RegisterForm } from "@/components/student/register-form";
import { requireLearnerPage } from "@/server/http";
import { getSetting } from "@/server/settings";
import { availableOfferings, learnerContext, myRegistrations } from "@/server/services/learner";
import { dropCourseAction } from "../actions";

export default async function CoursesPage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc?.primary) return <EmptyState title="Start here: choose your free certificate programme" description="Your access code is active. Pick one certificate programme to study free of charge, and look through everything else the school offers." action={<Link className="rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-bold text-white" href="/student/courses/start">Choose my free programme</Link>} />;
  const regs = await myRegistrations(lc.primary.e.id);
  const cfg = await getSetting("academic");
  const offers = lc.term && lc.primary.e.status === "ACTIVE" ? await availableOfferings(lc.primary.e.id, lc.primary.e.programmeId, lc.term.id) : [];
  const termCredits = regs.filter((r) => r.term === lc.term?.name).reduce((a, r) => a + r.credits, 0);
  const today = new Date().toISOString().slice(0, 10);
  const open = lc.term && (!lc.term.registrationOpens || today >= lc.term.registrationOpens) && (!lc.term.registrationCloses || today <= lc.term.registrationCloses);
  return (
    <>
      <PageHeader title="My courses" description={`${lc.primary.programme}${lc.term ? ` · ${lc.term.name}` : ""}`} />
      <Card>
        <CardHeader title="Registered courses" />
        {regs.length === 0 ? <EmptyState title="No courses registered yet." /> : (
          <Table><thead><tr><Th>Code</Th><Th>Course</Th><Th>Term</Th><Th>Credits</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {regs.map((r) => (
              <tr key={r.regId}><Td className="font-mono text-xs">{r.code}</Td><Td>{r.offeringId ? <Link className="font-semibold text-royal-700 hover:underline" href={`/student/courses/${r.offeringId}`}>{r.title}</Link> : r.title}</Td><Td>{r.term ?? "—"}</Td><Td>{r.credits}</Td><Td>{r.source !== "REGISTERED" ? <Badge tone="gold">{r.source.toLowerCase()}</Badge> : r.resultStatus === "PUBLISHED" || r.resultStatus === "LOCKED" ? <Badge tone="green">{r.grade}</Badge> : <Badge tone="blue">In progress</Badge>}</Td>
                <Td>{(!r.resultStatus || r.resultStatus === "DRAFT") && r.source === "REGISTERED" && <Confirm label="Drop" title={`Drop ${r.code}?`} variant="danger-outline" run={async () => { "use server"; return dropCourseAction(r.regId); }} />}</Td></tr>
            ))}
          </tbody></Table>
        )}
      </Card>
      <Card className="mt-6">
        <CardHeader title="Register for courses" description={open ? `Maximum ${cfg.maxCreditsPerSemester} credits per semester. Prerequisites are checked automatically.` : "Registration is not open for this semester."} />
        <div className="p-5">{offers.length === 0 ? <p className="text-sm text-muted">No further courses are open for your programme this semester.</p> : open ? <RegisterForm rows={offers} maxCredits={cfg.maxCreditsPerSemester} currentCredits={termCredits} /> : <p className="text-sm text-muted">Registration opens {lc.term?.registrationOpens} and closes {lc.term?.registrationCloses}.</p>}</div>
      </Card>
    </>
  );
}
