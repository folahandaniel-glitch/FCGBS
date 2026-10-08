/**
 * Typed application errors with user-safe messages (spec §88). Stack traces and internal details never
 * reach the browser; developers read them in the server log.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_LOCKED"
  | "INVALID_CREDENTIALS"
  | "MFA_REQUIRED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "RULE_VIOLATION"
  | "NOT_CONFIGURED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  ACCOUNT_SUSPENDED: 403,
  ACCOUNT_LOCKED: 423,
  INVALID_CREDENTIALS: 401,
  MFA_REQUIRED: 401,
  PASSWORD_CHANGE_REQUIRED: 403,
  RULE_VIOLATION: 409,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export function toPublicError(e: unknown): { code: ErrorCode; message: string; status: number; fields?: Record<string, string[]> } {
  if (e instanceof AppError) return { code: e.code, message: e.message, status: e.status, fields: e.fields };
  if (e && typeof e === "object" && "name" in e && (e as Error).name === "ZodError") {
    const issues = (e as unknown as { issues: { path: (string | number)[]; message: string }[] }).issues;
    const fields: Record<string, string[]> = {};
    for (const i of issues) (fields[i.path.join(".") || "_"] ??= []).push(i.message);
    return { code: "VALIDATION", message: issues[0]?.message && issues.length === 1 ? issues[0].message : "Please correct the highlighted fields.", status: 422, fields };
  }
  const pg = e as { code?: string; cause?: { code?: string } };
  const pgCode = pg?.code ?? pg?.cause?.code;
  if (pgCode === "23505") return { code: "CONFLICT", message: "This record already exists.", status: 409 };
  if (pgCode === "23503") return { code: "CONFLICT", message: "This record is linked to other records and cannot be changed or removed.", status: 409 };
  console.error("[fcgbs] unexpected error", e instanceof Error ? e.stack ?? e.message : e);
  return { code: "INTERNAL", message: "Something went wrong on our side. Please try again.", status: 500 };
}
