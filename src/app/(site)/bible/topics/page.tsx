import type { Metadata } from "next";
import Link from "next/link";
import { BibleBanner, BibleTabs } from "@/components/bible/ui";
import { getContent } from "@/server/services/content";
import { COLOUR } from "@/components/bible/colours";

export const metadata: Metadata = { title: "Bible Topics", description: "Topical Bible study: salvation, prayer, the Holy Spirit, revival, apostolic and prophetic ministry, stewardship and more." };

export default async function TopicsPage() {
  const c = await getContent("bibleTopics");
  return (
    <>
      <BibleBanner eyebrow="Topical study" title="Bible Topics" tone="emerald"><p>{c.intro}</p></BibleBanner>
      <BibleTabs active="/bible/topics" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map((t) => (
            <li key={t.slug}>
              <Link href={`/bible/topics/${t.slug}`} className={`block h-full rounded-3xl bg-gradient-to-br ${COLOUR[t.colour]?.grad ?? COLOUR.royal.grad} p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
                <h2 className="text-lg font-extrabold">{t.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-white/85">{t.intro}</p>
                <p className="mt-3 text-xs font-bold text-gold-200">{t.refs.length} passages →</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
