import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { CONTENT_DEFAULTS, type ContentKey } from "@/content/defaults";
import { getDb } from "../db";
import { contentBlocks, contentVersions } from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Deep-merge stored content over defaults so new fields always have values. */
function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    if (over && typeof over === "object" && !Array.isArray(over)) for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = k in out ? merge(out[k], v) : v;
    return out as T;
  }
  return (over === undefined || over === null ? base : typeof over === typeof base ? over : base) as T;
}

export type ContentOf<K extends ContentKey> = (typeof CONTENT_DEFAULTS)[K];

export const getContent = cache(async <K extends ContentKey>(key: K): Promise<ContentOf<K>> => {
  const [row] = await getDb().select({ value: contentBlocks.value }).from(contentBlocks).where(eq(contentBlocks.key, key)).limit(1);
  return merge(CONTENT_DEFAULTS[key], row?.value) as ContentOf<K>;
});

/** Content is rendered as text, never HTML; limits keep a pasted essay from breaking the layout. */
function validate(value: unknown, depth = 0): void {
  if (depth > 6) throw new AppError("VALIDATION", "Content is nested too deeply.");
  if (typeof value === "string") {
    if (value.length > 20_000) throw new AppError("VALIDATION", "A text field is too long.");
    if (/^\s*(javascript|data):/i.test(value)) throw new AppError("VALIDATION", "Script links are not allowed.");
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new AppError("VALIDATION", "Too many items.");
    value.forEach((v) => validate(v, depth + 1));
  } else if (value && typeof value === "object") Object.values(value).forEach((v) => validate(v, depth + 1));
}

export async function putContent(actor: Actor, key: ContentKey, value: Json, ctx: ReqCtx) {
  if (!(key in CONTENT_DEFAULTS)) throw new AppError("VALIDATION", "Unknown content block.");
  validate(value);
  return getDb().transaction(async (tx) => {
    const [cur] = await tx.select().from(contentBlocks).where(eq(contentBlocks.key, key)).for("update");
    let block;
    if (cur) [block] = await tx.update(contentBlocks).set({ value, version: cur.version + 1, updatedBy: actor.id, updatedAt: new Date() }).where(eq(contentBlocks.id, cur.id)).returning();
    else [block] = await tx.insert(contentBlocks).values({ key, value, updatedBy: actor.id }).returning();
    await tx.insert(contentVersions).values({ blockId: block.id, version: block.version, value, updatedBy: actor.id });
    await audit({ actor, action: "content.updated", entityType: "content", entityId: key, summary: `${key} v${block.version}` }, ctx, tx);
    return block;
  });
}

export async function contentHistory(key: ContentKey) {
  const [b] = await getDb().select({ id: contentBlocks.id }).from(contentBlocks).where(eq(contentBlocks.key, key));
  if (!b) return [];
  return getDb().select().from(contentVersions).where(eq(contentVersions.blockId, b.id)).orderBy(desc(contentVersions.version)).limit(30);
}

export async function restoreContentVersion(actor: Actor, key: ContentKey, version: number, ctx: ReqCtx) {
  const v = (await contentHistory(key)).find((h) => h.version === version);
  if (!v) throw new AppError("NOT_FOUND", "Version not found.");
  return putContent(actor, key, v.value as Json, ctx);
}

export async function resetContent(actor: Actor, key: ContentKey, ctx: ReqCtx) {
  return putContent(actor, key, CONTENT_DEFAULTS[key] as unknown as Json, ctx);
}
