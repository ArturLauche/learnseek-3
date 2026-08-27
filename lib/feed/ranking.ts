export type PreferenceSnapshot = {
  topicIds: string[];
  hiddenTopicIds: string[];
  avoidTopics: string[];
  goals: string[];
  knowledgeLevel: "new" | "familiar" | "experienced" | "expert";
  depth: "skim" | "standard" | "deep";
  formats: string[];
  languages: string[];
  sessionLengthSeconds: number;
  tone: string;
  professionalInterests: string[];
  explorationPercent: number;
};

export type CandidateItem = {
  id: string;
  topicId: string | null;
  format: string;
  language: string;
  difficulty: PreferenceSnapshot["knowledgeLevel"];
  depth: PreferenceSnapshot["depth"];
  durationSeconds: number;
  origin: string;
  sourceQuality: number;
  safetyClass: string;
  creatorId: string | null;
  publicationState: string;
  visibility: string;
  moderationState: string;
  deletedAt: Date | null;
  publishedAt: Date | null;
  title: string;
};

export type EligibilityReason =
  | "ok"
  | "not_published"
  | "not_visible"
  | "moderation"
  | "deleted"
  | "hidden_topic"
  | "language"
  | "too_long"
  | "recently_seen"
  | "blocked_source";

const LEVEL_ORDER = ["new", "familiar", "experienced", "expert"] as const;

export function isEligible(
  item: CandidateItem,
  prefs: PreferenceSnapshot,
  context: {
    recentlySeenIds: Set<string>;
    blockedSource?: boolean;
  },
): { ok: boolean; reason: EligibilityReason } {
  if (item.deletedAt) return { ok: false, reason: "deleted" };
  if (item.publicationState !== "published") return { ok: false, reason: "not_published" };
  if (item.visibility !== "public") return { ok: false, reason: "not_visible" };
  if (!["approved", "auto_approved"].includes(item.moderationState)) {
    return { ok: false, reason: "moderation" };
  }
  if (item.topicId && prefs.hiddenTopicIds.includes(item.topicId)) {
    return { ok: false, reason: "hidden_topic" };
  }
  if (prefs.languages.length > 0 && !prefs.languages.includes(item.language)) {
    return { ok: false, reason: "language" };
  }
  if (item.durationSeconds > prefs.sessionLengthSeconds * 1.5 + 30) {
    return { ok: false, reason: "too_long" };
  }
  if (context.recentlySeenIds.has(item.id)) return { ok: false, reason: "recently_seen" };
  if (context.blockedSource) return { ok: false, reason: "blocked_source" };
  return { ok: true, reason: "ok" };
}

export type ScoreBreakdown = {
  total: number;
  topic: number;
  level: number;
  format: number;
  quality: number;
  freshness: number;
  exploration: number;
};

export function scoreCandidate(
  item: CandidateItem,
  prefs: PreferenceSnapshot,
  signals: {
    skipRate: number;
    completionRate: number;
    saveBoost: number;
    followBoost: number;
    now?: Date;
  },
): ScoreBreakdown {
  const topic = item.topicId && prefs.topicIds.includes(item.topicId) ? 1 : 0.15;
  const levelDelta = Math.abs(
    LEVEL_ORDER.indexOf(item.difficulty) - LEVEL_ORDER.indexOf(prefs.knowledgeLevel),
  );
  const level = Math.max(0, 1 - levelDelta * 0.28);
  const format = prefs.formats.length === 0 || prefs.formats.includes(item.format) ? 1 : 0.35;
  const quality = Math.min(1, item.sourceQuality + signals.completionRate * 0.2 + signals.saveBoost);
  const ageDays = item.publishedAt
    ? Math.max(0, ((signals.now ?? new Date()).getTime() - item.publishedAt.getTime()) / 86_400_000)
    : 30;
  const freshness = Math.max(0.2, Math.exp(-0.02 * ageDays));
  const exploration = item.origin === "editorial" ? 0.1 : 0.05;
  const penalty = signals.skipRate * 0.4;
  const total =
    topic * 0.32 +
    level * 0.16 +
    format * 0.14 +
    quality * 0.16 +
    freshness * 0.1 +
    exploration * 0.04 +
    signals.followBoost * 0.08 -
    penalty;
  return { total, topic, level, format, quality, freshness, exploration };
}

export function applyDiversity(
  ranked: CandidateItem[],
  options: { window?: number; maxSameTopic?: number; maxSameFormat?: number } = {},
): CandidateItem[] {
  const window = options.window ?? 10;
  const maxSameTopic = options.maxSameTopic ?? 2;
  const maxSameFormat = options.maxSameFormat ?? 3;
  const selected: CandidateItem[] = [];
  for (const item of ranked) {
    const recent = selected.slice(-window);
    const topicCount = recent.filter((row) => row.topicId && row.topicId === item.topicId).length;
    const formatCount = recent.filter((row) => row.format === item.format).length;
    if (topicCount >= maxSameTopic) continue;
    if (formatCount >= maxSameFormat) continue;
    selected.push(item);
  }
  for (const item of ranked) {
    if (selected.length >= ranked.length) break;
    if (!selected.some((row) => row.id === item.id)) selected.push(item);
  }
  return selected;
}

export function reserveAntiEchoSlots(
  selected: CandidateItem[],
  extras: {
    adjacent: CandidateItem[];
    foundation: CandidateItem[];
    unexpected: CandidateItem[];
  },
): CandidateItem[] {
  const ids = new Set(selected.map((item) => item.id));
  const insert = (item: CandidateItem | undefined, index: number) => {
    if (!item || ids.has(item.id)) return;
    selected.splice(Math.min(index, selected.length), 0, item);
    ids.add(item.id);
  };
  insert(extras.adjacent[0], 3);
  insert(extras.foundation[0], 6);
  insert(extras.unexpected[0], 9);
  return selected;
}

export const TARGET_QUEUE_SIZE = 15;
export const MIN_QUEUE_SIZE = 10;

export function shouldReplenish(currentSize: number) {
  return currentSize < MIN_QUEUE_SIZE;
}

export function replenishCount(currentSize: number) {
  return Math.max(0, TARGET_QUEUE_SIZE - currentSize);
}
