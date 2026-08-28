import { db } from "@/lib/db";
import {
  contentItems,
  feedImpressions,
  feedInteractions,
  generationJobs,
  moderationCases,
  providerRequests,
  reports,
  saves,
  uploads,
  user,
} from "@/lib/db/schema";
import { count, eq, gte, sql } from "drizzle-orm";
import { getQueue, QUEUE_NAMES } from "@/lib/queue";
import { ffmpegAvailable } from "@/lib/media/ffmpeg";
import { emailConfigured } from "@/lib/notify/email";
import { pushConfigured } from "@/lib/notify/push";
import { otelConfigured } from "@/lib/otel";
import { checkProviderHealth } from "@/lib/ai/provider";

export async function loadAdminOverview() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [users] = await db.select({ n: count() }).from(user);
  const [activeUsers] = await db
    .select({ n: count() })
    .from(user)
    .where(gte(user.lastSeenAt, weekAgo));
  const [items] = await db.select({ n: count() }).from(contentItems);
  const [openReports] = await db.select({ n: count() }).from(reports).where(eq(reports.status, "open"));
  const [jobs] = await db.select({ n: count() }).from(generationJobs);
  const [failedJobs] = await db
    .select({ n: count() })
    .from(generationJobs)
    .where(eq(generationJobs.status, "failed"));
  const [cases] = await db.select({ n: count() }).from(moderationCases);
  const [openCases] = await db
    .select({ n: count() })
    .from(moderationCases)
    .where(eq(moderationCases.status, "open"));
  const [saveCount] = await db.select({ n: count() }).from(saves);
  const [uploadCount] = await db.select({ n: count() }).from(uploads);
  const [impressionCount] = await db.select({ n: count() }).from(feedImpressions);
  const [completed] = await db
    .select({ n: count() })
    .from(feedInteractions)
    .where(eq(feedInteractions.kind, "complete"));
  const [tokenRow] = await db
    .select({
      input: sql<number>`coalesce(sum(${providerRequests.inputTokens}), 0)`,
      output: sql<number>`coalesce(sum(${providerRequests.outputTokens}), 0)`,
      latency: sql<number>`coalesce(avg(${providerRequests.latencyMs}), 0)`,
    })
    .from(providerRequests);
  const queueCounts: Record<string, { waiting: number; active: number; failed: number }> = {};
  for (const name of QUEUE_NAMES) {
    try {
      const counts = await getQueue(name).getJobCounts("waiting", "active", "failed");
      queueCounts[name] = {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        failed: counts.failed ?? 0,
      };
    } catch {
      queueCounts[name] = { waiting: -1, active: -1, failed: -1 };
    }
  }
  const ai = await checkProviderHealth();
  return {
    users: users?.n ?? 0,
    activeUsers7d: activeUsers?.n ?? 0,
    items: items?.n ?? 0,
    openReports: openReports?.n ?? 0,
    jobs: jobs?.n ?? 0,
    failedJobs: failedJobs?.n ?? 0,
    cases: cases?.n ?? 0,
    openCases: openCases?.n ?? 0,
    saves: saveCount?.n ?? 0,
    uploads: uploadCount?.n ?? 0,
    impressions: impressionCount?.n ?? 0,
    completions: completed?.n ?? 0,
    completionRate:
      impressionCount?.n && impressionCount.n > 0
        ? Number(completed?.n ?? 0) / Number(impressionCount.n)
        : 0,
    tokens: Number(tokenRow?.input ?? 0) + Number(tokenRow?.output ?? 0),
    avgLatencyMs: Math.round(Number(tokenRow?.latency ?? 0)),
    queueCounts,
    ffmpeg: await ffmpegAvailable(),
    email: emailConfigured(),
    push: pushConfigured(),
    otel: otelConfigured(),
    ai,
  };
}
