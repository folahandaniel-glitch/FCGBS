import Link from "next/link";
import { eq } from "drizzle-orm";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";

export default async function PoliciesAdmin() {
  await requireStaffPage(["policies.manage", "policies.approve"]);
  const cur = await getDb().select().from(s.policies).where(eq(s.policies.isCurrent, true));
  const reviews = await getDb().select().from(s.policies).where(eq(s.policies.status, "REVIEW"));
  return (
    <>
      <PageHeader title="Policies & doctrine" description="The Statement of Faith, academic-integrity, AI, ethics, safeguarding and privacy policies. Every policy is versioned: changes create a new version that must be approved, and the old version is kept." />
      <Card><ul className="divide-y divide-line">{cur.map((p) => { const pending = reviews.filter((r) => r.key === p.key); return <li key={p.id}><Link href={`/admin/policies/${p.key}`} className="flex items-center justify-between px-5 py-4 hover:bg-royal-50"><span><strong className="text-navy-800">{p.title}</strong><span className="block text-xs text-muted">v{p.version} · effective {p.effectiveOn ?? "—"}</span></span>{pending.length > 0 && <Badge tone="amber">{pending.length} draft awaiting approval</Badge>}</Link></li>; })}</ul></Card>
    </>
  );
}
