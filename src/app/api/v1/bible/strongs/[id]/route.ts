import { NextResponse } from "next/server";
import { api } from "@/server/http";
import { strongsEntry, strongsUsage } from "@/server/services/bible";

/**
 * Lexicon data for the Bible reader pop-up (Strong's, public domain). Part of the Bible Hub, so it needs an access code
 * like the reader itself; the device may keep each word for a year, so a word is fetched at most once.
 */
export const GET = api<{ id: string }>({ auth: "any", access: "BIBLE" }, async ({ params }) => {
  const key = params.id.toUpperCase();
  const e = /^[HG]\d{1,4}$/.test(key) ? strongsEntry(key) : null;
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = strongsUsage(key);
  return NextResponse.json({ id: key, ...e, count: u.refs.length, words: u.words.slice(0, 6) }, { headers: { "Cache-Control": "private, max-age=31536000, immutable" } });
});
