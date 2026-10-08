import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS } from "@/core/bible";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { chapterVerses, parseTagged, strongsEntry, strongsUsage, unpack, verseText } from "@/server/services/bible";

const PAGE = 30;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id.toUpperCase();
  const e = /^[HG]\d{1,4}$/.test(id) ? strongsEntry(id) : null;
  return { title: e ? `${id} ${e.x} (${e.l}) — Strong's` : "Strong's" };
}

export default async function StrongsPage({ params, searchParams }: Props) {
  const id = (await params).id.toUpperCase();
  if (!/^[HG]\d{1,4}$/.test(id)) notFound();
  const e = strongsEntry(id);
  if (!e) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const heb = id[0] === "H";
  const { refs, words } = strongsUsage(id);
  const shown = refs.slice((page - 1) * PAGE, page * PAGE).map((n) => {
    const [b, c, v] = unpack(n);
    const raw = verseText("kjv", { book: b, chapter: c, v });
    // Bold the English word(s) tagged with this number.
    const tagged = parseTagged(chapterVerses("kjv", b, c)[v - 1] ?? "");
    return { b, c, v, raw, hit: tagged.filter((w) => w.s.includes(id)).map((w) => w.w) };
  });
  const num = Number(id.slice(1));
  const link = (n: number) => (n >= 1 && strongsEntry(id[0] + n) ? `/bible/strongs/${id[0]}${n}` : null);
  const prev = link(num - 1), next = link(num + 1);
  return (
    <>
      <BibleBanner eyebrow={heb ? "Hebrew / Aramaic" : "Greek"} title={<><span lang={heb ? "he" : "el"} dir={heb ? "rtl" : "ltr"} className="mr-3 font-serif">{e.l}</span><span className="text-gold-300">{e.x}</span></>} tone={heb ? "amber" : "violet"}>
        <p className="text-sm">Strong&apos;s {id}{e.p ? ` · pronounced “${e.p}”` : ""}</p>
      </BibleBanner>
      <BibleTabs active="/bible/strongs" />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wider text-gold-600">Meaning</dt><dd className="mt-0.5 text-base">{e.s || "—"}</dd></div>
            {e.k && <div><dt className="text-xs font-bold uppercase tracking-wider text-gold-600">Rendered in the KJV as</dt><dd className="mt-0.5">{e.k}</dd></div>}
            {e.d && <div><dt className="text-xs font-bold uppercase tracking-wider text-gold-600">Origin</dt><dd className="mt-0.5">{e.d.replace(/^\s*[:,;]\s*/, "")}</dd></div>}
          </dl>
          {words.length > 0 && (
            <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wider text-gold-600">Most common English words in the KJV</p>
              <div className="mt-2 flex flex-wrap gap-2">{words.map(([w, n]) => <Link key={w} href={`/bible/search?q=${encodeURIComponent(w)}`} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100">{w} ×{n}</Link>)}</div>
            </div>
          )}
          <div className="mt-5 flex justify-between text-sm font-semibold">
            {prev ? <Link href={prev} className="text-royal-700 hover:underline">← {id[0]}{num - 1}</Link> : <span />}
            {next && <Link href={next} className="text-royal-700 hover:underline">{id[0]}{num + 1} →</Link>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-bold text-navy-800">{refs.length.toLocaleString()} verse{refs.length === 1 ? "" : "s"} use this word</h2>
          {refs.length === 0 && <p className="text-sm text-muted">This number is not tagged in the KJV text (some entries are used only in other texts).</p>}
          <ol className="space-y-3">
            {shown.map((s) => (
              <li key={`${s.b}-${s.c}-${s.v}`} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line">
                <Link href={`/bible/${BOOKS[s.b].slug}/${s.c}?v=${s.v}#v${s.v}`} className="text-sm font-extrabold text-royal-700 hover:underline">{BOOKS[s.b].name} {s.c}:{s.v}</Link>
                <p className="mt-1 font-serif leading-relaxed">{s.raw}</p>
                {s.hit.length > 0 && <p className="mt-1 text-xs text-muted">Here translated: <strong className="text-navy-800">{s.hit.join(", ")}</strong></p>}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex justify-between text-sm font-semibold">
            {page > 1 ? <Link href={`?page=${page - 1}`} className="text-royal-700 hover:underline">← Previous</Link> : <span />}
            {page * PAGE < refs.length && <Link href={`?page=${page + 1}`} className="text-royal-700 hover:underline">More verses →</Link>}
          </div>
        </section>
        <p className="text-xs text-muted">Source: Strong&apos;s Exhaustive Concordance of the Bible (1890), public domain, via the OpenScriptures project.</p>
      </div>
    </>
  );
}

