"use client";

import { AlertTriangle, CheckCircle2, FileWarning, Wand2 } from "lucide-react";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/form";
import type { ActionResult } from "@/server/http";
import type { ImportReport } from "@/server/services/attachments";
import { importAction } from "./actions";

const TONE = { placed: "bg-emerald-50 text-emerald-800", corrected: "bg-sky-50 text-sky-800", draft: "bg-amber-50 text-amber-800", skipped: "bg-slate-50 text-slate-700", error: "bg-rose-50 text-rose-800" } as const;
const LABEL = { placed: "Placed", corrected: "Fixed & placed", draft: "Saved as draft", skipped: "Skipped", error: "Not added" } as const;

export function UploadForm() {
  const [state, act] = useActionState<ActionResult<ImportReport> | null, FormData>(importAction, null);
  const [names, setNames] = useState<string[]>([]);
  const r = state?.ok ? state.data : undefined;
  return (
    <div className="space-y-6">
      <form action={act} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
        <label className="block rounded-2xl border-2 border-dashed border-royal-300 bg-royal-50/40 p-6 text-center">
          <span className="block font-bold text-navy-800">Drop the template and all your files here</span>
          <span className="mt-1 block text-sm text-muted">PDF · DOCX · PPTX · MP3 · the filled template (.xlsx or .csv). Up to 60 files at once.</span>
          <input type="file" name="files" multiple accept=".pdf,.docx,.doc,.pptx,.ppt,.mp3,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp" className="mt-4 block w-full text-sm" onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))} aria-label="Files to upload" />
        </label>
        {names.length > 0 && <p className="mt-3 text-xs text-muted">{names.length} file{names.length === 1 ? "" : "s"} chosen: {names.slice(0, 6).join(", ")}{names.length > 6 ? " …" : ""}</p>}
        {state && !state.ok && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.error}</p>}
        <div className="mt-4"><SubmitButton pendingText="Reading, fixing and placing…">Upload and place everything</SubmitButton></div>
      </form>

      {r && (
        <section aria-label="Upload report" className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
          <h2 className="font-display text-xl font-bold text-navy-800">Report</h2>
          <p className="mt-1 text-sm text-ink/80">
            <b>{r.placed}</b> placed · <b>{r.corrected}</b> fixed and placed · <b>{r.drafts}</b> saved as drafts · <b>{r.skipped}</b> skipped · <b>{r.errors}</b> not added
            {r.templates > 0 && <> · {r.templates} template{r.templates > 1 ? "s" : ""} read</>}
          </p>
          {r.drafts > 0 && <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Drafts were kept safely but could not be matched to a place. Open Attachments → “Waiting to be placed” and type where each belongs.</p>}
          <ul className="mt-4 space-y-2">
            {r.lines.map((l, i) => (
              <li key={i} className={`rounded-xl p-3 text-sm ${TONE[l.status]}`}>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {l.status === "error" ? <FileWarning className="size-4" aria-hidden /> : l.status === "corrected" ? <Wand2 className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                  {LABEL[l.status]}: {l.title}
                  {l.row != null && <span className="text-xs font-normal opacity-70">row {l.row}</span>}
                </p>
                {l.where && <p className="mt-0.5">→ {l.where}</p>}
                {l.notes.map((n, j) => <p key={j} className="mt-0.5 text-xs opacity-90">• {n}</p>)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
