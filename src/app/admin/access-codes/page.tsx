import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { listCodes } from "@/server/services/access";
import { getSetting } from "@/server/settings";
import { AdjustAccess, AssignAccess, CodeFeaturesForm, CodeRowActions, GenerateCodes } from "@/components/admin/code-controls";
import { Card, CardHeader, cx, EmptyState, PageHeader, Pagination, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Access codes" };
const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(d)) : "—");
const TABS = ["", "UNUSED", "ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED"];

export default async function AccessCodesPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; batchId?: string; page?: string }> }) {
  const s = await requireStaffPage("codes.view");
  const sp = await searchParams;
  const [cfg, list] = await Promise.all([getSetting("accessCodes"), listCodes({ status: sp.status, search: sp.search, batchId: sp.batchId, page: Number(sp.page ?? 1) })]);
  const a = s.actor;
  const href = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...o })) if (v) u.set(k, v); const q = u.toString(); return `/admin/access-codes${q ? `?${q}` : ""}`; };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Access" title="Access codes" description={`Nobody except staff can use a learning feature without an active code. Each code gives ${cfg.defaultDays} days by default, starts counting when it is first activated, and belongs to one account. Settings (default days, contact number) are under Settings → Access codes.`} />
      {can(a, "codes.generate") && (
        <>
          <Card><CardHeader title="Generate codes" description="Cryptographically random, unique and non-sequential. Choose which features a code opens, or leave it open to everything." /><div className="p-5"><GenerateCodes defaultDays={cfg.defaultDays} maxBulk={cfg.maxBulk} /></div></Card>
          <Card><CardHeader title="Give access to one person" description="Makes a fresh code and activates it on that learner's account in one step (recorded with your reason)." /><div className="p-5"><AssignAccess defaultDays={cfg.defaultDays} /></div></Card>
        </>
      )}
      <nav aria-label="Status" className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map((t) => <Link key={t || "all"} href={href({ status: t || undefined, page: undefined })} className={cx("whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ring-1", (sp.status ?? "") === t ? "bg-navy-800 text-white ring-navy-800" : "bg-white text-navy-800 ring-line hover:bg-surface")}>{t ? t.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "All"} <span className="opacity-70">{t ? (list.counts[t] ?? 0) : Object.values(list.counts).reduce((x, y) => x + y, 0)}</span></Link>)}
      </nav>
      <form role="search" action="/admin/access-codes" className="flex max-w-lg gap-2"><input name="search" defaultValue={sp.search} placeholder="Last 4 characters, full code, e-mail, name or note" aria-label="Search codes" className="block w-full rounded-xl border border-line px-3 py-2 text-sm" /><button className="rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white">Search</button></form>
      <Card>
        {list.rows.length ? (
          <Table>
            <thead><tr><Th>Code</Th><Th>Status</Th><Th>Days</Th><Th>Created</Th><Th>Used by</Th><Th>Activated</Th><Th>Expires</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td className="font-mono text-sm font-bold text-navy-800">…{r.suffix}{r.note && <p className="font-sans text-xs font-normal text-muted">{r.note}</p>}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>{r.durationDays}{r.features && <span className="ml-1.5 text-xs text-muted">({r.features.length} features)</span>}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmt(r.createdAt)}</Td>
                  <Td>{r.userId ? <span className="text-sm font-semibold text-navy-800">{r.userName}<span className="block text-xs font-normal text-muted">{r.userEmail}</span></span> : <span className="text-muted">—</span>}</Td>
                  <Td className="whitespace-nowrap text-xs">{fmt(r.activatedAt)}</Td>
                  <Td className="whitespace-nowrap text-xs">{fmt(r.expiresAt)}{r.originalExpiresAt && r.expiresAt && +new Date(r.originalExpiresAt) !== +new Date(r.expiresAt) && <p className="text-muted">orig. {fmt(r.originalExpiresAt)}</p>}</Td>
                  <Td className="text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {can(a, "codes.manage") && <details className="relative text-left"><summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs font-semibold text-royal-600 ring-1 ring-line hover:bg-royal-50">Features{r.features ? ` (${r.features.length})` : ""}</summary><div className="absolute right-0 z-20 mt-2 w-[min(40rem,92vw)] rounded-2xl border border-line bg-white p-4 shadow-lift"><CodeFeaturesForm id={r.id} features={r.features} /></div></details>}
                      {can(a, "codes.manage") && <CodeRowActions id={r.id} status={r.status} activated={Boolean(r.userId)} canReveal={can(a, "codes.generate")} />}
                      {can(a, "codes.manage") && r.periodId && <AdjustAccess periodId={r.periodId} />}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyState icon={<KeyRound className="size-6" />} title="No codes found" />}
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} href={(p) => href({ page: String(p) })} />
      </Card>
    </div>
  );
}
