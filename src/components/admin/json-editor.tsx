"use client";

/* eslint-disable @next/next/no-img-element */
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/http";
import { buttonClass, cx, inputClass } from "../ui/primitives";
import { useToast } from "../ui/toast";

type J = string | number | boolean | null | J[] | { [k: string]: J };

const human = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase()).replace(/ Asset Id$/, " (picture)").replace(/ Url$/, " link");
const blank = (sample: J): J => (typeof sample === "string" ? "" : typeof sample === "number" ? 0 : typeof sample === "boolean" ? false : Array.isArray(sample) ? [] : sample && typeof sample === "object" ? Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blank(v as J)])) : "");

function ImageField({ value, onChange, upload }: { value: string; onChange: (v: string) => void; upload?: (f: FormData) => Promise<ActionResult<{ id: string; url: string }>> }) {
  const [busy, start] = useTransition();
  const toast = useToast();
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={`/api/v1/assets/${value}`} alt="" className="size-16 rounded-lg object-cover ring-1 ring-line" /> : <span className="grid size-16 place-items-center rounded-lg bg-surface text-xs text-muted ring-1 ring-line">None</span>}
      <label className={cx(buttonClass("secondary", "sm"), "cursor-pointer")}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {value ? "Replace" : "Upload"}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={busy || !upload} onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !upload) return;
          const fd = new FormData();
          fd.set("file", f);
          start(async () => { const r = await upload(fd); if (r.ok && r.data) onChange(r.data.id); else if (!r.ok) toast("error", r.error); });
        }} />
      </label>
      {value && <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-danger-600 hover:underline">Remove</button>}
    </div>
  );
}

function Node({ k, v, set, upload, depth }: { k: string; v: J; set: (n: J) => void; upload?: Parameters<typeof ImageField>[0]["upload"]; depth: number }) {
  const label = human(k);
  if (typeof v === "boolean") return <label className="flex items-center gap-2 text-sm font-medium text-navy-800"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="size-5 accent-royal-600" />{label}</label>;
  if (typeof v === "number") return <label className="block text-sm font-semibold text-navy-800">{label}<input type="number" step="any" value={v} onChange={(e) => set(Number(e.target.value))} className={cx(inputClass, "mt-1.5")} /></label>;
  if (typeof v === "string" || v === null) {
    const s = (v ?? "") as string;
    if (/assetid$/i.test(k)) return <div><p className="mb-1.5 text-sm font-semibold text-navy-800">{label}</p><ImageField value={s} onChange={set} upload={upload} /></div>;
    const long = s.length > 90 || s.includes("\n") || /^(text|body|bio|intro|subtitle|description|relationship|recognition|principle|vision|note|hubText|ctaText|paymentInstructions)$/i.test(k);
    return <label className="block text-sm font-semibold text-navy-800">{label}{long ? <textarea value={s} rows={Math.min(10, Math.max(3, Math.ceil(s.length / 90)))} onChange={(e) => set(e.target.value)} className={cx(inputClass, "mt-1.5 leading-relaxed")} /> : <input value={s} onChange={(e) => set(e.target.value)} className={cx(inputClass, "mt-1.5")} />}</label>;
  }
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "string")) return <label className="block text-sm font-semibold text-navy-800">{label} <span className="font-normal text-muted">(one per line)</span><textarea value={(v as string[]).join("\n")} rows={Math.min(12, Math.max(3, v.length + 1))} onChange={(e) => set(e.target.value.split("\n").map((x) => x))} onBlur={(e) => set(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} className={cx(inputClass, "mt-1.5")} /></label>;
    const sample = (v[0] ?? {}) as J;
    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-navy-800">{label}</p>
        <div className="space-y-3">
          {v.map((item, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase text-muted">{i + 1}</span><button type="button" aria-label="Remove item" onClick={() => set(v.filter((_, j) => j !== i))} className="text-danger-600 hover:bg-danger-50 rounded p-1"><Trash2 className="size-4" /></button></div>
              <Node k={`${k}-item`} v={item} set={(n) => set(v.map((x, j) => (j === i ? n : x)))} upload={upload} depth={depth + 1} />
            </div>
          ))}
          <button type="button" onClick={() => set([...v, blank(sample)])} className={buttonClass("secondary", "sm")}><Plus className="size-4" /> Add</button>
        </div>
      </div>
    );
  }
  const o = v as { [k: string]: J };
  return (
    <div className={cx("space-y-4", depth > 0 && k.endsWith("-item") === false && "rounded-xl border border-line p-3")}>
      {depth > 0 && !k.endsWith("-item") && <p className="text-xs font-bold uppercase tracking-wide text-gold-600">{label}</p>}
      {Object.entries(o).map(([kk, vv]) => <Node key={kk} k={kk} v={vv} set={(n) => set({ ...o, [kk]: n })} upload={upload} depth={depth + 1} />)}
    </div>
  );
}

/** Generic editor for any JSON block (website content, settings): fields are generated from the data's own shape. */
export function JsonEditor({ initial, save, upload, extra, saveLabel = "Save changes" }: { initial: J; save: (json: string, reason?: string) => Promise<ActionResult>; upload?: Parameters<typeof ImageField>[0]["upload"]; extra?: React.ReactNode; saveLabel?: string }) {
  const [value, setValue] = useState<J>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-5">
      <Node k="root" v={value} set={setValue} upload={upload} depth={0} />
      {extra}
      {error && <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}
      <button type="button" disabled={pending} className={buttonClass("primary", "md")} onClick={() => start(async () => {
        setError(null);
        const r = await save(JSON.stringify(value));
        if (r.ok) { toast("success", r.message ?? "Saved."); router.refresh(); } else setError(r.error);
      })}>
        {pending && <Loader2 className="size-4 animate-spin" />} {saveLabel}
      </button>
    </div>
  );
}
