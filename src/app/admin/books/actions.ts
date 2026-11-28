"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extOf } from "@/core/attachments";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { storeAsset } from "@/server/services/assets";
import { allBooks, bookById, generateBookCodes, manuscriptFromDocx, revokeBookCode, saveBook, setDownloadAllowed } from "@/server/services/books";

const guard = { role: "staff" as const, perm: "super.accounts" as const };
const refresh = () => { revalidatePath("/admin/books"); revalidatePath("/books", "layout"); };

export async function saveBookAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = String(form.get("id") ?? "") || null;
  let target = "";
  const res = await action(guard, async (a, ctx) => {
    const g = (k: string) => String(form.get(k) ?? "");
    const file = form.get("manuscriptFile");
    let manuscript = "";
    if (file && typeof file !== "string" && (file as File).size > 0) {
      const f = file as File;
      const bytes = Buffer.from(await f.arrayBuffer());
      const ext = extOf(f.name);
      if (ext === "docx") manuscript = await manuscriptFromDocx(bytes);
      else if (/\.(md|txt)$/i.test(f.name)) manuscript = bytes.toString("utf8");
      else throw new AppError("VALIDATION", "Upload the manuscript as a Word (.docx), .md or .txt file.");
    }
    let coverAssetId: string | undefined;
    const cover = form.get("cover");
    if (cover && typeof cover !== "string" && (cover as File).size > 0) coverAssetId = (await storeAsset(a, { name: (cover as File).name, bytes: Buffer.from(await (cover as File).arrayBuffer()) }, "SITE", ctx)).id;
    const saved = await saveBook(a, id, { title: g("title"), subtitle: g("subtitle"), author: g("author"), description: g("description"), price: g("price"), howToBuy: g("howToBuy"), manuscript, coverAssetId, published: form.get("published") === "on" }, ctx);
    refresh();
    target = `/admin/books/${saved}`;
  }, "Saved.");
  if (res.ok && target) redirect(target);
  return res;
}

export async function publishAllBooksAction() {
  return action(guard, async (a, ctx) => {
    let done = 0;
    const skipped: string[] = [];
    for (const card of (await allBooks()).filter((b) => b.status !== "PUBLISHED")) {
      const b = await bookById(card.id);
      if (!b?.manuscript.trim()) { skipped.push(card.title); continue; }
      await saveBook(a, b.id, { title: b.title, subtitle: b.subtitle ?? "", author: b.author, description: b.description ?? "", price: b.price ?? "", howToBuy: b.howToBuy ?? "", published: true }, ctx);
      done++;
    }
    refresh();
    return { done, skipped };
  }, "All books with a manuscript are now published.");
}

export async function generateCodesAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return action(guard, async (a, ctx) => {
    await generateBookCodes(a, String(form.get("bookId")), Number(form.get("count")), String(form.get("note") ?? ""), ctx);
    refresh();
  }, "Codes created. They are listed below.");
}
export async function downloadToggleAction(codeId: string, allowed: boolean) {
  return action(guard, async (a, ctx) => { await setDownloadAllowed(a, codeId, allowed, ctx); refresh(); }, allowed ? "Download switched on." : "Download switched off.");
}
export async function revokeCodeAction(codeId: string) {
  return action(guard, async (a, ctx) => { await revokeBookCode(a, codeId, ctx); refresh(); }, "Code revoked.");
}
