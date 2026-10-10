import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { Badge } from "@/components/ui/primitives";
import { requireLearnerPage } from "@/server/http";
import { exploreCatalogue, myRequests, selfState } from "@/server/services/selfservice";
import { cancelRequestAction, requestEnrolmentAction } from "../self-actions";

export const metadata: Metadata = { title: "Programmes and courses" };
const STATUS: Record<string, { tone: "green" | "amber" | "red" | "blue" | "neutral"; label: string }> = { PENDING: { tone: "amber", label: "Awaiting approval" }, APPROVED: { tone: "green", label: "Approved" }, REJECTED: { tone: "red", label: "Not approved" }, CANCELLED: { tone: "neutral", label: "Cancelled" } };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sess = await requireLearnerPage();
  const q = ((await searchParams).q ?? "").trim().toLowerCase().slice(0, 60);
  const [cat, state, reqs] = await Promise.all([exploreCatalogue(sess.user.id), selfState(sess.user.id), myRequests(sess.user.id)]);
  const progs = cat.programmes.filter((p) => !q || `${p.name} ${p.code}`.toLowerCase().includes(q));
  const courses = cat.courses.filter((c) => !q || `${c.title} ${c.code} ${c.dept ?? ""}`.toLowerCase().includes(q)).slice(0, 80);
  const pending = reqs.filter((r) => r.status === "PENDING");
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-violet-800 via-royal-700 to-sky-600 p-6 text-white shadow-card sm:p-8">
        <h1 className="font-display text-3xl font-bold">Programmes and courses</h1>
        <p className="mt-2 max-w-2xl text-white/90">Look through everything the school offers. Tick what you want and send a request — you can ask for one or several. The school office approves each request.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold"><Phone className="size-4 text-gold-300" aria-hidden /> To get approval, contact the admin on <span className="text-gold-300">{state.cfg.approvalContact}</span></p>
        <form className="mt-4 flex max-w-md gap-2" role="search"><input name="q" defaultValue={q} placeholder="Search programmes and courses" aria-label="Search" className="min-w-0 flex-1 rounded-xl border-0 px-4 py-2.5 text-ink" /><button className="rounded-xl bg-gold-500 px-4 text-sm font-bold text-navy-900">Search</button></form>
      </header>

      {state.freeLeft > 0 && <p className="rounded-2xl bg-gold-50 p-4 text-sm ring-1 ring-gold-400/40">You have not chosen your free certificate programme yet. <Link href="/student/courses/start" className="font-bold text-royal-700 underline">Choose it now</Link> — no approval needed.</p>}

      {reqs.length > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line" aria-label="My requests">
          <h2 className="font-display text-xl font-bold text-navy-800">My requests ({pending.length} waiting)</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {reqs.map((r) => {
              const st = STATUS[r.status] ?? STATUS.PENDING;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 font-semibold text-navy-800">{r.kind === "PROGRAMME" ? r.programme : `${r.courseCode} · ${r.course}`}{r.adminNote && <span className="block text-xs font-normal text-muted">Admin note: {r.adminNote}</span>}</span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {r.status === "PENDING" && <Confirm label="Cancel" variant="danger-outline" title="Cancel this request?" run={async () => { "use server"; return cancelRequestAction(r.id); }} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ActionForm action={requestEnrolmentAction} resetOnSuccess className="space-y-6">
        <section aria-label="Programmes">
          <h2 className="mb-3 font-display text-2xl font-bold text-navy-800">Programmes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {progs.map((p) => {
              const st = p.request ? STATUS[p.request] : null;
              return (
                <label key={p.id} className={`flex gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ${p.mine ? "ring-emerald-300" : "ring-line"} ${p.mine || p.request === "PENDING" ? "opacity-80" : "cursor-pointer hover:ring-royal-400"}`}>
                  <input type="checkbox" name="programmeIds" value={p.id} disabled={p.mine || p.request === "PENDING"} className="mt-1 size-5 accent-royal-600" aria-label={`Request ${p.name}`} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><span className="font-bold text-navy-800">{p.name}</span><Badge tone="blue">{p.level}</Badge>{p.mine && <Badge tone="green">You are enrolled</Badge>}{st && !p.mine && <Badge tone={st.tone}>{st.label}</Badge>}</span>
                    <span className="mt-1 line-clamp-3 block text-sm text-ink/75">{p.description}</span>
                    <span className="mt-1 block text-xs font-semibold text-muted">{p.months} months · {p.credits} credit units</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section aria-label="Courses">
          <h2 className="mb-1 font-display text-2xl font-bold text-navy-800">Courses</h2>
          <p className="mb-3 text-sm text-muted">Showing {courses.length} course{courses.length === 1 ? "" : "s"}{q ? ` for “${q}”` : " (use the search to narrow the list)"}.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {courses.map((c) => {
              const st = c.request ? STATUS[c.request] : null;
              const have = c.registered;
              return (
                <label key={c.id} className={`flex gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ${have ? "ring-emerald-300" : "ring-line"} ${have || c.request === "PENDING" ? "opacity-80" : "cursor-pointer hover:ring-royal-400"}`}>
                  <input type="checkbox" name="courseIds" value={c.id} disabled={have || c.request === "PENDING"} className="mt-1 size-5 accent-royal-600" aria-label={`Request ${c.title}`} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-royal-700">{c.code}</span><span className="font-semibold text-navy-800">{c.title}</span></span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">{c.dept} · {c.credits} cr{have && <Badge tone="green">In your courses</Badge>}{st && !have && <Badge tone={st.tone}>{st.label}</Badge>}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <div className="sticky bottom-3 z-10 rounded-2xl bg-white/95 p-4 shadow-lift ring-1 ring-line backdrop-blur">
          <TextAreaField label="Note to the admin (optional)" name="note" rows={2} />
          <div className="mt-3 flex flex-wrap items-center gap-3"><SubmitButton pendingText="Sending…">Request the selected</SubmitButton><span className="text-xs text-muted">After sending, contact the school on {state.cfg.approvalContact} for approval.</span></div>
        </div>
      </ActionForm>
    </div>
  );
}
