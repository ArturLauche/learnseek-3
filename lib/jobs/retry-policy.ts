import { isQueueName } from "@/lib/queue";

export function canRetryJob(job: { status: string; queueName: string }): { ok: boolean; reason: string } {
  if (job.status !== "failed") return { ok: false, reason: "not_failed" };
  if (!isQueueName(job.queueName)) return { ok: false, reason: "unknown_queue" };
  return { ok: true, reason: "ok" };
}
