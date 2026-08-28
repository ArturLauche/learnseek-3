import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { notificationTemplates } from "@/lib/db/schema";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const schema = z.object({
  slug: z.string().min(2).max(80),
  channel: z.enum(["in_app", "email", "push"]).default("in_app"),
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(2000),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:flags");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  await db
    .insert(notificationTemplates)
    .values({
      slug: parsed.data.slug,
      channel: parsed.data.channel,
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .onConflictDoUpdate({
      target: notificationTemplates.slug,
      set: {
        channel: parsed.data.channel,
        title: parsed.data.title,
        body: parsed.data.body,
        updatedAt: new Date(),
      },
    });
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "template.upsert",
    targetType: "notification_template",
    targetId: parsed.data.slug,
    confirmed: true,
  });
  return NextResponse.json({ ok: true });
}
