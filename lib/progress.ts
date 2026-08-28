import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { progressRecords, progressSummaries } from "@/lib/db/schema";

export async function recordProgress(params: {
  userId: string;
  contentItemId?: string;
  pathId?: string;
  seconds?: number;
  completed?: boolean;
}) {
  const [existing] = await db
    .insert(progressRecords)
    .values({
      userId: params.userId,
      contentItemId: params.contentItemId,
      pathId: params.pathId,
      status: params.completed ? "completed" : "started",
      seconds: params.seconds ?? 0,
      completedAt: params.completed ? new Date() : null,
    })
    .returning();

  const [summary] = await db
    .select()
    .from(progressSummaries)
    .where(eq(progressSummaries.userId, params.userId))
    .limit(1);

  const extraMinutes = Math.round((params.seconds ?? 0) / 60);
  const extraItems = params.completed ? 1 : 0;
  if (!summary) {
    await db.insert(progressSummaries).values({
      userId: params.userId,
      minutesLearned: extraMinutes,
      itemsCompleted: extraItems,
      lastActiveDate: new Date().toISOString().slice(0, 10),
    });
  } else {
    await db
      .update(progressSummaries)
      .set({
        minutesLearned: summary.minutesLearned + extraMinutes,
        itemsCompleted: summary.itemsCompleted + extraItems,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(progressSummaries.id, summary.id));
  }
  return existing;
}
