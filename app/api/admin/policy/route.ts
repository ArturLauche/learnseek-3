import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { policyConfigs } from "@/lib/db/schema";
import { recordAdminAction } from "@/lib/admin/audit";
import { parseRetentionPolicy } from "@/lib/privacy/retention-policy";

const schema = z.object({
  slug: z.string().default("community-v1"),
  sessionsDays: z.number().min(0).max(3650),
  analyticsDays: z.number().min(1).max(3650),
  deletedAccountDays: z.number().min(0).max(3650),
  generationArtifactsDays: z.number().min(1).max(3650),
  searchesDays: z.number().min(1).max(3650),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:audit");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });

  const [existing] = await db.select().from(policyConfigs).where(eq(policyConfigs.slug, parsed.data.slug)).limit(1);
  const retention = {
    sessionsDays: parsed.data.sessionsDays,
    analyticsDays: parsed.data.analyticsDays,
    deletedAccountDays: parsed.data.deletedAccountDays,
    generationArtifactsDays: parsed.data.generationArtifactsDays,
    searchesDays: parsed.data.searchesDays,
  };
  const body = {
    ...(existing?.body ?? {}),
    retentionDays: parsed.data.analyticsDays,
    retention,
  };
  const normalized = parseRetentionPolicy(body);
  body.retention = normalized;

  if (existing) {
    await db
      .update(policyConfigs)
      .set({ body })
      .where(eq(policyConfigs.id, existing.id));
  } else {
    await db.insert(policyConfigs).values({
      slug: parsed.data.slug,
      version: "1",
      body,
    });
  }

  await recordAdminAction({
    actorUserId: session.user.id,
    action: "policy.retention.update",
    targetType: "policy_config",
    targetId: parsed.data.slug,
    payload: { retention: normalized },
    confirmed: true,
  });
  return NextResponse.json({ ok: true, retention: normalized });
}
