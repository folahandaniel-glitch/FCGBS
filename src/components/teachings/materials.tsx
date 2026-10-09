import { FileAudio, FileText, FileType2, Link2, Presentation, Video, Paperclip, type LucideIcon } from "lucide-react";

export interface MaterialRow { id: string; title: string; kind: string; description: string | null; assetId: string | null; url: string | null }
const KINDS: Record<string, { label: string; Icon: LucideIcon; cls: string }> = {
  PDF: { label: "PDF", Icon: FileText, cls: "bg-rose-100 text-rose-700" },
  DOCX: { label: "Word", Icon: FileType2, cls: "bg-sky-100 text-sky-700" },
  PPTX: { label: "PowerPoint", Icon: Presentation, cls: "bg-orange-100 text-orange-700" },
  MP3: { label: "Audio", Icon: FileAudio, cls: "bg-violet-100 text-violet-700" },
  VIDEO: { label: "Video", Icon: Video, cls: "bg-fuchsia-100 text-fuchsia-700" },
  URL: { label: "Link", Icon: Link2, cls: "bg-emerald-100 text-emerald-700" },
  OTHER: { label: "File", Icon: Paperclip, cls: "bg-slate-100 text-slate-700" },
};
const embed = (u: string | null) => (u && /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|player\.vimeo\.com)\//.test(u) ? u : null);

/** Study materials attached to a course or teaching: downloads, audio players, video and lawful external links. */
export function MaterialList({ items, title = "Study materials" }: { items: MaterialRow[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 font-display text-xl font-bold text-navy-800">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((m) => {
          const k = KINDS[m.kind] ?? KINDS.OTHER;
          const href = m.assetId ? `/api/v1/assets/${m.assetId}` : m.url;
          const audio = m.kind === "MP3" && (href ?? "").length > 0;
          const frame = m.kind === "VIDEO" ? embed(m.url) : null;
          return (
            <li key={m.id} className={`rounded-2xl bg-white p-4 shadow-card ring-1 ring-line ${audio || frame ? "sm:col-span-2" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${k.cls}`}><k.Icon className="size-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy-800">{m.title} <span className="ml-1 text-xs font-semibold text-muted">{k.label}</span></p>
                  {m.description && <p className="mt-0.5 text-sm text-ink/75">{m.description}</p>}
                  {href && !audio && !frame && <a href={href} {...(m.assetId ? { download: true } : href?.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="mt-1.5 inline-block text-sm font-bold text-royal-700 underline">{m.assetId ? "Download" : "Open link"}</a>}
                </div>
              </div>
              {audio && href && <audio controls preload="none" src={href} className="mt-3 w-full" />}
              {frame && <div className="mt-3 aspect-video max-w-2xl overflow-hidden rounded-xl"><iframe src={frame} title={m.title} loading="lazy" allow="encrypted-media" className="size-full" /></div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
