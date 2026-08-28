import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const schema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(4000),
  href: z.string().optional(),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:flags");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  const [row] = await db
    .insert(announcements)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      href: parsed.data.href,
      startsAt: new Date(),
    })
    .returning();
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "announcement.create",
    targetType: "announcement",
    targetId: row?.id,
    confirmed: true,
  });
  return NextResponse.json({ ok: true, id: row?.id });
}
