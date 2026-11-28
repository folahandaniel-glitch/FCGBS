import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { splitChapters } from "@/core/books";
import { getSession } from "@/server/http";
import { bookBySlug, ownership } from "@/server/services/books";

export const metadata: Metadata = { title: "Reading", robots: { index: false } };

export default async function ReadPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ch?: string }> }) {
  const { slug } = await params;
  const sess = await getSession();
  if (!sess || sess.mfaPending) redirect(`/login?next=/books/${slug}`);
  const b = await bookBySlug(slug);
  if (!b) notFound();
  const admin = sess.user.userType === "SUPER_ADMIN";
  if (!admin && !(await ownership(sess.user.id, b.id))) redirect(`/books/${slug}`);
  const chapters = splitChapters(b.manuscript);
  const n = Math.min(Math.max(1, Number((await searchParams).ch) || 1), Math.max(1, chapters.length));
  const c = chapters[n - 1];
  if (!c) notFound();
  const holder = `${sess.user.firstName} ${sess.user.lastName}`;
  const nav = (
    <nav aria-label="Chapters" className="flex items-center justify-between gap-3 text-sm font-bold">
      {n > 1 ? <Link href={`/books/${slug}/read?ch=${n - 1}`} className="rounded-xl bg-white px-4 py-2 ring-1 ring-line">← Previous</Link> : <span />}
      <Link href={`/books/${slug}`} className="text-royal-700 underline">Contents</Link>
      {n < chapters.length ? <Link href={`/books/${slug}/read?ch=${n + 1}`} className="rounded-xl bg-navy-800 px-4 py-2 text-white">Next →</Link> : <span />}
    </nav>
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {nav}
      <article className="mt-5 select-none rounded-3xl bg-white p-6 shadow-card ring-1 ring-line sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wide text-gold-600">{b.title} · {n} of {chapters.length}</p>
        <h1 className="mb-4 mt-1 font-display text-2xl font-bold text-navy-800 sm:text-3xl">{c.title}</h1>
        <Markdown source={c.body} />
        <p className="mt-8 border-t border-line pt-3 text-center text-xs text-muted">Licensed to {holder}. © {b.author}. Not to be copied or shared.</p>
      </article>
      <div className="mt-5">{nav}</div>
    </div>
  );
}
