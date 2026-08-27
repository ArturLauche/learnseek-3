import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentItems,
  contentItemSources,
  feedImpressions,
  feedQueueItems,
  feedQueues,
  quizzes,
  quizQuestions,
  sources,
  topics,
  userTopicPreferences,
  preferences,
} from "@/lib/db/schema";
import { enqueue } from "@/lib/queue";
import { getRedis } from "@/lib/redis";
import { itemSignals } from "./signals";
import {
  applyDiversity,
  isEligible,
  publicRankingExplanation,
  replenishCount,
  reserveAntiEchoSlots,
  scoreCandidate,
  shouldReplenish,
  type CandidateItem,
  type PreferenceSnapshot,
} from "./ranking";

function anonymousPrefs(): PreferenceSnapshot {
  return {
    topicIds: [],
    hiddenTopicIds: [],
    avoidTopics: [],
    goals: [],
    knowledgeLevel: "new",
    depth: "standard",
    formats: [],
    languages: ["en"],
    sessionLengthSeconds: 120,
    tone: "warm",
    professionalInterests: [],
    explorationPercent: 20,
  };
}

async function loadPrefs(userId: string | null): Promise<PreferenceSnapshot> {
  if (!userId) return anonymousPrefs();
  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1);
  const topicRows = await db
    .select()
    .from(userTopicPreferences)
    .where(eq(userTopicPreferences.userId, userId));
  return {
    topicIds: topicRows.filter((row) => !row.isHidden).map((row) => row.topicId),
    hiddenTopicIds: topicRows.filter((row) => row.isHidden).map((row) => row.topicId),
    avoidTopics: pref?.avoidTopics ?? [],
    goals: pref?.goals ?? [],
    knowledgeLevel: pref?.knowledgeLevel ?? "new",
    depth: pref?.depth ?? "standard",
    formats: pref?.formats ?? [],
    languages: pref?.languages ?? ["en"],
    sessionLengthSeconds: pref?.sessionLengthSeconds ?? 120,
    tone: pref?.tone ?? "warm",
    professionalInterests: pref?.professionalInterests ?? [],
    explorationPercent: pref?.explorationPercent ?? 15,
  };
}

async function getOrCreateQueue(userId: string | null, anonymousKey: string | null) {
  if (userId) {
    const [existing] = await db.select().from(feedQueues).where(eq(feedQueues.userId, userId)).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(feedQueues).values({ userId }).returning();
    return created;
  }
  const key = anonymousKey ?? "anon";
  const [existing] = await db.select().from(feedQueues).where(eq(feedQueues.anonymousKey, key)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(feedQueues).values({ anonymousKey: key }).returning();
  return created;
}

export async function replenishFeedQueue(params: {
  userId: string | null;
  anonymousKey: string | null;
}) {
  const queue = await getOrCreateQueue(params.userId, params.anonymousKey);
  const pending = await db
    .select()
    .from(feedQueueItems)
    .where(and(eq(feedQueueItems.queueId, queue.id), isNull(feedQueueItems.servedAt)));
  const needed = replenishCount(pending.length);
  if (needed === 0) return { queueId: queue.id, added: 0, size: pending.length };

  const prefs = await loadPrefs(params.userId);
  const seenRows = params.userId
    ? await db
        .select({ contentItemId: feedImpressions.contentItemId })
        .from(feedImpressions)
        .where(eq(feedImpressions.userId, params.userId))
        .orderBy(desc(feedImpressions.createdAt))
        .limit(80)
    : [];
  const recentlySeenIds = new Set(seenRows.map((row) => row.contentItemId));
  pending.forEach((row) => recentlySeenIds.add(row.contentItemId));

  const rows = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.publicationState, "published"),
        eq(contentItems.visibility, "public"),
        isNull(contentItems.deletedAt),
      ),
    )
    .limit(200);

  const signals = await itemSignals(rows.map((row) => row.id));
  const eligible: { item: CandidateItem; total: number; factors: Record<string, number | string> }[] =
    [];
  for (const row of rows) {
    const item: CandidateItem = {
      id: row.id,
      topicId: row.primaryTopicId,
      format: row.format,
      language: row.language,
      difficulty: row.difficulty,
      depth: row.depth,
      durationSeconds: row.durationSeconds,
      origin: row.origin,
      sourceQuality: row.sourceQuality,
      safetyClass: row.safetyClass,
      creatorId: row.creatorId,
      publicationState: row.publicationState,
      visibility: row.visibility,
      moderationState: row.moderationState,
      deletedAt: row.deletedAt,
      publishedAt: row.publishedAt,
      title: row.title,
    };
    const eligibility = isEligible(item, prefs, { recentlySeenIds });
    if (!eligibility.ok) continue;
    const signal = signals.get(row.id) ?? { skipRate: 0, completionRate: 0, saveBoost: 0 };
    const breakdown = scoreCandidate(item, prefs, {
      skipRate: signal.skipRate,
      completionRate: signal.completionRate,
      saveBoost: signal.saveBoost,
      followBoost: 0,
    });
    eligible.push({
      item,
      total: breakdown.total,
      factors: {
        topic: breakdown.topic,
        level: breakdown.level,
        format: breakdown.format,
        quality: breakdown.quality,
        freshness: breakdown.freshness,
        exploration: breakdown.exploration,
        policy: eligibility.reason,
        explanation: publicRankingExplanation(breakdown)
          .map((row) => `${row.factor}: ${row.why} (${row.score.toFixed(2)})`)
          .join(" · "),
      },
    });
  }

  eligible.sort((a, b) => b.total - a.total);
  const diversified = applyDiversity(eligible.map((row) => row.item));
  const topicMap = new Map((await db.select().from(topics)).map((topic) => [topic.id, topic]));
  const adjacent: CandidateItem[] = [];
  const foundation: CandidateItem[] = [];
  const unexpected: CandidateItem[] = [];
  for (const row of eligible) {
    const topic = row.item.topicId ? topicMap.get(row.item.topicId) : undefined;
    if (topic?.parentId) foundation.push(row.item);
    if (topic && topic.adjacentTopicIds.length > 0) adjacent.push(row.item);
    if (row.total < 0.45) unexpected.push(row.item);
  }
  const mixed = reserveAntiEchoSlots(diversified, { adjacent, foundation, unexpected });
  const chosen = mixed.slice(0, needed);
  const factorLookup = new Map(eligible.map((row) => [row.item.id, row.factors]));

  let position = pending.reduce((max, row) => Math.max(max, row.position), -1);
  for (const item of chosen) {
    position += 1;
    await db
      .insert(feedQueueItems)
      .values({
        queueId: queue.id,
        contentItemId: item.id,
        position,
        rankingFactors: factorLookup.get(item.id) ?? {},
        policyDecisions: ["eligible", "diversity", "anti-echo"],
        modelVersion: "ranking-v1",
        preparedPayload: { ready: true },
      })
      .onConflictDoNothing();
  }

  return { queueId: queue.id, added: chosen.length, size: pending.length + chosen.length };
}

