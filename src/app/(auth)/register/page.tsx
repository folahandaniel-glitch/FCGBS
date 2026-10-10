import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, CheckboxField, NewPasswordPair, SubmitButton, TextField } from "@/components/ui/form";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ programme?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Create your account" subtitle="Just the basics. With an access code you start studying straight away." wide tone="apply">
      <ActionForm action={registerAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.programme ? `/apply?programme=${encodeURIComponent(sp.programme)}` : "/apply"} />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="First name" name="firstName" autoComplete="given-name" required /><TextField label="Last name" name="lastName" autoComplete="family-name" required /></div>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Phone / WhatsApp (optional)" name="phone" type="tel" autoComplete="tel" />
        <NewPasswordPair />
        <div className="rounded-2xl bg-gradient-to-br from-gold-50 to-emerald-50 p-4 ring-1 ring-gold-400/40">
          <p className="flex items-center gap-2 text-sm font-bold text-navy-800"><KeyRound className="size-4 text-gold-600" aria-hidden /> Your access code</p>
          <p className="mb-2 mt-0.5 text-xs text-ink/75">Enter it now to open every feature and choose your <strong>free certificate programme</strong>. You can also add it later.</p>
          <TextField label="Access code" name="accessCode" placeholder="FCG-XXXX-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </div>
        <CheckboxField name="acceptTerms" label={<>I accept the <Link href="/policies/terms" className="underline" target="_blank">Terms</Link> and <Link href="/policies/privacy" className="underline" target="_blank">Privacy Policy</Link>.</>} />
        <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-royal-700 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
