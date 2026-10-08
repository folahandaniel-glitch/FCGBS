import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { requireLearnerPage } from "@/server/http";
import { getContent } from "@/server/services/content";
import { listCourses, listLibrary } from "@/server/services/catalog";

export default async function StudentHub({ params }: { params: Promise<{ hub: string }> }) {
  await requireLearnerPage();
  const hub = (await params).hub;
  if (hub !== "tech" && hub !== "kingdom") notFound();
  const tech = hub === "tech";
  const c = tech ? await getContent("technologyHub") : await getContent("kingdomEnterprise");
  const [courses, res] = await Promise.all([listCourses({ category: tech ? "TECH_HUB" : "KINGDOM_ENTERPRISE" }), listLibrary({ hub: tech ? "TECH" : "KINGDOM_ENTERPRISE" })]);
  const note = "lowData" in c ? c.lowData : "caution" in c ? c.caution : "";
  return (
    <>
      <PageHeader eyebrow="Learning hub" title={c.title} description={c.intro} />
      <Alert tone="info" className="mb-5">{note}</Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Courses in this hub" description="Register for them as electives when they are offered." />
          <ul className="divide-y divide-line">{courses.map((x) => <li key={x.id}><Link href={`/courses/${x.code}`} className="block px-5 py-3 text-sm hover:bg-royal-50"><strong className="text-navy-800">{x.code} · {x.title}</strong><span className="block text-xs text-muted">{x.credits} credits</span></Link></li>)}</ul>
        </Card>
        <Card>
          <CardHeader title="Pathways" />
          <ul className="divide-y divide-line">{c.pathways.map((p) => <li key={p.title} className="px-5 py-3 text-sm"><strong className="text-navy-800">{p.title}</strong><span className="block text-xs text-muted">{p.text}</span></li>)}</ul>
        </Card>
      </div>
      {res.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Recommended reading" />
          <ul className="grid gap-1 p-5 text-sm sm:grid-cols-2">{res.map((r) => <li key={r.id}>{r.citation ?? r.title}</li>)}</ul>
        </Card>
      )}
    </>
  );
}
