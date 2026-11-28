import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import JSZip from "jszip";
import { formatBookCode, normaliseBookCode, splitChapters } from "@/core/books";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, securityEvent, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { decrypt, encrypt, hmac } from "../crypto";
import { rateLimit } from "../rate-limit";

/**
 * Paid e-books. A buyer pays the ministry directly and receives a code for ONE book that works ONCE and binds the book to their
 * account. Reading is online; downloading stays off unless the Super Admin switches it on for that buyer.
 */
const hash = (code: string) => hmac(`fcgbs-book:${normaliseBookCode(code)}`);

function superOnly(actor: Actor) {
  if (actor.userType !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only a Super Admin can manage books and codes.");
}

/** Word manuscripts: heading styles become # / ## / ###, every other paragraph stays a paragraph. */
export async function manuscriptFromDocx(bytes: Buffer) {
  const zip = await JSZip.loadAsync(bytes).catch(() => null);
  const xml = await zip?.file("word/document.xml")?.async("string");
  if (!xml) throw new AppError("VALIDATION", "That file is not a readable Word document.");
  const decode = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const text = xml.split(/<\/w:p>/).map((p) => {
    const text = decode((p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>|<w:tab\/>/g) ?? []).map((t) => (t === "<w:tab/>" ? " " : t.replace(/<[^>]+>/g, ""))).join("")).trim();
    if (!text) return "";
    const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? "";
    const level = /^(?:heading|titre|title)\s*([123])?$/i.exec(style);
    if (level) return `${"#".repeat(Number(level[1] ?? 1))} ${text}`;
    return /<w:numPr>/.test(p) ? `- ${text}` : text;
  }).filter(Boolean).join("\n\n").replace(/^(- .*)\n\n(?=- )/gm, "$1\n");
  // anything before the first chapter heading is the title page, which the website draws itself
  const first = text.search(/^# /m);
  return first > 0 ? text.slice(first) : text;
}

export interface BookInput { title: string; subtitle?: string; author: string; description?: string; price?: string; howToBuy?: string; manuscript?: string; coverAssetId?: string; published: boolean }

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "book";

export async function saveBook(actor: Actor, id: string | null, input: BookInput, ctx: ReqCtx) {
  superOnly(actor);
  if (input.title.trim().length < 3) throw new AppError("VALIDATION", "Enter the book title.");
  if (!input.author.trim()) throw new AppError("VALIDATION", "Enter the author.");
  const db = getDb();
  const [old] = id ? await db.select().from(s.books).where(eq(s.books.id, id)) : [];
  if (id && !old) throw new AppError("NOT_FOUND", "Book not found.");
  const manuscript = input.manuscript?.trim() || old?.manuscript || "";
  if (input.published && splitChapters(manuscript).length === 0) throw new AppError("RULE_VIOLATION", "Upload the manuscript before publishing.");
  const values = { title: input.title.trim(), subtitle: input.subtitle?.trim() || null, author: input.author.trim(), description: input.description?.trim() || null, price: input.price?.trim() || null, howToBuy: input.howToBuy?.trim() || null, manuscript, coverAssetId: input.coverAssetId || old?.coverAssetId || null, status: input.published ? ("PUBLISHED" as const) : ("DRAFT" as const), updatedAt: new Date() };
  let savedId = id;
  if (old) await db.update(s.books).set(values).where(eq(s.books.id, old.id));
  else {
    const base = slugify(values.title);
    const taken = new Set((await db.select({ slug: s.books.slug }).from(s.books)).map((b) => b.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    [{ id: savedId }] = await db.insert(s.books).values({ ...values, slug }).returning({ id: s.books.id });
  }
  await audit({ actor, action: old ? "book.updated" : "book.created", entityType: "book", entityId: savedId, summary: `${values.title} (${values.status})` }, ctx);
  return savedId!;
}

const card = { id: s.books.id, slug: s.books.slug, title: s.books.title, subtitle: s.books.subtitle, author: s.books.author, description: s.books.description, price: s.books.price, howToBuy: s.books.howToBuy, coverAssetId: s.books.coverAssetId, status: s.books.status };

/** Catalogue entries never include the manuscript. */
export async function publishedBooks() {
  return getDb().select(card).from(s.books).where(eq(s.books.status, "PUBLISHED")).orderBy(asc(s.books.title));
}
export async function allBooks() {
  return getDb().select(card).from(s.books).orderBy(desc(s.books.updatedAt));
}
export async function bookBySlug(slug: string) {
  const [b] = await getDb().select().from(s.books).where(eq(s.books.slug, slug));
  return b ?? null;
}
export async function bookById(id: string) {
  const [b] = await getDb().select().from(s.books).where(eq(s.books.id, id));
  return b ?? null;
}

/** The reader's right to this book. */
export async function ownership(userId: string, bookId: string) {
  const [row] = await getDb().select({ id: s.bookCodes.id, download: s.bookCodes.downloadAllowed }).from(s.bookCodes).where(and(eq(s.bookCodes.bookId, bookId), eq(s.bookCodes.usedBy, userId), eq(s.bookCodes.status, "USED"))).limit(1);
  return row ?? null;
}
export async function myBookIds(userId: string) {
  return (await getDb().select({ id: s.bookCodes.bookId }).from(s.bookCodes).where(and(eq(s.bookCodes.usedBy, userId), eq(s.bookCodes.status, "USED")))).map((r) => r.id);
}

export async function generateBookCodes(actor: Actor, bookId: string, count: number, note: string, ctx: ReqCtx) {
  superOnly(actor);
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new AppError("VALIDATION", "Choose between 1 and 200 codes.");
  if (!(await bookById(bookId))) throw new AppError("NOT_FOUND", "Book not found.");
  const codes = Array.from({ length: count }, () => formatBookCode([...randomBytes(12)]));
  await getDb().insert(s.bookCodes).values(codes.map((c) => ({ bookId, codeHash: hash(c), codeEnc: encrypt(c), note: note.trim() || null, createdBy: actor.id })));
  await audit({ actor, action: "book.codes_generated", entityType: "book", entityId: bookId, summary: `${count} code(s)` }, ctx);
  return codes;
}

/** One code, one book, once: the update only succeeds while the code is still unused. */
export async function redeemBookCode(actor: Actor, bookId: string, input: string, ctx: ReqCtx) {
  await rateLimit("codeActivation", `book:${actor.id}`, ctx);
  if (await ownership(actor.id, bookId)) throw new AppError("CONFLICT", "You already own this book.");
  const [book] = await getDb().select({ id: s.books.id, title: s.books.title }).from(s.books).where(and(eq(s.books.id, bookId), eq(s.books.status, "PUBLISHED")));
  if (!book) throw new AppError("NOT_FOUND", "This book is not on sale.");
  const rows = await getDb().update(s.bookCodes).set({ status: "USED", usedBy: actor.id, usedAt: new Date() })
    .where(and(eq(s.bookCodes.codeHash, hash(input)), eq(s.bookCodes.bookId, bookId), eq(s.bookCodes.status, "UNUSED"))).returning({ id: s.bookCodes.id });
  if (!rows.length) {
    await securityEvent({ type: "UNAUTHORIZED_API", severity: "LOW", userId: actor.id, detail: { reason: "bad_book_code", bookId } }, ctx);
    throw new AppError("VALIDATION", "That code is not valid for this book, or it has already been used.");
  }
  await audit({ actor, action: "book.redeemed", entityType: "book", entityId: bookId, summary: book.title }, ctx);
}

export async function codesFor(actor: Actor, bookId: string) {
  superOnly(actor);
  const rows = await getDb().select({ id: s.bookCodes.id, enc: s.bookCodes.codeEnc, status: s.bookCodes.status, note: s.bookCodes.note, usedAt: s.bookCodes.usedAt, download: s.bookCodes.downloadAllowed, createdAt: s.bookCodes.createdAt, buyer: sql<string | null>`case when ${s.users.id} is null then null else ${s.users.firstName} || ' ' || ${s.users.lastName} end`, buyerEmail: s.users.email })
    .from(s.bookCodes).leftJoin(s.users, eq(s.users.id, s.bookCodes.usedBy)).where(eq(s.bookCodes.bookId, bookId)).orderBy(desc(s.bookCodes.createdAt)).limit(500);
  return rows.map(({ enc, ...r }) => ({ ...r, code: decrypt(enc) }));
}

export async function setDownloadAllowed(actor: Actor, codeId: string, allowed: boolean, ctx: ReqCtx) {
  superOnly(actor);
  await getDb().update(s.bookCodes).set({ downloadAllowed: allowed }).where(eq(s.bookCodes.id, codeId));
  await audit({ actor, action: allowed ? "book.download_allowed" : "book.download_blocked", entityType: "book_code", entityId: codeId }, ctx);
}

export async function revokeBookCode(actor: Actor, codeId: string, ctx: ReqCtx) {
  superOnly(actor);
  await getDb().update(s.bookCodes).set({ status: "REVOKED", downloadAllowed: false }).where(eq(s.bookCodes.id, codeId));
  await audit({ actor, action: "book.code_revoked", entityType: "book_code", entityId: codeId }, ctx);
}
