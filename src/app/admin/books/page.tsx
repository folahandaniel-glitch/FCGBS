import Link from "next/link";
import { Confirm } from "@/components/admin/row-actions";
import { Card, CardHeader, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { allBooks } from "@/server/services/books";
import { publishAllBooksAction } from "./actions";
import { BookForm } from "./book-form";

export default async function AdminBooks() {
  await requireStaffPage("super.accounts");
  const books = await allBooks();
  const waiting = books.filter((b) => b.status !== "PUBLISHED").length;
  return (
    <>
      <PageHeader title="Books" description="Upload a manuscript, approve it for sale, and give each buyer a one-time code. Downloads stay off unless you switch them on."
        actions={waiting > 0 ? <Confirm label={`Approve all (${waiting})`} variant="primary" confirmVariant="primary" confirmLabel="Approve all" title="Put every draft book on sale?" description="Books without a manuscript are left as drafts." run={async () => { "use server"; return publishAllBooksAction(); }} /> : undefined} />
      <Card>
        <CardHeader title="Your books" />
        {books.length === 0 ? <p className="p-5 text-sm text-muted">No books yet. Add the first one below.</p> : (
          <Table><thead><tr><Th>Title</Th><Th>Author</Th><Th>Price</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {books.map((b) => <tr key={b.id}><Td className="font-semibold">{b.title}</Td><Td>{b.author}</Td><Td>{b.price ?? "—"}</Td><Td><StatusBadge status={b.status} /></Td><Td><Link href={`/admin/books/${b.id}`} className="font-bold text-royal-700 underline">Edit & codes</Link></Td></tr>)}
          </tbody></Table>
        )}
      </Card>
      <Card className="mt-6"><CardHeader title="Add a book" /><div className="p-5"><BookForm book={{}} /></div></Card>
    </>
  );
}
