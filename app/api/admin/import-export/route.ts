import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { auditEvents, importExportJobs, policyConfigs } from "@/lib/db/schema";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { putObject } from "@/lib/storage";
import { desc } from "drizzle-orm";

const schema = z.object({
  kind: z.enum(["export_policy", "export_audit"]),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:audit");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });

  const payload =
    parsed.data.kind === "export_policy"
      ? await db.select().from(policyConfigs)
      : await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(500);
  const key = `admin-exports/${session.user.id}/${parsed.data.kind}-${Date.now()}.json`;
  await putObject({
    key,
    body: JSON.stringify(payload, null, 2),
    contentType: "application/json",
  });
  const [job] = await db
    .insert(importExportJobs)
    .values({
      kind: parsed.data.kind,
      status: "completed",
      objectKey: key,
      actorUserId: session.user.id,
      completedAt: new Date(),
    })
    .returning();
  await recordAdminAction({
    actorUserId: session.user.id,
    action: `ops.${parsed.data.kind}`,
    targetType: "import_export_job",
    targetId: job?.id,
    confirmed: true,
  });
  return NextResponse.json({ ok: true, objectKey: key });
}
