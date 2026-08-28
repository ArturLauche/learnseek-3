import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { preferences, user, userTopicPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  topicIds: z.array(z.string().uuid()).max(20).default([]),
  knowledgeLevel: z.enum(["new", "familiar", "experienced", "expert"]).optional(),
  sessionLengthSeconds: z.coerce.number().optional(),
  goals: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const goals = parsed.data.goals
    ? Array.isArray(parsed.data.goals)
      ? parsed.data.goals
      : [parsed.data.goals]
    : [];
  await db
    .insert(preferences)
    .values({
      userId: session.user.id,
      knowledgeLevel: parsed.data.knowledgeLevel ?? "new",
      sessionLengthSeconds: parsed.data.sessionLengthSeconds ?? 90,
      goals,
    })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: {
        knowledgeLevel: parsed.data.knowledgeLevel ?? "new",
        sessionLengthSeconds: parsed.data.sessionLengthSeconds ?? 90,
        goals,
        updatedAt: new Date(),
      },
    });
  for (const topicId of parsed.data.topicIds) {
    await db
      .insert(userTopicPreferences)
      .values({ userId: session.user.id, topicId, weight: 1 })
      .onConflictDoNothing();
  }
  await db
    .update(user)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(user.id, session.user.id));
  return NextResponse.json({ ok: true });
}
