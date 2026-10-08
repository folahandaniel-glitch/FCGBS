import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { Verification } from "@/server/services/verify";

export function VerifyResult({ v }: { v: Verification }) {
  if (v.outcome === "NOT_FOUND")
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-danger-50 p-6">
        <p className="flex items-center gap-2 text-lg font-extrabold text-danger-600"><ShieldX className="size-6" aria-hidden /> Certificate not found</p>
        <p className="mt-1 text-sm text-ink/80">We could not find a document with that number or code. Check it carefully and try again. If you believe a document is genuine, contact the Registrar.</p>
      </div>
    );
  const ok = v.outcome === "VERIFIED";
  return (
    <div role="status" className={`rounded-2xl border p-6 ${ok ? "border-emerald-200 bg-success-50" : "border-amber-200 bg-warn-50"}`}>
      <p className={`flex items-center gap-2 text-lg font-extrabold ${ok ? "text-success-600" : "text-warn-600"}`}>
        {ok ? <BadgeCheck className="size-6" aria-hidden /> : <ShieldAlert className="size-6" aria-hidden />}
        {ok ? `${v.kind === "TRANSCRIPT" ? "Transcript" : "Certificate"} verified` : v.outcome === "REVOKED" ? "This document has been revoked" : "This document has been superseded"}
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {[["Holder", v.holder], ["Award", v.award], ["Programme", v.programme], ["Institution", v.institution], ["Date", v.awardDate], ["Number", v.number], ["Status", v.status]].filter(([, x]) => x).map(([k, x]) => (
          <div key={k}><dt className="text-xs font-semibold uppercase text-muted">{k}</dt><dd className="font-semibold text-navy-800">{x}</dd></div>
        ))}
      </dl>
      {!ok && <p className="mt-3 text-sm text-ink/80">Do not rely on this document. Contact the Registrar to confirm its current status.</p>}
    </div>
  );
}
