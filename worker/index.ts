import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { QUEUE_NAMES } from "@/lib/queue";
import { handleJob, markJob } from "./handlers";

for (const name of QUEUE_NAMES) {
  const worker = new Worker(
    name,
    async (job) => {
      logger.info({ queue: name, job: job.name, id: job.id }, "processing");
      const generationJobId =
        typeof job.data.generationJobId === "string" ? job.data.generationJobId : undefined;
      await markJob(generationJobId, "active");
      try {
        const result = await handleJob(name, job.name, job.data as Record<string, unknown>);
        await markJob(generationJobId, "completed", {
          result: (result ?? { ok: true }) as Record<string, unknown>,
        });
        return result;
      } catch (error) {
        await markJob(generationJobId, "failed", {
          errorSafe: error instanceof Error ? error.name : "error",
        });
        throw error;
      }
    },
    { connection: getRedis(), concurrency: name === "generation" ? 2 : name === "compile" ? 1 : 4 },
  );
  worker.on("failed", (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err: err.message }, "job failed");
  });
}

logger.info({ queues: QUEUE_NAMES }, "oriel worker started");
