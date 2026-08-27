import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedInteractions, userTopicPreferences, contentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { enqueueTracked } from "@/lib/jobs";
import { recordProgress } from "@/lib/progress";
import { rateLimitRequest } from "@/lib/rate-limit";

const schema = z.object({
  contentItemId: z.string().uuid(),
  kind: z.enum([
    "impression",
    "view",
    "complete",
    "skip",
    "save",
    "unsave",
    "react",
    "share",
    "hide",
    "report",
    "explain_deeper",
    "simplify",
    "show_example",
    "follow_up",
    "open_source",
    "quiz_answer",
    "restart",
  ]),
  value: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const limited = await rateLimitRequest({
    userId: session?.user.id,
    anonymousKey: request.cookies.get("oriel_anon")?.value,
    ip: request.headers.get("x-forwarded-for"),
    scope: "interact",
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await db.insert(feedInteractions).values({
    userId: session?.user.id,
    anonymousKey: request.cookies.get("oriel_anon")?.value,
    contentItemId: parsed.data.contentItemId,
    kind: parsed.data.kind,
    value: parsed.data.value,
  });

  if (parsed.data.kind === "hide" && session?.user) {
    const [item] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, parsed.data.contentItemId))
      .limit(1);
    if (item?.primaryTopicId) {
      await db
        .insert(userTopicPreferences)
        .values({
          userId: session.user.id,
          topicId: item.primaryTopicId,
          isHidden: true,
          weight: 0,
        })
        .onConflictDoUpdate({
          target: [userTopicPreferences.userId, userTopicPreferences.topicId],
          set: { isHidden: true, weight: 0, updatedAt: new Date() },
        });
    }
  }

  if (
    session?.user &&
    (parsed.data.kind === "explain_deeper" ||
      parsed.data.kind === "simplify" ||
      parsed.data.kind === "show_example" ||
      parsed.data.kind === "follow_up")
  ) {
    await enqueueTracked({
      queue: "generation",
      kind: parsed.data.kind,
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
      data: { contentItemId: parsed.data.contentItemId, userId: session.user.id },
      dedupeKey: `gen:${parsed.data.kind}:${parsed.data.contentItemId}:${session.user.id}`,
    });
  }

  if (session?.user && parsed.data.kind === "complete") {
    await recordProgress({
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
      seconds: parsed.data.value ?? 60,
      completed: true,
    });
  }

  return NextResponse.json({ ok: true });
}
