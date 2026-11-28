/**
 * Entries whose seeded text was later revised. The value is a fingerprint of the OLD text: the seed replaces a stored entry only
 * when it still matches, so anything an administrator has edited is never overwritten.
 */
export const QUESTION_REVISIONS: Record<string, string> = {
  "who-was-melchizedek": "c45833059c74f405e6b8bc0cbe78d4d9d440e774a090540a00c31f4e9655a943",
  "divorce-and-remarriage": "7c08868c7211998584e951a61fc9cfb781e81bab0dac2a68cbc819b36de3e9c2",
};
