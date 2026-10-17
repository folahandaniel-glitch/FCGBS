"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { placeDraftAction } from "./actions";

/** Type where a draft belongs; it is matched (typos forgiven) and published there. */
export function DraftPlacer({ id }: { id: string }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await placeDraftAction(id, q); if (r.ok) { toast("success", "Placed and published."); router.refresh(); } else toast("error", r.error); }); }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} required placeholder="Where does this belong? e.g. BIB208 or Isaiah 53" aria-label="Where it belongs" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-1.5 text-sm" />
      <button disabled={pending} className="rounded-xl bg-navy-800 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Placing…" : "Place here"}</button>
    </form>
  );
}
