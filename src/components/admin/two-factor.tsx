"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { beginTotpAction, confirmTotpAction, disableTotpAction, revokeOtherSessionsAction } from "@/app/admin/actions";
import { buttonClass, inputClass } from "../ui/primitives";
import { RevealOnce } from "../ui/interactive";
import { useToast } from "../ui/toast";

export function TwoFactor({ enabled, mandatory, qrFor }: { enabled: boolean; mandatory: boolean; qrFor: (secret: string) => Promise<string> }) {
  const [step, setStep] = useState<"idle" | "scan" | "codes">(enabled ? "idle" : "idle");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-4">
      {step === "codes" && <RevealOnce title="Your recovery codes — save them now" note="Each works once if you lose your phone. They will not be shown again." values={codes} />}
      {!enabled && step === "idle" && (
        <button className={buttonClass("primary")} disabled={pending} onClick={() => start(async () => { const r = await beginTotpAction(); if (r.ok && r.data) { setSecret(r.data.secret); setQr(await qrFor(r.data.secret)); setStep("scan"); } else if (!r.ok) toast("error", r.error); })}>Set up two-factor authentication</button>
      )}
      {step === "scan" && (
        <div className="space-y-3">
          <p className="text-sm">Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), then enter the 6-digit code.</p>
          {qr && <img src={qr} alt="Authenticator QR code" width={220} height={220} className="rounded-xl ring-1 ring-line" />}
          <p className="text-xs text-muted">Cannot scan? Enter this key manually: <code className="rounded bg-surface px-1.5 py-0.5 font-mono">{secret}</code></p>
          <div className="flex max-w-xs gap-2"><input className={inputClass} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} aria-label="6-digit code" />
            <button className={buttonClass("primary")} disabled={pending} onClick={() => start(async () => { const r = await confirmTotpAction(code); if (r.ok && r.data) { setCodes(r.data.codes); setStep("codes"); toast("success", "Two-factor authentication enabled."); } else if (!r.ok) toast("error", r.error); })}>Verify</button></div>
        </div>
      )}
      {enabled && step !== "codes" && !mandatory && (
        <div className="flex max-w-sm gap-2"><input type="password" className={inputClass} placeholder="Password to disable" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Password" /><button className={buttonClass("danger-outline")} disabled={pending || !pw} onClick={() => start(async () => { const r = await disableTotpAction(pw); if (r.ok) { toast("success", "Disabled."); router.refresh(); } else toast("error", r.error); })}>Disable</button></div>
      )}
      {enabled && mandatory && step !== "codes" && <p className="text-sm text-muted">Two-factor authentication is mandatory for your account.</p>}
      {step === "codes" && <button className={buttonClass("primary")} onClick={() => { setStep("idle"); router.refresh(); }}>I have saved my codes</button>}
    </div>
  );
}

export function RevokeSessions() {
  const [pending, start] = useTransition();
  const toast = useToast();
  return <button className={buttonClass("secondary")} disabled={pending} onClick={() => start(async () => { const r = await revokeOtherSessionsAction(); toast(r.ok ? "success" : "error", r.ok ? "Other sessions signed out." : r.error); })}>Sign out of all other devices</button>;
}
