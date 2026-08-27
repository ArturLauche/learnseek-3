import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedInteractions, saves } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  contentItemId: z.string().uuid(),
  saved: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to save permanently" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const existing = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, session.user.id), eq(saves.contentItemId, parsed.data.contentItemId)))
    .limit(1);

  if (existing[0] && parsed.data.saved === false) {
    await db.delete(saves).where(eq(saves.id, existing[0].id));
    await db.insert(feedInteractions).values({
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
      kind: "unsave",
    });
    return NextResponse.json({ saved: false });
  }

  if (!existing[0]) {
    await db.insert(saves).values({
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
    });
    await db.insert(feedInteractions).values({
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
      kind: "save",
    });
  }
  return NextResponse.json({ saved: true });
}
