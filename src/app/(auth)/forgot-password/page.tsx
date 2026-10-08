import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { forgotAction } from "../actions";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      <ActionForm action={forgotAction} className="space-y-4">
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <SubmitButton className="w-full" pendingText="Sending…">Send reset link</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/login" className="font-semibold text-royal-700 hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
