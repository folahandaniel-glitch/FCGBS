/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Hero } from "@/components/site/blocks";
import { getSession } from "@/server/http";
import { myBookIds, publishedBooks } from "@/server/services/books";

export const metadata: Metadata = { title: "Books", description: "E-books from the ministry: read online with your purchase code." };

export default async function BooksPage() {
  const [books, sess] = await Promise.all([publishedBooks(), getSession()]);
  const mine = new Set(sess && !sess.mfaPending ? await myBookIds(sess.user.id) : []);
  return (
    <>
      <Hero eyebrow="Ministry books" title="Books that build faith and families">Buy a book, receive your personal code, and read it here. Each code opens one book, once.</Hero>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {books.length === 0 ? <p className="text-muted">No books are on sale yet. Please check back soon.</p> : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <li key={b.id}>
                <Link href={`/books/${b.slug}`} className="tint-card flex h-full flex-col overflow-hidden rounded-3xl border border-white transition hover:-translate-y-0.5">
                  {b.coverAssetId ? <img src={`/api/v1/assets/${b.coverAssetId}`} alt="" loading="lazy" className="h-56 w-full object-cover" /> : <div className="grid h-56 place-items-center bg-gradient-to-br from-navy-900 via-violet-800 to-royal-600 p-5 text-center text-white"><div><BookOpen className="mx-auto size-8 text-gold-400" aria-hidden /><p className="mt-3 font-display text-xl font-bold">{b.title}</p></div></div>}
                  <div className="flex flex-1 flex-col gap-1 p-5">
                    <h2 className="font-extrabold text-navy-800">{b.title}</h2>
                    <p className="text-xs text-muted">{b.author}</p>
                    {b.description && <p className="line-clamp-3 text-sm text-ink/80">{b.description}</p>}
                    <p className="mt-auto pt-3 text-sm font-bold text-royal-700">{mine.has(b.id) ? "In your library →" : b.price ? `${b.price} →` : "See the book →"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
