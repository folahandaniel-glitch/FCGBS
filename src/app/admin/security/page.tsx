import { eq } from "drizzle-orm";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, PasswordField, SubmitButton } from "@/components/ui/form";
import { RevokeSessions, TwoFactor } from "@/components/admin/two-factor";
import { requireStaffPage } from "@/server/http";
import { getSetting } from "@/server/settings";
import { totpQrDataUrl } from "@/server/auth/totp";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { decrypt } from "@/server/crypto";
import { changePasswordAction } from "../actions";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ force?: string }> }) {
  const s = await requireStaffPage(undefined, { allowSetup: true });
  const force = (await searchParams).force;
  const cfg = await getSetting("authentication");
  const mandatory = s.user.userType === "SUPER_ADMIN" && cfg.requireSuperAdmin2fa;
  const email = s.user.email;
  async function qrFor(secret: string) {
    "use server";
    // Only the signed-in user's own pending secret is encoded; the secret is re-read server-side, never trusted from the client.
    const [u] = await getDb().select({ enc: users.totpSecretEnc }).from(users).where(eq(users.id, (await requireStaffPage(undefined, { allowSetup: true })).user.id));
    const real = u?.enc ? decrypt(u.enc) : secret;
    return (await totpQrDataUrl(real, email)).qr;
  }
  return (
    <>
      <PageHeader title="My security" description="Protect your account: strong password, two-factor authentication and active sessions." />
      {force === "2fa" && <Alert tone="warning" title="Two-factor authentication required" className="mb-4">Set up two-factor authentication to continue using the backend.</Alert>}
      {force === "password" && <Alert tone="warning" title="Please change your password" className="mb-4">You must choose a new password before continuing.</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Change password" />
          <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4 p-5">
            <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" />
            <PasswordField label="New password" name="newPassword" autoComplete="new-password" showStrength />
            <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" />
            <SubmitButton pendingText="Saving…">Change password</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title="Two-factor authentication" description={s.user.totpEnabled ? "Enabled" : "Not enabled"} />
          <div className="space-y-4 p-5"><TwoFactor enabled={s.user.totpEnabled} mandatory={mandatory} qrFor={qrFor} /><div className="border-t border-line pt-4"><RevokeSessions /></div></div>
        </Card>
      </div>
    </>
  );
}
