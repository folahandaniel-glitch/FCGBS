import { hash, verify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

/**
 * Argon2id with OWASP-recommended parameters (19 MiB, t=2, p=1).
 * `algorithm: 2` is Algorithm.Argon2id (a const enum we cannot import under isolatedModules).
 */
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

/** A dummy hash to keep timing constant when the account does not exist. */
let dummy: string | null = null;
export async function burnVerify(password: string) {
  dummy ??= await hashPassword("fcgbs-timing-equaliser-Aa1!");
  await verifyPassword(dummy, password);
}

/**
 * Generates a temporary password that satisfies the policy (letters, digits,
 * symbol, ≥ 14 chars). Shown ONCE to the admin, never stored in plaintext.
 */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*?";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[randomInt(s.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
