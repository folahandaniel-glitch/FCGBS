import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/site/hub-page";
import { getBrand } from "@/server/brand";
import { getContent, seoMetadata } from "@/server/services/content";

export async function generateMetadata(): Promise<Metadata> { return seoMetadata("technologyHub"); }

export default async function TechHub() {
  const [b, c] = await Promise.all([getBrand(), getContent("technologyHub")]);
  if (!b.flags.techHub) notFound();
  return <HubPage title={c.title} intro={c.intro} principles={c.principles} pathways={c.pathways} note={c.lowData} category="TECH_HUB" hub="TECH" />;
}
