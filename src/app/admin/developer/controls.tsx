"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/components/ui/primitives";
import { RevealOnce } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { createAccountAction, resetCredentialsAction, setLevelAction, setStatusAction } from "./actions";

export function CreateAccountForm({ roles }: { roles: { key: string; name: string }[] }) {
  const [level, setLevel] = useState("SUPER_ADMIN");
  const [temp, setTemp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-4">
      {temp && <RevealOnce title="Temporary password (shown once)" values={[temp]} note="Give it to the person securely. They change it at first sign-in and set up two-factor authentication." />}
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        start(async () => {
          setErr(null);
          const r = await createAccountAction(data);
          if (r.ok) { setTemp((r.data as { temporaryPassword: string }).temporaryPassword); toast("success", "Account created."); form.reset(); setLevel("SUPER_ADMIN"); router.refresh(); } else setErr(r.error);
        });
      }}>
        <label className="text-sm font-semibold text-navy-800 sm:col-span-2">Account level
          <select name="level" value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputClass} mt-1.5`}>
            <option value="SUPER_ADMIN">Super Admin (everything except the Developer account)</option>
            <option value="STAFF">Admin / staff (only the roles you tick)</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy-800">First name<input name="firstName" required className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-semibold text-navy-800">Last name<input name="lastName" required className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-semibold text-navy-800 sm:col-span-2">Email<input name="email" type="email" required className={`${inputClass} mt-1.5`} /></label>
        {level === "STAFF" && (
          <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-sm font-semibold text-navy-800">Roles</legend>
            <div className="grid gap-1.5 sm:grid-cols-3">{roles.map((r) => <label key={r.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name="roles" value={r.key} className="size-4 accent-royal-600" />{r.name}</label>)}</div>
          </fieldset>
        )}
        {err && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2"><button className={buttonClass("primary")} disabled={pending}>{pending ? "Creating…" : "Create account"}</button></div>
      </form>
    </div>
  );
}

export function AccountActions({ userId, name, type, status }: { userId: string; name: string; type: string; status: string }) {
  const [temp, setTemp] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (question: string, fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>) => {
    if (!window.confirm(question)) return;
    start(async () => {
      const r = await fn();
      if (r.ok) { const t = (r.data as { temporaryPassword?: string } | undefined)?.temporaryPassword; if (t) setTemp(t); toast("success", "Done."); router.refresh(); } else toast("error", r.error ?? "Failed.");
    });
  };
  const b = buttonClass("secondary", "sm");
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {type === "STAFF"
          ? <button className={b} disabled={pending} onClick={() => run(`Make ${name} a Super Admin? They will be able to manage everything except the Developer account.`, () => setLevelAction(userId, "SUPER_ADMIN"))}>Make Super Admin</button>
          : <button className={b} disabled={pending} onClick={() => run(`Change ${name} to an ordinary Admin? Assign roles afterwards in Faculty & staff.`, () => setLevelAction(userId, "STAFF"))}>Make Admin</button>}
        {status === "ACTIVE"
          ? <button className={buttonClass("danger-outline", "sm")} disabled={pending} onClick={() => run(`Suspend ${name}? They are signed out immediately.`, () => setStatusAction(userId, "SUSPENDED"))}>Suspend</button>
          : <button className={b} disabled={pending} onClick={() => run(`Reactivate ${name}?`, () => setStatusAction(userId, "ACTIVE"))}>Reactivate</button>}
        <button className={b} disabled={pending} onClick={() => run(`Give ${name} a new temporary password?`, () => resetCredentialsAction(userId, false))}>New password</button>
        <button className={b} disabled={pending} onClick={() => run(`Reset two-factor and password for ${name}? Use this when their phone is lost.`, () => resetCredentialsAction(userId, true))}>Lost phone</button>
      </div>
      {temp && <RevealOnce title="Temporary password (shown once)" values={[temp]} note="Give it to the person securely." />}
    </div>
  );
}
