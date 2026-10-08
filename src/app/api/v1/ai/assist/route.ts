import { z } from "zod";
import { getDb } from "@/server/db";
import { aiRequests } from "@/server/db/schema";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { api, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSetting } from "@/server/settings";
import { can } from "@/core/permissions";

const body = z.object({ purpose: z.enum(["EXPLAIN", "STUDY_PLAN", "REVISION_QUESTIONS", "LESSON_OUTLINE", "SUMMARISE"]), text: z.string().trim().min(5).max(4000) });

const SYSTEM =
  "You are the FCGBS study assistant for a Christian Bible school. You may explain concepts, plan study, draft revision questions and organise lesson outlines. " +
  "Never invent citations, Scripture references or quotations; if unsure, say so. Never present yourself as an official theological authority — doctrine follows the school's published Statement of Faith. " +
  "Refuse to complete examinations, alter records, impersonate staff, or make decisions about admissions, grades, graduation, certificates or discipline.";

/** Optional AI assistant: off unless the feature flag is on AND ANTHROPIC_API_KEY is set. Output is a draft, never official; every request is logged. */
export const POST = api({ auth: "any" }, async ({ req, actor, ctx }) => {
  const flags = await getSetting("featureFlags");
  if (!flags.aiAssistant) throw new AppError("NOT_CONFIGURED", "The AI assistant is not enabled for this school.");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AppError("NOT_CONFIGURED", "The AI assistant is not configured.");
  if (actor!.userType === "APPLICANT") throw new AppError("FORBIDDEN", "The assistant is for students and staff.");
  if (actor!.userType === "STAFF" && !can(actor, "ai.use")) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await rateLimit("ai", actor!.id, ctx);
  const input = body.parse(await readJson(req));
  const model = process.env.AI_MODEL ?? "claude-sonnet-5-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 900, system: SYSTEM, messages: [{ role: "user", content: `${input.purpose}: ${input.text}` }] }) });
  await getDb().insert(aiRequests).values({ userId: actor!.id, purpose: input.purpose, prompt: input.text.slice(0, 4000), provider: "anthropic", model, status: res.ok ? "OK" : `HTTP_${res.status}` });
  if (!res.ok) throw new AppError("INTERNAL", "The assistant is unavailable right now.");
  const data = (await res.json()) as { content?: { text?: string }[] };
  await audit({ actor, action: "ai.assist", entityType: "ai", summary: input.purpose }, ctx);
  return { draft: data.content?.map((c) => c.text).join("\n") ?? "", notice: "AI-generated draft. Verify against Scripture and approved course materials. Not an official theological authority." };
});
