import { NextResponse, type NextRequest } from "next/server";
import { isTranslation, parseRef, refHref } from "@/core/bible";

/** "John 3:16" → the chapter (search box on the Bible pages). Anything else becomes a concordance search. */
export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  const t = req.nextUrl.searchParams.get("t") ?? undefined;
  const ref = parseRef(q);
  const to = ref ? refHref(ref, isTranslation(t) ? t : undefined) : `/bible/search?q=${encodeURIComponent(q)}`;
  return NextResponse.redirect(new URL(to, req.url), 303);
}
