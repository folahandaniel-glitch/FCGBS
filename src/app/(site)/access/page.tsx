import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, Library, Sparkles } from "lucide-react";
import { AccessCard } from "@/components/access/access-card";
import { FEATURES } from "@/core/features";
import { accessContact } from "@/server/gate";
import { getSession } from "@/server/http";
import { getAccessState } from "@/server/services/access";

export const metadata: Metadata = { title: "Access code", robots: { index: false } };

export default async function AccessPage() {
  const sess = await getSession();
  const signedIn = Boolean(sess && !sess.mfaPending);
  const [{ contact, note }, state] = await Promise.all([accessContact(), signedIn ? getAccessState(sess!.user.id, sess!.user.userType) : Promise.resolve(null)]);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 text-white shadow-card"><Sparkles className="size-7" aria-hidden /></span>
        <h1 className="mt-3 font-display text-3xl font-bold text-navy-800">Your access code</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">One code opens every learning feature of FCGBS: the Bible Hub, the Teaching Library, your courses and more. Your time starts the moment you activate it.</p>
      </header>
      {signedIn && state ? (
        state.status === "STAFF" ? <p className="rounded-2xl bg-emerald-50 p-5 text-center font-semibold text-emerald-800 ring-1 ring-emerald-200">Staff accounts are not limited by access codes.</p> : <AccessCard initial={state} contact={contact} note={note} />
      ) : (
        <div className="rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-line"><p className="font-semibold text-navy-800">Sign in first, then enter your code here.</p><div className="mt-4 flex justify-center gap-3"><Link href="/login?next=/access" className="rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-bold text-white">Sign in</Link><Link href="/register" className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-900">Create account</Link></div><p className="mt-4 text-xs text-muted">{note}{contact && <> Contact: <strong>{contact}</strong>.</>}</p></div>
      )}
      <section aria-label="What a code opens">
        <h2 className="mb-3 text-center font-display text-xl font-bold text-navy-800">What your code can open</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.entries(FEATURES).map(([k, f], i) => {
            const Icon = [BookOpen, Library, GraduationCap, Sparkles][i % 4];
            return <li key={k} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line"><Icon className="mt-0.5 size-5 shrink-0 text-royal-600" aria-hidden /><div><p className="font-bold text-navy-800">{f.label}</p><p className="text-xs text-muted">{f.description}</p></div></li>;
          })}
        </ul>
      </section>
    </div>
  );
}
