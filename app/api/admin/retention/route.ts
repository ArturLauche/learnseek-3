import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generationJobs, retentionRuns } from "@/lib/db/schema";
import { recordAdminAction } from "@/lib/admin/audit";
import { runRetentionPurge } from "@/lib/privacy/purge";
import { enqueueTracked, retryFailedGenerationJob } from "@/lib/jobs";
import { retryFailedQueueJobs } from "@/lib/queue";

const schema = z.object({
  action: z.enum(["dry-run", "run", "retry"]),
  confirmed: z.literal(true),
  stepUpPassword: z.string().min(12).optional(),
});

export async function GET() {
  await requirePermission("admin:audit");
  const latest = await db.select().from(retentionRuns).orderBy(desc(retentionRuns.startedAt)).limit(10);
  return NextResponse.json({ runs: latest });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission("admin:audit");
  if (parsed.data.action === "run") {
    const { verifyStepUpPassword } = await import("@/lib/admin/step-up");
    const stepped = await verifyStepUpPassword(session.user.email, parsed.data.stepUpPassword);
    if (!stepped) return NextResponse.json({ error: "Password confirmation required" }, { status: 403 });
  }

  if (parsed.data.action === "dry-run") {
    const result = await runRetentionPurge({ dryRun: true, actorUserId: session.user.id });
    await recordAdminAction({
      actorUserId: session.user.id,
      action: "retention.dry_run",
      targetType: "retention_run",
      targetId: result.runId,
      payload: { counts: result.counts },
      confirmed: true,
    });
    return NextResponse.json(result);
  }

  if (parsed.data.action === "run") {
    const job = await enqueueTracked({
      queue: "retention",
      kind: "purge",
      data: { dryRun: false, actorUserId: session.user.id },
      userId: session.user.id,
      dedupeKey: `retention-run:${Date.now()}`,
    });
    await recordAdminAction({
      actorUserId: session.user.id,
      action: "retention.run",
      targetType: "generation_job",
      targetId: job.id,
      confirmed: true,
    });
    return NextResponse.json({ ok: true, queued: true, jobId: job.id });
  }

  const bull = await retryFailedQueueJobs("retention");
  const failed = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.queueName, "retention"), eq(generationJobs.status, "failed")));
  let dbRetried = 0;
  for (const job of failed) {
    const result = await retryFailedGenerationJob(job);
    if (result.ok) dbRetried += 1;
  }
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "retention.retry",
    targetType: "queue",
    targetId: "retention",
    payload: { bull, dbRetried },
    confirmed: true,
  });
  return NextResponse.json({ ok: true, bull, dbRetried });
}
