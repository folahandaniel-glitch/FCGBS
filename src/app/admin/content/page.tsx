import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { CONTENT_LABELS, type ContentKey } from "@/content/defaults";
import { requireStaffPage } from "@/server/http";

export default async function ContentIndex() {
  await requireStaffPage("content.manage");
  const groups = Object.entries(CONTENT_LABELS).reduce<Record<string, [string, (typeof CONTENT_LABELS)[ContentKey]][]>>((acc, [k, v]) => ((acc[v.group] ??= []).push([k, v]), acc), {});
  return (
    <>
      <PageHeader title="Website content" description="Every public page's text, the menu and the homepage carousel are edited here. Changes are versioned; you can restore any earlier version." />
      <div className="grid gap-5 lg:grid-cols-2">
        {Object.entries(groups).map(([g, items]) => (
          <Card key={g}><CardHeader title={g} /><ul className="divide-y divide-line">{items.map(([k, v]) => <li key={k}><Link href={`/admin/content/${k}`} className="block px-5 py-3 hover:bg-royal-50"><p className="font-semibold text-navy-800">{v.label}</p><p className="text-xs text-muted">{v.help}</p></Link></li>)}</ul></Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Also manage <Link href="/admin/posts" className="font-semibold text-royal-700 underline">news, events, announcements and FAQs</Link>, and the <Link href="/admin/branding" className="font-semibold text-royal-700 underline">logo and pictures</Link>.</p>
    </>
  );
}
