import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

/* ------------------------------------------------------------ Button */

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 select-none whitespace-nowrap";
const btnVariants = {
  primary: "bg-royal-600 text-white shadow-sm hover:bg-royal-700 active:bg-navy-700",
  navy: "bg-navy-800 text-white shadow-sm hover:bg-navy-700",
  gold: "bg-gold-500 text-navy-900 shadow-sm hover:bg-gold-400",
  secondary: "bg-white text-navy-800 ring-1 ring-inset ring-line hover:bg-royal-50",
  ghost: "text-navy-800 hover:bg-royal-50",
  danger: "bg-danger-600 text-white hover:bg-red-700",
  "danger-outline": "bg-white text-danger-600 ring-1 ring-inset ring-red-200 hover:bg-danger-50",
  white: "bg-white text-navy-800 hover:bg-gold-50",
  outlineLight: "text-white ring-1 ring-inset ring-white/40 hover:bg-white/10",
};
const btnSizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-6 text-base" };

export type ButtonVariant = keyof typeof btnVariants;
export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof btnSizes = "md", extra?: string) {
  return cx(btnBase, btnVariants[variant], btnSizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof btnSizes }) {
  return <button {...p} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...p }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof btnSizes }) {
  return <Link {...p} className={buttonClass(variant, size, className)} />;
}

/* -------------------------------------------------------------- Card */

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div {...p} className={cx("rounded-2xl border border-line bg-white shadow-card print-card", className)} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-navy-800">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- Badge */

const badgeTones = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-royal-50 text-royal-700 ring-royal-100",
  navy: "bg-navy-800 text-white ring-navy-800",
  gold: "bg-gold-100 text-gold-600 ring-gold-400/30",
  green: "bg-success-50 text-success-600 ring-emerald-200",
  red: "bg-danger-50 text-danger-600 ring-red-200",
  amber: "bg-warn-50 text-warn-600 ring-amber-200",
};
export type Tone = keyof typeof badgeTones;
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", badgeTones[tone], className)}>{children}</span>;
}

export function statusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
    case "PUBLISHED":
    case "COMPLETED":
    case "SUBMITTED":
    case "SENT":
    case "PASS":
      return "green";
    case "PENDING_REVIEW":
    case "IN_PROGRESS":
    case "UPCOMING":
    case "QUEUED":
    case "HELD":
      return "amber";
    case "UNUSED":
    case "DRAFT":
    case "OPEN":
      return "blue";
    case "REJECTED":
    case "REVOKED":
    case "SUSPENDED":
    case "VOIDED":
    case "FAILED":
    case "FAIL":
    case "HIGH":
    case "CRITICAL":
      return "red";
    case "EXPIRED":
    case "ENDED":
    case "ARCHIVED":
    case "CLOSED":
    case "AUTO_SUBMITTED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge>—</Badge>;
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

/* ------------------------------------------------------------- Alert */

const alertTones = {
  info: "border-royal-100 bg-royal-50 text-navy-800",
  success: "border-emerald-200 bg-success-50 text-success-600",
  warning: "border-amber-200 bg-warn-50 text-warn-600",
  danger: "border-red-200 bg-danger-50 text-danger-600",
};
export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof alertTones; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm", alertTones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title && "mt-1", "leading-relaxed")}>{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------ Page header */

export function PageHeader({ title, description, actions, eyebrow, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; breadcrumbs?: { href?: string; label: string }[] }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted">
            <ol className="flex flex-wrap items-center gap-1">
              {breadcrumbs.map((b, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden>/</span>}
                  {b.href ? (
                    <Link className="hover:text-royal-600 hover:underline" href={b.href}>
                      {b.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink">
                      {b.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-gold-600">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-muted sm:text-[0.95rem]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Stat */

export function Stat({ label, value, hint, icon, tone = "royal" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "royal" | "gold" | "green" | "red" | "navy" }) {
  const tones = { royal: "bg-royal-50 text-royal-600", gold: "bg-gold-100 text-gold-600", green: "bg-success-50 text-success-600", red: "bg-danger-50 text-danger-600", navy: "bg-navy-800 text-white" };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-navy-800">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}>{icon}</span>}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------- Empty state */

export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-royal-50 text-royal-600">{icon}</div>}
      <p className="font-semibold text-navy-800">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Table */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("whitespace-nowrap border-b border-line bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cx("border-b border-line px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

/* -------------------------------------------------------- Pagination */

export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="px-4 py-3 text-xs text-muted">{total.toLocaleString()} record{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <p className="text-xs text-muted">
        Page {page} of {pages} · {total.toLocaleString()} records
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={buttonClass("secondary", "sm")} href={href(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className={buttonClass("secondary", "sm", "opacity-40")}>Previous</span>
        )}
        {page < pages ? (
          <Link className={buttonClass("secondary", "sm")} href={href(page + 1)}>
            Next
          </Link>
        ) : (
          <span className={buttonClass("secondary", "sm", "opacity-40")}>Next</span>
        )}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------ Inputs */

export const inputClass =
  "block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.95rem] text-ink shadow-sm placeholder:text-slate-400 focus:border-royal-500 focus:outline-none focus:ring-4 focus:ring-royal-100 disabled:bg-slate-50 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

export function ProgressBar({ value, tone = "royal", label }: { value: number; tone?: "royal" | "gold" | "green"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const tones = { royal: "bg-royal-600", gold: "bg-gold-500", green: "bg-success-600" };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("h-full rounded-full transition-all", tones[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[0.7rem] text-muted">{children}</kbd>;
}
