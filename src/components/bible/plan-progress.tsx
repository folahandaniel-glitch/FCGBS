"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Day { day: number; label: string; href: string | null }

/** Reading-plan checklist. Progress lives only in this browser (localStorage): no account, no data used. */
export function PlanProgress({ slug, days }: { slug: string; days: Day[] }) {
  const key = `fcgbs-plan-${slug}`;
  const [done, setDone] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
    try { setDone(new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as number[])); } catch {}
    setReady(true);
  }, [key]);
  const toggle = (d: number) => setDone((s) => {
    const n = new Set(s);
    if (n.has(d)) n.delete(d); else n.add(d);
    try { localStorage.setItem(key, JSON.stringify([...n])); } catch {}
    return n;
  });
  const next = days.find((d) => !done.has(d.day));
  const pct = Math.round((done.size / days.length) * 100);
  return (
    <div>
      <div className="mb-5 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
        <div className="flex items-center justify-between text-sm font-bold text-navy-800"><span>{ready ? `${done.size} of ${days.length} days complete` : "Loading…"}</span><span>{pct}%</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-royal-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-royal-500 transition-all" style={{ width: `${pct}%` }} /></div>
        {ready && next && <p className="mt-3 text-sm">Next: <strong>Day {next.day}</strong> — {next.href ? <Link href={next.href} className="font-semibold text-royal-700 underline">{next.label}</Link> : next.label}</p>}
        {ready && !next && <p className="mt-3 text-sm font-bold text-emerald-700">Well done — you have finished this plan! 🎉</p>}
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {days.map((d) => (
          <li key={d.day} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ${done.has(d.day) ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-line"}`}>
            <input type="checkbox" checked={done.has(d.day)} onChange={() => toggle(d.day)} aria-label={`Mark day ${d.day} complete`} className="size-5 accent-emerald-600" />
            <span className="w-12 shrink-0 text-xs font-bold text-muted">Day {d.day}</span>
            {d.href ? <Link href={d.href} prefetch={false} className="min-w-0 truncate text-sm font-semibold text-navy-800 hover:text-royal-700">{d.label}</Link> : <span className="text-sm">{d.label}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
