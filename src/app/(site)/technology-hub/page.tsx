import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/site/hub-page";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Technology Hub" };

export default async function TechHub() {
  const [b, c] = await Promise.all([getBrand(), getContent("technologyHub")]);
  if (!b.flags.techHub) notFound();
  return <HubPage title={c.title} intro={c.intro} principles={c.principles} pathways={c.pathways} note={c.lowData} category="TECH_HUB" hub="TECH" />;
}
