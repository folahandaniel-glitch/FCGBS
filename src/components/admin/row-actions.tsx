"use client";

import type { ReactNode } from "react";
import { ActionButton, ConfirmAction } from "../ui/interactive";
import type { ActionResult } from "@/server/http";

/** Thin client wrappers so server components can bind server actions to buttons (closures can't cross the boundary). */
export function Do({ label, run, variant = "secondary", size = "sm" }: { label: ReactNode; run: () => Promise<ActionResult>; variant?: "primary" | "secondary" | "danger" | "gold" | "navy"; size?: "sm" | "md" }) {
  return <ActionButton run={run} variant={variant} size={size}>{label}</ActionButton>;
}

export function Confirm({ label, title, description, run, reason, variant = "secondary", confirmVariant = "danger", confirmLabel }: { label: ReactNode; title: string; description?: ReactNode; run: (i: { reason: string; extra: string }) => Promise<ActionResult>; reason?: boolean; variant?: "secondary" | "danger-outline" | "primary"; confirmVariant?: "danger" | "primary"; confirmLabel?: string }) {
  return <ConfirmAction label={label} title={title} description={description} run={run} reason={reason} variant={variant} confirmVariant={confirmVariant} confirmLabel={confirmLabel} />;
}
