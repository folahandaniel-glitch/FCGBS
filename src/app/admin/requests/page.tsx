import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Confirm } from "@/components/admin/row-actions";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { pendingRequests } from "@/server/services/selfservice";
import { decideRequestAction } from "../request-actions";

export const metadata: Metadata = { title: "Enrolment requests" };
const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(d) : "—");

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireStaffPage("registration.manage");
  const all = (await searchParams).all === "1";
  const rows = await pendingRequests(all ? "ALL" : "PENDING");
  return (
    <>
      <PageHeader title="Enrolment requests" description="Learners ask for programmes and courses beyond their free certificate. Approving enrols the learner and opens the course for the current semester. Learners are told to contact the school office, so you can confirm payment or suitability first." actions={<Link href={all ? "/admin/requests" : "/admin/requests?all=1"} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">{all ? "Show waiting only" : "Show history"}</Link>} />
      <Card>
        {rows.length === 0 ? <EmptyState icon={<Inbox className="size-6" />} title={all ? "No requests yet." : "No requests are waiting."} /> : (
          <Table>
            <thead><tr><Th>Learner</Th><Th>Asked for</Th><Th>Note</Th><Th>Date</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td><span className="font-semibold text-navy-800">{r.first} {r.last}</span><span className="block text-xs text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span></Td>
                  <Td>{r.kind === "PROGRAMME" ? <><Badge tone="blue">Programme</Badge> <span className="font-semibold">{r.programme}</span></> : <><Badge tone="gold">Course</Badge> <span className="font-mono text-xs">{r.courseCode}</span> {r.course}</>}</Td>
                  <Td className="max-w-xs text-xs text-muted">{r.studentNote ?? "—"}{r.adminNote && <span className="block text-ink/70">Admin: {r.adminNote}</span>}</Td>
                  <Td className="whitespace-nowrap text-xs">{fmt(r.createdAt)}</Td>
                  <Td><Badge tone={r.status === "PENDING" ? "amber" : r.status === "APPROVED" ? "green" : "neutral"}>{r.status.toLowerCase()}</Badge></Td>
                  <Td>{r.status === "PENDING" && (
                    <div className="flex flex-wrap gap-1.5">
                      <Confirm label="Approve" variant="primary" confirmVariant="primary" title="Approve this request?" description="The learner is enrolled and the course is opened for them straight away." reason run={async ({ reason }) => { "use server"; return decideRequestAction(r.id, "APPROVE", reason); }} />
                      <Confirm label="Decline" variant="danger-outline" title="Decline this request?" description="The learner is told it was not approved and to contact the office." reason run={async ({ reason }) => { "use server"; return decideRequestAction(r.id, "REJECT", reason); }} />
                    </div>
                  )}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
