import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, NewPasswordPair, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { getSession } from "@/server/http";
import { ownerEmail, superAdminExists } from "@/server/services/auth";
import { backendLoginAction, setupAction } from "../actions";

export const metadata: Metadata = { title: "Staff portal", robots: { index: false } };

export default async function BackendPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s && !s.mfaPending && (s.user.userType === "STAFF" || s.user.userType === "SUPER_ADMIN")) redirect("/admin");
  const needsSetup = !(await superAdminExists());
  if (needsSetup) {
    return (
      <AuthShell title="First-time setup" subtitle="Create the Super Admin account. Only the owner e-mail and the setup key from the server can do this." wide>
        <ActionForm action={setupAction} className="space-y-4">
          <TextField label="Owner email" name="email" type="email" defaultValue={process.env.NODE_ENV === "production" ? "" : ownerEmail()} required />
          <PasswordField label="Setup key" name="setupToken" autoComplete="one-time-code" hint="The SETUP_TOKEN value from the server environment." />
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="First name" name="firstName" /><TextField label="Last name" name="lastName" /></div>
          <NewPasswordPair />
          <SubmitButton className="w-full" size="lg" pendingText="Creating…">Create Super Admin</SubmitButton>
        </ActionForm>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Faculty & Administration" subtitle="Staff sign-in.">
      <ActionForm action={backendLoginAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <TextField label="Email" name="identifier" type="email" autoComplete="username" required />
        <PasswordField label="Password" name="password" autoComplete="current-password" />
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/forgot-password" className="font-semibold text-royal-700 hover:underline">Forgot password?</Link></p>
    </AuthShell>
  );
}
