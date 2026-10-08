import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookBySlug, BOOKS } from "@/core/bible";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { chapterCount, verseCount } from "@/server/services/bible";

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }): Promise<Metadata> {
  const b = bookBySlug((await params).book);
  return { title: b ? `${b.name} — chapters` : "Bible" };
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const b = bookBySlug((await params).book);
  if (!b) notFound();
  const n = chapterCount(b.i);
  const prev = BOOKS[b.i - 1], next = BOOKS[b.i + 1];
  return (
    <>
      <BibleBanner eyebrow={`${b.ot ? "Old" : "New"} Testament · ${b.group}`} title={b.name} tone={b.ot ? "royal" : "emerald"}><p className="text-sm">{n} chapter{n === 1 ? "" : "s"}. Choose a chapter to read.</p></BibleBanner>
      <BibleTabs active="/bible" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {Array.from({ length: n }, (_, i) => (
            <Link key={i} href={`/bible/${b.slug}/${i + 1}`} prefetch={false} title={`${verseCount(b.i, i + 1)} verses`} className="grid aspect-square place-items-center rounded-xl bg-white text-sm font-bold text-navy-800 shadow-card ring-1 ring-line hover:bg-gold-400 hover:text-navy-900">{i + 1}</Link>
          ))}
        </div>
        <div className="mt-8 flex justify-between text-sm font-semibold">
          {prev ? <Link href={`/bible/${prev.slug}`} className="text-royal-700 hover:underline">← {prev.name}</Link> : <span />}
          {next && <Link href={`/bible/${next.slug}`} className="text-royal-700 hover:underline">{next.name} →</Link>}
        </div>
      </div>
    </>
  );
}
