import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { hmac } from "../crypto";

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totp(secretBase32: string, label: string) {
  return new TOTP({
    issuer: "Fodan Christian Global Bible School",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  const clean = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return totp(secretBase32, "x").validate({ token: clean, window: 1 }) !== null;
}

export function currentTotp(secretBase32: string): string {
  return totp(secretBase32, "x").generate();
}

export async function totpQrDataUrl(secretBase32: string, email: string): Promise<{ uri: string; qr: string }> {
  const uri = totp(secretBase32, email).toString();
  return { uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#0b2a5b" } }) };
}

/** 10 one-time recovery codes, e.g. 7F3K-9QPA. Only hashes are stored. */
export function newRecoveryCodes(): { plain: string[]; hashes: string[] } {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const plain = Array.from({ length: 10 }, () => {
    const b = randomBytes(8);
    const s = [...b].map((x) => alphabet[x % alphabet.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
  });
  return { plain, hashes: plain.map((p) => hmac(`recovery:${p}`)) };
}

export function hashRecoveryCode(code: string) {
  return hmac(`recovery:${code.trim().toUpperCase()}`);
}
