import type { Metadata } from "next";
import Link from "next/link";
import { Award, CheckCircle2, Clock, GraduationCap } from "lucide-react";
import { Confirm } from "@/components/admin/row-actions";
import { requireLearnerPage } from "@/server/http";
import { certificateProgrammes, selfState } from "@/server/services/selfservice";
import { chooseFreeCertificateAction } from "../self-actions";

export const metadata: Metadata = { title: "Choose your free certificate" };
const TONES = ["from-royal-500 to-navy-800", "from-emerald-500 to-teal-700", "from-violet-500 to-violet-800", "from-amber-500 to-orange-700", "from-rose-500 to-rose-800", "from-sky-500 to-royal-700"];

export default async function StartPage() {
  const sess = await requireLearnerPage();
  const [programmes, state] = await Promise.all([certificateProgrammes(), selfState(sess.user.id)]);
  const free = state.enrolments.filter((e) => e.note === "SELF:FREE");
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-navy-900 via-royal-700 to-emerald-600 p-6 text-white shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Welcome, {sess.user.firstName}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Choose your free certificate programme</h1>
        <p className="mt-2 max-w-2xl text-white/90">Your access code already opens every feature. Pick <strong>one certificate programme</strong> to study free of charge. Every other programme or course is yours to request — the school approves them after you contact the office on <strong className="text-gold-300">{state.cfg.approvalContact}</strong>.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/student/courses/explore" className="rounded-xl bg-white/15 px-4 py-2 hover:bg-white/25">See all programmes and courses</Link>
          <Link href="/bible" className="rounded-xl bg-white/15 px-4 py-2 hover:bg-white/25">Open the Bible Hub</Link>
        </div>
      </header>

      {free.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
          <div><p className="font-bold text-emerald-900">You have chosen: {free.map((f) => f.programme).join(", ")}</p><p className="text-sm text-emerald-900/80">Open <Link className="font-semibold underline" href="/student/courses">My courses</Link> to begin. To study something more, <Link className="font-semibold underline" href="/student/courses/explore">send a request</Link>.</p></div>
        </div>
      )}

      <section aria-label="Certificate programmes">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programmes.map((p, i) => {
            const mine = state.enrolments.some((e) => e.programmeId === p.id);
            return (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line">
                <div className={`bg-gradient-to-br ${TONES[i % TONES.length]} p-5 text-white`}>
                  <Award className="size-7 text-gold-200" aria-hidden />
                  <h2 className="mt-2 text-lg font-extrabold leading-snug">{p.name}</h2>
                  <p className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-white/85"><span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> {p.months} months</span><span className="inline-flex items-center gap-1"><GraduationCap className="size-3.5" aria-hidden /> {p.credits} credit units</span></p>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="flex-1 text-sm leading-relaxed text-ink/80">{p.description}</p>
                  <div className="mt-4">
                    {mine ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-800">You are enrolled</p>
                      : state.freeLeft > 0 ? <Confirm label="Choose this free programme" variant="primary" confirmVariant="primary" confirmLabel="Yes, choose it" title={`Choose ${p.name}?`} description="You can have one free certificate programme. After you choose, you cannot swap it; other programmes need approval from the school office." run={async () => { "use server"; return chooseFreeCertificateAction(p.id); }} />
                      : <Link href="/student/courses/explore" className="block rounded-xl bg-surface px-3 py-2 text-center text-sm font-bold text-royal-700 ring-1 ring-line hover:bg-royal-50">Request this programme</Link>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
