/** Pure helpers for e-books: purchase-code format and splitting a manuscript into chapters. */
import { CODE_ALPHABET } from "./access-engine";

export const BOOK_CODE_PREFIX = "BK";

/** BK-XXXX-XXXX-XXXX from an unbiased-enough random byte source. */
export function formatBookCode(bytes: number[]) {
  const chars = bytes.slice(0, 12).map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${BOOK_CODE_PREFIX}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Forgives case, spaces and missing dashes. */
export function normaliseBookCode(input: string) {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.startsWith(BOOK_CODE_PREFIX) ? s : BOOK_CODE_PREFIX + s;
}

export interface Chapter { title: string; body: string }

/** A line starting "# " begins a chapter; "## " and "### " stay inside it. */
export function splitChapters(manuscript: string): Chapter[] {
  const out: Chapter[] = [];
  for (const line of manuscript.replace(/\r/g, "").split("\n")) {
    const h = /^#\s+(.*)$/.exec(line);
    if (h) out.push({ title: h[1].trim(), body: "" });
    else if (out.length) out[out.length - 1].body += line + "\n";
    else if (line.trim()) out.push({ title: "Introduction", body: line + "\n" });
  }
  return out.map((c) => ({ title: c.title, body: c.body.trim() })).filter((c) => c.title || c.body);
}
