/**
 * Password policy (§6, §62, Rule 13). Shared by client (strength meter) and
 * server (authoritative validation). No crypto here — hashing lives server-side.
 */
export interface PasswordPolicy {
  minLength: number;
  requireLetter: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 10,
  requireLetter: true,
  requireNumber: true,
  requireSymbol: true,
};

export interface PasswordCheck {
  ok: boolean;
  errors: string[];
  /** 0 (very weak) – 4 (very strong) */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
}

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "1234567890",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "fodan12345",
  "admin12345",
  "iloveyou12",
]);

export function checkPassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  context: string[] = [],
): PasswordCheck {
  // Floor: nobody can configure the policy below the §13 minimum.
  const minLength = Math.max(10, policy.minLength);
  const errors: string[] = [];
  const hasLetter = /\p{L}/u.test(password);
  const hasNumber = /\p{N}/u.test(password);
  const hasSymbol = /[^\p{L}\p{N}\s]/u.test(password);

  if (password.length < minLength) errors.push(`Use at least ${minLength} characters.`);
  if (policy.requireLetter && !hasLetter) errors.push("Include at least one letter.");
  if (policy.requireNumber && !hasNumber) errors.push("Include at least one number.");
  if (policy.requireSymbol && !hasSymbol) errors.push("Include at least one symbol (e.g. ! @ # ^).");
  if (password.length > 128) errors.push("Use 128 characters or fewer.");
  if (/^\s|\s$/.test(password)) errors.push("Password cannot start or end with a space.");

  const lower = password.toLowerCase();
  if (COMMON.has(lower.replace(/[^a-z0-9]/g, ""))) errors.push("This password is too common.");
  for (const c of context) {
    const token = c.trim().toLowerCase();
    if (token.length >= 4 && lower.includes(token)) {
      errors.push("Password must not contain your name or email.");
      break;
    }
  }

  let points = 0;
  if (password.length >= minLength) points++;
  if (password.length >= 14) points++;
  const classes = [hasLetter, hasNumber, hasSymbol, /[a-z]/.test(password) && /[A-Z]/.test(password)].filter(Boolean)
    .length;
  points += classes >= 4 ? 2 : classes >= 3 ? 1 : 0;
  if (/(.)\1{2,}/.test(password)) points--;
  if (errors.length) points = Math.min(points, 1);
  const score = Math.max(0, Math.min(4, points)) as PasswordCheck["score"];
  const label = (["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const)[score];
  return { ok: errors.length === 0, errors, score, label };
}
