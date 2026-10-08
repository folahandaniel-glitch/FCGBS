import { getDb, type Executor } from "./db";
import { auditLogs, securityEvents } from "./db/schema";

export interface ReqCtx {
  ip?: string | null;
  userAgent?: string | null;
}

export interface Actor {
  id: string;
  userType: "SUPER_ADMIN" | "STAFF" | "STUDENT" | "APPLICANT" | "ALUMNI";
  permissions: ReadonlySet<string>;
  name: string;
  email: string;
}

const REDACT = /pass(word)?|secret|token|otp|totp|hash/i;

/** Removes anything that looks like a credential before it is persisted. */
export function redact(meta: unknown, depth = 0): unknown {
  if (depth > 4 || meta === null || typeof meta !== "object") return meta;
  if (Array.isArray(meta)) return meta.slice(0, 50).map((m) => redact(m, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) out[k] = REDACT.test(k) ? "[redacted]" : redact(v, depth + 1);
  return out;
}

/**
 * Appends to the audit trail (spec §51, §93). Answers: who (actor), what changed (entity + metadata with
 * old/new values), when (created_at), why (reason in metadata), who approved (metadata.approver).
 */
export async function audit(
  entry: {
    actor?: Pick<Actor, "id" | "userType"> | null;
    action: string;
    entityType?: string;
    entityId?: string | null;
    summary?: string;
    metadata?: unknown;
  },
  ctx: ReqCtx = {},
  db: Executor = getDb(),
) {
  await db.insert(auditLogs).values({
    actorId: entry.actor?.id ?? null,
    actorType: entry.actor?.userType ?? "SYSTEM",
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    summary: entry.summary,
    metadata: entry.metadata === undefined ? null : redact(entry.metadata),
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent?.slice(0, 300) ?? null,
  });
}

export type SecurityEventType =
  | "FAILED_LOGIN"
  | "ACCOUNT_LOCKED"
  | "CONCURRENT_SESSION"
  | "PRIVILEGE_ESCALATION"
  | "UNAUTHORIZED_API"
  | "SUSPICIOUS_EXAM_ACTIVITY"
  | "IDOR_ATTEMPT"
  | "RATE_LIMITED"
  | "MALICIOUS_UPLOAD"
  | "MFA_FAILED"
  | "VERIFY_ABUSE"
  | "INVALID_ACCESS_CODE"
  | "CODE_REUSE_ATTEMPT";

export async function securityEvent(
  e: { type: SecurityEventType; severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; userId?: string | null; detail?: unknown },
  ctx: ReqCtx = {},
  db: Executor = getDb(),
) {
  try {
    await db.insert(securityEvents).values({
      type: e.type,
      severity: e.severity ?? "LOW",
      userId: e.userId ?? null,
      detail: e.detail === undefined ? null : redact(e.detail),
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent?.slice(0, 300) ?? null,
    });
  } catch (err) {
    // Security logging must never break the request path.
    console.error("[fcgbs] failed to record security event", (err as Error).message);
  }
}
