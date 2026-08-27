import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { recoControls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const schema = z.object({
  slug: z.string().default("default"),
  explorationPercent: z.number().min(0).max(50),
  qualityThreshold: z.number().min(0).max(1),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:reco");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  await db
    .update(recoControls)
    .set({
      explorationPercent: parsed.data.explorationPercent,
      qualityThreshold: parsed.data.qualityThreshold,
      updatedAt: new Date(),
    })
    .where(eq(recoControls.slug, parsed.data.slug));
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "reco.update",
    targetType: "reco_controls",
    targetId: parsed.data.slug,
    payload: {
      explorationPercent: parsed.data.explorationPercent,
      qualityThreshold: parsed.data.qualityThreshold,
    },
    confirmed: true,
  });
  return NextResponse.json({ ok: true });
}
