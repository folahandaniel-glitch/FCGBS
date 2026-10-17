"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { importBatch, type ImportReport } from "@/server/services/attachments";

/** One step: every file chosen (template and/or loose files) is read, corrected and placed. Returns a report. */
export async function importAction(_: ActionResult<ImportReport> | null, form: FormData): Promise<ActionResult<ImportReport>> {
  return action({ role: "staff", perm: ["content.manage", "courses.manage"] }, async (a, ctx) => {
    const picked = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
    if (!picked.length) throw new AppError("VALIDATION", "Choose the template and/or the files to upload.");
    const report = await importBatch(a, await Promise.all(picked.map(async (f) => ({ name: f.name, bytes: Buffer.from(await f.arrayBuffer()) }))), ctx);
    revalidatePath("/", "layout");
    return report;
  });
}
