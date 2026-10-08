import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, StatusBadge, Table, Td, Th, buttonClass, inputClass } from "@/components/ui/primitives";
import { listResource, lookupOptions, resourceFor } from "@/server/admin-resources";
import { requireStaffPage } from "@/server/http";

export default async function ResourceList({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<{ q?: string }> }) {
  const r = resourceFor((await params).resource);
  if (!r) notFound();
  await requireStaffPage(r.perm);
  const q = (await searchParams).q?.slice(0, 60);
  const rows = await listResource(r, q);
  const cols = r.fields.filter((f) => f.list);
  const lookups = Object.fromEntries(await Promise.all(cols.filter((c) => c.lookup).map(async (c) => [c.name, new Map((await lookupOptions(c.lookup!)).map((o) => [o.value, o.label]))] as const)));
  const show = (f: (typeof cols)[number], v: unknown) => {
    if (f.name === "status") return <StatusBadge status={String(v)} />;
    if (f.type === "bool") return v ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>;
    if (f.lookup) return lookups[f.name]?.get(String(v)) ?? "—";
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  };
  return (
    <>
      <PageHeader title={r.label} description={r.help} actions={<Link href={`/admin/r/${r.key}/new`} className={buttonClass("primary", "md")}><Plus className="size-4" /> Add {r.singular.toLowerCase()}</Link>} />
      {r.search && <form role="search" className="mb-4 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder={`Search ${r.label.toLowerCase()}…`} className={inputClass} aria-label="Search" /><button className="rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white">Search</button></form>}
      <Card>
        {rows.length === 0 ? <EmptyState title={`No ${r.label.toLowerCase()} yet.`} action={<Link className="font-semibold text-royal-700 underline" href={`/admin/r/${r.key}/new`}>Add the first one</Link>} /> : (
          <Table><thead><tr>{cols.map((c) => <Th key={c.name}>{c.label}</Th>)}<Th /></tr></thead><tbody>
            {rows.map((row) => <tr key={String(row.id)}>{cols.map((c, i) => <Td key={c.name} className={i === 0 ? "font-semibold text-navy-800" : ""}>{show(c, row[c.name])}</Td>)}<Td><Link href={`/admin/r/${r.key}/${row.id}`} className="font-semibold text-royal-700 hover:underline">Edit</Link></Td></tr>)}
          </tbody></Table>
        )}
      </Card>
    </>
  );
}
