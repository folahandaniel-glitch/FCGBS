import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ContentEditor } from "@/components/admin/editors";
import { CONTENT_LABELS, type ContentKey } from "@/content/defaults";
import { requireStaffPage } from "@/server/http";
import { contentHistory, getContent } from "@/server/services/content";

export default async function ContentEditPage({ params }: { params: Promise<{ key: string }> }) {
  await requireStaffPage("content.manage");
  const key = (await params).key as ContentKey;
  const meta = CONTENT_LABELS[key];
  if (!meta) notFound();
  const [value, hist] = await Promise.all([getContent(key), contentHistory(key)]);
  return (
    <>
      <PageHeader eyebrow="Website content" title={meta.label} description={meta.help} breadcrumbs={[{ href: "/admin/content", label: "Website content" }, { label: meta.label }]} />
      <Card className="p-5"><ContentEditor contentKey={key} initial={JSON.parse(JSON.stringify(value))} history={hist.map((h) => ({ version: h.version, at: h.createdAt.toISOString().slice(0, 16).replace("T", " ") }))} /></Card>
    </>
  );
}
