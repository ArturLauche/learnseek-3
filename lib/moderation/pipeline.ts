import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvents,
  contentItems,
  moderationCases,
  moderationFindings,
} from "@/lib/db/schema";
import { moderateText } from "@/lib/ai/provider";
import { decideOutcome } from "./policy";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const HIGH_RISK = new Set([
  "malware",
  "exposed_credentials",
  "credentials",
  "self_harm",
  "illegal_activity",
  "dangerous_instructions",
]);

export async function moderateSubmission(params: {
  contentItemId?: string;
  uploadId?: string;
  text: string;
  safetyClass?: string;
  policyVersion?: string;
}) {
  const env = getEnv();
  const result = await moderateText(params.text.slice(0, 12_000));
  const maxConfidence = Math.max(0, ...result.categories.map((c) => c.confidence));
  const hasHighRisk = result.categories.some((c) => HIGH_RISK.has(c.category));
  const outcome = decideOutcome({
    maxConfidence,
    hasHighRisk,
    safetyClass: params.safetyClass ?? "general",
    mode: env.MODERATION_MODE,
  });
  const recommended = outcome === result.outcome ? outcome : outcome;

  const [moderationCase] = await db
    .insert(moderationCases)
    .values({
      contentItemId: params.contentItemId,
      uploadId: params.uploadId,
      status: recommended === "auto_approve" ? "resolved" : "open",
      priority: result.priority,
      recommendedAction: recommended,
      policyVersion: params.policyVersion ?? "moderation-v1",
      resolvedAt: recommended === "auto_approve" ? new Date() : null,
    })
    .returning();

  if (moderationCase && result.categories.length > 0) {
    await db.insert(moderationFindings).values(
      result.categories.map((category) => ({
        caseId: moderationCase.id,
        category: category.category,
        confidence: category.confidence,
        evidenceRefs: category.evidence ? [category.evidence] : [],
        model: env.AI_MODERATION_MODEL,
      })),
    );
  }

  if (params.contentItemId) {
    const moderationState =
      recommended === "auto_approve"
        ? "auto_approved"
        : recommended === "auto_reject"
          ? "auto_rejected"
          : "held";
    const publicationState = recommended === "auto_reject" ? "rejected" : undefined;
    await db
      .update(contentItems)
      .set({
        moderationState,
        ...(publicationState ? { publicationState } : {}),
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, params.contentItemId));
  }

  await db.insert(auditEvents).values({
    actorType: "system",
    action: `moderation.${recommended}`,
    targetType: params.contentItemId ? "content_item" : "upload",
    targetId: params.contentItemId ?? params.uploadId,
    policyVersion: params.policyVersion ?? "moderation-v1",
    metadata: { caseId: moderationCase?.id, priority: result.priority, notes: result.notes },
  });

  logger.info(
    { caseId: moderationCase?.id, recommended, contentItemId: params.contentItemId },
    "moderation decision",
  );

  return { case: moderationCase, result: { ...result, outcome: recommended } };
}
