import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { notify } from "@/lib/notifications";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyStepUpPassword } from "@/lib/admin/step-up";

const schema = z.object({
  userId: z.string(),
  action: z.enum(["suspend", "warn", "restore"]),
  reason: z.string().max(500).optional(),
  confirmed: z.literal(true),
  stepUpPassword: z.string().min(12).optional(),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:users");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  if (parsed.data.action === "suspend") {
    const stepped = await verifyStepUpPassword(session.user.email, parsed.data.stepUpPassword);
    if (!stepped) return NextResponse.json({ error: "Password confirmation required" }, { status: 403 });
  }

  const status =
    parsed.data.action === "suspend"
      ? "suspended"
      : parsed.data.action === "warn"
        ? "warned"
        : "active";
  await db
    .update(user)
    .set({
      status,
      banReason: parsed.data.reason,
      bannedAt: parsed.data.action === "suspend" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, parsed.data.userId));
  await recordAdminAction({
    actorUserId: session.user.id,
    action: `user.${parsed.data.action}`,
    targetType: "user",
    targetId: parsed.data.userId,
    payload: { reason: parsed.data.reason },
    confirmed: true,
  });
  await notify({
    userId: parsed.data.userId,
    type: "moderation",
    title: parsed.data.action === "restore" ? "Account restored" : `Account ${parsed.data.action}`,
    body:
      parsed.data.action === "suspend"
        ? "An administrator suspended this account. You can appeal from notifications."
        : parsed.data.action === "warn"
          ? "An administrator added a warning. Review community standards when you have a moment."
          : "Your account is active again.",
    href: "/legal/community",
  });
  return NextResponse.json({ ok: true });
}
