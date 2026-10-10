import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/primitives";
import { ActionForm, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { getSession } from "@/server/http";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !s.mfaPending) redirect(s.user.userType === "APPLICANT" ? "/access" : s.user.userType === "STAFF" || s.user.userType === "SUPER_ADMIN" ? "/admin" : "/student");
  return (
    <AuthShell title="Student & Applicant Sign In" subtitle="Welcome back to FCGBS.">
      {sp.reset && <Alert tone="success" className="mb-4">Your password was changed. Please sign in.</Alert>}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <TextField label="Email" name="identifier" type="email" autoComplete="username" required />
        <PasswordField label="Password" name="password" autoComplete="current-password" />
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      </ActionForm>
      <div className="mt-5 flex justify-between text-sm"><Link href="/forgot-password" className="font-semibold text-royal-700 hover:underline">Forgot password?</Link><Link href="/register" className="font-semibold text-royal-700 hover:underline">Apply / create account</Link></div>
      <p className="mt-4 text-center text-xs text-muted">Faculty and administrators sign in at the <Link href="/backend" className="underline">staff portal</Link>.</p>
    </AuthShell>
  );
}
