import { eq } from "drizzle-orm";
import { can } from "@/core/permissions";
import { AppError } from "@/server/errors";
import { api, getSession } from "@/server/http";
import { requireFeature } from "@/server/services/access";
import { getBrand } from "@/server/brand";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { rateLimit } from "@/server/rate-limit";
import { exportDoc, EXPORT_TYPES, type ExportDoc, type ExportFormat } from "@/server/services/export";
import { lessonForLearner } from "@/server/services/learner";
import { getTeachingBySlug, scriptureList } from "@/server/services/teachings";
import { getQuestion, LENSES } from "@/server/services/questions";

const FORMATS = Object.keys(EXPORT_TYPES) as ExportFormat[];
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "material";

/**
 * Study material as Word, PowerPoint, PDF or text, generated on demand.
 *   /api/v1/materials/teaching/<slug>?format=docx   (public teachings are open; student-only teachings need sign-in)
 *   /api/v1/materials/lesson/<lesson id>?format=pptx (registered learners and teaching staff only)
 */
export const GET = api<{ kind: string; id: string }>({ auth: "none" }, async ({ req, params, ctx }) => {
  const format = (req.nextUrl.searchParams.get("format") ?? "pdf") as ExportFormat;
  if (!FORMATS.includes(format)) throw new AppError("VALIDATION", "Unknown format.");
  await rateLimit("export", ctx.ip ?? "anon", ctx);
  const gated = await getSession();
  if (!gated || gated.mfaPending) throw new AppError("UNAUTHENTICATED", "Please sign in and enter your access code.");
  await requireFeature(gated.user.id, params.kind === "lesson" ? "COURSES" : params.kind === "question" ? "QUESTIONS" : "TEACHINGS", gated.user.userType);
  const brand = await getBrand();
  let doc: ExportDoc;
  if (params.kind === "teaching") {
    const t = await getTeachingBySlug(params.id);
    if (!t) throw new AppError("NOT_FOUND", "Not found.");
    if (t.audience !== "PUBLIC") { const sess = await getSession(); if (!sess || sess.mfaPending || sess.user.userType === "APPLICANT") throw new AppError("UNAUTHENTICATED", "Please sign in."); }
    doc = { title: t.title, subtitle: t.summary ?? undefined, kicker: t.trackTitle, scriptures: scriptureList(t.scriptures), body: t.body ?? "", school: brand.name, note: "Scripture quotations are from the King James Version (public domain) unless stated. Original teaching material of FCGBS." };
  } else if (params.kind === "question") {
    const q = await getQuestion(params.id);
    if (!q) throw new AppError("NOT_FOUND", "Not found.");
    const body = [q.summary ? `## The short answer\n${q.summary}` : "", ...LENSES.map((l) => { const v = (q[l.key as keyof typeof q] as string | null)?.trim(); return v ? `## ${l.label}\n${v}` : ""; })].filter(Boolean).join("\n\n");
    doc = { title: q.title, subtitle: q.summary ?? undefined, kicker: `Hard Questions · ${q.category}`, scriptures: scriptureList(q.scriptures), body, school: brand.name, note: "Scripture quotations are from the King James Version (public domain) unless stated. Original material of FCGBS." };
  } else if (params.kind === "lesson") {
    const sess = await getSession();
    if (!sess || sess.mfaPending) throw new AppError("UNAUTHENTICATED", "Please sign in.");
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw new AppError("NOT_FOUND", "Not found.");
    let lesson: typeof s.lessons.$inferSelect | undefined;
    const t = sess.user.userType;
    if (t === "STUDENT" || t === "ALUMNI") lesson = (await lessonForLearner(sess.user.id, params.id)).lesson;
    else if (can(sess.actor, "courses.manage") || can(sess.actor, "teaching.any") || can(sess.actor, "teaching.own")) [lesson] = await getDb().select().from(s.lessons).where(eq(s.lessons.id, params.id));
    if (!lesson) throw new AppError("NOT_FOUND", "Not found.");
    const [course] = await getDb().select({ code: s.courses.code, title: s.courses.title }).from(s.courses).where(eq(s.courses.id, lesson.courseId));
    doc = { title: lesson.title, subtitle: lesson.summary ?? undefined, kicker: course ? `${course.code} · ${course.title}` : undefined, body: lesson.body ?? "", school: brand.name, note: "Course material of FCGBS. Scripture quotations are from the King James Version (public domain) unless stated." };
  } else throw new AppError("NOT_FOUND", "Not found.");
  const buf = await exportDoc(doc, format);
  const type = EXPORT_TYPES[format];
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": type.mime, "Content-Disposition": `attachment; filename="${slugify(doc.title)}.${type.ext}"`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
});
