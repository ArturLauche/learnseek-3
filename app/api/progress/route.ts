import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordProgress } from "@/lib/progress";
import { z } from "zod";

const schema = z.object({
  contentItemId: z.string().uuid().optional(),
  pathId: z.string().uuid().optional(),
  seconds: z.number().int().min(0).max(600).optional(),
  completed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await recordProgress({
    userId: session.user.id,
    contentItemId: parsed.data.contentItemId,
    pathId: parsed.data.pathId,
    seconds: parsed.data.seconds,
    completed: parsed.data.completed,
  });
  return NextResponse.json({ ok: true });
}
