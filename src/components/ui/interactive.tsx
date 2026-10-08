"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/server/http";
import { buttonClass, cx, inputClass, type ButtonVariant } from "./primitives";
import { useToast } from "./toast";

/** Accessible modal built on <dialog> (focus trap + Esc handled natively). */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx("m-auto w-[calc(100%-2rem)] rounded-2xl border border-line p-0 shadow-lift backdrop:bg-navy-950/50 backdrop:backdrop-blur-[2px]", wide ? "max-w-3xl" : "max-w-lg")}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-bold text-navy-800">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-slate-100 hover:text-ink">
          <X className="size-5" />
        </button>
      </div>
      <div className="scroll-75 px-5 py-4">{children}</div>
    </dialog>
  );
}

/**
 * Button that runs a server action after an explicit confirmation — used for
 * every destructive or irreversible control (§106). Optionally asks for a reason.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "secondary",
  confirmVariant = "danger",
  size = "sm",
  run,
  reason,
  reasonLabel = "Reason (recorded in the audit log)",
  extra,
  icon,
  successMessage,
  onDone,
  className,
}: {
  label: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: "sm" | "md";
  run: (input: { reason: string; extra: string }) => Promise<ActionResult>;
  reason?: boolean;
  reasonLabel?: string;
  extra?: { label: string; type?: string; placeholder?: string; defaultValue?: string };
  icon?: ReactNode;
  successMessage?: string;
  onDone?: (r: ActionResult) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [extraVal, setExtraVal] = useState(extra?.defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <button type="button" className={buttonClass(variant, size, className)} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warn-50 text-warn-600">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
            <div className="text-sm text-muted">{description ?? "Please confirm this action."}</div>
          </div>
          {extra && (
            <label className="block text-sm font-semibold text-navy-800">
              {extra.label}
              <input className={cx(inputClass, "mt-1.5")} type={extra.type ?? "text"} placeholder={extra.placeholder} value={extraVal} onChange={(e) => setExtraVal(e.target.value)} />
            </label>
          )}
          {reason && (
            <label className="block text-sm font-semibold text-navy-800">
              {reasonLabel}
              <textarea className={cx(inputClass, "mt-1.5")} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={buttonClass("secondary")} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || (reason && text.trim().length < 3)}
              className={buttonClass(confirmVariant)}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await run({ reason: text, extra: extraVal });
                  if (r.ok) {
                    setOpen(false);
                    setText("");
                    toast("success", r.message ?? successMessage ?? "Done.");
                    onDone?.(r);
                    router.refresh();
                  } else setError(r.error);
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Fire-and-refresh button for simple, reversible actions. */
export function ActionButton({ children, run, variant = "secondary", size = "sm", className, successMessage }: { children: ReactNode; run: () => Promise<ActionResult>; variant?: ButtonVariant; size?: "sm" | "md"; className?: string; successMessage?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant, size, className)}
      onClick={() =>
        start(async () => {
          const r = await run();
          if (r.ok) {
            toast("success", r.message ?? successMessage ?? "Saved.");
            router.refresh();
          } else toast("error", r.error);
        })
      }
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Shows a secret (temporary password, codes) exactly once with copy support. */
export function RevealOnce({ title, values, note }: { title: string; values: string[]; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-gold-400/40 bg-gold-50 p-4">
      <p className="text-sm font-bold text-navy-800">{title}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-3 grid gap-1.5 font-mono text-sm sm:grid-cols-2">
        {values.map((v) => (
          <code key={v} className="rounded-lg bg-white px-3 py-1.5 text-navy-800 ring-1 ring-line">
            {v}
          </code>
        ))}
      </div>
      <button
        type="button"
        className={buttonClass("secondary", "sm", "mt-3")}
        onClick={async () => {
          await navigator.clipboard.writeText(values.join("\n"));
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy all"}
      </button>
    </div>
  );
}
