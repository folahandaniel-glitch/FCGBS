import Link from "next/link";
import { KeyRound, Lock } from "lucide-react";
import { FEATURES, type Feature } from "@/core/features";
import type { Gate } from "@/server/gate";
import { accessContact } from "@/server/gate";
import { ActivateForm } from "./activate-form";

/**
 * What a person sees instead of a feature when they do not hold a valid access code. Colourful, kind and clear:
 * how to sign in, where to type the code and how to get one. Nothing behind it is rendered or sent.
 */
export async function AccessGate({ feature, gate, returnTo }: { feature: Feature; gate: Gate; returnTo: string }) {
  const { contact, note } = await accessContact();
  const f = FEATURES[feature];
  const state = gate.state;
  const missingFeature = Boolean(gate.signedIn && state?.status === "ACTIVE" && !state.features.includes(feature));
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl items-center px-4 py-12">
      <div className="w-full overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line">
        <div className="relative bg-gradient-to-br from-navy-900 via-royal-700 to-violet-700 px-6 py-8 text-center text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gold-400/25 blur-2xl" aria-hidden />
          <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 backdrop-blur"><Lock className="size-7 text-gold-300" aria-hidden /></span>
          <h1 className="relative mt-3 font-display text-2xl font-bold">{missingFeature ? "Not included in your access plan" : "Access code required"}</h1>
          <p className="relative mt-1 text-sm text-white/85"><strong>{f.label}</strong> — {f.description}</p>
        </div>
        <div className="space-y-4 p-6">
          {missingFeature ? (
            <p className="text-sm">Your current access code does not include this feature. Please contact the school office to have it added.</p>
          ) : gate.signedIn ? (
            <>
              <p className="text-sm text-ink/85">{state?.message ?? "Enter your access code to unlock the learning features. Your time starts when you activate."}</p>
              <ActivateForm />
            </>
          ) : (
            <>
              <p className="text-sm text-ink/85">Sign in (or create an account), then enter your access code on your dashboard. All learning features open as soon as the code is accepted.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="rounded-xl bg-navy-800 px-4 py-3 text-center text-sm font-bold text-white hover:bg-navy-700">Sign in</Link>
                <Link href="/register" className="rounded-xl bg-gold-500 px-4 py-3 text-center text-sm font-bold text-navy-900 hover:bg-gold-400">Create account</Link>
              </div>
            </>
          )}
          <div className="flex items-start gap-3 rounded-2xl bg-gold-50 p-4 text-sm ring-1 ring-gold-400/40">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden />
            <div><p className="font-bold text-navy-800">Need an access code?</p><p className="text-ink/80">{note}{contact && <> Contact the school: <strong>{contact}</strong>.</>}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
