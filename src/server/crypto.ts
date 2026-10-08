import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secrets come only from the environment. In development/test a deterministic
 * fallback is used so the app boots; production refuses to start without them.
 */
function secret(name: "AUTH_SECRET" | "ENCRYPTION_KEY"): Buffer {
  const v = process.env[name];
  if (v && v.length >= 32) return createHash("sha256").update(v).digest();
  if (process.env.NODE_ENV === "production" && process.env.FCGBS_ALLOW_INSECURE_SECRETS !== "1") {
    throw new Error(`${name} must be set (min 32 chars) in production`);
  }
  return createHash("sha256").update(`fcgbs-dev-only-${name}`).digest();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Keyed hash for lookups of secrets (session tokens, access codes, reset tokens). */
export function hmac(input: string): string {
  return createHmac("sha256", secret("AUTH_SECRET")).update(input).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** AES-256-GCM. Output: base64url(iv).base64url(tag).base64url(ciphertext) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret("ENCRYPTION_KEY"), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", secret("ENCRYPTION_KEY"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
