"use client";

import { Copy, Download, Eye, KeyRound } from "lucide-react";
import { useState } from "react";
import { assignAccessAction, codeEntitlementsAction, codeStatusAction, generateCodesAction, revealCodeAction, adjustAccessAction } from "@/app/admin/access-actions";
import { FEATURES, FEATURE_KEYS, STANDARD_FEATURES, type Feature } from "@/core/features";
import { ActionForm, SubmitButton, TextField } from "../ui/form";
import { ConfirmAction } from "../ui/interactive";
import { buttonClass } from "../ui/primitives";
import { useToast } from "../ui/toast";

/** Feature ticks for one code. Left on "standard", a code opens every feature; ticking "choose" limits it to those ticked. */
export function FeaturePicker({ initial }: { initial?: string[] | null }) {
  const [custom, setCustom] = useState(Boolean(initial));
  const on = (f: Feature) => (initial ? initial.includes(f) : STANDARD_FEATURES.includes(f));
  return (
    <details className="rounded-xl border border-line bg-surface p-3" open={Boolean(initial)}>
      <summary className="cursor-pointer text-sm font-semibold text-navy-800">Features this code opens{custom ? "" : " (all of them)"}</summary>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-navy-800"><input type="checkbox" name="customFeatures" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="size-4 accent-royal-600" /> Choose the features myself</label>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((f) => (
          <label key={f} className={`flex items-start gap-2 rounded-lg bg-white p-2 text-sm ring-1 ring-line ${custom ? "" : "opacity-60"}`} title={FEATURES[f].description}>
            <input type="checkbox" name="features" value={f} defaultChecked={on(f)} disabled={!custom} className="mt-0.5 size-4 accent-royal-600" />
            <span><span className="font-semibold text-navy-800">{FEATURES[f].label}</span><span className="block text-xs text-muted">{FEATURES[f].group}</span></span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function GenerateCodes({ defaultDays, maxBulk }: { defaultDays: number; maxBulk: number }) {
  const [result, setResult] = useState<{ batchId: string; codes: string[] } | null>(null);
  const toast = useToast();
  return (
    <div className="space-y-4">
      <ActionForm action={generateCodesAction} onSuccess={(r) => { if (r.ok) setResult(r.data as { batchId: string; codes: string[] }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[7rem_9rem_1fr_auto] lg:items-end">
        <TextField label="How many" name="count" type="number" min={1} max={maxBulk} defaultValue="1" required />
        <TextField label="Access days" name="durationDays" type="number" min={1} max={3650} defaultValue={String(defaultDays)} required />
        <TextField label="Note / batch label (optional)" name="note" placeholder="e.g. Diploma cohort — October" />
        <SubmitButton pendingText="Generating…"><KeyRound className="size-4" /> Generate</SubmitButton>
        <div className="col-span-full"><FeaturePicker /></div>
      </ActionForm>
      {result && (
        <div className="space-y-2 rounded-2xl bg-gold-50 p-4 ring-1 ring-gold-400/40">
          <p className="text-sm font-bold text-navy-800">{result.codes.length} new code{result.codes.length === 1 ? "" : "s"} — UNUSED until a learner activates (the clock starts then). Copy or download them now.</p>
          <textarea readOnly rows={Math.min(8, result.codes.length + 1)} value={result.codes.join("\n")} aria-label="New codes" className="w-full rounded-xl border border-line bg-white p-3 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass("secondary", "sm")} onClick={async () => { try { await navigator.clipboard.writeText(result.codes.join("\n")); toast("success", "Copied."); } catch { toast("error", "Copy is not available here."); } }}><Copy className="size-4" /> Copy all</button>
            <a href={`/api/v1/admin/access-codes?batchId=${result.batchId}`} className={buttonClass("secondary", "sm")}><Download className="size-4" /> Download CSV</a>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssignAccess({ defaultDays }: { defaultDays: number }) {
  return (
    <ActionForm action={assignAccessAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_8rem_1.4fr_auto] lg:items-end">
      <TextField label="E-mail or student number" name="identifier" placeholder="learner@example.com" required />
      <TextField label="Days" name="durationDays" type="number" min={1} max={3650} defaultValue={String(defaultDays)} required />
      <TextField label="Reason (recorded)" name="reason" placeholder="e.g. Scholarship, paid at the office" required />
      <SubmitButton pendingText="Giving…">Give access</SubmitButton>
    </ActionForm>
  );
}

export function CodeRowActions({ id, status, activated, canReveal }: { id: string; status: string; activated: boolean; canReveal: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const toast = useToast();
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {canReveal && (code ? <code className="rounded bg-gold-50 px-2 py-1 font-mono text-xs font-bold text-navy-800 ring-1 ring-gold-400/40">{code}</code> : <button type="button" className={buttonClass("ghost", "sm")} onClick={async () => { const r = await revealCodeAction(id); if (r.ok) setCode(r.data as string); else toast("error", r.error); }}><Eye className="size-4" /> Reveal</button>)}
      {(status === "UNUSED" || status === "ACTIVE") && <ConfirmAction label="Suspend" title="Suspend this code?" description={activated ? "The learner's access is suspended until restored." : "The code cannot be activated while suspended."} reason run={({ reason }) => codeStatusAction(id, "SUSPEND", reason)} />}
      {status !== "REVOKED" && status !== "EXPIRED" && <ConfirmAction label="Revoke" variant="danger-outline" title="Revoke this code?" description="Revoking permanently disables the code (and ends access if it was activated)." reason run={({ reason }) => codeStatusAction(id, "REVOKE", reason)} />}
      {(status === "SUSPENDED" || status === "REVOKED") && <ConfirmAction label="Restore" title="Restore this code?" reason confirmVariant="primary" run={({ reason }) => codeStatusAction(id, "RESTORE", reason)} />}
    </div>
  );
}

export function CodeFeaturesForm({ id, features }: { id: string; features: string[] | null }) {
  return (
    <ActionForm action={codeEntitlementsAction.bind(null, id)} className="space-y-3" successMessage="Features updated.">
      <FeaturePicker initial={features} />
      <SubmitButton size="sm">Save features</SubmitButton>
    </ActionForm>
  );
}

/** Extend, shorten, set the expiry, end, suspend, restore, revoke or reactivate a running access period. Every change needs a reason. */
export function AdjustAccess({ periodId }: { periodId: string }) {
  const toast = useToast();
  const [action, setAction] = useState("EXTEND");
  const [days, setDays] = useState("7");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const needsDays = action === "EXTEND" || action === "REDUCE";
  const submit = async () => {
    setBusy(true);
    const payload = { action, reason, ...(needsDays ? { days: Number(days) } : {}), ...(action === "SET_EXPIRY" ? { expiresAt: date } : {}) };
    const r = await adjustAccessAction(periodId, payload);
    setBusy(false);
    toast(r.ok ? "success" : "error", r.ok ? "Access updated." : r.error);
    if (r.ok) setReason("");
  };
  const field = "rounded-lg border border-line bg-white px-2 py-1.5 text-xs";
  return (
    <details className="relative text-left">
      <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs font-semibold text-royal-600 ring-1 ring-line hover:bg-royal-50">Adjust period</summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-2xl border border-line bg-white p-3 shadow-lift">
        <select value={action} onChange={(e) => setAction(e.target.value)} className={`${field} w-full`} aria-label="Action">
          {["EXTEND", "REDUCE", "SET_EXPIRY", "END", "SUSPEND", "RESTORE", "REVOKE", "REACTIVATE"].map((a) => <option key={a} value={a}>{a.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</option>)}
        </select>
        {needsDays && <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className={`${field} w-full`} aria-label="Days" />}
        {action === "SET_EXPIRY" && <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} w-full`} aria-label="New expiry" />}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className={`${field} w-full`} aria-label="Reason" />
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={submit} className="w-full rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Apply"}</button>
      </div>
    </details>
  );
}
