import { NextResponse } from "next/server";
import { strongsEntry, strongsUsage } from "@/server/services/bible";

/** Public, immutable lexicon data (Strong's, public domain). Cached for a year so a word is fetched at most once per device. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const key = id.toUpperCase();
  const e = /^[HG]\d{1,4}$/.test(key) ? strongsEntry(key) : null;
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = strongsUsage(key);
  return NextResponse.json({ id: key, ...e, count: u.refs.length, words: u.words.slice(0, 6) }, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}
