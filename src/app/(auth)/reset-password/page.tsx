import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, NewPasswordPair, SubmitButton } from "@/components/ui/form";
import { resetAction } from "../actions";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      <ActionForm action={resetAction} className="space-y-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <NewPasswordPair label="New password" />
        <SubmitButton className="w-full" pendingText="Saving…">Change password</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
