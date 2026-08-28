import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences, notifications, user } from "@/lib/db/schema";
import { sendEmail, emailConfigured } from "./email";
import { sendPush, pushConfigured } from "./push";

export function inQuietHours(start?: string | null, end?: string | null, now = new Date()) {
  if (!start || !end) return false;
  const toMin = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const a = toMin(start);
  const b = toMin(end);
  if (a === b) return false;
  if (a < b) return current >= a && current < b;
  return current >= a || current < b;
}

export async function deliverNotification(notificationId: string) {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  if (!row) return { ok: false, reason: "missing" };
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, row.userId))
    .limit(1);
  const [account] = await db.select().from(user).where(eq(user.id, row.userId)).limit(1);

  const result: Record<string, unknown> = { inApp: true };
  if (prefs && inQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
    return { ok: true, deferred: "quiet_hours", ...result };
  }

  if (prefs?.emailEnabled && account?.email) {
    result.email = emailConfigured()
      ? await sendEmail({ to: account.email, subject: row.title, text: row.body })
      : { skipped: true, reason: "smtp_unconfigured" };
  }
  if (prefs?.pushEnabled) {
    result.push = pushConfigured()
      ? await sendPush({ userId: row.userId, title: row.title, body: row.body, href: row.href ?? undefined })
      : { skipped: true, reason: "vapid_unconfigured" };
  }
  return { ok: true, ...result };
}

export function deliveryCapabilities() {
  return {
    email: emailConfigured(),
    push: pushConfigured(),
  };
}
