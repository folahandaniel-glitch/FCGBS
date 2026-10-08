import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import * as s from "../db/schema";
import { getSession } from "../http";
import { AppError } from "../errors";

/** Finds the signed-in student's own published result for a course (the client never supplies a result id it does not own). */
export async function dbResultId(courseId: string) {
  const sess = await getSession();
  if (!sess) throw new AppError("UNAUTHENTICATED", "Please sign in.");
  const [r] = await getDb().select({ id: s.results.id }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.enrolments, eq(s.enrolments.id, s.courseRegistrations.enrolmentId)).innerJoin(s.students, eq(s.students.id, s.enrolments.studentId)).where(and(eq(s.courseRegistrations.courseId, courseId), eq(s.students.userId, sess.user.id), inArray(s.results.status, ["PUBLISHED", "LOCKED"])));
  if (!r) throw new AppError("NOT_FOUND", "Result not found.");
  return r.id;
}
