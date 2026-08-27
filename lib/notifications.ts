import { db } from "@/lib/db";
import { notificationPreferences, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueue } from "@/lib/queue";

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, params.userId))
    .limit(1);

  if (prefs && !prefs.inAppEnabled) return { skipped: true as const };
  if (params.type.startsWith("moderation") && prefs && !prefs.moderationUpdates) {
    return { skipped: true as const };
  }
  if (params.type === "path_reminder" && prefs && !prefs.pathReminders) {
    return { skipped: true as const };
  }
  if (params.type === "followed_creator" && prefs && !prefs.followedCreators) {
    return { skipped: true as const };
  }

  const [row] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      href: params.href,
      channel: "in_app",
    })
    .returning();

  try {
    await enqueue("notifications", "deliver", {
      notificationId: row?.id,
      userId: params.userId,
      type: params.type,
      dedupeKey: `notify:${params.userId}:${params.type}:${row?.id}`,
    });
  } catch {
    /* in-app row is already stored; delivery job is best-effort */
  }
  return { skipped: false as const, notification: row };
}
