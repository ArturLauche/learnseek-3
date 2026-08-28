import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentItemSources,
  contentItems,
  contentItemTopics,
  contentVersions,
  generatedArtifacts,
  generationJobs,
  learningScenes,
  sources,
  topics,
} from "@/lib/db/schema";
import type { LearningItemDraft } from "./schemas";
import { moderateSubmission } from "@/lib/moderation/pipeline";
import { findSemanticDuplicate, storeEmbedding } from "./dedup";
import { slugify } from "@/lib/slug";
import { sha256 } from "@/lib/hash";
import { generateLearningItem } from "./provider";
import { resolveProviderCredentials } from "./credentials";
import { logger } from "@/lib/logger";
import { stripSensitive } from "@/lib/pii";
import { autoTagContent } from "@/lib/content/autotag";
import { preferStructuredScene } from "@/lib/sandbox/scene-policy";
import { enqueueTracked } from "@/lib/jobs";

export async function persistLearningDraft(params: {
  draft: LearningItemDraft;
  origin: "ai_generated" | "ai_assisted" | "community" | "editorial";
  ownerUserId?: string | null;
  uploadId?: string | null;
  jobId?: string;
  promptRedacted?: string | null;
  modelId?: string | null;
}) {
  const dup = await findSemanticDuplicate({
    title: params.draft.title,
    bodyText: params.draft.bodyText,
  });
  if (dup.duplicate) {
    logger.info({ existing: dup.contentItemId, method: dup.method }, "semantic duplicate skipped");
    return { skipped: true as const, reason: "duplicate", contentItemId: dup.contentItemId };
  }

  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.slug, params.draft.topicSlug))
    .limit(1);

  const slug = `${slugify(params.draft.title)}-${crypto.randomUUID().slice(0, 8)}`;
  const [item] = await db
    .insert(contentItems)
    .values({
      slug,
      title: params.draft.title,
      learningObjective: params.draft.learningObjective,
      bodyText: params.draft.bodyText,
      durationSeconds: params.draft.durationSeconds,
      format: params.draft.format,
      language: params.draft.language,
      difficulty: params.draft.difficulty,
      depth: params.draft.depth,
      tone: params.draft.tone,
      origin: params.origin,
      publicationState: "draft",
      moderationState: "pending",
      generationState: "prepared",
      visibility: "private",
      safetyClass: params.draft.safetyClass,
      ownerUserId: params.ownerUserId,
      uploadId: params.uploadId,
      primaryTopicId: topic?.id,
      isReusableFact: params.origin !== "community",
    })
    .returning();

  if (!item) throw new Error("Failed to insert content item");

  const snapshot = {
    title: item.title,
    learningObjective: item.learningObjective,
    bodyText: item.bodyText,
    format: item.format,
  };
  const [version] = await db
    .insert(contentVersions)
    .values({
      contentItemId: item.id,
      versionNumber: 1,
      title: item.title,
      learningObjective: item.learningObjective,
      snapshot,
      contentHash: sha256(JSON.stringify(snapshot)),
      createdByUserId: params.ownerUserId,
      immutable: false,
    })
    .returning();

  if (version) {
    await db.update(contentItems).set({ currentVersionId: version.id }).where(eq(contentItems.id, item.id));
  }

  for (const [position, scene] of params.draft.scenes.entries()) {
    const structured = preferStructuredScene(scene);
    const [inserted] = await db
      .insert(learningScenes)
      .values({
        contentItemId: item.id,
        versionId: version?.id,
        kind: structured.kind,
        position,
        schema: structured.schema,
        fallbackText: structured.fallbackText,
      })
      .returning();

    const originalCode =
      structured.kind === "jsx"
        ? String(structured.schema.jsx ?? structured.schema.code ?? structured.fallbackText)
        : structured.kind === "html"
          ? String(structured.schema.html ?? structured.fallbackText)
          : structured.fallbackText;

    const [artifact] = await db
      .insert(generatedArtifacts)
      .values({
        contentItemId: item.id,
        sceneId: inserted?.id,
        promptRedacted: params.promptRedacted ?? null,
        modelId: params.modelId ?? null,
        source: structured.kind,
        originalCode,
        compileState: "pending",
        validation: {
          sceneKind: structured.kind,
        },
      })
      .returning();
    if (artifact) {
      await enqueueTracked({
        queue: "compile",
        kind: "compile",
        data: { artifactId: artifact.id },
        userId: params.ownerUserId,
        contentItemId: item.id,
        dedupeKey: `compile:${artifact.id}`,
      }).catch((error) => logger.warn({ err: error, artifactId: artifact.id }, "compile enqueue failed"));
    }
  }

  if (topic) {
    await db
      .insert(contentItemTopics)
      .values({ contentItemId: item.id, topicId: topic.id, isPrimary: true })
      .onConflictDoNothing();
  }

  for (const source of params.draft.sources) {
    const [src] = await db
      .insert(sources)
      .values({
        title: source.title,
        canonicalUrl: source.url,
        sourceType: "url",
        license: "cited",
      })
      .returning();
    if (src) {
      await db.insert(contentItemSources).values({
        contentItemId: item.id,
        sourceId: src.id,
        citation: source.citation,
      });
    }
  }

  const moderation = await moderateSubmission({
    contentItemId: item.id,
    text: `${item.title}\n${item.learningObjective}\n${item.bodyText}`,
    safetyClass: item.safetyClass,
  });

  const canGoPublic =
    moderation.result.outcome === "auto_approve" &&
    (params.origin === "editorial" || params.origin === "ai_generated");

  if (canGoPublic) {
    await db
      .update(contentItems)
      .set({
        publicationState: "published",
        visibility: "public",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, item.id));
    await storeEmbedding(item.id, `${item.title}\n${item.learningObjective}\n${item.bodyText}`).catch(
      () => null,
    );
    await autoTagContent({ contentItemId: item.id, format: item.format }).catch(() => null);
  }

  if (params.jobId) {
    await db
      .update(generationJobs)
      .set({
        contentItemId: item.id,
        result: { slug, duplicate: false, moderation: moderation.result.outcome },
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, params.jobId));
  }

  return { skipped: false as const, item, moderation };
}

export async function runGenerationJob(input: {
  jobId?: string;
  userId?: string | null;
  topic?: string;
  format?: string;
  knowledgeLevel?: string;
  language?: string;
  avoid?: string[];
  parentContentItemId?: string;
  instruction?: string;
}) {
  const credentials = await resolveProviderCredentials(input.userId);
  if (!credentials) {
    return {
      skipped: true,
      reason: "unconfigured",
      detail:
        "No platform AI key and no BYOK credential for this user; serving prepared editorial content instead.",
    };
  }
  const topic = input.topic ?? "practical-life";
  const parent = input.parentContentItemId
    ? (
        await db.select().from(contentItems).where(eq(contentItems.id, input.parentContentItemId)).limit(1)
      )[0]
    : null;
  const draft = await generateLearningItem({
    topic: stripSensitive(parent ? `${topic}: follow-up on ${parent.title}` : topic),
    format: input.format,
    knowledgeLevel: input.knowledgeLevel,
    language: input.language ?? "en",
    avoid: input.avoid,
    credentials,
    jobId: input.jobId,
  });
  if (input.instruction === "simplify" && parent) {
    draft.depth = "skim";
    draft.difficulty = "new";
  }
  return persistLearningDraft({
    draft,
    origin: "ai_generated",
    ownerUserId: input.userId,
    jobId: input.jobId,
    promptRedacted: stripSensitive(`${topic} ${input.instruction ?? ""}`.slice(0, 2000)),
    modelId: credentials.model || undefined,
  });
}
