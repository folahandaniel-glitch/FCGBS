"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bestMatch } from "@/core/attachments";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { audit } from "@/server/audit";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { addAttachment, listTargets, placeColumns, removeAttachment } from "@/server/services/attachments";

const PERM = ["content.manage", "courses.manage"] as const;

export async function addAttachmentAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return action({ role: "staff", perm: [...PERM] }, async (a, ctx) => {
    const f = form.get("file");
    const file = f && typeof f !== "string" && (f as File).size > 0 ? { name: (f as File).name, bytes: Buffer.from(await (f as File).arrayBuffer()) } : null;
    const place = String(form.get("place") ?? "") || null;
    await addAttachment(a, { placeKey: place, title: String(form.get("title") ?? ""), kind: String(form.get("kind") ?? ""), description: String(form.get("description") ?? ""), url: String(form.get("url") ?? ""), file, audience: String(form.get("audience") ?? ""), sort: Number(form.get("sort") ?? 0) || 0 }, ctx);
    revalidatePath("/", "layout");
  }, "Added.");
}

export async function removeAttachmentAction(id: string) {
  return action({ role: "staff", perm: [...PERM] }, async (a, ctx) => { await removeAttachment(a, id, ctx); revalidatePath("/", "layout"); }, "Removed.");
}

/** A draft that could not be placed automatically: type where it belongs, and it is matched (typos forgiven) and published there. */
export async function placeDraftAction(id: string, query: string): Promise<ActionResult<{ placedAt: string }>> {
  return action({ role: "staff", perm: [...PERM] }, async (a, ctx) => {
    const m = bestMatch(query, await listTargets());
    if (!m) throw new AppError("VALIDATION", `Nothing on the site matches "${query}". Try the course code, the teaching title or the question title.`);
    await getDb().update(s.materials).set({ ...placeColumns(m.target.key), status: "PUBLISHED" }).where(eq(s.materials.id, id));
    await audit({ actor: a, action: "material.placed", entityType: "material", entityId: id, summary: `→ ${m.target.type}: ${m.target.title}` }, ctx);
    revalidatePath("/", "layout");
    return { placedAt: `${m.target.type}: ${m.target.title}` };
  }, "Placed and published.");
}
