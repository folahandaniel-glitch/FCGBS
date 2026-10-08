"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveExamAction, submitExamAction } from "@/app/student/actions";
import { buttonClass, cx, inputClass } from "../ui/primitives";

interface Q { id: string; type: string; stem: string; marks: number; options: Record<string, string>[] }
type Answers = Record<string, unknown>;

/**
 * Online examination. The server owns the clock and the scoring: this component only shows the countdown,
 * autosaves answers (so a dropped connection loses almost nothing) and records — honestly, as events, not
 * as "proctoring" — when the learner leaves the tab.
 */
export function ExamRunner({ attemptId, questions, initial, remainingMs }: { attemptId: string; questions: Q[]; initial: Answers; remainingMs: number }) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(Math.floor(remainingMs / 1000));
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const events = useRef<{ t: string }[]>([]);
  const dirty = useRef(false);
  const router = useRouter();
  const done = useRef(false);

  const flush = useCallback(async () => {
    if (!dirty.current && events.current.length === 0) return;
    const ev = events.current.splice(0);
    dirty.current = false;
    const r = await saveExamAction(attemptId, answers, ev);
    if (!r.ok) {
      setMsg(r.error);
      if (/submitted|time is up/i.test(r.error)) router.replace("/student/results");
    } else setMsg(null);
  }, [attemptId, answers, router]);

  const submit = useCallback(() => {
    if (done.current) return;
    done.current = true;
    start(async () => {
      await saveExamAction(attemptId, answers, events.current.splice(0));
      const r = await submitExamAction(attemptId);
      if (r.ok) router.replace("/student/results?submitted=1");
      else { done.current = false; setMsg(r.error); }
    });
  }, [attemptId, answers, router]);

  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0) submit(); }, [left, submit]);
  useEffect(() => { const t = window.setInterval(() => { void flush(); }, 15_000); return () => window.clearInterval(t); }, [flush]);
  useEffect(() => {
    const vis = () => { if (document.hidden) events.current.push({ t: "tab_hidden" }); };
    const blur = () => events.current.push({ t: "window_blur" });
    const paste = () => events.current.push({ t: "paste" });
    document.addEventListener("visibilitychange", vis); window.addEventListener("blur", blur); document.addEventListener("paste", paste);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", blur); document.removeEventListener("paste", paste); };
  }, []);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (!done.current) e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);

  const set = (id: string, v: unknown) => { dirty.current = true; setAnswers((a) => ({ ...a, [id]: v })); };
  const q = questions[idx];
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, "0");
  const ss = String(Math.max(0, left % 60)).padStart(2, "0");
  const answered = (id: string) => answers[id] !== undefined && answers[id] !== "" && !(Array.isArray(answers[id]) && (answers[id] as unknown[]).length === 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sticky top-16 z-20 mb-4 flex items-center justify-between rounded-2xl bg-navy-800 px-5 py-3 text-white shadow-lift">
        <p className="text-sm font-semibold">Question {idx + 1} of {questions.length} · {Object.keys(answers).filter(answered).length} answered</p>
        <p className={cx("font-mono text-xl font-extrabold tabular-nums", left < 300 && "text-gold-400")} aria-live="off" role="timer">{mm}:{ss}</p>
      </div>
      {msg && <p role="alert" className="mb-3 rounded-xl bg-danger-50 px-4 py-2 text-sm text-danger-600">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="qstem">
          <p className="text-xs font-semibold text-muted">{q.marks} mark{q.marks === 1 ? "" : "s"}</p>
          <h2 id="qstem" className="mt-1 text-lg font-semibold leading-relaxed text-navy-800">{q.stem}</h2>
          <div className="mt-4 space-y-2">
            {(q.type === "MCQ" || q.type === "TRUE_FALSE") && q.options.map((o) => (
              <label key={o.id} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", answers[q.id] === o.id ? "border-royal-500 bg-royal-50" : "border-line hover:bg-surface")}>
                <input type="radio" name={q.id} checked={answers[q.id] === o.id} onChange={() => set(q.id, o.id)} className="mt-0.5 size-5 accent-royal-600" /><span>{o.text}</span>
              </label>
            ))}
            {q.type === "MULTI" && q.options.map((o) => {
              const cur = (answers[q.id] as string[] | undefined) ?? [];
              return <label key={o.id} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", cur.includes(o.id) ? "border-royal-500 bg-royal-50" : "border-line")}><input type="checkbox" checked={cur.includes(o.id)} onChange={(e) => set(q.id, e.target.checked ? [...cur, o.id] : cur.filter((x) => x !== o.id))} className="mt-0.5 size-5 accent-royal-600" /><span>{o.text}</span></label>;
            })}
            {q.type === "MATCHING" && <div className="space-y-2">{q.options.map((o) => { const cur = (answers[q.id] as Record<string, string> | undefined) ?? {}; return <div key={o.id} className="grid items-center gap-2 sm:grid-cols-2"><span className="text-sm font-medium">{o.left}</span><select className={inputClass} value={cur[o.id] ?? ""} onChange={(e) => set(q.id, { ...cur, [o.id]: e.target.value })} aria-label={`Match ${o.left}`}><option value="">Choose…</option>{q.options.map((p) => <option key={p.id} value={p.right}>{p.right}</option>)}</select></div>; })}</div>}
            {q.type === "SHORT" && <input className={inputClass} value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} aria-label="Your answer" autoComplete="off" />}
            {q.type === "ESSAY" && <textarea className={inputClass} rows={10} value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} aria-label="Your answer" />}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button className={buttonClass("secondary")} disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
            <button className={buttonClass("ghost")} onClick={() => setFlags((f) => { const n = new Set(f); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}>{flags.has(q.id) ? "Unflag" : "Flag for review"}</button>
            {idx < questions.length - 1 ? <button className={buttonClass("primary")} onClick={() => { void flush(); setIdx(idx + 1); }}>Next</button> : <button className={buttonClass("gold")} disabled={pending} onClick={() => { if (window.confirm("Submit your examination? You cannot change your answers afterwards.")) submit(); }}>{pending && <Loader2 className="size-4 animate-spin" />} Submit examination</button>}
          </div>
        </section>
        <nav aria-label="Question palette" className="rounded-2xl border border-line bg-white p-3 shadow-card">
          <div className="grid grid-cols-5 gap-1.5">{questions.map((x, i) => <button key={x.id} onClick={() => setIdx(i)} aria-label={`Question ${i + 1}${answered(x.id) ? ", answered" : ""}${flags.has(x.id) ? ", flagged" : ""}`} className={cx("grid h-9 place-items-center rounded-lg text-xs font-bold", i === idx ? "ring-2 ring-royal-600" : "", flags.has(x.id) ? "bg-gold-100 text-gold-600" : answered(x.id) ? "bg-success-50 text-success-600" : "bg-surface text-muted")}>{i + 1}</button>)}</div>
          <p className="mt-3 text-[0.7rem] leading-snug text-muted">Your answers autosave. The server clock decides the deadline. Leaving this tab is recorded for review by the examiner.</p>
        </nav>
      </div>
    </div>
  );
}
