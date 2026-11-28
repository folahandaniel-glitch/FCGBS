"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { redeemBookCode } from "@/server/services/books";

export async function redeemAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return action({ role: "any", access: false }, async (a, ctx) => {
    await redeemBookCode(a, String(form.get("bookId") ?? ""), String(form.get("code") ?? ""), ctx);
    revalidatePath("/books", "layout");
  }, "Code accepted. The book is now yours to read.");
}
