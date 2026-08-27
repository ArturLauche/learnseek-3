import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedInteractions, userTopicPreferences, contentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
        .onConflictDoNothing();
    }
  }

  return NextResponse.json({ ok: true });
}
