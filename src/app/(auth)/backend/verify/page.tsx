import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { getSession } from "@/server/http";
import { mfaAction } from "../../actions";

export const metadata: Metadata = { title: "Two-factor verification", robots: { index: false } };

export default async function VerifyMfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (!s) redirect("/backend");
  if (!s.mfaPending) redirect("/admin");
  return (
    <AuthShell title="Two-factor verification" subtitle="Enter the 6-digit code from your authenticator app, or a recovery code." tone="staff">
      <ActionForm action={mfaAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <TextField label="Verification code" name="code" inputMode="text" autoComplete="one-time-code" required />
        <SubmitButton className="w-full" size="lg" pendingText="Verifying…">Verify</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
