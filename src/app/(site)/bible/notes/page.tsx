import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { BOOKS } from "@/core/bible";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { getDb } from "@/server/db";
import { bibleNotes } from "@/server/db/schema";
import { getSession } from "@/server/http";
import { verseText } from "@/server/services/bible";

export const metadata: Metadata = { title: "My Bible notes", robots: { index: false } };

const HL: Record<string, string> = { yellow: "bg-yellow-200", green: "bg-emerald-200", blue: "bg-sky-200", pink: "bg-pink-200", orange: "bg-orange-200" };

export default async function NotesPage() {
  const s = await getSession();
  if (!s || s.mfaPending) redirect("/login?next=/bible/notes");
  const rows = await getDb().select().from(bibleNotes).where(and(eq(bibleNotes.userId, s.user.id))).orderBy(desc(bibleNotes.updatedAt)).limit(300);
  const group = (kind: string) => rows.filter((r) => r.kind === kind);
  const link = (r: (typeof rows)[number]) => `/bible/${BOOKS[r.book].slug}/${r.chapter}?v=${r.verse}#v${r.verse}`;
  const ref = (r: (typeof rows)[number]) => `${BOOKS[r.book].name} ${r.chapter}:${r.verse}`;
  const section = (title: string, kind: string) => (
    <section key={kind}>
      <h2 className="mb-3 font-display text-xl font-bold text-navy-800">{title} ({group(kind).length})</h2>
      {group(kind).length === 0 ? <p className="text-sm text-muted">Nothing here yet. Open a chapter and tap a verse number.</p> : (
        <ul className="space-y-3">{group(kind).map((r) => (
          <li key={r.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line">
            <Link href={link(r)} className="text-sm font-extrabold text-royal-700 hover:underline">{ref(r)}</Link>
            <p className={`mt-1 font-serif ${r.kind === "HIGHLIGHT" ? `${HL[r.color ?? "yellow"]} rounded px-1` : ""}`}>{verseText("kjv", { book: r.book, chapter: r.chapter, v: r.verse })}</p>
            {r.body && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm">{r.body}</p>}
          </li>
        ))}</ul>
      )}
    </section>
  );
  return (
    <>
      <BibleBanner eyebrow="Private to you" title="My notes, highlights & bookmarks" tone="amber" />
      <BibleTabs active="/bible/notes" />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
        {section("Notes", "NOTE")}
        {section("Bookmarks", "BOOKMARK")}
        {section("Highlights", "HIGHLIGHT")}
      </div>
    </>
  );
}
