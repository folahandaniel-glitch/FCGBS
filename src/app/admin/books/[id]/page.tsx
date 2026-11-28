import Link from "next/link";
import { notFound } from "next/navigation";
import { Confirm, Do } from "@/components/admin/row-actions";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Badge, Card, CardHeader, inputClass, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { splitChapters } from "@/core/books";
import { requireStaffPage } from "@/server/http";
import { bookById, codesFor } from "@/server/services/books";
import { downloadToggleAction, generateCodesAction, revokeCodeAction } from "../actions";
import { BookForm } from "../book-form";

export default async function AdminBook({ params }: { params: Promise<{ id: string }> }) {
  const sess = await requireStaffPage("super.accounts");
  const { id } = await params;
  const b = /^[0-9a-f-]{36}$/i.test(id) ? await bookById(id) : null;
  if (!b) notFound();
  const codes = await codesFor(sess.actor, b.id);
  const chapters = splitChapters(b.manuscript);
  return (
    <>
      <PageHeader title={b.title} breadcrumbs={[{ href: "/admin/books", label: "Books" }, { label: b.title }]} description={`${chapters.length} chapters · ${codes.filter((c) => c.status === "USED").length} sold · ${codes.filter((c) => c.status === "UNUSED").length} unused codes`}
        actions={<Link href={`/books/${b.slug}`} className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-line">Preview the book</Link>} />
      <Card className="p-5"><BookForm book={b} /></Card>

      <Card className="mt-6">
        <CardHeader title="Purchase codes" description="Create a code after a buyer has paid. Each code works once, for this book only." />
        <div className="p-5">
          <ActionForm action={generateCodesAction} resetOnSuccess successMessage="Codes created." className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="bookId" value={b.id} />
            <label className="text-sm font-semibold">How many<input name="count" type="number" min={1} max={200} defaultValue={1} className={`${inputClass} mt-1 w-28`} /></label>
            <label className="flex-1 text-sm font-semibold">Note (buyer, receipt number)<input name="note" className={`${inputClass} mt-1`} /></label>
            <SubmitButton pendingText="Creating…">Create codes</SubmitButton>
          </ActionForm>
        </div>
        {codes.length > 0 && (
          <Table><thead><tr><Th>Code</Th><Th>Status</Th><Th>Buyer</Th><Th>Note</Th><Th>Download</Th><Th /></tr></thead><tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <Td className="select-all whitespace-nowrap font-mono text-xs">{c.code}</Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td className="text-xs">{c.buyer ?? "—"}{c.buyerEmail && <span className="block text-muted">{c.buyerEmail}</span>}</Td>
                <Td className="text-xs">{c.note ?? "—"}</Td>
                <Td>{c.download ? <Badge tone="green">on</Badge> : <Badge>off</Badge>}</Td>
                <Td className="space-x-2 whitespace-nowrap">
                  {c.status !== "REVOKED" && <Do label={c.download ? "Block download" : "Allow download"} run={async () => { "use server"; return downloadToggleAction(c.id, !c.download); }} />}
                  {c.status !== "REVOKED" && <Confirm label="Revoke" variant="danger-outline" title="Revoke this code?" description="The buyer, if any, loses access to the book." run={async () => { "use server"; return revokeCodeAction(c.id); }} />}
                </Td>
              </tr>
            ))}
          </tbody></Table>
        )}
      </Card>
    </>
  );
}
