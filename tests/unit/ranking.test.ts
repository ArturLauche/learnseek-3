import { describe, expect, it } from "vitest";
import {
  applyDiversity,
  isEligible,
  publicRankingExplanation,
  replenishCount,
  scoreCandidate,
  shouldReplenish,
  type CandidateItem,
  type PreferenceSnapshot,
} from "@/lib/feed/ranking";

const prefs: PreferenceSnapshot = {
  topicIds: ["topic-a"],
  hiddenTopicIds: ["hidden"],
  avoidTopics: [],
  goals: [],
  knowledgeLevel: "new",
  depth: "standard",
  formats: ["explanation"],
  languages: ["en"],
  sessionLengthSeconds: 90,
  tone: "warm",
  professionalInterests: [],
  explorationPercent: 15,
};

function item(partial: Partial<CandidateItem>): CandidateItem {
  return {
    id: "1",
    topicId: "topic-a",
    format: "explanation",
    language: "en",
    difficulty: "new",
    depth: "standard",
    durationSeconds: 60,
    origin: "editorial",
    sourceQuality: 0.8,
    safetyClass: "general",
    creatorId: null,
    publicationState: "published",
    visibility: "public",
    moderationState: "auto_approved",
    deletedAt: null,
    publishedAt: new Date(),
    title: "t",
    ...partial,
  };
}

describe("eligibility", () => {
  it("accepts published public approved items", () => {
    expect(isEligible(item({}), prefs, { recentlySeenIds: new Set() }).ok).toBe(true);
  });
  it("rejects drafts and hidden topics", () => {
    expect(isEligible(item({ publicationState: "draft" }), prefs, { recentlySeenIds: new Set() }).ok).toBe(false);
    expect(isEligible(item({ topicId: "hidden" }), prefs, { recentlySeenIds: new Set() }).reason).toBe("hidden_topic");
  });
});

describe("scoring", () => {
  it("boosts preferred topics over others", () => {
    const preferred = scoreCandidate(item({}), prefs, {
      skipRate: 0,
      completionRate: 0,
      saveBoost: 0,
      followBoost: 0,
    });
    const other = scoreCandidate(item({ topicId: "other" }), prefs, {
      skipRate: 0,
      completionRate: 0,
      saveBoost: 0,
      followBoost: 0,
    });
    expect(preferred.total).toBeGreaterThan(other.total);
  });
});

describe("diversity and replenish", () => {
  it("avoids stacking the same topic", () => {
    const ranked = [
      item({ id: "1", topicId: "a" }),
      item({ id: "2", topicId: "a" }),
      item({ id: "3", topicId: "a" }),
      item({ id: "4", topicId: "b", format: "quiz" }),
    ];
    const diversified = applyDiversity(ranked, { maxSameTopic: 2, window: 10 });
    expect(diversified[2]?.id).toBe("4");
  });
  it("replenishes under 10 toward 15", () => {
    expect(shouldReplenish(9)).toBe(true);
    expect(replenishCount(9)).toBe(6);
    expect(shouldReplenish(10)).toBe(false);
  });
});

describe("public ranking explanations", () => {
  it("lists factor names without private model reasoning", () => {
    const breakdown = scoreCandidate(item({}), prefs, {
      skipRate: 0,
      completionRate: 0.4,
      saveBoost: 0.1,
      followBoost: 0,
    });
    const rows = publicRankingExplanation(breakdown);
    expect(rows.map((row) => row.factor)).toEqual(
      expect.arrayContaining(["topic_match", "source_quality", "exploration"]),
    );
    expect(JSON.stringify(rows)).not.toMatch(/chain of thought|hidden reasoning/i);
  });
});
