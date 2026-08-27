import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generationJobs } from "@/lib/db/schema";
import { replenishFeedQueue } from "@/lib/feed/service";
import { heuristicModeration } from "@/lib/ai/provider";
import { decideOutcome } from "@/lib/moderation/policy";
import { getEnv } from "@/lib/env";
import { processUpload } from "@/lib/uploads/process";
import { runGenerationJob } from "@/lib/ai/persist";
import { moderateSubmission } from "@/lib/moderation/pipeline";
import { compileArtifact } from "@/lib/sandbox/compile";
import { storeEmbedding } from "@/lib/ai/dedup";
import { logger } from "@/lib/logger";

export async function handleJob(queueName: string, jobName: string, data: Record<string, unknown>) {
  if (queueName === "feed-replenish") {
    return replenishFeedQueue({
      userId: typeof data.userId === "string" ? data.userId : null,
      anonymousKey: typeof data.anonymousKey === "string" ? data.anonymousKey : null,
    });
  }

  if (queueName === "generation") {
    return runGenerationJob({
      jobId: typeof data.generationJobId === "string" ? data.generationJobId : undefined,
      userId: typeof data.userId === "string" ? data.userId : null,
      topic: typeof data.topic === "string" ? data.topic : undefined,
      format: typeof data.format === "string" ? data.format : undefined,
      parentContentItemId: typeof data.contentItemId === "string" ? data.contentItemId : undefined,
      instruction: jobName,
    });
  }

  if (queueName === "moderation") {
    if (typeof data.contentItemId === "string" || typeof data.uploadId === "string") {
      return moderateSubmission({
        contentItemId: typeof data.contentItemId === "string" ? data.contentItemId : undefined,
        uploadId: typeof data.uploadId === "string" ? data.uploadId : undefined,
        text: typeof data.text === "string" ? data.text : "report",
        safetyClass: typeof data.safetyClass === "string" ? data.safetyClass : "general",
      });
    }
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

  if (queueName === "scan" || queueName === "media" || queueName === "transcription") {
    if (typeof data.uploadId === "string") return processUpload(data.uploadId);
    return { ok: false, reason: "missing_upload" };
  }

  if (queueName === "embedding") {
    if (typeof data.text === "string" && typeof data.contentItemId === "string") {
      await storeEmbedding(data.contentItemId, data.text);
      return { ok: true };
    }
    return { skipped: true, reason: "no_text" };
  }

  if (queueName === "compile") {
    if (typeof data.artifactId === "string") return compileArtifact(data.artifactId);
    return { ok: false, reason: "missing_artifact" };
  }

  if (queueName === "notifications") {
    return { delivered: "in_app", id: data.notificationId };
  }

  logger.info({ queueName, jobName }, "job received with no specialized handler");
  return { ok: true };
}

export async function markJob(
  generationJobId: string | undefined,
  status: "active" | "completed" | "failed",
  extra?: { result?: Record<string, unknown>; errorSafe?: string },
) {
  if (!generationJobId) return;
  await db
    .update(generationJobs)
    .set({
      status,
      result: extra?.result,
      errorSafe: extra?.errorSafe,
      completedAt: status === "completed" || status === "failed" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, generationJobId));
}
