import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { follows } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  targetType: z.enum(["user", "creator", "topic"]),
  targetUserId: z.string().optional(),
  targetTopicId: z.string().uuid().optional(),
  unfollow: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  if (parsed.data.unfollow) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerUserId, session.user.id),
          parsed.data.targetUserId ? eq(follows.targetUserId, parsed.data.targetUserId) : eq(follows.followerUserId, session.user.id),
        ),
      );
    return NextResponse.json({ ok: true, following: false });
  }
  await db
    .insert(follows)
    .values({
      followerUserId: session.user.id,
      targetType: parsed.data.targetType,
      targetUserId: parsed.data.targetUserId,
      targetTopicId: parsed.data.targetTopicId,
    })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true, following: true });
}
