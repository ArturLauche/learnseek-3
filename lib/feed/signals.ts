import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedInteractions, follows } from "@/lib/db/schema";

export async function itemSignals(contentItemIds: string[]) {
  if (contentItemIds.length === 0) {
    return new Map<string, { skipRate: number; completionRate: number; saveBoost: number }>();
  }
  const rows = await db
    .select({
      contentItemId: feedInteractions.contentItemId,
      kind: feedInteractions.kind,
      n: sql<number>`count(*)::int`,
    })
    .from(feedInteractions)
    .where(inArray(feedInteractions.contentItemId, contentItemIds))
    .groupBy(feedInteractions.contentItemId, feedInteractions.kind);

  const byItem = new Map<string, { skipRate: number; completionRate: number; saveBoost: number }>();
  const counts = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const current = counts.get(row.contentItemId) ?? {};
    current[row.kind] = Number(row.n);
    counts.set(row.contentItemId, current);
  }
  for (const [id, kinds] of counts) {
    const views = (kinds.view ?? 0) + (kinds.impression ?? 0) + 1;
    byItem.set(id, {
      skipRate: (kinds.skip ?? 0) / views,
      completionRate: (kinds.complete ?? 0) / views,
      saveBoost: Math.min(0.3, (kinds.save ?? 0) * 0.05),
    });
  }
  return byItem;
}

export async function followBoostForUser(userId: string | null, creatorId: string | null) {
  if (!userId || !creatorId) return 0;
  const [row] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerUserId, userId), eq(follows.targetUserId, creatorId)))
    .limit(1);
  return row ? 0.25 : 0;
}
