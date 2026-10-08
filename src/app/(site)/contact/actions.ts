"use server";

import { z } from "zod";
import { toPublicError } from "@/server/errors";
import { reqCtx, type ActionResult } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSetting } from "@/server/settings";
import { queueEmail } from "@/server/services/notifications";
import { audit } from "@/server/audit";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  subject: z.string().trim().min(3, "Enter a subject.").max(120),
  message: z.string().trim().min(10, "Please write a little more.").max(3000),
  website: z.string().max(0).optional(), // honeypot
});

export async function contactAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const ctx = await reqCtx();
    await rateLimit("contact", ctx.ip ?? "unknown", ctx);
    const d = schema.parse(Object.fromEntries(Array.from(form.keys()).map((k) => [k, form.get(k)?.toString() ?? ""])));
    const to = (await getSetting("institution")).email;
    await queueEmail(to, `[Website contact] ${d.subject}`, `From: ${d.name} <${d.email}>\n\n${d.message}`);
    await audit({ action: "contact.message", summary: d.subject }, ctx);
    return { ok: true, message: "Thank you — your message has been received." };
  } catch (e) {
    const p = toPublicError(e);
    return { ok: false, error: p.message, fields: p.fields };
  }
}
