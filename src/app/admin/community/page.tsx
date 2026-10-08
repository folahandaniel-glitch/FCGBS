import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Do } from "@/components/admin/row-actions";
import { requireStaffPage } from "@/server/http";
import { openReports } from "@/server/services/community";
import { moderateAction } from "@/app/student/community-actions";

export default async function CommunityAdmin() {
  await requireStaffPage("community.moderate");
  const reports = await openReports();
  return (
    <>
      <PageHeader title="Community moderation" description="Reported posts. Hiding a post is audited; the author is not named in public." />
      <Card><CardHeader title={`Open reports (${reports.length})`} />
        {reports.length === 0 ? <EmptyState title="No open reports." /> : <ul className="divide-y divide-line">{reports.map((r) => <li key={r.id} className="space-y-2 px-5 py-4 text-sm"><div className="flex items-center gap-2"><Badge tone="blue">{r.scope.toLowerCase()}</Badge><span className="text-xs text-muted">by {r.authorFirst} {r.authorLast}</span></div><p className="whitespace-pre-wrap rounded-lg bg-surface p-3">{r.body}</p><p className="text-xs text-muted">Reason: {r.reason}</p><div className="flex gap-2"><Do label="Hide post" run={async () => { "use server"; return moderateAction(r.id, "HIDE"); }} /><Do label="Dismiss report" run={async () => { "use server"; return moderateAction(r.id, "DISMISS"); }} /></div></li>)}</ul>}
      </Card>
    </>
  );
}
