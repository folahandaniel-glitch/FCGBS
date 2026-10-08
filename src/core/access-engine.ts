/**
 * Access-code and access-period rules. Pure functions: the server supplies `now` from its own clock, never the device's.
 * One access code belongs to one account, starts counting when it is first activated and ends on a date the server decides.
 */
export const DAY_MS = 86_400_000;

/** Unambiguous alphabet (no 0/O, 1/I/L) for human-typed codes. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_PREFIX = "FCG";

/** Format: FCG-XXXX-XXXX-XXXX (12 random symbols, about 59 bits). `randomInts` must be a CSPRNG source. */
export function formatCode(randomInts: (n: number) => number[]): string {
  const n = CODE_ALPHABET.length;
  const out: string[] = [];
  while (out.length < 12) {
    for (const v of randomInts(16)) if (v < 256 - (256 % n) && out.length < 12) out.push(CODE_ALPHABET[v % n]); // rejection sampling: no modulo bias
  }
  return `${CODE_PREFIX}-${out.slice(0, 4).join("")}-${out.slice(4, 8).join("")}-${out.slice(8, 12).join("")}`;
}

/** Upper-cases, strips spaces/dashes and the optional FCG prefix. */
export function normaliseCode(input: string): string {
  const compact = input.toUpperCase().replace(/[\s\-_.]/g, "");
  return compact.length === 12 + CODE_PREFIX.length && compact.startsWith(CODE_PREFIX) ? compact.slice(CODE_PREFIX.length) : compact;
}

export function isPlausibleCode(input: string): boolean {
  const n = normaliseCode(input);
  return n.length === 12 && [...n].every((c) => CODE_ALPHABET.includes(c));
}

export function computeExpiry(activatedAt: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Access period must be 1–3650 days.");
  return new Date(activatedAt.getTime() + days * DAY_MS);
}

export type EffectiveAccess = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REVOKED" | "ENDED" | "NONE";
export interface PeriodLike { status: string; activatedAt: Date; currentExpiresAt: Date }

export function effectiveStatus(p: PeriodLike | null | undefined, now: Date): EffectiveAccess {
  if (!p) return "NONE";
  if (p.status !== "ACTIVE") return p.status as EffectiveAccess;
  return p.currentExpiresAt.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED";
}

export function remaining(expiresAt: Date, now: Date) {
  const totalMs = Math.max(0, expiresAt.getTime() - now.getTime());
  return { totalMs, days: Math.floor(totalMs / DAY_MS), hours: Math.floor((totalMs % DAY_MS) / 3_600_000), minutes: Math.floor((totalMs % 3_600_000) / 60_000) };
}

export type AdjustAction = { kind: "EXTEND"; days: number } | { kind: "REDUCE"; days: number } | { kind: "SET_EXPIRY"; expiresAt: Date } | { kind: "END" };

/** New expiry for an administrative adjustment. Extending lapsed access starts from now, so the learner really receives the days. */
export function adjustExpiry(current: PeriodLike, action: AdjustAction, now: Date): Date {
  switch (action.kind) {
    case "EXTEND": {
      if (!Number.isInteger(action.days) || action.days < 1 || action.days > 3650) throw new Error("Extension must be 1–3650 days.");
      return new Date(Math.max(current.currentExpiresAt.getTime(), now.getTime()) + action.days * DAY_MS);
    }
    case "REDUCE": {
      if (!Number.isInteger(action.days) || action.days < 1) throw new Error("Reduction must be at least 1 day.");
      return new Date(Math.max(current.currentExpiresAt.getTime() - action.days * DAY_MS, current.activatedAt.getTime()));
    }
    case "SET_EXPIRY": {
      if (action.expiresAt.getTime() < current.activatedAt.getTime()) throw new Error("Expiry cannot be before the activation date.");
      return action.expiresAt;
    }
    case "END":
      return new Date(Math.max(now.getTime(), current.activatedAt.getTime()));
  }
}
