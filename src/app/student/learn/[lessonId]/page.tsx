import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { Do } from "@/components/admin/row-actions";
import { Markdown } from "@/components/markdown";
import { requireLearnerPage } from "@/server/http";
import { lessonForLearner } from "@/server/services/learner";
import { completeLessonAction } from "../../actions";
import { FileText, FileType2, Presentation } from "lucide-react";
import { ListenButton } from "@/components/teachings/listen-button";
import { MaterialList } from "@/components/teachings/materials";
import { materialsFor } from "@/server/services/teachings";

const AUTH: Record<string, string> = { INSTITUTIONAL: "Official institutional teaching", ACADEMIC: "Approved academic content", LECTURER: "Lecturer material" };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const sess = await requireLearnerPage();
  const id = (await params).lessonId;
  const { lesson, siblings, offeringId } = await lessonForLearner(sess.user.id, id);
  const i = siblings.findIndex((x) => x.id === id);
  const next = siblings[i + 1];
  const prev = siblings[i - 1];
  const mats = (await materialsFor({ courseId: lesson.courseId }, true)).filter((m) => !m.teachingId);
  const dl = (f: string) => `/api/v1/materials/lesson/${id}?format=${f}`;
  const embed = (u: string | null) => (u && /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//.test(u) ? u : null);
  return (
    <>
      <PageHeader title={lesson.title} description={lesson.summary ?? undefined} breadcrumbs={[{ href: "/student/courses", label: "My courses" }, ...(offeringId ? [{ href: `/student/courses/${offeringId}`, label: "Course" }] : []), { label: "Lesson" }]} actions={<Badge tone={lesson.authority === "INSTITUTIONAL" ? "navy" : "blue"}>{AUTH[lesson.authority]}</Badge>} />
      <Card className="p-5 sm:p-8">
        {embed(lesson.videoUrl) && <div className="mb-6 aspect-video max-w-3xl overflow-hidden rounded-xl"><iframe src={embed(lesson.videoUrl)!} title="Lesson video" loading="lazy" allow="encrypted-media" className="size-full" /></div>}
        {lesson.audioUrl && /^https:\/\//.test(lesson.audioUrl) && <audio controls preload="none" src={lesson.audioUrl} className="mb-6 w-full max-w-xl" />}
        <div className="no-print mb-5 flex flex-wrap items-center gap-2">
          <ListenButton targetId="lesson-body" title={lesson.title} />
          <a href={dl("docx")} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-200"><FileType2 className="size-4" aria-hidden /> Word</a>
          <a href={dl("pptx")} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-100 px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-200"><Presentation className="size-4" aria-hidden /> PowerPoint</a>
          <a href={dl("pdf")} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-200"><FileText className="size-4" aria-hidden /> PDF</a>
        </div>
        <div id="lesson-body"><Markdown source={lesson.body ?? ""} /></div>
        {lesson.assetId && <p className="mt-6"><a className="font-semibold text-royal-700 underline" href={`/api/v1/assets/${lesson.assetId}`}>Download attached file</a></p>}
        <p className="mt-6 text-xs text-muted">AI-generated content is never an official theological authority. Doctrine is taught as published in the Statement of Faith.</p>
      </Card>
      {mats.length > 0 && <div className="mt-6"><MaterialList items={mats} title="Study materials for this course" /></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {prev ? <Link href={`/student/learn/${prev.id}`} className="text-sm font-semibold text-royal-700 hover:underline">← {prev.title}</Link> : <span />}
        <Do variant="primary" size="md" label="Mark as complete" run={async () => { "use server"; return completeLessonAction(id); }} />
        {next ? <Link href={`/student/learn/${next.id}`} className="text-sm font-semibold text-royal-700 hover:underline">{next.title} →</Link> : <span />}
      </div>
    </>
  );
}
