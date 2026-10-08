"use client";

import { useEffect, useState } from "react";

/** Reads the article aloud with the device's own speech engine: no audio file to download, so it uses no extra data. */
export function ListenButton({ targetId, title }: { targetId: string; title: string }) {
  const [on, setOn] = useState(false);
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(typeof window !== "undefined" && "speechSynthesis" in window); return () => { try { window.speechSynthesis?.cancel(); } catch {} }; }, []);
  if (!ok) return null;
  const toggle = () => {
    const synth = window.speechSynthesis;
    if (on) { synth.cancel(); setOn(false); return; }
    const text = document.getElementById(targetId)?.innerText ?? "";
    // Long text is spoken in sentence-sized pieces: some engines stop after a few hundred characters.
    const parts = (`${title}. ${text}`).match(/[^.!?\n]+[.!?]?/g) ?? [];
    parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p.trim()); u.rate = 0.95; u.lang = "en-GB"; if (i === parts.length - 1) u.onend = () => setOn(false); if (p.trim()) synth.speak(u); });
    setOn(true);
  };
  return <button type="button" onClick={toggle} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-card ${on ? "bg-gold-500 text-navy-900" : "bg-violet-600 text-white hover:bg-violet-700"}`}>{on ? "■ Stop listening" : "▶ Listen to this teaching"}</button>;
}
