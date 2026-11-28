/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hero } from "@/components/site/blocks";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { splitChapters } from "@/core/books";
import { getSession } from "@/server/http";
import { bookBySlug, ownership } from "@/server/services/books";
import { redeemAction } from "../actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await bookBySlug((await params).slug);
  return { title: b && b.status === "PUBLISHED" ? b.title : "Book" };
}

export default async function BookPage({ params }: Props) {
  const b = await bookBySlug((await params).slug);
  const sess = await getSession();
  const user = sess && !sess.mfaPending ? sess.user : null;
  const admin = user?.userType === "SUPER_ADMIN";
  if (!b || (b.status !== "PUBLISHED" && !admin)) notFound();
  const owned = user ? await ownership(user.id, b.id) : null;
  const chapters = splitChapters(b.manuscript);
  const canRead = admin || Boolean(owned);
  return (
    <>
      <Hero eyebrow={b.status === "PUBLISHED" ? "Book" : "Draft preview (only you can see this)"} title={b.title}>{b.subtitle}<span className="mt-2 block text-sm">by {b.author}</span></Hero>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {b.description && <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line"><p className="whitespace-pre-line leading-relaxed">{b.description}</p></div>}
          <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-line">
            <h2 className="mb-3 font-display text-xl font-bold text-navy-800">Contents</h2>
            <ol className="list-none space-y-1 text-sm">{chapters.map((c, i) => <li key={i}>{canRead ? <Link href={`/books/${b.slug}/read?ch=${i + 1}`} className="text-royal-700 hover:underline">{c.title}</Link> : c.title}</li>)}</ol>
          </div>
        </div>
        <aside className="space-y-4">
          {b.coverAssetId && <img src={`/api/v1/assets/${b.coverAssetId}`} alt={`Cover of ${b.title}`} className="w-full rounded-3xl shadow-lift" />}
          {canRead ? (
            <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
              <Link href={`/books/${b.slug}/read`} className="block rounded-xl bg-gradient-to-r from-royal-600 to-violet-600 px-4 py-3 text-center font-bold text-white">Read the book</Link>
              {(admin || owned?.download) ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-bold">
                  <a href={`/api/v1/books/${b.slug}/download?format=pdf`} className="rounded-xl bg-rose-600 px-3 py-2 text-white">Download PDF</a>
                  <a href={`/api/v1/books/${b.slug}/download?format=docx`} className="rounded-xl bg-sky-700 px-3 py-2 text-white">Download Word</a>
                </div>
              ) : <p className="mt-3 text-xs text-muted">Reading online. Downloading is available only if the ministry switches it on for you.</p>}
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-gradient-to-br from-gold-50 to-white p-5 shadow-card ring-1 ring-gold-400/40">
                <h2 className="font-extrabold text-navy-800">How to buy{b.price ? ` · ${b.price}` : ""}</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{b.howToBuy || "Contact the ministry on 08067578112 to pay and receive your code."}</p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
                <h2 className="mb-2 font-extrabold text-navy-800">I have a code</h2>
                {user ? (
                  <ActionForm action={redeemAction} className="space-y-3">
                    <input type="hidden" name="bookId" value={b.id} />
                    <input name="code" required placeholder="BK-XXXX-XXXX-XXXX" aria-label="Book code" autoComplete="off" className="w-full rounded-xl border border-line px-3 py-2.5 font-mono text-sm uppercase" />
                    <SubmitButton className="w-full" pendingText="Checking…">Unlock this book</SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="text-sm">First <Link href={`/login?next=/books/${b.slug}`} className="font-bold text-royal-700 underline">sign in</Link> or <Link href="/register" className="font-bold text-royal-700 underline">create a free account</Link>, then enter your code here.</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
