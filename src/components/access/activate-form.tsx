"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { activateCodeAction } from "@/app/access-actions";
import { ActionForm, SubmitButton, TextField } from "../ui/form";

/** The one place a code is entered. On success the page reloads from the server so every feature opens at once. */
export function ActivateForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  return (
    <ActionForm action={activateCodeAction} resetOnSuccess onSuccess={() => { onDone?.(); router.refresh(); }} className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-end" : "space-y-3"}>
      <TextField className="flex-1" label="Access code" name="code" placeholder="FCG-XXXX-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
      <SubmitButton pendingText="Checking…" className={compact ? "" : "w-full"}><KeyRound className="size-4" aria-hidden /> Activate access</SubmitButton>
    </ActionForm>
  );
}
