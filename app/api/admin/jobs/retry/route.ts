import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { generationJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { enqueue } from "@/lib/queue";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { QueueName } from "@/lib/queue";

const schema = z.object({
  jobId: z.string().uuid(),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:ai_ops");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, parsed.data.jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db
    .update(generationJobs)
    .set({ status: "queued", errorSafe: null, updatedAt: new Date() })
    .where(eq(generationJobs.id, job.id));
  await enqueue(job.queueName as QueueName, job.kind, {
    ...job.input,
    generationJobId: job.id,
    dedupeKey: `retry:${job.id}:${Date.now()}`,
  });
  await recordAdminAction({
    actorUserId: session.user.id,
    action: "job.retry",
    targetType: "generation_job",
    targetId: job.id,
    confirmed: true,
  });
  return NextResponse.json({ ok: true });
}
