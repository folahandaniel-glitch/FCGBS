import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/site/hub-page";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Kingdom Enterprise & Financial Stewardship" };

export default async function KingdomHub() {
  const [b, c] = await Promise.all([getBrand(), getContent("kingdomEnterprise")]);
  if (!b.flags.kingdomHub) notFound();
  return <HubPage title={c.title} intro={c.intro} principles={c.principles} pathways={c.pathways} note={c.caution} category="KINGDOM_ENTERPRISE" hub="KINGDOM_ENTERPRISE" />;
}
