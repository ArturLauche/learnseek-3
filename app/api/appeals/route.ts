import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appeals, auditEvents, moderationCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { notify } from "@/lib/notifications";

const schema = z.object({
  caseId: z.string().uuid(),
  statement: z.string().min(12).max(4000),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const [moderationCase] = await db
    .select()
    .from(moderationCases)
    .where(eq(moderationCases.id, parsed.data.caseId))
    .limit(1);
  if (!moderationCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const [appeal] = await db
    .insert(appeals)
    .values({
      caseId: parsed.data.caseId,
      userId: session.user.id,
      statement: parsed.data.statement,
    })
    .returning();
  await db.insert(auditEvents).values({
    actorUserId: session.user.id,
    actorType: "user",
    action: "appeal.opened",
    targetType: "moderation_case",
    targetId: parsed.data.caseId,
  });
  await notify({
    userId: session.user.id,
    type: "appeal",
    title: "Appeal received",
    body: "A human will review this case. You will see the outcome here — no streak language, just the decision.",
    href: "/notifications",
  });
  return NextResponse.json({ ok: true, appealId: appeal?.id });
}
