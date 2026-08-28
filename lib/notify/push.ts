import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export function pushConfigured() {
  const env = getEnv();
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export async function sendPush(params: { userId: string; title: string; body: string; href?: string }) {
  const env = getEnv();
  if (!pushConfigured()) return { skipped: true as const, reason: "vapid_unconfigured", sent: 0 };
  webpush.setVapidDetails(env.SMTP_FROM || "mailto:noreply@localhost", env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, params.userId));
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ title: params.title, body: params.body, href: params.href }),
      );
      sent += 1;
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error.name : "push" }, "web push failed");
      if (error && typeof error === "object" && "statusCode" in error && (error as { statusCode: number }).statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
      }
    }
  }
  return { skipped: false as const, sent };
}
