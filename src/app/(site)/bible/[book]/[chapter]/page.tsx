import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { BOOKS, bookBySlug, hasText, isTranslation, TRANSLATIONS, type TranslationId } from "@/core/bible";
import { BibleBanner, BibleTabs, TranslationPills, TaggedWords, langAttrs, langClass } from "@/components/bible/ui";
import { ReaderClient } from "@/components/bible/reader-client";
import { getDb } from "@/server/db";
import { bibleNotes } from "@/server/db/schema";
import { getSession } from "@/server/http";
import { chapterCount, chapterVerses, parseTagged } from "@/server/services/bible";

type Props = { params: Promise<{ book: string; chapter: string }>; searchParams: Promise<{ t?: string; p?: string; v?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter } = await params;
  const b = bookBySlug(book);
  return { title: b ? `${b.name} ${chapter}` : "Bible", description: b ? `Read ${b.name} ${chapter} with Strong's Hebrew and Greek numbers, a concordance and parallel translations.` : undefined };
}

export default async function ChapterPage({ params, searchParams }: Props) {
  const [{ book: slug, chapter: ch }, sp] = await Promise.all([params, searchParams]);
  const b = bookBySlug(slug);
  const chapter = Number(ch);
  if (!b || !Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(b.i)) notFound();
  let t: TranslationId = isTranslation(sp.t) ? sp.t : "kjv";
  if (!hasText(t, b.i)) t = "kjv";
  const p: TranslationId | undefined = isTranslation(sp.p) && sp.p !== t && hasText(sp.p, b.i) ? sp.p : undefined;
  const main = chapterVerses(t, b.i, chapter);
  const second = p ? chapterVerses(p, b.i, chapter) : [];
  const sess = await getSession();
  const signedIn = Boolean(sess && !sess.mfaPending);
  const marks = signedIn ? await getDb().select().from(bibleNotes).where(and(eq(bibleNotes.userId, sess!.user.id), eq(bibleNotes.book, b.i), eq(bibleNotes.chapter, chapter))).orderBy(asc(bibleNotes.verse)) : [];
  const hl = new Map(marks.filter((m) => m.kind === "HIGHLIGHT").map((m) => [m.verse, m.color ?? "yellow"]));
  const marked = new Set(marks.filter((m) => m.kind === "BOOKMARK").map((m) => m.verse));
  const notes = marks.filter((m) => m.kind === "NOTE");
  const q = t === "kjv" ? "" : `?t=${t}${p ? `&p=${p}` : ""}`;
  const q2 = (c: number) => `/bible/${b.slug}/${c}${q || (p ? `?t=${t}&p=${p}` : "")}`;
  const label = `${b.name} ${chapter}`;
  const focus = Number(sp.v) || 0;
  const tr = TRANSLATIONS.find((x) => x.id === t)!;
  const cell = (id: TranslationId, text: string, v: number, selectable: boolean) => {
    const attrs = langAttrs(id);
    return (
      <p key={`${id}${v}`} {...attrs} className={`${langClass(id)} py-1`}>
        {selectable && <button type="button" data-vn={v} className="vn" aria-label={`Verse ${v}`}>{v}{marked.has(v) ? " ★" : ""}</button>}
        {!selectable && <span className="vn">{v}</span>}
        <span data-vt={selectable ? v : undefined} data-hl={selectable ? hl.get(v) : undefined}>{id === "kjv" ? <TaggedWords words={parseTagged(text)} /> : text}</span>
      </p>
    );
  };
  return (
    <>
      <BibleBanner eyebrow={`${b.ot ? "Old" : "New"} Testament · ${b.group}`} title={label} tone={b.ot ? "royal" : "emerald"}>
        <p className="text-sm">{tr.full} · {tr.note}</p>
      </BibleBanner>
      <BibleTabs active="/bible" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <TranslationPills base={`/bible/${b.slug}/${chapter}`} current={t} parallel={p} book={b.i} />
          <div className="flex gap-2 text-sm font-semibold">
            {chapter > 1 ? <Link href={q2(chapter - 1)} prefetch={false} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-royal-50">← {chapter - 1}</Link> : b.i > 0 ? <Link href={`/bible/${BOOKS[b.i - 1].slug}/${chapterCount(b.i - 1)}${q}`} prefetch={false} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-royal-50">← {BOOKS[b.i - 1].name}</Link> : null}
            <Link href={`/bible/${b.slug}`} prefetch={false} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-royal-50">All chapters</Link>
            {chapter < chapterCount(b.i) ? <Link href={q2(chapter + 1)} className="rounded-lg bg-royal-600 px-3 py-1.5 text-white hover:bg-royal-700">{chapter + 1} →</Link> : b.i < 65 ? <Link href={`/bible/${BOOKS[b.i + 1].slug}/1${q}`} className="rounded-lg bg-royal-600 px-3 py-1.5 text-white hover:bg-royal-700">{BOOKS[b.i + 1].name} →</Link> : null}
          </div>
        </div>

        {b.i < 39 && t !== "wlc" && <p className="mb-3 text-xs text-muted">Tip: choose <Link className="font-semibold text-royal-700 underline" href={`/bible/${b.slug}/${chapter}?t=wlc&p=kjv`}>Hebrew</Link> to read this chapter in the original language beside the KJV.</p>}
        {b.i >= 39 && t !== "tr" && <p className="mb-3 text-xs text-muted">Tip: choose <Link className="font-semibold text-royal-700 underline" href={`/bible/${b.slug}/${chapter}?t=tr&p=kjv`}>Greek</Link> to read this chapter in the original language beside the KJV.</p>}

        <ReaderClient book={b.i} chapter={chapter} label={label} signedIn={signedIn} hasStrongs={t === "kjv" || p === "kjv"}>
          <article className={`rounded-3xl bg-white p-5 shadow-card ring-1 ring-line sm:p-8 ${p ? "" : "max-w-3xl"}`}>
            {p ? (
              <div className="divide-y divide-line">
                {main.map((txt, i) => (txt || second[i]) && (
                  <div key={i} id={`v${i + 1}`} className="grid gap-x-8 py-2 md:grid-cols-2">
                    {cell(t, txt, i + 1, true)}
                    {cell(p, second[i] ?? "", i + 1, false)}
                  </div>
                ))}
              </div>
            ) : (
              main.map((txt, i) => txt && <div key={i} id={`v${i + 1}`} className={focus === i + 1 ? "rounded-xl bg-gold-50 px-2 ring-1 ring-gold-400" : undefined}>{cell(t, txt, i + 1, true)}</div>)
            )}
          </article>
        </ReaderClient>

        {notes.length > 0 && (
          <section className="mt-6 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Your notes on {label}</h2>
            <ul className="mt-2 space-y-2 text-sm">{notes.map((n) => <li key={n.id}><strong>v{n.verse}:</strong> {n.body}</li>)}</ul>
          </section>
        )}
        <p className="mt-6 text-xs text-muted">Texts: King James Version, Berean Standard Bible, American Standard Version, Westminster Leningrad Codex and Textus Receptus — all public domain. Strong&apos;s numbers link each English word to its Hebrew or Greek source word.</p>
      </div>
    </>
  );
}
