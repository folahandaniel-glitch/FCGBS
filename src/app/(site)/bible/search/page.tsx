import type { Metadata } from "next";
import Link from "next/link";
import { BOOKS, isTranslation, TRANSLATIONS, type TranslationId } from "@/core/bible";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { concordance, parseQuery } from "@/server/services/bible";

export const metadata: Metadata = { title: "Bible Concordance", description: "Search every verse of the Bible by word or phrase." };
const PAGE = 40;

const hi = (text: string, q: string) => {
  const terms = [...q.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => (m[1] ?? m[2]).replace(/\*$/, "")).filter(Boolean).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return text;
  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-gold-200 px-0.5">{p}</mark> : p));
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; t?: string; book?: string; ts?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100).trim();
  const t: TranslationId = isTranslation(sp.t) && sp.t !== "wlc" && sp.t !== "tr" ? sp.t : "kjv";
  const book = sp.book !== undefined && /^\d+$/.test(sp.book) && Number(sp.book) < 66 ? Number(sp.book) : undefined;
  const ts = sp.ts === "ot" || sp.ts === "nt" ? sp.ts : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const valid = q && parseQuery(q).length > 0;
  const r = valid ? concordance(t, q, { book, testament: ts, offset: (page - 1) * PAGE, limit: PAGE }) : null;
  const base = (extra: Record<string, string | undefined>) => {
    const u = new URLSearchParams({ q, t });
    if (book !== undefined) u.set("book", String(book));
    if (ts) u.set("ts", ts);
    for (const [k, v] of Object.entries(extra)) { if (v === undefined) u.delete(k); else u.set(k, v); }
    return `/bible/search?${u}`;
  };
  const otN = r?.byBook.filter((b) => b.book < 39).reduce((a, b) => a + b.n, 0) ?? 0;
  const ntN = r?.byBook.filter((b) => b.book >= 39).reduce((a, b) => a + b.n, 0) ?? 0;
  const maxBook = Math.max(1, ...(r?.byBook.map((b) => b.n) ?? [1]));
  return (
    <>
      <BibleBanner eyebrow="Concordance" title="Search the whole Bible" tone="violet">
        <form action="/bible/search" className="mt-3 flex max-w-2xl flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="grace, “born again”, love*" aria-label="Search words" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-ink shadow-lift" />
          <select name="t" defaultValue={t} aria-label="Translation" className="rounded-xl border-0 px-3 py-3 text-ink shadow-lift">{TRANSLATIONS.filter((x) => x.id !== "wlc" && x.id !== "tr").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <button className="rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-lift hover:bg-gold-400">Search</button>
        </form>
        <p className="mt-2 text-xs text-white/70">Several words find verses containing all of them. Use straight quotation marks for a phrase and * for word endings (love* finds loved, loveth, lovest).</p>
      </BibleBanner>
      <BibleTabs active="/bible/search" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!q && <p className="text-muted">Type a word above, for example <Link className="font-semibold text-royal-700 underline" href="/bible/search?q=grace">grace</Link>, <Link className="font-semibold text-royal-700 underline" href="/bible/search?q=revive*">revive*</Link> or <Link className="font-semibold text-royal-700 underline" href={`/bible/search?q=${encodeURIComponent('"holy ghost"')}`}>&quot;holy ghost&quot;</Link>.</p>}
        {q && !valid && <p className="text-muted">Please enter a longer word.</p>}
        {r && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <p className="text-lg font-bold text-navy-800">{r.total.toLocaleString()} verse{r.total === 1 ? "" : "s"}{r.words ? ` · ${r.words.toLocaleString()} occurrences` : ""}<span className="ml-2 text-sm font-normal text-muted">in the {TRANSLATIONS.find((x) => x.id === t)!.name}</span></p>
              <div className="flex gap-2 text-xs font-bold">
                <Link href={base({ ts: undefined, book: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 ${!ts && book === undefined ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line"}`}>All</Link>
                <Link href={base({ ts: "ot", book: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 ${ts === "ot" ? "bg-royal-600 text-white" : "bg-white ring-1 ring-line"}`}>Old Testament ({otN})</Link>
                <Link href={base({ ts: "nt", book: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 ${ts === "nt" ? "bg-emerald-600 text-white" : "bg-white ring-1 ring-line"}`}>New Testament ({ntN})</Link>
              </div>
            </div>
            {r.byBook.length > 0 && (
              <details className="mb-6 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line">
                <summary className="cursor-pointer text-sm font-bold text-navy-800">Where it appears — by book</summary>
                <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {[...r.byBook].sort((a, b) => a.book - b.book).map((b) => (
                    <li key={b.book}><Link href={base({ book: String(b.book), ts: undefined, page: undefined })} className="flex items-center gap-2 text-sm hover:text-royal-700"><span className="w-32 shrink-0 truncate">{BOOKS[b.book].name}</span><span className="h-2 flex-1 rounded-full bg-royal-50"><span className={`block h-2 rounded-full ${b.book < 39 ? "bg-royal-500" : "bg-emerald-500"}`} style={{ width: `${(b.n / maxBook) * 100}%` }} /></span><span className="w-8 text-right text-xs font-bold">{b.n}</span></Link></li>
                  ))}
                </ul>
              </details>
            )}
            <ol className="space-y-3">
              {r.items.map((v) => (
                <li key={`${v.b}-${v.c}-${v.v}`} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line">
                  <Link href={`/bible/${BOOKS[v.b].slug}/${v.c}?v=${v.v}${t !== "kjv" ? `&t=${t}` : ""}#v${v.v}`} className="text-sm font-extrabold text-royal-700 hover:underline">{BOOKS[v.b].name} {v.c}:{v.v}</Link>
                  <p className="mt-1 font-serif leading-relaxed">{hi(v.text, q)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex justify-between text-sm font-semibold">
              {page > 1 ? <Link href={base({ page: String(page - 1) })} className="text-royal-700 hover:underline">← Previous</Link> : <span />}
              {page * PAGE < r.total && <Link href={base({ page: String(page + 1) })} className="text-royal-700 hover:underline">More results →</Link>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
