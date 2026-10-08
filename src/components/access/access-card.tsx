"use client";

import { CalendarCheck2, CalendarClock, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessState } from "@/server/services/access";
import { Badge, cx, statusTone } from "../ui/primitives";
import { ActivateForm } from "./activate-form";

const fmt = (iso?: string) => (iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—");

/**
 * Access status with a live countdown. The server is authoritative: the card re-reads /api/v1/me/access every
 * minute and on focus, and only animates between reads using an offset against the server's clock.
 */
export function AccessCard({ initial, contact, note }: { initial: AccessState; contact: string; note: string }) {
  const [state, setState] = useState(initial);
  const offset = useRef<number | null>(null);
  const [now, setNow] = useState(() => new Date(initial.serverNow).getTime());
  const [syncing, setSyncing] = useState(false);
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const j = await (await fetch("/api/v1/me/access", { cache: "no-store" })).json();
      if (j.ok) { offset.current = new Date(j.data.serverNow).getTime() - Date.now(); setState(j.data); }
    } finally { setSyncing(false); }
  }, []);
  useEffect(() => {
    offset.current ??= new Date(initial.serverNow).getTime() - Date.now();
    const tick = setInterval(() => setNow(Date.now() + (offset.current ?? 0)), 1000);
    const poll = setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    return () => { clearInterval(tick); clearInterval(poll); window.removeEventListener("focus", sync); };
  }, [sync, initial.serverNow]);

  const expires = state.expiresAt ? new Date(state.expiresAt).getTime() : 0;
  const left = Math.max(0, expires - now);
  const active = state.status === "ACTIVE" && left > 0;
  const d = Math.floor(left / 86_400_000), h = Math.floor((left % 86_400_000) / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  const total = (state.durationDays ?? 30) * 86_400_000;
  const pct = active ? Math.min(100, (left / total) * 100) : 0;
  return (
    <div id="activate" className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line">
      <div className={cx("relative px-5 py-5 text-white", active ? "bg-gradient-to-br from-emerald-600 to-royal-700" : "bg-gradient-to-br from-navy-800 to-violet-800")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">Access status</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge tone={active ? "green" : statusTone(state.status)} className="!ring-0">{active ? "Active" : state.status === "NONE" ? "No access code yet" : state.status.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>
              {state.codeSuffix && <span className="font-mono text-xs text-white/70">Code …{state.codeSuffix}</span>}
            </div>
          </div>
          <button type="button" onClick={sync} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10" aria-label="Refresh access status"><RefreshCw className={cx("size-3.5", syncing && "animate-spin")} aria-hidden /> Sync</button>
        </div>
        {active ? (
          <div className="mt-4">
            <p className="sr-only">{d} days, {h} hours and {m} minutes remaining</p>
            <div className="grid grid-cols-4 gap-2 text-center" aria-hidden>
              {([[d, "Days"], [h, "Hours"], [m, "Mins"], [s, "Secs"]] as const).map(([v, l]) => (
                <div key={l} className="rounded-xl bg-white/15 py-2"><p className="font-mono text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</p><p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/70">{l}</p></div>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden><div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} /></div>
          </div>
        ) : <p className="mt-3 text-sm text-white/90">{state.message}</p>}
      </div>
      {state.activatedAt && (
        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2.5"><CalendarCheck2 className="size-4 text-royal-600" aria-hidden /><div><p className="text-xs text-muted">Activated</p><p className="font-semibold text-navy-800">{fmt(state.activatedAt)}</p></div></div>
          <div className="flex items-center gap-2.5"><CalendarClock className="size-4 text-gold-600" aria-hidden /><div><p className="text-xs text-muted">Expires</p><p className="font-semibold text-navy-800">{fmt(state.expiresAt)}</p></div></div>
        </div>
      )}
      {!active && (
        <div className="border-t border-line bg-surface px-5 py-4">
          <ActivateForm compact onDone={sync} />
          <p className="mt-3 text-xs text-muted">{note}{contact && <> Contact: <strong className="text-navy-800">{contact}</strong>.</>}</p>
        </div>
      )}
    </div>
  );
}
