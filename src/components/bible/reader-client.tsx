"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { saveVerseMark } from "@/app/(site)/bible/actions";

interface Lex { id: string; l: string; x: string; p: string; d: string; s: string; k: string; count: number; words: [string, number][] }
const SWATCH: Record<string, string> = { yellow: "bg-yellow-200", green: "bg-emerald-200", blue: "bg-sky-200", pink: "bg-pink-200", orange: "bg-orange-200" };
const lexCache = new Map<string, Lex>();

/** Wraps the server-rendered chapter: Strong's pop-up on tap, verse selection (copy / highlight / note), text size and listening. */
export function ReaderClient({ children, book, chapter, label, signedIn, hasStrongs }: { children: ReactNode; book: number; chapter: number; label: string; signedIn: boolean; hasStrongs: boolean }) {
  const [size, setSize] = useState(1.1);
  const [tags, setTags] = useState(true);
  const [lex, setLex] = useState<Lex[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [speaking, setSpeaking] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
    try { const v = Number(localStorage.getItem("fcgbs-bible-size")); if (v >= 0.9 && v <= 1.8) setSize(v); if (localStorage.getItem("fcgbs-bible-tags") === "0") setTags(false); } catch {}
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);
  const bump = (d: number) => setSize((s) => { const n = Math.min(1.8, Math.max(0.9, +(s + d).toFixed(2))); try { localStorage.setItem("fcgbs-bible-size", String(n)); } catch {} return n; });
  const flip = () => setTags((t) => { try { localStorage.setItem("fcgbs-bible-tags", t ? "0" : "1"); } catch {} return !t; });

  const openLex = useCallback(async (ids: string[]) => {
    setBusy(true); setLex([]);
    try {
      const out: Lex[] = [];
      for (const id of ids.slice(0, 3)) {
        let e = lexCache.get(id);
        if (!e) { const r = await fetch(`/api/v1/bible/strongs/${id}`); if (!r.ok) continue; e = (await r.json()) as Lex; lexCache.set(id, e); }
        out.push(e);
      }
      setLex(out);
    } finally { setBusy(false); }
  }, []);

  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const w = t.closest<HTMLElement>("[data-s]");
    if (w && tags) { openLex(w.dataset.s!.split(" ")); return; }
    const n = t.closest<HTMLElement>("[data-vn]");
    if (n) { const v = Number(n.dataset.vn); setSel((c) => (c === v ? null : v)); setNote(""); setMsg(""); }
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { const t = e.target as HTMLElement; if (t.dataset.s || t.dataset.vn) { e.preventDefault(); t.click(); } } };

  const verseEl = (v: number) => root.current?.querySelector<HTMLElement>(`[data-vt="${v}"]`);
  const copy = async () => {
    if (sel == null) return;
    const txt = `${verseEl(sel)?.innerText.trim() ?? ""} — ${label}:${sel}`;
    try { await navigator.clipboard.writeText(txt); setMsg("Copied."); } catch { setMsg("Copy is not available here."); }
  };
  const mark = (kind: "NOTE" | "HIGHLIGHT" | "BOOKMARK", extra: { color?: string; body?: string; remove?: boolean } = {}) => {
    if (sel == null) return;
    start(async () => { const r = await saveVerseMark({ book, chapter, verse: sel, kind, ...extra }); setMsg(r.ok ? "Saved. Reload to see it in the page." : r.error); if (r.ok && kind === "HIGHLIGHT") verseEl(sel)?.setAttribute("data-hl", extra.color ?? "yellow"); });
  };
  const listen = () => {
    const synth = window.speechSynthesis;
    if (!synth) { setMsg("Listening is not supported on this device."); return; }
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const text = [...(root.current?.querySelectorAll<HTMLElement>("[data-vt]") ?? [])].map((x) => x.innerText).join(" ");
    const u = new SpeechSynthesisUtterance(`${label}. ${text}`);
    u.lang = "en-GB"; u.rate = 0.95; u.onend = () => setSpeaking(false);
    synth.speak(u); setSpeaking(true);
  };

  const btn = "rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 ring-1 ring-line hover:bg-royal-50";
  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Reading tools">
        <button type="button" className={btn} onClick={() => bump(-0.1)} aria-label="Smaller text">A−</button>
        <button type="button" className={btn} onClick={() => bump(0.1)} aria-label="Larger text">A+</button>
        {hasStrongs && <button type="button" className={`${btn} ${tags ? "!bg-royal-600 !text-white" : ""}`} onClick={flip} aria-pressed={tags}>Strong&apos;s words</button>}
        <button type="button" className={`${btn} ${speaking ? "!bg-gold-500 !text-navy-900" : ""}`} onClick={listen}>{speaking ? "■ Stop" : "▶ Listen"}</button>
        <button type="button" className={btn} onClick={() => window.print()}>Print</button>
      </div>
      <div ref={root} onClick={onClick} onKeyDown={onKey} data-tags={tags ? "on" : "off"} style={{ fontSize: `${size}rem` }} className="bible-text">
        {children}
      </div>

      {sel != null && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 shadow-lift backdrop-blur" role="region" aria-label="Verse actions">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <strong className="text-sm text-navy-800">{label}:{sel}</strong>
            <button type="button" className={btn} onClick={copy}>Copy</button>
            {signedIn ? (
              <>
                {Object.keys(SWATCH).map((c) => <button key={c} type="button" aria-label={`Highlight ${c}`} className={`size-6 rounded-full ring-1 ring-black/10 ${SWATCH[c]}`} onClick={() => mark("HIGHLIGHT", { color: c })} />)}
                <button type="button" className={btn} onClick={() => mark("HIGHLIGHT", { remove: true })}>Clear</button>
                <button type="button" className={btn} onClick={() => mark("BOOKMARK")}>★ Bookmark</button>
                <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); mark("NOTE", { body: note }); setNote(""); }}>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="Write a note on this verse…" aria-label="Note" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-sm" />
                  <button className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white" disabled={pending}>Save note</button>
                </form>
              </>
            ) : <Link href="/login?next=/bible" className="text-xs font-semibold text-royal-700 underline">Sign in to highlight and keep notes</Link>}
            <button type="button" className="ml-auto text-xs text-muted underline" onClick={() => setSel(null)}>Close</button>
            {msg && <span role="status" className="w-full text-xs text-emerald-700">{msg}</span>}
          </div>
        </div>
      )}

      {lex && (
        <div className="no-print fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t-4 border-gold-500 bg-white p-5 shadow-lift" role="dialog" aria-label="Original-language word">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-gold-600">Original-language word</p><button type="button" className="rounded-lg px-2 py-1 text-sm font-semibold text-navy-800 hover:bg-surface" onClick={() => setLex(null)} autoFocus>Close ✕</button></div>
            {busy && <p className="text-sm text-muted">Loading…</p>}
            {lex.map((e) => (
              <div key={e.id} className="mb-5 border-b border-line pb-4 last:border-0">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span lang={e.id.startsWith("H") ? "he" : "el"} dir={e.id.startsWith("H") ? "rtl" : "ltr"} className="font-serif text-4xl text-navy-800">{e.l}</span>
                  <span className="text-lg font-semibold text-royal-700">{e.x}</span>
                  {e.p && <span className="text-sm text-muted">({e.p})</span>}
                  <span className="rounded-full bg-royal-50 px-2 py-0.5 text-xs font-bold text-royal-700">{e.id}</span>
                </div>
                <p className="mt-2 text-sm"><strong>Meaning:</strong> {e.s}</p>
                {e.k && <p className="mt-1 text-sm"><strong>KJV renders it:</strong> {e.k}</p>}
                {e.d && <p className="mt-1 text-xs text-muted">Origin: {e.d}</p>}
                <p className="mt-2 text-xs text-muted">Appears in {e.count} verses of the KJV{e.words.length ? ` · most often rendered “${e.words.slice(0, 4).map((w) => w[0]).join("”, “")}”` : ""}.</p>
                <p className="mt-2 flex gap-4 text-sm font-semibold"><Link href={`/bible/strongs/${e.id}`} className="text-royal-700 underline">All verses &amp; full entry</Link></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
