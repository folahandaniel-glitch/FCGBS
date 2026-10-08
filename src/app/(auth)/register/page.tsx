import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, CheckboxField, NewPasswordPair, SubmitButton, TextField } from "@/components/ui/form";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "Create applicant account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ programme?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Create your applicant account" subtitle="Step 1 of the admission process." wide>
      <ActionForm action={registerAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.programme ? `/apply?programme=${encodeURIComponent(sp.programme)}` : "/apply"} />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="First name" name="firstName" autoComplete="given-name" required /><TextField label="Last name" name="lastName" autoComplete="family-name" required /></div>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Phone (optional)" name="phone" type="tel" autoComplete="tel" /><TextField label="Country (optional)" name="country" autoComplete="country-name" /></div>
        <NewPasswordPair />
        <CheckboxField name="acceptTerms" label={<>I accept the <Link href="/policies/terms" className="underline" target="_blank">Terms</Link> and <Link href="/policies/privacy" className="underline" target="_blank">Privacy Policy</Link>.</>} />
        <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-royal-700 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
