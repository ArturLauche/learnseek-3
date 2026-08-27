import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
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
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...parsed.data })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
