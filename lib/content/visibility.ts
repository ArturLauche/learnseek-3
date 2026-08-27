export type VisibilityFields = {
  publicationState: string;
  visibility: string;
  moderationState: string;
  deletedAt: Date | null;
  ownerUserId?: string | null;
};

export function isPubliclyVisible(item: VisibilityFields): boolean {
  if (item.deletedAt) return false;
  if (item.publicationState !== "published") return false;
  if (item.visibility !== "public") return false;
  return item.moderationState === "approved" || item.moderationState === "auto_approved";
}

export function canUserView(
  item: VisibilityFields,
  ctx: { userId?: string | null; isAdmin?: boolean },
): boolean {
  if (isPubliclyVisible(item)) return true;
  if (ctx.isAdmin) return true;
  if (ctx.userId && item.ownerUserId && ctx.userId === item.ownerUserId) return true;
  return false;
}

export function canPublish(item: {
  moderationState: string;
  publicationState: string;
  hasSources: boolean;
  safetyClass: string;
  schemaValid: boolean;
}): { ok: boolean; reason: string } {
  if (!item.schemaValid) return { ok: false, reason: "schema" };
  if (!["approved", "auto_approved"].includes(item.moderationState)) {
    return { ok: false, reason: "moderation" };
  }
  const sensitive = ["health", "finance", "law", "politics", "security", "safety"].includes(
    item.safetyClass,
  );
  if (sensitive && !item.hasSources) return { ok: false, reason: "sources_required" };
  if (item.publicationState === "taken_down") return { ok: false, reason: "taken_down" };
  return { ok: true, reason: "ok" };
}
