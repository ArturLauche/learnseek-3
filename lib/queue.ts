import { Queue, type JobsOptions } from "bullmq";
import { getRedis } from "./redis";

export const QUEUE_NAMES = [
  "generation",
  "media",
  "moderation",
  "transcription",
  "embedding",
  "notifications",
  "scan",
  "compile",
  "feed-replenish",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;
  const queue = new Queue(name, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86_400, count: 1000 },
      removeOnFail: { age: 7 * 86_400 },
    },
  });
  queues.set(name, queue);
  return queue;
}

export async function enqueue(
  name: QueueName,
  jobName: string,
  data: Record<string, unknown>,
  opts?: JobsOptions,
) {
  const raw = typeof data.dedupeKey === "string" ? data.dedupeKey : undefined;
  const jobId = raw ? raw.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 128) : undefined;
  return getQueue(name).add(jobName, data, {
    jobId,
    ...opts,
  });
}
