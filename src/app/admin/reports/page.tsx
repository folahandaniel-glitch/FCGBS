import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { REPORTS } from "@/server/services/reports";
import { courseEvaluationSummary } from "@/server/services/quality";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const sess = await requireStaffPage(["reports.view", "qa.manage"]);
  const avail = REPORTS.filter((r) => can(sess.actor, r.perm));
  const wanted = (await searchParams).r;
  const sel = avail.find((r) => r.key === wanted) ?? avail[0];
  const rows = sel ? await sel.query() : [];
  void courseEvaluationSummary;
  const exportOk = can(sess.actor, "reports.export");
  return (
    <>
      <PageHeader title="Reports & analytics" description="Aggregated institutional reports. Print this page or export CSV (opens in Excel)." />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Reports" className="no-print space-y-1">{avail.map((r) => <a key={r.key} href={`/admin/reports?r=${r.key}`} className={`block rounded-xl px-3 py-2 text-sm font-semibold ${r.key === sel?.key ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>{r.title}</a>)}</nav>
        <Card>
          {sel ? (
            <>
              <CardHeader title={sel.title} description={sel.description} action={<span className="no-print flex gap-2">{exportOk && <a href={`/api/v1/reports/${sel.key}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Export CSV</a>}</span>} />
              {rows.length === 0 ? <EmptyState title="No data yet." /> : <Table><thead><tr>{sel.columns.map((c) => <Th key={c}>{c.replace(/_/g, " ")}</Th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{sel.columns.map((c) => <Td key={c}>{String(r[c] ?? "—")}</Td>)}</tr>)}</tbody></Table>}
            </>
          ) : <EmptyState title="No reports available to you." />}
        </Card>
      </div>
    </>
  );
}
