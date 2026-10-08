import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { globalSearch } from "@/server/services/search";

export default async function AdminSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sess = await requireStaffPage();
  const q = (await searchParams).q ?? "";
  const hits = await globalSearch(sess.actor, q);
  return (
    <>
      <PageHeader title="Search" description={q ? `Results for “${q}” — only records you are permitted to see.` : "Type at least two characters in the search box."} />
      <Card>{hits.length === 0 ? <EmptyState title="Nothing found." /> : <ul className="divide-y divide-line">{hits.map((h, i) => <li key={i}><Link href={h.href} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-royal-50"><span><strong className="text-navy-800">{h.title}</strong>{h.sub && <span className="ml-2 font-mono text-xs text-muted">{h.sub}</span>}</span><Badge tone="blue">{h.kind}</Badge></Link></li>)}</ul>}</Card>
    </>
  );
}
