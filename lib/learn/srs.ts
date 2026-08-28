import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { spacedRepetitionCards } from "@/lib/db/schema";

const MIN_EASE = 1.3;

export async function ensureSrsCard(userId: string, contentItemId: string) {
  const [existing] = await db
    .select()
    .from(spacedRepetitionCards)
    .where(and(eq(spacedRepetitionCards.userId, userId), eq(spacedRepetitionCards.contentItemId, contentItemId)))
    .limit(1);
  if (existing) return existing;
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [created] = await db
    .insert(spacedRepetitionCards)
    .values({
      userId,
      contentItemId,
      dueAt: due,
      intervalDays: 1,
      ease: 2.5,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db
    .select()
    .from(spacedRepetitionCards)
    .where(and(eq(spacedRepetitionCards.userId, userId), eq(spacedRepetitionCards.contentItemId, contentItemId)))
    .limit(1);
  return again ?? null;
}

/** SM-2-lite: quality 0–5. Completing a saved concept schedules the next review. */
export async function reviewSrsCard(params: { userId: string; contentItemId: string; quality: number }) {
  const quality = Math.max(0, Math.min(5, params.quality));
  const current = await ensureSrsCard(params.userId, params.contentItemId);
  if (!current) return null;

  let ease = current.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;
  const intervalDays = quality < 3 ? 1 : Math.max(1, Math.round(current.intervalDays * ease));
  const dueAt = new Date(Date.now() + intervalDays * 86_400_000);
  const [updated] = await db
    .update(spacedRepetitionCards)
    .set({ ease, intervalDays, dueAt, updatedAt: new Date() })
    .where(eq(spacedRepetitionCards.id, current.id))
    .returning();
  return updated;
}

export async function dueSrsCards(userId: string, limit = 20) {
  return db
    .select()
    .from(spacedRepetitionCards)
    .where(and(eq(spacedRepetitionCards.userId, userId), lte(spacedRepetitionCards.dueAt, new Date())))
    .limit(limit);
}
