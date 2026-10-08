"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaffAction, resetLinkAction, saveRoleAction, setRolesAction } from "@/app/admin/ops-actions";
import { buttonClass, inputClass } from "../ui/primitives";
import { RevealOnce } from "../ui/interactive";
import { useToast } from "../ui/toast";

export function CreateStaffForm({ roles, departments }: { roles: { key: string; name: string }[]; departments: { value: string; label: string }[]; canAssignRoles: boolean }) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-4">
      {temp && <RevealOnce title="Temporary password (shown once)" values={[temp]} note="Give it to the staff member securely. They must change it at first sign-in." />}
      <form className="grid gap-3 sm:grid-cols-2" action={(fd) => start(async () => {
        setErr(null);
        const r = await createStaffAction(null, fd);
        if (r.ok) { setTemp((r.data as { temporaryPassword: string }).temporaryPassword); toast("success", "Account created."); router.refresh(); } else setErr(r.error);
      })}>
        {([["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"], ["title", "Title (Dr., Rev., Pastor…)"], ["rank", "Rank / appointment"]] as const).map(([n, l]) => (
          <label key={n} className="block text-sm font-semibold text-navy-800">{l}<input name={n} type={n === "email" ? "email" : "text"} required={["firstName", "lastName", "email"].includes(n)} className={`${inputClass} mt-1.5`} /></label>
        ))}
        <label className="block text-sm font-semibold text-navy-800">Department<select name="departmentId" className={`${inputClass} mt-1.5`}><option value="">—</option>{departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" name="publicProfile" className="size-5 accent-royal-600" /> Show on the public Faculty page</label>
        <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-sm font-semibold text-navy-800">Roles</legend><div className="grid gap-1.5 sm:grid-cols-3">{roles.map((r) => <label key={r.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name="roles" value={r.key} className="size-4 accent-royal-600" />{r.name}</label>)}</div></fieldset>
        {err && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2"><button className={buttonClass("primary")} disabled={pending}>Create staff account</button></div>
      </form>
    </div>
  );
}

export function RoleChooser({ userId, roles, current }: { userId: string; roles: { key: string; name: string }[]; current: string[] }) {
  const [sel, setSel] = useState(new Set(current));
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {roles.map((r) => <label key={r.key} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={sel.has(r.key)} onChange={(e) => setSel((p) => { const n = new Set(p); if (e.target.checked) n.add(r.key); else n.delete(r.key); return n; })} className="size-4 accent-royal-600" />{r.name}</label>)}
      <button className={buttonClass("secondary", "sm")} disabled={pending} onClick={() => start(async () => { const r = await setRolesAction(userId, [...sel]); toast(r.ok ? "success" : "error", r.ok ? (r.message ?? "Saved") : r.error); if (r.ok) router.refresh(); })}>Save roles</button>
    </div>
  );
}

export function ResetLink({ userId }: { userId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <span>
      <button className={buttonClass("secondary", "sm")} disabled={pending} onClick={() => start(async () => { const r = await resetLinkAction(userId); if (r.ok && r.data) setUrl(location.origin + (r.data as { url: string }).url); else if (!r.ok) toast("error", r.error); })}>One-time reset link</button>
      {url && <code className="mt-1 block max-w-xs break-all rounded bg-gold-50 p-1.5 text-[0.65rem]">{url}</code>}
    </span>
  );
}

export function PermissionEditor({ roleId, all, current, locked }: { roleId: string; all: { key: string; group: string; description: string }[]; current: string[]; locked?: boolean }) {
  const [sel, setSel] = useState(new Set(current));
  const [pending, start] = useTransition();
  const toast = useToast();
  const groups = [...new Set(all.map((a) => a.group))];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <fieldset key={g}><legend className="mb-1 text-xs font-bold uppercase tracking-wide text-gold-600">{g}</legend>
          <div className="grid gap-1 sm:grid-cols-2">{all.filter((a) => a.group === g).map((a) => <label key={a.key} className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={sel.has(a.key)} onChange={(e) => setSel((p) => { const n = new Set(p); if (e.target.checked) n.add(a.key); else n.delete(a.key); return n; })} className="mt-0.5 size-4 accent-royal-600" /><span><span className="font-mono text-xs">{a.key}</span><span className="block text-xs text-muted">{a.description}</span></span></label>)}</div></fieldset>
      ))}
      {!locked && <button className={buttonClass("primary")} disabled={pending} onClick={() => start(async () => { const r = await saveRoleAction(roleId, [...sel]); toast(r.ok ? "success" : "error", r.ok ? (r.message ?? "Saved") : r.error); })}>Save permissions</button>}
    </div>
  );
}
