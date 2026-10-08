"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { action } from "@/server/http";
import { getDb } from "@/server/db";
import { bibleNotes } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { chapterCount, verseCount } from "@/server/services/bible";

const COLORS = ["yellow", "green", "blue", "pink", "orange"];

/** Saves, replaces or removes the signed-in user's own note / highlight / bookmark on a verse. */
export async function saveVerseMark(input: { book: number; chapter: number; verse: number; kind: "NOTE" | "HIGHLIGHT" | "BOOKMARK"; color?: string; body?: string; remove?: boolean }) {
  return action({ role: "any" }, async (a) => {
    const { book, chapter, verse } = input;
    if (!Number.isInteger(book) || book < 0 || book > 65 || chapter < 1 || chapter > chapterCount(book) || verse < 1 || verse > verseCount(book, chapter)) throw new AppError("VALIDATION", "That verse does not exist.");
    if (!["NOTE", "HIGHLIGHT", "BOOKMARK"].includes(input.kind)) throw new AppError("VALIDATION", "Unknown kind.");
    const db = getDb();
    const where = and(eq(bibleNotes.userId, a.id), eq(bibleNotes.book, book), eq(bibleNotes.chapter, chapter), eq(bibleNotes.verse, verse), eq(bibleNotes.kind, input.kind));
    if (input.remove) { await db.delete(bibleNotes).where(where); }
    else {
      const body = input.kind === "NOTE" ? (input.body ?? "").trim().slice(0, 4000) : null;
      if (input.kind === "NOTE" && !body) throw new AppError("VALIDATION", "Write something first.");
      const color = input.kind === "HIGHLIGHT" ? (COLORS.includes(input.color ?? "") ? input.color! : "yellow") : null;
      const [cur] = await db.select({ id: bibleNotes.id }).from(bibleNotes).where(where).limit(1);
      if (cur) await db.update(bibleNotes).set({ body, color, updatedAt: new Date() }).where(eq(bibleNotes.id, cur.id));
      else await db.insert(bibleNotes).values({ userId: a.id, book, chapter, verse, kind: input.kind, color, body });
    }
    revalidatePath("/bible/notes");
  }, "Saved.");
}
