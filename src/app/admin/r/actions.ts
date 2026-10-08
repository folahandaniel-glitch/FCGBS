"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { deleteResource, resourceFor, saveResource } from "@/server/admin-resources";
import { readFormFile } from "@/server/files";
import { storeAsset } from "@/server/services/assets";

export async function saveResourceAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const key = String(form.get("_key") ?? "");
  const id = String(form.get("_id") ?? "");
  const r = resourceFor(key);
  if (!r) return { ok: false, error: "Unknown record type." };
  let target = "";
  const res = await action({ role: "staff", perm: r.perm }, async (a, ctx) => {
    // Image fields: a newly chosen file replaces the stored picture id.
    for (const f of r.fields.filter((x) => x.type === "image")) {
      const file = form.get(`${f.name}__file`);
      if (file && typeof file !== "string" && (file as File).size > 0) {
        const fd = new FormData();
        fd.set("file", file as File);
        form.set(f.name, (await storeAsset(a, await readFormFile(fd), "SITE", ctx)).id);
      }
    }
    const savedId = await saveResource(a, r, id && id !== "new" ? id : null, form, ctx);
    target = `/admin/r/${key}/${savedId}`;
    revalidatePath("/", "layout");
  }, "Saved.");
  if (res.ok && target) redirect(`${target}?saved=1`);
  return res;
}

export async function deleteResourceAction(key: string, id: string) {
  const r = resourceFor(key);
  if (!r) throw new AppError("NOT_FOUND", "Unknown record type.");
  return action({ role: "staff", perm: r.perm }, async (a, ctx) => { await deleteResource(a, r, id, ctx); revalidatePath("/", "layout"); }, "Deleted.");
}
