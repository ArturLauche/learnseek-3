import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const schema = z.object({
  slug: z.string(),
  enabled: z.boolean(),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:flags");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  await db
    .update(featureFlags)
    .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(featureFlags.slug, parsed.data.slug));
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "flag.toggle",
    targetType: "feature_flag",
    targetId: parsed.data.slug,
    payload: { enabled: parsed.data.enabled },
    confirmed: true,
  });
  return NextResponse.json({ ok: true });
}
