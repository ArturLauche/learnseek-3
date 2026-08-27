import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationJobs } from "@/lib/db/schema";
import { enqueue, type QueueName } from "@/lib/queue";

export async function enqueueTracked(params: {
  queue: QueueName;
  kind: string;
  data: Record<string, unknown>;
  userId?: string | null;
  contentItemId?: string | null;
  dedupeKey?: string;
}) {
  const [job] = await db
    .insert(generationJobs)
    .values({
      userId: params.userId,
      contentItemId: params.contentItemId,
      queueName: params.queue,
      kind: params.kind,
      status: "queued",
      input: params.data,
    })
    .returning();
  if (!job) throw new Error("Failed to record job");
  const bull = await enqueue(
    params.queue,
    params.kind,
    {
      ...params.data,
      generationJobId: job.id,
      dedupeKey: params.dedupeKey ?? `${params.queue}:${params.kind}:${job.id}`,
    },
    { jobId: params.dedupeKey },
  );
  await db.update(generationJobs).set({ bullmqJobId: bull.id, updatedAt: new Date() }).where(eq(generationJobs.id, job.id));
  return job;
}
