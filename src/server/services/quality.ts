import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { audit, type Actor, type ReqCtx } from "../audit";
import { AppError } from "../errors";

/** Course evaluation by a registered student (spec §82). One per student per offering; comments are shown to QA staff, not to the lecturer by name. */
export async function createEvaluation(actor: Actor, input: { offeringId: string; rating: number; comment?: string }, ctx: ReqCtx) {
  if (!(input.rating >= 1 && input.rating <= 5)) throw new AppError("VALIDATION", "Choose a rating from 1 to 5.");
  const db = getDb();
  const [reg] = await db.select({ id: s.courseRegistrations.id }).from(s.courseRegistrations).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.courseRegistrations.offeringId, input.offeringId), eq(s.students.userId, actor.id)));
  if (!reg) throw new AppError("FORBIDDEN", "You can only evaluate courses you are registered for.");
  const [dupe] = await db.select({ id: s.evaluations.id }).from(s.evaluations).where(and(eq(s.evaluations.offeringId, input.offeringId), eq(s.evaluations.userId, actor.id)));
  if (dupe) throw new AppError("CONFLICT", "You have already evaluated this course.");
  await db.insert(s.evaluations).values({ kind: "COURSE", offeringId: input.offeringId, userId: actor.id, rating: input.rating, comment: input.comment?.slice(0, 1500) });
  await audit({ actor, action: "qa.evaluation_submitted", entityType: "offering", entityId: input.offeringId }, ctx);
}

export async function courseEvaluationSummary() {
  return getDb().execute<{ code: string; title: string; n: number; avg: number }>(sql`
    select c.code, c.title, count(e.id)::int as n, round(avg(e.rating)::numeric, 2)::float as avg
    from evaluations e join offerings o on o.id = e.offering_id join courses c on c.id = o.course_id
    where e.kind = 'COURSE' group by c.code, c.title order by avg desc`).then((r) => r.rows);
}
