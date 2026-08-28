import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences, preferences } from "@/lib/db/schema";
import { z } from "zod";

const schema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  followedCreators: z.boolean().optional(),
  pathReminders: z.boolean().optional(),
  moderationUpdates: z.boolean().optional(),
  dailySuggestions: z.boolean().optional(),
  collectionActivity: z.boolean().optional(),
  frequency: z.enum(["off", "daily", "weekly"]).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  hideStreak: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { hideStreak, ...channel } = parsed.data;
  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...channel })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...channel, updatedAt: new Date() },
    });
  if (typeof hideStreak === "boolean") {
    await db
      .insert(preferences)
      .values({ userId: session.user.id, hideStreak })
      .onConflictDoUpdate({
        target: preferences.userId,
        set: { hideStreak, updatedAt: new Date() },
      });
  }
  return NextResponse.json({ ok: true });
}
