import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { generationJobs } from "@/lib/db/schema";
import { replenishFeedQueue } from "@/lib/feed/service";
import { QUEUE_NAMES } from "@/lib/queue";
import { heuristicModeration } from "@/lib/ai/provider";
import { decideOutcome } from "@/lib/moderation/policy";
import { getEnv } from "@/lib/env";

async function handleJob(queueName: string, jobName: string, data: Record<string, unknown>) {
  if (queueName === "feed-replenish") {
    await replenishFeedQueue({
      userId: typeof data.userId === "string" ? data.userId : null,
      anonymousKey: typeof data.anonymousKey === "string" ? data.anonymousKey : null,
    });
    return { ok: true };
  }

  if (queueName === "moderation") {
    const text = typeof data.text === "string" ? data.text : "";
    const result = heuristicModeration(text);
    const outcome = decideOutcome({
      maxConfidence: Math.max(0, ...result.categories.map((c) => c.confidence)),
      hasHighRisk: result.categories.some((c) =>
        ["malware", "exposed_credentials", "self_harm", "illegal_activity"].includes(c.category),
      ),
      safetyClass: typeof data.safetyClass === "string" ? data.safetyClass : "general",
      mode: getEnv().MODERATION_MODE,
    });
    return { ...result, outcome };
  }

  if (queueName === "scan") {
    const mode = getEnv().SCANNER_MODE;
    return {
      scanner: mode === "clamav" ? "clamav" : "stub",
      status: mode === "clamav" ? "pending" : "skipped_dev_stub",
    };
  }

  logger.info({ queueName, jobName }, "job received");
  return { ok: true };
}

for (const name of QUEUE_NAMES) {
  const worker = new Worker(
    name,
    async (job) => {
      logger.info({ queue: name, job: job.name, id: job.id }, "processing");
      if (typeof job.data.generationJobId === "string") {
        await db
          .update(generationJobs)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(generationJobs.id, job.data.generationJobId));
      }
      try {
        const result = await handleJob(name, job.name, job.data as Record<string, unknown>);
        if (typeof job.data.generationJobId === "string") {
          await db
            .update(generationJobs)
            .set({ status: "completed", result, completedAt: new Date(), updatedAt: new Date() })
            .where(eq(generationJobs.id, job.data.generationJobId));
        }
        return result;
      } catch (error) {
        if (typeof job.data.generationJobId === "string") {
          await db
            .update(generationJobs)
            .set({
              status: "failed",
              errorSafe: error instanceof Error ? error.name : "error",
              updatedAt: new Date(),
            })
            .where(eq(generationJobs.id, job.data.generationJobId));
        }
        throw error;
      }
    },
    { connection: getRedis(), concurrency: name === "generation" ? 2 : 4 },
  );
  worker.on("failed", (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err: err.message }, "job failed");
  });
}

logger.info({ queues: QUEUE_NAMES }, "oriel worker started");
