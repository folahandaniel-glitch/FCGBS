import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Section } from "@/components/site/blocks";
import { listPosts } from "@/server/services/catalog";

export const metadata: Metadata = { title: "News & Events" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

export default async function NewsPage() {
  const [news, events, ann] = await Promise.all([listPosts("NEWS", { limit: 20 }), listPosts("EVENT", { limit: 20 }), listPosts("ANNOUNCEMENT", { limit: 10 })]);
  const list = (items: typeof news, base = "/news") => items.length === 0 ? <p className="text-muted">Nothing published yet.</p> : (
    <ul className="grid gap-4 sm:grid-cols-2">{items.map((p) => <li key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-card"><p className="text-xs font-semibold text-gold-600">{fmt(p.startsAt ?? p.publishedAt)}{p.location ? ` · ${p.location}` : ""}</p><Link href={`${base}/${p.slug}`} className="mt-1 block font-bold text-navy-800 hover:text-royal-700">{p.title}</Link>{p.summary && <p className="mt-1 text-sm text-muted">{p.summary}</p>}</li>)}</ul>
  );
  return (
    <>
      <Hero eyebrow="Stay informed" title="News & Events" />
      <Section title="Announcements" tone="white">{list(ann)}</Section>
      <Section title="News">{list(news)}</Section>
      <Section title="Events" tone="white">{list(events)}</Section>
    </>
  );
}
