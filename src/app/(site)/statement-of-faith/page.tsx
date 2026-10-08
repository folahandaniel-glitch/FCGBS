import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { Markdown } from "@/components/markdown";
import { getPolicy } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Statement of Faith" };

export default async function FaithPage() {
  const p = await getPolicy("statement-of-faith");
  return (
    <>
      <Hero eyebrow="What we believe" title="Statement of Faith" />
      <Section tone="white">
        {p ? (
          <>
            <Markdown source={p.body} />
            <p className="mt-8 text-xs text-muted">Version {p.version} · effective {p.effectiveOn ?? "—"} · published under the authority of the Academic Board.</p>
          </>
        ) : <p className="text-muted">The Statement of Faith has not yet been published.</p>}
      </Section>
    </>
  );
}
