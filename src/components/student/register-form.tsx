"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerCoursesAction } from "@/app/student/actions";
import { buttonClass } from "../ui/primitives";
import { useToast } from "../ui/toast";

export interface OfferRow { offeringId: string; code: string; title: string; credits: number; kind: string; year: number; semester: number }

export function RegisterForm({ rows, maxCredits, currentCredits }: { rows: OfferRow[]; maxCredits: number; currentCredits: number }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const total = rows.filter((r) => sel.has(r.offeringId)).reduce((a, r) => a + r.credits, 0);
  return (
    <div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {rows.map((r) => (
          <li key={r.offeringId}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
              <input type="checkbox" className="size-5 accent-royal-600" checked={sel.has(r.offeringId)} onChange={(e) => setSel((p) => { const n = new Set(p); if (e.target.checked) n.add(r.offeringId); else n.delete(r.offeringId); return n; })} />
              <span className="flex-1"><span className="font-mono text-xs font-bold text-royal-700">{r.code}</span> {r.title}<span className="ml-2 text-xs text-muted">{r.kind.toLowerCase()}</span></span>
              <span className="text-xs font-semibold">{r.credits} cr</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Selected: <strong>{total}</strong> credits · this semester so far {currentCredits} / max {maxCredits}</p>
        <button className={buttonClass("primary")} disabled={pending || sel.size === 0} onClick={() => start(async () => { const r = await registerCoursesAction([...sel]); if (r.ok) { toast("success", "Courses registered."); setSel(new Set()); router.refresh(); } else toast("error", r.error); })}>Register selected courses</button>
      </div>
    </div>
  );
}
