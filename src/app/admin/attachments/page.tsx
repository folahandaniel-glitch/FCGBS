import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { Search } from "lucide-react";
import { score } from "@/core/attachments";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { requireStaffPage } from "@/server/http";
import { attachmentsAt, listTargets } from "@/server/services/attachments";
import { addAttachmentAction, removeAttachmentAction } from "./actions";
import { DraftPlacer } from "./draft-placer";

const INPUT = "mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal";

export default async function AttachmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; place?: string }> }) {
  await requireStaffPage(["content.manage", "courses.manage"]);
  const sp = await searchParams;
  const targets = await listTargets();
  const q = (sp.q ?? "").trim();
  const found = q ? targets.map((t) => ({ t, sc: score(q, t) })).filter((x) => x.sc > 0.4).sort((a, b) => b.sc - a.sc).slice(0, 12).map((x) => x.t) : [];
  const current = sp.place ? targets.find((t) => t.key === sp.place) ?? null : null;
  const items = current ? await attachmentsAt(current.key) : [];
  const drafts = await getDb().select().from(s.materials).where(and(isNull(s.materials.courseId), isNull(s.materials.teachingId), isNull(s.materials.place), eq(s.materials.status, "DRAFT")));
  return (
    <>
      <PageHeader title="Files & links" description="Add, replace or remove PDF, Word, PowerPoint, MP3 files, videos and web links on any course, lesson, teaching, question, Bible topic, reading plan, timeline stop, track or programme." />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/upload-centre" className="rounded-xl bg-gold-500 px-4 py-2 font-bold text-white">Bulk upload with the template →</Link>
        <Link href="/admin/r/materials" className="rounded-xl bg-white px-4 py-2 font-bold text-navy-800 ring-1 ring-line">All study materials (table)</Link>
      </div>

      <Card className="mb-6 p-5">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label className="flex-1 text-sm font-semibold text-navy-800">Where? Type a name, code or slug
            <input name="q" defaultValue={q} placeholder="e.g. BIB208, genealogies of Jesus, Psalm 23, Revelation timeline" className={INPUT} />
          </label>
          <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2 text-sm font-bold text-white"><Search className="size-4" aria-hidden /> Find</button>
        </form>
        {found.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {found.map((t) => <li key={t.key}><Link href={`/admin/attachments?place=${encodeURIComponent(t.key)}`} className="block rounded-xl bg-surface p-3 text-sm hover:bg-gold-100"><span className="text-xs font-bold uppercase text-royal-700">{t.type}</span><br />{t.title}</Link></li>)}
          </ul>
        )}
        {q && found.length === 0 && <p className="mt-3 text-sm text-muted">Nothing matched “{q}”. Try fewer words, or the course code.</p>}
      </Card>

      {current && (
        <Card className="mb-6">
          <CardHeader title={current.title} description={`${current.type}${current.code ? ` · ${current.code}` : ""}`} />
          <div className="p-5">
            {items.length === 0 ? <p className="text-sm text-muted">Nothing attached yet.</p> : (
              <ul className="space-y-2">
                {items.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-3 text-sm">
                    <span><b>{m.title}</b> <span className="text-xs text-muted">{m.kind} · {m.audience.toLowerCase()} · {m.status.toLowerCase()}</span><br /><span className="text-xs text-muted">{m.assetId ? "Uploaded file" : m.url}</span></span>
                    <span className="flex gap-2">
                      <Link href={`/admin/r/materials/${m.id}`} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-line">Edit</Link>
                      <Confirm label="Remove" title={`Remove “${m.title}”?`} variant="danger-outline" run={async () => { "use server"; return removeAttachmentAction(m.id); }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-6 font-bold text-navy-800">Add a file or link here</h3>
            <ActionForm action={addAttachmentAction} resetOnSuccess successMessage="Added." className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="place" value={current.key} />
              <label className="text-sm font-semibold">File (PDF, DOCX, PPTX, MP3)<input type="file" name="file" accept=".pdf,.docx,.doc,.pptx,.ppt,.mp3,.xlsx,.png,.jpg,.webp" className="mt-1 block w-full text-sm font-normal" /></label>
              <label className="text-sm font-semibold">…or a link (web page, YouTube, Drive)<input name="url" className={INPUT} placeholder="https://" /></label>
              <label className="text-sm font-semibold">Title (optional)<input name="title" className={INPUT} /></label>
              <label className="text-sm font-semibold">Who can open it<select name="audience" className={INPUT}><option value="STUDENTS">Signed-in students</option><option value="PUBLIC">Everyone</option></select></label>
              <label className="text-sm font-semibold sm:col-span-2">Description (optional)<input name="description" className={INPUT} /></label>
              <div className="sm:col-span-2"><SubmitButton pendingText="Adding…">Add</SubmitButton> <span className="ml-2 text-xs text-muted">Type, title and link format are worked out for you if left blank.</span></div>
            </ActionForm>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Waiting to be placed" description="Drafts from the Upload centre that could not be matched with confidence." />
        <div className="p-5">
          {drafts.length === 0 ? <p className="text-sm text-muted">Nothing is waiting.</p> : (
            <ul className="space-y-3">{drafts.map((m) => <li key={m.id} className="rounded-xl bg-amber-50 p-3 text-sm"><b>{m.title}</b> <span className="text-xs text-muted">{m.kind}</span><DraftPlacer id={m.id} /></li>)}</ul>
          )}
        </div>
      </Card>
    </>
  );
}
