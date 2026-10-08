import { Card, EmptyState, PageHeader, inputClass } from "@/components/ui/primitives";
import { requireLearnerPage } from "@/server/http";
import { listLibrary } from "@/server/services/catalog";

export default async function StudentLibrary({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireLearnerPage();
  const { q } = await searchParams;
  const items = await listLibrary({ q: q?.slice(0, 60) });
  const groups = [...new Set(items.map((i) => i.category))];
  return (
    <>
      <PageHeader title="Digital library" description="Books, study guides, references and links. Where the school does not hold distribution rights, a citation is shown — obtain the work lawfully." />
      <form role="search" className="mb-5 flex max-w-xl gap-3"><input name="q" defaultValue={q} placeholder="Search title or author…" aria-label="Search the library" className={inputClass} /><button className="h-11 rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white">Search</button></form>
      {items.length === 0 ? (
        <Card><EmptyState title="No resources match." /></Card>
      ) : (
        groups.map((g) => (
          <Card key={g} className="mb-4">
            <p className="border-b border-line bg-surface px-5 py-2 text-xs font-bold uppercase tracking-wide text-gold-600">{g}</p>
            <ul className="divide-y divide-line">
              {items.filter((i) => i.category === g).map((i) => (
                <li key={i.id} className="px-5 py-3 text-sm">
                  <p className="font-semibold text-navy-800">{i.title}{i.author && <span className="font-normal text-muted"> — {i.author}</span>}</p>
                  <p className="text-xs text-muted">{i.resourceType.replace(/_/g, " ").toLowerCase()}{i.year ? ` · ${i.year}` : ""}{i.publisher ? ` · ${i.publisher}` : ""}</p>
                  {i.assetId && i.rightsConfirmed && <a className="text-xs font-semibold text-royal-700 underline" href={`/api/v1/assets/${i.assetId}`}>Download</a>}
                  {i.externalUrl && <a className="ml-3 text-xs font-semibold text-royal-700 underline" href={i.externalUrl} rel="noopener noreferrer" target="_blank">Open link</a>}
                  {i.citation && <p className="mt-1 text-xs italic text-muted">Cite: {i.citation}</p>}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </>
  );
}
