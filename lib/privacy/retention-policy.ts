export type RetentionPolicy = {
  sessionsDays: number;
  analyticsDays: number;
  deletedAccountDays: number;
  generationArtifactsDays: number;
  searchesDays: number;
};

const DEFAULTS: RetentionPolicy = {
  sessionsDays: 0,
  analyticsDays: 365,
  deletedAccountDays: 30,
  generationArtifactsDays: 730,
  searchesDays: 90,
};

export function parseRetentionPolicy(body: Record<string, unknown> | null | undefined): RetentionPolicy {
  const nested =
    body?.retention && typeof body.retention === "object" && !Array.isArray(body.retention)
      ? (body.retention as Record<string, unknown>)
      : {};
  const fallback = typeof body?.retentionDays === "number" ? body.retentionDays : DEFAULTS.analyticsDays;
  const num = (value: unknown, fallbackValue: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallbackValue;
  return {
    sessionsDays: num(nested.sessionsDays, DEFAULTS.sessionsDays),
    analyticsDays: num(nested.analyticsDays, fallback),
    deletedAccountDays: num(nested.deletedAccountDays, DEFAULTS.deletedAccountDays),
    generationArtifactsDays: num(nested.generationArtifactsDays, fallback),
    searchesDays: num(nested.searchesDays, DEFAULTS.searchesDays),
  };
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

export function isExpiredSession(expiresAt: Date, now: Date, graceDays = 0): boolean {
  return expiresAt.getTime() <= daysAgo(now, graceDays).getTime();
}

export function isOlderThan(createdAt: Date, days: number, now: Date): boolean {
  return createdAt.getTime() <= daysAgo(now, days).getTime();
}

export function isHeldId(id: string | null | undefined, held: Set<string>): boolean {
  if (!id) return false;
  return held.has(id);
}

export function canPurgeDeletedAccount(params: {
  status: string;
  deletedAt: Date | null;
  now: Date;
  deletedAccountDays: number;
  hasOpenAppeal: boolean;
}): boolean {
  if (params.hasOpenAppeal) return false;
  if (params.status !== "deleted" || !params.deletedAt) return false;
  return isOlderThan(params.deletedAt, params.deletedAccountDays, params.now);
}

export function canPurgeAnalytics(params: {
  createdAt: Date;
  now: Date;
  analyticsDays: number;
  contentItemId?: string | null;
  userId?: string | null;
  heldContentIds: Set<string>;
  heldUserIds: Set<string>;
}): boolean {
  if (isHeldId(params.contentItemId, params.heldContentIds)) return false;
  if (isHeldId(params.userId, params.heldUserIds)) return false;
  return isOlderThan(params.createdAt, params.analyticsDays, params.now);
}

export function canPurgeGenerationArtifact(params: {
  createdAt: Date;
  now: Date;
  generationArtifactsDays: number;
  compileState: string;
  contentHeld: boolean;
  published: boolean;
}): boolean {
  if (params.contentHeld) return false;
  if (params.published && params.compileState === "compiled") return false;
  return isOlderThan(params.createdAt, params.generationArtifactsDays, params.now);
}

export const RETENTION_PROTECTED = [
  "audit_events",
  "administrator_actions",
  "moderation_cases",
  "moderation_findings",
  "appeals",
  "reports",
  "takedown_requests",
] as const;

export const HOLD_CASE_STATUSES = ["open", "held"] as const;
export const HOLD_APPEAL_STATUSES = ["open", "reviewing"] as const;
export const HOLD_REPORT_STATUSES = ["open", "triaging"] as const;
export const HOLD_TAKEDOWN_STATUSES = ["open", "pending", "reviewing"] as const;

export function isHoldStatus(
  kind: "case" | "appeal" | "report" | "takedown",
  status: string,
): boolean {
  if (kind === "case") return (HOLD_CASE_STATUSES as readonly string[]).includes(status);
  if (kind === "appeal") return (HOLD_APPEAL_STATUSES as readonly string[]).includes(status);
  if (kind === "report") return (HOLD_REPORT_STATUSES as readonly string[]).includes(status);
  return (HOLD_TAKEDOWN_STATUSES as readonly string[]).includes(status);
}
