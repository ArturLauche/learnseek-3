import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appeals,
  contentItems,
  feedImpressions,
  feedInteractions,
  generatedArtifacts,
  generationJobs,
  moderationCases,
  notifications,
  policyConfigs,
  reports,
  retentionRuns,
  searches,
  session,
  takedownRequests,
  user,
  verification,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { deleteObject } from "@/lib/storage";
import {
  canPurgeDeletedAccount,
  canPurgeGenerationArtifact,
  isExpiredSession,
  isOlderThan,
  HOLD_APPEAL_STATUSES,
  HOLD_CASE_STATUSES,
  HOLD_REPORT_STATUSES,
  HOLD_TAKEDOWN_STATUSES,
  parseRetentionPolicy,
  type RetentionPolicy,
} from "./retention-policy";

export type RetentionCounts = {
  sessions: number;
  verifications: number;
  searches: number;
  impressions: number;
  interactions: number;
  artifacts: number;
  deletedAccountRemnants: number;
  skippedHeld: number;
};

const EMPTY_COUNTS: RetentionCounts = {
  sessions: 0,
  verifications: 0,
  searches: 0,
  impressions: 0,
  interactions: 0,
  artifacts: 0,
  deletedAccountRemnants: 0,
  skippedHeld: 0,
};

export async function loadRetentionPolicy(): Promise<RetentionPolicy> {
  const [row] = await db.select().from(policyConfigs).where(eq(policyConfigs.slug, "community-v1")).limit(1);
  return parseRetentionPolicy(row?.body ?? {});
}

async function loadHolds(): Promise<{ contentIds: Set<string>; userIds: Set<string> }> {
  const openCases = await db
    .select({ contentItemId: moderationCases.contentItemId, id: moderationCases.id })
    .from(moderationCases)
    .where(inArray(moderationCases.status, [...HOLD_CASE_STATUSES]));
  const openAppeals = await db
    .select({
      userId: appeals.userId,
      caseId: appeals.caseId,
    })
    .from(appeals)
    .where(inArray(appeals.status, [...HOLD_APPEAL_STATUSES]));
  const openReports = await db
    .select({ contentItemId: reports.contentItemId })
    .from(reports)
    .where(inArray(reports.status, [...HOLD_REPORT_STATUSES]));
  const openTakedowns = await db
    .select({ contentItemId: takedownRequests.contentItemId })
    .from(takedownRequests)
    .where(inArray(takedownRequests.status, [...HOLD_TAKEDOWN_STATUSES]));

  const contentIds = new Set<string>();
  const userIds = new Set<string>();
  for (const row of openCases) if (row.contentItemId) contentIds.add(row.contentItemId);
  for (const row of openReports) if (row.contentItemId) contentIds.add(row.contentItemId);
  for (const row of openTakedowns) if (row.contentItemId) contentIds.add(row.contentItemId);
  for (const row of openAppeals) userIds.add(row.userId);
  const appealCaseIds = [...new Set(openAppeals.map((row) => row.caseId))];
  if (appealCaseIds.length) {
    const linked = await db
      .select({ contentItemId: moderationCases.contentItemId })
      .from(moderationCases)
      .where(inArray(moderationCases.id, appealCaseIds));
    for (const row of linked) if (row.contentItemId) contentIds.add(row.contentItemId);
  }
  return { contentIds, userIds };
}

