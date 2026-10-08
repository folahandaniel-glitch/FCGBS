import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, inputClass } from "@/components/ui/primitives";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const sess = await requireStaffPage(["audit.view", "super.security"]);
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const db = getDb();
  const tab = sp.tab === "security" && can(sess.actor, "super.security") ? "security" : "audit";
  const logs = tab === "audit" ? await db.select({ l: s.auditLogs, first: s.users.firstName, last: s.users.lastName }).from(s.auditLogs).leftJoin(s.users, eq(s.users.id, s.auditLogs.actorId)).where(q ? or(ilike(s.auditLogs.action, `%${q}%`), ilike(s.auditLogs.summary, `%${q}%`), ilike(s.auditLogs.entityType, `%${q}%`)) : undefined).orderBy(desc(s.auditLogs.createdAt)).limit(200) : [];
  const events = tab === "security" ? await db.select().from(s.securityEvents).orderBy(desc(s.securityEvents.createdAt)).limit(200) : [];
  return (
    <>
      <PageHeader title="Audit & security" description="Append-only: the database rejects edits and deletions of audit records. Who, what, when, why, approver, previous and new values." />
      <div className="mb-4 flex flex-wrap gap-2"><Link href="/admin/audit" className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === "audit" ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line"}`}>Audit log</Link>{can(sess.actor, "super.security") && <Link href="/admin/audit?tab=security" className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === "security" ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line"}`}>Security events</Link>}</div>
      {tab === "audit" && <form role="search" className="mb-4 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Filter by action, entity or summary…" className={inputClass} aria-label="Filter" /><button className="rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white">Filter</button></form>}
      <Card>
        {tab === "audit" ? (logs.length === 0 ? <EmptyState title="No audit records." /> : (
          <Table><thead><tr><Th>When (UTC)</Th><Th>Who</Th><Th>Action</Th><Th>Summary</Th><Th>Details</Th></tr></thead><tbody>
            {logs.map(({ l, first, last }) => <tr key={l.id}><Td className="whitespace-nowrap text-xs">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</Td><Td className="text-xs">{first ? `${first} ${last}` : l.actorType.toLowerCase()}</Td><Td className="font-mono text-xs">{l.action}</Td><Td className="text-xs">{l.summary}</Td><Td className="max-w-xs"><details><summary className="cursor-pointer text-xs text-royal-700">view</summary><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[0.65rem]">{JSON.stringify(l.metadata, null, 1)}</pre></details></Td></tr>)}
          </tbody></Table>
        )) : (events.length === 0 ? <EmptyState title="No security events." /> : (
          <Table><thead><tr><Th>When</Th><Th>Type</Th><Th>Severity</Th><Th>IP</Th><Th>Detail</Th></tr></thead><tbody>{events.map((e) => <tr key={e.id}><Td className="whitespace-nowrap text-xs">{e.createdAt.toISOString().slice(0, 19).replace("T", " ")}</Td><Td className="font-mono text-xs">{e.type}</Td><Td><Badge tone={["HIGH", "CRITICAL"].includes(e.severity) ? "red" : e.severity === "MEDIUM" ? "amber" : "neutral"}>{e.severity.toLowerCase()}</Badge></Td><Td className="text-xs">{e.ip}</Td><Td className="max-w-xs truncate text-xs">{JSON.stringify(e.detail)}</Td></tr>)}</tbody></Table>
        ))}
      </Card>
    </>
  );
}
