import { AppError } from "@/server/errors";
import { api } from "@/server/http";
import { audit } from "@/server/audit";
import { getBrand } from "@/server/brand";
import { rateLimit } from "@/server/rate-limit";
import { bookBySlug, ownership } from "@/server/services/books";
import { exportDoc, EXPORT_TYPES } from "@/server/services/export";

export const dynamic = "force-dynamic";

/** A watermarked copy, only for a buyer whose download the Super Admin switched on (or a Super Admin). */
export const GET = api<{ slug: string }>({ auth: "any", access: false }, async ({ req, params, actor, ctx }) => {
  const book = await bookBySlug(params.slug);
  if (!book || !actor) throw new AppError("NOT_FOUND", "Not found.");
  if (actor.userType !== "SUPER_ADMIN" && !(await ownership(actor.id, book.id))?.download) throw new AppError("FORBIDDEN", "Downloading has not been switched on for you.");
  const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "pdf";
  await rateLimit("export", actor.id, ctx);
  const brand = await getBrand();
  const body = book.manuscript.replace(/\r/g, "").replace(/^# /gm, "## ");
  const bytes = await exportDoc({ title: book.title, subtitle: book.subtitle ?? undefined, kicker: `by ${book.author}`, body, school: brand.name, note: `Licensed copy for ${actor.name}. © ${book.author}. Not for redistribution.` }, format);
  await audit({ actor, action: "book.downloaded", entityType: "book", entityId: book.id, summary: `${book.title} (${format})` }, ctx);
  return new Response(new Uint8Array(bytes), { headers: { "content-type": EXPORT_TYPES[format].mime, "content-disposition": `attachment; filename="${book.slug}.${EXPORT_TYPES[format].ext}"`, "cache-control": "private, no-store" } });
});
