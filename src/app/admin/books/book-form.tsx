import { ActionForm, SubmitButton } from "@/components/ui/form";
import { inputClass } from "@/components/ui/primitives";
import { saveBookAction } from "./actions";

export interface BookValues { id?: string; title?: string; subtitle?: string | null; author?: string; description?: string | null; price?: string | null; howToBuy?: string | null; status?: string }

export function BookForm({ book }: { book: BookValues }) {
  const field = (name: keyof BookValues, label: string, placeholder = "", required = false) => (
    <label className="text-sm font-semibold text-navy-800">{label}<input name={name} required={required} placeholder={placeholder} defaultValue={(book[name] as string) ?? ""} className={`${inputClass} mt-1.5`} /></label>
  );
  return (
    <ActionForm action={saveBookAction} successMessage="Saved." className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={book.id ?? ""} />
      {field("title", "Title", "", true)}
      {field("subtitle", "Subtitle")}
      {field("author", "Author", "", true)}
      {field("price", "Price shown to buyers", "e.g. ₦2,500")}
      <label className="text-sm font-semibold text-navy-800 sm:col-span-2">Description (shown to everyone)<textarea name="description" rows={4} defaultValue={book.description ?? ""} className={`${inputClass} mt-1.5`} /></label>
      <label className="text-sm font-semibold text-navy-800 sm:col-span-2">How to buy (payment instructions)<textarea name="howToBuy" rows={3} defaultValue={book.howToBuy ?? ""} placeholder="Pay to … then send your receipt to 08067578112 to receive your code." className={`${inputClass} mt-1.5`} /></label>
      <label className="text-sm font-semibold text-navy-800">Manuscript (.docx, .md or .txt){book.id ? " — leave empty to keep the current one" : ""}<input type="file" name="manuscriptFile" accept=".docx,.md,.txt" className="mt-1.5 block w-full text-sm font-normal" /><span className="mt-1 block text-xs font-normal text-muted">In Word, give each chapter title the “Heading 1” style.</span></label>
      <label className="text-sm font-semibold text-navy-800">Cover picture (optional)<input type="file" name="cover" accept="image/png,image/jpeg,image/webp" className="mt-1.5 block w-full text-sm font-normal" /></label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" name="published" defaultChecked={book.status === "PUBLISHED"} className="size-5 accent-royal-600" /> Approved: put this book on sale</label>
      <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save book</SubmitButton></div>
    </ActionForm>
  );
}
