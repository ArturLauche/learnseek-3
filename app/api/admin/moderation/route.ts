import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { appeals, contentItems, moderationCases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notify } from "@/lib/notifications";

const schema = z.object({
  caseId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
  appealId: z.string().uuid().optional(),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:moderation");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });

  const [moderationCase] = await db
    .select()
    .from(moderationCases)
    .where(eq(moderationCases.id, parsed.data.caseId))
    .limit(1);
  if (!moderationCase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(moderationCases)
    .set({
      status: "resolved",
      recommendedAction: parsed.data.decision === "approve" ? "human_approve" : "human_reject",
      assignedToUserId: session.user.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(moderationCases.id, parsed.data.caseId));

  if (moderationCase.contentItemId) {
    await db
      .update(contentItems)
      .set({
        moderationState: parsed.data.decision === "approve" ? "approved" : "rejected",
        publicationState: parsed.data.decision === "approve" ? "published" : "rejected",
        publishedAt: parsed.data.decision === "approve" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, moderationCase.contentItemId));
  }

  if (parsed.data.appealId) {
    await db
      .update(appeals)
      .set({
        status: parsed.data.decision === "approve" ? "upheld" : "denied",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appeals.id, parsed.data.appealId));
  }

  await recordAdminAction({
    actorUserId: session.user.id,
    action: `moderation.${parsed.data.decision}`,
    targetType: "moderation_case",
    targetId: parsed.data.caseId,
    payload: { note: parsed.data.note },
    confirmed: true,
  });

  const owner = moderationCase.contentItemId
    ? (await db.select().from(contentItems).where(eq(contentItems.id, moderationCase.contentItemId)).limit(1))[0]
    : null;
  if (owner?.ownerUserId) {
    await notify({
      userId: owner.ownerUserId,
      type: "moderation",
      title: parsed.data.decision === "approve" ? "Submission approved" : "Submission not published",
      body:
        parsed.data.decision === "approve"
          ? "Your item is public with its sources attached."
          : "Review the community standards and you may appeal this decision.",
      href: "/library",
    });
  }

  return NextResponse.json({ ok: true });
}