export async function runRetentionPurge(params: { dryRun: boolean; actorUserId?: string | null }) {
  const started = new Date();
  const policy = await loadRetentionPolicy();
  const holds = await loadHolds();
  const counts: RetentionCounts = { ...EMPTY_COUNTS };
  const now = new Date();

  const [run] = await db
    .insert(retentionRuns)
    .values({
      dryRun: params.dryRun,
      status: "running",
      startedAt: started,
      actorUserId: params.actorUserId,
      counts: {},
      policySnapshot: policy,
    })
    .returning();

  try {
    const sessions = await db.select().from(session);
    const expiredSessions = sessions.filter((row) => isExpiredSession(row.expiresAt, now, policy.sessionsDays));
    counts.sessions = expiredSessions.length;
    if (!params.dryRun && expiredSessions.length) {
      await db.delete(session).where(
        inArray(
          session.id,
          expiredSessions.map((row) => row.id),
        ),
      );
    }

    const verifications = await db.select().from(verification);
    const expiredVerifications = verifications.filter((row) => row.expiresAt.getTime() <= now.getTime());
    counts.verifications = expiredVerifications.length;
    if (!params.dryRun && expiredVerifications.length) {
      await db.delete(verification).where(
        inArray(
          verification.id,
          expiredVerifications.map((row) => row.id),
        ),
      );
    }

    const searchRows = await db.select().from(searches).orderBy(searches.createdAt).limit(5000);
    const expiredSearches = searchRows.filter((row) => {
      if (isHeldIdSafe(row.userId, holds.userIds)) {
        counts.skippedHeld += 1;
        return false;
      }
      return isOlderThan(row.createdAt, policy.searchesDays, now);
    });
    counts.searches = expiredSearches.length;
    if (!params.dryRun && expiredSearches.length) {
      await db.delete(searches).where(
        inArray(
          searches.id,
          expiredSearches.map((row) => row.id),
        ),
      );
    }

    const impressionRows = await db.select().from(feedImpressions).orderBy(feedImpressions.createdAt).limit(5000);
    const expiredImpressions = impressionRows.filter((row) => {
      if (row.contentItemId && holds.contentIds.has(row.contentItemId)) {
        counts.skippedHeld += 1;
        return false;
      }
      if (row.userId && holds.userIds.has(row.userId)) {
        counts.skippedHeld += 1;
        return false;
      }
      return isOlderThan(row.createdAt, policy.analyticsDays, now);
    });
    counts.impressions = expiredImpressions.length;
    if (!params.dryRun && expiredImpressions.length) {
      await db.delete(feedImpressions).where(
        inArray(
          feedImpressions.id,
          expiredImpressions.map((row) => row.id),
        ),
      );
    }

    const interactionRows = await db.select().from(feedInteractions).orderBy(feedInteractions.createdAt).limit(5000);
    const expiredInteractions = interactionRows.filter((row) => {
      if (row.contentItemId && holds.contentIds.has(row.contentItemId)) {
        counts.skippedHeld += 1;
        return false;
      }
      if (row.userId && holds.userIds.has(row.userId)) {
        counts.skippedHeld += 1;
        return false;
      }
      return isOlderThan(row.createdAt, policy.analyticsDays, now);
    });
    counts.interactions = expiredInteractions.length;
    if (!params.dryRun && expiredInteractions.length) {
      await db.delete(feedInteractions).where(
        inArray(
          feedInteractions.id,
          expiredInteractions.map((row) => row.id),
        ),
      );
    }

    const artifactRows = await db
      .select({
        id: generatedArtifacts.id,
        createdAt: generatedArtifacts.createdAt,
        compileState: generatedArtifacts.compileState,
        contentItemId: generatedArtifacts.contentItemId,
        compiledObjectKey: generatedArtifacts.compiledObjectKey,
        publicationState: contentItems.publicationState,
      })
      .from(generatedArtifacts)
      .innerJoin(contentItems, eq(generatedArtifacts.contentItemId, contentItems.id))
      .limit(2000);
    const purgeArtifacts = artifactRows.filter((row) =>
      canPurgeGenerationArtifact({
        createdAt: row.createdAt,
        now,
        generationArtifactsDays: policy.generationArtifactsDays,
        compileState: row.compileState,
        contentHeld: holds.contentIds.has(row.contentItemId),
        published: row.publicationState === "published",
      }),
    );
    counts.skippedHeld += artifactRows.filter((row) => holds.contentIds.has(row.contentItemId)).length;
    counts.artifacts = purgeArtifacts.length;
    if (!params.dryRun) {
      for (const row of purgeArtifacts) {
        if (row.compiledObjectKey) await deleteObject(row.compiledObjectKey).catch(() => null);
        await db.delete(generatedArtifacts).where(eq(generatedArtifacts.id, row.id));
      }
    }

    const deletedUsers = await db.select().from(user).where(eq(user.status, "deleted"));
    for (const account of deletedUsers) {
      const eligible = canPurgeDeletedAccount({
        status: account.status,
        deletedAt: account.deletedAt,
        now,
        deletedAccountDays: policy.deletedAccountDays,
        hasOpenAppeal: holds.userIds.has(account.id),
      });
      if (!eligible) {
        if (holds.userIds.has(account.id)) counts.skippedHeld += 1;
        continue;
      }
      const leftoverNotes = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.userId, account.id));
      const leftoverJobs = await db
        .select({ id: generationJobs.id })
        .from(generationJobs)
        .where(eq(generationJobs.userId, account.id));
      counts.deletedAccountRemnants += leftoverNotes.length + leftoverJobs.length;
      if (!params.dryRun) {
        if (leftoverNotes.length) {
          await db.delete(notifications).where(eq(notifications.userId, account.id));
        }
        if (leftoverJobs.length) {
          await db
            .update(generationJobs)
            .set({ input: {}, errorSafe: "purged", updatedAt: new Date() })
            .where(
              inArray(
                generationJobs.id,
                leftoverJobs.map((row) => row.id),
              ),
            );
        }
      }
    }

    await db
      .update(retentionRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        counts,
      })
      .where(eq(retentionRuns.id, run!.id));

    logger.info({ dryRun: params.dryRun, counts }, "retention purge finished");
    return { ok: true as const, dryRun: params.dryRun, counts, runId: run?.id, policy };
  } catch (error) {
    await db
      .update(retentionRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorSafe: error instanceof Error ? error.name : "error",
        counts,
      })
      .where(eq(retentionRuns.id, run!.id));
    throw error;
  }
}

function isHeldIdSafe(id: string | null | undefined, held: Set<string>) {
  return Boolean(id && held.has(id));
}
