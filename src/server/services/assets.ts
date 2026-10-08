import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { assets } from "../db/schema";
import { audit, securityEvent, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";
import { sha256 } from "../crypto";
import { validateUpload, type FileKind } from "../files";
import { rateLimit } from "../rate-limit";
import { getSetting } from "../settings";

/** BRAND/SITE are public pictures; the rest are private and access-controlled. */
export type AssetKind = "BRAND" | "SITE" | "DOCUMENT" | "AVATAR" | "SUBMISSION" | "APPLICATION" | "LIBRARY";
const PUBLIC: AssetKind[] = ["BRAND", "SITE"];
const IMAGE: FileKind[] = ["png", "jpg", "webp", "gif"];
const DOCS: FileKind[] = ["pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "mp3", "png", "jpg", "webp"];

export async function storeAsset(actor: Actor, file: { name: string; bytes: Buffer }, kind: AssetKind, ctx: ReqCtx, opts: { alt?: string; scopeRef?: string } = {}) {
  await rateLimit("upload", actor.id, ctx);
  const cfg = await getSetting("uploads");
  const imageOnly = kind === "BRAND" || kind === "SITE" || kind === "AVATAR";
  const max = (imageOnly ? cfg.maxImageMb : cfg.maxFileMb) * 1_048_576;
  let v;
  try {
    v = await validateUpload(file, imageOnly ? IMAGE : DOCS, max);
  } catch (e) {
    if (e instanceof AppError && /unsafe|macro|script|not match/i.test(e.message)) await securityEvent({ type: "MALICIOUS_UPLOAD", severity: "HIGH", userId: actor.id, detail: { name: file.name, reason: e.message } }, ctx);
    throw e;
  }
  const [row] = await getDb()
    .insert(assets)
    .values({ kind, fileName: v.name, mimeType: v.mime, size: v.bytes.length, sha256: sha256(v.bytes), data: v.bytes, alt: opts.alt, isPublic: PUBLIC.includes(kind), ownerId: actor.id, scopeRef: opts.scopeRef, uploadedBy: actor.id })
    .returning({ id: assets.id, mimeType: assets.mimeType, fileName: assets.fileName });
  await audit({ actor, action: "asset.uploaded", entityType: "asset", entityId: row.id, summary: `${kind}: ${v.name}`, metadata: { size: v.bytes.length } }, ctx);
  return { ...row, url: `/api/v1/assets/${row.id}` };
}

export async function readAsset(id: string) {
  const [row] = await getDb().select().from(assets).where(eq(assets.id, id)).limit(1);
  return row ?? null;
}

export async function listAssets(kind?: AssetKind) {
  const q = getDb()
    .select({ id: assets.id, kind: assets.kind, fileName: assets.fileName, mimeType: assets.mimeType, size: assets.size, alt: assets.alt, createdAt: assets.createdAt })
    .from(assets);
  return (kind ? q.where(eq(assets.kind, kind)) : q).orderBy(desc(assets.createdAt)).limit(200);
}