export async function serveFeed(params: { userId: string | null; anonymousKey: string | null }) {
  const cacheKey = `feed:session:${params.userId ?? params.anonymousKey ?? "anon"}`;
  const cached = await getRedis().get(cacheKey);
  const queue = await getOrCreateQueue(params.userId, params.anonymousKey);
  let pending = await db
    .select()
    .from(feedQueueItems)
    .where(and(eq(feedQueueItems.queueId, queue.id), isNull(feedQueueItems.servedAt)))
    .orderBy(feedQueueItems.position);

  if (shouldReplenish(pending.length)) {
    await replenishFeedQueue(params);
    pending = await db
      .select()
      .from(feedQueueItems)
      .where(and(eq(feedQueueItems.queueId, queue.id), isNull(feedQueueItems.servedAt)))
      .orderBy(feedQueueItems.position);
    if (pending.length < 10) {
      await enqueue("feed-replenish", "replenish", {
        userId: params.userId,
        anonymousKey: params.anonymousKey,
        dedupeKey: `replenish:${queue.id}`,
      });
    }
  }

  const itemIds = pending.map((row) => row.contentItemId);
  const items =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(contentItems)
          .where(inArray(contentItems.id, itemIds));
  const byId = new Map(items.map((item) => [item.id, item]));
  const sourceRows =
    itemIds.length === 0
      ? []
      : await db
          .select({
            contentItemId: contentItemSources.contentItemId,
            title: sources.title,
            url: sources.canonicalUrl,
            citation: contentItemSources.citation,
          })
          .from(contentItemSources)
          .innerJoin(sources, eq(contentItemSources.sourceId, sources.id))
          .where(inArray(contentItemSources.contentItemId, itemIds));
  const sourcesByItem = new Map<string, { title: string; url: string | null; citation: string | null }[]>();
  for (const row of sourceRows) {
    const list = sourcesByItem.get(row.contentItemId) ?? [];
    list.push({ title: row.title, url: row.url, citation: row.citation });
    sourcesByItem.set(row.contentItemId, list);
  }
  const quizRows =
    itemIds.length === 0
      ? []
      : await db.select().from(quizzes).where(inArray(quizzes.contentItemId, itemIds));
  const questionRows =
    quizRows.length === 0
      ? []
      : await db
          .select()
          .from(quizQuestions)
          .where(
            inArray(
              quizQuestions.quizId,
              quizRows.map((row) => row.id),
            ),
          );
  const quizByItem = new Map<
    string,
    { id: string; title: string; questions: { id: string; prompt: string; choices: string[] }[] }
  >();
  for (const quiz of quizRows) {
    if (!quiz.contentItemId) continue;
    quizByItem.set(quiz.contentItemId, {
      id: quiz.id,
      title: quiz.title,
      questions: questionRows
        .filter((q) => q.quizId === quiz.id)
        .map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices })),
    });
  }
  const payload = pending
    .map((row) => {
      const item = byId.get(row.contentItemId);
      if (!item) return null;
      return {
        queueItemId: row.id,
        rankingFactors: row.rankingFactors,
        item: {
          id: item.id,
          slug: item.slug,
          title: item.title,
          learningObjective: item.learningObjective,
          bodyText: item.bodyText,
          durationSeconds: item.durationSeconds,
          format: item.format,
          language: item.language,
          difficulty: item.difficulty,
          origin: item.origin,
          safetyClass: item.safetyClass,
          creatorId: item.creatorId,
          primaryTopicId: item.primaryTopicId,
          sources: sourcesByItem.get(item.id) ?? [],
          quiz: quizByItem.get(item.id) ?? null,
        },
      };
    })
    .filter(Boolean);

  await getRedis().set(cacheKey, JSON.stringify({ at: Date.now(), count: payload.length }), "EX", 30);
  return { items: payload, cached: Boolean(cached), queueId: queue.id };
}
