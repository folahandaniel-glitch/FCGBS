import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Executor } from "../db";
import { emailOutbox, notifications, users } from "../db/schema";

export type NotifyCategory = "ADMISSION" | "REGISTRATION" | "ASSIGNMENT" | "EXAMINATION" | "RESULT" | "ACADEMIC_WARNING" | "GRADUATION" | "CERTIFICATE" | "ANNOUNCEMENT" | "PRACTICUM" | "RESEARCH" | "SECURITY" | "ACCESS";

export async function notifyUser(n: { userId: string; category: NotifyCategory; title: string; body?: string; link?: string; email?: boolean }, db: Executor = getDb()) {
  await db.insert(notifications).values({ userId: n.userId, category: n.category, title: n.title, body: n.body, link: n.link });
  if (n.email) {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, n.userId));
    if (u) await queueEmail(u.email, n.title, `${n.body ?? ""}${n.link ? `\n\n${n.link}` : ""}`, n.userId, db);
  }
}

/** E-mails are queued; delivery happens only when a provider is configured. Without one they are HELD — never falsely "sent". */
export async function queueEmail(to: string, subject: string, text: string, userId?: string, db: Executor = getDb()) {
  const key = process.env.RESEND_API_KEY;
  const [row] = await db.insert(emailOutbox).values({ userId, toEmail: to, subject, bodyText: text, status: key ? "QUEUED" : "HELD" }).returning({ id: emailOutbox.id });
  if (!key) return row.id;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "FCGBS <no-reply@example.com>", to: [to], subject, text }),
    });
    await db.update(emailOutbox).set(res.ok ? { status: "SENT", sentAt: new Date() } : { status: "FAILED", error: `HTTP ${res.status}` }).where(eq(emailOutbox.id, row.id));
  } catch (e) {
    await db.update(emailOutbox).set({ status: "FAILED", error: (e as Error).message.slice(0, 200) }).where(eq(emailOutbox.id, row.id));
  }
  return row.id;
}

export async function unreadCount(userId: string) {
  const [r] = await getDb().select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function listNotifications(userId: string, limit = 50) {
  return getDb().select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markAllRead(userId: string) {
  await getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
