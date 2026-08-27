import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reactions } from "@/lib/db/schema";
import { z } from "zod";

const schema = z.object({
  contentItemId: z.string().uuid(),
  kind: z.enum(["useful", "insightful", "unclear", "inspiring"]),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await db
    .insert(reactions)
    .values({
      userId: session.user.id,
      contentItemId: parsed.data.contentItemId,
      kind: parsed.data.kind,
    })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
