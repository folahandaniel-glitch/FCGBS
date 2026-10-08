import { Alert, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, PasswordField, SubmitButton } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { changePasswordAction } from "@/app/admin/actions";

export default async function StudentSecurity({ searchParams }: { searchParams: Promise<{ force?: string }> }) {
  await requireLearnerPage({ allowPasswordChange: true });
  const force = (await searchParams).force;
  return (
    <>
      <PageHeader title="Security" />
      {force && <Alert tone="warning" title="Please choose a new password" className="mb-4">You must change your password before continuing.</Alert>}
      <Card className="max-w-xl">
        <CardHeader title="Change password" />
        <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4 p-5">
          <PasswordField label="Current password" name="currentPassword" autoComplete="current-password" />
          <PasswordField label="New password" name="newPassword" autoComplete="new-password" showStrength />
          <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" />
          <SubmitButton>Change password</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
