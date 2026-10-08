"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { checkPassword, DEFAULT_PASSWORD_POLICY } from "@/core/password-policy";
import type { ActionResult } from "@/server/http";
import { buttonClass, cx, inputClass, type ButtonVariant } from "./primitives";
import { useToast } from "./toast";

type FieldErrors = Record<string, string[]> | undefined;
const ErrorsCtx = createContext<FieldErrors>(undefined);

type ServerAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/**
 * Progressive-enhancement form bound to a server action. Shows the returned
 * error, highlights invalid fields and optionally toasts / redirects / resets.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  redirectTo,
  resetOnSuccess,
  onSuccess,
  showInlineError = true,
  ...rest
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  redirectTo?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (r: ActionResult) => void;
  showInlineError?: boolean;
} & Omit<ComponentProps<"form">, "action" | "onSubmit">) {
  const [state, formAction] = useActionState(action, null);
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      const msg = state.message ?? successMessage;
      if (msg) toast("success", msg);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else if (!showInlineError) toast("error", state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <ErrorsCtx.Provider value={state && !state.ok ? state.fields : undefined}>
      <form ref={ref} action={formAction} className={className} noValidate {...rest}>
        {state && !state.ok && showInlineError && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-danger-50 px-4 py-3 text-sm text-danger-600">
            {state.error}
          </div>
        )}
        {children}
      </form>
    </ErrorsCtx.Provider>
  );
}

export function useFieldError(name: string) {
  const errs = useContext(ErrorsCtx);
  return errs?.[name]?.[0];
}

export function Field({
  label,
  name,
  hint,
  children,
  required,
  className,
  htmlFor,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; name: string; required?: boolean }) => ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  const auto = useId();
  const id = htmlFor ?? `${name}-${auto}`;
  const err = useFieldError(name);
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = err ? `${id}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-800">
        {label}
        {required && (
          <span className="text-danger-600" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, name, required, "aria-invalid": Boolean(err), "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined })}
      {hint && !err && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {err && (
        <p id={errId} className="mt-1 text-xs font-medium text-danger-600">
          {err}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, name, hint, required, className, ...input }: { label: ReactNode; name: string; hint?: ReactNode; required?: boolean; className?: string } & Omit<ComponentProps<"input">, "name">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(a) => <input {...a} {...input} className={cx(inputClass, input.readOnly && "bg-slate-50")} />}
    </Field>
  );
}

export function TextAreaField({ label, name, hint, required, className, ...input }: { label: ReactNode; name: string; hint?: ReactNode; required?: boolean; className?: string } & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(a) => <textarea {...a} rows={input.rows ?? 4} {...input} className={cx(inputClass, "leading-relaxed")} />}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  required,
  className,
  options,
  placeholder,
  ...input
}: { label: ReactNode; name: string; hint?: ReactNode; required?: boolean; className?: string; options: { value: string; label: string }[]; placeholder?: string } & Omit<ComponentProps<"select">, "name">) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(a) => (
        <select {...a} {...input} className={cx(inputClass, "pr-8")}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, name, defaultChecked, hint, value = "on" }: { label: ReactNode; name: string; defaultChecked?: boolean; hint?: ReactNode; value?: string }) {
  const id = useId();
  const err = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
        <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 rounded border-line accent-royal-600" aria-invalid={Boolean(err)} />
        <span>
          <span className="font-medium text-navy-800">{label}</span>
          {hint && <span className="block text-xs text-muted">{hint}</span>}
        </span>
      </label>
      {err && <p className="mt-1 text-xs font-medium text-danger-600">{err}</p>}
    </div>
  );
}

export function SubmitButton({ children, variant = "primary", size = "md", className, pendingText, ...p }: { children: ReactNode; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; pendingText?: string } & ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || p.disabled} aria-busy={pending} {...p} className={buttonClass(variant, size, className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/* ------------------------------------------------ Password input (§97) */

const STRENGTH_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];

/**
 * The single secure password component used everywhere (Rule 12): accessible
 * show/hide toggle, never auto-revealed, correct autocomplete hints, optional
 * live strength meter and match confirmation.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  showStrength,
  matchWith,
  hint,
  required = true,
  context = [],
  onValueChange,
}: {
  label: ReactNode;
  name: string;
  autoComplete: "current-password" | "new-password" | "one-time-code";
  showStrength?: boolean;
  matchWith?: string;
  hint?: ReactNode;
  required?: boolean;
  context?: string[];
  onValueChange?: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const check = showStrength && value ? checkPassword(value, DEFAULT_PASSWORD_POLICY, context) : null;
  const mismatch = matchWith !== undefined && value.length > 0 && value !== matchWith;
  return (
    <Field label={label} name={name} required={required} hint={hint}>
      {(a) => (
        <div>
          <div className="relative">
            <input
              {...a}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              spellCheck={false}
              autoCapitalize="none"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onValueChange?.(e.target.value);
              }}
              className={cx(inputClass, "pr-12")}
              aria-invalid={a["aria-invalid"] || mismatch || (check ? !check.ok : false)}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              aria-controls={a.id}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted hover:text-navy-800"
            >
              {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
          {showStrength && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={cx("h-1.5 flex-1 rounded-full", check && i <= check.score ? STRENGTH_COLORS[check.score] : "bg-slate-200")} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {check ? (
                  <>
                    Strength: <strong className="text-navy-800">{check.label}</strong>
                    {check.errors[0] && <span className="text-danger-600"> — {check.errors[0]}</span>}
                  </>
                ) : (
                  "At least 10 characters with letters, numbers and a symbol."
                )}
              </p>
            </div>
          )}
          {mismatch && <p className="mt-1 text-xs font-medium text-danger-600">Passwords do not match.</p>}
          {matchWith !== undefined && value.length > 0 && !mismatch && <p className="mt-1 text-xs font-medium text-success-600">Passwords match.</p>}
        </div>
      )}
    </Field>
  );
}

/** Pair of new-password + confirm fields sharing state. */
export function NewPasswordPair({ name = "password", confirmName = "confirmPassword", label = "Password", context = [] }: { name?: string; confirmName?: string; label?: string; context?: string[] }) {
  const [pw, setPw] = useState("");
  return (
    <>
      <PasswordField label={label} name={name} autoComplete="new-password" showStrength context={context} onValueChange={setPw} />
      <PasswordField label="Confirm password" name={confirmName} autoComplete="new-password" matchWith={pw} />
    </>
  );
}
